/*
 * Local provider: embeddings and reranking on your own PC with transformers.js (Node, ONNX
 * Runtime). Used by `pnpm corpus` and the local /api/ask in `pnpm dev`. The same model weights run
 * on Cloudflare Workers AI in production (server/providers/workers-ai.ts), so the corpus vectors
 * stay valid when we switch. First run downloads ~140 MB into .cache/ (gitignored). Decision D-021.
 */
import { AutoModelForSequenceClassification, AutoTokenizer, env, pipeline } from '@huggingface/transformers'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { EMBED_MODEL, RERANK_MODEL } from '../rag/config.ts'

// import.meta.url stays correct both under `node scripts/build-corpus.ts` and Vite's dev server.
env.cacheDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../.cache/transformers')

type Embedder = (texts: string[]) => Promise<number[][]>
let embedder: Promise<Embedder> | null = null
let reranker: Promise<(q: string, ps: string[]) => Promise<number[]>> | null = null

export function localEmbed(): Embedder {
  embedder ??= (async () => {
    const extract = await pipeline('feature-extraction', EMBED_MODEL.local, { dtype: 'fp32' })
    // Mean pooling + unit length, the same settings we ask Workers AI for (pooling: "mean")
    return async (texts: string[]) => (await extract(texts, { pooling: 'mean', normalize: true })).tolist() as number[][]
  })()
  return async (texts) => (await embedder!)(texts)
}

export function localRerank(): (query: string, passages: string[]) => Promise<number[]> {
  reranker ??= (async () => {
    const tokenizer = await AutoTokenizer.from_pretrained(RERANK_MODEL.local)
    const model = await AutoModelForSequenceClassification.from_pretrained(RERANK_MODEL.local, { dtype: 'q8' })
    return async (query: string, passages: string[]) => {
      if (!passages.length) return []
      const inputs = tokenizer(new Array(passages.length).fill(query), { text_pair: passages, padding: true, truncation: true, max_length: 512 })
      const { logits } = await model(inputs)
      // One relevance logit per pair; sigmoid turns it into 0..1, as Workers AI's reranker reports
      return Array.from(logits.data as Float32Array, (x) => 1 / (1 + Math.exp(-x)))
    }
  })()
  return async (q, ps) => (await reranker!)(q, ps)
}

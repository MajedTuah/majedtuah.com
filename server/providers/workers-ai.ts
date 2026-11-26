/*
 * Production embeddings and reranking on Cloudflare Workers AI. The same model weights as
 * server/providers/local.ts, so the vectors in server/corpus.json stay valid (decision D-009).
 */
import { EMBED_MODEL, RERANK_MODEL } from '../rag/config.ts'

export interface WorkersAi {
  run(model: string, input: unknown): Promise<unknown>
}

function unit(v: number[]): number[] {
  let sum = 0
  for (const x of v) sum += x * x
  const n = Math.sqrt(sum)
  return n ? v.map((x) => x / n) : v
}

/** Workers AI has returned this vector as a nested row, a flat list, or `{ data }`. */
function asVector(res: unknown): number[] {
  if (Array.isArray(res) && typeof res[0] === 'number') return unit(res as number[])
  if (!res || typeof res !== 'object') throw new Error('Workers AI returned no embedding')
  const data = (res as { data?: unknown }).data
  if (Array.isArray(data) && Array.isArray(data[0]) && typeof (data[0] as number[])[0] === 'number') return unit(data[0] as number[])
  if (Array.isArray(data) && typeof data[0] === 'number') return unit(data as number[])
  throw new Error('Workers AI returned no embedding')
}

export function workersEmbed(ai: WorkersAi): (text: string) => Promise<number[]> {
  return async (text) => asVector(await ai.run(EMBED_MODEL.workersAi, { text: [text], pooling: 'mean' }))
}

/** Sigmoid when the reranker returns a raw logit. Scores already in 0..1 stay as they are. */
function asProb(x: number): number {
  return x >= 0 && x <= 1 ? x : 1 / (1 + Math.exp(-x))
}

export function workersRerank(ai: WorkersAi): (query: string, passages: string[]) => Promise<number[]> {
  return async (query, passages) => {
    if (!passages.length) return []
    const res = await ai.run(RERANK_MODEL.workersAi, {
      query,
      contexts: passages.map((text) => ({ text })),
    })
    if (Array.isArray(res) && typeof res[0] === 'number') return (res as number[]).map(asProb)
    const rows = (res as { response?: { id?: number; score?: number }[] } | null)?.response
    if (!rows) throw new Error('Workers AI returned no rerank scores')
    const scores = passages.map(() => 0)
    for (const row of rows) {
      if (typeof row.id === 'number' && typeof row.score === 'number' && row.id >= 0 && row.id < scores.length) {
        scores[row.id] = asProb(row.score)
      }
    }
    return scores
  }
}

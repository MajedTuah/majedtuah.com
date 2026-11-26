/*
 * `pnpm corpus`: Ingest -> Chunk -> Embed, once, on your PC. Writes server/corpus.json, which the
 * /api/ask code bundles (decision D-008). Re-run it whenever src/data.ts or content/*.md changes.
 * Explained in docs/11-rag-api.md.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { chunksFromMarkdown, chunksFromSite } from '../server/rag/corpus-source.ts'
import { EMBED_MODEL } from '../server/rag/config.ts'
import { localEmbed } from '../server/providers/local.ts'
import type { Corpus } from '../server/rag/types.ts'

const root = resolve(import.meta.dirname, '..')
const contentDir = join(root, 'content')

const chunks = chunksFromSite()
if (existsSync(contentDir)) {
  for (const f of readdirSync(contentDir).filter((f) => f.endsWith('.md') && !f.startsWith('_') && f.toLowerCase() !== 'readme.md')) {
    chunks.push(...chunksFromMarkdown(f, readFileSync(join(contentDir, f), 'utf8')))
  }
}

const ids = new Set<string>()
for (const c of chunks) {
  if (ids.has(c.id)) throw new Error(`Duplicate chunk id "${c.id}": give the two sections different headings`)
  ids.add(c.id)
}

console.log(`Embedding ${chunks.length} passages with ${EMBED_MODEL.local}…`)
const t = performance.now()
const vectors = await localEmbed()(chunks.map((c) => `${c.title}. ${c.text}`))
const round = (v: number[]) => v.map((x) => Math.round(x * 1e5) / 1e5) // 5 decimals: plenty, and a 3x smaller file

const corpus: Corpus = {
  model: EMBED_MODEL.local,
  dims: vectors[0].length,
  builtAt: new Date().toISOString(),
  chunks: chunks.map((c, i) => ({ ...c, vector: round(vectors[i]) })),
}
if (corpus.dims !== EMBED_MODEL.dims) throw new Error(`Expected ${EMBED_MODEL.dims} dimensions, got ${corpus.dims}`)

const out = join(root, 'server/corpus.json')
writeFileSync(out, JSON.stringify(corpus))
console.log(`Wrote ${out}: ${chunks.length} passages, ${corpus.dims} dims, ${(JSON.stringify(corpus).length / 1024).toFixed(0)} KB, ${((performance.now() - t) / 1000).toFixed(1)} s`)

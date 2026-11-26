/*
 * Hybrid search over the in-memory corpus (decisions D-008, D-009):
 *   - BM25 keyword search catches exact names ("Nexa", "Petronas", "DP-900").
 *   - Vector search (cosine similarity of embeddings) catches meaning ("chatbot" ~ "agent").
 *   - Reciprocal Rank Fusion merges the two ranked lists without having to compare their scores.
 * With ~40 passages all of this takes well under a millisecond, so no vector database is needed.
 */
import type { CorpusChunk } from './types.ts'

/** Lower-case words and numbers; keeps "dp-900" and "c#"-style tokens whole enough to match. */
export function tokenize(text: string): string[] {
  return (text.toLowerCase().normalize('NFKD').match(/[a-z0-9]+(?:[-.][a-z0-9]+)*/g) ?? []).filter((t) => !STOP.has(t))
}

const STOP = new Set(
  'a an and are as at be by for from has have he his how i in is it its of on or that the this to was what when where which who why with does did do can about my me your you majed majeds'.split(' '),
)

export interface Bm25Index {
  docs: string[][]
  df: Map<string, number>
  avgLen: number
}

export function buildBm25(texts: string[]): Bm25Index {
  const docs = texts.map(tokenize)
  const df = new Map<string, number>()
  for (const d of docs) for (const t of new Set(d)) df.set(t, (df.get(t) ?? 0) + 1)
  const avgLen = docs.reduce((s, d) => s + d.length, 0) / Math.max(1, docs.length)
  return { docs, df, avgLen }
}

/** Standard Okapi BM25 (k1 = 1.2, b = 0.75). Returns doc indexes, best first, score > 0 only. */
export function bm25Search(index: Bm25Index, query: string, k: number): number[] {
  const q = [...new Set(tokenize(query))]
  const N = index.docs.length
  const scores = index.docs.map((doc) => {
    let s = 0
    for (const term of q) {
      const n = index.df.get(term)
      if (!n) continue
      const tf = doc.filter((t) => t === term).length
      if (!tf) continue
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5))
      s += (idf * tf * 2.2) / (tf + 1.2 * (0.25 + (0.75 * doc.length) / index.avgLen))
    }
    return s
  })
  return rank(scores, k, 0)
}

/** Dot product. The corpus and question vectors are unit length, so this is cosine similarity. */
export function dot(a: number[], b: number[]): number {
  let s = 0
  for (let i = 0; i < a.length; i++) s += a[i] * b[i]
  return s
}

export function vectorSearch(chunks: CorpusChunk[], q: number[], k: number): number[] {
  return rank(
    chunks.map((c) => dot(c.vector, q)),
    k,
    -Infinity,
  )
}

/**
 * Reciprocal Rank Fusion: each list gives a document 1 / (60 + rank). Documents near the top of
 * both lists win. 60 is the constant from the original paper (Cormack et al., 2009).
 */
export function rrf(lists: number[][], k = 60): number[] {
  const score = new Map<number, number>()
  for (const list of lists) list.forEach((doc, r) => score.set(doc, (score.get(doc) ?? 0) + 1 / (k + r + 1)))
  return [...score.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]).map(([doc]) => doc)
}

function rank(scores: number[], k: number, floor: number): number[] {
  return scores
    .map((s, i) => [s, i] as const)
    .filter(([s]) => s > floor)
    .sort((a, b) => b[0] - a[0] || a[1] - b[1])
    .slice(0, k)
    .map(([, i]) => i)
}

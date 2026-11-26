/*
 * Shapes shared by the "Ask about my work" RAG pipeline. The pipeline itself never talks to a
 * specific vendor: everything that calls a model is passed in (see Deps), so the same code runs
 * locally (transformers.js on your PC) and on Cloudflare (Workers AI). Explained in docs/11-rag-api.md.
 */

/** One passage of the knowledge base, before it is embedded. */
export interface Chunk {
  /** Stable id, e.g. "project:nexa" */
  id: string
  /** Where it came from, shown on the citation, e.g. "Projects" or "Résumé" */
  source: string
  /** Short heading shown on the citation */
  title: string
  /** Optional link the citation opens */
  url?: string
  text: string
}

export interface CorpusChunk extends Chunk {
  /** Unit-length embedding of `title + text` */
  vector: number[]
}

/** server/corpus.json, written by `pnpm corpus` (scripts/build-corpus.ts). */
export interface Corpus {
  /** Embedding model the vectors came from. Questions must be embedded with the same one. */
  model: string
  dims: number
  builtAt: string
  chunks: CorpusChunk[]
}

/** One chat message sent to the LLM. */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/** Everything the pipeline needs from the outside world. Tests pass fakes. */
export interface Deps {
  corpus: Corpus
  /** Embed one question with the corpus's model. Returns a unit-length vector. */
  embed(text: string): Promise<number[]>
  /** Score each passage against the question, 0 (unrelated) to 1 (answers it). */
  rerank(query: string, passages: string[]): Promise<number[]>
  /** Probability (0 to 1) that the text is a prompt-injection or jailbreak attempt. */
  guard(text: string): Promise<number>
  /** Start the answer. Resolves once a model has accepted the request (after any fallback). */
  answer(messages: ChatMessage[], signal?: AbortSignal): Promise<{ model: string; tokens: AsyncIterable<string> }>
  /** Per-visitor and per-day counters. Memory locally, Cloudflare KV in production. */
  store: CounterStore
  /** Contact address shown when a visitor runs out of questions. */
  email: string
  /** Defaults in config.ts; tests override them. */
  limits?: Partial<Limits>
  now?: () => number
}

export interface CounterStore {
  get(key: string): Promise<number>
  /** Adds one and returns the new value. The key expires `ttlSeconds` after it is first written. */
  increment(key: string, ttlSeconds: number): Promise<number>
}

export interface Limits {
  /** Questions one visitor (IP address) may ask in `visitorWindowDays`. */
  perVisitor: number
  visitorWindowDays: number
  /** Questions the whole site may answer per UTC day. Keeps us inside Groq's free tier. */
  perDay: number
}

/** One line of the NDJSON stream /api/ask sends back (decision D-010). */
export type AskEvent =
  | { type: 'check'; ok: true; remaining: number }
  | { type: 'limit'; reason: 'visitor' | 'daily'; email: string }
  | { type: 'guard'; ok: boolean; score: number; ms: number }
  | { type: 'retrieve'; ms: number; hits: { id: string; title: string; keywordRank: number | null; vectorRank: number | null }[] }
  | { type: 'rerank'; ms: number; top: { id: string; title: string; score: number }[] }
  | { type: 'sources'; sources: Source[] }
  | { type: 'token'; text: string }
  | { type: 'done'; grounded: boolean; remaining: number; model: string | null; ms: number }
  | { type: 'error'; message: string }

/** A passage the answer may cite as [n]. */
export interface Source {
  n: number
  id: string
  title: string
  source: string
  url?: string
  text: string
}

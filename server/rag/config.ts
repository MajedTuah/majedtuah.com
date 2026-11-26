/*
 * Tunable numbers for the RAG pipeline, in one place. Why each one is what it is: docs/11-rag-api.md
 * and decision D-020 in docs/decisions.md.
 */
import type { Limits } from './types.ts'

export const LIMITS: Limits = {
  perVisitor: 3, // then the demo asks them to email instead
  visitorWindowDays: 30,
  perDay: 200, // whole site; Groq's free gpt-oss models allow 1,000 requests a day each
}

/** Longest question accepted, in characters. */
export const MAX_QUESTION_CHARS = 300
/** Answers are asked to stay under this many words (system prompt). */
export const MAX_ANSWER_WORDS = 200
/**
 * Hard ceiling, in tokens. 200 words is about 270 tokens, but gpt-oss also spends tokens thinking
 * before it answers and they count against this, so there is headroom.
 */
export const MAX_ANSWER_TOKENS = 700

/** Candidates each search (keyword, vector) returns before they are merged. */
export const SEARCH_TOP_K = 8
/** Candidates the reranker scores after merging. */
export const RERANK_CANDIDATES = 6
/** Passages that go to the LLM. */
export const CONTEXT_PASSAGES = 3
/**
 * If even the best passage scores below this, reply "not in my notes" without calling the LLM
 * (decision D-009). Tuned on the questions in server/rag/pipeline.test.ts and docs/11.
 */
export const MIN_RERANK_SCORE = 0.02
/** Prompt Guard score at or above this blocks the question. */
export const GUARD_THRESHOLD = 0.8

/** Embedding model. Same weights on transformers.js (local) and Workers AI (production). */
export const EMBED_MODEL = { local: 'Xenova/bge-small-en-v1.5', workersAi: '@cf/baai/bge-small-en-v1.5', dims: 384 }
/** Reranker. Same weights on transformers.js (local) and Workers AI (production). */
export const RERANK_MODEL = { local: 'Xenova/bge-reranker-base', workersAi: '@cf/baai/bge-reranker-base' }
/** Groq models (decision D-002, updated by D-020). Override with GROQ_MODEL / GROQ_FALLBACK_MODEL. */
export const GROQ_DEFAULTS = {
  model: 'openai/gpt-oss-20b', // the smallest chat model on Groq: plenty for answering from 3 passages
  fallback: 'openai/gpt-oss-120b', // only if the 20b is rate-limited; it has its own separate limits
  guard: 'meta-llama/llama-prompt-guard-2-86m',
}

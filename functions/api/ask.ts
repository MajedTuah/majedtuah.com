/*
 * Production /api/ask. Same pipeline as local dev (server/dev-ask.ts):
 * Workers AI embeds and reranks, Groq writes the answer, KV counts questions.
 * worker/index.ts calls this. Bindings: AI, ASK_KV. Secrets: GROQ_API_KEY,
 * and TURNSTILE_SECRET once the widget is on.
 */
import corpusJson from '../../server/corpus.json'
import { NDJSON_HEADERS, originAllowed, originList, parseAskBody, turnstileOk } from '../../server/rag/http.ts'
import { kvStore, type KvLike } from '../../server/rag/limits.ts'
import { askStream } from '../../server/rag/pipeline.ts'
import { groqAnswer, groqGuard, type GroqConfig } from '../../server/rag/groq.ts'
import type { Corpus } from '../../server/rag/types.ts'
import { workersEmbed, workersRerank, type WorkersAi } from '../../server/providers/workers-ai.ts'
import { EMAIL } from '../../src/data.ts'

export interface Env {
  AI: WorkersAi
  ASK_KV: KvLike
  GROQ_API_KEY: string
  GROQ_MODEL?: string
  GROQ_FALLBACK_MODEL?: string
  GROQ_GUARD_MODEL?: string
  /** Comma-separated. The live site's origin must be listed here (decision D-012). */
  ALLOWED_ORIGINS?: string
  TURNSTILE_SECRET?: string
}

type PagesContext = { request: Request; env: Env }

const corpus = corpusJson as Corpus

function json(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

export async function onRequestPost({ request, env }: PagesContext): Promise<Response> {
  const origin = request.headers.get('Origin')
  if (!originAllowed(origin, originList(env.ALLOWED_ORIGINS, []))) {
    return json(403, 'This demo only answers questions asked on the site itself.')
  }
  if (!env.GROQ_API_KEY) return json(503, 'The answer model is not configured.')
  // Without KV the 3-question limit can't be enforced, so refuse rather than run unlimited.
  if (!env.ASK_KV || !env.AI) return json(503, 'The question counter is not configured yet.')

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return json(400, 'Send JSON: {"question": "..."}')
  }
  const parsed = parseAskBody(raw)
  if (!parsed.ok) return json(parsed.status, parsed.error)

  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown'
  if (env.TURNSTILE_SECRET && !(await turnstileOk(env.TURNSTILE_SECRET, parsed.body.turnstileToken, ip))) {
    return json(403, 'The bot check failed. Reload the page and try again.')
  }

  const cfg: GroqConfig = {
    apiKey: env.GROQ_API_KEY,
    model: env.GROQ_MODEL,
    fallbackModel: env.GROQ_FALLBACK_MODEL,
    guardModel: env.GROQ_GUARD_MODEL,
  }
  const body = askStream(parsed.body.question, ip, {
    corpus,
    embed: workersEmbed(env.AI),
    rerank: workersRerank(env.AI),
    guard: groqGuard(cfg),
    answer: groqAnswer(cfg),
    store: kvStore(env.ASK_KV),
    email: EMAIL,
  }, request.signal)

  return new Response(body, { headers: NDJSON_HEADERS })
}

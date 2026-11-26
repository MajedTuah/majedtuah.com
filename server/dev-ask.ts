/*
 * Local /api/ask for `pnpm dev`. Embeddings and the reranker run on this PC (transformers.js).
 * Groq writes the answer. The key is read from .dev.vars or GROQ_API_KEY, never from the page.
 * Production is functions/api/ask.ts.
 */
import { existsSync, readFileSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { resolve } from 'node:path'
import { EMAIL } from '../src/data.ts'
import { localEmbed, localRerank } from './providers/local.ts'
import { NDJSON_HEADERS, originAllowed, originList, parseAskBody } from './rag/http.ts'
import { memoryStore } from './rag/limits.ts'
import { askStream } from './rag/pipeline.ts'
import { groqAnswer, groqGuard, type GroqConfig } from './rag/groq.ts'
import type { Corpus, Deps } from './rag/types.ts'

const LOCAL_ORIGINS = ['http://localhost:8443', 'http://127.0.0.1:8443']

const corpusPath = () => resolve(process.cwd(), 'server/corpus.json')

function readDevVars(): Record<string, string> {
  const path = resolve(process.cwd(), '.dev.vars')
  const out: Record<string, string> = {}
  if (process.env.GROQ_API_KEY) out.GROQ_API_KEY = process.env.GROQ_API_KEY
  if (process.env.GROQ_MODEL) out.GROQ_MODEL = process.env.GROQ_MODEL
  if (process.env.GROQ_FALLBACK_MODEL) out.GROQ_FALLBACK_MODEL = process.env.GROQ_FALLBACK_MODEL
  if (process.env.GROQ_GUARD_MODEL) out.GROQ_GUARD_MODEL = process.env.GROQ_GUARD_MODEL
  if (process.env.ALLOWED_ORIGINS) out.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  if (!existsSync(path)) return out
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const i = trimmed.indexOf('=')
    if (i < 1) continue
    const key = trimmed.slice(0, i).trim()
    const value = trimmed.slice(i + 1).trim().replace(/^["']|["']$/g, '')
    if (value) out[key] = value
  }
  return out
}

class SetupError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

let corpus: Corpus | null = null
function loadCorpus(): Corpus {
  if (corpus) return corpus
  const path = corpusPath()
  if (!existsSync(path)) throw new SetupError(503, 'The notes file is missing. Run pnpm corpus, then ask again.')
  corpus = JSON.parse(readFileSync(path, 'utf8')) as Corpus
  if (!corpus.chunks?.length || !corpus.dims) throw new SetupError(503, 'server/corpus.json is empty. Run pnpm corpus again.')
  return corpus
}

const embedMany = localEmbed()
const rerank = localRerank()
const store = memoryStore()

function depsFor(vars: Record<string, string>): Deps {
  const apiKey = vars.GROQ_API_KEY
  if (!apiKey) throw new SetupError(503, 'Add GROQ_API_KEY to .dev.vars (copy .dev.vars.example), then ask again.')
  const cfg: GroqConfig = {
    apiKey,
    model: vars.GROQ_MODEL,
    fallbackModel: vars.GROQ_FALLBACK_MODEL,
    guardModel: vars.GROQ_GUARD_MODEL,
  }
  return {
    corpus: loadCorpus(),
    embed: async (text) => (await embedMany([text]))[0],
    rerank,
    guard: groqGuard(cfg),
    answer: groqAnswer(cfg),
    store,
    email: EMAIL,
  }
}

function sendJson(res: ServerResponse, status: number, error: string) {
  if (res.headersSent) return
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify({ error }))
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buf = typeof chunk === 'string' ? Buffer.from(chunk) : chunk
    size += buf.length
    if (size > 8_000) throw new SetupError(413, 'That request is too large.')
    chunks.push(buf)
  }
  return Buffer.concat(chunks).toString('utf8')
}

/** Downloads the embed and rerank models into .cache/ so the first question is not the one that waits. */
export async function warmAsk(): Promise<void> {
  if (!existsSync(corpusPath())) {
    console.log('[ask] No server/corpus.json yet. Run pnpm corpus.')
    return
  }
  console.log('[ask] Loading embed and rerank models…')
  const t = performance.now()
  await embedMany(['ready'])
  await rerank('ready', ['ready'])
  console.log(`[ask] Models ready in ${((performance.now() - t) / 1000).toFixed(1)} s`)
}

export async function handleDevAsk(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.statusCode = 405
    res.setHeader('Allow', 'POST')
    res.end('POST only')
    return
  }

  try {
    const vars = readDevVars()
    const origin = typeof req.headers.origin === 'string' ? req.headers.origin : null
    if (!originAllowed(origin, originList(vars.ALLOWED_ORIGINS, LOCAL_ORIGINS))) {
      return sendJson(res, 403, 'This demo only answers questions asked on the site itself.')
    }

    let raw: unknown
    try {
      raw = JSON.parse(await readBody(req))
    } catch (e) {
      if (e instanceof SetupError) return sendJson(res, e.status, e.message)
      return sendJson(res, 400, 'Send JSON: {"question": "..."}')
    }
    const parsed = parseAskBody(raw)
    if (!parsed.ok) return sendJson(res, parsed.status, parsed.error)

    const deps = depsFor(vars)
    const ip = req.socket.remoteAddress ?? 'local'
    const ac = new AbortController()
    res.on('close', () => ac.abort())

    res.writeHead(200, NDJSON_HEADERS)
    const reader = askStream(parsed.body.question, ip, deps, ac.signal).getReader()
    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        if (!res.write(Buffer.from(value))) await new Promise((resolveDrain) => res.once('drain', resolveDrain))
      }
    } finally {
      res.end()
    }
  } catch (e) {
    if (e instanceof SetupError) return sendJson(res, e.status, e.message)
    console.error('[ask]', e)
    if (!res.headersSent) sendJson(res, 500, 'Something went wrong on my side. Please try again in a minute.')
    else res.end()
  }
}

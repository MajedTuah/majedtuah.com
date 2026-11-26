/*
 * Request checks shared by the local dev server and the Cloudflare function: what a valid
 * /api/ask request looks like. The security layers around it are explained in docs/12-security.md.
 */
import { MAX_QUESTION_CHARS } from './config.ts'

export interface AskBody {
  question: string
  /** Cloudflare Turnstile token. Required in production, ignored locally. */
  turnstileToken?: string
}

export type Parsed = { ok: true; body: AskBody } | { ok: false; status: number; error: string }

/** Validates the JSON body. Collapses whitespace and strips control characters from the question. */
export function parseAskBody(raw: unknown): Parsed {
  if (!raw || typeof raw !== 'object') return { ok: false, status: 400, error: 'Send JSON: {"question": "..."}' }
  const { question, turnstileToken } = raw as Record<string, unknown>
  if (typeof question !== 'string') return { ok: false, status: 400, error: 'question must be a string' }
  // eslint-disable-next-line no-control-regex
  const q = question.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()
  if (q.length < 3) return { ok: false, status: 400, error: 'Ask a slightly longer question.' }
  if (q.length > MAX_QUESTION_CHARS) return { ok: false, status: 413, error: `Keep questions under ${MAX_QUESTION_CHARS} characters.` }
  return { ok: true, body: { question: q, turnstileToken: typeof turnstileToken === 'string' ? turnstileToken : undefined } }
}

/** Browsers send an Origin header on POST. Only our own site's origins are allowed (D-012). */
export function originAllowed(origin: string | null, allowed: string[]): boolean {
  return !!origin && allowed.includes(origin)
}

/** `ALLOWED_ORIGINS` is a comma-separated list. An empty value means "use the fallback". */
export function originList(raw: string | undefined, fallback: string[]): string[] {
  const list = raw?.split(',').map((s) => s.trim()).filter(Boolean)
  return list?.length ? list : fallback
}

/** Cloudflare Turnstile. Missing token or a failed check both mean "no". */
export async function turnstileOk(secret: string, token: string | undefined, ip: string): Promise<boolean> {
  if (!token) return false
  const body = new FormData()
  body.set('secret', secret)
  body.set('response', token)
  body.set('remoteip', ip)
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body })
  if (!res.ok) return false
  const json = (await res.json()) as { success?: boolean }
  return json.success === true
}

export const NDJSON_HEADERS = {
  'Content-Type': 'application/x-ndjson; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
}

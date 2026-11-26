/*
 * Groq's OpenAI-compatible chat API, called with plain fetch so it runs the same in Node (pnpm dev)
 * and on Cloudflare. Two jobs: Prompt Guard (is this a jailbreak?) and the streamed answer, with an
 * automatic switch to a second model if the first one is rate-limited (decision D-020).
 */
import { GROQ_DEFAULTS, MAX_ANSWER_TOKENS } from './config.ts'
import type { ChatMessage, Deps } from './types.ts'

const URL = 'https://api.groq.com/openai/v1/chat/completions'

export interface GroqConfig {
  apiKey: string
  model?: string
  fallbackModel?: string
  guardModel?: string
}

export class GroqError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function post(cfg: GroqConfig, body: object, signal?: AbortSignal): Promise<Response> {
  const res = await fetch(URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok) {
    // Never pass Groq's raw error text on to visitors; it can echo request details.
    const detail = (await res.text().catch(() => '')).slice(0, 300)
    throw new GroqError(res.status, `Groq ${res.status}: ${detail}`)
  }
  return res
}

/** Prompt Guard 2 replies with a single number: the probability the text is an attack. */
export function groqGuard(cfg: GroqConfig): Deps['guard'] {
  return async (text) => {
    const res = await post(cfg, { model: cfg.guardModel ?? GROQ_DEFAULTS.guard, messages: [{ role: 'user', content: text }] })
    const json = (await res.json()) as { choices: { message: { content: string } }[] }
    const p = Number.parseFloat(json.choices[0]?.message.content ?? '')
    return Number.isFinite(p) ? p : 1 // unreadable reply: fail closed
  }
}

export function groqAnswer(cfg: GroqConfig): Deps['answer'] {
  return async (messages: ChatMessage[], signal?: AbortSignal) => {
    const models = [cfg.model || GROQ_DEFAULTS.model, cfg.fallbackModel || GROQ_DEFAULTS.fallback]
    let lastError: unknown
    for (const model of models) {
      try {
        const res = await post(
          cfg,
          {
            model,
            messages,
            stream: true,
            max_completion_tokens: MAX_ANSWER_TOKENS,
            temperature: 0.2,
            // gpt-oss models think before answering; keep it short and don't send the thinking back
            ...(model.startsWith('openai/gpt-oss') ? { reasoning_effort: 'low', include_reasoning: false } : {}),
          },
          signal,
        )
        return { model, tokens: readSse(res.body!) }
      } catch (e) {
        lastError = e
        // Only a rate limit or a Groq outage moves on to the fallback model
        if (!(e instanceof GroqError) || (e.status !== 429 && e.status < 500)) throw e
      }
    }
    throw lastError
  }
}

/** Reads Server-Sent Events ("data: {...}" lines) and yields each piece of answer text. */
async function* readSse(body: ReadableStream<Uint8Array>): AsyncIterable<string> {
  const reader = body.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += value
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data:')) continue
      const data = line.slice(5).trim()
      if (data === '[DONE]') return
      const delta = (JSON.parse(data) as { choices?: { delta?: { content?: string } }[] }).choices?.[0]?.delta?.content
      if (delta) yield delta
    }
  }
}

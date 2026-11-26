/*
 * Serves the built site and POST /api/ask. Cloudflare treats a deploy with only
 * the dist folder as static assets, and that kind of Worker cannot take bindings.
 */
import { onRequestPost, type Env as AskEnv } from '../functions/api/ask.ts'

interface Assets {
  fetch(request: Request): Promise<Response>
}

type Env = AskEnv & { ASSETS: Assets }

function json(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === '/api/ask') {
      if (request.method !== 'POST') return json(405, 'Send a POST request.')
      return onRequestPost({ request, env })
    }
    return env.ASSETS.fetch(request)
  },
}

/*
 * Usage limits: 3 questions per visitor, a daily cap for the whole site. Visitors are counted by a
 * SHA-256 hash of their IP address, so raw IPs are never stored. Explained in docs/12-security.md.
 */
import type { CounterStore, Limits } from './types.ts'

export async function hashIp(ip: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('majedtuah.com:' + ip))
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32)
}

const dayKey = (now: number) => 'day:' + new Date(now).toISOString().slice(0, 10)

export type LimitCheck = { ok: true; remaining: number } | { ok: false; reason: 'visitor' | 'daily' }

/** Checks both limits and, if allowed, counts this question against them. */
export async function takeQuestion(store: CounterStore, ip: string, limits: Limits, now: number): Promise<LimitCheck> {
  const visitor = 'visitor:' + (await hashIp(ip))
  const day = dayKey(now)
  const [used, today] = await Promise.all([store.get(visitor), store.get(day)])
  if (used >= limits.perVisitor) return { ok: false, reason: 'visitor' }
  if (today >= limits.perDay) return { ok: false, reason: 'daily' }
  const [nowUsed] = await Promise.all([
    store.increment(visitor, limits.visitorWindowDays * 86400),
    store.increment(day, 2 * 86400),
  ])
  return { ok: true, remaining: Math.max(0, limits.perVisitor - nowUsed) }
}

/** How many questions this visitor has left, without using one. */
export async function remainingFor(store: CounterStore, ip: string, limits: Limits): Promise<number> {
  return Math.max(0, limits.perVisitor - (await store.get('visitor:' + (await hashIp(ip)))))
}

/** The bit of Cloudflare KV the counter needs. Kept narrow so this file has no Workers types. */
export interface KvLike {
  get(key: string): Promise<string | null>
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<unknown>
}

/** Production counters. KV's shortest TTL is 60 seconds, and each write refreshes it. */
export function kvStore(kv: KvLike): CounterStore {
  return {
    async get(key) {
      const v = await kv.get(key)
      return v ? Number(v) || 0 : 0
    },
    async increment(key, ttlSeconds) {
      const n = (Number(await kv.get(key)) || 0) + 1
      await kv.put(key, String(n), { expirationTtl: Math.max(60, ttlSeconds) })
      return n
    },
  }
}

/** For `pnpm dev` and tests. Production uses Cloudflare KV (functions/api/ask.ts). */
export function memoryStore(now: () => number = Date.now): CounterStore {
  const data = new Map<string, { n: number; expires: number }>()
  const live = (key: string) => {
    const v = data.get(key)
    if (v && v.expires <= now()) data.delete(key)
    return data.get(key)
  }
  return {
    async get(key) {
      return live(key)?.n ?? 0
    },
    async increment(key, ttlSeconds) {
      const v = live(key) ?? { n: 0, expires: now() + ttlSeconds * 1000 }
      v.n++
      data.set(key, v)
      return v.n
    },
  }
}

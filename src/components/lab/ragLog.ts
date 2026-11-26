/*
 * Turns one RAG run into the lines the AI Lab terminal prints. Pure, no I/O.
 * Same safety rule as the BrainDump log: model names, scores, counts and timings only.
 * The question is shortened and masked. No emails, links, or keys.
 */
import { MIN_RERANK_SCORE } from '../../../server/rag/config.ts'
import type { TermLine } from './routerLog'
import { safeQuote } from './routerLog'

export type { TermLine }

type StageId = 'check' | 'guard' | 'retrieve' | 'rerank' | 'answer'

export interface RagLogRun {
  status: 'idle' | 'running' | 'done'
  check: { remaining: number } | null
  limit: { reason: 'visitor' | 'daily' } | null
  guard: { ok: boolean; score: number } | null
  hits: number | null
  top: { title: string; score: number }[] | null
  sources: number
  hasAnswer: boolean
  error: string | null
  model: string | null
  times: Partial<Record<StageId, number>>
}

const fmtMs = (v: number) => (v < 1 ? '<1 ms' : v < 1000 ? `${Math.round(v)} ms` : `${(v / 1000).toFixed(1)} s`)

const clip = (s: string, n: number) => {
  const t = s.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t
}

const time = (run: RagLogRun, id: StageId) => (run.times[id] != null ? fmtMs(run.times[id]!) : '—')

const row = (stage: string, detail: string, ms: string, tail: string) =>
  `  ${stage.padEnd(9)}${clip(detail, 22).padEnd(22)} ${ms.padStart(8)}   ${tail}`

/** Lines for the run so far. Grows as stages are revealed; never rewrites an earlier line. */
export function ragLines(question: string, run: RagLogRun): Omit<TermLine, 'id'>[] {
  if (!question || run.status === 'idle') return []
  const lines: Omit<TermLine, 'id'>[] = [{ kind: 'cmd', text: `ask ${safeQuote(question, 64)}` }]

  if (run.error && !run.check && !run.guard) {
    if (run.status === 'done') lines.push({ kind: 'warn', text: row('error', clip(run.error, 22), '—', 'stopped') })
    return lines
  }
  if (!run.check && !run.limit) return lines

  if (run.limit) {
    lines.push({ kind: 'warn', text: row('check', 'stopped', time(run, 'check'), 'email') })
    return lines
  }

  lines.push({ kind: 'ok', text: row('check', 'allowed', time(run, 'check'), 'pass') })
  if (!run.guard) return lines

  lines.push({
    kind: run.guard.ok ? 'ok' : 'warn',
    text: row('guard', `score ${run.guard.score.toFixed(2)}`, time(run, 'guard'), run.guard.ok ? 'pass' : 'block'),
  })
  if (!run.guard.ok) return lines
  if (run.hits == null) return lines

  lines.push({ kind: 'out', text: row('retrieve', `${run.hits} passages`, time(run, 'retrieve'), 'merged') })
  if (!run.top) return lines

  const kept = run.top.filter((t) => t.score >= MIN_RERANK_SCORE).length
  lines.push({
    kind: 'out',
    text: row('rerank', run.top[0]?.title ?? 'none', time(run, 'rerank'), kept ? `keep ${kept}` : 'skip model'),
  })
  for (const t of run.top.slice(0, 3)) lines.push({ kind: 'dim', text: `    ${t.score.toFixed(2)}  ${clip(t.title, 46)}` })

  if (run.status !== 'done') return lines
  if (run.model) {
    lines.push({ kind: 'ok', text: row('answer', run.model.split('/').pop() ?? run.model, time(run, 'answer'), `${run.sources} cited`) })
  } else if (run.hasAnswer) {
    lines.push({ kind: 'dim', text: row('answer', 'no model call', time(run, 'answer'), 'not in notes') })
  } else if (run.error) {
    lines.push({ kind: 'warn', text: row('error', clip(run.error, 22), '—', 'stopped') })
  }
  return lines
}

/*
 * Turns real router events into the lines the AI Lab terminal prints. Pure functions, no I/O.
 * Safety rule: the terminal only ever shows model names, labels, confidences and timings. Never paths,
 * URLs, hostnames, settings or keys, and visitor text is shortened and masked.
 * See docs/10-braindump-in-the-browser.md ("The terminal").
 */
import type { Decision } from '../../lab/router/arbitrator'

export type LineKind = 'cmd' | 'out' | 'ok' | 'dim' | 'warn'
export interface TermLine {
  id: number
  kind: LineKind
  text: string
}

const TIER_NAME = ['', 't1 svm    ', 't2 student', 't3 teacher']

/** Visitor text, safe to print: one line, short, with emails, links and long numbers masked. */
export function safeQuote(text: string, max = 44): string {
  let t = text
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\S+@\S+\.\S+/g, '[email]')
    .replace(/\b(?:https?:\/\/|www\.)\S+/gi, '[link]')
    .replace(/\d[\d\s-]{5,}\d/g, '[number]')
  if (t.length > max) t = t.slice(0, max - 1).trimEnd() + '…'
  return `"${t.replace(/"/g, "'")}"`
}

export const fmtMs = (v: number) => (v < 0.1 ? '<0.1 ms' : `${v.toFixed(v < 10 ? 1 : 0)} ms`)
const pct = (v: number) => `${Math.round(v * 100)}%`.padStart(4)

/** The lines for one routed thought: the command, one line per tier that ran, then the verdict. */
export function routeLines(text: string, d: Decision, thresholds: [number, number], sample: boolean): Omit<TermLine, 'id'>[] {
  const lines: Omit<TermLine, 'id'>[] = [{ kind: 'cmd', text: `route ${sample ? '--sample ' : ''}${safeQuote(text)}` }]
  for (const t of d.trace) {
    const won = t.tier === d.winner
    const limit = t.tier === 3 ? null : thresholds[t.tier - 1]
    const verdict = won ? 'accept' : limit !== null ? `< ${limit.toFixed(2)} escalate` : 'pass'
    lines.push({
      kind: won ? 'ok' : 'out',
      text: `  ${TIER_NAME[t.tier]}  ${t.label.toLowerCase().padEnd(10)} ${pct(t.confidence)}  ${fmtMs(t.ms).padStart(7)}   ${verdict}`,
    })
  }
  lines.push({ kind: 'dim', text: `  → ${d.label} · tier ${d.winner} · ${pct(d.confidence).trim()}` })
  return lines
}

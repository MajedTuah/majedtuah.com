/*
 * The messages the page and the router Web Worker send each other, plus the shape of
 * manifest.json (written by tools/export/parity_check.py). See docs/10-braindump-in-the-browser.md.
 */
import type { Decision, TierTrace } from './arbitrator'

export type TierKey = 'tier1' | 'tier2' | 'tier3'
export type LoadState = 'idle' | 'loading' | 'ready' | 'error'

export interface Manifest {
  labels: string[]
  thresholds: { tier1: number; tier2: number }
  maxLength: number
  presets: { text: string; expectedTier: 1 | 2 | 3 }[]
  tiers: Record<TierKey, { model: string; files: { path: string; bytes: number; sha256: string }[] }>
}

export type ToWorker = { type: 'init' } | { type: 'load'; tier: TierKey } | { type: 'route'; id: number; text: string }

export type FromWorker =
  | { type: 'manifest'; manifest: Manifest; teacherAvailable: boolean }
  | { type: 'status'; tier: TierKey; state: LoadState; progress: number }
  | { type: 'tier'; id: number; trace: TierTrace }
  | { type: 'result'; id: number; decision: Decision }
  | { type: 'error'; id?: number }

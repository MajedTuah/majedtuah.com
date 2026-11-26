/*
 * The BrainDump arbitrator: decides which tier's answer to trust. An exact copy of the rules in
 * braindump.ai ml/ensemble/arbitrator.py. Each tier runs only if the one before it wasn't sure.
 * Explained in docs/10-braindump-in-the-browser.md.
 */
import type { Probs } from './tier1'

export const TIER1_THRESHOLD = 0.9
export const TIER2_THRESHOLD = 0.85

/** Runs one tier and returns its probabilities, or null if that tier isn't loaded. */
export type TierRunner = (text: string) => Promise<Probs | null>

export interface TierTrace {
  tier: 1 | 2 | 3
  label: string
  confidence: number
  /** time this tier took, measured on this device */
  ms: number
}

export interface Decision {
  winner: 1 | 2 | 3
  label: string
  confidence: number
  /** the tiers that actually ran, in order */
  trace: TierTrace[]
}

export function top(p: Probs): [string, number] {
  let best: [string, number] = ['', -1]
  for (const [k, v] of Object.entries(p)) if (v > best[1]) best = [k, v]
  return best
}

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())

async function timed(tier: 1 | 2 | 3, run: TierRunner, text: string): Promise<TierTrace | null> {
  const t0 = now()
  const p = await run(text)
  if (!p) return null
  const [label, confidence] = top(p)
  return { tier, label, confidence, ms: now() - t0 }
}

export async function route(
  text: string,
  tiers: { tier1: TierRunner; tier2: TierRunner; tier3: TierRunner },
  onTier?: (t: TierTrace) => void,
): Promise<Decision> {
  const trace: TierTrace[] = []
  const record = (t: TierTrace | null) => {
    if (t) {
      trace.push(t)
      onTier?.(t)
    }
    return t
  }

  // Rule 1: Tier 1 always runs. Sure enough? Done (the speed path).
  const t1 = record(await timed(1, tiers.tier1, text))!
  if (t1.confidence >= TIER1_THRESHOLD) return { winner: 1, label: t1.label, confidence: t1.confidence, trace }

  // Rule 2: Tier 2, if loaded. Sure enough? Done. If both agree, average their confidence.
  const t2 = record(await timed(2, tiers.tier2, text))
  if (t2 && t2.confidence >= TIER2_THRESHOLD) {
    const confidence = t2.label === t1.label ? (t2.confidence + t1.confidence) / 2 : t2.confidence
    return { winner: 2, label: t2.label, confidence, trace }
  }

  // Rule 3: Tier 3 (the teacher), if loaded, has the final word.
  const t3 = record(await timed(3, tiers.tier3, text))
  if (t3 && t3.confidence > 0) return { winner: 3, label: t3.label, confidence: t3.confidence, trace }
  // No teacher: fall back to Tier 2, then Tier 1 (same order as arbitrator.py)
  if (t2 && t2.confidence > 0) return { winner: 2, label: t2.label, confidence: t2.confidence, trace }
  return { winner: 1, label: t1.label, confidence: t1.confidence, trace }
}

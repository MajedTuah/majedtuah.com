/*
 * Every branch of the arbitrator, checked against the rules in braindump.ai arbitrator.py.
 * See docs/10-braindump-in-the-browser.md.
 */
import { describe, expect, it } from 'vitest'
import { route, type TierRunner } from './arbitrator'

const sure = (label: string, p: number): TierRunner => async () => ({ [label]: p, OTHER: 1 - p })
const absent: TierRunner = async () => null

describe('route', () => {
  it('rule 1: Tier 1 at 90%+ wins and nothing else runs', async () => {
    let ran2 = false
    const d = await route('x', { tier1: sure('ADMIN', 0.95), tier2: async () => ((ran2 = true), { ADMIN: 1 }), tier3: absent })
    expect(d).toMatchObject({ winner: 1, label: 'ADMIN', confidence: 0.95 })
    expect(ran2).toBe(false)
    expect(d.trace).toHaveLength(1)
  })

  it('rule 2: Tier 2 at 85%+ wins; agreeing tiers average their confidence', async () => {
    const d = await route('x', { tier1: sure('ADMIN', 0.7), tier2: sure('ADMIN', 0.9), tier3: absent })
    expect(d.winner).toBe(2)
    expect(d.confidence).toBeCloseTo(0.8)
  })

  it('rule 2: disagreeing tiers keep Tier 2 confidence', async () => {
    const d = await route('x', { tier1: sure('ADMIN', 0.7), tier2: sure('FINANCIAL', 0.9), tier3: absent })
    expect(d).toMatchObject({ winner: 2, label: 'FINANCIAL', confidence: 0.9 })
  })

  it('rule 3: the teacher decides when both are unsure', async () => {
    const d = await route('x', { tier1: sure('ADMIN', 0.6), tier2: sure('ADMIN', 0.6), tier3: sure('PROJECTS', 0.7) })
    expect(d).toMatchObject({ winner: 3, label: 'PROJECTS' })
    expect(d.trace.map((t) => t.tier)).toEqual([1, 2, 3])
  })

  it('no teacher loaded: falls back to Tier 2', async () => {
    const d = await route('x', { tier1: sure('ADMIN', 0.6), tier2: sure('FINANCIAL', 0.5), tier3: absent })
    expect(d).toMatchObject({ winner: 2, label: 'FINANCIAL', confidence: 0.5 })
  })

  it('nothing else loaded: falls back to Tier 1', async () => {
    const d = await route('x', { tier1: sure('ADMIN', 0.6), tier2: absent, tier3: absent })
    expect(d).toMatchObject({ winner: 1, label: 'ADMIN' })
  })

  it('reports each tier as it finishes', async () => {
    const seen: number[] = []
    await route('x', { tier1: sure('A', 0.5), tier2: sure('A', 0.5), tier3: sure('A', 0.5) }, (t) => seen.push(t.tier))
    expect(seen).toEqual([1, 2, 3])
  })
})

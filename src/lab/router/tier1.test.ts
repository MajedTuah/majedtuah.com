/*
 * Proves the TypeScript Tier 1 gives the same probabilities as sklearn did in Python, for every
 * sentence in the golden fixtures written by tools/export/parity_check.py.
 * See docs/10-braindump-in-the-browser.md.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { analyze, compileTier1, predictTier1, type Tier1Model } from './tier1'

const root = join(__dirname, '..', '..', '..')
const model = compileTier1(JSON.parse(readFileSync(join(root, 'public/models/braindump/tier1.json'), 'utf8')) as Tier1Model)
const golden: { text: string; tier1: Record<string, number> }[] = JSON.parse(readFileSync(join(__dirname, '__fixtures__/golden.json'), 'utf8'))

describe('analyze (sklearn word analyzer)', () => {
  it('lowercases, strips accents, drops 1-letter tokens and adds bigrams', () => {
    expect(analyze('Café a la MODE, RM500!')).toEqual(['cafe', 'la', 'mode', 'rm500', 'cafe la', 'la mode', 'mode rm500'])
  })
})

describe('predictTier1 matches sklearn', () => {
  it.each(golden.map((g) => [g.text, g]))('%s', (_text, g) => {
    const p = predictTier1(model, g.text)
    for (const [label, want] of Object.entries(g.tier1)) expect(p[label]).toBeCloseTo(want, 6)
  })
})

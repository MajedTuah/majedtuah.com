/* The terminal must never echo anything sensitive. See docs/10-braindump-in-the-browser.md. */
import { describe, expect, it } from 'vitest'
import { routeLines, safeQuote } from './routerLog'

describe('safeQuote', () => {
  it('masks emails, links and long numbers', () => {
    expect(safeQuote('email me@x.com or see https://a.b/c, card 4111 1111 1111 1111', 200)).toBe(
      '"email [email] or see [link] card [number]"',
    )
  })
  it('flattens to one short line', () => {
    expect(safeQuote('a\nb\t c' + 'x'.repeat(100))).toHaveLength(46) // 44 + two quotes
  })
  it('keeps short normal text as-is', () => {
    expect(safeQuote('pay rm500 rent')).toBe('"pay rm500 rent"')
  })
})

describe('routeLines', () => {
  it('prints each tier that ran and the verdict', () => {
    const lines = routeLines(
      'pay the bill',
      {
        winner: 2,
        label: 'FINANCIAL',
        confidence: 0.99,
        trace: [
          { tier: 1, label: 'ADMIN', confidence: 0.49, ms: 0.05 },
          { tier: 2, label: 'FINANCIAL', confidence: 0.99, ms: 1.04 },
        ],
      },
      [0.9, 0.85],
      true,
    )
    expect(lines.map((l) => l.kind)).toEqual(['cmd', 'out', 'ok', 'dim'])
    expect(lines[0].text).toBe('route --sample "pay the bill"')
    expect(lines[1].text).toContain('< 0.90 escalate')
    expect(lines[1].text).toContain('<0.1 ms')
    expect(lines[2].text).toContain('accept')
    expect(lines[3].text).toBe('  → FINANCIAL · tier 2 · 99%')
  })
})

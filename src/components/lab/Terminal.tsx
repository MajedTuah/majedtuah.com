/*
 * A decorative terminal that prints lines one at a time: commands are "typed", output appears just
 * after. Only the newest lines are kept on screen. It's hidden from screen readers (the demo's real
 * results are announced elsewhere) and shows everything at once for reduced-motion visitors.
 * See docs/10-braindump-in-the-browser.md ("The terminal").
 */
import { useEffect, useState } from 'react'
import { useReducedMotion } from '../ui'
import type { TermLine } from './routerLog'

const VISIBLE = 11
const TYPE_MS = 22
const GAP_MS = 140

const COLOR: Record<TermLine['kind'], string> = {
  cmd: 'text-bone',
  out: 'text-mist',
  ok: 'text-accent',
  dim: 'text-ash',
  warn: 'text-[#c9a26b]',
}

export default function Terminal({ lines, title }: { lines: TermLine[]; title: string }) {
  const reduce = useReducedMotion()
  // how many lines are fully printed, and how many characters of the next one
  const [done, setDone] = useState(0)
  const [chars, setChars] = useState(0)

  // The list only grows at the end, but old lines get trimmed from the front: keep "done" in range
  const firstId = lines[0]?.id ?? 0
  const [base, setBase] = useState(firstId)
  if (base !== firstId) {
    setDone((d) => Math.max(0, d - (firstId - base)))
    setBase(firstId)
  }

  useEffect(() => {
    if (reduce) {
      setDone(lines.length)
      return
    }
    if (done >= lines.length) return
    const next = lines[done]
    if (next.kind === 'cmd' && chars < next.text.length) {
      const t = setTimeout(() => setChars((c) => c + 1), TYPE_MS)
      return () => clearTimeout(t)
    }
    const t = setTimeout(
      () => {
        setDone((d) => d + 1)
        setChars(0)
      },
      next.kind === 'cmd' ? GAP_MS * 2 : GAP_MS,
    )
    return () => clearTimeout(t)
  }, [lines, done, chars, reduce])

  const printed = lines.slice(0, done)
  const current = done < lines.length && lines[done].kind === 'cmd' ? lines[done] : null
  const shown = printed.slice(-(current ? VISIBLE - 1 : VISIBLE))
  const idle = !current && done >= lines.length

  return (
    <div className="overflow-hidden rounded-2xl border border-bone/12 bg-ink/70" aria-hidden="true">
      <div className="flex items-center gap-2 border-b border-bone/10 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-bone/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-bone/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-bone/15" />
        <span className="mono ml-3 text-[10px] tracking-[0.16em] text-ash uppercase">{title}</span>
      </div>
      <pre className="mono m-0 h-[244px] overflow-hidden px-4 py-3 text-[11.5px] leading-[20px] whitespace-pre">
        {shown.map((l) => (
          <div key={l.id} className={COLOR[l.kind]}>
            {l.kind === 'cmd' ? <span className="text-accent">$ </span> : null}
            {l.text}
          </div>
        ))}
        {current ? (
          <div className="text-bone">
            <span className="text-accent">$ </span>
            {current.text.slice(0, chars)}
            <span className="term-caret" />
          </div>
        ) : idle ? (
          <div>
            <span className="text-accent">$ </span>
            <span className="term-caret" />
          </div>
        ) : null}
      </pre>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { IMPACT } from '../data'
import { useInView, useReducedMotion } from './ui'

/** Count-up from 0 to `to` once `run` turns true. */
function useCount(to: number, run: boolean, reduce: boolean) {
  const [v, setV] = useState(reduce ? to : 0)
  useEffect(() => {
    if (!run) return
    if (reduce) {
      setV(to)
      return
    }
    let raf = 0
    const start = performance.now()
    const dur = 1600
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur)
      setV(Math.round(to * (1 - Math.pow(1 - t, 3))))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to, run, reduce])
  return v
}

function Stat({ value, suffix, label, run, reduce }: { value: number; suffix?: string; label: string; run: boolean; reduce: boolean }) {
  const v = useCount(value, run, reduce)
  return (
    <div className="flex flex-col gap-2 border-l border-accent/25 pl-6">
      <span className="disp text-[clamp(48px,6vw,84px)] leading-none" aria-label={`${value}${suffix ?? ''}`}>
        {v}
        <span className="text-accent">{suffix}</span>
      </span>
      <span className="text-sm leading-snug text-ash">{label}</span>
    </div>
  )
}

/** Impact counters. Hidden until IMPACT in data.ts has entries. */
export default function Impact() {
  const reduce = useReducedMotion()
  const [ref, seen] = useInView<HTMLDivElement>(0.3)
  if (IMPACT.length === 0) return null
  return (
    <section aria-label="Impact" className="relative border-t border-bone/10">
      <div ref={ref} className="mx-auto grid max-w-[1360px] grid-cols-2 gap-10 px-5 py-20 md:px-10 lg:grid-cols-4">
        {IMPACT.map((s) => (
          <Stat key={s.label} {...s} run={seen} reduce={reduce} />
        ))}
      </div>
    </section>
  )
}

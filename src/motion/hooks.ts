import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { gsap, prefersReducedMotion, SplitText, useGSAP } from './gsap'

/** "14:32" in the given time zone, refreshed every 30 seconds. */
export function useClock(timeZone = 'Asia/Kuala_Lumpur') {
  const fmt = useRef(new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hour12: false }))
  const [time, setTime] = useState(() => fmt.current.format(new Date()))
  useEffect(() => {
    const id = setInterval(() => setTime(fmt.current.format(new Date())), 30_000)
    return () => clearInterval(id)
  }, [])
  return time
}

/** Pulls an element up to `strength` px toward the pointer while hovered. Mouse/trackpad only. */
export function useMagnetic<T extends HTMLElement>(strength = 10) {
  const cleanup = useRef<() => void>(undefined)
  return useCallback(
    (el: T | null) => {
      cleanup.current?.()
      cleanup.current = undefined
      if (!el || prefersReducedMotion() || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
      const x = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' })
      const y = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' })
      const move = (e: PointerEvent) => {
        const r = el.getBoundingClientRect()
        x(((e.clientX - r.left) / r.width - 0.5) * 2 * strength)
        y(((e.clientY - r.top) / r.height - 0.5) * 2 * strength)
      }
      const leave = () => {
        x(0)
        y(0)
      }
      el.addEventListener('pointermove', move)
      el.addEventListener('pointerleave', leave)
      cleanup.current = () => {
        el.removeEventListener('pointermove', move)
        el.removeEventListener('pointerleave', leave)
      }
    },
    [strength],
  )
}

/**
 * Splits an element into masked lines and raises them one by one when it scrolls into view (Liminal-style).
 * Re-splits on resize and whenever `deps` change. Never use on Arabic: splitting breaks the letter joins.
 */
export function useLineReveal(ref: RefObject<HTMLElement | null>, deps: unknown[] = [], delay = 0) {
  useGSAP(
    () => {
      const el = ref.current
      if (!el || prefersReducedMotion()) return
      const split = SplitText.create(el, {
        type: 'lines',
        mask: 'lines',
        autoSplit: true,
        onSplit: (self) =>
          gsap.from(self.lines, {
            yPercent: 110,
            duration: 1.2,
            stagger: 0.08,
            delay,
            scrollTrigger: { trigger: el, start: 'top 88%', once: true },
          }),
      })
      return () => split.revert()
    },
    { dependencies: deps, revertOnUpdate: true },
  )
}

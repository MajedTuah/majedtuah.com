import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { gsap, prefersReducedMotion, ScrollTrigger, useGSAP } from '../motion/gsap'
import { getLenis } from '../motion/smooth'
import { pad2, useInView } from './ui'

/** Desktop with motion allowed: the section pins and page scroll drives the cards sideways. */
const SCRUB_QUERY = '(min-width: 1024px) and (prefers-reduced-motion: no-preference)'

/**
 * Carousel with two modes.
 * - Desktop: scroll-driven (Liminal-style). When the section's bottom reaches the bottom of the screen it pins, and
 *   scrolling down slides the cards from first to last. Prev/Next scroll the page to the matching point.
 * - Phones / reduced motion: a native horizontal scroller with scroll-snap; swipe, or Prev/Next one card at a time.
 * In both, the current card is bright and the rest dim.
 */
export default function Carousel<T>({ items, label, render }: { items: T[]; label: string; render: (item: T, i: number) => ReactNode }) {
  const root = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const trigger = useRef<ScrollTrigger | null>(null)
  const [index, setIndex] = useState(0)
  const [inView, seen] = useInView<HTMLDivElement>(0.2)

  const slides = () => Array.from(track.current?.children ?? []) as HTMLElement[]
  const maxScroll = () => (track.current ? track.current.scrollWidth - track.current.clientWidth : 0)
  /** Horizontal scroll position at which slide i sits at the left edge */
  const slideX = (i: number) => {
    const t = track.current
    const s = slides()[i]
    if (!t || !s) return 0
    return Math.min(maxScroll(), Math.max(0, s.offsetLeft - t.offsetLeft - parseFloat(getComputedStyle(t).paddingLeft)))
  }

  // Desktop: pin the whole section and map vertical scroll onto the track
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(SCRUB_QUERY, () => {
        const t = track.current
        const section = t?.closest('section')
        if (!t || !section) return
        t.classList.add('is-scrubbed')
        trigger.current = ScrollTrigger.create({
          trigger: section,
          start: 'bottom bottom',
          end: () => `+=${Math.max(1, maxScroll())}`,
          pin: true,
          scrub: true,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            t.scrollLeft = self.progress * maxScroll()
          },
        })
        return () => {
          t.classList.remove('is-scrubbed')
          trigger.current?.kill()
          trigger.current = null
        }
      })
      return () => mm.revert()
    },
    { scope: root },
  )

  const goTo = useCallback(
    (i: number) => {
      const target = Math.max(0, Math.min(items.length - 1, i))
      const st = trigger.current
      if (st) {
        // scroll the PAGE to the point where this card is current
        const max = maxScroll()
        const y = st.start + (max ? slideX(target) / max : 0) * (st.end - st.start)
        const lenis = getLenis()
        if (lenis) lenis.scrollTo(y, { duration: 1.1 })
        else window.scrollTo({ top: y, behavior: 'smooth' })
        return
      }
      const t = track.current
      if (!t) return
      t.scrollTo({ left: slideX(target), behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items.length],
  )

  // Snap cards to the same line as the heading. CSS can't express this: scroll-padding % would measure the
  // full-bleed track itself, so copy the computed side padding in px instead.
  useEffect(() => {
    const t = track.current
    if (!t) return
    const sync = () => {
      t.style.scrollPaddingInline = getComputedStyle(t).paddingLeft
    }
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [])

  // Keep the counter in sync however the track moved (page scroll, buttons, swipe)
  useEffect(() => {
    const t = track.current
    if (!t) return
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        let best = 0
        slides().forEach((_, i) => {
          if (Math.abs(slideX(i) - t.scrollLeft) < Math.abs(slideX(best) - t.scrollLeft)) best = i
        })
        if (t.scrollLeft >= maxScroll() - 4) best = items.length - 1
        // once the track has moved, soften its left edge so passed cards fade out instead of being cut off
        t.classList.toggle("has-past", t.scrollLeft > 4)
        setIndex(best)
      })
    }
    t.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      t.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length])

  // First time it scrolls into view: cards slide in from the right, one after another
  useEffect(() => {
    if (!seen || prefersReducedMotion()) return
    gsap.from(slides(), { x: 90, opacity: 0, duration: 1.2, stagger: 0.09, ease: 'power4.out', clearProps: 'transform,opacity' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seen])

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      goTo(index + 1)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      goTo(index - 1)
    }
  }

  return (
    <div ref={root}>
      <div ref={inView} className={`carousel ${seen ? 'in' : ''}`} role="region" aria-roledescription="carousel" aria-label={label}>
        <div ref={track} className="car-track" tabIndex={0} onKeyDown={onKey}>
          {items.map((it, i) => (
            <div
              key={i}
              className={`car-slide ${i === index ? "is-current" : i < index ? "is-past" : ""}`}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${items.length}`}
            >
              {render(it, i)}
            </div>
          ))}
        </div>

        <div className="mt-8 flex items-center gap-6">
          <span className="mono text-xs tracking-[0.16em] text-ash tabular-nums" aria-live="polite">
            <span className="text-bone">{pad2(index + 1)}</span> / {pad2(items.length)}
          </span>
          <div className="h-px flex-1 bg-bone/12" aria-hidden="true">
            <div className="car-progress h-px bg-accent" style={{ width: `${((index + 1) / items.length) * 100}%` }} />
          </div>
          <span className="car-hint mono hidden text-[10px] tracking-[0.18em] text-ash uppercase lg:inline">Scroll ↓</span>
          <div className="flex gap-2">
            <button type="button" className="car-btn" onClick={() => goTo(index - 1)} disabled={index === 0} aria-label="Previous">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M19 12H5" />
                <path d="m12 19-7-7 7-7" />
              </svg>
            </button>
            <button type="button" className="car-btn" onClick={() => goTo(index + 1)} disabled={index === items.length - 1} aria-label="Next">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

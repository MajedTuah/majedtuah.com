import { Fragment, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { useLineReveal } from '../motion/hooks'

export function ArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  )
}

export function ArrowUpRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 17 17 7" />
      <path d="M7 7h10v10" />
    </svg>
  )
}

export function Download() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 4v12" />
      <path d="m6 11 6 6 6-6" />
      <path d="M5 20h14" />
    </svg>
  )
}

/** Renders text with **bold** segments. */
export function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split('**').map((part, i) =>
        i % 2 ? (
          <strong key={i} className="font-semibold text-bone">
            {part}
          </strong>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  )
}

const REDUCED = '(prefers-reduced-motion: reduce)'

/** The visitor's reduced-motion setting, kept in sync. */
export function useReducedMotion() {
  return useSyncExternalStore(
    (cb) => {
      const list = window.matchMedia(REDUCED)
      list.addEventListener('change', cb)
      return () => list.removeEventListener('change', cb)
    },
    () => window.matchMedia(REDUCED).matches,
    () => false,
  )
}

export const pad2 = (n: number) => String(n).padStart(2, '0')

/** True once the element has scrolled into view (stays true). */
export function useInView<T extends Element>(threshold = 0.2) {
  const ref = useRef<T>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || seen) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true)
          io.disconnect()
        }
      },
      { threshold },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [threshold, seen])
  return [ref, seen] as const
}

/**
 * Reveals its children once they scroll into view.
 * "fade" rises and fades in; "wipe" uncovers left to right with a clip-path (Liminal-style).
 */
export function Reveal({
  children,
  delay = 0,
  className = '',
  variant = 'fade',
}: {
  children: ReactNode
  delay?: number
  className?: string
  variant?: 'fade' | 'wipe'
}) {
  const [ref, seen] = useInView<HTMLDivElement>(0.15)
  // The observer watches the plain outer box. Watching the clipped box itself never fires in Chrome:
  // a fully clipped element (inset 0 100% 0 0) counts as invisible, so the reveal would never start.
  return (
    <div ref={ref} className="h-full">
      <div
        className={`${variant === 'wipe' ? 'reveal-wipe' : 'reveal'} ${seen ? 'in' : ''} h-full ${className}`}
        style={{ transitionDelay: `${delay}ms` }}
      >
        {children}
      </div>
    </div>
  )
}

/** A paragraph whose lines rise from a mask as it scrolls in. */
export function LineP({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null)
  useLineReveal(ref, [], 0.15)
  return (
    <p ref={ref} className={className}>
      {children}
    </p>
  )
}

/** A wide section shell with the soft light pool behind it. overflow: clip (not hidden) so sticky children still work. */
export function Section({ id, label, children, glow = 'left' }: { id: string; label: string; children: ReactNode; glow?: 'left' | 'right' | 'none' }) {
  return (
    <section id={id} aria-label={label} className="relative scroll-mt-24 overflow-clip border-t border-bone/10">
      {glow !== 'none' && (
        <div
          className="glow opacity-80"
          aria-hidden="true"
          style={glow === 'left' ? { left: '-25%', top: '-15%', width: 1200, height: 1000 } : { right: '-25%', top: '10%', width: 1200, height: 1000 }}
        />
      )}
      <div className="relative mx-auto max-w-[1360px] px-5 pt-32 pb-28 md:px-10">{children}</div>
    </section>
  )
}

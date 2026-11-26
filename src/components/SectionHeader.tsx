import { useRef, type ReactNode } from 'react'
import { useLineReveal } from '../motion/hooks'

interface Props {
  /** Section number, e.g. "03" */
  n: string
  /** Eyebrow label after the number */
  label: string
  /** Plain part of the heading */
  title: string
  /** Emerald-outlined part of the heading */
  outlined: string
  /** Arabic word on the right */
  ar?: string
  /** Extra controls on the right (e.g. a pager) */
  right?: ReactNode
  /** Extra eyebrow text */
  meta?: string
  arKey?: string | number
}

/** The shared section header: number eyebrow, Sentient heading with one outlined word, Arabic word on the right. */
export default function SectionHeader({ n, label, title, outlined, ar, right, meta, arKey }: Props) {
  const h2 = useRef<HTMLHeadingElement>(null)
  // Lines rise from a mask as the heading scrolls in; re-runs when the title changes (About pager)
  useLineReveal(h2, [title, outlined])

  return (
    <div className="mb-16 flex flex-wrap items-end justify-between gap-8">
      <div className="flex flex-col gap-4">
        <span className="eyebrow">
          {n} — {label}
          {meta ? ` · ${meta}` : ''}
        </span>
        <h2 ref={h2} className="disp section-title m-0">
          {title} <span className="outline-word">{outlined}</span>
        </h2>
      </div>
      {(ar || right) && (
        <div className="flex items-center gap-4">
          {ar && (
            <span key={arKey} lang="ar" className="ar page-in hidden text-[clamp(48px,6vw,88px)] leading-none text-ash md:block">
              {ar}
            </span>
          )}
          {right}
        </div>
      )}
    </div>
  )
}

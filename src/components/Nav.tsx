import { useEffect, useRef, useState } from 'react'
import { EMAIL, LINKS } from '../data'
import { gsap, prefersReducedMotion, useGSAP } from '../motion/gsap'
import { useClock, useMagnetic } from '../motion/hooks'
import { getLenis } from '../motion/smooth'
import { ArrowRight } from './ui'

type Item = { step: string; label: string; href: string; download?: boolean }

const LEFT: Item[] = [
  { step: '01', label: 'Home', href: '#top' },
  { step: '02', label: 'Work', href: '#work' },
  { step: '03', label: 'Lab', href: '#lab' },
]
const RIGHT: Item[] = [
  { step: '04', label: 'Teaching', href: '#teaching' },
  { step: '05', label: 'About', href: '#about' },
  { step: '06', label: 'CV', href: LINKS.cv, download: true },
]

/** Section ids in page order, and which nav link each one lights up. */
const SECTIONS: [id: string, link: string][] = [
  ['top', '#top'],
  ['work', '#work'],
  ['experience', '#work'],
  ['lab', '#lab'],
  ['teaching', '#teaching'],
  ['about', '#about'],
  ['recognition', ''],
  ['contact', ''],
]

/** Floating glass navbar; highlights the section in view. */
export default function Nav() {
  const [active, setActive] = useState('#top')
  const [open, setOpen] = useState(false)
  const time = useClock()
  const magnet = useMagnetic<HTMLAnchorElement>()

  useEffect(() => {
    const onScroll = () => {
      const line = window.innerHeight * 0.4
      let current = '#top'
      for (const [id, link] of SECTIONS) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top <= line) current = link
      }
      setActive(current)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('hashchange', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('hashchange', onScroll)
    }
  }, [])

  const link = (l: Item) => (
    <li key={l.href}>
      <a
        className={`navlink ${active === l.href ? 'on' : ''}`}
        href={l.href}
        aria-current={active === l.href ? 'page' : undefined}
        {...(l.download ? { download: 'MajedTuah_Resume.pdf' } : {})}
      >
        <span className="step">{l.step}</span>
        {l.label}
      </a>
    </li>
  )

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50">
        <nav className="glass glass-blur mx-3 mt-3 flex items-center justify-between gap-4 rounded-full py-2 pr-2 pl-5 md:mx-7 md:mt-[18px] md:gap-6 md:pl-[22px]">
          <div className="mono hidden w-[250px] items-center gap-2.5 text-[11px] tracking-[0.14em] text-ash uppercase lg:flex">
            <span className="size-[7px] rounded-full bg-accent shadow-[0_0_10px_var(--color-accent)]" />
            <span>Kuala Lumpur</span>
            <time className="text-bone tabular-nums">{time}</time>
          </div>
          <ul className="hidden gap-7 lg:flex">{LEFT.map(link)}</ul>
          <a href="#top" className="flex items-baseline gap-2.5">
            <span className="ar text-2xl font-bold">مجيد</span>
            <span className="mono hidden text-[11px] tracking-[0.28em] text-ash uppercase sm:inline">Majed Tuah</span>
          </a>
          <ul className="hidden gap-7 lg:flex">{RIGHT.map(link)}</ul>
          <div className="flex items-center justify-end gap-2 lg:w-[250px]">
            <a ref={magnet} className="ink-btn btn-light" href="#contact">
              Contact <ArrowRight />
            </a>
            <button
              type="button"
              className="burger lg:hidden"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              aria-controls="mobile-menu"
              onClick={() => setOpen((o) => !o)}
            >
              <span className={open ? 'x' : ''} />
            </button>
          </div>
        </nav>
      </header>
      {open && <MobileMenu time={time} onClose={() => setOpen(false)} />}
    </>
  )
}

/** Full-screen menu for small screens: links rise from a mask one by one. */
function MobileMenu({ time, onClose }: { time: string; onClose: () => void }) {
  const root = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      gsap.from(root.current, { opacity: 0, duration: 0.4, ease: 'power2.out' })
      gsap.from('.mm-link > span', { yPercent: 110, duration: 0.9, stagger: 0.06, delay: 0.1 })
      gsap.from('.mm-foot', { opacity: 0, y: 12, duration: 0.6, delay: 0.45 })
    },
    { scope: root },
  )

  useEffect(() => {
    getLenis()?.stop()
    root.current?.querySelector<HTMLAnchorElement>('a')?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      getLenis()?.start()
    }
  }, [onClose])

  const close = () => {
    getLenis()?.start()
    onClose()
  }

  return (
    <div ref={root} id="mobile-menu" role="dialog" aria-modal="true" aria-label="Menu" className="mobile-menu lg:hidden">
      <span lang="ar" aria-hidden="true" className="ar pointer-events-none absolute -right-6 bottom-24 text-[46vw] leading-none font-bold text-bone/[0.04] select-none">
        مجيد
      </span>
      <ul className="relative m-0 flex list-none flex-col gap-1 p-0">
        {[...LEFT, ...RIGHT].map((l) => (
          <li key={l.href}>
            <a className="mm-link" href={l.href} onClick={close} {...(l.download ? { download: 'MajedTuah_Resume.pdf' } : {})}>
              <span>
                <em className="mono mr-3 align-middle text-[11px] not-italic text-ash">{l.step}</em>
                {l.label}
              </span>
            </a>
          </li>
        ))}
      </ul>
      <div className="mm-foot mono relative flex flex-col gap-2 text-[11px] tracking-[0.18em] text-ash uppercase">
        <span>
          Kuala Lumpur <time className="text-bone">{time}</time> · Now building <span className="text-bone">braindump.ai</span>
        </span>
        <a className="text-bone" href={LINKS.email}>
          {EMAIL} ↗
        </a>
      </div>
    </div>
  )
}

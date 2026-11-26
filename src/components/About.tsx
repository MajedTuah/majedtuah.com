import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { LINKS, MORE_PROJECTS, PROJECTS, RESUME } from '../data'
import portrait from '../assets/portrait-cutout.webp'
import { gsap, prefersReducedMotion, ScrollTrigger, SplitText, useGSAP } from '../motion/gsap'
import { scrollToHash } from '../motion/smooth'
import SectionHeader from './SectionHeader'
import { ArrowUpRight, Download, LineP, Reveal, pad2 } from './ui'

const PAGES = [
  { id: 'about', label: 'Résumé', ar: 'سيرة' },
  { id: 'projects', label: 'Projects', ar: 'أعمال' },
] as const

/** About: two pages, the résumé first and the GitHub projects second. #about and #projects open each one. */
export default function About({ n }: { n: string }) {
  const [page, setPage] = useState(0)
  const [dir, setDir] = useState(1)
  const sectionRef = useRef<HTMLElement>(null)

  /** Switch page; where supported, the View Transitions API slides the old page out (see ::view-transition in index.css). */
  const turn = (next: number) => {
    if (next === page) return
    const apply = () =>
      flushSync(() => {
        setDir(next > page ? 1 : -1)
        setPage(next)
      })
    if (document.startViewTransition && !prefersReducedMotion()) document.startViewTransition(apply)
    else apply()
  }

  const go = (next: number, scroll = false) => {
    turn(next)
    if (scroll) scrollToHash('#about')
  }

  // Follow the URL hash so the navbar's About / Projects links open the right page.
  // In-page links already scroll smoothly (SmoothScroll), so only a direct visit needs a scroll here.
  useEffect(() => {
    const sync = (scroll: boolean) => {
      const i = PAGES.findIndex((p) => `#${p.id}` === location.hash)
      if (i < 0) return
      setPage((cur) => {
        setDir(i > cur ? 1 : -1)
        return i
      })
      if (scroll) requestAnimationFrame(() => scrollToHash('#about'))
    }
    sync(true)
    const onHash = () => sync(false)
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // Switching pages changes the page height: recompute every ScrollTrigger position below this section
  useEffect(() => {
    const id = requestAnimationFrame(() => ScrollTrigger.refresh())
    return () => cancelAnimationFrame(id)
  }, [page])

  return (
    <section ref={sectionRef} id="about" className="relative overflow-clip border-t border-bone/10" aria-label="About">
      {/* the hero's accent glow, reused as this section's background layer */}
      <div className="glow" aria-hidden="true" style={{ left: '-20%', top: '-10%', width: 1300, height: 1100 }} />
      <div className="glow opacity-70" aria-hidden="true" style={{ right: '-25%', bottom: '-20%', width: 1200, height: 1000 }} />
      <span id="projects" className="absolute top-0" aria-hidden="true" />

      <div className="relative mx-auto max-w-[1360px] px-5 pt-36 pb-28 md:px-10">
        {/* header + pager */}
        <SectionHeader
          n={n}
          label="About"
          meta={`Page ${pad2(page + 1)} / ${pad2(PAGES.length)}`}
          title={page === 0 ? 'About' : 'Selected'}
          outlined={page === 0 ? 'me' : 'projects'}
          ar={PAGES[page].ar}
          arKey={page}
          right={
            <div className="glass flex rounded-full p-1" role="tablist" aria-label="About pages">
              {PAGES.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  role="tab"
                  aria-selected={page === i}
                  onClick={() => turn(i)}
                  className={`mono min-h-11 cursor-pointer rounded-full border-0 px-5 text-[11px] tracking-[0.18em] uppercase transition-colors duration-300 ${
                    page === i ? 'bg-bone text-ink' : 'bg-transparent text-ash hover:text-bone'
                  }`}
                >
                  <span className="mr-1.5 opacity-60">{pad2(i + 1)}</span>
                  {p.label}
                </button>
              ))}
            </div>
          }
        />

        <div key={page} className="page-in about-panel" style={{ ['--from' as string]: `${dir * 40}px` }} role="tabpanel">
          {page === 0 ? <Resume /> : <Projects />}
        </div>

        {/* page turn */}
        <div className="mt-16 flex justify-end">
          {page === 0 ? (
            <button type="button" onClick={() => go(1, true)} className="ink-btn btn-glass glass cursor-pointer">
              Next page: Projects <span aria-hidden="true">→</span>
            </button>
          ) : (
            <button type="button" onClick={() => go(0, true)} className="ink-btn btn-glass glass cursor-pointer">
              <span aria-hidden="true">←</span> Back to résumé
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Page 1: résumé                                                      */
/* ------------------------------------------------------------------ */

function Resume() {
  const root = useRef<HTMLDivElement>(null)

  // Liminal-style choreography: panels wipe open, the photo unmasks while the image settles, the name rises word by
  // word, rules draw left to right, skill chips cascade in and the GPA counts up.
  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      const once = (trigger: Element | string, start = 'top 85%') => ({ trigger, start, once: true })
      const open = 'inset(0% 0% 0% 0% round 24px)'

      const tl = gsap.timeline({ scrollTrigger: once('.ab-head', 'top 80%') })
      tl.fromTo('.ab-head', { clipPath: 'inset(0% 0% 100% 0% round 24px)' }, { clipPath: open, duration: 1.3, ease: 'expo.inOut', clearProps: 'clipPath' })
        .fromTo('.ab-photo', { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.inOut' }, 0.35)
        .from('.ab-photo img', { scale: 1.3, duration: 1.9, ease: 'expo.out' }, 0.35)
        .from('.ab-ar', { xPercent: 10, opacity: 0, duration: 1.8 }, 0.45)
        .from('.ab-eyebrow', { opacity: 0, y: 10, duration: 0.6 }, 0.6)
      const name = SplitText.create('.ab-name', { type: 'words', mask: 'words' })
      tl.from(name.words, { yPercent: 110, stagger: 0.06, duration: 1.1 }, 0.7).from('.ab-cta > *', { y: 20, opacity: 0, stagger: 0.07, duration: 0.8 }, 1.15)

      gsap.utils.toArray<HTMLElement>('.ab-rule', root.current).forEach((el) =>
        gsap.from(el, { scaleX: 0, transformOrigin: 'left center', duration: 1.4, ease: 'expo.inOut', scrollTrigger: once(el, 'top 90%') }),
      )
      gsap.utils.toArray<HTMLElement>('.ab-panel', root.current).forEach((el, i) =>
        gsap.fromTo(
          el,
          { clipPath: 'inset(0% 100% 0% 0% round 24px)' },
          { clipPath: open, duration: 1.3, delay: (i % 2) * 0.12, ease: 'expo.inOut', clearProps: 'clipPath', scrollTrigger: once(el) },
        ),
      )

      gsap.set('.ab-chip', { opacity: 0, y: 14 })
      ScrollTrigger.batch('.ab-chip', {
        start: 'top 92%',
        once: true,
        onEnter: (batch) => void gsap.to(batch, { opacity: 1, y: 0, stagger: 0.025, duration: 0.7, ease: 'power3.out' }),
      })

      const gpaEl = root.current?.querySelector('.ab-gpa')
      const gpa = { v: 0 }
      if (gpaEl)
        gsap.to(gpa, {
          v: Number(RESUME.education.gpa),
          duration: 1.6,
          ease: 'power3.out',
          scrollTrigger: once(gpaEl, 'top 90%'),
          onUpdate: () => void (gpaEl.textContent = gpa.v.toFixed(2)),
        })

      return () => name.revert()
    },
    { scope: root },
  )

  return (
    <div ref={root} className="grid gap-6 lg:grid-cols-12">
      {/* banner-style header with photo */}
      <div className="ab-head glass relative grid gap-10 overflow-hidden rounded-3xl p-8 md:p-12 lg:col-span-12 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-end">
        <span
          lang="ar"
          aria-hidden="true"
          className="ab-ar ar pointer-events-none absolute -top-6 right-4 text-[clamp(120px,16vw,240px)] leading-none font-bold whitespace-nowrap text-transparent opacity-40 select-none [-webkit-text-stroke:1.5px_var(--color-accent)]"
        >
          مجيد تواه
        </span>
        <div className="relative flex flex-col gap-6">
          <span className="ab-eyebrow eyebrow">
            {RESUME.role} · {RESUME.location}
          </span>
          <h3 className="ab-name disp m-0 max-w-4xl text-[clamp(38px,5vw,72px)] leading-[0.98] tracking-[-0.015em]" style={{ fontWeight: 300 }}>
            {RESUME.fullName}
          </h3>
          <LineP className="m-0 max-w-3xl text-base leading-relaxed text-mist md:text-lg">{RESUME.summary}</LineP>
          <div className="ab-cta flex flex-wrap gap-2.5">
            <a className="ink-btn btn-light" href={LINKS.cv} download="MajedTuah_Resume.pdf">
              Download CV <Download />
            </a>
            <a className="ink-btn btn-glass glass" href={LINKS.linkedin} target="_blank" rel="noreferrer">
              LinkedIn <ArrowUpRight />
            </a>
            <a className="ink-btn btn-glass glass" href={LINKS.email}>
              Email <ArrowUpRight />
            </a>
          </div>
        </div>
        <figure className="ab-photo relative m-0 hidden aspect-[4/5] overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.08),transparent_70%)] lg:block">
          <img src={portrait} alt="Majed Tuah" className="absolute inset-x-0 bottom-0 h-[112%] w-full object-cover object-top" loading="lazy" />
        </figure>
      </div>

      {/* skills */}
      <div className="flex flex-col gap-6 lg:col-span-8">
        <span className="ab-rule mt-6 block h-px bg-bone/15" aria-hidden="true" />
        <span className="eyebrow">Technical skills</span>
        <div className="ab-panel glass grid gap-7 rounded-3xl p-7 sm:grid-cols-2 md:p-9">
          {RESUME.skills.map((s) => (
            <div key={s.group} className="flex flex-col gap-2.5">
              <span className="text-sm font-semibold">{s.group}</span>
              <div className="flex flex-wrap gap-1.5">
                {s.items.map((it) => (
                  <span
                    key={it}
                    className="ab-chip mono rounded-full border border-accent/20 bg-accent/5 px-2.5 py-1 text-[10px] tracking-[0.08em] text-mist transition-colors duration-300 hover:border-bone hover:bg-bone hover:text-ink"
                  >
                    {it}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* education, certification */}
      <div className="flex flex-col gap-6 lg:col-span-4">
        <span className="ab-rule mt-6 block h-px bg-bone/15" aria-hidden="true" />
        <span className="eyebrow">Education</span>
        <div className="ab-panel glass flex flex-col gap-1.5 rounded-3xl p-7">
          <span className="text-lg font-semibold">{RESUME.education.school}</span>
          <span className="text-sm text-ash italic">{RESUME.education.place}</span>
          <span className="mt-2 text-[15px] leading-relaxed text-mist">{RESUME.education.degree}</span>
          <div className="mt-5 flex items-end justify-between">
            <span className="flex items-baseline gap-2">
              <span className="ab-gpa disp text-5xl leading-none tabular-nums" style={{ fontWeight: 300 }}>
                {RESUME.education.gpa}
              </span>
              <span className="mono text-[11px] tracking-[0.14em] text-ash">GPA</span>
            </span>
            <span className="mono text-xs tracking-[0.12em] text-ash">{RESUME.education.date}</span>
          </div>
        </div>

        <div className="ab-panel glass flex items-center justify-between gap-4 rounded-3xl p-7">
          <div className="flex flex-col gap-1">
            <span className="text-lg font-semibold">{RESUME.certification.name}</span>
            <span className="text-sm text-ash">{RESUME.certification.detail}</span>
          </div>
          <span className="mono text-xs tracking-[0.12em] text-accent">{RESUME.certification.date}</span>
        </div>

        <a className="ink-btn btn-glass glass self-start" href="#experience">
          See my experience <span aria-hidden="true">↑</span>
        </a>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Page 2: GitHub projects                                             */
/* ------------------------------------------------------------------ */

function Projects() {
  return (
    <>
      <ul className="m-0 list-none border-t border-bone/15 p-0">
        {PROJECTS.map((p) => (
          <li key={p.title}>
            <Reveal variant="wipe">
            <a className="row" href={p.href} target="_blank" rel="noreferrer">
              <span className="mono text-xs text-accent">{p.year}</span>
              <span className="rtitle flex flex-col gap-1.5">
                <span className="text-[30px] leading-[1.1] font-semibold tracking-[-0.02em]">{p.title}</span>
                <span className="mono text-[11px] tracking-[0.16em] text-ash uppercase">
                  {p.label} · {p.lang}
                </span>
              </span>
              <span className="text-[15px] leading-relaxed text-mist">{p.text}</span>
              <span className="flex flex-wrap gap-2">
                {p.tags.map((t) => (
                  <span key={t} className="mono glass rounded-full px-3 py-1.5 text-[10px] tracking-[0.14em] text-mist uppercase">
                    {t}
                  </span>
                ))}
              </span>
              <span className="mono justify-self-end text-[11px] tracking-[0.18em] uppercase">{p.cta ? 'Visit ↗' : 'GitHub ↗'}</span>
            </a>
            </Reveal>
          </li>
        ))}
      </ul>

      {/* smaller résumé projects, no public link */}
      <span className="eyebrow mt-20 mb-6 block">Earlier work</span>
      <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-2">
        {MORE_PROJECTS.map((p) => (
          <li key={p.title}>
            <Reveal variant="wipe" className="glass flex h-full flex-col gap-3 rounded-3xl p-6">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-xl font-medium">{p.title}</span>
              <span className="mono text-xs text-accent">{p.year}</span>
            </div>
            <span className="mono text-[10px] tracking-[0.16em] text-ash uppercase">{p.where}</span>
            <p className="m-0 text-[15px] leading-relaxed text-mist">{p.text}</p>
            <div className="flex flex-wrap gap-1.5">
              {p.tags.map((t) => (
                <span key={t} className="mono rounded-full border border-accent/20 px-2.5 py-1 text-[10px] tracking-[0.08em] text-mist">
                  {t}
                </span>
              ))}
            </div>
            </Reveal>
          </li>
        ))}
      </ul>

      <div className="mt-12 flex justify-center">
        <a className="ink-btn btn-glass glass" href={LINKS.repos} target="_blank" rel="noreferrer">
          All repositories on GitHub <ArrowUpRight />
        </a>
      </div>
    </>
  )
}

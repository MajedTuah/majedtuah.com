import { useEffect, useRef, useState } from 'react'
import { RESUME } from '../data'
import { gsap, useGSAP } from '../motion/gsap'
import SectionHeader from './SectionHeader'
import { Reveal, Rich, Section } from './ui'

/** Where stacked cards stick (px from the top) and how far each one sits below the last. Mirrored in index.css. */
const STACK_TOP = 120
const STACK_STEP = 18

/** Career timeline; the accent line fills as the section scrolls past. */
export default function Experience({ n }: { n: string }) {
  const listRef = useRef<HTMLOListElement>(null)
  const [reached, setReached] = useState(-1)

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    let raf = 0
    const update = () => {
      raf = 0
      const r = el.getBoundingClientRect()
      const mid = window.innerHeight * 0.6
      const p = Math.min(1, Math.max(0, (mid - r.top) / r.height))
      el.style.setProperty('--p', p.toFixed(3))
      // light each dot once the line passes it
      const items = Array.from(el.children) as HTMLElement[]
      let last = -1
      items.forEach((li, i) => {
        if (li.getBoundingClientRect().top + 40 < mid) last = i
      })
      setReached(last)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  // Desktop: cards stick and stack (CSS). Each earlier card shrinks and dims as the next one slides over it.
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
        const items = gsap.utils.toArray<HTMLElement>('.stack-item', listRef.current)
        items.forEach((item, i) => {
          const next = items[i + 1] ?? listRef.current?.lastElementChild
          const card = item.querySelector('.stack-card')
          if (!next || !card || next === item) return
          gsap.to(card, {
            scale: 0.94,
            opacity: 0.35,
            ease: 'none',
            transformOrigin: 'top center',
            scrollTrigger: { trigger: next, start: 'top bottom', end: `top ${STACK_TOP + (i + 1) * STACK_STEP}px`, scrub: true },
          })
        })
      })
      return () => mm.revert()
    },
    { scope: listRef },
  )

  return (
    <Section id="experience" label="Experience" glow="left">
      <SectionHeader n={n} label="Career" title="Experience" outlined="so far" ar="مسيرة" />
      <ol ref={listRef} className="timeline m-0 flex list-none flex-col gap-10 p-0">
        {RESUME.experience.map((job, i) => (
          <li key={job.company} className="stack-item relative pl-12 md:pl-16" style={{ ['--i' as string]: i }}>
            <span className={`tl-dot ${reached >= i ? 'on' : ''}`} aria-hidden="true" />
            <Reveal>
              <article className="stack-card glass grid gap-6 rounded-3xl p-7 md:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
                <div className="flex flex-col gap-2">
                  <span className="mono text-xs tracking-[0.12em] text-accent">{job.period}</span>
                  <h3 className="disp m-0 text-[30px] leading-tight">{job.role}</h3>
                  <span className="text-base text-bone">{job.company}</span>
                  <span className="text-sm text-ash">{job.place}</span>
                </div>
                <ul className="m-0 flex list-none flex-col gap-3.5 p-0">
                  {job.points.map((pt) => (
                    <li key={pt} className="relative pl-5 text-[15px] leading-relaxed text-mist">
                      <span className="absolute top-[0.6em] left-0 size-1.5 rounded-full bg-accent" aria-hidden="true" />
                      <Rich text={pt} />
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>
          </li>
        ))}
        <li className="relative pl-12 md:pl-16">
          <span className={`tl-dot ${reached >= RESUME.experience.length ? 'on' : ''}`} aria-hidden="true" />
          <Reveal>
            <div className="flex flex-col gap-1 pt-6">
              <span className="mono text-xs tracking-[0.12em] text-accent">{RESUME.education.date}</span>
              <span className="text-lg">Graduated, {RESUME.education.school}</span>
              <span className="text-sm text-ash">{RESUME.education.degree}</span>
            </div>
          </Reveal>
        </li>
      </ol>
    </Section>
  )
}

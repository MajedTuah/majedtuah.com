import { useRef } from 'react'
import { EMAIL, LINKS } from '../data'
import { useClock, useLineReveal, useMagnetic } from '../motion/hooks'
import { ArrowUpRight, LineP } from './ui'

export default function Contact({ n }: { n: string }) {
  const magnet = useMagnetic<HTMLAnchorElement>(14)
  const time = useClock()
  const h2 = useRef<HTMLHeadingElement>(null)
  useLineReveal(h2)

  return (
    <>
      <section id="contact" className="relative overflow-clip border-t border-bone/10" aria-label="Contact">
        <div className="glow" aria-hidden="true" style={{ left: '50%', top: '50%', width: 1400, height: 1000, margin: '-500px 0 0 -700px' }} />
        <span
          lang="ar"
          aria-hidden="true"
          className="ar pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[clamp(160px,30vw,420px)] leading-none font-bold whitespace-nowrap text-bone/[0.05] select-none"
        >
          تواصل
        </span>
        <div className="relative mx-auto flex max-w-[1360px] flex-col items-center px-5 py-40 text-center md:px-10">
          <span className="eyebrow mb-6">{n} — Contact</span>
          <h2 ref={h2} className="disp section-title m-0">
            Email <span className="outline-word">me.</span>
          </h2>
          <LineP className="mt-8 mb-0 max-w-xl text-lg leading-relaxed text-mist">
            Working on something with language models, or want a workshop for your team? Email is the best way to reach me.
          </LineP>
          <a ref={magnet} className="ink-btn btn-light mt-12" href={LINKS.email}>
            {EMAIL} <ArrowUpRight />
          </a>
          <div className="mono mt-8 flex flex-wrap justify-center gap-7 text-[11px] tracking-[0.18em] text-ash uppercase">
            <a className="hover:text-bone" href={LINKS.linkedin} target="_blank" rel="noreferrer">
              LinkedIn ↗
            </a>
            <a className="hover:text-bone" href={LINKS.github} target="_blank" rel="noreferrer">
              GitHub ↗
            </a>
            <a className="hover:text-bone" href={LINKS.cv} download="MajedTuah_Resume.pdf">
              Download CV ↓
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-bone/10">
        <div className="mono mx-auto flex max-w-[1360px] flex-wrap items-center justify-between gap-3 px-5 py-7 text-[11px] tracking-[0.14em] text-ash uppercase md:px-10">
          <span>© {new Date().getFullYear()} Majed Tuah</span>
          <span>
            Kuala Lumpur <time className="text-bone tabular-nums">{time}</time>
          </span>
          <span lang="ar" className="ar text-lg tracking-normal text-bone normal-case">
            مجيد تواه
          </span>
        </div>
      </footer>
    </>
  )
}

import { lazy, Suspense, useEffect, useRef, useState, type PointerEvent } from 'react'
import portrait from '../assets/portrait-cutout.webp'
import { LINKS, PROJECTS } from '../data'
import { gsap, useGSAP } from '../motion/gsap'
import { useMagnetic } from '../motion/hooks'
import { ArrowRight, pad2, useReducedMotion } from './ui'

// three.js is heavy: load the 3D scene after the page, in its own chunk
const HeroScene = lazy(() => import('./HeroScene'))

const SPLASH_OPEN = 1400 // ms: the splash page starts lifting and the hero entrance begins
const BOOK_CYCLE = 3400 // ms per project in the book carousel

export default function Hero() {
  const reduce = useReducedMotion()
  const heroRef = useRef<HTMLElement>(null)

  // Only render the 3D scene's animation while the hero is on screen
  const [onScreen, setOnScreen] = useState(true)
  useEffect(() => {
    const el = heroRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting))
    io.observe(el)
    return () => io.disconnect()
  }, [])

  /* ---------- intro splash: one GSAP timeline ---------- */
  const splashRef = useRef<HTMLDivElement>(null)
  const [splash, setSplash] = useState(true)
  const [started, setStarted] = useState(false)
  const magnet = useMagnetic<HTMLAnchorElement>()

  useEffect(() => {
    if (reduce) {
      setSplash(false)
      setStarted(true)
    }
  }, [reduce])

  useGSAP(
    () => {
      const el = splashRef.current
      if (!splash || reduce || !el) return
      const text = el.querySelector('svg text')
      const counter = el.querySelector('.splash-count')
      const count = { v: 0 }
      const open = SPLASH_OPEN / 1000
      // timeScale 0.5: the whole intro plays at half speed so the trace, letters and counter can be seen
      const tl = gsap.timeline().timeScale(0.5)
      tl.fromTo(text, { strokeDashoffset: 1800 }, { strokeDashoffset: 0, duration: 0.75, ease: 'power2.out' }, 0.1)
        .to(text, { fillOpacity: 1, duration: 0.65, ease: 'expo.inOut' }, 0.7)
        .from(el.querySelectorAll('.splash-letter > span'), { yPercent: 110, duration: 0.7, stagger: 0.035 }, 0.25)
        .from(el.querySelectorAll('.splash-tag, .splash-count'), { opacity: 0, y: 12, duration: 0.6 }, 0.45)
        .to(
          count,
          {
            v: 100,
            duration: open - 0.1,
            ease: 'power2.inOut',
            onUpdate: () => void (counter && (counter.textContent = String(Math.round(count.v)).padStart(3, '0'))),
          },
          0,
        )
        .call(() => setStarted(true), [], open)
        .to(el, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.85, ease: 'expo.inOut' }, open)
        .call(() => setSplash(false))
      return () => void tl.kill()
    },
    { dependencies: [splash, reduce] },
  )

  const replay = () => {
    setStarted(false)
    setSplash(true)
  }

  /* ---------- parallax ----------
   * GSAP quickTo writes each layer's transform directly (compositor-only). The earlier version set CSS variables
   * on the hero, which forced a style recalculation of every element inside it on every mouse move. */
  const parallax = useRef<((mx: number, my: number) => void) | null>(null)
  useGSAP(
    () => {
      if (reduce) return
      const q = (sel: string, prop: string, duration = 0.9) => {
        const el = heroRef.current?.querySelector(sel)
        return el ? gsap.quickTo(el, prop, { duration, ease: 'power3.out' }) : () => {}
      }
      // depth in px: the further back a layer sits, the less it travels
      const layers = [
        { x: q('.l-n1', 'x'), y: q('.l-n1', 'y'), d: 26 },
        { x: q('.l-por', 'x'), y: q('.l-por', 'y'), d: 48 },
        { x: q('.l-n2', 'x'), y: q('.l-n2', 'y'), d: 84 },
      ]
      const porRY = q('.l-por', 'rotationY')
      const porRX = q('.l-por', 'rotationX')
      const bookRY = q('.book', 'rotationY', 0.6)
      const bookRX = q('.book', 'rotationX', 0.6)
      gsap.set('.l-por', { transformPerspective: 1200 })
      parallax.current = (mx, my) => {
        for (const l of layers) {
          l.x(-mx * l.d)
          l.y(-my * l.d)
        }
        porRY(mx * 9)
        porRX(-my * 4)
        bookRY(-mx * 14)
        bookRX(my * 6)
      }
      return () => void (parallax.current = null)
    },
    { scope: heroRef, dependencies: [reduce] },
  )

  const onMove = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType !== 'mouse' || !parallax.current) return
    const r = e.currentTarget.getBoundingClientRect()
    parallax.current(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1)
  }
  const onLeave = () => parallax.current?.(0, 0)

  /* ---------- project book carousel ---------- */
  // `last` is the book that was showing before, so it always gets the page-turn exit even on a jump via the dots
  const [{ proj, last }, setBooks] = useState({ proj: 0, last: -1 })
  const setProj = (next: number | ((p: number) => number)) =>
    setBooks((b) => {
      const n = typeof next === 'function' ? next(b.proj) : next
      return n === b.proj ? b : { proj: n, last: b.proj }
    })
  const hovering = useRef(false)
  useEffect(() => {
    if (reduce) return
    const id = setInterval(() => {
      if (!hovering.current) setProj((p) => (p + 1) % PROJECTS.length)
    }, BOOK_CYCLE)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce])
  const active = PROJECTS[proj]

  return (
    <>
      {splash && !reduce && (
        <div ref={splashRef} className="splash" aria-hidden="true">
          <svg viewBox="0 0 1200 300" role="presentation">
            <text x="600" y="230" textAnchor="middle" direction="rtl" fontSize="250">
              مجيد تواه
            </text>
          </svg>
          {/* Latin wordmark, letter by letter (Liminal-style) */}
          <div className="splash-word">
            {'MAJED TUAH'.split('').map((c, i) => (
              <span key={i} className="splash-letter">
                <span>{c === ' ' ? ' ' : c}</span>
              </span>
            ))}
          </div>
          <div className="splash-tag flex items-center gap-3.5">
            <span className="size-2 rounded-full bg-graphite" />
            <span className="mono text-xs tracking-[0.24em] uppercase">AI Engineer · Kuala Lumpur</span>
          </div>
          <span className="splash-count mono">000</span>
        </div>
      )}

      <section
        ref={heroRef}
        id="top"
        className={`hero ${started ? 'go' : ''}`}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        aria-label="Introduction"
      >
        {/* 3D composition: glass panel + spheres, its own background layer */}
        <div className="l-scene" aria-hidden="true">
          <Suspense fallback={null}>
            <HeroScene eventSource={heroRef} active={onScreen} still={reduce} />
          </Suspense>
        </div>

        {/* first name, solid, behind the portrait */}
        <div className="abs l-n1 px">
          <h1 className="name m-0 text-bone" aria-label="Majed Tuah">
            <span className="word" aria-hidden="true">
              <span lang="ar" dir="rtl" style={{ animationDelay: '0.1s' }}>
                مجيد
              </span>
            </span>
          </h1>
          <span className="mono -mt-2.5 block text-right text-[11px] tracking-[0.3em] text-ash uppercase" aria-hidden="true">
            Majed
          </span>
        </div>

        {/* cut-out portrait */}
        <div className="abs l-por px">
          <div className="rv-por" style={{ animationDelay: '0.4s' }}>
            <img className="por-img" src={portrait} alt="Majed Tuah in a black suit and round glasses, smiling and adjusting his cuff" />
          </div>
        </div>

        {/* last name (Jawi), outlined, in front */}
        <div className="abs l-n2 px">
          <div className="name text-transparent [-webkit-text-stroke:2px_var(--color-accent)]" aria-hidden="true">
            <span className="word">
              <span lang="ar" dir="rtl" style={{ animationDelay: '0.25s' }}>
                تواه
              </span>
            </span>
          </div>
          <span className="mono -mt-2.5 block text-[11px] tracking-[0.3em] text-ash uppercase" aria-hidden="true">
            Tuah
          </span>
        </div>

        {/* intro */}
        <div className="abs h-intro bottom-11 left-10 z-20 w-[400px] max-w-full">
          <div className="rv flex flex-col gap-4" style={{ animationDelay: '0.8s' }}>
            <p className="eyebrow m-0">AI engineer · Kuala Lumpur</p>
            <h2 className="m-0 text-[30px] leading-[1.12] font-medium tracking-[-0.01em]">
              I have Claude Code and ,
              <br />
              too many browser tabs
              <br/>
              and more curiosity than is probably healthy."
            </h2>
            <p className="m-0 max-w-[360px] text-[15px] leading-relaxed text-ash">
              By day I lead AI engineering at AventraGroup: an agentic bot, a RAG pipeline over financial documents, and the guardrails around both.
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-5">
              <a ref={magnet} className="ink-btn btn-light" href="#work">
                See my work <ArrowRight />
              </a>
              <a className="mono text-[11px] tracking-[0.18em] text-ash uppercase hover:text-bone" href={LINKS.github} target="_blank" rel="noreferrer">
                GitHub ↗
              </a>
            </div>
          </div>
        </div>

        {/* project book card */}
        <div className="abs h-card top-[104px] right-[72px] z-20 w-[300px]">
          <div className="rv flex flex-col gap-3.5" style={{ animationDelay: '0.6s' }}>
            {/* keyed so the label crossfades with each book instead of swapping instantly */}
            <div key={proj} className="book-fade mono flex justify-between gap-3 text-[10px] tracking-[0.18em] text-ash uppercase">
              <span>{active.label}</span>
              <span>{active.topics}</span>
            </div>
            <a
              className="stage"
              href={active.href}
              target="_blank"
              rel="noreferrer"
              aria-label={`${active.title}: ${active.cta ?? "View on GitHub"}`}
              onPointerEnter={() => (hovering.current = true)}
              onPointerLeave={() => (hovering.current = false)}
            >
              <div className="book">
                <div key={proj} className="page book-fade">
                  <span className="mono text-[10px] tracking-[0.2em] text-[#6b6b6f] uppercase">{active.chapter}</span>
                  <span className="text-[19px] leading-tight font-semibold">{active.title}</span>
                  <span className="text-[13px] leading-relaxed text-ink">{active.text}</span>
                  <span className="mono mt-auto text-[10px] tracking-[0.16em] uppercase">{active.cta ?? 'View on GitHub'} ↗</span>
                </div>
                {PROJECTS.map((p, i) => {
                  const pos = i === proj ? 'active' : i === last ? 'prev' : 'next'
                  return (
                    <div
                      key={p.title}
                      className={`cover ${pos}`}
                      style={{ ['--spine' as string]: p.colors.spine, background: p.colors.cover, color: p.colors.type }}
                    >
                      <div className="flex items-start justify-between">
                        <span className="mono text-[10px] tracking-[0.2em] opacity-60">{p.year}</span>
                        <span className="ar text-[30px] leading-none font-bold opacity-85">{p.ar}</span>
                      </div>
                      {p.orb && <span className="orb" style={{ ['--orb' as string]: p.orb }} aria-hidden="true" />}
                      <div className="disp text-[40px] leading-[0.9] tracking-[-0.015em] whitespace-pre-line">{p.cover}</div>
                      <div className="mono flex justify-between text-[9px] tracking-[0.2em] uppercase opacity-60">
                        <span>Majed Tuah</span>
                        <span>{p.lang}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </a>
            <div className="flex items-center gap-3">
              <span className="mono text-[11px] text-ash">
                {pad2(proj + 1)} / {pad2(PROJECTS.length)}
              </span>
              <div className="flex gap-1.5">
                {PROJECTS.map((p, i) => (
                  <button
                    key={p.title}
                    type="button"
                    onClick={() => setProj(i)}
                    aria-label={`Show ${p.title}`}
                    className="flex size-7 cursor-pointer items-center border-0 bg-transparent p-0"
                  >
                    <span className={`block h-0.5 w-full transition-colors duration-400 ${i === proj ? 'bg-accent' : 'bg-bone/20'}`} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* socials */}
        <div className="abs h-soc right-10 bottom-10 z-20">
          <ul
            className="rv mono glass m-0 flex list-none flex-wrap gap-6 rounded-full px-[22px] py-3.5 text-[11px] tracking-[0.2em] uppercase"
            style={{ animationDelay: '1.15s' }}
          >
            <li>
              <a href={LINKS.github} target="_blank" rel="noreferrer">
                GitHub ↗
              </a>
            </li>
            <li>
              <a href={LINKS.linkedin} target="_blank" rel="noreferrer">
                LinkedIn ↗
              </a>
            </li>
            <li>
              <a href={LINKS.email}>Email ↗</a>
            </li>
          </ul>
        </div>

        {!splash && !reduce && (
          <button
            type="button"
            onClick={replay}
            className="mono absolute bottom-4 left-1/2 z-25 hidden min-h-8 -translate-x-1/2 cursor-pointer border-0 bg-transparent px-3 text-[10px] tracking-[0.2em] text-ash uppercase hover:text-bone lg:block"
          >
            ↻ Replay intro
          </button>
        )}
      </section>
    </>
  )
}

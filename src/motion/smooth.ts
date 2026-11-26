/** Lenis smooth scrolling, driven by GSAP's ticker so ScrollTrigger stays in sync. Off for reduced motion. */
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import { gsap, prefersReducedMotion, ScrollTrigger } from './gsap'

/** Fixed navbar height plus breathing room, so anchors land below it */
const NAV_OFFSET = 96

let lenis: Lenis | null = null
let tick: ((time: number) => void) | null = null

export function startSmoothScroll() {
  if (lenis || prefersReducedMotion()) return lenis
  lenis = new Lenis({ lerp: 0.16, wheelMultiplier: 1 }) // higher lerp = follows the wheel more tightly
  lenis.on('scroll', ScrollTrigger.update)
  tick = (time) => lenis?.raf(time * 1000)
  gsap.ticker.add(tick)
  gsap.ticker.lagSmoothing(0)
  return lenis
}

export function stopSmoothScroll() {
  if (tick) gsap.ticker.remove(tick)
  lenis?.destroy()
  lenis = null
  tick = null
}

export const getLenis = () => lenis

/** Scroll to "#id", gliding with Lenis when it's on. */
export function scrollToHash(hash: string) {
  const el = hash === '#top' ? document.body : document.querySelector<HTMLElement>(hash)
  if (!el) return
  if (lenis) {
    lenis.scrollTo(hash === "#top" ? 0 : el, { offset: -NAV_OFFSET, duration: 1.4, force: true })
  } else {
    const y = hash === '#top' ? 0 : el.getBoundingClientRect().top + window.scrollY - NAV_OFFSET
    window.scrollTo({ top: y, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }
}

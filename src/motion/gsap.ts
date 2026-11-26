/** One place to register GSAP plugins and set the house easing. Import gsap from here, not from 'gsap'. */
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP)
// power4.out is the closest built-in to the site's cubic-bezier(.16, 1, .3, 1)
gsap.defaults({ ease: 'power4.out', duration: 1 })

export const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export { gsap, ScrollTrigger, SplitText, useGSAP }

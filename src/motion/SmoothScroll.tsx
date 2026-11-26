import { useEffect } from 'react'
import { scrollToHash, startSmoothScroll, stopSmoothScroll } from './smooth'

/**
 * Turns on smooth scrolling and routes every in-page "#…" link through it. It updates the URL hash and fires
 * hashchange itself, so listeners (like the About pager) still react.
 */
export default function SmoothScroll() {
  useEffect(() => {
    startSmoothScroll()

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as Element | null)?.closest?.('a[href^="#"]') as HTMLAnchorElement | null
      if (!a) return
      const hash = a.getAttribute('href')
      if (!hash || hash === '#') return
      e.preventDefault()
      scrollToHash(hash)
      if (location.hash !== hash) {
        history.pushState(null, '', hash)
        window.dispatchEvent(new HashChangeEvent('hashchange'))
      }
    }
    document.addEventListener('click', onClick)
    return () => {
      document.removeEventListener('click', onClick)
      stopSmoothScroll()
    }
  }, [])

  return null
}

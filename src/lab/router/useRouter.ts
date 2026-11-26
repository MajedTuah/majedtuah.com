/*
 * React hook around the router Web Worker: starts it, tracks which tiers are loaded, and runs a
 * thought through the arbitrator, reporting each tier as it finishes.
 * See docs/10-braindump-in-the-browser.md.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Decision, TierTrace } from './arbitrator'
import type { FromWorker, LoadState, Manifest, TierKey, ToWorker } from './protocol'

export interface RouterState {
  manifest: Manifest | null
  teacherAvailable: boolean
  load: Record<TierKey, { state: LoadState; progress: number }>
  /** tiers reported so far for the current run */
  trace: TierTrace[]
  decision: Decision | null
  running: boolean
  failed: boolean
}

const initial: RouterState = {
  manifest: null,
  teacherAvailable: false,
  load: { tier1: { state: 'loading', progress: 0 }, tier2: { state: 'idle', progress: 0 }, tier3: { state: 'idle', progress: 0 } },
  trace: [],
  decision: null,
  running: false,
  failed: false,
}

export function useRouter(active: boolean) {
  const [s, setS] = useState(initial)
  const worker = useRef<Worker | null>(null)
  const nextId = useRef(0)
  /** id of the visitor's current run; older and background runs never touch the cards */
  const runId = useRef(0)
  /** background runs (the terminal's samples), resolved by id */
  const probes = useRef(new Map<number, (d: Decision | null) => void>())

  useEffect(() => {
    if (!active || worker.current) return
    const w = new Worker(new URL('./router.worker.ts', import.meta.url), { type: 'module' })
    worker.current = w
    w.onmessage = (ev: MessageEvent<FromWorker>) => {
      const m = ev.data
      if ((m.type === 'result' || m.type === 'error' || m.type === 'tier') && m.id !== undefined && probes.current.has(m.id)) {
        if (m.type !== 'tier') {
          probes.current.get(m.id)!(m.type === 'result' ? m.decision : null)
          probes.current.delete(m.id)
        }
        return
      }
      setS((prev) => {
        switch (m.type) {
          case 'manifest':
            return { ...prev, manifest: m.manifest, teacherAvailable: m.teacherAvailable }
          case 'status':
            return { ...prev, load: { ...prev.load, [m.tier]: { state: m.state, progress: m.progress } } }
          case 'tier':
            return m.id === runId.current ? { ...prev, trace: [...prev.trace, m.trace] } : prev
          case 'result':
            return m.id === runId.current ? { ...prev, decision: m.decision, running: false } : prev
          case 'error':
            return m.id === undefined || m.id === runId.current ? { ...prev, running: false, failed: true } : prev
        }
      })
    }
    w.onerror = () => setS((prev) => ({ ...prev, failed: true, running: false }))
    w.postMessage({ type: 'init' } satisfies ToWorker)
  }, [active])

  useEffect(() => () => worker.current?.terminate(), [])

  const run = useCallback((text: string) => {
    if (!worker.current || !text.trim()) return
    const id = ++nextId.current
    runId.current = id
    setS((prev) => ({ ...prev, trace: [], decision: null, running: true, failed: false }))
    worker.current.postMessage({ type: 'route', id, text: text.slice(0, 500) } satisfies ToWorker)
  }, [])

  /** Routes a thought in the background and returns the decision, without changing the cards. */
  const probe = useCallback((text: string) => {
    const w = worker.current
    if (!w) return Promise.resolve(null)
    const id = ++nextId.current
    return new Promise<Decision | null>((resolve) => {
      probes.current.set(id, resolve)
      w.postMessage({ type: 'route', id, text: text.slice(0, 500) } satisfies ToWorker)
    })
  }, [])

  const loadTeacher = useCallback(() => worker.current?.postMessage({ type: 'load', tier: 'tier3' } satisfies ToWorker), [])

  return { ...s, run, probe, loadTeacher }
}

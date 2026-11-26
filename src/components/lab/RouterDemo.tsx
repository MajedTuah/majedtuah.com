/*
 * The BrainDump router demo: the real models from braindump.ai, running in the visitor's browser.
 * Confidences and timings on screen are real, measured on this device. The cards reveal one by one
 * so a person can follow along; the timing shown is the model's, not the animation's.
 * Explained in docs/10-braindump-in-the-browser.md.
 */
import { useEffect, useRef, useState, type RefObject } from 'react'
import type { Decision } from '../../lab/router/arbitrator'
import { useRouter } from '../../lab/router/useRouter'
import { useInView, useReducedMotion } from '../ui'
import { fmtMs, routeLines, type TermLine } from './routerLog'
import Terminal from './Terminal'

/** Thoughts the terminal routes by itself while nobody is using the demo (never seen in training) */
const SAMPLES = [
  'transfer rm500 to my savings account',
  'finish the landing page for the portfolio',
  'submit the leave form to hr',
  'automate the weekly report email',
  'feeling tired and a bit lonely lately',
  'push the new model to the github repo',
  'renew my car insurance next week',
  'write a script that renames all my photos',
  'ask finance about the q3 project budget',
  'book a dentist appointment for my sister',
]
const SAMPLE_EVERY_MS = 7000
const IDLE_AFTER_MS = 9000
const KEEP_LINES = 40

/**
 * Builds the terminal's lines from real router events: models loading, the visitor's runs, and
 * background sample runs while the demo sits idle. Everything printed is a model name, label,
 * confidence or timing (see routerLog.ts for the safety rules).
 */
function useRouterTerminal(
  r: ReturnType<typeof useRouter>,
  live: boolean,
  reduce: boolean,
  lastRun: RefObject<string>,
  lastTouch: RefObject<number>,
) {
  const [lines, setLines] = useState<TermLine[]>([])
  const nextId = useRef(1)
  const push = (add: Omit<TermLine, 'id'>[]) => setLines((prev) => [...prev, ...add.map((l) => ({ ...l, id: nextId.current++ }))].slice(-KEEP_LINES))
  const thresholds: [number, number] = [r.manifest?.thresholds.tier1 ?? 0.9, r.manifest?.thresholds.tier2 ?? 0.85]
  const mb = (k: 'tier1' | 'tier2' | 'tier3') => {
    const b = r.manifest?.tiers[k].files.reduce((s, f) => s + f.bytes, 0) ?? 0
    return (b >= 1e6 ? `${(b / 1e6).toFixed(b >= 1e7 ? 0 : 1)} MB` : `${Math.round(b / 1024)} KB`).padStart(7)
  }

  // Model loading, each state change printed once
  const logged = useRef(new Set<string>())
  useEffect(() => {
    const once = (key: string, add: Omit<TermLine, 'id'>[]) => {
      if (logged.current.has(key)) return
      logged.current.add(key)
      push(add)
    }
    if (r.load.tier1.state === 'ready')
      once('t1', [
        { kind: 'cmd', text: 'braindump boot --runtime wasm --threads 1' },
        { kind: 'out', text: `  t1 svm      tf-idf + calibrated svm   ${mb('tier1')}   ready` },
      ])
    if (r.load.tier2.state === 'ready') once('t2', [{ kind: 'out', text: `  t2 student  bert-tiny · int8 onnx     ${mb('tier2')}   ready` }])
    if (r.load.tier3.state === 'loading') once('t3-load', [{ kind: 'cmd', text: 'braindump load teacher' }])
    if (r.load.tier3.state === 'ready') once('t3', [{ kind: 'out', text: `  t3 teacher  bert-base · int8 onnx     ${mb('tier3')}   ready` }])
    if (r.load.tier3.state === 'error') once('t3-err', [{ kind: 'warn', text: '  t3 teacher  download failed' }])
    if (r.failed) once('fail', [{ kind: 'warn', text: '  model error · reload the page to retry' }])
  }, [r.load, r.failed]) // re-check whenever a load state changes

  // The visitor's own runs
  const lastDecision = useRef<Decision | null>(null)
  useEffect(() => {
    if (r.decision && r.decision !== lastDecision.current) {
      lastDecision.current = r.decision
      push(routeLines(lastRun.current ?? '', r.decision, thresholds, false))
    }
  }, [r.decision]) // once per new decision

  // Background samples while idle, in view and the tab is visible
  const sampleIdx = useRef(0)
  useEffect(() => {
    if (!live || reduce) return
    const tick = setInterval(async () => {
      if (document.visibilityState !== 'visible' || r.running || Date.now() - (lastTouch.current ?? 0) < IDLE_AFTER_MS) return
      const text = SAMPLES[sampleIdx.current++ % SAMPLES.length]
      const d = await r.probe(text)
      if (d) push(routeLines(text, d, thresholds, true))
    }, SAMPLE_EVERY_MS)
    return () => clearInterval(tick)
  }, [live, reduce, r.running, r.probe]) // restart the timer when any of these change

  return lines
}

const CATEGORY_NOTE: Record<string, string> = {
  PERSONAL: 'Life, family, health, feelings',
  FINANCIAL: 'Bills, payments, savings',
  PROJECTS: 'Something to build or ship',
  ADMIN: 'Forms, emails, paperwork',
  AUTOMATION: 'A job a script could do',
}

const TIERS = [
  { key: 'tier1', name: 'Tier 1', model: 'TF-IDF + SVM', note: 'Counts words. Answers alone when it is 90%+ sure.' },
  { key: 'tier2', name: 'Tier 2', model: 'Distilled bert-tiny', note: 'Small student model. Answers when 85%+ sure.' },
  { key: 'tier3', name: 'Tier 3', model: 'BERT teacher', note: 'The big model, only for the hard cases.' },
] as const

const mb = (bytes: number) => (bytes >= 1e6 ? `${(bytes / 1e6).toFixed(bytes >= 1e7 ? 0 : 1)} MB` : `${Math.round(bytes / 1024)} KB`)

export default function RouterDemo() {
  const [ref, inView] = useInView<HTMLDivElement>(0.05)
  const r = useRouter(inView)
  const reduce = useReducedMotion()
  const [text, setText] = useState('')
  const [shown, setShown] = useState(0)

  // First preset as the starting text, once the manifest arrives
  useEffect(() => {
    if (r.manifest?.presets[0] && !text) setText(r.manifest.presets[0].text)
  }, [r.manifest]) // only when the manifest arrives, never overwrite what the visitor typed

  // Reveal the tier cards one at a time (presentation only)
  useEffect(() => {
    if (shown >= r.trace.length) return
    const t = setTimeout(() => setShown((n) => n + 1), reduce || shown === 0 ? 0 : 550)
    return () => clearTimeout(t)
  }, [r.trace.length, shown, reduce])

  const ready = r.load.tier1.state === 'ready' && r.load.tier2.state === 'ready'
  const lastRun = useRef('')
  const lastTouch = useRef(0)
  const go = (t = text) => {
    lastRun.current = t
    lastTouch.current = Date.now()
    setShown(0)
    r.run(t)
  }
  const term = useRouterTerminal(r, inView && ready, reduce, lastRun, lastTouch)
  const done = r.decision && shown >= r.trace.length
  const thresholds = [r.manifest?.thresholds.tier1 ?? 0.9, r.manifest?.thresholds.tier2 ?? 0.85, null]
  const size = (k: 'tier1' | 'tier2' | 'tier3') => r.manifest?.tiers[k].files.reduce((s, f) => s + f.bytes, 0) ?? 0

  return (
    <div ref={ref} className="glass grid gap-8 rounded-3xl p-6 md:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <div className="flex flex-col gap-5">
        <p className="m-0 text-[15px] leading-relaxed text-mist">
          <strong className="font-semibold text-bone">BrainDump.ai</strong> sorts raw thoughts into five buckets. A cheap model tries first and only hands off when it
          isn't sure. These are my trained models, converted to run in your browser.
        </p>
        <label className="flex flex-col gap-2">
          <span className="eyebrow">Type a thought</span>
          <textarea
            value={text}
            maxLength={500}
            onChange={(e) => {
              lastTouch.current = Date.now() // pause the terminal's samples while someone is typing
              setText(e.target.value)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && ready) {
                e.preventDefault()
                go()
              }
            }}
            rows={3}
            className="resize-none rounded-2xl border border-accent/20 bg-ink/60 p-4 text-[15px] leading-relaxed text-bone outline-none focus:border-accent/60"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {r.manifest?.presets.map((p, i) => (
            <button
              key={p.text}
              type="button"
              disabled={!ready}
              onClick={() => {
                setText(p.text)
                go(p.text)
              }}
              className="mono min-h-9 cursor-pointer rounded-full border border-bone/20 bg-transparent px-3 text-[10px] tracking-[0.1em] text-ash uppercase hover:border-accent/50 hover:text-bone disabled:cursor-default disabled:opacity-40"
            >
              Example {i + 1}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" disabled={!ready || r.running} onClick={() => go()} className="ink-btn btn-light cursor-pointer border-0 disabled:cursor-default disabled:opacity-50">
            {ready ? 'Route it' : 'Loading models'} <span aria-hidden="true">→</span>
          </button>
          <a className="mono text-[11px] tracking-[0.16em] text-ash uppercase hover:text-bone" href="https://github.com/MajedTuah/braindump.ai" target="_blank" rel="noreferrer">
            Source on GitHub ↗
          </a>
        </div>
        <p className="mono m-0 text-[10px] leading-relaxed tracking-[0.08em] text-ash" aria-live="polite">
          {r.failed && !r.running
            ? 'Something went wrong loading the models. Try reloading the page.'
            : r.load.tier2.state === 'loading'
              ? `Loading the student model… ${Math.round(r.load.tier2.progress * 100)}%`
              : 'Runs on your device. Nothing you type leaves your browser.'}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {TIERS.map((t, i) => {
          const trace = r.trace.slice(0, shown).find((x) => x.tier === i + 1)
          const pending = r.running && !trace && shown === i && r.trace.length > i
          const state = done ? (r.decision!.winner === i + 1 ? 'winner' : trace ? 'pass' : 'skipped') : trace ? 'pass' : pending ? 'running' : 'idle'
          const limit = thresholds[i]
          const teacher = t.key === 'tier3'
          const tLoad = r.load.tier3
          return (
            <div key={t.key} className={`tier rounded-2xl border border-bone/12 bg-ink/40 p-5 ${state}`}>
              <div className="flex items-baseline justify-between gap-4">
                <div className="flex items-baseline gap-3">
                  <span className="mono text-[11px] tracking-[0.16em] text-accent uppercase">{t.name}</span>
                  <span className="text-lg font-medium">{t.model}</span>
                </div>
                <span className="mono text-[11px] text-ash">{trace ? fmtMs(trace.ms) : size(t.key) ? mb(size(t.key)) : ''}</span>
              </div>
              <p className="mt-1 mb-3 text-sm text-ash">{t.note}</p>
              {teacher && tLoad.state !== 'ready' ? (
                <TeacherSlot available={r.teacherAvailable} state={tLoad.state} progress={tLoad.progress} size={size('tier3')} onLoad={r.loadTeacher} />
              ) : (
                <div className="flex items-center gap-3">
                  <div className="meter flex-1">
                    <span
                      style={{
                        width: `${trace ? Math.round(trace.confidence * 100) : 0}%`,
                        background: trace && (limit === null || trace.confidence >= limit) ? 'var(--color-accent)' : '#8e8d89',
                      }}
                    />
                  </div>
                  <span className="mono w-32 text-right text-[11px] text-mist">
                    {state === 'skipped' ? 'not needed' : trace ? `${trace.label.toLowerCase()} · ${Math.round(trace.confidence * 100)}%` : '—'}
                  </span>
                </div>
              )}
            </div>
          )
        })}
        <div className="mt-1 flex min-h-[74px] items-center justify-between gap-4 rounded-2xl border border-dashed border-accent/30 px-5 py-4" aria-live="polite">
          {done ? (
            <>
              <div className="flex flex-col">
                <span className="eyebrow">Arbitrator → {TIERS[r.decision!.winner - 1].model}</span>
                <span className="text-lg">
                  {r.decision!.label} · <span className="text-accent">{CATEGORY_NOTE[r.decision!.label] ?? ''}</span>
                </span>
              </div>
              <span className="mono text-right text-[11px] text-ash">
                {Math.round(r.decision!.confidence * 100)}% sure
                {/* Fell through to Tier 3, but the teacher isn't loaded: say why Tier 2 answered anyway */}
                {r.decision!.winner === 2 && r.decision!.confidence < thresholds[1]! && (
                  <>
                    <br />
                    teacher not loaded
                  </>
                )}
              </span>
            </>
          ) : (
            <span className="text-sm text-ash">Press “Route it” to watch the tiers decide.</span>
          )}
        </div>
      </div>

      <div className="lg:col-span-2">
        <Terminal lines={term} title="braindump · on-device" />
      </div>
    </div>
  )
}

function TeacherSlot({
  available,
  state,
  progress,
  size,
  onLoad,
}: {
  available: boolean
  state: string
  progress: number
  size: number
  onLoad: () => void
}) {
  if (!available) return <p className="m-0 text-sm text-ash">Not loaded here. Without it, the router falls back to Tier 2.</p>
  if (state === 'loading')
    return (
      <div className="flex items-center gap-3">
        <div className="meter flex-1">
          <span style={{ width: `${Math.round(progress * 100)}%`, background: '#8e8d89' }} />
        </div>
        <span className="mono w-32 text-right text-[11px] text-mist">downloading {Math.round(progress * 100)}%</span>
      </div>
    )
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="text-sm text-ash">{state === 'error' ? 'Download failed.' : 'Off until you load it. Until then Tier 2 answers.'}</span>
      {/* A 100 MB+ download is not offered on phones */}
      <button type="button" onClick={onLoad} className="mono hidden min-h-9 cursor-pointer rounded-full border border-bone/20 bg-transparent px-3 text-[10px] tracking-[0.1em] text-ash uppercase hover:border-accent/50 hover:text-bone md:inline-flex md:items-center">
        {state === 'error' ? 'Try again' : `Load teacher (${size ? `${Math.round(size / 1e6)} MB` : 'large'})`}
      </button>
    </div>
  )
}

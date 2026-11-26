import { useEffect, useRef, useState } from 'react'
import SectionHeader from './SectionHeader'
import { ArrowUpRight, Section, useReducedMotion } from './ui'

const TABS = ['Distillation router', 'RAG pipeline'] as const

export default function AiLab({ n }: { n: string }) {
  const [tab, setTab] = useState(0)
  return (
    <Section id="lab" label="AI Lab" glow="right">
      <SectionHeader
        n={n}
        label="Interactive"
        title="AI"
        outlined="lab"
        ar="مختبر"
        right={
          <div className="glass flex rounded-full p-1" role="tablist" aria-label="Demos">
            {TABS.map((t, i) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === i}
                onClick={() => setTab(i)}
                className={`mono min-h-11 cursor-pointer rounded-full border-0 px-5 text-[11px] tracking-[0.16em] uppercase transition-colors duration-300 ${
                  tab === i ? 'bg-bone text-ink' : 'bg-transparent text-ash hover:text-bone'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        }
      />
      <div key={tab} className="page-in" role="tabpanel">
        {tab === 0 ? <Router /> : <Rag />}
      </div>
    </Section>
  )
}

/* ------------------------------------------------------------------ */
/* Demo 1: BrainDump.ai three-tier distillation router (simulated)     */
/* ------------------------------------------------------------------ */

const THRESHOLD = 0.8

const TIERS = [
  { name: 'Tier 1', model: 'SVM', note: 'Fastest. Handles the obvious ones.', ms: '0.3 ms' },
  { name: 'Tier 2', model: 'Quantised SLM', note: 'Distilled student. Sub-millisecond.', ms: '0.9 ms' },
  { name: 'Tier 3', model: 'BERT teacher', note: 'Heaviest. Only for the hard cases.', ms: '38 ms' },
]

// Chosen so each example settles at a different tier: 1, 2, then 3
const PRESETS = [
  'Remind me to email the vendor about the invoice tomorrow',
  'Maybe I could send the onboarding docs to the team next week',
  'Maybe email the team about being stuck on the drift checks',
]

const CATEGORIES: { label: string; action: string; words: string[] }[] = [
  { label: 'Task', action: 'Create a reminder', words: ['remind', 'email', 'call', 'buy', 'schedule', 'todo', 'tomorrow', 'deadline', 'send', 'book', 'pay'] },
  { label: 'Idea', action: 'File under ideas', words: ['maybe', 'idea', 'should', 'could', 'what if', 'build', 'try', 'split', 'improve'] },
  { label: 'Reflection', action: 'Add to journal', words: ['feel', 'feeling', 'stuck', 'tired', 'worried', 'happy', 'anxious', 'not sure', 'me'] },
]

/** Deterministic toy scoring so the demo behaves the same every time. */
function classify(text: string) {
  const t = text.toLowerCase()
  const has = (w: string) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(t)
  const scored = CATEGORIES.map((c) => ({ c, hits: c.words.filter(has).length }))
  scored.sort((a, b) => b.hits - a.hits)
  const best = scored[0].hits > 0 ? scored[0].c : { label: 'Note', action: 'Save as a note', words: [] }
  const margin = scored[0].hits - (scored[1]?.hits ?? 0)
  const words = text.trim().split(/\s+/).length
  // obvious, keyword-heavy, short text → tier 1 is confident; mixed signals push work down the tiers
  const t1 = Math.min(0.95, 0.42 + margin * 0.2 + (words < 10 ? 0.1 : 0))
  const t2 = Math.min(0.96, t1 + 0.18 + (scored[0].hits > 0 ? 0.08 : 0))
  const t3 = 0.94
  return { label: best.label, action: best.action, conf: [t1, t2, t3] }
}

type TierState = 'idle' | 'running' | 'pass' | 'winner' | 'skipped'

function Router() {
  const reduce = useReducedMotion()
  const [text, setText] = useState(PRESETS[0])
  const [states, setStates] = useState<TierState[]>(['idle', 'idle', 'idle'])
  const [shown, setShown] = useState<number[]>([0, 0, 0])
  const [result, setResult] = useState<ReturnType<typeof classify> | null>(null)
  const [winner, setWinner] = useState(-1)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const run = (input = text) => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    const r = classify(input)
    const win = r.conf.findIndex((c) => c >= THRESHOLD)
    const w = win === -1 ? 2 : win
    setResult(null)
    setWinner(-1)
    setShown([0, 0, 0])
    setStates(['idle', 'idle', 'idle'])
    const step = reduce ? 0 : 750
    for (let i = 0; i <= w; i++) {
      timers.current.push(
        setTimeout(() => {
          setStates((s) => s.map((v, j) => (j === i ? 'running' : v)))
          setShown((s) => s.map((v, j) => (j === i ? r.conf[i] : v)))
        }, i * step),
      )
      timers.current.push(
        setTimeout(
          () => {
            setStates((s) =>
              s.map((v, j) => {
                if (j === i) return i === w ? 'winner' : 'pass'
                if (i === w && j > w) return 'skipped'
                return v
              }),
            )
            if (i === w) {
              setWinner(w)
              setResult(r)
            }
          },
          i * step + step * 0.8,
        ),
      )
    }
  }

  return (
    <div className="glass grid gap-8 rounded-3xl p-6 md:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <div className="flex flex-col gap-5">
        <p className="m-0 text-[15px] leading-relaxed text-mist">
          <strong className="font-semibold text-bone">BrainDump.ai</strong> turns raw thoughts into organised actions. Instead of sending everything to one heavy model, a
          cheap model tries first and only hands off when it isn't sure. A BERT teacher is distilled, pruned and quantised into the small model that sits in the middle.
        </p>
        <label className="flex flex-col gap-2">
          <span className="eyebrow">Type a thought</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            className="resize-none rounded-2xl border border-accent/20 bg-ink/60 p-4 text-[15px] leading-relaxed text-bone outline-none focus:border-accent/60"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p, i) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setText(p)
                run(p)
              }}
              className="mono min-h-9 cursor-pointer rounded-full border border-bone/20 bg-transparent px-3 text-[10px] tracking-[0.1em] text-ash uppercase hover:border-accent/50 hover:text-bone"
            >
              Example {i + 1}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => run()} className="ink-btn btn-light cursor-pointer border-0">
            Route it <span aria-hidden="true">→</span>
          </button>
          <a className="mono text-[11px] tracking-[0.16em] text-ash uppercase hover:text-bone" href="https://github.com/MajedTuah/braindump.ai" target="_blank" rel="noreferrer">
            Source on GitHub ↗
          </a>
        </div>
        <p className="mono m-0 text-[10px] leading-relaxed tracking-[0.08em] text-ash">
          Simulated in your browser for illustration. Scores and latencies are not from the real models.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {TIERS.map((t, i) => (
          <div key={t.name} className={`tier rounded-2xl border border-bone/12 bg-ink/40 p-5 ${states[i]}`}>
            <div className="flex items-baseline justify-between gap-4">
              <div className="flex items-baseline gap-3">
                <span className="mono text-[11px] tracking-[0.16em] text-accent uppercase">{t.name}</span>
                <span className="text-lg font-medium">{t.model}</span>
              </div>
              <span className="mono text-[11px] text-ash">{t.ms}</span>
            </div>
            <p className="mt-1 mb-3 text-sm text-ash">{t.note}</p>
            <div className="flex items-center gap-3">
              <div className="meter flex-1">
                <span
                  style={{
                    width: `${Math.round(shown[i] * 100)}%`,
                    background: shown[i] >= THRESHOLD ? 'var(--color-accent)' : '#8e8d89',
                  }}
                />
              </div>
              <span className="mono w-24 text-right text-[11px] text-mist">
                {states[i] === 'skipped' ? 'skipped' : shown[i] ? `${Math.round(shown[i] * 100)}% sure` : '—'}
              </span>
            </div>
          </div>
        ))}
        <div className="mt-1 flex min-h-[74px] items-center justify-between gap-4 rounded-2xl border border-dashed border-accent/30 px-5 py-4" aria-live="polite">
          {result ? (
            <>
              <div className="flex flex-col">
                <span className="eyebrow">Arbitrator → {TIERS[winner].model}</span>
                <span className="text-lg">
                  {result.label} · <span className="text-accent">{result.action}</span>
                </span>
              </div>
              <span className="mono text-[11px] text-ash">threshold {Math.round(THRESHOLD * 100)}%</span>
            </>
          ) : (
            <span className="text-sm text-ash">Press “Route it” to watch the tiers decide.</span>
          )}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Demo 2: how an enterprise RAG pipeline is put together              */
/* ------------------------------------------------------------------ */

const STAGES = [
  {
    name: 'Ingest',
    service: 'Azure Document Intelligence',
    text: 'Financial PDFs arrive messy. Document Intelligence pulls out text, tables and layout so nothing is lost before the model ever sees it.',
  },
  {
    name: 'Chunk',
    service: 'Python pipeline',
    text: 'Documents are split along their own sections, with a little overlap. Tables stay whole and every chunk carries metadata like source, page and date.',
  },
  {
    name: 'Embed',
    service: 'Azure OpenAI embeddings',
    text: 'Each chunk becomes a vector, so passages that mean the same thing land close together even when they use different words.',
  },
  {
    name: 'Retrieve',
    service: 'Azure AI Search',
    text: 'A question runs as a hybrid search: keyword matching for exact figures and names, vector search for meaning, both filtered by metadata.',
  },
  {
    name: 'Rerank',
    service: 'Semantic ranker',
    text: 'The top candidates are re-scored for relevance so only the strongest few passages go into the prompt, which keeps answers precise and cheap.',
  },
  {
    name: 'Ground & answer',
    service: 'Azure OpenAI + guardrails',
    text: 'The model answers only from the retrieved passages and cites them. Prompt safety guardrails check the question and the answer before it is returned.',
  },
]

function Rag() {
  const [i, setI] = useState(0)
  const s = STAGES[i]
  return (
    <div className="glass flex flex-col gap-8 rounded-3xl p-6 md:p-10">
      <p className="m-0 max-w-3xl text-[15px] leading-relaxed text-mist">
        The shape of the financial RAG pipelines I build: click through each stage to see what it does and the service behind it.
      </p>
      <ol className="m-0 grid list-none grid-cols-2 gap-2 p-0 sm:grid-cols-3 lg:grid-cols-6">
        {STAGES.map((st, j) => (
          <li key={st.name}>
            <button
              type="button"
              onClick={() => setI(j)}
              aria-current={i === j ? 'step' : undefined}
              className={`stage-btn flex min-h-[84px] w-full cursor-pointer flex-col items-start justify-between rounded-2xl border p-4 text-left ${
                i === j ? 'border-accent bg-graphite/60 text-bone' : j < i ? 'border-accent/30 bg-transparent text-mist' : 'border-bone/12 bg-transparent text-ash hover:text-bone'
              }`}
            >
              <span className="mono text-[11px] text-accent">0{j + 1}</span>
              <span className="text-base font-medium">{st.name}</span>
            </button>
          </li>
        ))}
      </ol>
      <div key={i} className="page-in grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-2">
          <span className="eyebrow">Stage {i + 1} of {STAGES.length}</span>
          <span className="disp text-[40px] leading-none">{s.name}</span>
          <span className="mono text-xs tracking-[0.1em] text-accent">{s.service}</span>
        </div>
        <p className="m-0 text-lg leading-relaxed text-mist">{s.text}</p>
      </div>
      <div className="flex flex-wrap justify-between gap-3">
        <button type="button" disabled={i === 0} onClick={() => setI(i - 1)} className="ink-btn btn-glass glass cursor-pointer disabled:cursor-default disabled:opacity-40">
          <span aria-hidden="true">←</span> Previous
        </button>
        {i < STAGES.length - 1 ? (
          <button type="button" onClick={() => setI(i + 1)} className="ink-btn btn-light cursor-pointer border-0">
            Next stage <span aria-hidden="true">→</span>
          </button>
        ) : (
          <a className="ink-btn btn-glass glass" href="#experience">
            Where I built this <ArrowUpRight />
          </a>
        )}
      </div>
    </div>
  )
}

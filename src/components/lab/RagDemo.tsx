/*
 * The RAG pipeline tab. For now this is the click-through explainer of how my financial RAG
 * pipelines are built; Phase 4 of the AI Lab plan turns it into a live "Ask about my work" demo
 * (docs/11-rag-api.md).
 */
import { useState } from 'react'
import { ArrowUpRight } from '../ui'

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

export default function RagDemo() {
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

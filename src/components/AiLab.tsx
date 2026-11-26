/*
 * The AI Lab section: two tabs of real AI demos. Each demo is its own file, loaded only when its
 * tab opens (React.lazy), so the models and their code never slow down the first page load.
 * Overview in docs/09-ai-lab-overview.md.
 */
import { lazy, Suspense, useState } from 'react'
import SectionHeader from './SectionHeader'
import { Section } from './ui'

const RouterDemo = lazy(() => import('./lab/RouterDemo'))
const RagDemo = lazy(() => import('./lab/RagDemo'))

const TABS = ['RAG pipeline', 'BrainDump'] as const

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
        <Suspense fallback={<div className="glass min-h-[420px] rounded-3xl" aria-busy="true" />}>{tab === 0 ? <RagDemo /> : <RouterDemo />}</Suspense>
      </div>
    </Section>
  )
}

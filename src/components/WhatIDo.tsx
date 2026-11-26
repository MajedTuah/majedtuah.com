import { CAPABILITIES } from '../data'
import Carousel from './Carousel'
import SectionHeader from './SectionHeader'
import { LineP, Section } from './ui'

export default function WhatIDo({ n }: { n: string }) {
  return (
    <Section id="work" label="What I do" glow="right">
      <SectionHeader n={n} label="What I do" title="What I" outlined="build" ar="عمل" />
      <LineP className="-mt-6 mb-16 max-w-2xl text-lg leading-relaxed text-mist">
        The kinds of AI system I build, from the first prototype to the version people use every day.
      </LineP>
      <Carousel
        label="What I build"
        items={CAPABILITIES}
        render={(c, i) => (
          <article className="cap glass relative flex h-full min-h-[420px] flex-col overflow-hidden rounded-3xl p-8 md:p-10">
            <span
              lang="ar"
              aria-hidden="true"
              className="cap-ar ar pointer-events-none absolute -top-4 -right-2 text-[150px] leading-none font-bold text-transparent [-webkit-text-stroke:1.2px_rgba(212,211,206,0.35)] select-none"
            >
              {c.ar}
            </span>
            <span className="mono text-xs text-accent">0{i + 1}</span>
            <h3 className="disp relative mt-auto mb-4 pt-32 text-[clamp(30px,3vw,40px)] leading-[1.05] font-light">{c.title}</h3>
            <p className="relative m-0 text-base leading-relaxed text-mist">{c.text}</p>
            <div className="relative mt-7 flex flex-wrap gap-1.5">
              {c.tags.map((t) => (
                <span key={t} className="mono rounded-full border border-accent/20 bg-accent/5 px-2.5 py-1 text-[10px] tracking-[0.08em] text-mist">
                  {t}
                </span>
              ))}
            </div>
          </article>
        )}
      />
    </Section>
  )
}

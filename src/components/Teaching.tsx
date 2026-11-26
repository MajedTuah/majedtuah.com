import { useState } from 'react'
import { TEACHING } from '../data'
import SectionHeader from './SectionHeader'
import Carousel from './Carousel'
import { ArrowUpRight, LineP, Section } from './ui'

export default function Teaching({ n }: { n: string }) {
  return (
    <Section id="teaching" label="Teaching" glow="left">
      <SectionHeader n={n} label="Teaching & speaking" title="I also" outlined="teach" ar="تعليم" />
      <LineP className="-mt-6 mb-16 max-w-2xl text-lg leading-relaxed text-mist">
        I’ve taught since 2021: first students writing their first lines of Python, now engineers putting models into production.
      </LineP>
      <Carousel label="Teaching" items={TEACHING} render={(t) => <Card {...t} />} />
    </Section>
  )
}

function Card({ kind, title, host, when, audience, modules, href, note }: (typeof TEACHING)[number]) {
  const [open, setOpen] = useState(false)
  const shown = open ? modules : modules.slice(0, 2)
  return (
    <article className="glass flex h-full flex-col gap-6 rounded-3xl p-7 md:p-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="mono rounded-full border border-accent/40 px-3 py-1 text-[10px] tracking-[0.16em] text-accent uppercase">{kind}</span>
        <span className="mono text-[11px] tracking-[0.1em] text-ash">{when}</span>
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="disp m-0 text-[clamp(28px,3vw,38px)] leading-tight">{title}</h3>
        <span className="text-sm text-ash">
          {host} · {audience}
        </span>
      </div>
      <ol className="m-0 flex list-none flex-col gap-0 border-t border-bone/10 p-0">
        {shown.map((m, j) => (
          <li key={m} className="flex gap-4 border-b border-bone/10 py-3.5 text-[15px] text-mist">
            <span className="mono pt-0.5 text-[11px] text-accent">0{j + 1}</span>
            {m}
          </li>
        ))}
      </ol>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
        {modules.length > 2 && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="mono min-h-11 cursor-pointer border-0 bg-transparent p-0 text-[11px] tracking-[0.16em] text-ash uppercase hover:text-bone"
          >
            {open ? 'Show less' : `Show all ${modules.length} modules`}
          </button>
        )}
        {href ? (
          <a className="ink-btn btn-glass glass" href={href} target="_blank" rel="noreferrer">
            Materials on GitHub <ArrowUpRight />
          </a>
        ) : (
          note && <span className="text-sm text-ash">{note}</span>
        )}
      </div>
    </article>
  )
}

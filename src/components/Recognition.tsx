import { AWARDS, RECOMMENDATIONS } from '../data'
import SectionHeader from './SectionHeader'
import { Reveal, Section } from './ui'

/** Awards and LinkedIn recommendations. Hidden until AWARDS or RECOMMENDATIONS in data.ts has entries. */
export default function Recognition({ n }: { n: string }) {
  if (AWARDS.length === 0 && RECOMMENDATIONS.length === 0) return null
  return (
    <Section id="recognition" label="Recognition" glow="right">
      <SectionHeader n={n} label="Recognition" title="Kind" outlined="words" ar="تقدير" />

      {AWARDS.length > 0 && (
        <div className="mb-16 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {AWARDS.map((a, i) => (
            <Reveal variant="wipe" key={a.title} delay={i * 90}>
              <article className="glass flex h-full flex-col overflow-hidden rounded-3xl">
                {a.image && <img src={a.image} alt={a.title} className="aspect-[4/3] w-full object-cover" loading="lazy" />}
                <div className="flex flex-col gap-2 p-7">
                  <span className="mono text-[11px] tracking-[0.12em] text-accent">
                    {a.org} · {a.date}
                  </span>
                  <h3 className="disp m-0 text-[26px] leading-tight">{a.title}</h3>
                  {a.detail && <p className="m-0 text-[15px] leading-relaxed text-mist">{a.detail}</p>}
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      )}

      {RECOMMENDATIONS.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          {RECOMMENDATIONS.map((r, i) => (
            <Reveal variant="wipe" key={r.name} delay={i * 90}>
              <figure className="glass m-0 flex h-full flex-col gap-6 rounded-3xl p-8 md:p-10">
                <span className="disp text-6xl leading-none text-accent" aria-hidden="true">
                  “
                </span>
                <blockquote className="m-0 -mt-6 text-xl leading-relaxed">{r.quote}</blockquote>
                <figcaption className="mt-auto flex flex-col gap-0.5">
                  <span className="font-medium">{r.name}</span>
                  <span className="text-sm text-ash">
                    {r.role}
                    {r.relation ? ` · ${r.relation}` : ''}
                  </span>
                  <span className="mono mt-1 text-[10px] tracking-[0.16em] text-ash uppercase">via LinkedIn</span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      )}
    </Section>
  )
}

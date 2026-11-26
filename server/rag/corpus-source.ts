/*
 * Ingest + Chunk: turns the site's own content (src/data.ts) and any Markdown notes in content/
 * into small, self-contained passages. One passage per project, role, course and so on, so a
 * citation points at one clear thing. Run by `pnpm corpus` (scripts/build-corpus.ts).
 */
import { CAPABILITIES, LINKS, MORE_PROJECTS, PROJECTS, RESUME, TEACHING } from '../../src/data.ts'
import type { Chunk } from './types.ts'

const plain = (s: string) => s.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim()
// Questions name Majed. A passage that never says his name scores as unrelated, so each one stands alone.
const nameHim = (chunk: Chunk): Chunk => (/majed/i.test(`${chunk.title} ${chunk.text}`) ? chunk : { ...chunk, text: `Majed Tuah. ${chunk.text}` })
const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export function chunksFromSite(): Chunk[] {
  const out: Chunk[] = []
  const r = RESUME

  out.push({
    id: 'profile',
    source: 'Résumé',
    title: `${r.fullName}: ${r.role}`,
    url: LINKS.cv,
    text: `${plain(r.summary)} Based in ${r.location}. Also known as Majed Tuah. GitHub: ${LINKS.github}. LinkedIn: ${LINKS.linkedin}.`,
  })

  for (const e of r.experience) {
    out.push({
      id: `role:${slug(e.company)}`,
      source: 'Résumé',
      title: `${e.role} at ${e.company}`,
      url: LINKS.cv,
      text: `${e.role}, ${e.company}, ${e.place}, ${e.period}. ${e.points.map(plain).join('. ')}.`,
    })
  }

  for (const p of PROJECTS) {
    out.push({
      id: `project:${slug(p.title)}`,
      source: 'Projects',
      title: p.title,
      url: p.href,
      text: `${p.title} (${p.label}, ${p.year}). ${plain(p.text)} Tools: ${p.tags.join(', ')}. Topics: ${p.topics}.`,
    })
  }

  for (const p of MORE_PROJECTS) {
    out.push({
      id: `project:${slug(p.title)}`,
      source: 'Projects',
      title: p.title,
      text: `${p.title} (${p.where}, ${p.year}). ${plain(p.text)} Tools: ${p.tags.join(', ')}.`,
    })
  }

  for (const t of TEACHING) {
    out.push({
      id: `teaching:${slug(t.title)}`,
      source: 'Teaching',
      title: `${t.title} (${t.host})`,
      url: 'href' in t ? t.href : undefined,
      text: `${t.kind}: ${t.title}, ${t.host}, ${t.when}. For: ${t.audience}. Covers: ${t.modules.join('; ')}.${'note' in t && t.note ? ' ' + t.note : ''}`,
    })
  }

  for (const c of CAPABILITIES) {
    out.push({
      id: `capability:${slug(c.title)}`,
      source: 'What I do',
      title: c.title,
      text: `${c.title}: ${plain(c.text)} Tools: ${c.tags.join(', ')}.`,
    })
  }

  out.push({
    id: 'skills',
    source: 'Résumé',
    title: 'Skills',
    url: LINKS.cv,
    text: r.skills.map((s) => `${s.group}: ${s.items.join(', ')}`).join('. ') + '.',
  })

  const ed = r.education
  const cert = r.certification
  out.push({
    id: 'education',
    source: 'Résumé',
    title: 'Education and certification',
    url: LINKS.cv,
    text: `${ed.degree}, ${ed.school}, ${ed.place}, graduated ${ed.date}, GPA ${ed.gpa}. Certification: ${cert.name} (${cert.detail}), ${cert.date}.`,
  })

  return out.map(nameHim)
}

/**
 * Markdown notes in content/*.md: every "## Heading" section becomes one passage. A first line
 * "source: Something" sets the citation label (default: the file name).
 */
export function chunksFromMarkdown(file: string, markdown: string): Chunk[] {
  const name = file.replace(/^.*[\\/]/, '').replace(/\.md$/i, '')
  let source = name
  const body = markdown.replace(/^source:\s*(.+)\r?\n/i, (_, s: string) => ((source = s.trim()), ''))
  const sections = body.split(/^##\s+/m).slice(1)
  return sections
    .map((section) => {
      const [heading, ...rest] = section.split(/\r?\n/)
      return { heading: heading.trim(), text: plain(rest.join(' ').replace(/[#>*_`]/g, ' ')) }
    })
    .filter((s) => s.text.length > 20)
    .map((s) => nameHim({ id: `note:${slug(name)}:${slug(s.heading)}`, source, title: s.heading, text: s.text }))
}

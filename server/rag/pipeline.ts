/*
 * The "Ask about my work" pipeline. One question in, an NDJSON stream out (decision D-010):
 *
 *   check -> guard -> retrieve -> rerank -> sources -> token... -> done
 *
 * Each stage sends its event the moment it finishes, so the page can light it up while the next
 * one runs. Vendor-free: every model call comes in through `deps`. Explained in docs/11-rag-api.md.
 */
import { CONTEXT_PASSAGES, GUARD_THRESHOLD, LIMITS, MIN_RERANK_SCORE, RERANK_CANDIDATES, SEARCH_TOP_K } from './config.ts'
import { takeQuestion } from './limits.ts'
import { BLOCKED, NOT_IN_NOTES, buildMessages } from './prompt.ts'
import { bm25Search, buildBm25, rrf, vectorSearch, type Bm25Index } from './search.ts'
import type { AskEvent, Corpus, Deps, Source } from './types.ts'

// The keyword index depends only on the corpus, so build it once per corpus, not per question.
const indexes = new WeakMap<Corpus, Bm25Index>()
function bm25For(corpus: Corpus): Bm25Index {
  let index = indexes.get(corpus)
  if (!index) indexes.set(corpus, (index = buildBm25(corpus.chunks.map((c) => `${c.title} ${c.source} ${c.text}`))))
  return index
}

/** Runs the pipeline, calling `emit` for each event. Never throws: failures become an `error` event. */
export async function runAsk(question: string, ip: string, deps: Deps, emit: (e: AskEvent) => void, signal?: AbortSignal): Promise<void> {
  const now = deps.now ?? Date.now
  const limits = { ...LIMITS, ...deps.limits }
  const started = now()
  let remaining = 0
  const finish = (grounded: boolean, model: string | null) => emit({ type: 'done', grounded, remaining, model, ms: now() - started })
  const say = (text: string) => emit({ type: 'token', text })

  try {
    // 1. Check: has this visitor (or the whole site today) used up its questions?
    const allowed = await takeQuestion(deps.store, ip, limits, now())
    if (!allowed.ok) return emit({ type: 'limit', reason: allowed.reason, email: deps.email, ms: now() - started })
    remaining = allowed.remaining
    emit({ type: 'check', ok: true, remaining, ms: now() - started })

    // 2. Guard: Prompt Guard scores the question before any other model sees it.
    let t = now()
    const score = await deps.guard(question)
    const safe = score < GUARD_THRESHOLD
    emit({ type: 'guard', ok: safe, score: round(score), ms: now() - t })
    if (!safe) return say(BLOCKED), finish(false, null)

    // 3. Retrieve: keyword and vector search, merged with Reciprocal Rank Fusion.
    t = now()
    const { chunks } = deps.corpus
    const keyword = bm25Search(bm25For(deps.corpus), question, SEARCH_TOP_K)
    const vector = vectorSearch(chunks, await deps.embed(question), SEARCH_TOP_K)
    const merged = rrf([keyword, vector]).slice(0, RERANK_CANDIDATES)
    const rankIn = (list: number[], i: number) => (list.includes(i) ? list.indexOf(i) + 1 : null)
    emit({
      type: 'retrieve',
      ms: now() - t,
      hits: merged.map((i) => ({ id: chunks[i].id, title: chunks[i].title, keywordRank: rankIn(keyword, i), vectorRank: rankIn(vector, i) })),
    })

    // 4. Rerank: a cross-encoder reads question + passage together and scores how well it answers.
    t = now()
    const scores = await deps.rerank(
      question,
      merged.map((i) => `${chunks[i].title}. ${chunks[i].text}`),
    )
    const best = merged
      .map((i, j) => ({ i, score: scores[j] }))
      .sort((a, b) => b.score - a.score)
      .slice(0, CONTEXT_PASSAGES)
    emit({ type: 'rerank', ms: now() - t, top: best.map(({ i, score }) => ({ id: chunks[i].id, title: chunks[i].title, score: round(score) })) })

    // Nothing relevant: say so, and don't spend an LLM call making something up.
    if (!best.length || best[0].score < MIN_RERANK_SCORE) return say(NOT_IN_NOTES), finish(false, null)

    // 5. Ground & answer: only passages that cleared the bar go to the LLM, numbered for citations.
    const sources: Source[] = best
      .filter(({ score }) => score >= MIN_RERANK_SCORE)
      .map(({ i }, n) => {
        const c = chunks[i]
        return { n: n + 1, id: c.id, title: c.title, source: c.source, url: c.url, text: c.text }
      })
    emit({ type: 'sources', sources })
    const { model, tokens } = await deps.answer(buildMessages(question, sources), signal)
    for await (const piece of tokens) say(piece)
    finish(true, model)
  } catch (e) {
    console.error('[ask]', e) // full detail in the server log only
    emit({ type: 'error', message: 'Something went wrong on my side. Please try again in a minute.' })
  }
}

/** Wraps runAsk as a streaming HTTP body: one JSON object per line. */
export function askStream(question: string, ip: string, deps: Deps, signal?: AbortSignal): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    async start(controller) {
      await runAsk(question, ip, deps, (e) => controller.enqueue(encoder.encode(JSON.stringify(e) + '\n')), signal)
      controller.close()
    },
  })
}

const round = (n: number) => Math.round(n * 1000) / 1000

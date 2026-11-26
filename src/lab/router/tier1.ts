/*
 * Tier 1 of the BrainDump router: TF-IDF + linear SVM, in plain TypeScript.
 * It repeats sklearn's maths on the numbers exported to tier1.json, so no ML library is needed.
 * Explained step by step in docs/10-braindump-in-the-browser.md (decision D-004).
 */

export interface Tier1Model {
  format: 'braindump-tier1/v1' | 'braindump-tier1/v2'
  labels: string[]
  /** terms[i] is the word, or "word word" bigram, for feature i */
  terms: string[]
  idf: number[]
  /** one row of weights per label */
  coef: number[][]
  intercept: number[]
  /** v2: one sigmoid per label that turns an SVM margin into a probability (Platt scaling). null = softmax. */
  calibration?: { a: number; b: number }[] | null
}

export type Probs = Record<string, number>

/** Compiled model: the vocabulary as a Map for fast lookups */
export interface Tier1 {
  labels: string[]
  index: Map<string, number>
  idf: number[]
  coef: number[][]
  intercept: number[]
  calibration: { a: number; b: number }[] | null
}

export function compileTier1(m: Tier1Model): Tier1 {
  if (m.format !== 'braindump-tier1/v1' && m.format !== 'braindump-tier1/v2') throw new Error(`Unknown tier1 format ${m.format}`)
  return {
    labels: m.labels,
    index: new Map(m.terms.map((t, i) => [t, i])),
    idf: m.idf,
    coef: m.coef,
    intercept: m.intercept,
    calibration: m.calibration ?? null,
  }
}

/**
 * sklearn CalibratedClassifierCV(method="sigmoid"): each label's margin goes through its own
 * sigmoid 1 / (1 + e^(a·margin + b)), then the results are scaled to add up to 1.
 */
export function calibrate(scores: number[], cal: { a: number; b: number }[]): number[] {
  const p = scores.map((s, k) => 1 / (1 + Math.exp(cal[k].a * s + cal[k].b)))
  const sum = p.reduce((x, y) => x + y, 0)
  return sum > 0 ? p.map((v) => v / sum) : p.map(() => 1 / p.length)
}

/**
 * sklearn TfidfVectorizer's analyzer with strip_accents="unicode", lowercase=True,
 * token_pattern=r"(?u)\b\w\w+\b" and ngram_range=(1, 2).
 */
export function analyze(text: string): string[] {
  // strip_accents="unicode": split letters from their accents (NFKD), then drop the accents
  const plain = text.toLowerCase().normalize('NFKD').replace(/\p{Mn}/gu, '')
  // \b\w\w+\b: every run of 2+ word characters (letters, digits, underscore)
  const tokens = plain.match(/[\p{L}\p{N}_]{2,}/gu) ?? []
  const grams = [...tokens]
  for (let i = 0; i + 1 < tokens.length; i++) grams.push(`${tokens[i]} ${tokens[i + 1]}`)
  return grams
}

export function softmax(xs: number[]): number[] {
  const max = Math.max(...xs)
  const e = xs.map((x) => Math.exp(x - max))
  const sum = e.reduce((a, b) => a + b, 0)
  return e.map((v) => v / sum)
}

/** Probabilities per label: TF-IDF vector -> SVM scores -> calibrated sigmoids (or softmax for v1 files). */
export function predictTier1(model: Tier1, text: string): Probs {
  // 1. count how often each known word/bigram appears
  const counts = new Map<number, number>()
  for (const g of analyze(text)) {
    const i = model.index.get(g)
    if (i !== undefined) counts.set(i, (counts.get(i) ?? 0) + 1)
  }
  // 2. sublinear tf (1 + log count) times idf, then scale the vector to length 1 (L2 norm)
  const vec = new Map<number, number>()
  let norm = 0
  for (const [i, c] of counts) {
    const v = (1 + Math.log(c)) * model.idf[i]
    vec.set(i, v)
    norm += v * v
  }
  norm = Math.sqrt(norm)
  // 3. one score per label: weights · vector + intercept (the SVM decision function)
  const scores = model.coef.map((row, k) => {
    let s = model.intercept[k]
    if (norm > 0) for (const [i, v] of vec) s += row[i] * (v / norm)
    return s
  })
  const p = model.calibration ? calibrate(scores, model.calibration) : softmax(scores)
  return Object.fromEntries(model.labels.map((l, k) => [l, p[k]]))
}

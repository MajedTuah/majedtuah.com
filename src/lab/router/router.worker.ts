/*
 * Web Worker (a background thread) that loads the BrainDump models and runs the router, so the
 * heavy maths never freezes scrolling or animations. Tier 1 is plain TypeScript; Tiers 2 and 3 are
 * ONNX models run by transformers.js on WebAssembly. Explained in docs/10-braindump-in-the-browser.md.
 */
/// <reference lib="webworker" />
import { AutoModelForSequenceClassification, AutoTokenizer, env } from '@huggingface/transformers'
import { route, type TierRunner } from './arbitrator'
import { compileTier1, predictTier1, type Probs, type Tier1, type Tier1Model } from './tier1'
import type { FromWorker, Manifest, TierKey, ToWorker } from './protocol'

const BASE = '/models/braindump/'
// Where the opt-in teacher lives on Hugging Face. Public configuration, not a secret.
const TEACHER_REPO = import.meta.env.VITE_TEACHER_REPO as string | undefined
// While developing (pnpm dev) and before the upload, the dev server serves the teacher from
// tools/export/out/teacher at /models/braindump-teacher/ (see vite.config.ts). Never in production.
const DEV_TEACHER = import.meta.env.DEV && !TEACHER_REPO ? 'braindump-teacher' : undefined
const TEACHER = TEACHER_REPO ?? DEV_TEACHER

// Serve the ONNX Runtime engine from our own site, not a CDN (decision D-015)
env.backends.onnx.wasm!.wasmPaths = { mjs: '/ort/ort-wasm-simd-threaded.mjs', wasm: '/ort/ort-wasm-simd-threaded.wasm' }
env.backends.onnx.wasm!.numThreads = 1 // threads need cross-origin isolation headers; one is plenty here
env.useBrowserCache = true // keep downloaded models for return visits

const post = (m: FromWorker) => (self as unknown as DedicatedWorkerGlobalScope).postMessage(m)

let manifest: Manifest
let tier1: Tier1 | null = null
type Classifier = (text: string) => Promise<Probs>
const neural: Partial<Record<'tier2' | 'tier3', Classifier>> = {}
let loading: Promise<unknown> = Promise.resolve()

async function loadClassifier(key: 'tier2' | 'tier3', id: string, remote: boolean): Promise<Classifier> {
  // Student (and the dev teacher): our own site only. Uploaded teacher: Hugging Face only.
  env.allowLocalModels = !remote
  env.allowRemoteModels = remote
  env.localModelPath = '/models/'
  const total = manifest.tiers[key].files.reduce((s, f) => s + f.bytes, 0)
  const loaded = new Map<string, number>()
  const progress_callback = (e: { status: string; file?: string; loaded?: number }) => {
    if (e.status === 'progress' && e.file) {
      loaded.set(e.file, e.loaded ?? 0)
      const done = [...loaded.values()].reduce((a, b) => a + b, 0)
      post({ type: 'status', tier: key, state: 'loading', progress: total ? Math.min(1, done / total) : 0 })
    }
  }
  const tokenizer = await AutoTokenizer.from_pretrained(id, { progress_callback })
  const model = await AutoModelForSequenceClassification.from_pretrained(id, { dtype: 'q8', device: 'wasm', progress_callback })
  const labels = manifest.labels
  const classify: Classifier = async (text) => {
    const inputs = await tokenizer(text, { truncation: true, max_length: manifest.maxLength })
    const { logits } = await model(inputs)
    const raw = Array.from(logits.data as Float32Array)
    const max = Math.max(...raw)
    const e = raw.map((v) => Math.exp(v - max))
    const sum = e.reduce((a, b) => a + b, 0)
    return Object.fromEntries(labels.map((l, i) => [l, e[i] / sum]))
  }
  await classify('warm up') // the first run is always slow; do it now so shown timings are real
  return classify
}

function queue<T>(job: () => Promise<T>): Promise<T> {
  const next = loading.then(job, job)
  loading = next.catch(() => undefined)
  return next
}

async function init() {
  manifest = await (await fetch(`${BASE}manifest.json`)).json()
  post({ type: 'manifest', manifest, teacherAvailable: Boolean(TEACHER) })
  tier1 = compileTier1((await (await fetch(`${BASE}tier1.json`)).json()) as Tier1Model)
  post({ type: 'status', tier: 'tier1', state: 'ready', progress: 1 })
  await loadTier('tier2')
}

function loadTier(key: TierKey) {
  if (key === 'tier1' || neural[key]) return Promise.resolve()
  if (key === 'tier3' && !TEACHER) return Promise.resolve()
  return queue(async () => {
    if (neural[key]) return
    post({ type: 'status', tier: key, state: 'loading', progress: 0 })
    try {
      neural[key] = key === 'tier2' ? await loadClassifier('tier2', 'braindump/student', false) : await loadClassifier('tier3', TEACHER!, !DEV_TEACHER)
      post({ type: 'status', tier: key, state: 'ready', progress: 1 })
    } catch (err) {
      console.error(`[router] ${key} failed to load`, err)
      post({ type: 'status', tier: key, state: 'error', progress: 0 })
    }
  })
}

const runner =
  (key: 'tier2' | 'tier3'): TierRunner =>
  async (text) =>
    neural[key] ? neural[key]!(text) : null

self.onmessage = async (ev: MessageEvent<ToWorker>) => {
  const msg = ev.data
  try {
    if (msg.type === 'init') await init()
    else if (msg.type === 'load') await loadTier(msg.tier)
    else if (msg.type === 'route') {
      if (!tier1) throw new Error('not ready')
      const t1 = tier1
      const decision = await route(
        msg.text,
        { tier1: async (t) => predictTier1(t1, t), tier2: runner('tier2'), tier3: runner('tier3') },
        (trace) => post({ type: 'tier', id: msg.id, trace }),
      )
      post({ type: 'result', id: msg.id, decision })
    }
  } catch (err) {
    console.error('[router]', err)
    post({ type: 'error', id: msg.type === 'route' ? msg.id : undefined })
  }
}

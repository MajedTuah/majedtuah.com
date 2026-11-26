/*
 * Copies ONNX Runtime's WebAssembly engine from node_modules into public/ort/, so the site serves
 * it itself instead of loading it from a public CDN (decision D-015 in docs/decisions.md).
 * Runs automatically before `dev` and `build`. public/ort/ is generated, so it is gitignored.
 */
import { copyFileSync, mkdirSync, readdirSync, existsSync, realpathSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..')
// transformers.js depends on onnxruntime-web. pnpm keeps it next to transformers.js's real folder.
const tjs = realpathSync(join(root, 'node_modules', '@huggingface', 'transformers'))
const dist = join(tjs, '..', '..', 'onnxruntime-web', 'dist')

// The plain (non-asyncify) build: 14 MB, under Cloudflare Pages' 25 MB per-file limit
const files = ['ort-wasm-simd-threaded.wasm', 'ort-wasm-simd-threaded.mjs']
const out = join(root, 'public', 'ort')
mkdirSync(out, { recursive: true })
for (const f of files) {
  const src = join(dist, f)
  if (!existsSync(src)) throw new Error(`onnxruntime-web file missing: ${src}. Found: ${readdirSync(dist).join(', ')}`)
  copyFileSync(src, join(out, f))
}
console.log(`copy-ort: ${files.join(', ')} -> public/ort/`)

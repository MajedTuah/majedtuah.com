import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, resolve, sep } from 'node:path'

/**
 * onnxruntime-web's code points at its own 27 MB WebAssembly file, so Vite copies it into the
 * build. We never load that file: the router worker loads our smaller copy from /ort/
 * (scripts/copy-ort.mjs, decision D-015). Dropping it keeps every file under Cloudflare Pages'
 * 25 MB limit.
 */
function dropUnusedOrtWasm(): Plugin {
  return {
    name: 'drop-unused-ort-wasm',
    apply: 'build',
    generateBundle(_options, bundle) {
      for (const name of Object.keys(bundle)) if (/ort-wasm.*\.wasm$/.test(name)) delete bundle[name]
    },
  }
}

/**
 * Development only: serves the exported teacher (tools/export/out/teacher, ~110 MB) at
 * /models/braindump-teacher/ so Tier 3 can be tried locally before it is uploaded to Hugging Face.
 * It never reaches the build (Cloudflare Pages can't serve files over 25 MB). See docs/10.
 */
function devTeacher(): Plugin {
  const root = resolve(import.meta.dirname, 'tools/export/out/teacher')
  const types: Record<string, string> = { '.json': 'application/json', '.onnx': 'application/octet-stream' }
  return {
    name: 'dev-teacher',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/models/braindump-teacher', (req, res) => {
        const file = resolve(root, '.' + decodeURIComponent((req.url ?? '/').split('?')[0]))
        if (!file.startsWith(root + sep) || !existsSync(file) || !statSync(file).isFile()) {
          res.statusCode = 404 // a real 404, so the app doesn't receive index.html instead
          return res.end()
        }
        res.setHeader('Content-Type', types[extname(file)] ?? 'application/octet-stream')
        res.setHeader('Content-Length', statSync(file).size)
        createReadStream(file).pipe(res)
      })
    },
  }
}

/**
 * Development only: POST /api/ask runs the RAG pipeline on this machine (server/dev-ask.ts).
 * The handler is loaded through Vite so the server code stays in TypeScript. Production is
 * functions/api/ask.ts, which this plugin never includes in the build.
 */
function devAsk(): Plugin {
  return {
    name: 'dev-ask',
    apply: 'serve',
    configureServer(server) {
      // Vitest boots this config too. Loading the embedder there crashes the test run.
      if (process.env.VITEST) return
      server.middlewares.use(async (req, res, next) => {
        const url = (req.url ?? '').split('?')[0]
        if (url !== '/api/ask') return next()
        try {
          const mod = (await server.ssrLoadModule('/server/dev-ask.ts')) as typeof import('./server/dev-ask.ts')
          await mod.handleDevAsk(req, res)
        } catch (e) {
          console.error('[ask]', e)
          if (!res.headersSent) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ error: 'The ask demo failed to start.' }))
          } else res.end()
        }
      })
      void server.ssrLoadModule('/server/dev-ask.ts').then((mod) => (mod as typeof import('./server/dev-ask.ts')).warmAsk())
    },
  }
}

// Vite config: https://vite.dev/config/
// The page title, description, favicon and robots tag live in index.html.
export default defineConfig({
  plugins: [react(), tailwindcss(), devTeacher(), devAsk()],
  worker: { format: 'es', plugins: () => [dropUnusedOrtWasm()] },
  // Pre-bundle transformers.js at dev-server start. Otherwise Vite discovers it when the AI Lab
  // first opens and reloads the whole page mid-visit.
  optimizeDeps: { include: ['@huggingface/transformers'] },
  // The ask handler imports transformers.js. Leave that package to Node during dev SSR.
  ssr: { external: ['@huggingface/transformers', 'onnxruntime-common', 'onnxruntime-node', 'onnxruntime-web'] },
  build: {
    // Never publish source maps: they would hand out the original source code (docs/12-security.md)
    sourcemap: false,
  },
  server: { port: 8443, strictPort: true },
  preview: { port: 8443 },
})

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

// Vite config: https://vite.dev/config/
// The page title, description, favicon and robots tag live in index.html.
export default defineConfig({
  plugins: [react(), tailwindcss(), devTeacher()],
  worker: { format: 'es', plugins: () => [dropUnusedOrtWasm()] },
  // Pre-bundle transformers.js at dev-server start. Otherwise Vite discovers it when the AI Lab
  // first opens and reloads the whole page mid-visit.
  optimizeDeps: { include: ['@huggingface/transformers'] },
  build: {
    // Never publish source maps: they would hand out the original source code (docs/12-security.md)
    sourcemap: false,
  },
  server: { port: 8443, strictPort: true },
  preview: { port: 8443 },
})

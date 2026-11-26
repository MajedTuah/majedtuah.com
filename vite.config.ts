import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Vite config: https://vite.dev/config/
// The page title, description, favicon and robots tag live in index.html.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 8443, strictPort: true },
  preview: { port: 8443 },
})

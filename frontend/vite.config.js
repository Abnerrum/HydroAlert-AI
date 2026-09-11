import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const proxyTarget = process.env.API_PROXY_TARGET || 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
  build: { outDir: '../dashboard', emptyOutDir: true },
  server: { proxy: { '/api': proxyTarget, '/health': proxyTarget } },
})

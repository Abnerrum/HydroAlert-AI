import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const isNetlify = process.env.NETLIFY === 'true'
const isGitHubPages = process.env.GITHUB_ACTIONS === 'true'
const isVercel = process.env.VERCEL === '1'

export default defineConfig({
  base: isGitHubPages ? '/HydroAlert-AI/' : '/',
  plugins: [react()],
  build: {
    outDir: (isNetlify || isVercel) ? 'dist' : '../dashboard',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
    },
  },
})

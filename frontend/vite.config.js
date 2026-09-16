import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const isNetlify = process.env.NETLIFY === 'true'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: isNetlify ? 'dist' : '../dashboard',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
    },
  },
})

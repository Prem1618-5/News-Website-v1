import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true,
      // Platform API (FastAPI). Set VITE_API_URL instead to call it directly.
      proxy: {
        '/api': { target: env.NEWS_API_PROXY ?? 'http://127.0.0.1:8000', changeOrigin: true },
        '/images': { target: env.NEWS_API_PROXY ?? 'http://127.0.0.1:8000', changeOrigin: true },
        '/newsroom': { target: env.NEWSROOM_PROXY ?? 'http://127.0.0.1:5174', changeOrigin: true, ws: true },
      },
    },
    build: { target: 'es2022', cssCodeSplit: true, manifest: true },
    test: { environment: 'node', include: ['src/**/*.test.{ts,tsx}'] },
  }
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const VENDOR_CHUNKS: Record<string, string[]> = {
  'vendor-react': ['react', 'react-dom', 'react-router-dom'],
  'vendor-supabase': ['@supabase/supabase-js'],
  'vendor-charts': ['recharts'],
  'vendor-xlsx': ['xlsx'],
  'vendor-icons': ['lucide-react'],
}

// 빌드 타임스탬프 (클라이언트 캐시 무효화용)
const BUILD_ID = process.env.VERCEL_GIT_COMMIT_SHA
  ? process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7)
  : String(Date.now())

// dist/version.json 자동 생성 — 매 진입 시 서버 fetch 로 신·구 번들 식별
import { writeFileSync } from 'node:fs'
import { resolve as pathResolve } from 'node:path'
const versionJsonPlugin = {
  name: 'write-version-json',
  closeBundle() {
    const out = pathResolve(__dirname, 'dist', 'version.json')
    writeFileSync(out, JSON.stringify({ buildId: BUILD_ID, builtAt: new Date().toISOString() }))
    console.log(`[version-json] wrote ${out} (buildId=${BUILD_ID})`)
  },
}

export default defineConfig({
  plugins: [react(), versionJsonPlugin],
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  build: {
    chunkSizeWarningLimit: 400,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          for (const [chunkName, deps] of Object.entries(VENDOR_CHUNKS)) {
            if (deps.some(dep => id.includes(`/node_modules/${dep}/`))) {
              return chunkName
            }
          }
        },
      },
    },
  },
})

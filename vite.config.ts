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

export default defineConfig({
  plugins: [react()],
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

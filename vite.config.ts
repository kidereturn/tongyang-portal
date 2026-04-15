import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const VENDOR_CHUNKS: Record<string, string[]> = {
  'vendor-react': ['react', 'react-dom', 'react-router-dom'],
  'vendor-supabase': ['@supabase/supabase-js'],
  'vendor-charts': ['recharts'],
  'vendor-xlsx': ['xlsx'],
  'vendor-icons': ['lucide-react'],
}

export default defineConfig({
  plugins: [react()],
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

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5169',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('react/') || id.includes('react-dom') || id.includes('react-router')) return 'react'
          if (id.includes('@mui/icons-material')) return 'icons'
          if (id.includes('@mui/') || id.includes('@emotion/')) return 'mui'
          if (id.includes('react-hook-form') || id.includes('@hookform/') || id.includes('/zod/')) return 'forms'
          if (id.includes('@tanstack/react-query')) return 'query'
          return undefined
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})

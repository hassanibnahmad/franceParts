import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Route all /api requests to the main dev API server (server.cjs).
      // The server now delegates /api/upload and /api/posts to the local ESM handlers, so a separate upload server is not required.
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})

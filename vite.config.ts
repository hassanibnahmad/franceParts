import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // route upload and posts endpoints to the local dev upload server (express)
      '/api/upload': {
        target: 'http://localhost:3333',
        changeOrigin: true,
        secure: false,
      },
      '/api/posts': {
        target: 'http://localhost:3333',
        changeOrigin: true,
        secure: false,
      },
      // other api endpoints (admin-login, etc.) stay routed to the main server
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})

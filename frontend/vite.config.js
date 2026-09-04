import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../wwwroot',
    emptyOutDir: true
  },
  // Dev server proxy: the backend runs on http://localhost:5268 (dotnet run).
  // Production is same-origin (the built SPA is served from wwwroot).
  server: {
    proxy: {
      '/api': 'http://localhost:5268'
    }
  }
})

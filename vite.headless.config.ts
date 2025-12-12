import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// This config is for running the dev server in a headless environment (e.g., for Playwright)
// It removes the vite-plugin-electron to prevent it from trying to launch Electron, which fails.
export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    outDir: 'dist'
  },
  server: {
    port: 5173
  }
})

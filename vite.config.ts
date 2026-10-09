import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { frameDataPlugin } from './server/frameDataPlugin.ts'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), frameDataPlugin()],
  server: {
    host: '0.0.0.0',
    port: 5000,
    strictPort: true,
    allowedHosts: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { movementFrameDataPlugin } from './server/movementFrameDataPlugin.ts'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), movementFrameDataPlugin()],
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

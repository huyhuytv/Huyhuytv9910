import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Listen on all local IPs (0.0.0.0)
    port: 5173,
    strictPort: false, // Try next port if 5173 is taken
  }
})
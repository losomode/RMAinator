import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    strictPort: true,  // Fail if port is taken instead of trying another
    open: false,
  },
  build: {
    outDir: 'build',
  },
})

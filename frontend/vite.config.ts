import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@inator/shared': path.resolve(__dirname, '../../shared/frontend/src'),
    },
    dedupe: ['react', 'react-dom', 'react-router-dom'],
  },
  server: {
    port: 3002,
    strictPort: true,
    open: false,
  },
  base: '/rma/',
  build: {
    outDir: 'dist',
  },
});

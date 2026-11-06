import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Relative base: the built Mini App is served by the Fastify server under
  // /app/ (hash router, zero rewrites) — absolute asset URLs would 404 there.
  base: './',
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      '/api': {
        target: process.env.V3_API_TARGET ?? 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
  },
});

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    // Both of these are only ever reached via a dynamic import (a lazy
    // import() for react-syntax-highlighter in CodeViewer, a `new
    // Worker(new URL(...))` for @xenova/transformers in whisperWorker), so
    // Vite's dev-server dependency scanner doesn't see either on startup.
    // Without pre-bundling them up front, the first time one is actually
    // used triggers an on-demand optimize pass that forces a full page
    // reload — wiping the in-memory study state (see StudyContext) and
    // bouncing the participant back to /participant. Listing them here
    // makes sure they're pre-bundled at startup instead.
    include: ['react-syntax-highlighter', '@xenova/transformers'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React — cached separately; rarely changes
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Syntax highlighter is large (~900 kB); split so the landing page
          // and survey pages load without it
          'vendor-highlighter': ['react-syntax-highlighter'],
        },
      },
    },
  },
})

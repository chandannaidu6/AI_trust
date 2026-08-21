import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  optimizeDeps: {
    // react-syntax-highlighter is only reached via a lazy import() in
    // CodeViewer, so Vite's dev-server dependency scanner doesn't see it on
    // startup. Without pre-bundling it up front, the first time a
    // participant opens a question's code panel triggers an on-demand
    // optimize pass that forces a full page reload — wiping the in-memory
    // study state (see StudyContext) and bouncing them back to
    // /participant. Listing it here makes sure it's pre-bundled at startup
    // instead.
    include: ['react-syntax-highlighter'],
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

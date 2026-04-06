import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
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

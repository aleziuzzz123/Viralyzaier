// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js']
        }
      }
    }
  },
  server: { port: 5173, strictPort: true },
  preview: { port: 5174, strictPort: true }
});


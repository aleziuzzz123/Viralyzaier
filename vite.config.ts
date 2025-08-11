import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    // lets you write `@/components/...` (matches your tsconfig)
    alias: { '@': path.resolve(__dirname, '.') }
  },

  server: {
    host: true,
    port: 5173
  },

  preview: {
    port: 4173
  },

  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: false,
    assetsInlineLimit: 0,
    // quiets the “chunks are larger than 500 kB” warning
    chunkSizeWarningLimit: 1600,

    // small, sensible chunking so your initial bundle isn't huge
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          cesdk: ['@cesdk/cesdk-js'], // keep CESDK in its own chunk
        }
      }
    }
  },

  // Vite sometimes tries to prebundle very large libs for dev.
  // Excluding CESDK keeps dev startup snappy and avoids odd WASM prebundling.
  optimizeDeps: {
    exclude: ['@cesdk/cesdk-js']
  },

  // Prevent “process is not defined” in some packages
  define: {
    'process.env': {}
  }
});

});

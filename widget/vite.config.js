import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Builds to a single self-contained IIFE so it can be loaded via
//   <script src="https://cdn.yourapp.com/widget.js" data-widget-id="xxx"></script>
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  build: {
    outDir: '../frontend/public',   // served alongside the main frontend
    lib: {
      entry: 'src/index.js',
      name: 'AIWidget',
      fileName: () => 'widget.js',
      formats: ['iife'],
    },
    rollupOptions: {
      // Bundle everything — the host page has no React
      external: [],
      output: {
        inlineDynamicImports: true,
      },
    },
    minify: 'terser',
    sourcemap: false,
  },
});

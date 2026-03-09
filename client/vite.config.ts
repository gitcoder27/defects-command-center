import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const apiProxyTarget = process.env.VITE_API_PROXY_TARGET?.trim() || 'http://localhost:3001';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'shared/types': path.resolve(__dirname, '../shared/types'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react/jsx-runtime'],
          query: ['@tanstack/react-query', '@tanstack/react-table'],
          motion: ['framer-motion', 'lucide-react'],
          radix: [
            '@radix-ui/react-dialog',
            '@radix-ui/react-popover',
            '@radix-ui/react-select',
            '@radix-ui/react-switch',
            '@radix-ui/react-tooltip',
          ],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': apiProxyTarget,
    },
  },
  // All non-API paths fall back to index.html for client-side routing
  appType: 'spa',
});

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const envDir = path.resolve(__dirname, '..');
  const env = loadEnv(mode, envDir, '');
  const apiPort = env.PORT?.trim() || '3002';
  const apiProxyTarget = env.VITE_API_PROXY_TARGET?.trim() || `http://localhost:${apiPort}`;
  const vitePort = Number(env.VITE_PORT?.trim() || '5173');

  return {
    envDir,
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
      port: vitePort,
      proxy: {
        '/api': apiProxyTarget,
      },
    },
    // All non-API paths fall back to index.html for client-side routing
    appType: 'spa',
  };
});

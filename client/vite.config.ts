import fs from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

function parseEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const parsed: Record<string, string> = {};
  const content = fs.readFileSync(filePath, 'utf8');

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) {
      continue;
    }

    let value = match[2] ?? '';
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    parsed[match[1]] = value;
  }

  return parsed;
}

function loadRepoEnv(mode: string, envDir: string): Record<string, string> {
  const merged: Record<string, string> = {};
  const envFiles = ['.env', '.env.local', `.env.${mode}`, `.env.${mode}.local`];

  for (const fileName of envFiles) {
    Object.assign(merged, parseEnvFile(path.resolve(envDir, fileName)));
  }

  return merged;
}

export default defineConfig(({ mode }) => {
  const envDir = path.resolve(__dirname, '..');
  const repoEnv = loadRepoEnv(mode, envDir);
  const apiPort = repoEnv.PORT?.trim() || process.env.PORT?.trim() || '3002';
  const apiProxyTarget =
    repoEnv.VITE_API_PROXY_TARGET?.trim() ||
    process.env.VITE_API_PROXY_TARGET?.trim() ||
    `http://localhost:${apiPort}`;
  const vitePort = Number(repoEnv.VITE_PORT?.trim() || process.env.VITE_PORT?.trim() || '5173');

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

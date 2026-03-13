import fs from 'node:fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

function parseEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const contents = fs.readFileSync(filePath, 'utf8');
  const values: Record<string, string> = {};

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

function loadRepoEnv(mode: string, envDir: string): Record<string, string> {
  const viteEnv = loadEnv(mode, envDir, '');
  const fileEnv = [
    '.env',
    '.env.local',
    `.env.${mode}`,
    `.env.${mode}.local`,
  ].reduce<Record<string, string>>((acc, fileName) => {
    return {
      ...acc,
      ...parseEnvFile(path.resolve(envDir, fileName)),
    };
  }, {});

  return {
    ...viteEnv,
    ...fileEnv,
  };
}

export default defineConfig(({ mode }) => {
  const envDir = path.resolve(__dirname, '..');
  const env = loadRepoEnv(mode, envDir);
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

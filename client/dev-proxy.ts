const DEFAULT_API_PORT = 3002;
const DEFAULT_VITE_PORT = 5173;
const MAX_PORT = 65_535;

const LOCAL_PROXY_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]']);

export interface ClientDevProxyConfig {
  apiProxyTarget: string;
  vitePort: number;
}

export function resolveClientDevProxyConfig(env: Record<string, string | undefined>): ClientDevProxyConfig {
  const vitePort = parsePort(env.VITE_PORT, DEFAULT_VITE_PORT, 'VITE_PORT');
  const apiPort = parsePort(env.VITE_API_PORT, DEFAULT_API_PORT, 'VITE_API_PORT');
  const apiProxyTarget = readEnv(env.VITE_API_PROXY_TARGET) || `http://127.0.0.1:${apiPort}`;

  return {
    apiProxyTarget,
    vitePort,
  };
}

export function assertSafeDevApiProxyTarget(
  apiProxyTarget: string,
  env: Record<string, string | undefined>,
): void {
  if (readEnv(env.ALLOW_REMOTE_DEV_PROXY) === 'true') {
    return;
  }

  let host: string;
  try {
    host = new URL(apiProxyTarget).hostname;
  } catch {
    throw new Error(
      `Invalid VITE_API_PROXY_TARGET "${apiProxyTarget}". Use a full URL such as http://127.0.0.1:3002.`,
    );
  }

  if (!LOCAL_PROXY_HOSTS.has(host)) {
    throw new Error(
      `Refusing to proxy dev API traffic to "${apiProxyTarget}". Local dev must target localhost unless ALLOW_REMOTE_DEV_PROXY=true is set.`,
    );
  }
}

function parsePort(rawValue: string | undefined, fallback: number, envName: string): number {
  const value = readEnv(rawValue);
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_PORT) {
    throw new Error(`Invalid ${envName} "${value}". Expected an integer between 1 and ${MAX_PORT}.`);
  }

  return parsed;
}

function readEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

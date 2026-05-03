import { assertSafeDevApiProxyTarget, resolveClientDevProxyConfig } from '../../dev-proxy';

describe('resolveClientDevProxyConfig', () => {
  it('defaults the dev API proxy to localhost:3002', () => {
    expect(resolveClientDevProxyConfig({})).toEqual({
      apiProxyTarget: 'http://127.0.0.1:3002',
      vitePort: 5173,
    });
  });

  it('does not derive the client proxy target from PORT', () => {
    expect(resolveClientDevProxyConfig({ PORT: '3001' })).toEqual({
      apiProxyTarget: 'http://127.0.0.1:3002',
      vitePort: 5173,
    });
  });

  it('uses VITE_API_PORT when provided', () => {
    expect(resolveClientDevProxyConfig({ VITE_API_PORT: '3005', VITE_PORT: '5179' })).toEqual({
      apiProxyTarget: 'http://127.0.0.1:3005',
      vitePort: 5179,
    });
  });

  it('prefers VITE_API_PROXY_TARGET over VITE_API_PORT', () => {
    expect(
      resolveClientDevProxyConfig({
        VITE_API_PORT: '3005',
        VITE_API_PROXY_TARGET: 'http://127.0.0.1:3999',
      }),
    ).toEqual({
      apiProxyTarget: 'http://127.0.0.1:3999',
      vitePort: 5173,
    });
  });
});

describe('assertSafeDevApiProxyTarget', () => {
  it('allows localhost targets', () => {
    expect(() => assertSafeDevApiProxyTarget('http://127.0.0.1:3002', {})).not.toThrow();
    expect(() => assertSafeDevApiProxyTarget('http://localhost:3002', {})).not.toThrow();
  });

  it('blocks remote targets by default', () => {
    expect(() => assertSafeDevApiProxyTarget('https://lead.daycommand.online', {})).toThrow(
      /Refusing to proxy dev API traffic/,
    );
  });

  it('allows remote targets with an explicit override', () => {
    expect(() =>
      assertSafeDevApiProxyTarget('https://lead.daycommand.online', {
        ALLOW_REMOTE_DEV_PROXY: 'true',
      }),
    ).not.toThrow();
  });
});

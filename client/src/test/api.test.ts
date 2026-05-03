import { describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api';

describe('api wrapper', () => {
  it('handles 204 success responses without parsing JSON', async () => {
    const json = vi.fn();
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 204,
      headers: new Headers(),
      json,
    })));

    await expect(api.delete('/empty')).resolves.toBeUndefined();
    expect(json).not.toHaveBeenCalled();
  });

  it('handles non-JSON successful responses defensively', async () => {
    const json = vi.fn();
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'text/plain' }),
      json,
    })));

    await expect(api.get('/plain')).resolves.toBeUndefined();
    expect(json).not.toHaveBeenCalled();
  });
});

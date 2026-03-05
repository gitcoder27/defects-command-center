import type { ApiErrorResponse } from '@/types';

const BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText, status: res.status })) as ApiErrorResponse;
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  patch: <T>(url: string, data: unknown) => request<T>(url, { method: 'PATCH', body: JSON.stringify(data) }),
  post: <T>(url: string, data?: unknown) => request<T>(url, { method: 'POST', body: data ? JSON.stringify(data) : undefined }),
  put: <T>(url: string, data: unknown) => request<T>(url, { method: 'PUT', body: JSON.stringify(data) }),
  delete: <T>(url: string) => request<T>(url, { method: 'DELETE' }),
};

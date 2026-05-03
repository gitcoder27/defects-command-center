import type { ApiErrorResponse } from '@/types';

const BASE = '/api';

export class ApiRequestError extends Error {
  status: number;
  body?: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.body = body;
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText, status: res.status })) as ApiErrorResponse;
    throw new ApiRequestError(body.error || `Request failed: ${res.status}`, body.status || res.status, body);
  }

  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(url: string, options?: RequestInit) => request<T>(url, options),
  patch: <T>(url: string, data: unknown) => request<T>(url, { method: 'PATCH', body: JSON.stringify(data) }),
  post: <T>(url: string, data?: unknown) => request<T>(url, { method: 'POST', body: data === undefined ? undefined : JSON.stringify(data) }),
  put: <T>(url: string, data: unknown) => request<T>(url, { method: 'PUT', body: JSON.stringify(data) }),
  delete: <T>(url: string) => request<T>(url, { method: 'DELETE' }),
};

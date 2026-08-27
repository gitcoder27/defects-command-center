import type { TodayResponse } from '@/types';

const CACHE_PREFIX = 'lead-os:today:v1:';
const CACHE_MAX_AGE_MS = 15 * 60_000;

interface StoredTodaySnapshot {
  savedAt: number;
  data: TodayResponse;
}

function cacheKey(authScopeKey: string, date: string): string {
  return `${CACHE_PREFIX}${encodeURIComponent(authScopeKey)}:${date}`;
}

export function readTodaySnapshot(authScopeKey: string, date: string): StoredTodaySnapshot | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const key = cacheKey(authScopeKey, date);
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) {
      return undefined;
    }

    const snapshot = JSON.parse(raw) as StoredTodaySnapshot;
    if (
      !snapshot.data ||
      snapshot.data.date !== date ||
      !Number.isFinite(snapshot.savedAt) ||
      Date.now() - snapshot.savedAt > CACHE_MAX_AGE_MS
    ) {
      window.sessionStorage.removeItem(key);
      return undefined;
    }

    return snapshot;
  } catch {
    window.sessionStorage.removeItem(key);
    return undefined;
  }
}

export function writeTodaySnapshot(
  authScopeKey: string,
  date: string,
  data: TodayResponse,
  savedAt: number,
): void {
  if (typeof window === 'undefined' || authScopeKey === 'anonymous') {
    return;
  }

  try {
    window.sessionStorage.setItem(cacheKey(authScopeKey, date), JSON.stringify({ data, savedAt }));
  } catch {
    // Storage may be disabled or full; the in-memory query cache remains available.
  }
}

export function clearTodaySnapshotsForScope(authScopeKey: string): void {
  if (typeof window === 'undefined' || authScopeKey === 'anonymous') {
    return;
  }

  const scopePrefix = `${CACHE_PREFIX}${encodeURIComponent(authScopeKey)}:`;
  try {
    for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = window.sessionStorage.key(index);
      if (key?.startsWith(scopePrefix)) {
        window.sessionStorage.removeItem(key);
      }
    }
  } catch {
    // Storage cleanup is best-effort; keys are still isolated by auth scope.
  }
}
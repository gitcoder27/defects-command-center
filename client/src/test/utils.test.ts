import { describe, it, expect } from 'vitest';
import { isStale, isOverdue, isDueToday, formatDate } from '@/lib/utils';

describe('isStale', () => {
  it('returns true for issue updated more than 48 hours ago', () => {
    const old = new Date(Date.now() - 50 * 60 * 60 * 1000).toISOString();
    expect(isStale(old)).toBe(true);
  });

  it('returns false for issue updated less than 48 hours ago', () => {
    const recent = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
    expect(isStale(recent)).toBe(false);
  });

  it('respects custom threshold', () => {
    const old = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    expect(isStale(old, 24)).toBe(true);
    expect(isStale(old, 48)).toBe(false);
  });
});

describe('isOverdue', () => {
  it('returns true for past date', () => {
    expect(isOverdue('2020-01-01')).toBe(true);
  });

  it('returns false for undefined', () => {
    expect(isOverdue(undefined)).toBe(false);
  });
});

describe('isDueToday', () => {
  it('returns true for today', () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(isDueToday(today)).toBe(true);
  });

  it('returns false for undefined', () => {
    expect(isDueToday(undefined)).toBe(false);
  });
});

describe('formatDate', () => {
  it('formats date string', () => {
    const result = formatDate('2026-03-05');
    expect(result).toMatch(/Mar/);
    expect(result).toMatch(/5/);
  });

  it('returns dash for undefined', () => {
    expect(formatDate(undefined)).toBe('—');
  });
});

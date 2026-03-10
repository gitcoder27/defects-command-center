import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTrackerIssueAssignments } from '@/hooks/useTeamTracker';
import { TestWrapper } from '@/test/wrapper';

const mockGet = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

describe('useTrackerIssueAssignments', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it('returns an empty list instead of undefined when the API has no assignments', async () => {
    mockGet.mockResolvedValue({ assignments: [] });

    const { result } = renderHook(
      () => useTrackerIssueAssignments('AM-35627', '2026-03-09'),
      { wrapper: TestWrapper }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGet).toHaveBeenCalledWith('/team-tracker/issues/AM-35627/assignment?date=2026-03-09');
    expect(result.current.data).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('normalizes a missing assignments field to an empty list', async () => {
    mockGet.mockResolvedValue({});

    const { result } = renderHook(
      () => useTrackerIssueAssignments('AM-35627', '2026-03-09'),
      { wrapper: TestWrapper }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
  });
});

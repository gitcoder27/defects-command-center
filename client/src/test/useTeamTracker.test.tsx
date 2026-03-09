import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTrackerIssueAssignment } from '@/hooks/useTeamTracker';
import { TestWrapper } from '@/test/wrapper';

const mockGet = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

describe('useTrackerIssueAssignment', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it('returns null instead of undefined when the API has no assignment', async () => {
    mockGet.mockResolvedValue({ assignment: null });

    const { result } = renderHook(
      () => useTrackerIssueAssignment('AM-35627', '2026-03-09'),
      { wrapper: TestWrapper }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGet).toHaveBeenCalledWith('/team-tracker/issues/AM-35627/assignment?date=2026-03-09');
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('normalizes a missing assignment field to null', async () => {
    mockGet.mockResolvedValue({});

    const { result } = renderHook(
      () => useTrackerIssueAssignment('AM-35627', '2026-03-09'),
      { wrapper: TestWrapper }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeNull();
  });
});

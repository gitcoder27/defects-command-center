import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useIssueTagActions } from '@/hooks/useIssueTagActions';

const mockAddToast = vi.fn();
const mockCreateTagMutate = vi.fn();
const mockSetIssueTagsMutate = vi.fn();

vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

vi.mock('@/hooks/useTags', () => ({
  useTags: () => ({
    data: [
      { id: 1, name: 'Backend', color: '#6366f1' },
      { id: 2, name: 'QA', color: '#10b981' },
    ],
  }),
  useCreateTag: () => ({ mutate: mockCreateTagMutate, isPending: false }),
  useSetIssueTags: () => ({ mutate: mockSetIssueTagsMutate, isPending: false }),
}));

describe('useIssueTagActions', () => {
  beforeEach(() => {
    mockAddToast.mockReset();
    mockCreateTagMutate.mockReset();
    mockSetIssueTagsMutate.mockReset();
  });

  it('builds consecutive toggles from the latest requested tag ids', () => {
    const { result } = renderHook(() =>
      useIssueTagActions({
        issueKey: 'PROJ-101',
        localTags: [],
      })
    );

    act(() => {
      result.current.toggleTag(1);
      result.current.toggleTag(2);
    });

    expect(mockSetIssueTagsMutate).toHaveBeenNthCalledWith(
      1,
      { key: 'PROJ-101', tagIds: [1] },
      expect.objectContaining({ onError: expect.any(Function) })
    );
    expect(mockSetIssueTagsMutate).toHaveBeenNthCalledWith(
      2,
      { key: 'PROJ-101', tagIds: [1, 2] },
      expect.objectContaining({ onError: expect.any(Function) })
    );
  });

  it('assigns a newly created tag on top of the latest requested tags', () => {
    mockCreateTagMutate.mockImplementation(
      (
        _variables: { name: string; color: string },
        callbacks?: { onSuccess?: (tag: { id: number; name: string; color: string }) => void }
      ) => {
        callbacks?.onSuccess?.({ id: 3, name: 'Urgent', color: '#ef4444' });
      }
    );

    const { result } = renderHook(() =>
      useIssueTagActions({
        issueKey: 'PROJ-101',
        localTags: [],
      })
    );

    act(() => {
      result.current.toggleTag(1);
      result.current.createOrAssignTag('Urgent');
    });

    expect(mockSetIssueTagsMutate).toHaveBeenNthCalledWith(
      1,
      { key: 'PROJ-101', tagIds: [1] },
      expect.objectContaining({ onError: expect.any(Function) })
    );
    expect(mockSetIssueTagsMutate).toHaveBeenNthCalledWith(
      2,
      { key: 'PROJ-101', tagIds: [1, 3] },
      expect.objectContaining({ onError: expect.any(Function) })
    );
  });
});

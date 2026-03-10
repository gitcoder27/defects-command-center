import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SettingsPage } from '@/components/settings/SettingsPanel';
import { DEVELOPER_LOGIN_URL } from '@/lib/constants';
import { TestWrapper } from '@/test/wrapper';
import type { TagUsageResponse } from '@/types';

const mockGet = vi.fn();
const mockPut = vi.fn();
const mockPost = vi.fn();
const mockDelete = vi.fn();
const mockMutateAsync = vi.fn();
const mockDeleteTagMutate = vi.fn();
const mockRefetchTagUsage = vi.fn(async () => ({ data: undefined }));
const mockRefetch = vi.fn(async () => ({ data: {} }));
const mockAddToast = vi.fn();
const mockConfig = {
  jiraBaseUrl: 'https://acme.atlassian.net',
  jiraProjectKey: 'AM',
  jiraSyncJql: 'project = AM AND issuetype = Bug',
  jiraDevDueDateField: 'customfield_10128',
  jiraAspenSeverityField: 'customfield_10129',
  managerJiraAccountId: 'manager-1',
};
const mockTagUsageById: Record<number, TagUsageResponse> = {
  1: {
    tag: { id: 1, name: 'Legacy', color: '#ef4444' },
    issueCount: 2,
    issues: [
      {
        jiraKey: 'AM-1',
        summary: 'Checkout button fails',
        assigneeName: 'Taylor Dev',
        statusName: 'To Do',
        updatedAt: '2026-03-10T09:00:00Z',
      },
      {
        jiraKey: 'AM-2',
        summary: 'Profile image upload times out',
        assigneeName: 'Jordan Dev',
        statusName: 'In Progress',
        updatedAt: '2026-03-09T09:00:00Z',
      },
    ],
  },
  2: {
    tag: { id: 2, name: 'Unused', color: '#22c55e' },
    issueCount: 0,
    issues: [],
  },
};

vi.mock('@/hooks/useConfig', () => ({
  useConfig: () => ({
    data: mockConfig,
    refetch: mockRefetch,
  }),
}));

vi.mock('@/hooks/useDevelopers', () => ({
  useDevelopers: () => ({
    data: [
      {
        accountId: 'dev-1',
        displayName: 'Taylor Dev',
        email: 'taylor@example.com',
        avatarUrl: '',
        isActive: true,
      },
    ],
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useTriggerSync', () => ({
  useTriggerSync: () => ({ isPending: false, mutateAsync: mockMutateAsync }),
}));

vi.mock('@/hooks/useTagCounts', () => ({
  useTagCounts: () => ({
    data: {
      counts: [
        { tagId: 1, count: 2 },
        { tagId: 2, count: 0 },
      ],
      untaggedCount: 0,
    },
  }),
}));

vi.mock('@/hooks/useTags', () => ({
  useTags: () => ({
    data: [
      { id: 1, name: 'Legacy', color: '#ef4444' },
      { id: 2, name: 'Unused', color: '#22c55e' },
    ],
  }),
  useTagUsage: (tagId?: number) => ({
    data: tagId ? mockTagUsageById[tagId] : undefined,
    isLoading: false,
    refetch: mockRefetchTagUsage,
  }),
  useDeleteTag: () => ({
    mutate: mockDeleteTagMutate,
    isPending: false,
  }),
}));

vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({
    addToast: mockAddToast,
  }),
}));

vi.mock('@/lib/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    put: (...args: unknown[]) => mockPut(...args),
    post: (...args: unknown[]) => mockPost(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRefetch.mockClear();
    mockRefetchTagUsage.mockClear();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    mockGet.mockImplementation(async (path: string) => {
      if (path === '/auth/users') {
        return {
          users: [
            {
              username: 'manager',
              accountId: 'manager-app',
              displayName: 'Morgan Manager',
              role: 'manager',
            },
            {
              username: 'taylor.dev',
              accountId: 'dev-1',
              developerAccountId: 'dev-1',
              displayName: 'Taylor Dev',
              role: 'developer',
            },
          ],
        };
      }

      if (path === '/config/fields') {
        return { fields: [] };
      }

      return {};
    });

    mockPost.mockImplementation(async (path: string) => {
      if (path === '/team/discover') {
        return {
          users: [
            {
              accountId: 'manager-1',
              displayName: 'Morgan Manager',
              email: 'manager@example.com',
            },
            {
              accountId: 'manager-2',
              displayName: 'Casey Lead',
              email: 'casey@example.com',
            },
          ],
          startAt: 0,
          maxResults: 50,
          count: 2,
          hasMore: false,
        };
      }

      return {};
    });

    mockDelete.mockResolvedValue({ ok: true });
    mockDeleteTagMutate.mockImplementation(
      (_variables: { id: number; force?: boolean }, options?: { onSuccess?: (result: { success: true; removedIssueCount: number }) => void }) => {
        options?.onSuccess?.({ success: true, removedIssueCount: 0 });
      }
    );
  });

  it('does not trigger sync when saving settings fails', async () => {
    mockPut.mockRejectedValueOnce(new Error('Invalid query'));

    render(
      <TestWrapper>
        <SettingsPage />
      </TestWrapper>
    );

    fireEvent.click(screen.getByRole('button', { name: /Save & Sync/i }));

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledTimes(1);
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });
  });

  it('keeps the user on the page when sync fails after save succeeds', async () => {
    mockPut.mockResolvedValue({ success: true });
    mockMutateAsync.mockRejectedValueOnce(new Error('Sync unavailable'));

    render(
      <TestWrapper>
        <SettingsPage />
      </TestWrapper>
    );

    fireEvent.click(screen.getByRole('button', { name: /Save & Sync/i }));

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledTimes(1);
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Jira setup, team configuration, tags, and app access.')).toBeInTheDocument();
    });
  });

  it('saves and syncs without navigating away', async () => {
    mockPut.mockResolvedValue({ success: true });
    mockMutateAsync.mockResolvedValue({ status: 'success', issuesSynced: 4, startedAt: '', completedAt: '' });

    render(
      <TestWrapper>
        <SettingsPage />
      </TestWrapper>
    );

    fireEvent.click(screen.getByRole('button', { name: /Save & Sync/i }));

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledTimes(1);
      expect(mockPut).toHaveBeenCalledWith('/config/settings', expect.objectContaining({
        jiraAspenSeverityField: 'customfield_10129',
        managerJiraAccountId: 'manager-1',
      }));
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });
  });

  it('saves an updated manager Jira identity', async () => {
    mockPut.mockResolvedValue({ success: true });

    render(
      <TestWrapper>
        <SettingsPage />
      </TestWrapper>
    );

    fireEvent.change(screen.getByLabelText(/Manager Jira Identity/i), {
      target: { value: 'manager-2' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Save$/i }));

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith('/config/settings', expect.objectContaining({
        managerJiraAccountId: 'manager-2',
      }));
      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });

  it('deletes a developer account after confirmation', async () => {
    render(
      <TestWrapper>
        <SettingsPage />
      </TestWrapper>
    );

    await screen.findByRole('button', { name: /delete account for taylor dev/i });

    fireEvent.click(screen.getByRole('button', { name: /delete account for taylor dev/i }));
    expect(screen.getByText('Delete access?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /confirm delete account for taylor dev/i }));

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith('/auth/users/taylor.dev');
      expect(screen.queryByRole('button', { name: /delete account for taylor dev/i })).not.toBeInTheDocument();
    });
  });

  it('shows and copies the hosted developer login link', async () => {
    render(
      <TestWrapper>
        <SettingsPage />
      </TestWrapper>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Developer Access' }));

    expect(await screen.findByText(DEVELOPER_LOGIN_URL)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Copy$/i }));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(DEVELOPER_LOGIN_URL);
    });
  });

  it('renders the defect tag library in settings', async () => {
    render(
      <TestWrapper>
        <SettingsPage />
      </TestWrapper>
    );

    expect(await screen.findByText('Defect Tags')).toBeInTheDocument();
    expect(screen.getByText('Tag library')).toBeInTheDocument();
    expect(screen.getByText('Legacy')).toBeInTheDocument();
    expect(screen.getByText('Unused')).toBeInTheDocument();
  });

  it('deletes an unused tag after simple confirmation', async () => {
    render(
      <TestWrapper>
        <SettingsPage />
      </TestWrapper>
    );

    fireEvent.click(screen.getByRole('button', { name: /delete tag unused/i }));

    expect(screen.getByText('No defects currently use this tag. Delete it if you no longer want it available in the tag library.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^delete tag$/i }));

    await waitFor(() => {
      expect(mockDeleteTagMutate).toHaveBeenCalledWith(
        { id: 2, force: false },
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        })
      );
    });
  });

  it('shows linked defects before deleting an in-use tag', async () => {
    mockDeleteTagMutate.mockImplementation(
      (_variables: { id: number; force?: boolean }, options?: { onSuccess?: (result: { success: true; removedIssueCount: number }) => void }) => {
        options?.onSuccess?.({ success: true, removedIssueCount: 2 });
      }
    );

    render(
      <TestWrapper>
        <SettingsPage />
      </TestWrapper>
    );

    fireEvent.click(screen.getByRole('button', { name: /delete tag legacy/i }));

    expect(screen.getByText('Linked defects')).toBeInTheDocument();
    expect(screen.getByText('AM-1')).toBeInTheDocument();
    expect(screen.getByText('Checkout button fails')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /delete from 2 defects/i }));

    await waitFor(() => {
      expect(mockDeleteTagMutate).toHaveBeenCalledWith(
        { id: 1, force: true },
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        })
      );
    });
  });
});

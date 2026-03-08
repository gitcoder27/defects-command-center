import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SettingsPage } from '@/components/settings/SettingsPanel';
import { TestWrapper } from '@/test/wrapper';

const mockGet = vi.fn();
const mockPut = vi.fn();
const mockPost = vi.fn();
const mockDelete = vi.fn();
const mockMutateAsync = vi.fn();
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
      expect(screen.getByText('Connection, sync scope, tracked team, and developer access in one place.')).toBeInTheDocument();
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
});

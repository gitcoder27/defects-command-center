import * as React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SetupWizard } from '@/components/setup/SetupWizard';

const mockPost = vi.fn();

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { role: 'manager', username: 'manager', displayName: 'Manager' },
    refreshSession: vi.fn(),
  }),
}));

vi.mock('@/context/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    toggleTheme: vi.fn(),
  }),
}));

vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

vi.mock('@/hooks/useConfig', () => ({
  useConfig: () => ({
    data: {
      jiraBaseUrl: 'https://tenant.atlassian.net',
      jiraEmail: 'ops@example.com',
      jiraProjectKey: 'AM',
      jiraApiToken: '****',
      managerJiraAccountId: '',
    },
    refetch: vi.fn(),
  }),
}));

vi.mock('@/hooks/useTriggerSync', () => ({
  useTriggerSync: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/lib/api', () => ({
  api: {
    post: (...args: unknown[]) => mockPost(...args),
    get: vi.fn(async () => ({ users: [] })),
  },
}));

vi.mock('framer-motion', () => {
  const makeMotion = (tag: keyof JSX.IntrinsicElements) =>
    React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(({ children, ...props }, ref) =>
      React.createElement(tag, { ...props, ref }, children)
    );

  return {
    motion: new Proxy({}, { get: (_target, tag: string) => makeMotion(tag as keyof JSX.IntrinsicElements) }),
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

describe('SetupWizard', () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockPost.mockResolvedValue({ success: true, user: { displayName: 'Jira User' } });
  });

  it('tests Jira connection with the saved token path when the token input is blank', async () => {
    render(<SetupWizard onComplete={vi.fn()} />);

    expect(await screen.findByDisplayValue('https://tenant.atlassian.net')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /test connection/i }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/config/test', {
        jiraBaseUrl: 'https://tenant.atlassian.net',
        jiraEmail: 'ops@example.com',
        jiraProjectKey: 'AM',
      });
    });
  });
});

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Header } from '@/components/layout/Header';

const useThemeMock = vi.fn();
const useAuthMock = vi.fn();
const useSyncStatusMock = vi.fn();
const useTriggerSyncMock = vi.fn();

vi.mock('@/context/ThemeContext', () => ({
  useTheme: () => useThemeMock(),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/hooks/useSyncStatus', () => ({
  useSyncStatus: () => useSyncStatusMock(),
}));

vi.mock('@/hooks/useTriggerSync', () => ({
  useTriggerSync: () => useTriggerSyncMock(),
}));

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useThemeMock.mockReturnValue({
      theme: 'dark',
      toggleTheme: vi.fn(),
    });
    useAuthMock.mockReturnValue({
      user: { role: 'manager' },
    });
    useSyncStatusMock.mockReturnValue({
      data: { status: 'idle', lastSyncedAt: null },
    });
    useTriggerSyncMock.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
  });

  it('shows only dashboard, team tracker, and manager desk in the shared navigation for managers', () => {
    render(<Header activeView="dashboard" onViewChange={vi.fn()} />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Team Tracker')).toBeInTheDocument();
    expect(screen.getByText('Manager Desk')).toBeInTheDocument();
    expect(screen.queryByText('My Day')).not.toBeInTheDocument();
  });
});

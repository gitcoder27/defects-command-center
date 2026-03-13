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

  it('keeps settings out of the main navigation while exposing the top-right gear for managers', () => {
    render(<Header activeView="dashboard" onViewChange={vi.fn()} />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Team Tracker')).toBeInTheDocument();
    expect(screen.getByText('Manager Desk')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open team tracker in new tab/i })).toHaveAttribute('href', '/team-tracker');
    expect(screen.getByRole('link', { name: /open team tracker in new tab/i })).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('link', { name: /open manager desk in new tab/i })).toHaveAttribute('href', '/manager-desk');
    expect(screen.getByRole('link', { name: /open manager desk in new tab/i })).toHaveAttribute('target', '_blank');
    expect(screen.queryByRole('link', { name: /open dashboard in new tab/i })).not.toBeInTheDocument();
    expect(screen.queryByText('My Day')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open settings/i })).toBeInTheDocument();
    expect(screen.queryByText('Settings')).not.toBeInTheDocument();
  });
});

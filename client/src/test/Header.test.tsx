import { render, screen, fireEvent } from '@testing-library/react';
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

vi.mock('@/components/capture/GlobalCaptureDialog', () => ({
  GlobalCaptureDialog: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="global-capture-dialog">
      <button onClick={onClose}>close-capture</button>
    </div>
  ),
}));

vi.mock('@/components/alerts/AlertInbox', () => ({
  AlertInbox: () => <div data-testid="alert-inbox">Alert Inbox</div>,
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
    expect(screen.queryByRole('link', { name: /open dashboard in new tab/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open team tracker in new tab/i })).toHaveAttribute('href', '/team-tracker');
    expect(screen.getByRole('link', { name: /open team tracker in new tab/i })).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('link', { name: /open manager desk in new tab/i })).toHaveAttribute('href', '/manager-desk');
    expect(screen.getByRole('link', { name: /open manager desk in new tab/i })).toHaveAttribute('target', '_blank');
    expect(screen.queryByText('My Day')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open settings/i })).toBeInTheDocument();
    expect(screen.queryByText('Settings')).not.toBeInTheDocument();
  });

  it('shows the dashboard new-tab action only when dashboard is inactive', () => {
    render(<Header activeView="team-tracker" onViewChange={vi.fn()} />);

    expect(screen.getByRole('link', { name: /open dashboard in new tab/i })).toHaveAttribute('href', '/');
    expect(screen.queryByRole('link', { name: /open team tracker in new tab/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open manager desk in new tab/i })).toHaveAttribute('href', '/manager-desk');
  });

  it('shows the alert inbox only on the dashboard when a dashboard alert handler is provided', () => {
    const { rerender } = render(
      <Header activeView="dashboard" onViewChange={vi.fn()} onDashboardAlertClick={vi.fn()} />
    );

    expect(screen.getByTestId('alert-inbox')).toBeInTheDocument();

    rerender(<Header activeView="team-tracker" onViewChange={vi.fn()} onDashboardAlertClick={vi.fn()} />);

    expect(screen.queryByTestId('alert-inbox')).not.toBeInTheDocument();
  });

  it('shows the capture button on all manager views including manager-desk', () => {
    const views = ['dashboard', 'team-tracker', 'manager-desk'] as const;

    for (const view of views) {
      const { unmount } = render(<Header activeView={view} onViewChange={vi.fn()} />);
      expect(screen.getByText('Capture')).toBeInTheDocument();
      unmount();
    }
  });

  it('opens the global capture dialog when clicking capture', () => {
    render(<Header activeView="dashboard" onViewChange={vi.fn()} />);

    expect(screen.queryByTestId('global-capture-dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Capture'));
    expect(screen.getByTestId('global-capture-dialog')).toBeInTheDocument();
  });

  it('hides the capture button for non-manager users', () => {
    useAuthMock.mockReturnValue({ user: { role: 'developer' } });
    render(<Header activeView="dashboard" onViewChange={vi.fn()} />);

    expect(screen.queryByText('Capture')).not.toBeInTheDocument();
  });
});

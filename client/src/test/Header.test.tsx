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
  const resizeObserverDisconnect = vi.fn();
  const resizeObserverObserve = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    resizeObserverDisconnect.mockReset();
    resizeObserverObserve.mockReset();
    document.documentElement.style.removeProperty('--app-header-height');
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: resizeObserverObserve,
      disconnect: resizeObserverDisconnect,
    })) as unknown as typeof ResizeObserver;
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
    render(<Header activeView="today" onViewChange={vi.fn()} />);

    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Work')).toBeInTheDocument();
    expect(screen.getByText('Team')).toBeInTheDocument();
    expect(screen.getByText('Desk')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /open today in new tab/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open work in new tab/i })).toHaveAttribute('href', '/work');
    expect(screen.getByRole('link', { name: /open work in new tab/i })).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('link', { name: /open team in new tab/i })).toHaveAttribute('href', '/team');
    expect(screen.getByRole('link', { name: /open desk in new tab/i })).toHaveAttribute('href', '/desk');

    fireEvent.click(screen.getByRole('button', { name: /more/i }));

    expect(screen.getByText('Follow-ups')).toBeInTheDocument();
    expect(screen.getByText('Meetings')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open follow-ups in new tab/i })).toHaveAttribute('href', '/follow-ups');
    expect(screen.getByRole('link', { name: /open meetings in new tab/i })).toHaveAttribute('href', '/meetings');
    expect(screen.queryByText('My Day')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open settings/i })).toBeInTheDocument();
    expect(screen.queryByText('Settings')).not.toBeInTheDocument();
  });

  it('shows the Today new-tab action only when Today is inactive', () => {
    render(<Header activeView="team" onViewChange={vi.fn()} />);

    expect(screen.getByRole('link', { name: /open today in new tab/i })).toHaveAttribute('href', '/');
    expect(screen.queryByRole('link', { name: /open team in new tab/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open desk in new tab/i })).toHaveAttribute('href', '/desk');

    fireEvent.click(screen.getByRole('button', { name: /more/i }));
    expect(screen.getByRole('link', { name: /open meetings in new tab/i })).toHaveAttribute('href', '/meetings');
  });

  it('opens the secondary workspace menu on hover', () => {
    render(<Header activeView="work" onViewChange={vi.fn()} />);

    fireEvent.mouseEnter(screen.getByRole('button', { name: /more/i }).parentElement as HTMLElement);

    expect(screen.getByText('Follow-ups')).toBeInTheDocument();
    expect(screen.getByText('Meetings')).toBeInTheDocument();
  });

  it('shows the alert inbox only on Work when a dashboard alert handler is provided', () => {
    const { rerender } = render(
      <Header activeView="work" onViewChange={vi.fn()} onDashboardAlertClick={vi.fn()} />
    );

    expect(screen.getByTestId('alert-inbox')).toBeInTheDocument();

    rerender(<Header activeView="team" onViewChange={vi.fn()} onDashboardAlertClick={vi.fn()} />);

    expect(screen.queryByTestId('alert-inbox')).not.toBeInTheDocument();
  });

  it('shows the capture button on all manager views including desk', () => {
    const views = ['today', 'work', 'team', 'desk', 'follow-ups', 'meetings'] as const;

    for (const view of views) {
      const { unmount } = render(<Header activeView={view} onViewChange={vi.fn()} />);
      expect(screen.getByText('Capture')).toBeInTheDocument();
      unmount();
    }
  });

  it('opens the global capture dialog when clicking capture', () => {
    render(<Header activeView="today" onViewChange={vi.fn()} />);

    expect(screen.queryByTestId('global-capture-dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Capture'));
    expect(screen.getByTestId('global-capture-dialog')).toBeInTheDocument();
  });

  it('hides the capture button for non-manager users', () => {
    useAuthMock.mockReturnValue({ user: { role: 'developer' } });
    render(<Header activeView="today" onViewChange={vi.fn()} />);

    expect(screen.queryByText('Capture')).not.toBeInTheDocument();
  });

  it('publishes the measured header height for shell-aligned drawers and clears it on unmount', () => {
    const { unmount } = render(<Header activeView="team" onViewChange={vi.fn()} />);

    expect(document.documentElement.style.getPropertyValue('--app-header-height')).toBe('0px');
    expect(resizeObserverObserve).toHaveBeenCalledTimes(1);

    unmount();

    expect(resizeObserverDisconnect).toHaveBeenCalledTimes(1);
    expect(document.documentElement.style.getPropertyValue('--app-header-height')).toBe('');
  });
});

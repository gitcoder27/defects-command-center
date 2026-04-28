import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '@/App';

const useBootstrapStateMock = vi.fn();
const useConfigMock = vi.fn();
const useAuthMock = vi.fn();
const dashboardLayoutSpy = vi.fn();

vi.mock('@/hooks/useBootstrapState', () => ({
  useBootstrapState: () => useBootstrapStateMock(),
}));

vi.mock('@/hooks/useConfig', () => ({
  useConfig: (...args: unknown[]) => useConfigMock(...args),
}));

vi.mock('@/context/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => useAuthMock(),
}));

vi.mock('@/components/layout/DashboardLayout', () => ({
  DEFAULT_DASHBOARD_FILTER_STATE: {
    activeFilter: 'all',
    activeDeveloper: undefined,
    selectedTagId: undefined,
    noTagsFilter: false,
  },
  DashboardLayout: (props: {
    onViewChange?: (view: 'team') => void;
    filterState?: { activeFilter: string };
    onFilterStateChange?: (state: {
      activeFilter: string;
      activeDeveloper?: string;
      selectedTagId?: number;
      noTagsFilter: boolean;
    }) => void;
  }) => {
    dashboardLayoutSpy(props);

    return (
      <div>
        <div>Work loaded</div>
        <div>Work filter: {props.filterState?.activeFilter ?? 'missing'}</div>
        <button
          onClick={() => props.onFilterStateChange?.({
            activeFilter: 'blocked',
            activeDeveloper: 'dev-1',
            selectedTagId: 2,
            noTagsFilter: false,
          })}
        >
          Apply dashboard filter
        </button>
        <button onClick={() => props.onViewChange?.('team')}>Open Team</button>
      </div>
    );
  },
}));

vi.mock('@/components/layout/Header', () => ({
  Header: ({ onViewChange }: { onViewChange?: (view: 'work') => void }) => (
    <div>
      <div>Shared header</div>
      {onViewChange && <button onClick={() => onViewChange('work')}>Open Work</button>}
    </div>
  ),
}));

vi.mock('@/components/today/TodayPage', () => ({
  TodayPage: ({ onViewChange }: { onViewChange: (view: 'work') => void }) => (
    <div>
      <div>Today loaded</div>
      <button onClick={() => onViewChange('work')}>Open Work from Today</button>
    </div>
  ),
}));

vi.mock('@/components/team-tracker/TeamTrackerPage', () => ({
  TeamTrackerPage: () => <div>Team loaded</div>,
}));

vi.mock('@/components/setup/SetupWizard', () => ({
  SetupWizard: () => <div>Setup wizard</div>,
}));

vi.mock('@/components/my-day/MyDayPage', () => ({
  MyDayPage: () => <div>My day loaded</div>,
}));

vi.mock('@/components/my-day/LoginPage', () => ({
  LoginPage: ({ role }: { role?: 'manager' | 'developer' }) => <div>{role === 'manager' ? 'Manager login' : 'Developer login'}</div>,
}));

vi.mock('@/components/manager-desk', () => ({
  ManagerDeskPage: () => <div>Desk loaded</div>,
}));

vi.mock('@/components/settings/SettingsPanel', () => ({
  SettingsPage: () => <div>Settings loaded</div>,
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState(null, '', '/');

    useBootstrapStateMock.mockReturnValue({
      data: { bootstrapOpen: false, userCount: 1 },
      isLoading: false,
      refetch: vi.fn(),
    });

    useConfigMock.mockReturnValue({
      data: { isConfigured: true, jiraApiToken: '****' },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    useAuthMock.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });
  });

  it('shows loading while bootstrap state is loading', () => {
    useBootstrapStateMock.mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: vi.fn(),
    });

    render(<App />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('renders setup wizard when bootstrap registration is still open', async () => {
    useBootstrapStateMock.mockReturnValue({
      data: { bootstrapOpen: true, userCount: 0 },
      isLoading: false,
      refetch: vi.fn(),
    });

    render(<App />);
    expect(await screen.findByText('Setup wizard')).toBeInTheDocument();
  });

  it('renders manager login on / when bootstrap is closed and the user is unauthenticated', async () => {
    render(<App />);
    expect(await screen.findByText('Manager login')).toBeInTheDocument();
  });

  it('renders developer login on /my-day when bootstrap is closed and the user is unauthenticated', async () => {
    window.history.pushState(null, '', '/my-day');
    render(<App />);
    expect(await screen.findByText('Developer login')).toBeInTheDocument();
  });

  it('redirects authenticated developers from / to /my-day', async () => {
    useAuthMock.mockReturnValue({
      user: { role: 'developer', developerAccountId: 'dev-1' },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    render(<App />);

    await waitFor(() => {
      expect(window.location.pathname).toBe('/my-day');
    });
  });

  it('redirects authenticated managers from /my-day to /', async () => {
    window.history.pushState(null, '', '/my-day');
    useAuthMock.mockReturnValue({
      user: { role: 'manager' },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    render(<App />);

    expect(await screen.findByText('Today loaded')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/');
  });

  it('renders setup wizard for an authenticated manager when Jira connection is not configured', async () => {
    useAuthMock.mockReturnValue({
      user: { role: 'manager' },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });
    useConfigMock.mockReturnValue({
      data: { isConfigured: false, jiraApiToken: '' },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<App />);
    expect(await screen.findByText('Setup wizard')).toBeInTheDocument();
  });

  it('renders the dedicated settings page for authenticated managers on /settings', async () => {
    window.history.pushState(null, '', '/settings');
    useAuthMock.mockReturnValue({
      user: { role: 'manager' },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    render(<App />);

    expect(await screen.findByText('Shared header')).toBeInTheDocument();
    expect(screen.getByText('Settings loaded')).toBeInTheDocument();
  });

  it('renders the Work page for authenticated managers on /work', async () => {
    window.history.pushState(null, '', '/work');
    useAuthMock.mockReturnValue({
      user: { role: 'manager' },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    render(<App />);

    expect(await screen.findByText('Work loaded')).toBeInTheDocument();
  });

  it('keeps legacy team and desk URLs working for authenticated managers', async () => {
    useAuthMock.mockReturnValue({
      user: { role: 'manager' },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    window.history.pushState(null, '', '/team-tracker');
    const { unmount } = render(<App />);
    expect(await screen.findByText('Team loaded')).toBeInTheDocument();
    unmount();

    window.history.pushState(null, '', '/manager-desk');
    render(<App />);
    expect(await screen.findByText('Desk loaded')).toBeInTheDocument();
  });

  it('preserves work filters when switching away and back without refreshing', async () => {
    window.history.pushState(null, '', '/work');
    useAuthMock.mockReturnValue({
      user: { role: 'manager' },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    render(<App />);

    expect(await screen.findByText('Work filter: all')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Apply dashboard filter'));
    expect(screen.getByText('Work filter: blocked')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Open Team'));
    await waitFor(() => {
      expect(window.location.pathname).toBe('/team');
    });

    fireEvent.click(screen.getByText('Open Work'));
    expect(await screen.findByText('Work filter: blocked')).toBeInTheDocument();
  });
});

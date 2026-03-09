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
    onViewChange?: (view: 'team-tracker') => void;
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
        <div>Dashboard loaded</div>
        <div>Dashboard filter: {props.filterState?.activeFilter ?? 'missing'}</div>
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
        <button onClick={() => props.onViewChange?.('team-tracker')}>Open Team Tracker</button>
      </div>
    );
  },
}));

vi.mock('@/components/layout/Header', () => ({
  Header: ({ onViewChange }: { onViewChange?: (view: 'dashboard') => void }) => (
    <div>
      <div>Shared header</div>
      {onViewChange && <button onClick={() => onViewChange('dashboard')}>Open Dashboard</button>}
    </div>
  ),
}));

vi.mock('@/components/team-tracker/TeamTrackerPage', () => ({
  TeamTrackerPage: () => <div>Team tracker loaded</div>,
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
  ManagerDeskPage: () => <div>Manager desk loaded</div>,
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

    expect(await screen.findByText('Dashboard loaded')).toBeInTheDocument();
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

  it('preserves dashboard filters when switching away and back without refreshing', async () => {
    useAuthMock.mockReturnValue({
      user: { role: 'manager' },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    render(<App />);

    expect(await screen.findByText('Dashboard filter: all')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Apply dashboard filter'));
    expect(screen.getByText('Dashboard filter: blocked')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Open Team Tracker'));
    await waitFor(() => {
      expect(window.location.pathname).toBe('/team-tracker');
    });

    fireEvent.click(screen.getByText('Open Dashboard'));
    expect(await screen.findByText('Dashboard filter: blocked')).toBeInTheDocument();
  });
});

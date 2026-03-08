import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '@/App';

const useConfigMock = vi.fn();
const useAuthMock = vi.fn();

vi.mock('@/hooks/useConfig', () => ({
  useConfig: () => useConfigMock(),
}));

vi.mock('@/context/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => useAuthMock(),
}));

vi.mock('@/components/layout/DashboardLayout', () => ({
  DashboardLayout: () => <div>Dashboard loaded</div>,
}));

vi.mock('@/components/layout/Header', () => ({
  Header: () => <div>Shared header</div>,
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
  LoginPage: () => <div>Login page</div>,
}));

vi.mock('@/components/my-day/ManagerMyDayLanding', () => ({
  ManagerMyDayLanding: () => <div>Manager my day redirect</div>,
}));

vi.mock('@/components/manager-desk', () => ({
  ManagerDeskPage: () => <div>Manager desk loaded</div>,
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState(null, '', '/');
    useAuthMock.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
    });
  });

  it('shows loading while checking configuration state', () => {
    useConfigMock.mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: vi.fn(),
    });

    render(<App />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('renders setup wizard when config is not yet configured', async () => {
    useConfigMock.mockReturnValue({
      data: { isConfigured: false },
      isLoading: false,
      refetch: vi.fn(),
    });

    render(<App />);
    expect(await screen.findByText('Setup wizard')).toBeInTheDocument();
  });

  it('renders dashboard layout once setup is complete', () => {
    useConfigMock.mockReturnValue({
      data: { isConfigured: true },
      isLoading: false,
      refetch: vi.fn(),
    });

    render(<App />);
    expect(screen.getByText('Dashboard loaded')).toBeInTheDocument();
  });

  it('renders manager desk inside the shared shell for manager users', async () => {
    window.history.pushState(null, '', '/manager-desk');
    useConfigMock.mockReturnValue({
      data: { isConfigured: true },
      isLoading: false,
      refetch: vi.fn(),
    });
    useAuthMock.mockReturnValue({
      user: { role: 'manager' },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(<App />);

    expect(screen.getByText('Shared header')).toBeInTheDocument();
    expect(await screen.findByText('Manager desk loaded')).toBeInTheDocument();
  });

  it('shows the manager my day redirect screen outside the shared shell', async () => {
    window.history.pushState(null, '', '/my-day');
    useConfigMock.mockReturnValue({
      data: { isConfigured: true },
      isLoading: false,
      refetch: vi.fn(),
    });
    useAuthMock.mockReturnValue({
      user: { role: 'manager' },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(<App />);

    expect(await screen.findByText('Manager my day redirect')).toBeInTheDocument();
    expect(screen.queryByText('Shared header')).not.toBeInTheDocument();
  });
});

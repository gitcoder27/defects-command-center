import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '@/App';

const useConfigMock = vi.fn();

vi.mock('@/hooks/useConfig', () => ({
  useConfig: () => useConfigMock(),
}));

vi.mock('@/components/layout/DashboardLayout', () => ({
  DashboardLayout: () => <div>Dashboard loaded</div>,
}));

vi.mock('@/components/setup/SetupWizard', () => ({
  SetupWizard: () => <div>Setup wizard</div>,
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('renders setup wizard when config is not yet configured', () => {
    useConfigMock.mockReturnValue({
      data: { isConfigured: false },
      isLoading: false,
      refetch: vi.fn(),
    });

    render(<App />);
    expect(screen.getByText('Setup wizard')).toBeInTheDocument();
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
});

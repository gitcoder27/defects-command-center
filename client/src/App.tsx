import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense, useCallback, useEffect, useState, type ReactNode } from 'react';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { useBootstrapState } from '@/hooks/useBootstrapState';
import { useConfig } from '@/hooks/useConfig';
import {
  DashboardLayout,
  DEFAULT_DASHBOARD_FILTER_STATE,
  type DashboardFilterState,
} from '@/components/layout/DashboardLayout';
import { Header } from '@/components/layout/Header';

export type AppView = 'dashboard' | 'team-tracker' | 'my-day' | 'manager-desk' | 'settings';

const loadTeamTrackerPage = () => import('@/components/team-tracker/TeamTrackerPage');
const loadSetupWizard = () => import('@/components/setup/SetupWizard');
const loadMyDayPage = () => import('@/components/my-day/MyDayPage');
const loadLoginPage = () => import('@/components/my-day/LoginPage');
const loadManagerDeskPage = () => import('@/components/manager-desk');
const loadSettingsPage = () => import('@/components/settings/SettingsPanel');

const TeamTrackerPage = lazy(async () => {
  const module = await loadTeamTrackerPage();
  return { default: module.TeamTrackerPage };
});

const SetupWizard = lazy(async () => {
  const module = await loadSetupWizard();
  return { default: module.SetupWizard };
});

const MyDayPage = lazy(async () => {
  const module = await loadMyDayPage();
  return { default: module.MyDayPage };
});

const LoginPage = lazy(async () => {
  const module = await loadLoginPage();
  return { default: module.LoginPage };
});

const ManagerDeskPage = lazy(async () => {
  const module = await loadManagerDeskPage();
  return { default: module.ManagerDeskPage };
});

const SettingsPage = lazy(async () => {
  const module = await loadSettingsPage();
  return { default: module.SettingsPage };
});

function pathToView(pathname: string): AppView {
  if (pathname === '/my-day' || pathname === '/my-day/') return 'my-day';
  if (pathname === '/team-tracker' || pathname === '/team-tracker/') return 'team-tracker';
  if (pathname === '/manager-desk' || pathname === '/manager-desk/') return 'manager-desk';
  if (pathname === '/settings' || pathname === '/settings/') return 'settings';
  return 'dashboard';
}

function viewToPath(view: AppView): string {
  if (view === 'my-day') return '/my-day';
  if (view === 'team-tracker') return '/team-tracker';
  if (view === 'manager-desk') return '/manager-desk';
  if (view === 'settings') return '/settings';
  return '/';
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 10_000,
    },
  },
});

function preloadView(view: AppView) {
  switch (view) {
    case 'team-tracker':
      void loadTeamTrackerPage();
      break;
    case 'my-day':
      void loadMyDayPage();
      break;
    case 'manager-desk':
      void loadManagerDeskPage();
      break;
    case 'settings':
      void loadSettingsPage();
      break;
    default:
      break;
  }
}

function navigateToView(view: AppView, replace = false) {
  const target = viewToPath(view);
  if (window.location.pathname === target) {
    return;
  }

  if (replace) {
    window.history.replaceState(null, '', target);
  } else {
    window.history.pushState(null, '', target);
  }
}

function FullPageLoading() {
  return (
    <div className="h-full flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
        />
        <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>Loading…</span>
      </div>
    </div>
  );
}

function PanelLoading() {
  return (
    <div className="h-full flex items-center justify-center" style={{ background: 'transparent' }}>
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
        />
        <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>Loading…</span>
      </div>
    </div>
  );
}

function ConfigErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="h-full flex items-center justify-center px-4" style={{ background: 'var(--bg-canvas)' }}>
      <div
        className="w-full max-w-xl rounded-[28px] border px-6 py-8 text-center"
        style={{
          borderColor: 'var(--border-strong)',
          background: 'color-mix(in srgb, var(--bg-primary) 94%, transparent)',
        }}
      >
        <h1 className="text-[26px] font-semibold" style={{ color: 'var(--text-primary)' }}>
          Manager setup is currently unavailable
        </h1>
        <p className="mt-3 text-[14px] leading-7" style={{ color: 'var(--text-secondary)' }}>
          The manager surface could not load its Jira configuration. Retry the request or sign out and re-enter the
          workspace.
        </p>
        <button
          onClick={onRetry}
          className="mt-6 rounded-[18px] px-4 py-3 text-[14px] font-semibold"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          Retry
        </button>
      </div>
    </div>
  );
}

interface WorkspaceShellProps {
  activeView: AppView;
  onViewChange: (view: AppView) => void;
  children: ReactNode;
}

function WorkspaceShell({ activeView, onViewChange, children }: WorkspaceShellProps) {
  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: 'transparent' }}>
      <Header activeView={activeView} onViewChange={onViewChange} />
      <div className="flex-1 min-h-0 px-1 pb-0.5 md:px-1.5 md:pb-1">
        <div
          className="h-full min-h-0 rounded-[16px] border overflow-hidden flex flex-col"
          style={{
            borderColor: 'var(--border-strong)',
            background: 'color-mix(in srgb, var(--bg-primary) 84%, transparent)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const bootstrapQuery = useBootstrapState();
  const bootstrapState = bootstrapQuery.data;

  const [activeView, setActiveView] = useState<AppView>(() => pathToView(window.location.pathname));
  const [dashboardFilterState, setDashboardFilterState] = useState<DashboardFilterState>(DEFAULT_DASHBOARD_FILTER_STATE);

  const shouldLoadManagerConfig = Boolean(
    bootstrapState &&
    !bootstrapState.bootstrapOpen &&
    isAuthenticated &&
    user?.role === 'manager'
  );
  const configQuery = useConfig({ enabled: shouldLoadManagerConfig });

  const handleViewChange = useCallback((view: AppView) => {
    preloadView(view);
    setActiveView(view);
    navigateToView(view);
  }, []);

  const replaceView = useCallback((view: AppView) => {
    preloadView(view);
    setActiveView(view);
    navigateToView(view, true);
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setActiveView(pathToView(window.location.pathname));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (authLoading || bootstrapQuery.isLoading || !bootstrapState) {
      return;
    }

    if (bootstrapState.bootstrapOpen) {
      if (activeView !== 'dashboard') {
        replaceView('dashboard');
      }
      return;
    }

    if (activeView === 'my-day') {
      if (isAuthenticated && user?.role === 'manager') {
        replaceView('dashboard');
      }
      return;
    }

    if (isAuthenticated && user?.role === 'developer') {
      replaceView('my-day');
    }
  }, [
    activeView,
    authLoading,
    bootstrapQuery.isLoading,
    bootstrapState,
    isAuthenticated,
    replaceView,
    user,
  ]);

  if (authLoading || bootstrapQuery.isLoading || !bootstrapState) {
    return <FullPageLoading />;
  }

  if (bootstrapState.bootstrapOpen) {
    return (
      <Suspense fallback={<FullPageLoading />}>
        <SetupWizard
          onComplete={async () => {
            await bootstrapQuery.refetch();
            await configQuery.refetch();
          }}
        />
      </Suspense>
    );
  }

  if (activeView === 'my-day') {
    if (!isAuthenticated) {
      return (
        <Suspense fallback={<FullPageLoading />}>
          <LoginPage role="developer" />
        </Suspense>
      );
    }

    if (user?.role !== 'developer') {
      return <FullPageLoading />;
    }

    return (
      <Suspense fallback={<FullPageLoading />}>
        <MyDayPage />
      </Suspense>
    );
  }

  if (!isAuthenticated) {
    return (
      <Suspense fallback={<FullPageLoading />}>
        <LoginPage role="manager" />
      </Suspense>
    );
  }

  if (user?.role !== 'manager') {
    return <FullPageLoading />;
  }

  if (configQuery.isError) {
    return <ConfigErrorState onRetry={() => void configQuery.refetch()} />;
  }

  if (configQuery.isLoading || !configQuery.data) {
    return <FullPageLoading />;
  }

  if (!configQuery.data.isConfigured) {
    return (
      <Suspense fallback={<FullPageLoading />}>
        <SetupWizard
          onComplete={async () => {
            await bootstrapQuery.refetch();
            await configQuery.refetch();
          }}
        />
      </Suspense>
    );
  }

  if (activeView === 'manager-desk') {
    return (
      <WorkspaceShell activeView={activeView} onViewChange={handleViewChange}>
        <Suspense fallback={<PanelLoading />}>
          <ManagerDeskPage />
        </Suspense>
      </WorkspaceShell>
    );
  }

  if (activeView === 'team-tracker') {
    return (
      <WorkspaceShell activeView={activeView} onViewChange={handleViewChange}>
        <Suspense fallback={<PanelLoading />}>
          <TeamTrackerPage onViewChange={handleViewChange} />
        </Suspense>
      </WorkspaceShell>
    );
  }

  if (activeView === 'settings') {
    return (
      <WorkspaceShell activeView={activeView} onViewChange={handleViewChange}>
        <Suspense fallback={<PanelLoading />}>
          <SettingsPage />
        </Suspense>
      </WorkspaceShell>
    );
  }

  return (
    <DashboardLayout
      activeView={activeView}
      onViewChange={handleViewChange}
      filterState={dashboardFilterState}
      onFilterStateChange={setDashboardFilterState}
    />
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense, useState, useEffect, useCallback, type ReactNode } from 'react';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { useConfig } from '@/hooks/useConfig';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Header } from '@/components/layout/Header';

export type AppView = 'dashboard' | 'team-tracker' | 'my-day' | 'manager-desk';

const loadTeamTrackerPage = () => import('@/components/team-tracker/TeamTrackerPage');
const loadSetupWizard = () => import('@/components/setup/SetupWizard');
const loadMyDayPage = () => import('@/components/my-day/MyDayPage');
const loadLoginPage = () => import('@/components/my-day/LoginPage');
const loadManagerMyDayLanding = () => import('@/components/my-day/ManagerMyDayLanding');
const loadManagerDeskPage = () => import('@/components/manager-desk');

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

const ManagerMyDayLanding = lazy(async () => {
  const module = await loadManagerMyDayLanding();
  return { default: module.ManagerMyDayLanding };
});

const ManagerDeskPage = lazy(async () => {
  const module = await loadManagerDeskPage();
  return { default: module.ManagerDeskPage };
});

function pathToView(pathname: string): AppView | null {
  if (pathname === '/my-day' || pathname === '/my-day/') return 'my-day';
  if (pathname === '/team-tracker' || pathname === '/team-tracker/') return 'team-tracker';
  if (pathname === '/manager-desk' || pathname === '/manager-desk/') return 'manager-desk';
  return null;
}

function viewToPath(view: AppView): string {
  if (view === 'my-day') return '/my-day';
  if (view === 'team-tracker') return '/team-tracker';
  if (view === 'manager-desk') return '/manager-desk';
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
      void loadManagerMyDayLanding();
      break;
    case 'manager-desk':
      void loadManagerDeskPage();
      break;
    default:
      break;
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

interface WorkspaceShellProps {
  activeView: AppView;
  onViewChange: (view: AppView) => void;
  children: ReactNode;
}

function WorkspaceShell({ activeView, onViewChange, children }: WorkspaceShellProps) {
  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: 'transparent' }}>
      <Header activeView={activeView} onViewChange={onViewChange} />
      <div className="flex-1 min-h-0 px-1.5 pb-1 md:px-2 md:pb-1.5">
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
  const { data: config, isLoading, refetch } = useConfig();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  // Derive initial view from URL path
  const [activeView, setActiveView] = useState<AppView>(() => {
    return pathToView(window.location.pathname) ?? 'dashboard';
  });

  // Sync browser URL when view changes
  const handleViewChange = useCallback((view: AppView) => {
    preloadView(view);
    setActiveView(view);
    const target = viewToPath(view);
    if (window.location.pathname !== target) {
      window.history.pushState(null, '', target);
    }
  }, []);

  // Handle browser back/forward
  useEffect(() => {
    const onPopState = () => {
      const view = pathToView(window.location.pathname) ?? 'dashboard';
      setActiveView(view);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  if (isLoading || authLoading) {
    return <FullPageLoading />;
  }

  // Manager Desk — manager-only route
  if (activeView === 'manager-desk') {
    if (!isAuthenticated) {
      return (
        <Suspense fallback={<FullPageLoading />}>
          <LoginPage />
        </Suspense>
      );
    }
    if (user?.role !== 'manager') {
      handleViewChange('my-day');
      return null;
    }
    return (
      <WorkspaceShell activeView={activeView} onViewChange={handleViewChange}>
        <Suspense fallback={<PanelLoading />}>
          <ManagerDeskPage />
        </Suspense>
      </WorkspaceShell>
    );
  }

  // If the URL is /my-day, always show the my-day experience
  if (activeView === 'my-day') {
    if (!isAuthenticated) {
      return (
        <Suspense fallback={<FullPageLoading />}>
          <LoginPage />
        </Suspense>
      );
    }
    // Managers see a landing page since My Day API requires developer role
    if (user?.role === 'manager') {
      return (
        <Suspense fallback={<FullPageLoading />}>
          <ManagerMyDayLanding onGoToDashboard={() => handleViewChange('dashboard')} />
        </Suspense>
      );
    }
    return (
      <Suspense fallback={<FullPageLoading />}>
        <MyDayPage />
      </Suspense>
    );
  }

  // Developers always get redirected to /my-day
  if (isAuthenticated && user?.role === 'developer') {
    handleViewChange('my-day');
    return null;
  }

  if (config && !config.isConfigured) {
    return (
      <Suspense fallback={<FullPageLoading />}>
        <SetupWizard onComplete={() => refetch()} />
      </Suspense>
    );
  }

  if (activeView === 'team-tracker') {
    return (
      <WorkspaceShell activeView={activeView} onViewChange={handleViewChange}>
        <Suspense fallback={<PanelLoading />}>
          <TeamTrackerPage />
        </Suspense>
      </WorkspaceShell>
    );
  }

  return <DashboardLayout activeView={activeView} onViewChange={handleViewChange} />;
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

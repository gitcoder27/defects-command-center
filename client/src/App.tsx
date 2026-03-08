import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect, useCallback } from 'react';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { useConfig } from '@/hooks/useConfig';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { TeamTrackerPage } from '@/components/team-tracker/TeamTrackerPage';
import { SetupWizard } from '@/components/setup/SetupWizard';
import { Header } from '@/components/layout/Header';
import { MyDayPage } from '@/components/my-day/MyDayPage';
import { LoginPage } from '@/components/my-day/LoginPage';
import { ManagerMyDayLanding } from '@/components/my-day/ManagerMyDayLanding';

export type AppView = 'dashboard' | 'team-tracker' | 'my-day';

function pathToView(pathname: string): AppView | null {
  if (pathname === '/my-day' || pathname === '/my-day/') return 'my-day';
  if (pathname === '/team-tracker' || pathname === '/team-tracker/') return 'team-tracker';
  return null;
}

function viewToPath(view: AppView): string {
  if (view === 'my-day') return '/my-day';
  if (view === 'team-tracker') return '/team-tracker';
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

function AppContent() {
  const { data: config, isLoading, refetch } = useConfig();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  // Derive initial view from URL path
  const [activeView, setActiveView] = useState<AppView>(() => {
    return pathToView(window.location.pathname) ?? 'dashboard';
  });

  // Sync browser URL when view changes
  const handleViewChange = useCallback((view: AppView) => {
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
    return (
      <div className="h-full flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
          <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>Loading…</span>
        </div>
      </div>
    );
  }

  // If the URL is /my-day, always show the my-day experience
  if (activeView === 'my-day') {
    if (!isAuthenticated) return <LoginPage />;
    // Managers see a landing page since My Day API requires developer role
    if (user?.role === 'manager') {
      return <ManagerMyDayLanding onGoToDashboard={() => handleViewChange('dashboard')} />;
    }
    return <MyDayPage />;
  }

  // Developers always get redirected to /my-day
  if (isAuthenticated && user?.role === 'developer') {
    handleViewChange('my-day');
    return null;
  }

  if (config && !config.isConfigured) {
    return <SetupWizard onComplete={() => refetch()} />;
  }

  if (activeView === 'team-tracker') {
    return (
      <div className="h-full flex flex-col overflow-hidden" style={{ background: 'transparent' }}>
        <Header activeView={activeView} onViewChange={handleViewChange} />
        <div className="flex-1 min-h-0 px-1.5 pb-1 md:px-2 md:pb-1.5">
          <div
            className="h-full min-h-0 rounded-[16px] border overflow-hidden flex flex-col"
            style={{
              borderColor: 'var(--border-strong)',
              background: 'color-mix(in srgb, var(--bg-primary) 84%, transparent)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
            }}
          >
            <TeamTrackerPage />
          </div>
        </div>
      </div>
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

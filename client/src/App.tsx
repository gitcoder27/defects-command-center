import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense, useCallback, useEffect, useState, type ReactNode } from 'react';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { useBootstrapState } from '@/hooks/useBootstrapState';
import { useConfig } from '@/hooks/useConfig';
import { useSyncRefreshCoordinator } from '@/hooks/useSyncRefreshCoordinator';
import { TodayPage } from '@/components/today/TodayPage';
import {
  DashboardLayout,
  DEFAULT_DASHBOARD_FILTER_STATE,
  type DashboardFilterState,
} from '@/components/layout/DashboardLayout';
import { Header } from '@/components/layout/Header';
import type { TodayActionTarget } from '@/types';

export type CanonicalAppView = 'today' | 'work' | 'team' | 'desk' | 'follow-ups' | 'meetings' | 'my-day' | 'settings';
export type LegacyAppView = 'dashboard' | 'team-tracker' | 'manager-desk';
export type AppView = CanonicalAppView | LegacyAppView;

const loadTeamTrackerPage = () => import('@/components/team-tracker/TeamTrackerPage');
const loadSetupWizard = () => import('@/components/setup/SetupWizard');
const loadMyDayPage = () => import('@/components/my-day/MyDayPage');
const loadLoginPage = () => import('@/components/my-day/LoginPage');
const loadManagerDeskPage = () => import('@/components/manager-desk');
const loadManagerMemoryPage = () => import('@/components/manager-memory');
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

const ManagerMemoryPage = lazy(async () => {
  const module = await loadManagerMemoryPage();
  return { default: module.ManagerMemoryPage };
});

const SettingsPage = lazy(async () => {
  const module = await loadSettingsPage();
  return { default: module.SettingsPage };
});

function canonicalizeView(view: AppView): CanonicalAppView {
  if (view === 'dashboard') return 'work';
  if (view === 'team-tracker') return 'team';
  if (view === 'manager-desk') return 'desk';
  return view;
}

function pathToView(pathname: string): CanonicalAppView {
  if (pathname === '/my-day' || pathname === '/my-day/') return 'my-day';
  if (pathname === '/team' || pathname === '/team/' || pathname === '/team-tracker' || pathname === '/team-tracker/') return 'team';
  if (pathname === '/desk' || pathname === '/desk/' || pathname === '/manager-desk' || pathname === '/manager-desk/') return 'desk';
  if (pathname === '/follow-ups' || pathname === '/follow-ups/' || pathname === '/followups' || pathname === '/followups/') return 'follow-ups';
  if (pathname === '/meetings' || pathname === '/meetings/' || pathname === '/meeting' || pathname === '/meeting/') return 'meetings';
  if (pathname === '/work' || pathname === '/work/' || pathname === '/dashboard' || pathname === '/dashboard/') return 'work';
  if (pathname === '/today' || pathname === '/today/' || pathname === '/' || pathname === '') return 'today';
  if (pathname === '/settings' || pathname === '/settings/') return 'settings';
  return 'today';
}

function viewToPath(view: AppView): string {
  const canonicalView = canonicalizeView(view);

  if (canonicalView === 'my-day') return '/my-day';
  if (canonicalView === 'team') return '/team';
  if (canonicalView === 'desk') return '/desk';
  if (canonicalView === 'follow-ups') return '/follow-ups';
  if (canonicalView === 'meetings') return '/meetings';
  if (canonicalView === 'work') return '/work';
  if (canonicalView === 'settings') return '/settings';
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
  switch (canonicalizeView(view)) {
    case 'team':
      void loadTeamTrackerPage();
      break;
    case 'my-day':
      void loadMyDayPage();
      break;
    case 'desk':
      void loadManagerDeskPage();
      break;
    case 'follow-ups':
    case 'meetings':
      void loadManagerMemoryPage();
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

function replaceLegacyPathIfNeeded() {
  const currentView = pathToView(window.location.pathname);
  const canonicalPath = viewToPath(currentView);
  if (window.location.pathname !== canonicalPath) {
    window.history.replaceState(null, '', canonicalPath);
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
          The manager surface could not load its workspace settings. Retry the request or sign out and re-enter the
          command center.
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
  const shouldCoordinateSyncRefresh = isAuthenticated && user?.role === 'manager';

  useSyncRefreshCoordinator({ enabled: shouldCoordinateSyncRefresh });

  const [activeView, setActiveView] = useState<CanonicalAppView>(() => pathToView(window.location.pathname));
  const [dashboardFilterState, setDashboardFilterState] = useState<DashboardFilterState>(DEFAULT_DASHBOARD_FILTER_STATE);
  const [todayWorkTarget, setTodayWorkTarget] = useState<{ issueKey?: string; nonce: number }>({ nonce: 0 });
  const [todayTeamTarget, setTodayTeamTarget] = useState<{ developerAccountId?: string; nonce: number }>({ nonce: 0 });
  const [todayDeskTarget, setTodayDeskTarget] = useState<{ itemId?: number; date?: string; nonce: number }>({ nonce: 0 });

  const shouldLoadManagerConfig = Boolean(
    bootstrapState &&
    !bootstrapState.bootstrapOpen &&
    isAuthenticated &&
    user?.role === 'manager'
  );
  const configQuery = useConfig({ enabled: shouldLoadManagerConfig });

  const clearTodayTargets = useCallback(() => {
    setTodayWorkTarget((prev) => ({ nonce: prev.nonce + 1 }));
    setTodayTeamTarget((prev) => ({ nonce: prev.nonce + 1 }));
    setTodayDeskTarget((prev) => ({ nonce: prev.nonce + 1 }));
  }, []);

  const handleViewChange = useCallback((view: AppView) => {
    const nextView = canonicalizeView(view);
    clearTodayTargets();
    preloadView(nextView);
    setActiveView(nextView);
    navigateToView(nextView);
  }, [clearTodayTargets]);

  const handleTodayWorkFilter = useCallback((filter: DashboardFilterState['activeFilter']) => {
    clearTodayTargets();
    setDashboardFilterState((prev) => ({
      ...prev,
      activeFilter: filter,
      activeDeveloper: undefined,
      selectedTagId: undefined,
      noTagsFilter: false,
    }));
    preloadView('work');
    setActiveView('work');
    navigateToView('work');
  }, [clearTodayTargets]);

  const handleOpenTodayTarget = useCallback((target: TodayActionTarget) => {
    if (target.view === 'work') {
      setDashboardFilterState((prev) => ({
        ...prev,
        activeFilter: target.filter ?? prev.activeFilter,
        activeDeveloper: undefined,
        selectedTagId: undefined,
        noTagsFilter: false,
      }));
      setTodayWorkTarget((prev) => ({ issueKey: target.issueKey, nonce: prev.nonce + 1 }));
      preloadView('work');
      setActiveView('work');
      navigateToView('work');
      return;
    }

    if (target.view === 'team') {
      setTodayTeamTarget((prev) => ({ developerAccountId: target.developerAccountId, nonce: prev.nonce + 1 }));
      preloadView('team');
      setActiveView('team');
      navigateToView('team');
      return;
    }

    if (target.managerDeskItemId) {
      setTodayDeskTarget((prev) => ({
        itemId: target.managerDeskItemId,
        date: target.date,
        nonce: prev.nonce + 1,
      }));
      preloadView('desk');
      setActiveView('desk');
      navigateToView('desk');
      return;
    }

    if (target.view === 'desk' || target.view === 'follow-ups' || target.view === 'meetings') {
      preloadView(target.view === 'desk' ? 'desk' : target.view);
      setActiveView(target.view);
      navigateToView(target.view);
      return;
    }

    setActiveView(target.view);
    navigateToView(target.view);
  }, []);

  const replaceView = useCallback((view: AppView) => {
    const nextView = canonicalizeView(view);
    preloadView(nextView);
    setActiveView(nextView);
    navigateToView(nextView, true);
  }, []);

  useEffect(() => {
    replaceLegacyPathIfNeeded();

    const onPopState = () => {
      const nextView = pathToView(window.location.pathname);
      setActiveView(nextView);
      replaceLegacyPathIfNeeded();
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (authLoading || bootstrapQuery.isLoading || !bootstrapState) {
      return;
    }

    if (bootstrapState.bootstrapOpen) {
      if (activeView !== 'work') {
        replaceView('work');
      }
      return;
    }

    if (activeView === 'my-day') {
      if (isAuthenticated && user?.role === 'manager') {
        replaceView('today');
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

  if (activeView === 'desk') {
    return (
      <WorkspaceShell activeView={activeView} onViewChange={handleViewChange}>
        <Suspense fallback={<PanelLoading />}>
          <ManagerDeskPage
            initialItemId={todayDeskTarget.itemId}
            initialDate={todayDeskTarget.date}
            initialItemNonce={todayDeskTarget.nonce}
            onInitialItemHandled={() => setTodayDeskTarget((prev) => ({ nonce: prev.nonce + 1 }))}
          />
        </Suspense>
      </WorkspaceShell>
    );
  }

  if (activeView === 'team') {
    return (
      <WorkspaceShell activeView={activeView} onViewChange={handleViewChange}>
        <Suspense fallback={<PanelLoading />}>
          <TeamTrackerPage
            onViewChange={handleViewChange}
            initialDeveloperAccountId={todayTeamTarget.developerAccountId}
            initialDeveloperNonce={todayTeamTarget.nonce}
            onInitialDeveloperHandled={() => setTodayTeamTarget((prev) => ({ nonce: prev.nonce + 1 }))}
          />
        </Suspense>
      </WorkspaceShell>
    );
  }

  if (activeView === 'follow-ups' || activeView === 'meetings') {
    return (
      <WorkspaceShell activeView={activeView} onViewChange={handleViewChange}>
        <Suspense fallback={<PanelLoading />}>
          <ManagerMemoryPage mode={activeView} onViewChange={handleViewChange} />
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

  if (activeView === 'today') {
    return (
      <WorkspaceShell activeView={activeView} onViewChange={handleViewChange}>
        <TodayPage
          onViewChange={handleViewChange}
          onSelectWorkFilter={handleTodayWorkFilter}
          onOpenTodayTarget={handleOpenTodayTarget}
        />
      </WorkspaceShell>
    );
  }

  return (
    <DashboardLayout
      activeView={activeView}
      onViewChange={handleViewChange}
      filterState={dashboardFilterState}
      onFilterStateChange={setDashboardFilterState}
      initialIssueKey={todayWorkTarget.issueKey}
      initialIssueNonce={todayWorkTarget.nonce}
      onInitialIssueHandled={() => setTodayWorkTarget((prev) => ({ nonce: prev.nonce + 1 }))}
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

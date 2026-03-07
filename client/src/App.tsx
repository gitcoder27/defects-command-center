import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';
import { useConfig } from '@/hooks/useConfig';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { TeamTrackerPage } from '@/components/team-tracker/TeamTrackerPage';
import { SetupWizard } from '@/components/setup/SetupWizard';
import { Header } from '@/components/layout/Header';

export type AppView = 'dashboard' | 'team-tracker';

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
  const [activeView, setActiveView] = useState<AppView>('dashboard');

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
          <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>Loading…</span>
        </div>
      </div>
    );
  }

  if (config && !config.isConfigured) {
    return <SetupWizard onComplete={() => refetch()} />;
  }

  if (activeView === 'team-tracker') {
    return (
      <div className="h-full flex flex-col overflow-hidden" style={{ background: 'transparent' }}>
        <Header activeView={activeView} onViewChange={setActiveView} />
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

  return <DashboardLayout activeView={activeView} onViewChange={setActiveView} />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

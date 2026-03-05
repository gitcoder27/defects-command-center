import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';
import { useConfig } from '@/hooks/useConfig';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { SetupWizard } from '@/components/setup/SetupWizard';

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

  return <DashboardLayout />;
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

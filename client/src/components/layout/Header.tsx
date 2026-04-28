import { useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Moon, Sun, PanelLeftOpen, Settings, Plus } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import { useTriggerSync } from '@/hooks/useTriggerSync';
import { formatRelativeTime } from '@/lib/utils';
import type { AppView } from '@/App';
import type { Alert } from '@/types';
import { GlobalCaptureDialog } from '@/components/capture/GlobalCaptureDialog';
import { HeaderNav } from '@/components/layout/HeaderNav';
import { AlertInbox } from '@/components/alerts/AlertInbox';
import { LeadOSMark } from '@/components/brand/LeadOSMark';

interface HeaderProps {
  onOpenMobileSidebar?: () => void;
  activeView?: AppView;
  onViewChange?: (view: AppView) => void;
  onDashboardAlertClick?: (alert: Alert) => void;
}

export function Header({ onOpenMobileSidebar, activeView, onViewChange, onDashboardAlertClick }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { data: sync } = useSyncStatus();
  const triggerSync = useTriggerSync();
  const [captureOpen, setCaptureOpen] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);

  const isSyncing = sync?.status === 'syncing' || triggerSync.isPending;
  const hasError = sync?.status === 'error';
  const canQuickCapture = user?.role === 'manager';
  const currentView = activeView ?? 'today';
  const showDashboardAlerts = user?.role === 'manager' && (currentView === 'work' || currentView === 'dashboard') && Boolean(onDashboardAlertClick);

  useLayoutEffect(() => {
    const headerElement = headerRef.current;

    if (!headerElement || typeof document === 'undefined') {
      return undefined;
    }

    const rootStyle = document.documentElement.style;
    const updateHeaderHeight = () => {
      rootStyle.setProperty('--app-header-height', `${Math.ceil(headerElement.getBoundingClientRect().height)}px`);
    };

    updateHeaderHeight();
    window.addEventListener('resize', updateHeaderHeight);

    if (typeof ResizeObserver === 'undefined') {
      return () => {
        window.removeEventListener('resize', updateHeaderHeight);
        rootStyle.removeProperty('--app-header-height');
      };
    }

    const resizeObserver = new ResizeObserver(() => {
      updateHeaderHeight();
    });
    resizeObserver.observe(headerElement);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateHeaderHeight);
      rootStyle.removeProperty('--app-header-height');
    };
  }, []);

  return (
    <>
      <motion.header
        ref={headerRef}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative z-[300] shrink-0 px-1 pt-0.5 md:px-1.5"
      >
        <div
          className="dashboard-panel rounded-[14px] px-2 py-1.5 md:px-2.5 flex flex-col gap-1.5 xl:flex-row xl:items-center xl:justify-between"
          style={{ borderColor: 'var(--border-strong)' }}
        >
          <div className="flex min-w-0 flex-col gap-1.5 lg:flex-row lg:items-center lg:gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              {onOpenMobileSidebar && (
                <button
                  onClick={onOpenMobileSidebar}
                  className="h-8 w-8 rounded-xl transition-colors duration-150 flex items-center justify-center lg:hidden"
                  style={{ background: 'var(--bg-tertiary)' }}
                  title="Open sidebar"
                  aria-label="Open sidebar"
                >
                  <PanelLeftOpen size={16} style={{ color: 'var(--text-secondary)' }} />
                </button>
              )}
              <div className="h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>
                <LeadOSMark size={22} />
              </div>
              <div className="min-w-[132px]">
                <h1
                  className="font-sans text-[16px] md:text-[17px] font-semibold leading-tight truncate"
                  style={{ color: 'var(--text-primary)' }}
                >
                  LeadOS
                </h1>
                <div className="hidden text-[10.5px] sm:block" style={{ color: 'var(--text-secondary)' }}>
                  People, work, risks, and planning
                </div>
              </div>
            </div>
            {onViewChange && (
              <div className="min-w-0 overflow-visible">
                <HeaderNav activeView={activeView} isManager={user?.role === 'manager'} onViewChange={onViewChange} />
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-wrap items-center justify-between gap-1.5 xl:flex-nowrap xl:justify-end">
            <div
              className="h-9 rounded-xl px-2.5 flex items-center gap-2"
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
              title={sync?.lastSyncedAt ? `Synced ${formatRelativeTime(sync.lastSyncedAt)}` : 'Not synced'}
            >
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  background: hasError
                    ? 'var(--danger)'
                    : isSyncing
                    ? 'var(--warning)'
                    : 'var(--success)',
                  boxShadow: hasError
                    ? '0 0 10px var(--danger)'
                    : isSyncing
                    ? '0 0 10px var(--warning)'
                    : '0 0 10px var(--success)',
                }}
              />
              <div className="min-w-0">
                <div className="text-[11.5px] font-mono truncate" style={{ color: 'var(--text-secondary)' }}>
                  {sync?.lastSyncedAt ? `Synced ${formatRelativeTime(sync.lastSyncedAt)}` : 'Not synced'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {showDashboardAlerts && onDashboardAlertClick ? (
                <AlertInbox onAlertClick={onDashboardAlertClick} />
              ) : null}

              {canQuickCapture && (
                <button
                  type="button"
                  onClick={() => setCaptureOpen(true)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-xl px-3 text-[11px] font-semibold transition-all"
                  style={{
                    background: 'linear-gradient(135deg, var(--md-accent-glow), rgba(217,169,78,0.06))',
                    color: 'var(--md-accent)',
                    border: '1px solid rgba(217,169,78,0.22)',
                    boxShadow: '0 10px 24px rgba(217,169,78,0.08)',
                  }}
                >
                  <Plus size={12} />
                  Capture
                </button>
              )}

              <div
                className="rounded-xl p-0.5 flex items-center gap-0.5"
                style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
              >
                <button
                  onClick={() => triggerSync.mutate()}
                  disabled={isSyncing}
                  className="h-8 w-8 rounded-lg transition-colors duration-150 disabled:opacity-50 flex items-center justify-center"
                  style={{ background: 'transparent' }}
                  title="Manual sync (r)"
                >
                  <RefreshCw
                    size={16}
                    className={isSyncing ? 'animate-spin' : ''}
                    style={{ color: 'var(--text-secondary)' }}
                  />
                </button>

                <button
                  onClick={toggleTheme}
                  className="h-8 w-8 rounded-lg transition-colors duration-150 flex items-center justify-center"
                  style={{ background: 'transparent' }}
                  title="Toggle theme"
                >
                  {theme === 'dark' ? (
                    <Sun size={16} style={{ color: 'var(--text-secondary)' }} />
                  ) : (
                    <Moon size={16} style={{ color: 'var(--text-secondary)' }} />
                  )}
                </button>

                {user?.role === 'manager' && onViewChange && (
                  <button
                    onClick={() => onViewChange('settings')}
                    className="h-8 w-8 rounded-lg transition-colors duration-150 flex items-center justify-center"
                    style={{
                      background: activeView === 'settings' ? 'var(--bg-elevated)' : 'transparent',
                      boxShadow: activeView === 'settings' ? 'var(--soft-shadow)' : 'none',
                    }}
                    title="Settings"
                    aria-label="Open settings"
                  >
                    <Settings
                      size={16}
                      style={{ color: activeView === 'settings' ? 'var(--accent)' : 'var(--text-secondary)' }}
                    />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.header>

      {captureOpen && (
        <GlobalCaptureDialog
          onClose={() => setCaptureOpen(false)}
          onOpenManagerDesk={onViewChange ? () => onViewChange('desk') : undefined}
          onOpenTeamTracker={onViewChange ? () => onViewChange('team') : undefined}
        />
      )}
    </>
  );
}

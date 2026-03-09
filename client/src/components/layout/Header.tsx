import { useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Moon, Sun, PanelLeftOpen, Radar, Settings, Users, Briefcase, Plus } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import { useTriggerSync } from '@/hooks/useTriggerSync';
import { formatRelativeTime } from '@/lib/utils';
import type { AppView } from '@/App';
import { ManagerDeskCaptureDialog } from '@/components/manager-desk/ManagerDeskCaptureDialog';

interface HeaderProps {
  onOpenMobileSidebar?: () => void;
  activeView?: AppView;
  onViewChange?: (view: AppView) => void;
}

export function Header({ onOpenMobileSidebar, activeView, onViewChange }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { data: sync } = useSyncStatus();
  const triggerSync = useTriggerSync();
  const [captureOpen, setCaptureOpen] = useState(false);

  const isSyncing = sync?.status === 'syncing' || triggerSync.isPending;
  const hasError = sync?.status === 'error';
  const canQuickCapture = user?.role === 'manager' && activeView !== 'manager-desk';

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="shrink-0 px-1.5 pt-1 md:px-2 md:pt-1.5"
      >
        <div
          className="dashboard-panel rounded-[14px] px-2.5 py-1.5 md:px-3 md:py-1.5 flex flex-col gap-1 lg:flex-row lg:items-center lg:justify-between"
          style={{ borderColor: 'var(--border-strong)' }}
        >
          <div className="flex items-center gap-3 min-w-0">
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
              <Radar size={16} />
            </div>
            <div className="min-w-0">
              <h1
                className="font-sans text-[16px] md:text-[17px] font-semibold truncate"
                style={{ color: 'var(--text-primary)' }}
              >
                Defect Command Center
              </h1>
              <div className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                Defect triage workspace
              </div>
            </div>
            {onViewChange && (
              <div
                className="flex items-center rounded-xl p-0.5 gap-0.5"
                style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
              >
                <button
                  onClick={() => onViewChange('dashboard')}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors"
                  style={{
                    background: activeView === 'dashboard' ? 'var(--bg-elevated)' : 'transparent',
                    color: activeView === 'dashboard' ? 'var(--accent)' : 'var(--text-muted)',
                    boxShadow: activeView === 'dashboard' ? 'var(--soft-shadow)' : 'none',
                  }}
                >
                  <Radar size={12} />
                  Dashboard
                </button>
                <button
                  onClick={() => onViewChange('team-tracker')}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors"
                  style={{
                    background: activeView === 'team-tracker' ? 'var(--bg-elevated)' : 'transparent',
                    color: activeView === 'team-tracker' ? 'var(--accent)' : 'var(--text-muted)',
                    boxShadow: activeView === 'team-tracker' ? 'var(--soft-shadow)' : 'none',
                  }}
                >
                  <Users size={12} />
                  Team Tracker
                </button>
                {user?.role === 'manager' && (
                  <button
                    onClick={() => onViewChange('manager-desk')}
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors"
                    style={{
                      background: activeView === 'manager-desk' ? 'var(--bg-elevated)' : 'transparent',
                      color: activeView === 'manager-desk' ? 'var(--md-accent)' : 'var(--text-muted)',
                      boxShadow: activeView === 'manager-desk' ? 'var(--soft-shadow)' : 'none',
                    }}
                  >
                    <Briefcase size={12} />
                    Manager Desk
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5 lg:flex-row lg:items-center">
            <div
              className="rounded-xl px-2.5 py-1.5 flex items-center gap-2"
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
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
                <div className="text-[10px] uppercase font-semibold" style={{ letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
                  Sync Status
                </div>
                <div className="text-[12px] font-mono truncate" style={{ color: 'var(--text-secondary)' }}>
                  {sync?.lastSyncedAt ? `Synced ${formatRelativeTime(sync.lastSyncedAt)}` : 'Not synced'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 self-start lg:self-auto">
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
        <ManagerDeskCaptureDialog
          onClose={() => setCaptureOpen(false)}
          onOpenManagerDesk={onViewChange ? () => onViewChange('manager-desk') : undefined}
          heading="Quick Capture"
          description="Drop a task into today's Manager Desk from anywhere in the manager workspace."
          initialCategory="planning"
          contextChips={[{ label: 'Source', value: 'Workspace', tone: 'generic' }]}
        />
      )}
    </>
  );
}

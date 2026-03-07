import { motion } from 'framer-motion';
import { RefreshCw, Moon, Sun, PanelLeftClose, PanelLeftOpen, Radar, Settings } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import { useTriggerSync } from '@/hooks/useTriggerSync';
import { formatRelativeTime } from '@/lib/utils';

interface HeaderProps {
  onToggleSidebar?: () => void;
  showSidebarToggle?: boolean;
  onOpenSettings?: () => void;
  sidebarCollapsed?: boolean;
}

export function Header({ onToggleSidebar, showSidebarToggle, onOpenSettings, sidebarCollapsed }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { data: sync } = useSyncStatus();
  const triggerSync = useTriggerSync();

  const isSyncing = sync?.status === 'syncing' || triggerSync.isPending;
  const hasError = sync?.status === 'error';

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="shrink-0 px-2 pt-2 md:px-3 md:pt-3"
    >
      <div
        className="dashboard-panel rounded-[24px] px-3 py-2.5 md:px-4 md:py-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between"
        style={{ borderColor: 'var(--border-strong)' }}
      >
        <div className="flex items-center gap-3 min-w-0">
          {showSidebarToggle && (
            <button
              onClick={onToggleSidebar}
              className="h-11 w-11 rounded-2xl transition-colors duration-150 flex items-center justify-center"
              style={{ background: 'var(--bg-tertiary)' }}
              title="Toggle sidebar"
              aria-label="Toggle sidebar"
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen size={18} style={{ color: 'var(--text-secondary)' }} />
              ) : (
                <PanelLeftClose size={18} style={{ color: 'var(--text-secondary)' }} />
              )}
            </button>
          )}
          <div className="h-10 w-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>
            <Radar size={16} />
          </div>
          <div className="min-w-0">
            <h1
              className="font-sans text-[18px] md:text-[19px] font-semibold truncate"
              style={{ color: 'var(--text-primary)' }}
            >
              Defect Command Center
            </h1>
            <div className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
              Defect triage workspace
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div
            className="rounded-2xl px-3 py-2 flex items-center gap-3"
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

          <div
            className="rounded-2xl p-1 flex items-center gap-1 self-start lg:self-auto"
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
          >
            <button
              onClick={() => triggerSync.mutate()}
              disabled={isSyncing}
              className="h-10 w-10 rounded-xl transition-colors duration-150 disabled:opacity-50 flex items-center justify-center"
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
              className="h-10 w-10 rounded-xl transition-colors duration-150 flex items-center justify-center"
              style={{ background: 'transparent' }}
              title="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun size={16} style={{ color: 'var(--text-secondary)' }} />
              ) : (
                <Moon size={16} style={{ color: 'var(--text-secondary)' }} />
              )}
            </button>

            <button
              onClick={onOpenSettings}
              className="h-10 w-10 rounded-xl transition-colors duration-150 flex items-center justify-center"
              style={{ background: 'transparent' }}
              title="Settings"
            >
              <Settings size={16} style={{ color: 'var(--text-secondary)' }} />
            </button>
          </div>
        </div>
      </div>
    </motion.header>
  );
}

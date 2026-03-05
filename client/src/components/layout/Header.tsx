import { motion } from 'framer-motion';
import { RefreshCw, Moon, Sun, Menu, Settings } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import { useTriggerSync } from '@/hooks/useTriggerSync';
import { formatRelativeTime } from '@/lib/utils';

interface HeaderProps {
  onToggleSidebar?: () => void;
  showSidebarToggle?: boolean;
  onOpenSettings?: () => void;
}

export function Header({ onToggleSidebar, showSidebarToggle, onOpenSettings }: HeaderProps) {
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
      className="h-12 flex items-center justify-between px-5 border-b"
      style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
    >
      <div className="flex items-center gap-3">
        {showSidebarToggle && (
          <button
            onClick={onToggleSidebar}
            className="p-1.5 rounded-md transition-colors duration-150 hover:bg-[var(--bg-tertiary)]"
            title="Toggle sidebar"
          >
            <Menu size={16} style={{ color: 'var(--text-secondary)' }} />
          </button>
        )}
        <h1
          className="font-sans text-lg font-semibold uppercase"
          style={{ letterSpacing: '0.05em', color: 'var(--text-primary)' }}
        >
          Defect Command Center
        </h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Sync status */}
        <div className="flex items-center gap-2 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
          <span
            className="w-2 h-2 rounded-full"
            style={{
              background: hasError
                ? 'var(--danger)'
                : isSyncing
                ? 'var(--warning)'
                : 'var(--success)',
              boxShadow: hasError
                ? '0 0 6px var(--danger)'
                : isSyncing
                ? '0 0 6px var(--warning)'
                : '0 0 6px var(--success)',
            }}
          />
          {sync?.lastSyncedAt
            ? `Synced ${formatRelativeTime(sync.lastSyncedAt)}`
            : 'Not synced'}
        </div>

        {/* Refresh button */}
        <button
          onClick={() => triggerSync.mutate()}
          disabled={isSyncing}
          className="p-1.5 rounded-md transition-colors duration-150 hover:bg-[var(--bg-tertiary)] disabled:opacity-50"
          title="Manual sync (r)"
        >
          <RefreshCw
            size={16}
            className={isSyncing ? 'animate-spin' : ''}
            style={{ color: 'var(--text-secondary)' }}
          />
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-md transition-colors duration-150 hover:bg-[var(--bg-tertiary)]"
          title="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun size={16} style={{ color: 'var(--text-secondary)' }} />
          ) : (
            <Moon size={16} style={{ color: 'var(--text-secondary)' }} />
          )}
        </button>

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded-md transition-colors duration-150 hover:bg-[var(--bg-tertiary)]"
          title="Settings"
        >
          <Settings size={16} style={{ color: 'var(--text-secondary)' }} />
        </button>
      </div>
    </motion.header>
  );
}

import { motion } from 'framer-motion';
import { LogOut, RefreshCw, Sun, Moon, Clock } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import { getStatusInfo } from './StatusSelector';
import type { TrackerDeveloperStatus, AuthUser, MyDayResponse } from '@/types';

interface MyDayHeaderProps {
  user: AuthUser | null;
  day: MyDayResponse | undefined;
  isFetching: boolean;
  theme: string;
  onRefresh: () => void;
  onToggleTheme: () => void;
  onLogout: () => void;
}

export function MyDayHeader({
  user,
  day,
  isFetching,
  theme,
  onRefresh,
  onToggleTheme,
  onLogout,
}: MyDayHeaderProps) {
  const statusInfo = day ? getStatusInfo(day.status) : null;

  return (
    <div
      className="rounded-3xl px-5 py-4 flex items-center justify-between shadow-sm relative overflow-hidden"
      style={{ 
        background: 'var(--bg-primary)', 
        border: '1px solid var(--border)',
      }}
    >
      <div className="flex items-center gap-4 min-w-0 z-10">
        {/* Avatar */}
        <div
          className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 text-[16px] font-bold shadow-inner"
          style={{
            background: statusInfo ? statusInfo.bg : 'var(--accent-glow)',
            color: statusInfo ? statusInfo.color : 'var(--accent)',
            border: `1px solid ${statusInfo ? `color-mix(in srgb, ${statusInfo.color} 30%, transparent)` : 'color-mix(in srgb, var(--accent) 30%, transparent)'}`,
          }}
        >
          {user?.displayName
            ?.split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase() ?? '?'}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1
              className="text-[20px] font-bold truncate tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              My Day
            </h1>
            {day && (
              <span
                className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider"
                style={{
                  color: statusInfo?.color,
                  background: statusInfo?.bg,
                }}
              >
                {statusInfo?.label}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
              {user?.displayName}
            </span>
            {day?.lastCheckInAt && (
              <>
                <span style={{ color: 'var(--text-muted)' }}>•</span>
                <span className="text-[13px] flex items-center gap-1 font-medium" style={{ color: 'var(--text-muted)' }}>
                  {formatRelativeTime(day.lastCheckInAt)}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Header actions */}
      <div
        className="flex items-center rounded-2xl p-1 gap-1 shrink-0 z-10 backdrop-blur-sm"
        style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
      >
        <button
          onClick={onRefresh}
          disabled={isFetching}
          className="h-10 w-10 rounded-xl flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw
            size={16}
            className={isFetching ? 'animate-spin' : ''}
            style={{ color: 'var(--text-secondary)' }}
          />
        </button>
        <button
          onClick={onToggleTheme}
          className="h-10 w-10 rounded-xl flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          title="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun size={16} style={{ color: 'var(--text-secondary)' }} />
          ) : (
            <Moon size={16} style={{ color: 'var(--text-secondary)' }} />
          )}
        </button>
        <button
          onClick={onLogout}
          className="h-10 w-10 rounded-xl flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          title="Sign out"
        >
          <LogOut size={16} style={{ color: 'var(--text-secondary)' }} />
        </button>
      </div>
    </div>
  );
}

import type { ReactNode } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Briefcase, RefreshCw, ArrowRightFromLine } from 'lucide-react';

interface Props {
  displayDate: string;
  isTodayDate: boolean;
  isFetching: boolean;
  canCarryForward: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onRefresh: () => void;
  onCarryForward: () => void;
}

export function ManagerDeskHeader({
  displayDate,
  isTodayDate,
  isFetching,
  canCarryForward,
  onPrev,
  onNext,
  onToday,
  onRefresh,
  onCarryForward,
}: Props) {
  return (
    <div className="sticky top-0 z-20 px-3 pt-3 md:px-4">
      <div className="md-header-panel rounded-[18px] px-3 py-3 md:px-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl"
              style={{ background: 'var(--md-accent-glow)', color: 'var(--md-accent)' }}
            >
              <Briefcase size={18} />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-[18px] font-semibold tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>
                Manager Desk
              </h1>
              <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                Operating surface for a high-volume day
              </p>
            </div>

            <div
              className="ml-auto hidden items-center rounded-2xl border px-1 py-1 md:flex xl:ml-3"
              style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}
            >
              <HeaderNavButton label="Previous day" onClick={onPrev}>
                <ChevronLeft size={14} />
              </HeaderNavButton>
              <button
                type="button"
                onClick={onToday}
                className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em]"
                style={{
                  background: isTodayDate ? 'var(--md-accent-glow)' : 'transparent',
                  color: isTodayDate ? 'var(--md-accent)' : 'var(--text-secondary)',
                }}
              >
                <CalendarDays size={12} />
                Today
              </button>
              <HeaderNavButton label="Next day" onClick={onNext}>
                <ChevronRight size={14} />
              </HeaderNavButton>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-2xl border px-3 py-2" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
              <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
                Date
              </div>
              <div className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
                {displayDate}
              </div>
            </div>

            {canCarryForward && (
              <HeaderAction onClick={onCarryForward} label="Carry Forward">
                <ArrowRightFromLine size={12} />
                Carry Forward
              </HeaderAction>
            )}

            <HeaderAction onClick={onRefresh} label="Refresh manager desk" disabled={isFetching}>
              <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} />
              Refresh
            </HeaderAction>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 md:hidden">
          <HeaderNavButton label="Previous day" onClick={onPrev}>
            <ChevronLeft size={14} />
          </HeaderNavButton>
          <button
            type="button"
            onClick={onToday}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{
              background: isTodayDate ? 'var(--md-accent-glow)' : 'var(--bg-tertiary)',
              color: isTodayDate ? 'var(--md-accent)' : 'var(--text-secondary)',
            }}
          >
            <CalendarDays size={12} />
            Today
          </button>
          <HeaderNavButton label="Next day" onClick={onNext}>
            <ChevronRight size={14} />
          </HeaderNavButton>
        </div>
      </div>
    </div>
  );
}

function HeaderNavButton({
  children,
  label,
  onClick,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-xl transition-colors hover:opacity-80"
      style={{ color: 'var(--text-secondary)' }}
      title={label}
      aria-label={label}
    >
      {children}
    </button>
  );
}

function HeaderAction({
  children,
  label,
  disabled = false,
  onClick,
}: {
  children: ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors disabled:opacity-50"
      style={{
        background: 'var(--bg-secondary)',
        borderColor: 'var(--border)',
        color: 'var(--text-secondary)',
      }}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

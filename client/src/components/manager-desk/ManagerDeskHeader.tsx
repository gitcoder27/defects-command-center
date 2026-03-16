import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Briefcase, RefreshCw, ArrowRightFromLine } from 'lucide-react';

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
    <div className="sticky top-0 z-20 px-2 pt-2 md:px-3">
      <div className="md-header-panel rounded-xl px-3 py-2">
        <div className="flex items-center gap-2">
          <div
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
            style={{ background: 'var(--md-accent-glow)', color: 'var(--md-accent)' }}
          >
            <Briefcase size={14} />
          </div>

          <h1 className="hidden truncate text-[14px] font-semibold tracking-[-0.02em] sm:block" style={{ color: 'var(--text-primary)' }}>
            Manager Desk
          </h1>

          <div className="h-4 w-px flex-shrink-0 hidden sm:block" style={{ background: 'var(--border)' }} />

          <div
            className="flex items-center rounded-lg border px-0.5 py-0.5"
            style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}
          >
            <NavBtn label="Previous day" onClick={onPrev}>
              <ChevronLeft size={13} />
            </NavBtn>
            <button
              type="button"
              onClick={onToday}
              className="rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em]"
              style={{
                background: isTodayDate ? 'var(--md-accent-glow)' : 'transparent',
                color: isTodayDate ? 'var(--md-accent)' : 'var(--text-secondary)',
              }}
            >
              Today
            </button>
            <NavBtn label="Next day" onClick={onNext}>
              <ChevronRight size={13} />
            </NavBtn>
          </div>

          <span className="text-[12px] font-medium tabular-nums" style={{ color: 'var(--text-secondary)' }}>
            {displayDate}
          </span>

          <div className="ml-auto flex items-center gap-1">
            {canCarryForward && (
              <ActionBtn onClick={onCarryForward} label="Carry Forward">
                <ArrowRightFromLine size={11} />
                <span className="hidden sm:inline">Carry</span>
              </ActionBtn>
            )}

            <ActionBtn onClick={onRefresh} label="Refresh" disabled={isFetching}>
              <RefreshCw size={11} className={isFetching ? 'animate-spin' : ''} />
            </ActionBtn>
          </div>
        </div>
      </div>
    </div>
  );
}

function NavBtn({ children, label, onClick }: { children: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:opacity-80"
      style={{ color: 'var(--text-secondary)' }}
      title={label}
      aria-label={label}
    >
      {children}
    </button>
  );
}

function ActionBtn({ children, label, disabled = false, onClick }: { children: ReactNode; label: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] transition-colors disabled:opacity-50"
      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

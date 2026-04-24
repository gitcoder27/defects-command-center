import { AlertCircle, Users, UserMinus } from 'lucide-react';

export type TeamTrackerLens = 'attention' | 'team' | 'inactive';

interface TeamTrackerViewSwitcherProps {
  activeLens: TeamTrackerLens;
  onLensChange: (lens: TeamTrackerLens) => void;
  attentionCount: number;
  teamCount: number;
  inactiveCount: number;
  readOnly?: boolean;
}

const lensConfig: Array<{
  key: TeamTrackerLens;
  label: string;
  icon: typeof AlertCircle;
}> = [
  { key: 'attention', label: 'Attention', icon: AlertCircle },
  { key: 'team', label: 'Team', icon: Users },
  { key: 'inactive', label: 'Inactive', icon: UserMinus },
];

export function TeamTrackerViewSwitcher({
  activeLens,
  onLensChange,
  attentionCount,
  teamCount,
  inactiveCount,
  readOnly = false,
}: TeamTrackerViewSwitcherProps) {
  const counts: Record<TeamTrackerLens, number> = {
    attention: attentionCount,
    team: teamCount,
    inactive: inactiveCount,
  };

  const visibleLenses = lensConfig.filter((lens) => lens.key !== 'attention' || !readOnly);

  return (
    <div
      className="inline-flex min-w-0 items-center gap-1 rounded-xl border p-1"
      style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--bg-secondary) 72%, transparent)' }}
      aria-label="Team tracker view"
      role="tablist"
    >
      {visibleLenses.map((lens) => {
        const isActive = activeLens === lens.key;
        const Icon = lens.icon;

        return (
          <button
            key={lens.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onLensChange(lens.key)}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-[var(--border-active)] sm:px-3"
            style={{
              color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              background: isActive ? 'var(--bg-elevated)' : 'transparent',
              boxShadow: isActive ? '0 1px 0 rgba(255,255,255,0.04)' : 'none',
            }}
          >
            <Icon size={13} />
            <span>{lens.label}</span>
            <span
              className="tabular-nums rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
              style={{
                color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                background: isActive ? 'var(--accent-glow)' : 'var(--bg-tertiary)',
              }}
            >
              {counts[lens.key]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

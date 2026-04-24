import { Users, UserMinus } from 'lucide-react';

export type TeamTrackerLens = 'team' | 'inactive';

interface TeamTrackerViewSwitcherProps {
  activeLens: TeamTrackerLens;
  onLensChange: (lens: TeamTrackerLens) => void;
  teamCount: number;
  inactiveCount: number;
}

const lensConfig: Array<{
  key: TeamTrackerLens;
  label: string;
  icon: typeof Users;
}> = [
  { key: 'team', label: 'Team', icon: Users },
  { key: 'inactive', label: 'Inactive', icon: UserMinus },
];

export function TeamTrackerViewSwitcher({
  activeLens,
  onLensChange,
  teamCount,
  inactiveCount,
}: TeamTrackerViewSwitcherProps) {
  const counts: Record<TeamTrackerLens, number> = {
    team: teamCount,
    inactive: inactiveCount,
  };

  return (
    <div
      className="inline-flex min-w-0 items-center gap-0.5 rounded-lg border p-0.5"
      style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--bg-secondary) 72%, transparent)' }}
      aria-label="Team tracker view"
      role="tablist"
    >
      {lensConfig.map((lens) => {
        const isActive = activeLens === lens.key;
        const Icon = lens.icon;

        return (
          <button
            key={lens.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onLensChange(lens.key)}
            className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-[12px] font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-[var(--border-active)] sm:px-2.5"
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

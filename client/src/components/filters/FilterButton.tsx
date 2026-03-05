import type { FilterType } from '@/types';

interface FilterButtonProps {
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
  shortcut?: string;
  isIdle?: boolean;
}

export function FilterButton({ label, count, isActive, onClick, shortcut, isIdle }: FilterButtonProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-3 py-2 rounded-md text-[13px] font-medium transition-all duration-150 cursor-pointer group"
      style={{
        background: isActive ? 'var(--bg-glow)' : 'transparent',
        color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
        borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
      }}
    >
      <span className="flex items-center gap-2 truncate">
        {label}
        {isIdle && (
          <span className="text-[10px] animate-glow-idle" style={{ color: 'var(--warning)' }}>
            ⚠
          </span>
        )}
      </span>
      <span className="flex items-center gap-1.5">
        <span
          className="text-[11px] font-mono tabular-nums min-w-[20px] text-center rounded-full px-1.5 py-0.5"
          style={{
            background: isActive ? 'var(--accent-glow)' : 'var(--bg-tertiary)',
            color: isActive ? 'var(--accent)' : 'var(--text-muted)',
          }}
        >
          {count}
        </span>
        {shortcut && (
          <span
            className="text-[10px] font-mono opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: 'var(--text-muted)' }}
          >
            {shortcut}
          </span>
        )}
      </span>
    </button>
  );
}

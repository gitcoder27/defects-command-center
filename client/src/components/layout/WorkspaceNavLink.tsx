import type { LucideIcon } from 'lucide-react';
import { ExternalLink } from 'lucide-react';

interface WorkspaceNavLinkProps {
  label: string;
  icon: LucideIcon;
  active: boolean;
  accentColor: string;
  onClick: () => void;
  newTabHref?: string;
  newTabLabel?: string;
}

export function WorkspaceNavLink({
  label,
  icon: Icon,
  active,
  accentColor,
  onClick,
  newTabHref,
  newTabLabel,
}: WorkspaceNavLinkProps) {
  const hasNewTabAction = Boolean(newTabHref && newTabLabel && !active);

  const buttonStyle = {
    background: active ? 'var(--bg-elevated)' : 'transparent',
    color: active ? accentColor : 'var(--text-muted)',
    boxShadow: active ? 'var(--soft-shadow)' : 'none',
  };

  const newTabStyle = {
    color: active ? accentColor : 'var(--text-muted)',
    background: active ? 'color-mix(in srgb, var(--bg-elevated) 92%, transparent)' : 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    boxShadow: active ? 'var(--soft-shadow)' : 'none',
  };

  return (
    <div className="workspace-nav-chip group relative min-w-0 shrink-0">
      <button
        type="button"
        onClick={onClick}
        className={`flex h-8 w-full min-w-[94px] items-center justify-center gap-1.5 rounded-lg text-[12px] font-medium transition-colors lg:min-w-[104px] ${hasNewTabAction ? 'pl-3 pr-8' : 'px-3'}`}
        style={buttonStyle}
      >
        <Icon size={13} className="shrink-0" />
        <span className="truncate">{label}</span>
      </button>

      {hasNewTabAction && (
        <a
          href={newTabHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={newTabLabel}
          title={newTabLabel}
          className="workspace-nav-new-tab absolute right-1 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-active)]"
          style={newTabStyle}
        >
          <ExternalLink size={12} />
        </a>
      )}
    </div>
  );
}

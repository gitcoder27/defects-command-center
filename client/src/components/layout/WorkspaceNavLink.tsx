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
    background: active ? 'color-mix(in srgb, var(--bg-elevated) 92%, transparent)' : 'transparent',
    boxShadow: active ? 'var(--soft-shadow)' : 'none',
  };

  return (
    <div className="workspace-nav-chip group relative min-w-0">
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg px-7 py-1.5 text-[11px] font-medium transition-colors"
        style={buttonStyle}
      >
        <Icon size={12} className="shrink-0" />
        <span className="truncate">{label}</span>
      </button>

      {hasNewTabAction && (
        <a
          href={newTabHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={newTabLabel}
          title={newTabLabel}
          className="workspace-nav-new-tab absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-active)]"
          style={newTabStyle}
        >
          <ExternalLink size={12} />
        </a>
      )}
    </div>
  );
}

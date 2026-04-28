import { Briefcase, ClipboardList, Home, Users } from 'lucide-react';
import type { AppView } from '@/App';
import { WorkspaceNavLink } from '@/components/layout/WorkspaceNavLink';

interface HeaderNavProps {
  activeView?: AppView;
  isManager: boolean;
  onViewChange: (view: AppView) => void;
}

export function HeaderNav({ activeView, isManager, onViewChange }: HeaderNavProps) {
  return (
    <nav
      aria-label="Workspace navigation"
      className="grid min-w-0 auto-cols-fr grid-flow-col items-center gap-0.5 rounded-xl p-0.5 lg:min-w-[540px]"
      style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
    >
      <WorkspaceNavLink
        label="Today"
        icon={Home}
        active={activeView === 'today'}
        accentColor="var(--accent)"
        onClick={() => onViewChange('today')}
        newTabHref="/"
        newTabLabel="Open Today in new tab"
      />
      <WorkspaceNavLink
        label="Work"
        icon={ClipboardList}
        active={activeView === 'work' || activeView === 'dashboard'}
        accentColor="var(--accent)"
        onClick={() => onViewChange('work')}
        newTabHref="/work"
        newTabLabel="Open Work in new tab"
      />
      <WorkspaceNavLink
        label="Team"
        icon={Users}
        active={activeView === 'team' || activeView === 'team-tracker'}
        accentColor="var(--accent)"
        onClick={() => onViewChange('team')}
        newTabHref="/team"
        newTabLabel="Open Team in new tab"
      />
      {isManager && (
        <WorkspaceNavLink
          label="Desk"
          icon={Briefcase}
          active={activeView === 'desk' || activeView === 'manager-desk'}
          accentColor="var(--md-accent)"
          onClick={() => onViewChange('desk')}
          newTabHref="/desk"
          newTabLabel="Open Desk in new tab"
        />
      )}
    </nav>
  );
}

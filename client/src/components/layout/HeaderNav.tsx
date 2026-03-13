import { Briefcase, Radar, Users } from 'lucide-react';
import type { AppView } from '@/App';
import { WorkspaceNavLink } from '@/components/layout/WorkspaceNavLink';

interface HeaderNavProps {
  activeView?: AppView;
  isManager: boolean;
  onViewChange: (view: AppView) => void;
}

export function HeaderNav({ activeView, isManager, onViewChange }: HeaderNavProps) {
  return (
    <div
      className="flex items-center rounded-xl p-0.5 gap-0.5"
      style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
    >
      <WorkspaceNavLink
        label="Dashboard"
        icon={Radar}
        active={activeView === 'dashboard'}
        accentColor="var(--accent)"
        onClick={() => onViewChange('dashboard')}
      />
      <WorkspaceNavLink
        label="Team Tracker"
        icon={Users}
        active={activeView === 'team-tracker'}
        accentColor="var(--accent)"
        onClick={() => onViewChange('team-tracker')}
        newTabHref="/team-tracker"
        newTabLabel="Open Team Tracker in new tab"
      />
      {isManager && (
        <WorkspaceNavLink
          label="Manager Desk"
          icon={Briefcase}
          active={activeView === 'manager-desk'}
          accentColor="var(--md-accent)"
          onClick={() => onViewChange('manager-desk')}
          newTabHref="/manager-desk"
          newTabLabel="Open Manager Desk in new tab"
        />
      )}
    </div>
  );
}

import { BriefcaseBusiness, Plus, Rows3, Users, Zap, type LucideIcon } from 'lucide-react';
import type { AppView } from '@/App';
import type { FilterType } from '@/types';

interface TodayCommandFooterProps {
  onViewChange: (view: AppView) => void;
  onSelectWorkFilter?: (filter: FilterType) => void;
}

export function TodayCommandFooter({ onViewChange, onSelectWorkFilter }: TodayCommandFooterProps) {
  return (
    <footer className="shrink-0 border-t px-5 py-2 xl:px-8" style={{ borderColor: 'var(--today-line)', background: 'color-mix(in srgb, var(--bg-primary) 48%, transparent)' }}>
      <div className="grid gap-1.5 md:grid-cols-[150px_repeat(4,minmax(0,1fr))_170px]">
        <div className="hidden items-center gap-2.5 md:flex">
          <Zap size={16} style={{ color: 'var(--accent)' }} />
          <div>
            <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>Quick actions</p>
            <p className="text-[11.5px] leading-5" style={{ color: 'var(--text-muted)' }}>Capture or jump</p>
          </div>
        </div>
        <FooterAction icon={Plus} title="Capture" detail="Note, decision, follow-up" onClick={() => onViewChange('desk')} />
        <FooterAction icon={Rows3} title="Open Work" detail="Defects and filters" onClick={() => onViewChange('work')} />
        <FooterAction icon={Users} title="Open Team" detail="Team tracker board" onClick={() => onViewChange('team')} />
        <FooterAction icon={BriefcaseBusiness} title="Open Desk" detail="Manager daily desk" onClick={() => onViewChange('desk')} />
        <button
          type="button"
          onClick={() => onSelectWorkFilter?.('blocked')}
          className="hidden items-center justify-end gap-2.5 border-l pl-4 text-left transition-colors hover:bg-[var(--today-hover)] md:flex"
          style={{ borderColor: 'var(--today-line)' }}
        >
          <Zap size={16} style={{ color: 'var(--accent)' }} />
          <span>
            <span className="block text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>Standup</span>
            <span className="block text-[12px] leading-5" style={{ color: 'var(--text-muted)' }}>Blocked work</span>
          </span>
        </button>
      </div>
    </footer>
  );
}

function FooterAction({ icon: Icon, title, detail, onClick }: { icon: LucideIcon; title: string; detail: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-[var(--today-hover)] active:scale-[0.98]"
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md" style={{ background: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)' }}>
        <Icon size={14} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{title}</span>
        <span className="hidden truncate text-[11.5px] leading-5 xl:block" style={{ color: 'var(--text-muted)' }}>{detail}</span>
      </span>
    </button>
  );
}

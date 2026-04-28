import { Briefcase, ClipboardList, LayoutDashboard, Users } from 'lucide-react';
import type { AppView } from '@/App';

interface TodayPageProps {
  onViewChange: (view: AppView) => void;
}

interface TodayAction {
  title: string;
  detail: string;
  view: AppView;
  Icon: typeof LayoutDashboard;
}

const todayActions: TodayAction[] = [
  {
    title: 'Work queue',
    detail: 'Review Jira defects, triage risk, and assign the next fixes.',
    view: 'work',
    Icon: ClipboardList,
  },
  {
    title: 'Team pulse',
    detail: 'Check current work, blockers, check-ins, and carry-forward items.',
    view: 'team',
    Icon: Users,
  },
  {
    title: 'My desk',
    detail: 'Capture manager notes, decisions, planning items, and linked work.',
    view: 'desk',
    Icon: Briefcase,
  },
];

export function TodayPage({ onViewChange }: TodayPageProps) {
  return (
    <main className="flex-1 overflow-auto" style={{ background: 'var(--bg-canvas)' }}>
      <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col px-4 py-6 md:px-6 md:py-8">
        <section className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] lg:items-end">
          <div>
            <p className="text-[12px] font-semibold uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
              Today
            </p>
            <h1 className="mt-2 max-w-3xl text-[30px] font-semibold leading-tight md:text-[42px]" style={{ color: 'var(--text-primary)' }}>
              Run the manager loop from one place.
            </h1>
            <p className="mt-3 max-w-2xl text-[14px] leading-6 md:text-[15px]" style={{ color: 'var(--text-secondary)' }}>
              Start with the current operating surfaces: work, team, and desk. The attention queue will grow here as the command center expands.
            </p>
          </div>

          <div
            className="rounded-[14px] border p-4"
            style={{
              borderColor: 'var(--border)',
              background: 'color-mix(in srgb, var(--bg-primary) 88%, transparent)',
            }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>
                <LayoutDashboard size={18} />
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Engineering Manager Command Center
                </div>
                <div className="mt-1 text-[12px] leading-5" style={{ color: 'var(--text-secondary)' }}>
                  Jira remains connected inside Work while the manager workspace becomes broader.
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-7 grid gap-3 md:grid-cols-3">
          {todayActions.map(({ title, detail, view, Icon }) => (
            <button
              key={title}
              type="button"
              onClick={() => onViewChange(view)}
              className="group rounded-[14px] border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-active)]"
              style={{
                borderColor: 'var(--border)',
                background: 'color-mix(in srgb, var(--bg-primary) 90%, transparent)',
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors duration-200"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--accent)' }}
                >
                  <Icon size={17} />
                </div>
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {title}
                  </div>
                  <div className="mt-1 text-[12px] leading-5" style={{ color: 'var(--text-secondary)' }}>
                    {detail}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </section>
      </div>
    </main>
  );
}

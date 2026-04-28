import { AlertTriangle, ArrowRight, Briefcase, ClipboardList, Loader2, ShieldAlert } from 'lucide-react';
import { useManagerAttention } from '@/hooks/useManagerAttention';
import type { FilterType } from '@/types';
import type { ManagerPulseMetric, ManagerAttentionSeverity } from '@/lib/manager-attention';

interface WorkFocusStripProps {
  onFilterChange: (filter: FilterType) => void;
  onOpenDesk?: () => void;
  onOpenTeam?: () => void;
}

const severityColor: Record<ManagerAttentionSeverity, string> = {
  critical: 'var(--danger)',
  warning: 'var(--warning)',
  info: 'var(--info)',
  neutral: 'var(--text-secondary)',
};

export function WorkFocusStrip({ onFilterChange, onOpenDesk, onOpenTeam }: WorkFocusStripProps) {
  const { data: snapshot, isFetching } = useManagerAttention();
  const metrics = snapshot.workMetrics;

  const handleClick = (metric: ManagerPulseMetric) => {
    if (metric.id === 'manual-work' && onOpenDesk) {
      onOpenDesk();
      return;
    }

    if (metric.id === 'at-risk' && onOpenTeam) {
      onOpenTeam();
      return;
    }

    if (metric.filter) {
      onFilterChange(metric.filter);
    }
  };

  return (
    <section
      className="border-b px-3 py-2"
      style={{
        borderColor: 'var(--border)',
        background: 'color-mix(in srgb, var(--bg-secondary) 58%, var(--bg-primary) 42%)',
      }}
      aria-label="Work focus"
    >
      <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
        <div className="flex min-w-[190px] items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>
            <ClipboardList size={15} />
          </span>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>Work command</p>
            <p className="text-[10.5px]" style={{ color: 'var(--text-muted)' }}>Jira defects plus manual manager work</p>
          </div>
          {isFetching ? <Loader2 size={12} className="animate-spin" style={{ color: 'var(--text-muted)' }} /> : null}
        </div>

        <div className="grid min-w-0 flex-1 grid-cols-2 gap-1.5 md:grid-cols-3 xl:grid-cols-6">
          {metrics.map((metric) => (
            <button
              key={metric.id}
              type="button"
              onClick={() => handleClick(metric)}
              className="group flex min-w-0 items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-left transition-colors hover:brightness-105"
              style={{
                borderColor: metric.value > 0 ? `color-mix(in srgb, ${severityColor[metric.severity]} 28%, var(--border))` : 'var(--border)',
                background: metric.value > 0 ? `color-mix(in srgb, ${severityColor[metric.severity]} 8%, var(--bg-primary))` : 'var(--bg-primary)',
              }}
            >
              <span className="min-w-0">
                <span className="block truncate text-[10.5px] font-semibold" style={{ color: 'var(--text-secondary)' }}>{metric.label}</span>
                <span className="block truncate text-[9.5px]" style={{ color: 'var(--text-muted)' }}>{metric.detail}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1">
                {metric.id === 'manual-work' ? <Briefcase size={11} style={{ color: severityColor[metric.value > 0 ? metric.severity : 'neutral'] }} /> : null}
                {metric.id === 'blocked' ? <ShieldAlert size={11} style={{ color: severityColor[metric.value > 0 ? metric.severity : 'neutral'] }} /> : null}
                {metric.id === 'at-risk' ? <AlertTriangle size={11} style={{ color: severityColor[metric.value > 0 ? metric.severity : 'neutral'] }} /> : null}
                <span className="text-[13px] font-semibold tabular-nums" style={{ color: severityColor[metric.value > 0 ? metric.severity : 'neutral'] }}>
                  {metric.value}
                </span>
                <ArrowRight size={10} className="opacity-0 transition-opacity group-hover:opacity-100" style={{ color: 'var(--text-muted)' }} />
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

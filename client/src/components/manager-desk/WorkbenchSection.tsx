import type { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle: string;
  count: number;
  accent: string;
  emptyMessage: string;
  children: ReactNode;
}

export function WorkbenchSection({
  title,
  subtitle,
  count,
  accent,
  emptyMessage,
  children,
}: Props) {
  return (
    <section className="md-glass-panel flex flex-col rounded-xl">
      <div className="border-b px-3 py-2" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-1.5">
          <span className="h-3.5 w-0.5 rounded-full" style={{ background: accent }} />
          <h2 className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h2>
          <span
            className="rounded-md px-1.5 py-0.5 text-[9px] font-bold tabular-nums"
            style={{ background: count > 0 ? `color-mix(in srgb, ${accent} 14%, transparent)` : 'var(--bg-tertiary)', color: count > 0 ? accent : 'var(--text-muted)' }}
          >
            {count}
          </span>
          <span className="ml-1 text-[10px] hidden lg:inline" style={{ color: 'var(--text-muted)' }}>{subtitle}</span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {count === 0 ? (
          <div className="rounded-lg border border-dashed px-3 py-3 text-center text-[11px]" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
            {emptyMessage}
          </div>
        ) : (
          <div className="space-y-1">{children}</div>
        )}
      </div>
    </section>
  );
}

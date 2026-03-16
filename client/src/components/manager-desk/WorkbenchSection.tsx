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
    <section className="md-glass-panel flex min-h-[280px] flex-col rounded-[20px]">
      <div className="border-b px-4 py-3" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <span className="h-5 w-1 rounded-full" style={{ background: accent }} />
          <h2 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h2>
          <span className="rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ background: 'rgba(15,23,42,0.08)', color: accent }}>
            {count}
          </span>
        </div>
        <p className="mt-1 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
          {subtitle}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {count === 0 ? (
          <div className="flex h-full items-center justify-center rounded-[16px] border border-dashed px-4 py-6 text-center text-[12px]" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
            {emptyMessage}
          </div>
        ) : (
          <div className="space-y-2">{children}</div>
        )}
      </div>
    </section>
  );
}

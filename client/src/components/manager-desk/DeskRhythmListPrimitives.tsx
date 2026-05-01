import type { ReactNode } from 'react';
import type { ManagerDeskItem, ManagerDeskStatus } from '@/types/manager-desk';
import { DeskItemCard } from './DeskItemCard';
import { getCardVariant } from './UnifiedDeskListPrimitives';

export interface DeskRhythmSection {
  key: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
  items: ManagerDeskItem[];
  quiet?: boolean;
  defaultOpen?: boolean;
  tone?: 'active' | 'decision' | 'calm' | 'quiet';
}

export function DeskRhythmHeader({
  title,
  subtitle,
  count,
  continuedOpenCount,
  metrics,
}: {
  title: string;
  subtitle: string;
  count: number;
  continuedOpenCount?: number;
  metrics?: Array<{ label: string; value: number; tone?: 'active' | 'decision' | 'calm' }>;
}) {
  return (
    <div className="px-3 pb-3 pt-3.5 md:px-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[15px] font-semibold leading-none tracking-[-0.01em]" style={{ color: 'var(--text-primary)' }}>
              {title}
            </h2>
            <CountPill value={count} />
            {continuedOpenCount ? (
              <span
                className="inline-flex h-5 items-center rounded-md border px-1.5 text-[11px] font-medium"
                title={`${continuedOpenCount} open ${continuedOpenCount === 1 ? 'item has' : 'items have'} continued from earlier days.`}
                style={{
                  borderColor: 'rgba(217,169,78,0.18)',
                  background: 'color-mix(in srgb, var(--md-accent-glow) 26%, transparent)',
                  color: 'color-mix(in srgb, var(--md-accent) 82%, var(--text-secondary))',
                }}
              >
                {continuedOpenCount} from earlier
              </span>
            ) : null}
          </div>
          <p className="mt-1.5 text-[12px]" style={{ color: 'var(--text-muted)' }}>
            {subtitle}
          </p>
        </div>
        {metrics && metrics.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 lg:justify-end">
            {metrics.map((metric) => (
              <DeskMetric key={metric.label} {...metric} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function SectionTitle({ section }: { section: DeskRhythmSection }) {
  const isActive = section.tone === 'active';
  const isDecision = section.tone === 'decision';
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2.5">
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
        style={{
          background: isActive
            ? 'rgba(6,182,212,0.12)'
            : isDecision
            ? 'color-mix(in srgb, var(--md-accent-glow) 58%, transparent)'
            : section.quiet
            ? 'transparent'
            : 'color-mix(in srgb, var(--bg-secondary) 82%, transparent)',
          color: isActive ? 'var(--accent)' : isDecision ? 'var(--md-accent)' : 'var(--text-secondary)',
          border: section.quiet ? '1px solid var(--border)' : '1px solid color-mix(in srgb, var(--border) 70%, transparent)',
        }}
      >
        {section.icon}
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-[13px] font-semibold leading-none tracking-[-0.01em]" style={{ color: 'var(--text-primary)' }}>
            {section.title}
          </h3>
          <CountPill value={section.items.length} subtle={section.quiet} />
        </div>
        <p className="mt-1 hidden truncate text-[11px] sm:block" style={{ color: 'var(--text-muted)' }}>
          {section.subtitle}
        </p>
      </div>
    </div>
  );
}

export function DeskCardRow({
  item,
  selected,
  readOnly,
  onSelect,
  onStatusChange,
}: {
  item: ManagerDeskItem;
  selected: boolean;
  readOnly: boolean;
  onSelect: (item: ManagerDeskItem) => void;
  onStatusChange?: (itemId: number, status: ManagerDeskStatus) => void;
}) {
  return (
    <DeskItemCard
      item={item}
      onSelect={() => onSelect(item)}
      onStatusChange={onStatusChange ? (status) => onStatusChange(item.id, status) : undefined}
      variant={getCardVariant(item)}
      selected={selected}
      readOnly={readOnly}
    />
  );
}

export function CountPill({ value, subtle = false }: { value: number; subtle?: boolean }) {
  return (
    <span
      className="inline-flex h-5 items-center rounded-md border px-1.5 font-mono text-[11px] font-semibold tabular-nums"
      style={{
        borderColor: 'var(--border)',
        background: subtle ? 'transparent' : 'color-mix(in srgb, var(--bg-secondary) 86%, transparent)',
        color: subtle ? 'var(--text-muted)' : 'var(--text-secondary)',
      }}
    >
      {value}
    </span>
  );
}

function DeskMetric({
  label,
  value,
  tone = 'calm',
}: {
  label: string;
  value: number;
  tone?: 'active' | 'decision' | 'calm';
}) {
  const color = tone === 'active' ? 'var(--accent)' : tone === 'decision' ? 'var(--md-accent)' : 'var(--text-secondary)';
  const background = tone === 'active'
    ? 'rgba(6,182,212,0.08)'
    : tone === 'decision'
    ? 'color-mix(in srgb, var(--md-accent-glow) 42%, transparent)'
    : 'color-mix(in srgb, var(--bg-secondary) 58%, transparent)';

  return (
    <span
      className="inline-flex h-7 items-center gap-1.5 rounded-lg border px-2 text-[11px] font-semibold uppercase tracking-[0.08em]"
      style={{ background, borderColor: 'color-mix(in srgb, var(--border) 78%, transparent)', color }}
    >
      <span>{label}</span>
      <span className="font-mono tabular-nums">{value}</span>
    </span>
  );
}

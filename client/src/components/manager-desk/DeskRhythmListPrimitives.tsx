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
}

export function DeskRhythmHeader({
  title,
  subtitle,
  count,
  continuedOpenCount,
}: {
  title: string;
  subtitle: string;
  count: number;
  continuedOpenCount?: number;
}) {
  return (
    <div className="border-b px-3 py-3" style={{ borderColor: 'var(--border)' }}>
      <div className="flex min-h-8 flex-wrap items-center gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-[13px] font-semibold leading-none" style={{ color: 'var(--text-primary)' }}>
              {title}
            </h2>
            <CountPill value={count} />
            {continuedOpenCount ? (
              <span
                className="inline-flex h-5 items-center rounded-md border px-1.5 text-[10px] font-medium"
                title={`${continuedOpenCount} open ${continuedOpenCount === 1 ? 'item has' : 'items have'} continued from earlier days.`}
                style={{
                  borderColor: 'rgba(217,169,78,0.18)',
                  background: 'color-mix(in srgb, var(--md-accent-glow) 26%, transparent)',
                  color: 'color-mix(in srgb, var(--md-accent) 82%, var(--text-secondary))',
                }}
              >
                {continuedOpenCount} carried
              </span>
            ) : null}
          </div>
          <p className="mt-1 hidden text-[11px] md:block" style={{ color: 'var(--text-muted)' }}>
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
}

export function SectionTitle({ section }: { section: DeskRhythmSection }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
        style={{
          background: section.quiet ? 'var(--bg-secondary)' : 'color-mix(in srgb, var(--md-accent-glow) 38%, transparent)',
          color: section.quiet ? 'var(--text-secondary)' : 'var(--md-accent)',
        }}
      >
        {section.icon}
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-[12px] font-semibold leading-none" style={{ color: 'var(--text-primary)' }}>
            {section.title}
          </h3>
          <CountPill value={section.items.length} subtle={section.quiet} />
        </div>
        <p className="mt-1 hidden truncate text-[10px] sm:block" style={{ color: 'var(--text-muted)' }}>
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
      className="inline-flex h-5 items-center rounded-md border px-1.5 font-mono text-[10px] font-semibold tabular-nums"
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

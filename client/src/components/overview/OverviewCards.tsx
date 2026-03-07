import { useOverview } from '@/hooks/useOverview';
import { OverviewCard } from './OverviewCard';
import { CARD_CONFIGS } from '@/lib/constants';
import type { FilterType, OverviewCounts } from '@/types';

interface OverviewCardsProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

export function OverviewCards({ activeFilter, onFilterChange }: OverviewCardsProps) {
  const { data, isLoading } = useOverview();

  if (isLoading || !data) {
    return (
      <div className="px-2 pt-1.5 md:px-2.5 md:pt-2">
        <div className="dashboard-panel-soft rounded-[16px] p-1.5 md:p-2" style={{ borderColor: 'var(--border-strong)' }}>
          <div className="grid grid-cols-2 gap-1.5 md:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-[50px] rounded-[12px] animate-pulse"
                style={{ background: 'var(--bg-secondary)' }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-2 pt-1.5 md:px-2.5 md:pt-2">
      <div className="dashboard-panel rounded-[16px] p-1.5 md:p-2" style={{ borderColor: 'var(--border-strong)' }}>
        <div className="grid grid-cols-2 gap-1.5 md:grid-cols-3 xl:grid-cols-6">
          {CARD_CONFIGS.map((card, i) => (
            <OverviewCard
              key={card.key}
              label={card.label}
              count={data[card.key as keyof OverviewCounts] as number}
              color={card.color}
              isActive={activeFilter === card.filter}
              onClick={() => onFilterChange(card.filter)}
              delay={i}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

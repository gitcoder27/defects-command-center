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
      <div className="px-2 pt-2 md:px-3 md:pt-3">
        <div className="dashboard-panel-soft rounded-[22px] p-2.5 md:p-3" style={{ borderColor: 'var(--border-strong)' }}>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-[62px] rounded-[18px] animate-pulse"
                style={{ background: 'var(--bg-secondary)' }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-2 pt-2 md:px-3 md:pt-3">
      <div className="dashboard-panel rounded-[22px] p-2.5 md:p-3" style={{ borderColor: 'var(--border-strong)' }}>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
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

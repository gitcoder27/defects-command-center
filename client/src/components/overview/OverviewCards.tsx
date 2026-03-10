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
      <div className="px-2.5 pt-2 pb-1.5 border-b" style={{ borderColor: 'var(--border)' }}>
        <div
          className="flex gap-1.5 overflow-x-auto no-scrollbar"
          data-testid="overview-cards-strip"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-[48px] min-w-[100px] flex-1 rounded-[10px] animate-pulse md:min-w-0"
              style={{ background: 'var(--bg-secondary)' }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-2.5 pt-2 pb-1.5 border-b" style={{ borderColor: 'var(--border)' }}>
      <div
        className="flex gap-1.5 overflow-x-auto no-scrollbar"
        data-testid="overview-cards-strip"
      >
        {CARD_CONFIGS.map((card, i) => (
          <div key={card.key} className="min-w-[100px] flex-1 md:min-w-0">
            <OverviewCard
              label={card.label}
              count={data[card.key as keyof OverviewCounts] as number}
              color={card.color}
              isActive={activeFilter === card.filter}
              onClick={() => onFilterChange(card.filter)}
              delay={i}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

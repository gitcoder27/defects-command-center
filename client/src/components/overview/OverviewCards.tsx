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
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 px-5 py-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-[80px] rounded-lg animate-pulse"
            style={{ background: 'var(--bg-secondary)' }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 px-5 py-3">
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
  );
}

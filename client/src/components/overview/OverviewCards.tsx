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
          <div
            className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar"
            data-testid="overview-cards-strip"
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-[56px] min-w-[108px] flex-1 rounded-[12px] animate-pulse md:min-w-0"
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
        <div
          className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar"
          data-testid="overview-cards-strip"
        >
          {CARD_CONFIGS.map((card, i) => (
            <div key={card.key} className="min-w-[108px] flex-1 md:min-w-0">
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
    </div>
  );
}

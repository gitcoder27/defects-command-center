import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { ManagerDeskItem, ManagerDeskStatus } from '@/types/manager-desk';
import { DeskItemCardContent } from './DeskItemCardContent';
import {
  getIsOverdue,
  type DeskItemVariant,
} from './DeskItemCardPrimitives';
import { MANAGER_DESK_CARD_LAYOUT_TRANSITION } from './motion';

interface Props {
  item: ManagerDeskItem;
  onSelect: () => void;
  onStatusChange?: (status: ManagerDeskStatus) => void;
  variant?: DeskItemVariant;
  selected?: boolean;
  readOnly?: boolean;
}

export function DeskItemCard({
  item,
  onSelect,
  onStatusChange,
  variant = 'default',
  selected = false,
  readOnly = false,
}: Props) {
  const isDone = item.status === 'done' || item.status === 'cancelled';
  const isOverdue = useMemo(() => getIsOverdue(item), [item]);
  const cardSurface = useMemo(() => getCardSurface(item, isOverdue), [isOverdue, item]);
  const borderAccent = getBorderAccent(item, variant);

  return (
    <motion.div
      layout="position"
      transition={{ layout: MANAGER_DESK_CARD_LAYOUT_TRANSITION }}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect();
        }
      }}
      className="group relative cursor-pointer rounded-lg border px-3 py-2 transition-[background-color,border-color,box-shadow,opacity,transform] duration-150 active:scale-[0.995]"
      role="button"
      tabIndex={0}
      aria-label={`Open ${item.title}`}
      style={{
        background: cardSurface.background,
        borderTopColor: selected ? 'var(--md-accent)' : cardSurface.border,
        borderRightColor: selected ? 'var(--md-accent)' : cardSurface.border,
        borderBottomColor: selected ? 'var(--md-accent)' : cardSurface.border,
        borderLeftColor: borderAccent,
        borderLeftStyle: 'solid',
        borderLeftWidth: 3,
        opacity: isDone ? 0.68 : 1,
        boxShadow: selected
          ? 'inset 0 0 0 1px color-mix(in srgb, var(--md-accent) 72%, transparent), 0 10px 24px rgba(15,23,42,0.10)'
          : undefined,
      }}
    >
      <DeskItemCardContent
        item={item}
        variant={variant}
        isDone={isDone}
        isOverdue={isOverdue}
        readOnly={readOnly}
        onStatusChange={onStatusChange}
      />
    </motion.div>
  );
}

function getCardSurface(item: ManagerDeskItem, isOverdue: boolean) {
  if (item.status === 'in_progress') {
    return {
      background:
        'linear-gradient(135deg, color-mix(in srgb, var(--md-accent-glow) 52%, var(--bg-tertiary) 48%) 0%, var(--bg-tertiary) 80%)',
      border: 'color-mix(in srgb, var(--md-accent) 24%, var(--border))',
    };
  }
  if (isOverdue) {
    return {
      background: 'linear-gradient(135deg, rgba(239,68,68,0.07) 0%, var(--bg-tertiary) 58%)',
      border: 'rgba(239,68,68,0.24)',
    };
  }
  return {
    background: 'var(--bg-tertiary)',
    border: 'var(--border)',
  };
}

function getBorderAccent(item: ManagerDeskItem, variant: DeskItemVariant) {
  if (variant === 'meeting') return 'var(--info)';
  if (variant === 'waiting') return 'var(--warning)';
  if (variant === 'completed') return 'var(--success)';
  if (item.status === 'in_progress') return 'var(--accent)';
  if (item.status === 'planned') return 'var(--md-accent)';
  return 'var(--border)';
}

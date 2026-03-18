import { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Activity, Zap, UserMinus, Briefcase, Loader2 } from 'lucide-react';
import type {
  TrackerAttentionItem,
  TrackerAttentionQuickAction,
  TrackerDeveloperStatus,
} from '@/types';
import { useToast } from '@/context/ToastContext';
import { useStatusUpdate, useSetCurrentItem, useUpdateAvailability } from '@/hooks/useTeamTrackerMutations';
import { StatusUpdateSheet } from './StatusUpdateSheet';
import { SetCurrentMenu } from './SetCurrentMenu';

interface AttentionCardQuickActionsProps {
  item: TrackerAttentionItem;
  date: string;
  onMarkInactive: () => void;
  onCaptureFollowUp: () => void;
}

const actionMeta: Record<TrackerAttentionQuickAction, { label: string; icon: typeof Activity; accent: string; bg: string }> = {
  update_status: { label: 'Status', icon: Activity, accent: 'var(--accent)', bg: 'color-mix(in srgb, var(--accent) 10%, transparent)' },
  set_current: { label: 'Set Current', icon: Zap, accent: 'var(--success)', bg: 'rgba(16,185,129,0.08)' },
  mark_inactive: { label: 'Inactive', icon: UserMinus, accent: 'var(--warning)', bg: 'rgba(245,158,11,0.08)' },
  capture_follow_up: { label: 'Follow-Up', icon: Briefcase, accent: 'var(--md-accent)', bg: 'rgba(217,169,78,0.08)' },
};

export function AttentionCardQuickActions({
  item,
  date,
  onMarkInactive,
  onCaptureFollowUp,
}: AttentionCardQuickActionsProps) {
  const { addToast } = useToast();
  const statusUpdate = useStatusUpdate(date);
  const setCurrent = useSetCurrentItem(date);

  const [showStatusSheet, setShowStatusSheet] = useState(false);
  const [showSetCurrentMenu, setShowSetCurrentMenu] = useState(false);

  const actions = item.availableQuickActions;
  if (actions.length === 0) return null;

  const handleStatusSubmit = useCallback(
    (params: {
      status: TrackerDeveloperStatus;
      rationale?: string;
      summary?: string;
      nextFollowUpAt?: string | null;
    }) => {
      statusUpdate.mutate(
        { accountId: item.developer.accountId, ...params },
        {
          onSuccess: () => {
            addToast({ type: 'success', title: 'Status updated', message: `${item.developer.displayName} → ${params.status.replace(/_/g, ' ')}` });
            setShowStatusSheet(false);
          },
          onError: (err) => addToast({ type: 'error', title: 'Status update failed', message: err.message }),
        },
      );
    },
    [addToast, item.developer.accountId, item.developer.displayName, statusUpdate],
  );

  const handleSetCurrent = useCallback(
    (itemId: number) => {
      setCurrent.mutate(itemId, {
        onSuccess: () => {
          addToast({ type: 'success', title: 'Current work set', message: `Updated for ${item.developer.displayName}` });
          setShowSetCurrentMenu(false);
        },
        onError: (err) => addToast({ type: 'error', title: 'Failed to set current', message: err.message }),
      });
    },
    [addToast, item.developer.displayName, setCurrent],
  );

  const handleActionClick = useCallback(
    (e: React.MouseEvent, action: TrackerAttentionQuickAction) => {
      e.stopPropagation();
      e.preventDefault();

      switch (action) {
        case 'update_status':
          setShowStatusSheet(true);
          break;
        case 'set_current':
          if (item.setCurrentCandidates.length === 1) {
            handleSetCurrent(item.setCurrentCandidates[0]!.id);
          } else {
            setShowSetCurrentMenu((prev) => !prev);
          }
          break;
        case 'mark_inactive':
          onMarkInactive();
          break;
        case 'capture_follow_up':
          onCaptureFollowUp();
          break;
      }
    },
    [handleSetCurrent, item.setCurrentCandidates, onMarkInactive, onCaptureFollowUp],
  );

  const isPendingAction = (action: TrackerAttentionQuickAction): boolean => {
    if (action === 'update_status') return statusUpdate.isPending;
    if (action === 'set_current') return setCurrent.isPending;
    return false;
  };

  return (
    <>
      {/* Actions strip */}
      <div
        className="flex items-center gap-1 pt-2 mt-2"
        style={{ borderTop: '1px solid color-mix(in srgb, var(--border) 60%, transparent)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {actions.map((action) => {
          const meta = actionMeta[action];
          const Icon = meta.icon;
          const pending = isPendingAction(action);

          return (
            <div key={action} className="relative">
              <button
                type="button"
                disabled={pending}
                onClick={(e) => handleActionClick(e, action)}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold transition-all disabled:opacity-50"
                style={{
                  color: meta.accent,
                  background: meta.bg,
                  border: `1px solid color-mix(in srgb, ${meta.accent} 14%, transparent)`,
                }}
                onMouseEnter={(e) => {
                  if (!pending) {
                    (e.currentTarget as HTMLElement).style.background = `color-mix(in srgb, ${meta.accent} 18%, transparent)`;
                    (e.currentTarget as HTMLElement).style.borderColor = `color-mix(in srgb, ${meta.accent} 28%, transparent)`;
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = meta.bg;
                  (e.currentTarget as HTMLElement).style.borderColor = `color-mix(in srgb, ${meta.accent} 14%, transparent)`;
                }}
                title={meta.label}
                data-testid={`quick-action-${action}`}
              >
                {pending ? <Loader2 size={11} className="animate-spin" /> : <Icon size={11} />}
                <span className="hidden sm:inline">{meta.label}</span>
              </button>

              {/* Set Current menu */}
              {action === 'set_current' && showSetCurrentMenu && item.setCurrentCandidates.length > 1 && (
                <SetCurrentMenu
                  candidates={item.setCurrentCandidates}
                  isPending={setCurrent.isPending}
                  onSelect={handleSetCurrent}
                  onClose={() => setShowSetCurrentMenu(false)}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Status update dialog */}
      <AnimatePresence>
        {showStatusSheet && (
          <StatusUpdateSheet
            developerName={item.developer.displayName}
            currentStatus={item.status}
            isPending={statusUpdate.isPending}
            onSubmit={handleStatusSubmit}
            onClose={() => setShowStatusSheet(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

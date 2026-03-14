import { AlertTriangle, Loader2, X } from 'lucide-react';
import { ItemDetailDrawer } from '@/components/manager-desk/ItemDetailDrawer';
import {
  useDeleteManagerDeskItem,
  useTrackerSharedTaskDetail,
  useUpdateManagerDeskItem,
} from '@/hooks/useManagerDesk';
import { useSetCurrentItem, useUpdateTrackerItem } from '@/hooks/useTeamTrackerMutations';
import { TrackerTaskExecutionPanel } from './TrackerTaskExecutionPanel';

interface TrackerTaskDetailDrawerProps {
  trackerItemId: number | null;
  initialManagerDeskItemId: number | null;
  onClose: () => void;
}

export function TrackerTaskDetailDrawer({
  trackerItemId,
  initialManagerDeskItemId,
  onClose,
}: TrackerTaskDetailDrawerProps) {
  const detailQuery = useTrackerSharedTaskDetail({
    trackerItemId,
    managerDeskItemId: initialManagerDeskItemId,
  });
  const detail = detailQuery.data;
  const detailDate = detail?.date ?? '';
  const updateManagerDeskItem = useUpdateManagerDeskItem(detailDate);
  const deleteManagerDeskItem = useDeleteManagerDeskItem(detailDate);
  const updateTrackerItem = useUpdateTrackerItem(detailDate);
  const setCurrentItem = useSetCurrentItem(detailDate);
  const isOpen = trackerItemId !== null || initialManagerDeskItemId !== null;

  if (!isOpen) {
    return null;
  }

  return (
    <ItemDetailDrawer
      item={detail?.managerDeskItem ?? null}
      open={isOpen}
      date={detailDate}
      onClose={onClose}
      ariaLabel="Team Tracker task detail"
      showLinkedIssueDescription={false}
      onUpdate={(managerDeskItemId, updates) =>
        updateManagerDeskItem.mutate({ itemId: managerDeskItemId, ...updates })
      }
      onDelete={(managerDeskItemId) =>
        deleteManagerDeskItem.mutate(managerDeskItemId, { onSuccess: onClose })
      }
      topSlot={
        detail ? (
          <TrackerTaskExecutionPanel
            developer={detail.developer}
            item={detail.trackerItem}
            isPending={updateTrackerItem.isPending || setCurrentItem.isPending}
            onSetCurrent={(trackerItemId) => setCurrentItem.mutate(trackerItemId)}
            onUpdateState={(trackerItemId, state) => updateTrackerItem.mutate({ itemId: trackerItemId, state })}
            onUpdateNote={(trackerItemId, note) =>
              updateTrackerItem.mutateAsync({ itemId: trackerItemId, note }).then(() => undefined)
            }
          />
        ) : null
      }
      placeholder={
        <TrackerTaskDetailPlaceholder
          isLoading={detailQuery.isLoading || (!detail && !detailQuery.isError)}
          errorMessage={detailQuery.isError ? (detailQuery.error as Error).message : null}
          onClose={onClose}
          onRetry={() => void detailQuery.refetch()}
        />
      }
    />
  );
}

function TrackerTaskDetailPlaceholder({
  isLoading,
  errorMessage,
  onClose,
  onRetry,
}: {
  isLoading: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div
        className="shrink-0 border-b px-4 pb-4 pt-3 md:px-5"
        style={{
          borderColor: 'var(--border)',
          background:
            'linear-gradient(180deg, color-mix(in srgb, var(--bg-primary) 94%, var(--md-accent-dim) 6%) 0%, color-mix(in srgb, var(--bg-secondary) 88%, transparent) 100%)',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: 'var(--md-accent)' }}>
              Item Detail
            </div>
            <div className="mt-2 text-[20px] font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
              {isLoading ? 'Opening task detail' : 'Could not open task detail'}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            aria-label="Close item detail"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center p-6 md:p-8">
        <div
          className="w-full max-w-md rounded-[24px] border px-5 py-6"
          style={{
            background:
              'linear-gradient(180deg, color-mix(in srgb, var(--bg-elevated) 72%, transparent) 0%, color-mix(in srgb, var(--bg-secondary) 88%, transparent) 100%)',
            borderColor: 'var(--border)',
            boxShadow: 'var(--soft-shadow)',
          }}
        >
          <div className="flex items-start gap-3">
            {isLoading ? (
              <Loader2 size={16} className="mt-0.5 animate-spin" style={{ color: 'var(--accent)' }} />
            ) : (
              <AlertTriangle size={16} className="mt-0.5" style={{ color: 'var(--warning)' }} />
            )}
            <div className="min-w-0">
              <div className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                {isLoading ? 'Loading task detail' : 'Task detail is unavailable'}
              </div>
              <div className="mt-1 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                {isLoading
                  ? 'Pulling the shared Manager Desk task and execution context.'
                  : errorMessage}
              </div>
            </div>
          </div>
          {!isLoading ? (
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={onRetry}
                className="rounded-xl px-3 py-1.5 text-[11px] font-semibold"
                style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}
              >
                Retry
              </button>
              <button
                type="button"
                onClick={onClose}
                className="text-[11px]"
                style={{ color: 'var(--text-muted)' }}
              >
                Close
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

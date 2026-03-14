import { AlertTriangle, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
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
  const [managerDeskItemId, setManagerDeskItemId] = useState<number | null>(initialManagerDeskItemId);
  const detailQuery = useTrackerSharedTaskDetail({
    trackerItemId,
    managerDeskItemId,
  });
  const detail = detailQuery.data;
  const detailDate = detail?.date ?? '';
  const updateManagerDeskItem = useUpdateManagerDeskItem(detailDate);
  const deleteManagerDeskItem = useDeleteManagerDeskItem(detailDate);
  const updateTrackerItem = useUpdateTrackerItem(detailDate);
  const setCurrentItem = useSetCurrentItem(detailDate);
  const isOpen = trackerItemId !== null || managerDeskItemId !== null;

  useEffect(() => {
    setManagerDeskItemId(initialManagerDeskItemId);
  }, [initialManagerDeskItemId, trackerItemId]);

  useEffect(() => {
    if (detail?.managerDeskItem.id) {
      setManagerDeskItemId(detail.managerDeskItem.id);
    }
  }, [detail?.managerDeskItem.id]);

  if (!isOpen) {
    return null;
  }

  if (detailQuery.isError) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center" style={{ background: 'rgba(2, 6, 23, 0.46)', backdropFilter: 'blur(3px)' }}>
        <div
          className="w-full max-w-md rounded-[24px] border p-5"
          style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-3">
            <AlertTriangle size={16} style={{ color: 'var(--warning)' }} />
            <div>
              <div className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                Could not open task detail
              </div>
              <div className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                {(detailQuery.error as Error).message}
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => void detailQuery.refetch()}
              className="rounded-xl px-3 py-1.5 text-[11px] font-semibold"
              style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}
            >
              Retry
            </button>
            <button type="button" onClick={onClose} className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (detailQuery.isLoading || !detail) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center" style={{ background: 'rgba(2, 6, 23, 0.46)', backdropFilter: 'blur(3px)' }}>
        <div
          className="flex w-full max-w-md items-center gap-3 rounded-[24px] border px-5 py-4"
          style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}
        >
          <Loader2 size={16} className="animate-spin" style={{ color: 'var(--accent)' }} />
          <div>
            <div className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              Loading task detail
            </div>
            <div className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
              Pulling the shared Manager Desk task and execution context.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ItemDetailDrawer
      item={detail.managerDeskItem}
      open
      date={detail.date}
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
      }
    />
  );
}

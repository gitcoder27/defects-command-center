import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import type {
  ManagerDeskCreateItemPayload,
  ManagerDeskItem,
  TodayActionCommand,
  TodayActionTarget,
  TodayResponse,
  TrackerCheckIn,
} from '@/types';
import type { AppView } from '@/App';

interface UseTodayActionsOptions {
  date: string;
  onOpenTarget: (target: TodayActionTarget) => void;
  onViewChange: (view: AppView) => void;
}

type TodayActionVariables = {
  command: TodayActionCommand;
  title?: string;
  preset?: 'later_today' | 'tomorrow' | 'next_week';
  summary?: string;
};

export function useTodayActions({ date, onOpenTarget, onViewChange }: UseTodayActionsOptions) {
  const qc = useQueryClient();
  const { addToast } = useToast();

  const invalidateToday = () => {
    qc.invalidateQueries({ queryKey: ['today'] });
    qc.invalidateQueries({ queryKey: ['manager-desk'] });
    qc.invalidateQueries({ queryKey: ['team-tracker'] });
    qc.invalidateQueries({ queryKey: ['workload'] });
  };

  const removeTargetOptimistically = (target: TodayActionTarget) => {
    qc.setQueryData<TodayResponse>(['today', date], (current) => {
      if (!current) {
        return current;
      }

      const matchesTarget = (itemTarget: TodayActionTarget) =>
        itemTarget.managerDeskItemId === target.managerDeskItemId &&
        itemTarget.developerAccountId === target.developerAccountId &&
        itemTarget.issueKey === target.issueKey &&
        itemTarget.trackerItemId === target.trackerItemId &&
        itemTarget.type === target.type;

      const actionItems = current.actionItems.filter((item) => !matchesTarget(item.target));
      return {
        ...current,
        currentPriority: current.currentPriority && matchesTarget(current.currentPriority.target)
          ? actionItems[0]
          : current.currentPriority,
        actionItems,
        promises: current.promises.filter((item) => !matchesTarget(item.target)),
        meetingPrompts: current.meetingPrompts.filter((item) => !matchesTarget(item.target)),
      };
    });
  };

  const mutation = useMutation({
    mutationFn: async ({ command, preset, summary }: TodayActionVariables) => {
      const { target } = command;

      if (command.kind === 'open' || command.kind === 'assign_owner' || command.kind === 'ask_check_in') {
        onOpenTarget(target);
        return { label: command.label, skipToast: true };
      }

      if (command.kind === 'mark_done' && target.managerDeskItemId) {
        return api.patch<ManagerDeskItem>(`/manager-desk/items/${target.managerDeskItemId}`, { status: 'done' });
      }

      if (command.kind === 'snooze' && target.managerDeskItemId) {
        return api.patch<ManagerDeskItem>(`/manager-desk/items/${target.managerDeskItemId}`, {
          followUpAt: buildSnoozeIso(date, preset ?? 'tomorrow'),
        });
      }

      if (command.kind === 'add_check_in' && target.developerAccountId) {
        if (!summary?.trim()) {
          return { cancelled: true };
        }
        return api.post<TrackerCheckIn>(`/team-tracker/${target.developerAccountId}/checkins`, {
          date,
          summary: summary.trim(),
        });
      }

      if (command.kind === 'capture_follow_up') {
        const title = window.prompt('Follow-up title', defaultFollowUpTitle(target));
        if (!title?.trim()) {
          return { cancelled: true };
        }
        return api.post<ManagerDeskItem>('/manager-desk/items', buildFollowUpPayload(date, target, title.trim()));
      }

      if (command.kind === 'carry_forward' && target.managerDeskItemId) {
        return api.post<{ created: number }>('/manager-desk/carry-forward', {
          fromDate: target.date ?? date,
          toDate: date,
          itemIds: [target.managerDeskItemId],
        });
      }

      if (command.kind === 'capture_meeting_outcome' && target.managerDeskItemId) {
        const outcome = window.prompt('Meeting outcome');
        if (!outcome?.trim()) {
          return { cancelled: true };
        }
        return api.patch<ManagerDeskItem>(`/manager-desk/items/${target.managerDeskItemId}`, {
          outcome: outcome.trim(),
          status: 'done',
        });
      }

      onOpenTarget(target);
      return { label: command.label, skipToast: true };
    },
    onMutate: ({ command }) => {
      if (command.kind === 'mark_done' || command.kind === 'snooze' || command.kind === 'carry_forward' || command.kind === 'capture_meeting_outcome') {
        removeTargetOptimistically(command.target);
      }
    },
    onSuccess: (result, variables) => {
      invalidateToday();
      if (result && 'cancelled' in result) {
        return;
      }
      if (result && 'skipToast' in result) {
        return;
      }
      addToast(actionToastTitle(variables.command.kind), 'success');
    },
    onError: (error, variables) => {
      invalidateToday();
      if (variables.command.kind === 'open') {
        onViewChange(variables.command.target.view as AppView);
        return;
      }
      addToast(error.message, 'error');
    },
  });

  return {
    runAction: (command: TodayActionCommand, preset?: TodayActionVariables['preset'], summary?: string) =>
      mutation.mutate({ command, preset, summary }),
    isPending: mutation.isPending,
    pendingKind: mutation.variables?.command.kind,
    pendingTarget: mutation.variables?.command.target,
  };
}

function buildSnoozeIso(date: string, preset: NonNullable<TodayActionVariables['preset']>): string {
  const base = new Date(`${date}T09:00:00`);
  if (preset === 'later_today') {
    base.setHours(17, 0, 0, 0);
    return base.toISOString();
  }
  if (preset === 'next_week') {
    base.setDate(base.getDate() + 7);
    return base.toISOString();
  }
  base.setDate(base.getDate() + 1);
  return base.toISOString();
}

function buildFollowUpPayload(date: string, target: TodayActionTarget, title: string): ManagerDeskCreateItemPayload {
  const links: ManagerDeskCreateItemPayload['links'] = [];
  if (target.developerAccountId) {
    links.push({ linkType: 'developer', developerAccountId: target.developerAccountId });
  }
  if (target.issueKey) {
    links.push({ linkType: 'issue', issueKey: target.issueKey });
  }

  return {
    date,
    title,
    kind: 'action',
    category: 'follow_up',
    status: 'planned',
    priority: 'medium',
    contextNote: target.trackerItemId ? `Tracker item ${target.trackerItemId}` : undefined,
    links,
  };
}

function defaultFollowUpTitle(target: TodayActionTarget): string {
  if (target.issueKey) {
    return `Follow up on ${target.issueKey}`;
  }
  if (target.developerAccountId) {
    return 'Follow up with developer';
  }
  return 'Follow up';
}

function actionToastTitle(kind: TodayActionCommand['kind']): string {
  if (kind === 'mark_done') return 'Marked done';
  if (kind === 'snooze') return 'Snoozed';
  if (kind === 'add_check_in') return 'Check-in added';
  if (kind === 'capture_follow_up') return 'Follow-up captured';
  if (kind === 'carry_forward') return 'Carried forward';
  if (kind === 'capture_meeting_outcome') return 'Outcome captured';
  return 'Updated';
}

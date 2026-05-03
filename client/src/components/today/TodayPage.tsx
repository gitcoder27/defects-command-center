import { useMemo, useState } from 'react';
import type { AppView } from '@/App';
import { useToday } from '@/hooks/useToday';
import { useTodayActions } from '@/hooks/useTodayActions';
import { getLocalIsoDate } from '@/lib/utils';
import type { FilterType, TodayActionCommand, TodayActionTarget, TodayResponse } from '@/types';
import { TodayActionQueue } from './TodayActionQueue';
import { TodayCheckInDialog } from './TodayCheckInDialog';
import { TodayCommandFooter } from './TodayCommandFooter';
import { TodayCurrentPriority } from './TodayCurrentPriority';
import { TodayPeoplePulse } from './TodayPeoplePulse';
import { TodayRhythmHeader } from './TodayRhythmHeader';
import { TodayRhythmRail } from './TodayRhythmRail';
import { TodayTextCaptureDialog } from './TodayTextCaptureDialog';

interface TodayPageProps {
  onViewChange: (view: AppView) => void;
  onSelectWorkFilter?: (filter: FilterType) => void;
  onOpenTodayTarget?: (target: TodayActionTarget) => void;
}

export function TodayPage({ onViewChange, onSelectWorkFilter, onOpenTodayTarget }: TodayPageProps) {
  const date = getLocalIsoDate();
  const [checkInDraft, setCheckInDraft] = useState<{
    command: TodayActionCommand;
    developerName: string;
    defaultSummary: string;
  } | null>(null);
  const [textDraft, setTextDraft] = useState<{
    command: TodayActionCommand;
    title: string;
    description: string;
    label: string;
    defaultValue: string;
    saveLabel: string;
    multiline?: boolean;
  } | null>(null);
  const today = useToday(date);
  const snapshot = today.data;

  const openTarget = (target: TodayActionTarget) => {
    if (onOpenTodayTarget) {
      onOpenTodayTarget(target);
      return;
    }

    if (target.view === 'work' && target.filter && onSelectWorkFilter) {
      onSelectWorkFilter(target.filter);
      return;
    }

    onViewChange(target.view as AppView);
  };

  const actions = useTodayActions({ date, onOpenTarget: openTarget, onViewChange });
  const pendingTargetKey = useMemo(
    () => (actions.isPending ? targetKey(actions.pendingTarget) : undefined),
    [actions.isPending, actions.pendingTarget],
  );

  const runCommand = (command: TodayActionCommand, preset?: 'later_today' | 'tomorrow' | 'next_week') => {
    if (command.kind === 'add_check_in') {
      setCheckInDraft({
        command,
        developerName: getDeveloperName(snapshot, command.target),
        defaultSummary: buildDefaultCheckInSummary(snapshot, command.target),
      });
      return;
    }

    if (command.kind === 'capture_follow_up') {
      setTextDraft({
        command,
        title: 'Capture follow-up',
        description: 'Save a Manager Desk follow-up without leaving Today.',
        label: 'Follow-up title',
        defaultValue: defaultFollowUpTitle(command.target),
        saveLabel: 'Save follow-up',
      });
      return;
    }

    if (command.kind === 'capture_meeting_outcome') {
      setTextDraft({
        command,
        title: 'Capture meeting outcome',
        description: 'Mark the meeting complete and save the outcome to Manager Desk.',
        label: 'Meeting outcome',
        defaultValue: '',
        saveLabel: 'Save outcome',
        multiline: true,
      });
      return;
    }

    actions.runAction(command, { preset });
  };

  return (
    <main
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, color-mix(in srgb, var(--bg-canvas) 96%, var(--accent) 4%), var(--bg-canvas))',
        ['--today-line' as string]: 'color-mix(in srgb, var(--border) 34%, transparent)',
        ['--today-line-strong' as string]: 'color-mix(in srgb, var(--border-strong) 24%, transparent)',
        ['--today-hover' as string]: 'color-mix(in srgb, var(--bg-tertiary) 34%, transparent)',
        ['--today-muted-panel' as string]: 'color-mix(in srgb, var(--bg-secondary) 20%, transparent)',
        ['--today-soft-panel' as string]: 'color-mix(in srgb, var(--bg-secondary) 38%, transparent)',
      }}
    >
      {snapshot ? (
        <>
          <TodayRhythmHeader
            today={snapshot}
            isFetching={today.isFetching}
            onRefresh={() => void today.refetch()}
            onOpenMetric={openTarget}
          />
          <TodayCurrentPriority
            item={snapshot.currentPriority}
            onRunAction={(item) => runCommand(item.primaryAction)}
          />
          <section className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
            <TodayActionQueue
              isLoading={today.isLoading}
              items={snapshot.actionItems}
              pendingTargetKey={pendingTargetKey}
              onRunCommand={runCommand}
            />
            <aside className="min-h-0 overflow-auto px-5 py-5 xl:px-8">
              <TodayPeoplePulse
                people={snapshot.teamPulse}
                onRunCommand={runCommand}
                onViewAll={() => onViewChange('team')}
              />
              <TodayRhythmRail
                promises={snapshot.promises}
                standupPrompts={snapshot.standupPrompts}
                meetingPrompts={snapshot.meetingPrompts}
                onRunCommand={runCommand}
              />
            </aside>
          </section>
        </>
      ) : (
        <TodayLoadingState isError={today.isError} onRetry={() => void today.refetch()} />
      )}

      <TodayCommandFooter onViewChange={onViewChange} onSelectWorkFilter={onSelectWorkFilter} />
      {checkInDraft ? (
        <TodayCheckInDialog
          developerName={checkInDraft.developerName}
          defaultSummary={checkInDraft.defaultSummary}
          isSaving={actions.isPending && actions.pendingKind === 'add_check_in'}
          onClose={() => setCheckInDraft(null)}
          onSave={(summary) => {
            actions.runAction(checkInDraft.command, { summary });
            setCheckInDraft(null);
          }}
        />
      ) : null}
      {textDraft ? (
        <TodayTextCaptureDialog
          title={textDraft.title}
          description={textDraft.description}
          label={textDraft.label}
          defaultValue={textDraft.defaultValue}
          saveLabel={textDraft.saveLabel}
          multiline={textDraft.multiline}
          isSaving={actions.isPending && actions.pendingKind === textDraft.command.kind}
          onClose={() => setTextDraft(null)}
          onSave={(value) => {
            actions.runAction(textDraft.command, {
              title: textDraft.command.kind === 'capture_follow_up' ? value : undefined,
              outcome: textDraft.command.kind === 'capture_meeting_outcome' ? value : undefined,
            });
            setTextDraft(null);
          }}
        />
      ) : null}
    </main>
  );
}

function TodayLoadingState({ isError, onRetry }: { isError: boolean; onRetry: () => void }) {
  return (
    <section className="flex min-h-0 flex-1 items-center justify-center px-5">
      <div className="text-center">
        <p className="text-[14px] font-medium" style={{ color: 'var(--text-primary)' }}>
          {isError ? 'Today could not load' : 'Loading Today'}
        </p>
        <p className="mt-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>
          {isError ? 'Retry the cockpit read model.' : 'Building the action queue.'}
        </p>
        {isError ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 rounded-md px-3 py-1.5 text-[12px] font-medium"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            Retry
          </button>
        ) : null}
      </div>
    </section>
  );
}

function targetKey(target?: TodayActionTarget): string | undefined {
  if (!target) {
    return undefined;
  }
  return [
    target.type,
    target.issueKey,
    target.developerAccountId,
    target.managerDeskItemId,
    target.trackerItemId,
  ].filter(Boolean).join(':');
}

function getDeveloperName(snapshot: TodayResponse | undefined, target: TodayActionTarget): string {
  if (!snapshot || !target.developerAccountId) {
    return 'developer';
  }

  const pulseMatch = snapshot.teamPulse.find((person) => person.accountId === target.developerAccountId);
  if (pulseMatch) {
    return pulseMatch.displayName;
  }

  const actionMatch = snapshot.actionItems.find((item) => item.target.developerAccountId === target.developerAccountId);
  return actionMatch?.title ?? 'developer';
}

function buildDefaultCheckInSummary(snapshot: TodayResponse | undefined, target: TodayActionTarget): string {
  if (!snapshot || !target.developerAccountId) {
    return '';
  }

  const actionMatch = snapshot.actionItems.find((item) => item.target.developerAccountId === target.developerAccountId);
  if (!actionMatch || actionMatch.type === 'calm') {
    return '';
  }

  return `Manager check-in: ${actionMatch.signal}`;
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

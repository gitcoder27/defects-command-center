import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@/context/ToastContext';
import { TodayPage } from '@/components/today/TodayPage';
import { createTestQueryClient } from '@/test/wrapper';
import type { TodayActionItem, TodayResponse } from '@/types';

function target(overrides = {}) {
  return { type: 'view', view: 'team', ...overrides } as const;
}

function command(kind: TodayActionItem['primaryAction']['kind'], label: string, actionTarget: TodayActionItem['target']) {
  return { kind, label, target: actionTarget };
}

function actionItem(index: number, overrides: Partial<TodayActionItem> = {}): TodayActionItem {
  const actionTarget = target({ type: 'issue', view: 'work', issueKey: `AM-${index}`, filter: 'overdue' });
  return {
    id: `action-${index}`,
    type: 'overdue_issue',
    title: `AM-${index} Issue ${index}`,
    context: 'Alice Smith / In Progress',
    signal: 'Overdue',
    severity: 'critical',
    priority: 90 - index,
    group: 'now',
    target: actionTarget,
    primaryAction: command('open', 'Open issue', actionTarget),
    secondaryActions: [command('capture_follow_up', 'Follow up', actionTarget)],
    ...overrides,
  };
}

function todayResponse(overrides: Partial<TodayResponse> = {}): TodayResponse {
  const followUpTarget = target({ type: 'follow_up', view: 'follow-ups', managerDeskItemId: 44, date: '2026-03-08' });
  const devTarget = target({ type: 'developer', view: 'team', developerAccountId: 'dev-1', date: '2026-03-08' });
  const actions = [
    actionItem(1),
    {
      ...actionItem(2, {
        id: 'follow-up-44',
        type: 'follow_up_due',
        title: 'Follow up with QA',
        context: 'QA',
        signal: 'Overdue follow-up',
        target: followUpTarget,
        primaryAction: command('mark_done', 'Done', followUpTarget),
        secondaryActions: [command('snooze', 'Snooze', followUpTarget), command('open', 'Open', followUpTarget)],
      }),
    },
    ...Array.from({ length: 9 }, (_, index) => actionItem(index + 3)),
  ] as TodayActionItem[];

  return {
    date: '2026-03-08',
    generatedAt: '2026-03-08T08:30:00.000Z',
    rhythm: { stage: 'morning_plan', label: 'Morning plan', detail: 'Set direction' },
    summary: [
      { id: 'attention', label: 'Attention', value: 11, detail: 'action rows', severity: 'warning' },
      { id: 'work', label: 'Active defects', value: 5, detail: 'in Work', severity: 'neutral' },
      { id: 'team', label: 'People', value: 1, detail: 'on team', severity: 'info', target: target() },
      { id: 'stale', label: 'Stale check-ins', value: 1, detail: 'need update', severity: 'warning' },
      { id: 'due', label: 'Due work', value: 3, detail: 'today or late', severity: 'warning' },
      { id: 'follow', label: 'Follow-ups', value: 1, detail: 'due now', severity: 'warning' },
    ],
    currentPriority: actions[0],
    actionItems: actions,
    teamPulse: [
      {
        accountId: 'dev-1',
        displayName: 'Alice Smith',
        initials: 'AS',
        status: 'Blocked',
        tone: 'critical',
        detail: 'Blocked',
        currentWork: 'No current work',
        lastUpdate: '1d ago',
        target: devTarget,
        primaryAction: command('add_check_in', 'Check-in', devTarget),
        secondaryActions: [command('capture_follow_up', 'Follow up', devTarget)],
      },
    ],
    promises: [
      {
        id: 'promise-44',
        title: 'Follow up with QA',
        detail: 'Overdue',
        severity: 'critical',
        target: followUpTarget,
        primaryAction: command('mark_done', 'Done', followUpTarget),
        secondaryActions: [command('snooze', 'Snooze', followUpTarget)],
      },
    ],
    standupPrompts: [],
    meetingPrompts: [],
    ...overrides,
  };
}

function mockFetch(response: TodayResponse) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/api/today')) {
      return new Response(JSON.stringify(response), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderToday(response = todayResponse(), onOpenTodayTarget = vi.fn()) {
  const queryClient = createTestQueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <TodayPage onViewChange={vi.fn()} onOpenTodayTarget={onOpenTodayTarget} />
      </ToastProvider>
    </QueryClientProvider>,
  );
  return { onOpenTodayTarget };
}

describe('TodayPage V2', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the action queue with a hard visible row limit', async () => {
    mockFetch(todayResponse());
    renderToday();

    expect(await screen.findByText('Action queue')).toBeInTheDocument();
    expect(screen.getAllByTestId('today-action-row')).toHaveLength(8);
    expect(screen.getByText('+3 more in the source workflows')).toBeInTheDocument();
  });

  it('opens the exact issue target from a row', async () => {
    mockFetch(todayResponse());
    const onOpenTodayTarget = vi.fn();
    renderToday(todayResponse(), onOpenTodayTarget);

    fireEvent.click(await screen.findByRole('button', { name: /open am-1/i }));

    await waitFor(() => {
      expect(onOpenTodayTarget).toHaveBeenCalledWith(expect.objectContaining({ issueKey: 'AM-1', view: 'work' }));
    });
  });

  it('marks a follow-up done through the existing Manager Desk endpoint', async () => {
    const fetchMock = mockFetch(todayResponse());
    renderToday();

    const doneButtons = await screen.findAllByRole('button', { name: /^Done$/i });
    fireEvent.click(doneButtons[0]!);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/manager-desk/items/44', expect.objectContaining({ method: 'PATCH' }));
    });
  });

  it('snoozes a follow-up from the secondary action menu', async () => {
    const fetchMock = mockFetch(todayResponse());
    renderToday();

    const moreActions = await screen.findAllByLabelText('More actions');
    const tomorrowButtons = screen.getAllByText('Tomorrow');
    fireEvent.click(moreActions[1]!);
    fireEvent.click(tomorrowButtons[0]!);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/manager-desk/items/44', expect.objectContaining({ method: 'PATCH' }));
    });
  });

  it('adds a developer check-in from People Pulse', async () => {
    const fetchMock = mockFetch(todayResponse());
    renderToday();

    fireEvent.click(await screen.findByRole('button', { name: /^Check-in$/i }));
    expect(await screen.findByText('Saves to Team / Alice Smith / Check-ins for today.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Check-in note'), { target: { value: 'Asked for update' } });
    fireEvent.click(screen.getByRole('button', { name: /save check-in/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/team-tracker/dev-1/checkins', expect.objectContaining({ method: 'POST' }));
    });
  });

  it('sets planned work current when Today chooses Set current for a developer', async () => {
    const setCurrentTarget = target({
      type: 'tracker_item',
      view: 'team',
      developerAccountId: 'dev-1',
      trackerItemId: 77,
      date: '2026-03-08',
    });
    const fetchMock = mockFetch(todayResponse({
      actionItems: [
        actionItem(1, {
          id: 'dev-set-current',
          type: 'developer_attention',
          title: 'Alice Smith',
          context: 'No current work',
          signal: 'No current item',
          target: setCurrentTarget,
          primaryAction: command('set_current_work', 'Set current', setCurrentTarget),
          secondaryActions: [],
        }),
      ],
    }));
    renderToday();

    fireEvent.click(await screen.findByRole('button', { name: /^Set current$/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/team-tracker/items/77/set-current', expect.objectContaining({ method: 'POST' }));
    });
  });

  it('does not leave Set current rows stuck in Working', async () => {
    const setCurrentTarget = target({
      type: 'tracker_item',
      view: 'team',
      developerAccountId: 'dev-1',
      trackerItemId: 77,
      date: '2026-03-08',
    });
    const response = todayResponse({
      actionItems: [
        actionItem(1, {
          id: 'dev-set-current',
          type: 'developer_attention',
          title: 'Alice Smith',
          context: 'No current work',
          signal: 'No current item',
          target: setCurrentTarget,
          primaryAction: command('set_current_work', 'Set current', setCurrentTarget),
          secondaryActions: [],
        }),
      ],
    });
    let resolveSetCurrent: (() => void) | undefined;
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/today')) {
        return new Response(JSON.stringify(response), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      if (url.includes('/api/team-tracker/items/77/set-current')) {
        await new Promise<void>((resolve) => {
          resolveSetCurrent = resolve;
        });
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } });
    }));
    renderToday();

    fireEvent.click(await screen.findByRole('button', { name: /^Set current$/i }));
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /^Set current$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^Working$/i })).not.toBeInTheDocument();
    });

    resolveSetCurrent?.();
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /^Working$/i })).not.toBeInTheDocument();
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { TestWrapper } from '@/test/wrapper';
import type { TeamTrackerBoardResponse, TrackerDeveloperDay, Issue } from '@/types';

const mockCarryForwardMutate = vi.fn();
const mockUpdateDayMutate = vi.fn();
const mockUpdateAvailabilityMutate = vi.fn();
const mockUpdateTrackerItemMutate = vi.fn();
const mockAddTrackerItemMutate = vi.fn();
const mockRefetchBoard = vi.fn();
const mockRefetchCarryForwardPreview = vi.fn();
let mockCarryForwardPreviewValue = 0;
let mockIssues: Issue[] = [];

function buildSignals(overrides?: {
  freshness?: Partial<TrackerDeveloperDay['signals']['freshness']>;
  risk?: Partial<TrackerDeveloperDay['signals']['risk']>;
}): TrackerDeveloperDay['signals'] {
  return {
    freshness: {
      staleThresholdHours: 4,
      noCurrentThresholdHours: 2,
      statusFollowUpThresholdHours: 2,
      staleByTime: false,
      staleWithOpenRisk: false,
      staleWithoutCurrentWork: false,
      statusChangeWithoutFollowUp: false,
      ...overrides?.freshness,
    },
    risk: {
      openRisk: false,
      overdueLinkedWork: false,
      overdueLinkedCount: 0,
      overCapacity: false,
      capacityDelta: 0,
      ...overrides?.risk,
    },
  };
}

const mockDay: (overrides?: Partial<TrackerDeveloperDay>) => TrackerDeveloperDay = (overrides = {}) => ({
  id: 1,
  date: '2026-03-07',
  developer: { accountId: 'dev-1', displayName: 'Alice Smith', isActive: true },
  availability: { state: 'active' },
  status: 'on_track',
  plannedItems: [],
  completedItems: [],
  droppedItems: [],
  checkIns: [],
  isStale: false,
  signals: buildSignals(),
  statusUpdatedAt: '2026-03-07T08:00:00Z',
  createdAt: '2026-03-07T08:00:00Z',
  updatedAt: '2026-03-07T08:00:00Z',
  ...overrides,
});

const mockBoard: TeamTrackerBoardResponse = {
  date: '2026-03-07',
  developers: [
    mockDay(),
    mockDay({
      id: 2,
      developer: { accountId: 'dev-2', displayName: 'Bob Jones', isActive: true },
      status: 'blocked',
      capacityUnits: 2,
      isStale: true,
      lastCheckInAt: '2026-03-07T07:00:00Z',
      statusUpdatedAt: '2026-03-07T08:30:00Z',
      signals: buildSignals({
        freshness: {
          staleByTime: true,
          staleWithOpenRisk: true,
          statusChangeWithoutFollowUp: true,
          hoursSinceCheckIn: 5,
          hoursSinceStatusChange: 3.5,
        },
        risk: {
          openRisk: true,
          overdueLinkedWork: true,
          overdueLinkedCount: 1,
          overCapacity: true,
          capacityDelta: 1,
        },
      }),
      currentItem: {
        id: 10,
        dayId: 2,
        itemType: 'jira',
        jiraKey: 'AM-123',
        jiraPriorityName: 'High',
        jiraDueDate: '2026-03-06',
        title: 'Fix login bug',
        state: 'in_progress',
        position: 0,
        createdAt: '2026-03-07T08:00:00Z',
        updatedAt: '2026-03-07T08:00:00Z',
      },
      plannedItems: [
        {
          id: 11,
          dayId: 2,
          itemType: 'custom',
          title: 'Code review',
          state: 'planned',
          position: 1,
          createdAt: '2026-03-07T08:00:00Z',
          updatedAt: '2026-03-07T08:00:00Z',
        },
        {
          id: 12,
          dayId: 2,
          itemType: 'custom',
          title: 'Follow up with QA',
          state: 'planned',
          position: 2,
          createdAt: '2026-03-07T08:00:00Z',
          updatedAt: '2026-03-07T08:00:00Z',
        },
      ],
    }),
  ],
  inactiveDevelopers: [],
  summary: {
    total: 2,
    stale: 1,
    blocked: 1,
    atRisk: 0,
    waiting: 0,
    noCurrent: 1,
    overdueLinkedWork: 1,
    overCapacity: 1,
    statusFollowUp: 1,
    doneForToday: 0,
  },
  attentionQueue: [
    {
      developer: { accountId: 'dev-2', displayName: 'Bob Jones', isActive: true },
      status: 'blocked',
      reasons: [
        { code: 'blocked', label: 'Blocked', priority: 1 },
        { code: 'stale_with_open_risk', label: 'Stale with risk', priority: 2 },
        { code: 'overdue_linked_work', label: 'Overdue linked work', priority: 3 },
      ],
      isStale: true,
      signals: buildSignals({
        freshness: {
          staleByTime: true,
          staleWithOpenRisk: true,
          statusChangeWithoutFollowUp: true,
          hoursSinceCheckIn: 5,
          hoursSinceStatusChange: 3.5,
        },
        risk: {
          openRisk: true,
          overdueLinkedWork: true,
          overdueLinkedCount: 1,
          overCapacity: true,
          capacityDelta: 1,
        },
      }),
      hasCurrentItem: true,
      plannedCount: 2,
      lastCheckInAt: '2026-03-07T07:00:00Z',
    },
    {
      developer: { accountId: 'dev-1', displayName: 'Alice Smith', isActive: true },
      status: 'on_track',
      reasons: [{ code: 'no_current', label: 'No current item', priority: 4 }],
      isStale: false,
      signals: buildSignals(),
      hasCurrentItem: false,
      plannedCount: 0,
    },
  ],
};

vi.mock('@/hooks/useTeamTracker', () => ({
  useTeamTracker: () => ({
    data: mockBoard,
    isLoading: false,
    isFetching: false,
    refetch: mockRefetchBoard,
  }),
  useCarryForwardPreview: () => ({
    data: mockCarryForwardPreviewValue,
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: mockRefetchCarryForwardPreview,
  }),
}));

vi.mock('@/hooks/useTeamTrackerMutations', () => ({
  useUpdateDay: () => ({ mutate: mockUpdateDayMutate }),
  useUpdateAvailability: () => ({ mutate: mockUpdateAvailabilityMutate, isPending: false, variables: undefined }),
  useAddTrackerItem: () => ({ mutate: mockAddTrackerItemMutate, isPending: false }),
  useSetCurrentItem: () => ({ mutate: vi.fn() }),
  useUpdateTrackerItem: () => ({ mutate: mockUpdateTrackerItemMutate }),
  useDeleteTrackerItem: () => ({ mutate: vi.fn() }),
  useAddCheckIn: () => ({ mutate: vi.fn() }),
  useCarryForward: () => ({ mutate: mockCarryForwardMutate, isPending: false }),
}));

vi.mock('@/hooks/useIssues', () => ({
  useIssues: () => ({ data: mockIssues }),
}));

vi.mock('@/hooks/useConfig', () => ({
  useConfig: () => ({ data: { jiraBaseUrl: 'https://test.atlassian.net', isConfigured: true } }),
}));

// Minimal framer-motion stub for tests
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion');
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

import { TeamTrackerPage } from '@/components/team-tracker/TeamTrackerPage';

function clickDeveloperCard(name: string) {
  const target = screen.getAllByText(name).find((element) => element.closest('[class*="dashboard-panel"]'));
  if (!target) {
    throw new Error(`Could not find developer card for ${name}`);
  }
  fireEvent.click(target);
}

describe('TeamTrackerPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T12:00:00.000Z'));
    mockCarryForwardMutate.mockReset();
    mockUpdateDayMutate.mockReset();
    mockUpdateAvailabilityMutate.mockReset();
    mockUpdateTrackerItemMutate.mockReset();
    mockAddTrackerItemMutate.mockReset();
    mockRefetchBoard.mockReset();
    mockRefetchCarryForwardPreview.mockReset();
    mockCarryForwardPreviewValue = 0;
    mockIssues = [];
    mockBoard.inactiveDevelopers = [];
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the page title', () => {
    render(
      <TestWrapper>
        <TeamTrackerPage />
      </TestWrapper>
    );
    expect(screen.getByText('Team Tracker')).toBeInTheDocument();
  });

  it('does not hardcode a dark native color scheme on the board date input', () => {
    render(
      <TestWrapper>
        <TeamTrackerPage />
      </TestWrapper>
    );

    expect(screen.getByDisplayValue('2026-03-07')).toHaveProperty('style.colorScheme', '');
  });

  it('renders developer cards', () => {
    render(
      <TestWrapper>
        <TeamTrackerPage />
      </TestWrapper>
    );
    expect(screen.getAllByText('Alice Smith').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Bob Jones').length).toBeGreaterThanOrEqual(1);
  });

  it('renders summary strip with counts', () => {
    render(
      <TestWrapper>
        <TeamTrackerPage />
      </TestWrapper>
    );
    // Multiple "Blocked" elements exist (summary strip + card pill), use getAllByText
    expect(screen.getAllByText('Blocked').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Stale').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Overdue Jira')).toBeInTheDocument();
    expect(screen.getByText('Over Cap')).toBeInTheDocument();
    expect(screen.getByText('Needs Follow-up')).toBeInTheDocument();
  });

  it('renders the attention queue in ranked order with reason chips', () => {
    render(
      <TestWrapper>
        <TeamTrackerPage />
      </TestWrapper>
    );

    const queue = screen.getByText('Needs Attention Now').closest('section');
    expect(queue).not.toBeNull();

    const queueView = within(queue!);
    const bob = queueView.getByText('Bob Jones');
    const alice = queueView.getByText('Alice Smith');
    expect(bob.compareDocumentPosition(alice) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(queueView.getByText('Stale with risk')).toBeInTheDocument();
    expect(queueView.getByText('Overdue linked work')).toBeInTheDocument();
    expect(queueView.getByText('No current item')).toBeInTheDocument();
  });

  it('renders the inactive restore tray and reactivates developers from it', () => {
    mockBoard.inactiveDevelopers = [
      {
        developer: { accountId: 'dev-3', displayName: 'Cara Diaz', isActive: true },
        availability: { state: 'inactive', startDate: '2026-03-07', note: 'PTO today' },
      },
    ];

    render(
      <TestWrapper>
        <TeamTrackerPage />
      </TestWrapper>
    );

    fireEvent.click(screen.getByRole('button', { name: /show inactive developers/i }));

    expect(screen.getByText('Cara Diaz')).toBeInTheDocument();
    expect(screen.getByText('PTO today')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Active' }));

    expect(mockUpdateAvailabilityMutate).toHaveBeenCalledWith({ accountId: 'dev-3', state: 'active' });
  });

  it('shows blocked status pill on blocked developer', () => {
    render(
      <TestWrapper>
        <TeamTrackerPage />
      </TestWrapper>
    );
    // Bob is blocked
    const blockedPills = screen.getAllByText('Blocked');
    expect(blockedPills.length).toBeGreaterThanOrEqual(1);
  });

  it('shows current item for developer with in_progress work', () => {
    render(
      <TestWrapper>
        <TeamTrackerPage />
      </TestWrapper>
    );
    expect(screen.getByText('AM-123')).toBeInTheDocument();
    expect(screen.getByText('Fix login bug')).toBeInTheDocument();
  });

  it('manually refreshes only team tracker queries from the page header', () => {
    render(
      <TestWrapper>
        <TeamTrackerPage />
      </TestWrapper>
    );

    fireEvent.click(screen.getByRole('button', { name: /refresh team tracker/i }));

    expect(mockRefetchBoard).toHaveBeenCalled();
    expect(mockRefetchCarryForwardPreview).toHaveBeenCalled();
  });

  it('shows "No current item" warning for developer without active work', () => {
    render(
      <TestWrapper>
        <TeamTrackerPage />
      </TestWrapper>
    );
    expect(screen.getAllByText('No current item').length).toBeGreaterThanOrEqual(1);
  });

  it('filters by summary chip', () => {
    render(
      <TestWrapper>
        <TeamTrackerPage />
      </TestWrapper>
    );
    // Click "Blocked" filter
    const blockedButtons = screen.getAllByText('Blocked');
    const filterButton = blockedButtons.find((el) => el.closest('button')?.textContent?.includes('1'));
    if (filterButton) {
      fireEvent.click(filterButton);
      // After filter, Alice should not be visible since she is on_track
      // But Bob should be visible since he is blocked
      expect(screen.getAllByText('Bob Jones').length).toBeGreaterThanOrEqual(1);
    }
  });

  it('opens drawer when clicking a developer card', () => {
    render(
      <TestWrapper>
        <TeamTrackerPage />
      </TestWrapper>
    );
    clickDeveloperCard('Alice Smith');
    expect(screen.getAllByText('Alice Smith').length).toBeGreaterThanOrEqual(1);
  });

  it('carries forward the selected board date to the next day', () => {
    render(
      <TestWrapper>
        <TeamTrackerPage />
      </TestWrapper>
    );

    fireEvent.change(screen.getByDisplayValue('2026-03-07'), {
      target: { value: '2026-03-05' },
    });

    fireEvent.click(screen.getByRole('button', { name: /carry forward/i }));

    expect(mockCarryForwardMutate).toHaveBeenCalledWith({
      fromDate: '2026-03-05',
      toDate: '2026-03-06',
    });
  });

  it('shows a carry-forward prompt on first visit when previous-day work is available', () => {
    mockCarryForwardPreviewValue = 2;

    render(
      <TestWrapper>
        <TeamTrackerPage />
      </TestWrapper>
    );

    expect(screen.getByText('2 unfinished items from 2026-03-06')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^carry forward$/i }));

    expect(mockCarryForwardMutate).toHaveBeenCalledWith(
      { fromDate: '2026-03-06', toDate: '2026-03-07' },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    );
  });

  it('lets the user dismiss the carry-forward prompt for the viewed date', () => {
    mockCarryForwardPreviewValue = 1;

    render(
      <TestWrapper>
        <TeamTrackerPage />
      </TestWrapper>
    );

    fireEvent.click(screen.getByRole('button', { name: /dismiss carry-forward prompt/i }));

    expect(screen.queryByText('1 unfinished item from 2026-03-06')).not.toBeInTheDocument();
    expect(window.sessionStorage.getItem('team-tracker:carry-forward-prompt:2026-03-07')).toBe('dismissed');
  });

  it('adds a Jira-linked item from the drawer using the synced issue picker', () => {
    mockIssues = [
      {
        jiraKey: 'AM-456',
        summary: 'Investigate API latency',
        description: 'Investigate slow endpoint responses',
        priorityName: 'Highest',
        priorityId: '1',
        statusName: 'To Do',
        statusCategory: 'new',
        assigneeId: 'dev-2',
        assigneeName: 'Bob Jones',
        reporterName: 'Lead',
        component: 'API',
        labels: [],
        dueDate: '2026-03-08',
        developmentDueDate: undefined,
        flagged: false,
        createdAt: '2026-03-07T08:00:00Z',
        updatedAt: '2026-03-07T08:00:00Z',
        localTags: [],
      },
    ];

    render(
      <TestWrapper>
        <TeamTrackerPage />
      </TestWrapper>
    );

    clickDeveloperCard('Bob Jones');
    fireEvent.click(screen.getAllByRole('button', { name: /add task/i }).at(-1)!);
    fireEvent.change(screen.getByPlaceholderText('Describe the work in one line'), {
      target: { value: 'Investigate API latency spike' },
    });
    fireEvent.click(screen.getByRole('button', { name: /attach jira/i }));
    fireEvent.change(screen.getByPlaceholderText('Search Jira issues'), {
      target: { value: 'AM-456' },
    });
    fireEvent.click(screen.getByText('Investigate API latency'));
    fireEvent.click(screen.getAllByRole('button', { name: /^add task$/i }).at(-1)!);

    expect(mockAddTrackerItemMutate).toHaveBeenCalledWith({
      accountId: 'dev-2',
      jiraKey: 'AM-456',
      title: 'Investigate API latency spike',
      note: undefined,
    });
  });

  it('navigates to the previous day when clicking the left arrow', () => {
    render(
      <TestWrapper>
        <TeamTrackerPage />
      </TestWrapper>
    );

    fireEvent.click(screen.getByRole('button', { name: /previous day/i }));
    // The date input should now show yesterday
    expect(screen.getByDisplayValue('2026-03-06')).toBeInTheDocument();
  });

  it('navigates to the next day when clicking the right arrow', () => {
    render(
      <TestWrapper>
        <TeamTrackerPage />
      </TestWrapper>
    );

    // First go to a past date
    fireEvent.click(screen.getByRole('button', { name: /previous day/i }));
    // Now click next day
    fireEvent.click(screen.getByRole('button', { name: /next day/i }));
    // Should be back to today
    expect(screen.getByDisplayValue('2026-03-07')).toBeInTheDocument();
  });

  it('disables next day button when on today', () => {
    render(
      <TestWrapper>
        <TeamTrackerPage />
      </TestWrapper>
    );

    const nextDayButton = screen.getByRole('button', { name: /next day/i });
    expect(nextDayButton).toBeDisabled();
  });

  it('shows drag handles for planned items in the drawer', () => {
    render(
      <TestWrapper>
        <TeamTrackerPage />
      </TestWrapper>
    );

    clickDeveloperCard('Bob Jones');
    const dragHandles = screen.getAllByTitle('Drag to reorder');
    // Bob has 2 planned items, each should have a drag handle
    expect(dragHandles.length).toBe(2);
  });

  it('reveals full task details for current and planned drawer items without affecting the collapsed layout', () => {
    const bob = mockBoard.developers[1]!;
    const originalCurrentItem = bob.currentItem;
    const originalPlannedItems = bob.plannedItems;

    bob.currentItem = originalCurrentItem
      ? {
          ...originalCurrentItem,
          title: 'Fix login bug affecting the enterprise customer SSO rollout this morning',
          note: 'Coordinate with QA before shipping.\nEscalate if repro still fails after patch.',
        }
      : undefined;
    bob.plannedItems = originalPlannedItems.map((item, index) =>
      index === 0
        ? {
            ...item,
            title: 'Review regression checklist for the authentication hardening follow-up',
            note: 'Check dashboard alerts and confirm release notes.',
          }
        : item
    );

    try {
      render(
        <TestWrapper>
          <TeamTrackerPage />
        </TestWrapper>
      );

      clickDeveloperCard('Bob Jones');

      const detailButtons = screen.getAllByRole('button', { name: /show task details for/i });
      expect(detailButtons.length).toBeGreaterThanOrEqual(3);

      fireEvent.click(detailButtons[0]!);
      const currentDetails = screen.getByRole('region', {
        name: /task details for fix login bug affecting the enterprise customer sso rollout this morning/i,
      });
      expect(within(currentDetails).getByText('Full title')).toBeInTheDocument();
      expect(within(currentDetails).getByText(/coordinate with qa before shipping/i)).toBeInTheDocument();

      fireEvent.click(detailButtons[1]!);
      const plannedDetails = screen.getByRole('region', {
        name: /task details for review regression checklist for the authentication hardening follow-up/i,
      });
      expect(within(plannedDetails).getByText('Notes')).toBeInTheDocument();
      expect(within(plannedDetails).getByText(/check dashboard alerts and confirm release notes/i)).toBeInTheDocument();
    } finally {
      bob.currentItem = originalCurrentItem;
      bob.plannedItems = originalPlannedItems;
    }
  });

  it('saves daily capacity from the drawer', () => {
    render(
      <TestWrapper>
        <TeamTrackerPage />
      </TestWrapper>
    );

    clickDeveloperCard('Bob Jones');
    fireEvent.change(screen.getByDisplayValue('2'), {
      target: { value: '5' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'Save' })[0]!);

    expect(mockUpdateDayMutate).toHaveBeenCalledWith({
      accountId: 'dev-2',
      capacityUnits: 5,
    });
  });

  it('updates an existing item note from the drawer', () => {
    render(
      <TestWrapper>
        <TeamTrackerPage />
      </TestWrapper>
    );

    clickDeveloperCard('Bob Jones');
    fireEvent.click(screen.getAllByTitle('Edit note')[0]!);
    const noteEditor = screen.getAllByRole('textbox').find((element) => element.tagName === 'TEXTAREA');
    expect(noteEditor).toBeDefined();
    fireEvent.change(noteEditor!, {
      target: { value: 'Needs a tighter ETA' },
    });
    const saveButton = within(noteEditor!.parentElement as HTMLElement).getByText('Save');
    expect(saveButton).toBeDefined();
    fireEvent.click(saveButton!);

    expect(mockUpdateTrackerItemMutate).toHaveBeenCalledWith({
      itemId: 10,
      note: 'Needs a tighter ETA',
    });
  });

  it('edits an item title from the drawer via click-to-edit', () => {
    render(
      <TestWrapper>
        <TeamTrackerPage />
      </TestWrapper>
    );

    clickDeveloperCard('Bob Jones');
    fireEvent.click(screen.getByRole('button', { name: /edit title: fix login bug/i }));
    const titleInput = screen.getByLabelText('Edit title');
    expect(titleInput).toBeInTheDocument();
    fireEvent.change(titleInput, { target: { value: 'Fix login bug (urgent)' } });
    fireEvent.click(screen.getByTitle('Save title'));

    expect(mockUpdateTrackerItemMutate).toHaveBeenCalledWith({
      itemId: 10,
      title: 'Fix login bug (urgent)',
    });
  });
});

describe('TrackerStatusPill', () => {
  it('renders correct label for each status', async () => {
    const { TrackerStatusPill } = await import('@/components/team-tracker/TrackerStatusPill');

    const { rerender } = render(<TrackerStatusPill status="blocked" />);
    expect(screen.getByText('Blocked')).toBeInTheDocument();

    rerender(<TrackerStatusPill status="at_risk" />);
    expect(screen.getByText('At Risk')).toBeInTheDocument();

    rerender(<TrackerStatusPill status="done_for_today" />);
    expect(screen.getByText('Done')).toBeInTheDocument();
  });
});

describe('TrackerItemRow', () => {
  it('renders item with jira key', async () => {
    const { TrackerItemRow } = await import('@/components/team-tracker/TrackerItemRow');

    render(
      <TrackerItemRow
        item={{
          id: 1,
          dayId: 1,
          itemType: 'jira',
          jiraKey: 'AM-456',
          jiraPriorityName: 'Highest',
          jiraDueDate: '2026-03-09',
          title: 'Deploy fix',
          state: 'planned',
          position: 0,
          createdAt: '2026-03-07T08:00:00Z',
          updatedAt: '2026-03-07T08:00:00Z',
        }}
      />
    );
    expect(screen.getByText('AM-456')).toBeInTheDocument();
    expect(screen.getByText('Deploy fix')).toBeInTheDocument();
    expect(screen.getByText('Highest • Due Mar 9')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'AM-456' })).toHaveAttribute('href', 'https://test.atlassian.net/browse/AM-456');
  });

  it('renders a task without Jira metadata', async () => {
    const { TrackerItemRow } = await import('@/components/team-tracker/TrackerItemRow');

    render(
      <TrackerItemRow
        item={{
          id: 2,
          dayId: 1,
          itemType: 'custom',
          title: 'Team meeting',
          state: 'planned',
          position: 0,
          createdAt: '2026-03-07T08:00:00Z',
          updatedAt: '2026-03-07T08:00:00Z',
        }}
      />
    );
    expect(screen.getByText('Team meeting')).toBeInTheDocument();
    expect(screen.queryByText('Jira')).not.toBeInTheDocument();
  });

  it('shows line-through for done items', async () => {
    const { TrackerItemRow } = await import('@/components/team-tracker/TrackerItemRow');

    render(
      <TrackerItemRow
        item={{
          id: 3,
          dayId: 1,
          itemType: 'custom',
          title: 'Finished task',
          state: 'done',
          position: 0,
          completedAt: '2026-03-07T12:00:00Z',
          createdAt: '2026-03-07T08:00:00Z',
          updatedAt: '2026-03-07T12:00:00Z',
        }}
      />
    );
    const textEl = screen.getByText('Finished task');
    expect(textEl.style.textDecoration).toBe('line-through');
  });

  it('saves edited notes through the provided callback', async () => {
    const { TrackerItemRow } = await import('@/components/team-tracker/TrackerItemRow');
    const onUpdateNote = vi.fn();

    render(
      <TrackerItemRow
        item={{
          id: 4,
          dayId: 1,
          itemType: 'custom',
          title: 'Investigate logs',
          note: 'Initial context',
          state: 'planned',
          position: 0,
          createdAt: '2026-03-07T08:00:00Z',
          updatedAt: '2026-03-07T08:00:00Z',
        }}
        onUpdateNote={onUpdateNote}
      />
    );

    fireEvent.click(screen.getByTitle('Edit note'));
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Updated context' },
    });
    fireEvent.click(screen.getByText('Save'));

    expect(onUpdateNote).toHaveBeenCalledWith(4, 'Updated context');
  });

  it('edits a title via click-to-edit and saves on Enter', async () => {
    const { TrackerItemRow } = await import('@/components/team-tracker/TrackerItemRow');
    const onUpdateTitle = vi.fn();

    render(
      <TrackerItemRow
        item={{
          id: 5,
          dayId: 1,
          itemType: 'custom',
          title: 'Original title',
          state: 'planned',
          position: 0,
          createdAt: '2026-03-07T08:00:00Z',
          updatedAt: '2026-03-07T08:00:00Z',
        }}
        onUpdateTitle={onUpdateTitle}
      />
    );

    fireEvent.click(screen.getByText('Original title'));
    const input = screen.getByLabelText('Edit title');
    fireEvent.change(input, { target: { value: 'Revised title' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onUpdateTitle).toHaveBeenCalledWith(5, 'Revised title');
  });

  it('cancels title editing on Escape', async () => {
    const { TrackerItemRow } = await import('@/components/team-tracker/TrackerItemRow');
    const onUpdateTitle = vi.fn();

    render(
      <TrackerItemRow
        item={{
          id: 6,
          dayId: 1,
          itemType: 'custom',
          title: 'Keep this title',
          state: 'planned',
          position: 0,
          createdAt: '2026-03-07T08:00:00Z',
          updatedAt: '2026-03-07T08:00:00Z',
        }}
        onUpdateTitle={onUpdateTitle}
      />
    );

    fireEvent.click(screen.getByText('Keep this title'));
    const input = screen.getByLabelText('Edit title');
    fireEvent.change(input, { target: { value: 'Changed' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    // Should revert and not call the callback
    expect(onUpdateTitle).not.toHaveBeenCalled();
    expect(screen.getByText('Keep this title')).toBeInTheDocument();
  });

  it('reveals full title and note when details are toggled on', async () => {
    const { TrackerItemRow } = await import('@/components/team-tracker/TrackerItemRow');

    render(
      <TrackerItemRow
        item={{
          id: 7,
          dayId: 1,
          itemType: 'custom',
          title: 'Investigate the regional export failure that only appears after the nightly sync',
          note: 'Capture the exact failure mode.\nConfirm whether the queued retry path is still intact.',
          state: 'planned',
          position: 0,
          createdAt: '2026-03-07T08:00:00Z',
          updatedAt: '2026-03-07T08:00:00Z',
        }}
        showDetailsToggle
      />
    );

    expect(
      screen.queryByRole('region', { name: /task details for investigate the regional export failure/i })
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /show task details for investigate the regional export failure/i }));

    const details = screen.getByRole('region', { name: /task details for investigate the regional export failure/i });
    expect(within(details).getByText('Full title')).toBeInTheDocument();
    expect(within(details).getByText(/capture the exact failure mode/i)).toBeInTheDocument();
  });

  it('keeps title editing separate from the details reveal', async () => {
    const { TrackerItemRow } = await import('@/components/team-tracker/TrackerItemRow');
    const onUpdateTitle = vi.fn();

    render(
      <TrackerItemRow
        item={{
          id: 8,
          dayId: 1,
          itemType: 'custom',
          title: 'Follow up with infra on rollout sequencing',
          note: 'Details should stay closed when editing starts.',
          state: 'planned',
          position: 0,
          createdAt: '2026-03-07T08:00:00Z',
          updatedAt: '2026-03-07T08:00:00Z',
        }}
        onUpdateTitle={onUpdateTitle}
        showDetailsToggle
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /edit title: follow up with infra on rollout sequencing/i }));

    expect(screen.getByLabelText('Edit title')).toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: /task details for follow up with infra on rollout sequencing/i })
    ).not.toBeInTheDocument();
  });

  it('supports keyboard activation for the details toggle', async () => {
    const { TrackerItemRow } = await import('@/components/team-tracker/TrackerItemRow');

    render(
      <TrackerItemRow
        item={{
          id: 9,
          dayId: 1,
          itemType: 'custom',
          title: 'Validate keyboard access for task details',
          note: 'This should open without a mouse.',
          state: 'planned',
          position: 0,
          createdAt: '2026-03-07T08:00:00Z',
          updatedAt: '2026-03-07T08:00:00Z',
        }}
        showDetailsToggle
      />
    );

    const toggle = screen.getByRole('button', { name: /show task details for validate keyboard access for task details/i });
    toggle.focus();
    fireEvent.keyDown(toggle, { key: 'Enter' });

    expect(screen.getByRole('region', { name: /task details for validate keyboard access for task details/i })).toBeInTheDocument();
  });
});

describe('AddTrackerItemForm', () => {
  it('creates a descriptive task with an optional note', async () => {
    const { AddTrackerItemForm } = await import('@/components/team-tracker/AddTrackerItemForm');
    const onAdd = vi.fn();

    render(<AddTrackerItemForm onAdd={onAdd} />);

    fireEvent.click(screen.getByText('Add Task'));
    const titleInput = screen.getByPlaceholderText('Describe the work in one line');
    fireEvent.change(titleInput, {
      target: { value: 'Prep release notes' },
    });
    fireEvent.change(screen.getByPlaceholderText('Optional context or handoff detail'), {
      target: { value: 'Need this before standup' },
    });
    fireEvent.keyDown(titleInput, { key: 'Enter' });

    expect(onAdd).toHaveBeenCalledWith({
      title: 'Prep release notes',
      note: 'Need this before standup',
    });
  });

  it('creates a descriptive task with a linked Jira and optional note', async () => {
    const { AddTrackerItemForm } = await import('@/components/team-tracker/AddTrackerItemForm');
    const onAdd = vi.fn();

    render(
      <AddTrackerItemForm
        onAdd={onAdd}
        issues={[
          {
            jiraKey: 'AM-789',
            summary: 'Fix alert regression',
            priorityName: 'High',
            dueDate: '2026-03-10',
          },
        ]}
      />
    );

    fireEvent.click(screen.getByText('Add Task'));
    fireEvent.change(screen.getByPlaceholderText('Describe the work in one line'), {
      target: { value: 'Fix alert rendering regression' },
    });
    fireEvent.click(screen.getByText('Attach Jira'));
    fireEvent.change(screen.getByPlaceholderText('Search Jira issues'), {
      target: { value: 'AM-789' },
    });
    fireEvent.click(screen.getByText('Fix alert regression'));
    fireEvent.change(screen.getByPlaceholderText('Optional context or handoff detail'), {
      target: { value: 'Needs pairing with QA' },
    });
    fireEvent.click(screen.getByText('Add Task'));

    expect(onAdd).toHaveBeenCalledWith({
      jiraKey: 'AM-789',
      title: 'Fix alert rendering regression',
      note: 'Needs pairing with QA',
    });
  });

  it('keeps Jira links separate from issue selection in the picker', async () => {
    const { AddTrackerItemForm } = await import('@/components/team-tracker/AddTrackerItemForm');

    render(
      <AddTrackerItemForm
        onAdd={vi.fn()}
        issues={[
          {
            jiraKey: 'AM-789',
            summary: 'Fix alert regression',
            priorityName: 'High',
            dueDate: '2026-03-10',
          },
        ]}
      />
    );

    fireEvent.click(screen.getByText('Add Task'));
    fireEvent.click(screen.getByText('Attach Jira'));
    fireEvent.change(screen.getByPlaceholderText('Search Jira issues'), {
      target: { value: 'AM-789' },
    });

    fireEvent.click(screen.getByRole('link', { name: 'AM-789' }));
    expect(screen.queryByLabelText(/remove linked jira/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Fix alert regression'));
    expect(screen.getByLabelText(/remove linked jira/i)).toBeInTheDocument();
  });
});

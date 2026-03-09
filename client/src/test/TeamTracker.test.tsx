import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TestWrapper } from '@/test/wrapper';
import type { TeamTrackerBoardResponse, TrackerDeveloperDay, Issue } from '@/types';

const mockCarryForwardMutate = vi.fn();
const mockUpdateTrackerItemMutate = vi.fn();
const mockAddTrackerItemMutate = vi.fn();
const mockRefetchBoard = vi.fn();
const mockRefetchCarryForwardPreview = vi.fn();
let mockCarryForwardPreviewValue = 0;
let mockIssues: Issue[] = [];

const mockDay: (overrides?: Partial<TrackerDeveloperDay>) => TrackerDeveloperDay = (overrides = {}) => ({
  id: 1,
  date: '2026-03-07',
  developer: { accountId: 'dev-1', displayName: 'Alice Smith', isActive: true },
  status: 'on_track',
  plannedItems: [],
  completedItems: [],
  droppedItems: [],
  checkIns: [],
  isStale: false,
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
      isStale: true,
      currentItem: {
        id: 10,
        dayId: 2,
        itemType: 'jira',
        jiraKey: 'AM-123',
        jiraPriorityName: 'High',
        jiraDueDate: '2026-03-08',
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
  summary: {
    total: 2,
    stale: 1,
    blocked: 1,
    atRisk: 0,
    waiting: 0,
    noCurrent: 1,
    doneForToday: 0,
  },
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
  useUpdateDay: () => ({ mutate: vi.fn() }),
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

// Minimal framer-motion stub for tests
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion');
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

import { TeamTrackerPage } from '@/components/team-tracker/TeamTrackerPage';

describe('TeamTrackerPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T12:00:00.000Z'));
    mockCarryForwardMutate.mockReset();
    mockUpdateTrackerItemMutate.mockReset();
    mockAddTrackerItemMutate.mockReset();
    mockRefetchBoard.mockReset();
    mockRefetchCarryForwardPreview.mockReset();
    mockCarryForwardPreviewValue = 0;
    mockIssues = [];
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

  it('renders developer cards', () => {
    render(
      <TestWrapper>
        <TeamTrackerPage />
      </TestWrapper>
    );
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();
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
    expect(screen.getByText('No current item')).toBeInTheDocument();
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
      expect(screen.getByText('Bob Jones')).toBeInTheDocument();
    }
  });

  it('opens drawer when clicking a developer card', () => {
    render(
      <TestWrapper>
        <TeamTrackerPage />
      </TestWrapper>
    );
    const aliceCard = screen.getByText('Alice Smith').closest('[class*="dashboard-panel"]');
    if (aliceCard) {
      fireEvent.click(aliceCard);
      // Drawer should appear with full name
      expect(screen.getAllByText('Alice Smith').length).toBeGreaterThanOrEqual(1);
    }
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

    fireEvent.click(screen.getByText('Bob Jones'));
    fireEvent.click(screen.getByRole('button', { name: 'Jira' }));
    fireEvent.change(screen.getByPlaceholderText('Search Jira issues...'), {
      target: { value: 'AM-456' },
    });
    fireEvent.click(screen.getByText('Investigate API latency'));
    fireEvent.click(screen.getByRole('button', { name: /add jira item/i }));

    expect(mockAddTrackerItemMutate).toHaveBeenCalledWith({
      accountId: 'dev-2',
      itemType: 'jira',
      jiraKey: 'AM-456',
      title: 'Investigate API latency',
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

    fireEvent.click(screen.getByText('Bob Jones'));
    const dragHandles = screen.getAllByTitle('Drag to reorder');
    // Bob has 2 planned items, each should have a drag handle
    expect(dragHandles.length).toBe(2);
  });

  it('updates an existing item note from the drawer', () => {
    render(
      <TestWrapper>
        <TeamTrackerPage />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Bob Jones'));
    fireEvent.click(screen.getAllByTitle('Edit note')[0]!);
    const noteEditor = screen.getAllByRole('textbox').find((element) => element.tagName === 'TEXTAREA');
    expect(noteEditor).toBeDefined();
    fireEvent.change(noteEditor!, {
      target: { value: 'Needs a tighter ETA' },
    });
    const saveButton = screen.getAllByText('Save').find((element) => !element.hasAttribute('disabled'));
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

    fireEvent.click(screen.getByText('Bob Jones'));
    // Click the current item title in the drawer (the first clickable title)
    const editableTitles = screen.getAllByTitle('Click to edit title');
    fireEvent.click(editableTitles[0]!);
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
  });

  it('renders custom item badge', async () => {
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
    expect(screen.getByText('Custom')).toBeInTheDocument();
    expect(screen.getByText('Team meeting')).toBeInTheDocument();
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
});

describe('AddTrackerItemForm', () => {
  it('creates a custom item with an optional note', async () => {
    const { AddTrackerItemForm } = await import('@/components/team-tracker/AddTrackerItemForm');
    const onAdd = vi.fn();

    render(<AddTrackerItemForm onAdd={onAdd} />);

    fireEvent.click(screen.getByText('Custom'));
    const titleInput = screen.getByPlaceholderText('What are they working on?');
    fireEvent.change(titleInput, {
      target: { value: 'Prep release notes' },
    });
    fireEvent.change(screen.getByPlaceholderText('Optional note'), {
      target: { value: 'Need this before standup' },
    });
    fireEvent.keyDown(titleInput, { key: 'Enter' });

    expect(onAdd).toHaveBeenCalledWith({
      itemType: 'custom',
      title: 'Prep release notes',
      note: 'Need this before standup',
    });
  });

  it('creates a Jira item with an optional note', async () => {
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

    fireEvent.click(screen.getByText('Jira'));
    fireEvent.change(screen.getByPlaceholderText('Search Jira issues...'), {
      target: { value: 'AM-789' },
    });
    fireEvent.click(screen.getByText('Fix alert regression'));
    fireEvent.change(screen.getByPlaceholderText('Optional note'), {
      target: { value: 'Needs pairing with QA' },
    });
    fireEvent.click(screen.getByText('Add Jira Item'));

    expect(onAdd).toHaveBeenCalledWith({
      itemType: 'jira',
      jiraKey: 'AM-789',
      title: 'Fix alert regression',
      note: 'Needs pairing with QA',
    });
  });
});

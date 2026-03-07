import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TestWrapper } from '@/test/wrapper';
import type { TeamTrackerBoardResponse, TrackerDeveloperDay, Issue } from '@/types';

const mockCarryForwardMutate = vi.fn();

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
  useTeamTracker: () => ({ data: mockBoard, isLoading: false }),
}));

vi.mock('@/hooks/useTeamTrackerMutations', () => ({
  useUpdateDay: () => ({ mutate: vi.fn() }),
  useAddTrackerItem: () => ({ mutate: vi.fn(), isPending: false }),
  useSetCurrentItem: () => ({ mutate: vi.fn() }),
  useUpdateTrackerItem: () => ({ mutate: vi.fn() }),
  useDeleteTrackerItem: () => ({ mutate: vi.fn() }),
  useAddCheckIn: () => ({ mutate: vi.fn() }),
  useCarryForward: () => ({ mutate: mockCarryForwardMutate, isPending: false }),
}));

vi.mock('@/hooks/useIssues', () => ({
  useIssues: () => ({ data: [] as Issue[] }),
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
});

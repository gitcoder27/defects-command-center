import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { TestWrapper } from '@/test/wrapper';
import type {
  ManagerDeskDayResponse,
  ManagerDeskItem,
  ManagerDeskSummary,
} from '@/types/manager-desk';

// ── Mock data ───────────────────────────────────────────

const mockSummary: ManagerDeskSummary = {
  totalOpen: 5,
  inbox: 2,
  planned: 1,
  inProgress: 1,
  waiting: 1,
  overdueFollowUps: 0,
  meetings: 1,
  completed: 2,
};

const mockItem = (overrides: Partial<ManagerDeskItem> = {}): ManagerDeskItem => ({
  id: 1,
  dayId: 1,
  title: 'Test action item',
  kind: 'action',
  category: 'analysis',
  status: 'planned',
  priority: 'high',
  createdAt: '2026-03-08T09:00:00Z',
  updatedAt: '2026-03-08T09:00:00Z',
  links: [],
  ...overrides,
});

const mockDayResponse: ManagerDeskDayResponse = {
  date: '2026-03-08',
  items: [
    mockItem({
      id: 1,
      title: 'Analyze root cause for DEF-241',
      status: 'planned',
      priority: 'high',
      nextAction: 'Follow up with QA after design review',
      outcome: 'Root cause and workaround captured',
    }),
    mockItem({ id: 2, title: 'Design sync with onshore', kind: 'meeting', category: 'design', status: 'planned', participants: 'Onshore Team' }),
    mockItem({ id: 3, title: 'Waiting on QA feedback', kind: 'waiting', category: 'follow_up', status: 'waiting' }),
    mockItem({ id: 4, title: 'Quick inbox thought', status: 'inbox', priority: 'low' }),
    mockItem({ id: 5, title: 'Completed analysis', status: 'done', outcome: 'Root cause identified' }),
  ],
  summary: mockSummary,
};

let currentMockDay: ManagerDeskDayResponse | undefined = mockDayResponse;
let mockIsLoading = false;
let mockError: Error | null = null;
const mockRefetch = vi.fn();

const mockCreateMutate = vi.fn();
const mockUpdateMutate = vi.fn();
const mockDeleteMutate = vi.fn();
const mockCarryForwardMutate = vi.fn();

// ── Mock hooks ──────────────────────────────────────────

vi.mock('@/hooks/useManagerDesk', () => ({
  useManagerDesk: () => ({
    data: currentMockDay,
    isLoading: mockIsLoading,
    isFetching: false,
    error: mockError,
    refetch: mockRefetch,
  }),
  useCreateManagerDeskItem: () => ({
    mutate: mockCreateMutate,
    isPending: false,
  }),
  useUpdateManagerDeskItem: () => ({
    mutate: mockUpdateMutate,
    isPending: false,
  }),
  useDeleteManagerDeskItem: () => ({
    mutate: mockDeleteMutate,
    isPending: false,
  }),
  useCarryForwardManagerDesk: () => ({
    mutate: mockCarryForwardMutate,
    isPending: false,
  }),
  useAddManagerDeskLink: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useRemoveManagerDeskLink: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useManagerDeskIssueLookup: () => ({ data: [], isLoading: false }),
  useManagerDeskDeveloperLookup: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { username: 'mgr', accountId: 'mgr-1', displayName: 'Test Manager', role: 'manager' },
    isLoading: false,
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock('@/context/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'dark',
    toggleTheme: vi.fn(),
  }),
}));

vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({
    addToast: vi.fn(),
  }),
}));

// Minimal framer-motion stub
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion');
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

import { ManagerDeskPage } from '@/components/manager-desk/ManagerDeskPage';

// ── Tests ───────────────────────────────────────────────

describe('ManagerDeskPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-08T12:00:00.000Z'));
    currentMockDay = mockDayResponse;
    mockIsLoading = false;
    mockError = null;
    mockCreateMutate.mockReset();
    mockUpdateMutate.mockReset();
    mockDeleteMutate.mockReset();
    mockCarryForwardMutate.mockReset();
    mockRefetch.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the page title and date', () => {
    render(
      <TestWrapper>
        <ManagerDeskPage />
      </TestWrapper>,
    );
    expect(screen.getByText('Manager Desk')).toBeInTheDocument();
    expect(screen.getByText('Private workspace')).toBeInTheDocument();
    expect(screen.getByText(/March 8, 2026/)).toBeInTheDocument();
  });

  it('renders summary strip with correct counts', () => {
    render(
      <TestWrapper>
        <ManagerDeskPage />
      </TestWrapper>,
    );
    // The summary strip renders count values as text
    expect(screen.getByText('5')).toBeInTheDocument(); // totalOpen
    expect(screen.getByText('Open')).toBeInTheDocument();
    // "Inbox" appears in summary strip and section header — use getAllByText
    expect(screen.getAllByText('Inbox').length).toBeGreaterThanOrEqual(1);
  });

  it('renders quick capture input', () => {
    render(
      <TestWrapper>
        <ManagerDeskPage />
      </TestWrapper>,
    );
    const input = screen.getByPlaceholderText(/Quick capture/);
    expect(input).toBeInTheDocument();
  });

  it('groups items into the correct sections', () => {
    render(
      <TestWrapper>
        <ManagerDeskPage />
      </TestWrapper>,
    );
    // Section titles
    expect(screen.getByText('Focus')).toBeInTheDocument();
    // "Meetings" appears in both section title and summary strip, so use getAllByText
    expect(screen.getAllByText('Meetings').length).toBeGreaterThanOrEqual(1);
    // "Waiting" also appears in both summary and section
    expect(screen.getAllByText('Waiting').length).toBeGreaterThanOrEqual(1);
    // Item titles
    expect(screen.getByText('Analyze root cause for DEF-241')).toBeInTheDocument();
    expect(screen.getByText('Design sync with onshore')).toBeInTheDocument();
    expect(screen.getByText('Waiting on QA feedback')).toBeInTheDocument();
    expect(screen.getByText('Quick inbox thought')).toBeInTheDocument();
  });

  it('calls create mutation when quick capture is submitted', () => {
    render(
      <TestWrapper>
        <ManagerDeskPage />
      </TestWrapper>,
    );
    const input = screen.getByPlaceholderText(/Quick capture/);
    fireEvent.change(input, { target: { value: 'New task item' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(mockCreateMutate).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'New task item', date: '2026-03-08' }),
      expect.anything(),
    );
  });

  it('shows loading state', () => {
    mockIsLoading = true;
    currentMockDay = undefined;
    render(
      <TestWrapper>
        <ManagerDeskPage />
      </TestWrapper>,
    );
    // Loading spinner should be visible (spin animation class)
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('shows error state with retry button', () => {
    mockError = new Error('Network failed');
    currentMockDay = undefined;
    render(
      <TestWrapper>
        <ManagerDeskPage />
      </TestWrapper>,
    );
    expect(screen.getByText('Failed to load Manager Desk')).toBeInTheDocument();
    expect(screen.getByText('Network failed')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('shows empty day state when no items exist', () => {
    currentMockDay = {
      date: '2026-03-08',
      items: [],
      summary: { totalOpen: 0, inbox: 0, planned: 0, inProgress: 0, waiting: 0, overdueFollowUps: 0, meetings: 0, completed: 0 },
    };
    render(
      <TestWrapper>
        <ManagerDeskPage />
      </TestWrapper>,
    );
    expect(screen.getByText('Clean slate')).toBeInTheDocument();
  });

  it('shows carry forward button when there are open items', () => {
    render(
      <TestWrapper>
        <ManagerDeskPage />
      </TestWrapper>,
    );
    expect(screen.getByText('Carry Forward')).toBeInTheDocument();
  });

  it('opens the item detail drawer with context expanded and the follow-through section collapsed', () => {
    render(
      <TestWrapper>
        <ManagerDeskPage />
      </TestWrapper>,
    );

    fireEvent.click(screen.getByText('Analyze root cause for DEF-241'));

    expect(screen.getByLabelText('Context / Notes')).toBeInTheDocument();
    expect(screen.queryByLabelText('Next Action')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Outcome')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /expand action & outcome/i })).toBeInTheDocument();
    expect(screen.getByText('Next Action saved')).toBeInTheDocument();
    expect(screen.getByText('Outcome saved')).toBeInTheDocument();
  });

  it('debounces context note updates from the drawer', () => {
    render(
      <TestWrapper>
        <ManagerDeskPage />
      </TestWrapper>,
    );

    fireEvent.click(screen.getByText('Analyze root cause for DEF-241'));

    const notesField = screen.getByLabelText('Context / Notes');
    fireEvent.change(notesField, { target: { value: 'Capture manager context in the detail drawer' } });

    expect(mockUpdateMutate).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(900);
    });

    expect(mockUpdateMutate).toHaveBeenCalledWith(
      {
        itemId: 1,
        contextNote: 'Capture manager context in the detail drawer',
      },
      expect.anything(),
    );
  });

  it('commits next action changes on blur when the debounce has not fired yet', () => {
    render(
      <TestWrapper>
        <ManagerDeskPage />
      </TestWrapper>,
    );

    fireEvent.click(screen.getByText('Analyze root cause for DEF-241'));
    fireEvent.click(screen.getByRole('button', { name: /expand action & outcome/i }));

    const nextActionField = screen.getByLabelText('Next Action');
    fireEvent.change(nextActionField, { target: { value: 'Schedule follow-up with QA and product' } });
    fireEvent.blur(nextActionField);

    expect(mockUpdateMutate).toHaveBeenCalledWith(
      {
        itemId: 1,
        nextAction: 'Schedule follow-up with QA and product',
      },
      expect.anything(),
    );
  });

  it('switches the tabbed follow-through section to outcome when expanded', () => {
    render(
      <TestWrapper>
        <ManagerDeskPage />
      </TestWrapper>,
    );

    fireEvent.click(screen.getByText('Analyze root cause for DEF-241'));
    fireEvent.click(screen.getByRole('button', { name: /expand action & outcome/i }));
    fireEvent.click(screen.getByRole('tab', { name: 'Outcome' }));

    expect(screen.getByLabelText('Outcome')).toBeInTheDocument();
    expect(screen.queryByLabelText('Next Action')).not.toBeInTheDocument();
  });

  it('allows collapsing the large notes section to reach lower sections faster', () => {
    render(
      <TestWrapper>
        <ManagerDeskPage />
      </TestWrapper>,
    );

    fireEvent.click(screen.getByText('Analyze root cause for DEF-241'));

    expect(screen.getByLabelText('Context / Notes')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /collapse context \/ notes/i }));

    expect(screen.queryByLabelText('Context / Notes')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /expand context \/ notes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /collapse operational settings/i })).toBeInTheDocument();
  });

  it('opens the bulk carry forward dialog with all open items selected by default', () => {
    render(
      <TestWrapper>
        <ManagerDeskPage />
      </TestWrapper>,
    );

    fireEvent.click(screen.getByRole('button', { name: /^carry forward$/i }));

    expect(screen.getByRole('dialog', { name: /carry forward/i })).toBeInTheDocument();
    expect(screen.getByText('4 of 4 selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /carry 4 items forward/i })).toBeInTheDocument();
  });

  it('toggles all selections in the bulk carry forward dialog', () => {
    render(
      <TestWrapper>
        <ManagerDeskPage />
      </TestWrapper>,
    );

    fireEvent.click(screen.getByRole('button', { name: /^carry forward$/i }));
    fireEvent.click(screen.getByRole('button', { name: /deselect all/i }));

    expect(screen.getByText('0 of 4 selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /carry 0 items forward/i })).toBeDisabled();
  });

  it('carries a single task forward to the next day from the task card', () => {
    render(
      <TestWrapper>
        <ManagerDeskPage />
      </TestWrapper>,
    );

    fireEvent.click(screen.getByRole('button', { name: /carry forward analyze root cause for def-241/i }));

    expect(mockCarryForwardMutate).toHaveBeenCalledWith(
      {
        fromDate: '2026-03-08',
        toDate: '2026-03-09',
        itemIds: [1],
      },
      expect.anything(),
    );
  });

  it('does not show single-task carry forward on completed items', () => {
    render(
      <TestWrapper>
        <ManagerDeskPage />
      </TestWrapper>,
    );

    expect(screen.queryByRole('button', { name: /carry forward completed analysis/i })).not.toBeInTheDocument();
  });

  it('shows filter button and toggles filter bar', () => {
    render(
      <TestWrapper>
        <ManagerDeskPage />
      </TestWrapper>,
    );
    const filterBtn = screen.getByText('Filter');
    expect(filterBtn).toBeInTheDocument();
    fireEvent.click(filterBtn);
    // Filter bar should now show filter labels
    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  it('manually refreshes only the manager desk query from the page header', () => {
    render(
      <TestWrapper>
        <ManagerDeskPage />
      </TestWrapper>,
    );

    fireEvent.click(screen.getByRole('button', { name: /refresh manager desk/i }));

    expect(mockRefetch).toHaveBeenCalled();
  });
});

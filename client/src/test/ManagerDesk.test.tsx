import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { TestWrapper } from '@/test/wrapper';
import type {
  ManagerDeskDayResponse,
  ManagerDeskItem,
  ManagerDeskSummary,
} from '@/types/manager-desk';

const mockIssuesByKey = {
  'PROJ-221': {
    jiraKey: 'PROJ-221',
    summary: 'Rahul blocker on review flow',
    description: '### Detail\nInvestigate the review flow regression.',
    aspenSeverity: 'High',
    priorityName: 'High',
    priorityId: '1',
    statusName: 'In Progress',
    statusCategory: 'indeterminate',
    assigneeId: 'bob-2',
    assigneeName: 'Bob Jones',
    reporterName: 'Lead',
    component: 'Review Flow',
    labels: ['review'],
    dueDate: '2026-03-10',
    developmentDueDate: '2026-03-09',
    flagged: true,
    createdAt: '2026-03-07T08:00:00.000Z',
    updatedAt: '2026-03-08T09:00:00.000Z',
    localTags: [],
    analysisNotes: 'Root cause points to the handoff validation step.',
  },
  'PROJ-321': {
    jiraKey: 'PROJ-321',
    summary: 'Investigate design gap in review flow',
    description: 'Follow up with design on the error-state coverage.',
    aspenSeverity: 'Medium',
    priorityName: 'Medium',
    priorityId: '2',
    statusName: 'To Do',
    statusCategory: 'new',
    assigneeId: 'alice-1',
    assigneeName: 'Alice Smith',
    reporterName: 'Lead',
    component: 'Design',
    labels: ['design'],
    dueDate: '2026-03-12',
    developmentDueDate: undefined,
    flagged: false,
    createdAt: '2026-03-07T08:00:00.000Z',
    updatedAt: '2026-03-08T08:00:00.000Z',
    localTags: [],
    analysisNotes: '',
  },
} as const;

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
      assignee: {
        accountId: 'alice-1',
        displayName: 'Alice Smith',
        avatarUrl: 'https://example.com/alice.png',
      },
      links: [{ id: 11, itemId: 1, linkType: 'issue', issueKey: 'PROJ-221', displayLabel: 'PROJ-221', createdAt: '2026-03-08T09:00:00Z' }],
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
const mockCarryForwardPreviewData = {
  data: null as import('@/types/manager-desk').ManagerDeskCarryForwardPreviewResponse | null,
  isLoading: false,
  isFetching: false,
  isError: false,
};

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
  useCancelDelegatedManagerDeskTask: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useCarryForwardManagerDesk: () => ({
    mutate: mockCarryForwardMutate,
    isPending: false,
  }),
  useManagerDeskCarryForwardPreview: () => mockCarryForwardPreviewData,
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

vi.mock('@/hooks/useDevelopers', () => ({
  useDevelopers: () => ({
    data: [
      { accountId: 'alice-1', displayName: 'Alice Smith', isActive: true },
      { accountId: 'bob-2', displayName: 'Bob Jones', isActive: true },
    ],
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useIssueDetail', () => ({
  useIssueDetail: (key?: string) => ({
    data: key ? mockIssuesByKey[key as keyof typeof mockIssuesByKey] : undefined,
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useConfig', () => ({
  useConfig: () => ({
    data: { jiraBaseUrl: 'https://test.atlassian.net', isConfigured: true },
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
    mockCarryForwardPreviewData.data = null;
    mockCarryForwardPreviewData.isLoading = false;
    mockCarryForwardPreviewData.isFetching = false;
    mockCarryForwardPreviewData.isError = false;
    try { window.sessionStorage.clear(); } catch { /* noop */ }
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
    expect(screen.getByText(/March 8, 2026/)).toBeInTheDocument();
  });

  it('renders the command bar quick filters', () => {
    render(
      <TestWrapper>
        <ManagerDeskPage />
      </TestWrapper>,
    );
    expect(screen.getByRole('button', { name: /all open/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /high priority/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /filters/i })).toBeInTheDocument();
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

  it('does not auto-focus quick capture on initial render', () => {
    render(
      <TestWrapper>
        <ManagerDeskPage />
      </TestWrapper>,
    );

    const input = screen.getByPlaceholderText(/Quick capture/);
    expect(input).not.toHaveFocus();
  });

  it('groups items into the correct sections', () => {
    render(
      <TestWrapper>
        <ManagerDeskPage />
      </TestWrapper>,
    );
    // Section titles
    expect(screen.getByText('Rail')).toBeInTheDocument();
    expect(screen.getByText('Focus')).toBeInTheDocument();
    expect(screen.getAllByText('Meetings').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Waiting').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Inbox').length).toBeGreaterThanOrEqual(1);
    // Item titles
    expect(screen.getAllByText('Analyze root cause for DEF-241').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Design sync with onshore').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Waiting on QA feedback').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Quick inbox thought').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Alice Smith').length).toBeGreaterThanOrEqual(1);
  });

  it('shows a persistent status indicator for started vs planned work in focus', () => {
    currentMockDay = {
      ...mockDayResponse,
      items: [
        mockItem({
          id: 1,
          title: 'Started incident review',
          status: 'in_progress',
          priority: 'high',
          assignee: {
            accountId: 'alice-1',
            displayName: 'Alice Smith',
            avatarUrl: 'https://example.com/alice.png',
          },
          nextAction: 'Keep the validation fix moving',
        }),
        mockItem({
          id: 6,
          title: 'Planned stakeholder follow-up',
          status: 'planned',
          priority: 'medium',
        }),
        ...mockDayResponse.items.slice(2),
      ],
      summary: {
        ...mockDayResponse.summary,
        planned: 1,
        inProgress: 1,
      },
    };

    render(
      <TestWrapper>
        <ManagerDeskPage />
      </TestWrapper>,
    );

    expect(screen.getByText('Started')).toBeInTheDocument();
    expect(screen.getAllByText('Planned').length).toBeGreaterThan(0);
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

  it('filters the workbench from the global search box', () => {
    render(
      <TestWrapper>
        <ManagerDeskPage />
      </TestWrapper>,
    );

    fireEvent.change(screen.getByRole('textbox', { name: /search manager desk tasks/i }), {
      target: { value: 'QA feedback' },
    });

    expect(screen.getAllByText('Waiting on QA feedback').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('Design sync with onshore')).not.toBeInTheDocument();
  });

  it('keeps quick capture focused after submitting a task', () => {
    render(
      <TestWrapper>
        <ManagerDeskPage />
      </TestWrapper>,
    );

    const input = screen.getByPlaceholderText(/Quick capture/);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'First follow-up task' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(input).toHaveFocus();
    expect(input).toHaveValue('');
  });

  it('opens inline triage controls when an inbox item is selected', () => {
    render(
      <TestWrapper>
        <ManagerDeskPage />
      </TestWrapper>,
    );

    fireEvent.click(screen.getByRole('button', { name: /^Open Quick inbox thought$/i }));

    expect(screen.getByText('Triage')).toBeInTheDocument();
    expect(screen.getByLabelText('Assign Quick inbox thought')).toBeInTheDocument();
    expect(screen.getByLabelText('Priority for Quick inbox thought')).toBeInTheDocument();
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
    expect(screen.getByRole('button', { name: /^carry forward$/i })).toBeInTheDocument();
  });

  it('opens the item detail drawer with all note fields visible', () => {
    render(
      <TestWrapper>
        <ManagerDeskPage />
      </TestWrapper>,
    );

    fireEvent.click(screen.getByRole('button', { name: /^Open Analyze root cause for DEF-241$/i }));

    expect(screen.getByLabelText('Context / Notes')).toBeInTheDocument();
    expect(screen.getByLabelText('Next Action')).toBeInTheDocument();
    expect(screen.getByLabelText('Outcome')).toBeInTheDocument();
    expect(screen.getByLabelText('Assignee')).toHaveValue('alice-1');
  });

  it('updates the assigned team member from the drawer', () => {
    render(
      <TestWrapper>
        <ManagerDeskPage />
      </TestWrapper>,
    );

    fireEvent.click(screen.getByRole('button', { name: /^Open Analyze root cause for DEF-241$/i }));
    fireEvent.change(screen.getByLabelText('Assignee'), { target: { value: 'bob-2' } });

    expect(mockUpdateMutate).toHaveBeenCalledWith(
      {
        itemId: 1,
        assigneeDeveloperAccountId: 'bob-2',
      },
      expect.anything(),
    );
  });

  it('shows a compact Jira snapshot for linked issues in the drawer', () => {
    render(
      <TestWrapper>
        <ManagerDeskPage />
      </TestWrapper>,
    );

    fireEvent.click(screen.getByRole('button', { name: /^Open Analyze root cause for DEF-241$/i }));

    expect(screen.getByText('Linked Jira')).toBeInTheDocument();
    expect(screen.getByText('Rahul blocker on review flow')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open in jira/i })).toHaveAttribute(
      'href',
      'https://test.atlassian.net/browse/PROJ-221',
    );
  });

  it('switches between linked Jira issues when multiple issue links exist', () => {
    currentMockDay = {
      ...mockDayResponse,
      items: mockDayResponse.items.map((item) =>
        item.id === 1
          ? {
              ...item,
              links: [
                { id: 11, itemId: 1, linkType: 'issue', issueKey: 'PROJ-221', displayLabel: 'PROJ-221', createdAt: '2026-03-08T09:00:00Z' },
                { id: 12, itemId: 1, linkType: 'issue', issueKey: 'PROJ-321', displayLabel: 'PROJ-321', createdAt: '2026-03-08T09:05:00Z' },
              ],
            }
          : item,
      ),
    };

    render(
      <TestWrapper>
        <ManagerDeskPage />
      </TestWrapper>,
    );

    fireEvent.click(screen.getByRole('button', { name: /^Open Analyze root cause for DEF-241$/i }));
    fireEvent.click(screen.getByRole('button', { name: 'PROJ-321' }));

    expect(screen.getByText('Investigate design gap in review flow')).toBeInTheDocument();
  });

  it('debounces context note updates from the drawer', () => {
    render(
      <TestWrapper>
        <ManagerDeskPage />
      </TestWrapper>,
    );

    fireEvent.click(screen.getByRole('button', { name: /^Open Analyze root cause for DEF-241$/i }));

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

    fireEvent.click(screen.getByRole('button', { name: /^Open Analyze root cause for DEF-241$/i }));

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

  it('shows both next action and outcome fields simultaneously in the drawer', () => {
    render(
      <TestWrapper>
        <ManagerDeskPage />
      </TestWrapper>,
    );

    fireEvent.click(screen.getByRole('button', { name: /^Open Analyze root cause for DEF-241$/i }));

    expect(screen.getByLabelText('Next Action')).toBeInTheDocument();
    expect(screen.getByLabelText('Outcome')).toBeInTheDocument();
  });

  it('shows the properties section with kind and status fields in the drawer', () => {
    render(
      <TestWrapper>
        <ManagerDeskPage />
      </TestWrapper>,
    );

    fireEvent.click(screen.getByRole('button', { name: /^Open Analyze root cause for DEF-241$/i }));

    expect(screen.getByLabelText('Context / Notes')).toBeInTheDocument();
    expect(screen.getByLabelText('Kind')).toBeInTheDocument();
    expect(screen.getByLabelText('Status')).toBeInTheDocument();
    expect(screen.getByLabelText('Category')).toBeInTheDocument();
    expect(screen.getByLabelText('Priority')).toBeInTheDocument();
  });

  it('opens the bulk carry forward dialog with preview items selected by default', () => {
    mockCarryForwardPreviewData.data = {
      fromDate: '2026-03-08',
      toDate: '2026-03-09',
      carryable: 4,
      overdueOnArrivalCount: 0,
      timeMode: 'rebase_to_target_date',
      items: [
        { item: mockItem({ id: 1, title: 'Analyze root cause for DEF-241', status: 'planned' }), warningCodes: [] },
        { item: mockItem({ id: 2, title: 'Design sync with onshore', kind: 'meeting', status: 'planned' }), warningCodes: [] },
        { item: mockItem({ id: 3, title: 'Waiting on QA feedback', kind: 'waiting', status: 'waiting' }), warningCodes: [] },
        { item: mockItem({ id: 4, title: 'Quick inbox thought', status: 'inbox' }), warningCodes: [] },
      ],
    };

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

  it('does not hardcode a dark native color scheme on carry forward date inputs', () => {
    mockCarryForwardPreviewData.data = {
      fromDate: '2026-03-08',
      toDate: '2026-03-09',
      carryable: 1,
      overdueOnArrivalCount: 0,
      timeMode: 'rebase_to_target_date',
      items: [{ item: mockItem({ id: 1, status: 'planned' }), warningCodes: [] }],
    };

    render(
      <TestWrapper>
        <ManagerDeskPage />
      </TestWrapper>,
    );

    fireEvent.click(screen.getByRole('button', { name: /^carry forward$/i }));

    expect(screen.getByDisplayValue('2026-03-09')).toHaveProperty('style.colorScheme', '');
  });

  it('toggles all selections in the bulk carry forward dialog', () => {
    mockCarryForwardPreviewData.data = {
      fromDate: '2026-03-08',
      toDate: '2026-03-09',
      carryable: 4,
      overdueOnArrivalCount: 0,
      timeMode: 'rebase_to_target_date',
      items: [
        { item: mockItem({ id: 1, status: 'planned' }), warningCodes: [] },
        { item: mockItem({ id: 2, kind: 'meeting', status: 'planned' }), warningCodes: [] },
        { item: mockItem({ id: 3, kind: 'waiting', status: 'waiting' }), warningCodes: [] },
        { item: mockItem({ id: 4, status: 'inbox' }), warningCodes: [] },
      ],
    };

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

  it('limits the bulk carry forward date picker to future dates only', () => {
    mockCarryForwardPreviewData.data = {
      fromDate: '2026-03-08',
      toDate: '2026-03-09',
      carryable: 1,
      overdueOnArrivalCount: 0,
      timeMode: 'rebase_to_target_date',
      items: [{ item: mockItem({ id: 1, status: 'planned' }), warningCodes: [] }],
    };

    render(
      <TestWrapper>
        <ManagerDeskPage />
      </TestWrapper>,
    );

    fireEvent.click(screen.getByRole('button', { name: /^carry forward$/i }));

    expect(screen.getByDisplayValue('2026-03-09')).toHaveAttribute('min', '2026-03-09');
  });

  it('carries a single task forward to the next day from the item detail panel', () => {
    render(
      <TestWrapper>
        <ManagerDeskPage />
      </TestWrapper>,
    );

    fireEvent.click(screen.getByRole('button', { name: /^Open Analyze root cause for DEF-241$/i }));
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

  it('does not show single-task carry forward in item detail for completed items', () => {
    render(
      <TestWrapper>
        <ManagerDeskPage />
      </TestWrapper>,
    );

    fireEvent.click(screen.getByRole('button', { name: /^Completed 1$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Open Completed analysis$/i }));

    expect(screen.queryByRole('button', { name: /carry forward completed analysis/i })).not.toBeInTheDocument();
  });

  it('shows filter button and toggles filter bar', () => {
    render(
      <TestWrapper>
        <ManagerDeskPage />
      </TestWrapper>,
    );
    const filterBtn = screen.getByRole('button', { name: /filters/i });
    expect(filterBtn).toBeInTheDocument();
    fireEvent.click(filterBtn);
    expect(screen.getByText('Clear')).toBeInTheDocument();
  });

  it('manually refreshes only the manager desk query from the page header', () => {
    render(
      <TestWrapper>
        <ManagerDeskPage />
      </TestWrapper>,
    );

    fireEvent.click(screen.getByRole('button', { name: /refresh/i }));

    expect(mockRefetch).toHaveBeenCalled();
  });

  // ── First-visit previous-day carry-forward prompt ──────

  it('shows first-visit carry-forward prompt when previous day has carryable items', () => {
    mockCarryForwardPreviewData.data = {
      fromDate: '2026-03-07',
      toDate: '2026-03-08',
      carryable: 3,
      overdueOnArrivalCount: 0,
      timeMode: 'rebase_to_target_date',
      items: [
        { item: mockItem({ id: 101, title: 'Yesterday task 1', status: 'planned' }), warningCodes: [] },
        { item: mockItem({ id: 102, title: 'Yesterday task 2', status: 'in_progress' }), warningCodes: [] },
        { item: mockItem({ id: 103, title: 'Yesterday task 3', status: 'waiting' }), warningCodes: [] },
      ],
    };

    render(
      <TestWrapper>
        <ManagerDeskPage />
      </TestWrapper>,
    );

    expect(screen.getByTestId('carry-forward-prompt')).toBeInTheDocument();
    expect(screen.getByText(/3 unfinished items from/)).toBeInTheDocument();
  });

  it('does not show first-visit prompt when previous day has zero carryable items', () => {
    mockCarryForwardPreviewData.data = {
      fromDate: '2026-03-07',
      toDate: '2026-03-08',
      carryable: 0,
      overdueOnArrivalCount: 0,
      timeMode: 'rebase_to_target_date',
      items: [],
    };

    render(
      <TestWrapper>
        <ManagerDeskPage />
      </TestWrapper>,
    );

    expect(screen.queryByTestId('carry-forward-prompt')).not.toBeInTheDocument();
  });

  it('dismisses the carry-forward prompt and stores state in sessionStorage', () => {
    mockCarryForwardPreviewData.data = {
      fromDate: '2026-03-07',
      toDate: '2026-03-08',
      carryable: 2,
      overdueOnArrivalCount: 0,
      timeMode: 'rebase_to_target_date',
      items: [
        { item: mockItem({ id: 101, status: 'planned' }), warningCodes: [] },
        { item: mockItem({ id: 102, status: 'in_progress' }), warningCodes: [] },
      ],
    };

    render(
      <TestWrapper>
        <ManagerDeskPage />
      </TestWrapper>,
    );

    expect(screen.getByTestId('carry-forward-prompt')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /dismiss carry-forward prompt/i }));
    expect(screen.queryByTestId('carry-forward-prompt')).not.toBeInTheDocument();

    expect(window.sessionStorage.getItem('manager-desk:carry-forward-prompt:2026-03-08')).toBe('dismissed');
  });

  it('does not show prompt if already dismissed in sessionStorage', () => {
    window.sessionStorage.setItem('manager-desk:carry-forward-prompt:2026-03-08', 'dismissed');

    mockCarryForwardPreviewData.data = {
      fromDate: '2026-03-07',
      toDate: '2026-03-08',
      carryable: 2,
      overdueOnArrivalCount: 0,
      timeMode: 'rebase_to_target_date',
      items: [
        { item: mockItem({ id: 101, status: 'planned' }), warningCodes: [] },
        { item: mockItem({ id: 102, status: 'in_progress' }), warningCodes: [] },
      ],
    };

    render(
      <TestWrapper>
        <ManagerDeskPage />
      </TestWrapper>,
    );

    expect(screen.queryByTestId('carry-forward-prompt')).not.toBeInTheDocument();
  });

  // ── Preview-driven dialog ─────────────────────────────

  it('shows time rebase info banner in carry forward dialog', () => {
    mockCarryForwardPreviewData.data = {
      fromDate: '2026-03-08',
      toDate: '2026-03-09',
      carryable: 1,
      overdueOnArrivalCount: 0,
      timeMode: 'rebase_to_target_date',
      items: [{ item: mockItem({ id: 1, status: 'planned' }), warningCodes: [] }],
    };

    render(
      <TestWrapper>
        <ManagerDeskPage />
      </TestWrapper>,
    );

    fireEvent.click(screen.getByRole('button', { name: /^carry forward$/i }));

    expect(screen.getByText(/automatically rebased to the target day/)).toBeInTheDocument();
  });

  it('shows rebased time fields in preview items', () => {
    mockCarryForwardPreviewData.data = {
      fromDate: '2026-03-08',
      toDate: '2026-03-09',
      carryable: 1,
      overdueOnArrivalCount: 0,
      timeMode: 'rebase_to_target_date',
      items: [{
        item: mockItem({ id: 1, title: 'Design sync', kind: 'meeting', status: 'planned' }),
        rebasedPlannedStartAt: '2026-03-09T14:00:00.000Z',
        rebasedPlannedEndAt: '2026-03-09T15:00:00.000Z',
        warningCodes: [],
      }],
    };

    render(
      <TestWrapper>
        <ManagerDeskPage />
      </TestWrapper>,
    );

    fireEvent.click(screen.getByRole('button', { name: /^carry forward$/i }));

    expect(screen.getByText('Design sync')).toBeInTheDocument();
    // Rebased time window should show a formatted time range (timezone-dependent)
    expect(screen.getByText(/\d{1,2}:\d{2}\s*(AM|PM)\s*–\s*\d{1,2}:\d{2}\s*(AM|PM)/i)).toBeInTheDocument();
  });

  // ── Warning rendering ──────────────────────────────────

  it('shows overdue-on-arrival warnings in carry forward dialog', () => {
    mockCarryForwardPreviewData.data = {
      fromDate: '2026-03-08',
      toDate: '2026-03-09',
      carryable: 2,
      overdueOnArrivalCount: 1,
      timeMode: 'rebase_to_target_date',
      items: [
        {
          item: mockItem({ id: 1, title: 'Past meeting', kind: 'meeting', status: 'planned' }),
          rebasedPlannedEndAt: '2026-03-09T08:00:00.000Z',
          warningCodes: ['planned_end_overdue_on_arrival'],
        },
        {
          item: mockItem({ id: 2, title: 'Follow-up item', kind: 'action', status: 'planned' }),
          rebasedFollowUpAt: '2026-03-09T09:00:00.000Z',
          warningCodes: ['follow_up_overdue_on_arrival'],
        },
      ],
    };

    render(
      <TestWrapper>
        <ManagerDeskPage />
      </TestWrapper>,
    );

    fireEvent.click(screen.getByRole('button', { name: /^carry forward$/i }));

    expect(screen.getByText('1 overdue on arrival')).toBeInTheDocument();
    expect(screen.getByTestId('warning-planned_end_overdue_on_arrival')).toBeInTheDocument();
    expect(screen.getByTestId('warning-follow_up_overdue_on_arrival')).toBeInTheDocument();
    expect(screen.getByText(/will already have ended/)).toBeInTheDocument();
    expect(screen.getByText(/will already be overdue/)).toBeInTheDocument();
  });

  // ── Subset carry-forward payloads ──────────────────────

  it('sends subset itemIds when not all preview items are selected', () => {
    mockCarryForwardPreviewData.data = {
      fromDate: '2026-03-08',
      toDate: '2026-03-09',
      carryable: 3,
      overdueOnArrivalCount: 0,
      timeMode: 'rebase_to_target_date',
      items: [
        { item: mockItem({ id: 1, title: 'Item A', status: 'planned' }), warningCodes: [] },
        { item: mockItem({ id: 2, title: 'Item B', status: 'planned' }), warningCodes: [] },
        { item: mockItem({ id: 3, title: 'Item C', status: 'waiting' }), warningCodes: [] },
      ],
    };

    render(
      <TestWrapper>
        <ManagerDeskPage />
      </TestWrapper>,
    );

    fireEvent.click(screen.getByRole('button', { name: /^carry forward$/i }));

    // Deselect item B (id: 2)
    fireEvent.click(screen.getByText('Item B'));

    expect(screen.getByText('2 of 3 selected')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /carry 2 items forward/i }));

    expect(mockCarryForwardMutate).toHaveBeenCalledWith(
      {
        fromDate: '2026-03-08',
        toDate: '2026-03-09',
        itemIds: expect.arrayContaining([1, 3]),
      },
      expect.anything(),
    );
  });

  it('shows empty state in dialog when preview returns zero items', () => {
    mockCarryForwardPreviewData.data = {
      fromDate: '2026-03-08',
      toDate: '2026-03-09',
      carryable: 0,
      overdueOnArrivalCount: 0,
      timeMode: 'rebase_to_target_date',
      items: [],
    };

    render(
      <TestWrapper>
        <ManagerDeskPage />
      </TestWrapper>,
    );

    fireEvent.click(screen.getByRole('button', { name: /^carry forward$/i }));

    expect(screen.getByText(/no items are eligible/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /carry 0 items forward/i })).toBeDisabled();
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { TriagePanel } from '@/components/triage/TriagePanel';
import { TestWrapper } from '@/test/wrapper';
import type { Developer, Issue, TrackerIssueAssignment } from '@/types';

function buildMockIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    jiraKey: 'PROJ-101',
    summary: 'Login page crashes on submit with special chars',
    description: 'Users report **crash** when special characters entered',
    aspenSeverity: 'Critical',
    priorityName: 'Highest',
    priorityId: '1',
    statusName: 'To Do',
    statusCategory: 'new',
    assigneeName: 'Alice',
    assigneeId: 'alice-1',
    reporterName: 'John',
    component: 'Auth',
    labels: ['backend', 'critical'],
    dueDate: '2026-03-06',
    flagged: false,
    createdAt: '2026-03-04T09:00:00Z',
    updatedAt: '2026-03-05T09:00:00Z',
    localTags: [],
    analysisNotes: 'Root cause looks related to the submit sanitization path.',
    ...overrides,
  };
}

let mockIssue: Issue = buildMockIssue();
let mockSuggestions = {
  prioritySuggestion: { data: null as { suggested: string } | null },
  dueDateSuggestion: { data: null as { suggested: string } | null },
  assigneeSuggestion: { data: null as { reason: string; developer: Developer }[] | null },
};

const mockDevelopers: Developer[] = [
  { accountId: 'alice-1', displayName: 'Alice', isActive: true },
  { accountId: 'bob-2', displayName: 'Bob', isActive: true },
];

const mockAddTrackerItemMutate = vi.fn();
const mockUpdateIssueMutate = vi.fn();
let mockTrackerAssignments: TrackerIssueAssignment[] = [];

vi.mock('@/hooks/useIssueDetail', () => ({
  useIssueDetail: () => ({ data: mockIssue, isLoading: false }),
}));

vi.mock('@/hooks/useSuggestions', () => ({
  useSuggestions: () => mockSuggestions,
}));

vi.mock('@/hooks/useUpdateIssue', () => ({
  useUpdateIssue: () => ({ mutate: mockUpdateIssueMutate, isPending: false }),
}));

vi.mock('@/hooks/useDevelopers', () => ({
  useDevelopers: () => ({ data: mockDevelopers }),
}));

vi.mock('@/hooks/useTeamTracker', () => ({
  useTrackerIssueAssignments: () => ({ data: mockTrackerAssignments, isLoading: false }),
}));

vi.mock('@/hooks/useTeamTrackerMutations', () => ({
  useAddTrackerItem: () => ({ mutate: mockAddTrackerItemMutate, isPending: false }),
}));

vi.mock('@/hooks/useConfig', () => ({
  useConfig: () => ({ data: { jiraBaseUrl: 'https://test.atlassian.net', jiraAspenSeverityField: 'customfield_10129', isConfigured: true } }),
}));

vi.mock('@/hooks/useAddComment', () => ({
  useAddComment: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/useTags', () => ({
  useTags: () => ({ data: [] }),
  useCreateTag: () => ({ mutate: vi.fn(), isPending: false }),
  useSetIssueTags: () => ({ mutate: vi.fn(), isPending: false }),
}));

describe('TriagePanel', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T12:00:00.000Z'));
    mockIssue = buildMockIssue();
    mockSuggestions = {
      prioritySuggestion: { data: null },
      dueDateSuggestion: { data: null },
      assigneeSuggestion: { data: null },
    };
    mockAddTrackerItemMutate.mockReset();
    mockUpdateIssueMutate.mockReset();
    mockTrackerAssignments = [];
    onClose.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders when selectedKey is set', () => {
    render(
      <TestWrapper>
        <TriagePanel issueKey="PROJ-101" onClose={onClose} />
      </TestWrapper>
    );

    expect(screen.getAllByText('PROJ-101').length).toBeGreaterThan(0);
    expect(screen.getByText('Login page crashes on submit with special chars')).toBeInTheDocument();
  });

  it('does not render when issueKey is undefined', () => {
    render(
      <TestWrapper>
        <TriagePanel issueKey={undefined} onClose={onClose} />
      </TestWrapper>
    );

    expect(screen.queryByText('PROJ-101')).not.toBeInTheDocument();
  });

  it('closes on Escape key', () => {
    render(
      <TestWrapper>
        <TriagePanel issueKey="PROJ-101" onClose={onClose} />
      </TestWrapper>
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('renders Jira link with correct href', () => {
    render(
      <TestWrapper>
        <TriagePanel issueKey="PROJ-101" onClose={onClose} />
      </TestWrapper>
    );

    const jiraLink = screen.getByTitle('Open in Jira');
    expect(jiraLink).toHaveAttribute('href', 'https://test.atlassian.net/browse/PROJ-101');
    expect(jiraLink).toHaveAttribute('target', '_blank');
  });

  it('renders labels when present', () => {
    render(
      <TestWrapper>
        <TriagePanel issueKey="PROJ-101" onClose={onClose} />
      </TestWrapper>
    );

    expect(screen.getByText('backend')).toBeInTheDocument();
    expect(screen.getByText('critical')).toBeInTheDocument();
    expect(screen.getByTitle('Manage tags')).toBeInTheDocument();
  });

  it('renders ASPEN Severity and does not duplicate editable property labels', () => {
    render(
      <TestWrapper>
        <TriagePanel issueKey="PROJ-101" onClose={onClose} />
      </TestWrapper>
    );

    expect(screen.getByText('Severity')).toBeInTheDocument();
    expect(screen.getByText('Critical')).toBeInTheDocument();
    expect(screen.getAllByText('Priority')).toHaveLength(1);
    expect(screen.getAllByText('Assignee')).toHaveLength(1);
    expect(screen.getAllByText('Due Date')).toHaveLength(1);
    expect(screen.getAllByText('Blocked')).toHaveLength(1);
  });

  it('allows collapsing properties and keeps suggestions below that section', () => {
    mockSuggestions = {
      prioritySuggestion: { data: { suggested: 'High' } },
      dueDateSuggestion: { data: null },
      assigneeSuggestion: { data: null },
    };

    render(
      <TestWrapper>
        <TriagePanel issueKey="PROJ-101" onClose={onClose} />
      </TestWrapper>
    );

    const propertiesToggle = screen.getByRole('button', { name: /properties/i });
    const suggestionsHeading = screen.getByText('Suggestions');

    expect(propertiesToggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Priority')).toBeInTheDocument();
    expect(propertiesToggle.compareDocumentPosition(suggestionsHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    fireEvent.click(propertiesToggle);

    expect(propertiesToggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Priority')).not.toBeInTheDocument();
    expect(screen.getByText('Suggestions')).toBeInTheDocument();
  });

  it('renders description with markdown', () => {
    render(
      <TestWrapper>
        <TriagePanel issueKey="PROJ-101" onClose={onClose} />
      </TestWrapper>
    );

    // The markdown **crash** should be rendered (bold)
    expect(screen.getByText('crash')).toBeInTheDocument();
  });

  it('renders the Team Tracker planner with the Jira assignee preselected', () => {
    render(
      <TestWrapper>
        <TriagePanel issueKey="PROJ-101" onClose={onClose} />
      </TestWrapper>
    );

    expect(screen.getByText('Team Tracker')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add task to alice/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /alice assigned/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('adds the current Jira issue to today tracker plan from the triage panel', () => {
    render(
      <TestWrapper>
        <TriagePanel issueKey="PROJ-101" onClose={onClose} />
      </TestWrapper>
    );

    fireEvent.change(screen.getByLabelText('Task'), {
      target: { value: 'Trace the login crash path' },
    });
    fireEvent.click(screen.getByRole('button', { name: /add task to alice/i }));

    expect(mockAddTrackerItemMutate).toHaveBeenCalledWith(
      {
        accountId: 'alice-1',
        jiraKey: 'PROJ-101',
        title: 'Trace the login crash path',
      },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      })
    );
  });

  it('lets the lead choose a different developer before adding to tracker', () => {
    render(
      <TestWrapper>
        <TriagePanel issueKey="PROJ-101" onClose={onClose} />
      </TestWrapper>
    );

    fireEvent.click(screen.getByRole('button', { name: /^bob$/i }));
    fireEvent.change(screen.getByLabelText('Task'), {
      target: { value: 'Patch the submit sanitization path' },
    });
    fireEvent.click(screen.getByRole('button', { name: /add task to bob/i }));

    expect(mockAddTrackerItemMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 'bob-2',
        jiraKey: 'PROJ-101',
        title: 'Patch the submit sanitization path',
      }),
      expect.any(Object)
    );
  });

  it('shows existing linked tasks and still allows another descriptive task', () => {
    mockTrackerAssignments = [{
      date: '2026-03-07',
      jiraKey: 'PROJ-101',
      itemId: 44,
      title: 'Verify the customer reproduction steps',
      state: 'planned',
      developer: { accountId: 'bob-2', displayName: 'Bob', isActive: true },
    }];

    render(
      <TestWrapper>
        <TriagePanel issueKey="PROJ-101" onClose={onClose} />
      </TestWrapper>
    );

    expect(screen.getByText('Bob · Planned · Verify the customer reproduction steps')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /bob 1 linked/i })).toBeInTheDocument();
    expect(screen.getByText(/1 linked task/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Task'), {
      target: { value: 'Patch the submit sanitization path' },
    });
    fireEvent.click(screen.getByRole('button', { name: /add task to alice/i }));

    expect(mockAddTrackerItemMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 'alice-1',
        jiraKey: 'PROJ-101',
        title: 'Patch the submit sanitization path',
      }),
      expect.any(Object)
    );
  });

  it('prefills the manager desk context note from saved triage analysis notes', () => {
    render(
      <TestWrapper>
        <TriagePanel issueKey="PROJ-101" onClose={onClose} />
      </TestWrapper>
    );

    expect(screen.getAllByDisplayValue('Root cause looks related to the submit sanitization path.')).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: /add to manager desk/i }));

    expect(screen.getAllByDisplayValue('Root cause looks related to the submit sanitization path.')).toHaveLength(2);
  });

  it('autosaves dated notes in the plain analysis notes string field', () => {
    mockIssue = buildMockIssue({ analysisNotes: '' });

    render(
      <TestWrapper>
        <TriagePanel issueKey="PROJ-101" onClose={onClose} />
      </TestWrapper>
    );

    fireEvent.change(screen.getByLabelText('Notes for today'), {
      target: { value: 'Investigated the pending casework lineup logic.' },
    });

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(mockUpdateIssueMutate).toHaveBeenCalledWith(
      {
        key: 'PROJ-101',
        update: {
          analysisNotes: 'Mar 7, 2026:\nInvestigated the pending casework lineup logic.',
        },
      },
      expect.any(Object)
    );
  });

  it('does not auto-open a manager desk context note when no saved triage analysis exists', () => {
    mockIssue = buildMockIssue({ analysisNotes: '   ' });

    render(
      <TestWrapper>
        <TriagePanel issueKey="PROJ-101" onClose={onClose} />
      </TestWrapper>
    );

    fireEvent.click(screen.getByRole('button', { name: /add to manager desk/i }));

    expect(screen.queryByPlaceholderText('Quick context so future-you remembers why...')).not.toBeInTheDocument();
    expect(screen.getByText('Optional')).toBeInTheDocument();
  });
});

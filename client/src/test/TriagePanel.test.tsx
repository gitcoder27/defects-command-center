import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TriagePanel } from '@/components/triage/TriagePanel';
import { TestWrapper } from '@/test/wrapper';
import type { Developer, Issue, TrackerIssueAssignment } from '@/types';

const mockIssue: Issue = {
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
};

const mockDevelopers: Developer[] = [
  { accountId: 'alice-1', displayName: 'Alice', isActive: true },
  { accountId: 'bob-2', displayName: 'Bob', isActive: true },
];

const mockAddTrackerItemMutate = vi.fn();
let mockTrackerAssignment: TrackerIssueAssignment | undefined;

vi.mock('@/hooks/useIssueDetail', () => ({
  useIssueDetail: () => ({ data: mockIssue, isLoading: false }),
}));

vi.mock('@/hooks/useSuggestions', () => ({
  useSuggestions: () => ({
    prioritySuggestion: { data: null },
    dueDateSuggestion: { data: null },
    assigneeSuggestion: { data: null },
  }),
}));

vi.mock('@/hooks/useUpdateIssue', () => ({
  useUpdateIssue: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/useDevelopers', () => ({
  useDevelopers: () => ({ data: mockDevelopers }),
}));

vi.mock('@/hooks/useTeamTracker', () => ({
  useTrackerIssueAssignment: () => ({ data: mockTrackerAssignment, isLoading: false }),
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
    mockAddTrackerItemMutate.mockReset();
    mockTrackerAssignment = undefined;
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

    expect(screen.getByText('PROJ-101')).toBeInTheDocument();
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
    expect(screen.getByRole('button', { name: /add tag/i })).toBeInTheDocument();
  });

  it('renders ASPEN Severity and does not duplicate editable property labels', () => {
    render(
      <TestWrapper>
        <TriagePanel issueKey="PROJ-101" onClose={onClose} />
      </TestWrapper>
    );

    expect(screen.getByText('ASPEN Severity')).toBeInTheDocument();
    expect(screen.getByText('Critical')).toBeInTheDocument();
    expect(screen.getAllByText('Priority')).toHaveLength(1);
    expect(screen.getAllByText('Assignee')).toHaveLength(1);
    expect(screen.getAllByText('Due Date')).toHaveLength(1);
    expect(screen.getAllByText('Blocked')).toHaveLength(1);
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
    expect(screen.getByRole('button', { name: /add to alice/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /alice assigned/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('adds the current Jira issue to today tracker plan from the triage panel', () => {
    render(
      <TestWrapper>
        <TriagePanel issueKey="PROJ-101" onClose={onClose} />
      </TestWrapper>
    );

    fireEvent.click(screen.getByRole('button', { name: /add to alice/i }));

    expect(mockAddTrackerItemMutate).toHaveBeenCalledWith(
      {
        accountId: 'alice-1',
        itemType: 'jira',
        jiraKey: 'PROJ-101',
        title: 'Login page crashes on submit with special chars',
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
    fireEvent.click(screen.getByRole('button', { name: /add to bob/i }));

    expect(mockAddTrackerItemMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 'bob-2',
        jiraKey: 'PROJ-101',
      }),
      expect.any(Object)
    );
  });

  it('shows existing tracker ownership and blocks duplicate adds', () => {
    mockTrackerAssignment = {
      date: '2026-03-07',
      jiraKey: 'PROJ-101',
      itemId: 44,
      title: 'Login page crashes on submit with special chars',
      state: 'planned',
      developer: { accountId: 'bob-2', displayName: 'Bob', isActive: true },
    };

    render(
      <TestWrapper>
        <TriagePanel issueKey="PROJ-101" onClose={onClose} />
      </TestWrapper>
    );

    expect(screen.getByText('PROJ-101 is already planned for Bob')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /already in bob's plan/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /bob in tracker/i })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: /^alice assigned$/i }));
    expect(mockAddTrackerItemMutate).not.toHaveBeenCalled();
  });
});

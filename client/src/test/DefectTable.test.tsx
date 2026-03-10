import * as React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { DefectTable } from '@/components/table/DefectTable';
import { TestWrapper } from '@/test/wrapper';
import type { Issue } from '@/types';

vi.mock('framer-motion', () => {
  const motion = new Proxy(
    {},
    {
      get: (_target, tag: string) =>
        React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement> & {
          initial?: unknown;
          animate?: unknown;
          transition?: unknown;
          whileHover?: unknown;
        }>(({ children, initial, animate: _animate, transition, whileHover: _whileHover, ...props }, ref) =>
          React.createElement(tag, {
            ...props,
            ref,
            'data-motion-initial': initial === false ? 'false' : JSON.stringify(initial),
            'data-motion-transition': transition ? JSON.stringify(transition) : '',
          }, children)
        ),
    }
  );

  return { motion };
});

const mockIssues: Issue[] = [
  {
    jiraKey: 'PROJ-101',
    summary: 'Login page crashes on submit',
    aspenSeverity: '1 - Critical',
    priorityName: 'Highest',
    priorityId: '1',
    statusName: 'To Do',
    statusCategory: 'new',
    assigneeName: 'Alice',
    assigneeId: 'alice-1',
    labels: [],
    flagged: false,
    createdAt: '2026-03-04T09:00:00Z',
    updatedAt: '2026-03-05T09:00:00Z',
    localTags: [],
    analysisNotes: 'Initial root-cause analysis completed.',
  },
  {
    jiraKey: 'PROJ-102',
    summary: 'Cart total calculation error',
    aspenSeverity: '2 - Major',
    priorityName: 'High',
    priorityId: '2',
    statusName: 'In Progress',
    statusCategory: 'indeterminate',
    assigneeName: 'Bob',
    assigneeId: 'bob-2',
    labels: [],
    flagged: true,
    createdAt: '2026-03-03T09:00:00Z',
    updatedAt: '2026-03-05T07:00:00Z',
    dueDate: '2026-03-07',
    localTags: [],
  },
  {
    jiraKey: 'PROJ-103',
    summary: 'Stale defect not updated',
    aspenSeverity: '4 - Low',
    priorityName: 'Medium',
    priorityId: '3',
    statusName: 'To Do',
    statusCategory: 'new',
    assigneeName: 'Charlie',
    assigneeId: 'charlie-3',
    labels: [],
    flagged: false,
    createdAt: '2026-02-01T09:00:00Z',
    updatedAt: '2026-02-01T09:00:00Z', // very old → stale
    localTags: [],
  },
];

const mockCreateTagMutate = vi.fn();
const mockSetIssueTagsMutate = vi.fn();
let currentIssues = mockIssues;

const animatedRows: Issue[] = Array.from({ length: 14 }, (_, index) => ({
  jiraKey: `PROJ-${200 + index}`,
  summary: `Animated defect ${index + 1}`,
  aspenSeverity: '2 - Major',
  priorityName: 'High',
  priorityId: '2',
  statusName: 'To Do',
  statusCategory: 'new',
  assigneeName: `Engineer ${index + 1}`,
  assigneeId: `engineer-${index + 1}`,
  labels: [],
  flagged: false,
  createdAt: '2026-03-03T09:00:00Z',
  updatedAt: '2026-03-05T09:00:00Z',
  localTags: [],
}));

vi.mock('@/hooks/useIssues', () => ({
  useIssues: () => ({ data: currentIssues, isLoading: false }),
}));

vi.mock('@/hooks/useConfig', () => ({
  useConfig: () => ({ data: { jiraBaseUrl: 'https://test.atlassian.net', isConfigured: true } }),
}));

vi.mock('@/hooks/useTags', () => ({
  useTags: () => ({ data: [{ id: 1, name: 'Backend', color: '#6366f1' }] }),
  useCreateTag: () => ({ mutate: mockCreateTagMutate, isPending: false }),
  useSetIssueTags: () => ({ mutate: mockSetIssueTagsMutate, isPending: false }),
}));

describe('DefectTable', () => {
  const onSelectIssue = vi.fn();
  const onFocusedIndexChange = vi.fn();
  const onClearFilters = vi.fn();
  const defaultProps = {
    filter: 'all' as const,
    onSelectIssue,
    focusedIndex: -1,
    onFocusedIndexChange,
    hasAnimated: true,
    onClearFilters,
  };

  beforeEach(() => {
    currentIssues = mockIssues;
    onSelectIssue.mockClear();
    onFocusedIndexChange.mockClear();
    onClearFilters.mockClear();
    mockCreateTagMutate.mockClear();
    mockSetIssueTagsMutate.mockClear();
  });

  it('renders rows from mock data', () => {
    render(
      <TestWrapper>
        <DefectTable {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText('PROJ-101')).toBeInTheDocument();
    expect(screen.getByText('PROJ-102')).toBeInTheDocument();
    expect(screen.getByText('Login page crashes on submit')).toBeInTheDocument();
    expect(screen.getByText('Cart total calculation error')).toBeInTheDocument();
  });

  it('calls onSelectIssue when a row is clicked', () => {
    render(
      <TestWrapper>
        <DefectTable {...defaultProps} />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Login page crashes on submit'));
    expect(onSelectIssue).toHaveBeenCalledWith('PROJ-101');
  });

  it('renders sort headers', () => {
    render(
      <TestWrapper>
        <DefectTable {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText('Sev')).toBeInTheDocument();
    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Tags')).toBeInTheDocument();
    expect(screen.getByText('Assignee')).toBeInTheDocument();
    expect(screen.getByText('Due Date')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Notes')).toBeInTheDocument();
  });

  it('renders Jira links for issue IDs when config available', () => {
    render(
      <TestWrapper>
        <DefectTable {...defaultProps} />
      </TestWrapper>
    );

    const link101 = screen.getByText('PROJ-101').closest('a');
    expect(link101).toHaveAttribute('href', 'https://test.atlassian.net/browse/PROJ-101');
    expect(link101).toHaveAttribute('target', '_blank');
    expect(link101).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('keeps the first follow-up interaction working after a Jira link is highlighted', async () => {
    render(
      <TestWrapper>
        <DefectTable {...defaultProps} />
      </TestWrapper>
    );

    const jiraLink = screen.getByText('PROJ-101').closest('a');
    expect(jiraLink).toBeTruthy();
    if (!jiraLink) {
      throw new Error('Expected Jira link for PROJ-101');
    }

    fireEvent.click(jiraLink);
    expect(screen.getByLabelText('Row indicator: Last opened in Jira')).toBeInTheDocument();

    const openSearchButton = screen.getByLabelText('Open defect search');
    fireEvent.mouseDown(openSearchButton);
    expect(screen.getByLabelText('Row indicator: Last opened in Jira')).toBeInTheDocument();

    fireEvent.click(openSearchButton);
    expect(screen.getByLabelText('Search defects by ID or title')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByLabelText('Row indicator: Last opened in Jira')).not.toBeInTheDocument();
    });
  });

  it('renders stale row in the table', () => {
    render(
      <TestWrapper>
        <DefectTable {...defaultProps} />
      </TestWrapper>
    );

    // PROJ-103 is stale (updatedAt is Feb 2026)
    expect(screen.getByText('PROJ-103')).toBeInTheDocument();
    expect(screen.getByText('Stale defect not updated')).toBeInTheDocument();
    expect(screen.getAllByLabelText('Row indicator: Stale: not updated in the last 48 hours').length).toBeGreaterThan(0);
  });

  it('animates rows beyond the initial viewport cutoff on first load', () => {
    currentIssues = animatedRows;

    render(
      <TestWrapper>
        <DefectTable {...defaultProps} hasAnimated={false} />
      </TestWrapper>
    );

    const laterRow = screen.getByText('PROJ-212').closest('tr');
    expect(laterRow).toHaveAttribute('data-motion-initial', JSON.stringify({ opacity: 0, y: 6 }));
    expect(laterRow).toHaveAttribute('data-motion-transition', JSON.stringify({ duration: 0.2, delay: 0.76 }));
  });

  it('uses ASPEN Severity values for the first-column indicators', () => {
    render(
      <TestWrapper>
        <DefectTable {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByTitle('1 - Critical')).toBeInTheDocument();
    expect(screen.getByTitle('2 - Major')).toBeInTheDocument();
    expect(screen.getByTitle('4 - Low')).toBeInTheDocument();
  });

  it('renders inline tag manage action in Tags column', () => {
    render(
      <TestWrapper>
        <DefectTable {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByLabelText('Manage tags for PROJ-101')).toBeInTheDocument();
  });

  it('does not select triage issue when clicking the tag manage action', () => {
    render(
      <TestWrapper>
        <DefectTable {...defaultProps} />
      </TestWrapper>
    );

    fireEvent.click(screen.getByLabelText('Manage tags for PROJ-101'));
    expect(onSelectIssue).not.toHaveBeenCalledWith('PROJ-101');
  });

  it('selects the row when clicking back into the table while the tag editor is open', () => {
    render(
      <TestWrapper>
        <DefectTable {...defaultProps} />
      </TestWrapper>
    );

    fireEvent.click(screen.getByLabelText('Manage tags for PROJ-101'));
    expect(screen.getByPlaceholderText('Search or create tag…')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Login page crashes on submit'));

    expect(onSelectIssue).toHaveBeenCalledWith('PROJ-101');
  });

  it('selects the row after triggering an inline tag update from the popover', () => {
    render(
      <TestWrapper>
        <DefectTable {...defaultProps} />
      </TestWrapper>
    );

    fireEvent.click(screen.getByLabelText('Manage tags for PROJ-101'));
    fireEvent.change(screen.getByPlaceholderText('Search or create tag…'), { target: { value: 'Backend' } });
    fireEvent.click(screen.getByRole('button', { name: 'Use' }));

    expect(mockSetIssueTagsMutate).toHaveBeenCalled();

    fireEvent.click(screen.getByText('Login page crashes on submit'));

    expect(onSelectIssue).toHaveBeenCalledWith('PROJ-101');
  });

  it('shows subtle analysis state indicators for complete and pending rows', () => {
    render(
      <TestWrapper>
        <DefectTable {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByLabelText('Analysis complete')).toBeInTheDocument();
    expect(screen.getAllByLabelText('Analysis pending').length).toBeGreaterThan(0);
  });

  it('sorts by Notes header', () => {
    render(
      <TestWrapper>
        <DefectTable {...defaultProps} />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Notes'));

    const rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('PROJ-102');
  });

  it('filters visible defects by Jira ID from search', () => {
    render(
      <TestWrapper>
        <DefectTable {...defaultProps} />
      </TestWrapper>
    );

    fireEvent.click(screen.getByLabelText('Open defect search'));
    fireEvent.change(screen.getByLabelText('Search defects by ID or title'), { target: { value: 'PROJ-102' } });

    expect(screen.getByText('PROJ-102')).toBeInTheDocument();
    expect(screen.queryByText('PROJ-101')).not.toBeInTheDocument();
    expect(screen.queryByText('PROJ-103')).not.toBeInTheDocument();
  });

  it('filters visible defects by title from search', () => {
    render(
      <TestWrapper>
        <DefectTable {...defaultProps} />
      </TestWrapper>
    );

    fireEvent.click(screen.getByLabelText('Open defect search'));
    fireEvent.change(screen.getByLabelText('Search defects by ID or title'), { target: { value: 'stale defect' } });

    expect(screen.getByText('PROJ-103')).toBeInTheDocument();
    expect(screen.queryByText('PROJ-101')).not.toBeInTheDocument();
    expect(screen.queryByText('PROJ-102')).not.toBeInTheDocument();
  });

  it('clears dashboard filters and local search from the toolbar action', () => {
    render(
      <TestWrapper>
        <DefectTable {...defaultProps} filter="blocked" assigneeFilter="alice-1" tagId={1} noTags />
      </TestWrapper>
    );

    fireEvent.click(screen.getByLabelText('Open defect search'));
    fireEvent.change(screen.getByLabelText('Search defects by ID or title'), { target: { value: 'PROJ-102' } });
    fireEvent.click(screen.getByLabelText('Clear all defect filters'));

    expect(onClearFilters).toHaveBeenCalled();
    expect(screen.queryByLabelText('Search defects by ID or title')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Open defect search')).toBeInTheDocument();
  });

  it('auto-hides search on blur when query is empty', () => {
    render(
      <TestWrapper>
        <DefectTable {...defaultProps} />
      </TestWrapper>
    );

    fireEvent.click(screen.getByLabelText('Open defect search'));
    const input = screen.getByLabelText('Search defects by ID or title');
    fireEvent.blur(input);

    expect(screen.queryByLabelText('Search defects by ID or title')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Open defect search')).toBeInTheDocument();
  });

  it('keeps search open on blur when query has text', () => {
    render(
      <TestWrapper>
        <DefectTable {...defaultProps} />
      </TestWrapper>
    );

    fireEvent.click(screen.getByLabelText('Open defect search'));
    const input = screen.getByLabelText('Search defects by ID or title');
    fireEvent.change(input, { target: { value: 'PROJ' } });
    fireEvent.blur(input);

    expect(screen.getByLabelText('Search defects by ID or title')).toBeInTheDocument();
  });

  it('uses developmentDueDate as the row due-state source for left indicators', () => {
    const targetIssue = mockIssues.find((issue) => issue.jiraKey === 'PROJ-102');
    expect(targetIssue).toBeDefined();
    if (!targetIssue) {
      throw new Error('Expected PROJ-102 in mockIssues');
    }

    const originalDueDate = targetIssue.dueDate;
    const originalDevDueDate = targetIssue.developmentDueDate;

    // Make sources conflict: Jira due date is overdue, dev due date is far-future.
    targetIssue.dueDate = '2020-01-01';
    targetIssue.developmentDueDate = '2099-01-01';

    try {
      render(
        <TestWrapper>
          <DefectTable {...defaultProps} />
        </TestWrapper>
      );

      const row = screen.getByText('PROJ-102').closest('tr');
      expect(row).toBeTruthy();

      // If dueDate was used, this would be var(--danger); with developmentDueDate precedence,
      // PROJ-102 falls back to flagged styling.
      expect(within(row as HTMLElement).getByLabelText('Row indicator: Flagged issue')).toBeInTheDocument();
    } finally {
      targetIssue.dueDate = originalDueDate;
      targetIssue.developmentDueDate = originalDevDueDate;
    }
  });
});

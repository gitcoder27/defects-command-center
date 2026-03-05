import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DefectTable } from '@/components/table/DefectTable';
import { TestWrapper } from '@/test/wrapper';
import type { Issue } from '@/types';

const mockIssues: Issue[] = [
  {
    jiraKey: 'PROJ-101',
    summary: 'Login page crashes on submit',
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
  },
  {
    jiraKey: 'PROJ-102',
    summary: 'Cart total calculation error',
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

vi.mock('@/hooks/useIssues', () => ({
  useIssues: () => ({ data: mockIssues, isLoading: false }),
}));

vi.mock('@/hooks/useConfig', () => ({
  useConfig: () => ({ data: { jiraBaseUrl: 'https://test.atlassian.net', isConfigured: true } }),
}));

describe('DefectTable', () => {
  const onSelectIssue = vi.fn();
  const onFocusedIndexChange = vi.fn();
  const defaultProps = {
    filter: 'all' as const,
    onSelectIssue,
    focusedIndex: -1,
    onFocusedIndexChange,
    hasAnimated: true,
  };

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

    expect(screen.getByText('Pri')).toBeInTheDocument();
    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Assignee')).toBeInTheDocument();
    expect(screen.getByText('Due Date')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
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

  it('renders stale row in the table', () => {
    render(
      <TestWrapper>
        <DefectTable {...defaultProps} />
      </TestWrapper>
    );

    // PROJ-103 is stale (updatedAt is Feb 2026)
    expect(screen.getByText('PROJ-103')).toBeInTheDocument();
    expect(screen.getByText('Stale defect not updated')).toBeInTheDocument();
  });
});

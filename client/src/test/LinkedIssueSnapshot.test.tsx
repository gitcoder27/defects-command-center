import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LinkedIssueSnapshot } from '@/components/manager-desk/LinkedIssueSnapshot';
import type { Issue } from '@/types';

let mockIssue: Issue;

function buildMockIssue(overrides: Partial<Issue> = {}): Issue {
  return {
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
    ...overrides,
  };
}

vi.mock('@/hooks/useIssueDetail', () => ({
  useIssueDetail: () => ({ data: mockIssue, isLoading: false }),
}));

vi.mock('@/hooks/useConfig', () => ({
  useConfig: () => ({ data: { jiraBaseUrl: 'https://test.atlassian.net', isConfigured: true } }),
}));

describe('LinkedIssueSnapshot', () => {
  beforeEach(() => {
    mockIssue = buildMockIssue();
  });

  it('shows the Jira description by default', () => {
    render(<LinkedIssueSnapshot issueKeys={['PROJ-221']} />);

    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText(/Investigate the review flow regression/i)).toBeInTheDocument();
  });

  it('hides the Jira description when disabled for compact drawers', () => {
    render(<LinkedIssueSnapshot issueKeys={['PROJ-221']} showDescription={false} />);

    expect(screen.queryByText('Description')).not.toBeInTheDocument();
    expect(screen.queryByText(/Investigate the review flow regression/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open in jira/i })).toHaveAttribute(
      'href',
      'https://test.atlassian.net/browse/PROJ-221',
    );
  });
});

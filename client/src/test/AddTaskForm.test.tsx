import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddTaskForm } from '@/components/my-day/AddTaskForm';
import { TestWrapper } from '@/test/wrapper';

const mockGet = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

vi.mock('@/hooks/useConfig', () => ({
  useConfig: () => ({ data: { jiraBaseUrl: 'https://test.atlassian.net', isConfigured: true } }),
}));

describe('AddTaskForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.scrollTo = vi.fn();
    mockGet.mockResolvedValue({
      issues: [
        {
          jiraKey: 'AM-123',
          summary: 'Fix login issue',
          priorityName: 'High',
          dueDate: '2026-03-10',
          developmentDueDate: '2026-03-08',
          labels: [],
          localTags: [],
          priorityId: '1',
          statusName: 'In Progress',
          statusCategory: 'indeterminate',
          flagged: false,
          createdAt: '2026-03-07T08:00:00.000Z',
          updatedAt: '2026-03-07T08:00:00.000Z',
        },
      ],
    });
  });

  it('loads Jira suggestions from the My Day issues endpoint', async () => {
    render(
      <TestWrapper>
        <AddTaskForm onAdd={vi.fn()} />
      </TestWrapper>
    );

    fireEvent.click(screen.getByRole('button', { name: /add task/i }));
    fireEvent.click(screen.getByRole('button', { name: /attach jira/i }));

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('/my-day/issues');
    });
  });

  it('keeps the Jira key link separate from picker selection', async () => {
    render(
      <TestWrapper>
        <AddTaskForm onAdd={vi.fn()} />
      </TestWrapper>
    );

    fireEvent.click(screen.getByRole('button', { name: /add task/i }));
    fireEvent.click(screen.getByRole('button', { name: /attach jira/i }));
    fireEvent.change(screen.getByPlaceholderText(/search by key or summary/i), {
      target: { value: 'AM-123' },
    });

    const jiraLink = await screen.findByRole('link', { name: 'AM-123' });
    fireEvent.click(jiraLink);
    expect(screen.queryByLabelText(/remove linked jira/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Fix login issue'));
    expect(screen.getByLabelText(/remove linked jira/i)).toBeInTheDocument();
  });
});

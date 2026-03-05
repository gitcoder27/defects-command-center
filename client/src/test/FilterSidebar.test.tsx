import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterSidebar } from '@/components/filters/FilterSidebar';
import { TestWrapper } from '@/test/wrapper';
import type { OverviewCounts, DeveloperWorkload } from '@/types';

const mockOverview: OverviewCounts = {
  new: 3,
  unassigned: 5,
  dueToday: 2,
  dueThisWeek: 6,
  overdue: 1,
  blocked: 2,
  stale: 4,
  highPriority: 7,
  inProgress: 8,
  total: 24,
};

const mockWorkload: DeveloperWorkload[] = [
  {
    developer: { accountId: 'alice-1', displayName: 'Alice', isActive: true },
    activeDefects: 4,
    dueToday: 1,
    blocked: 0,
    score: 9,
    level: 'medium',
  },
  {
    developer: { accountId: 'bob-2', displayName: 'Bob', isActive: true },
    activeDefects: 0,
    dueToday: 0,
    blocked: 0,
    score: 0,
    level: 'light',
  },
];

vi.mock('@/hooks/useOverview', () => ({
  useOverview: () => ({ data: mockOverview }),
}));

vi.mock('@/hooks/useWorkload', () => ({
  useWorkload: () => ({ data: mockWorkload }),
}));

describe('FilterSidebar', () => {
  const onFilterChange = vi.fn();
  const onDeveloperChange = vi.fn();

  beforeEach(() => {
    onFilterChange.mockClear();
    onDeveloperChange.mockClear();
  });

  it('renders filter buttons with counts', () => {
    render(
      <TestWrapper>
        <FilterSidebar
          activeFilter="all"
          onFilterChange={onFilterChange}
          onDeveloperChange={onDeveloperChange}
        />
      </TestWrapper>
    );

    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
    expect(screen.getByText('Due Today')).toBeInTheDocument();
    expect(screen.getByText('Overdue')).toBeInTheDocument();
    expect(screen.getByText('Blocked')).toBeInTheDocument();
  });

  it('activates filter on click', () => {
    render(
      <TestWrapper>
        <FilterSidebar
          activeFilter="all"
          onFilterChange={onFilterChange}
          onDeveloperChange={onDeveloperChange}
        />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Unassigned'));
    expect(onFilterChange).toHaveBeenCalledWith('unassigned');
  });

  it('renders developer buttons', () => {
    render(
      <TestWrapper>
        <FilterSidebar
          activeFilter="all"
          onFilterChange={onFilterChange}
          onDeveloperChange={onDeveloperChange}
        />
      </TestWrapper>
    );

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('shows correct counts for dueThisWeek, stale, highPriority', () => {
    render(
      <TestWrapper>
        <FilterSidebar
          activeFilter="all"
          onFilterChange={onFilterChange}
          onDeveloperChange={onDeveloperChange}
        />
      </TestWrapper>
    );

    // These filters now show real counts instead of total
    // Use getAllByText since shortcut badges may also display the same number
    expect(screen.getAllByText('6').length).toBeGreaterThanOrEqual(1); // dueThisWeek
    expect(screen.getAllByText('4').length).toBeGreaterThanOrEqual(1); // stale
    expect(screen.getAllByText('7').length).toBeGreaterThanOrEqual(1); // highPriority
  });
});

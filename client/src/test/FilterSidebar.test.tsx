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

vi.mock('@/hooks/useTags', () => ({
  useTags: () => ({ data: [
    { id: 1, name: 'ANALYSIS', color: '#6366f1' },
    { id: 2, name: 'AMAR', color: '#ec4899' },
  ] }),
}));

vi.mock('@/hooks/useTagCounts', () => ({
  useTagCounts: () => ({ data: {
    counts: [{ tagId: 1, count: 5 }, { tagId: 2, count: 3 }],
    untaggedCount: 2,
  } }),
}));

describe('FilterSidebar', () => {
  const onFilterChange = vi.fn();
  const onDeveloperChange = vi.fn();
  const onTagToggle = vi.fn();
  const onNoTagsToggle = vi.fn();
  const onClearTagFilters = vi.fn();

  const defaultProps = {
    activeFilter: 'all' as const,
    onFilterChange,
    onDeveloperChange,
    selectedTagId: undefined as number | undefined,
    noTagsFilter: false,
    onTagToggle,
    onNoTagsToggle,
    onClearTagFilters,
  };

  beforeEach(() => {
    onFilterChange.mockClear();
    onDeveloperChange.mockClear();
    onTagToggle.mockClear();
    onNoTagsToggle.mockClear();
    onClearTagFilters.mockClear();
  });

  it('renders filter buttons with counts', () => {
    render(
      <TestWrapper>
        <FilterSidebar {...defaultProps} />
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
        <FilterSidebar {...defaultProps} />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Unassigned'));
    expect(onFilterChange).toHaveBeenCalledWith('unassigned');
  });

  it('renders developer buttons', () => {
    render(
      <TestWrapper>
        <FilterSidebar {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('shows correct counts for dueThisWeek, stale, highPriority', () => {
    render(
      <TestWrapper>
        <FilterSidebar {...defaultProps} />
      </TestWrapper>
    );

    // These filters now show real counts instead of total
    // Use getAllByText since shortcut badges may also display the same number
    expect(screen.getAllByText('6').length).toBeGreaterThanOrEqual(1); // dueThisWeek
    expect(screen.getAllByText('4').length).toBeGreaterThanOrEqual(1); // stale
    expect(screen.getAllByText('7').length).toBeGreaterThanOrEqual(1); // highPriority
  });

  it('renders tag filter section with tags when expanded', () => {
    render(
      <TestWrapper>
        <FilterSidebar {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText('Tags')).toBeInTheDocument();
    // Tags section is collapsed by default, expand it
    fireEvent.click(screen.getByText('Tags'));
    expect(screen.getByText('AMAR')).toBeInTheDocument();
    expect(screen.getByText('ANALYSIS')).toBeInTheDocument();
    expect(screen.getByText('No tags')).toBeInTheDocument();
  });

  it('calls onTagToggle when a tag is clicked', () => {
    render(
      <TestWrapper>
        <FilterSidebar {...defaultProps} />
      </TestWrapper>
    );

    // Expand tags section first
    fireEvent.click(screen.getByText('Tags'));
    fireEvent.click(screen.getByText('ANALYSIS'));
    expect(onTagToggle).toHaveBeenCalledWith(1);
  });

  it('calls onNoTagsToggle when No tags is clicked', () => {
    render(
      <TestWrapper>
        <FilterSidebar {...defaultProps} />
      </TestWrapper>
    );

    // Expand tags section first
    fireEvent.click(screen.getByText('Tags'));
    fireEvent.click(screen.getByText('No tags'));
    expect(onNoTagsToggle).toHaveBeenCalled();
  });
});

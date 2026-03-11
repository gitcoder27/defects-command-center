import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OverviewCards } from '@/components/overview/OverviewCards';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { TestWrapper } from '@/test/wrapper';
import type { OverviewCounts } from '@/types';

const mockOverview: OverviewCounts = {
  new: 3,
  recentlyAssigned: 4,
  reopened: 1,
  unassigned: 5,
  dueToday: 2,
  dueThisWeek: 6,
  noDueDate: 2,
  overdue: 1,
  blocked: 2,
  stale: 4,
  highPriority: 7,
  inProgress: 8,
  total: 24,
};

vi.mock('@/hooks/useOverview', () => ({
  useOverview: () => ({ data: mockOverview, isLoading: false }),
}));

function ThemeToggleHarness(props: React.ComponentProps<typeof OverviewCards>) {
  const { toggleTheme } = useTheme();

  return (
    <>
      <button type="button" onClick={toggleTheme}>
        Toggle theme
      </button>
      <OverviewCards {...props} />
    </>
  );
}

describe('OverviewCards', () => {
  const onFilterChange = vi.fn();

  beforeEach(() => {
    onFilterChange.mockClear();
  });

  it('renders 6 cards with correct labels', () => {
    render(
      <TestWrapper>
        <OverviewCards activeFilter="all" onFilterChange={onFilterChange} />
      </TestWrapper>
    );

    expect(screen.getByText('Total Defects')).toBeInTheDocument();
    expect(screen.getByText('New to Team (24h)')).toBeInTheDocument();
    expect(screen.getByText('Due Today')).toBeInTheDocument();
    expect(screen.getByText('Overdue')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('New (24h)')).toBeInTheDocument();
  });

  it('calls filter callback when a card is clicked', () => {
    render(
      <TestWrapper>
        <OverviewCards activeFilter="all" onFilterChange={onFilterChange} />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('New to Team (24h)'));
    expect(onFilterChange).toHaveBeenCalledWith('recentlyAssigned');
  });

  it('calls filter with "new" when New card is clicked', () => {
    render(
      <TestWrapper>
        <OverviewCards activeFilter="all" onFilterChange={onFilterChange} />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('New (24h)'));
    expect(onFilterChange).toHaveBeenCalledWith('new');
  });

  it('calls filter with "inProgress" when In Progress card is clicked', () => {
    render(
      <TestWrapper>
        <OverviewCards activeFilter="all" onFilterChange={onFilterChange} />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('In Progress'));
    expect(onFilterChange).toHaveBeenCalledWith('inProgress');
  });

  it('renders the overview cards in a single horizontal strip', () => {
    render(
      <TestWrapper>
        <OverviewCards activeFilter="all" onFilterChange={onFilterChange} />
      </TestWrapper>
    );

    expect(screen.getByTestId('overview-cards-strip')).toHaveClass('flex', 'overflow-x-auto');
  });

  it('uses theme-aware color tokens for the active total defects count across theme switches', () => {
    render(
      <ThemeProvider>
        <TestWrapper>
          <ThemeToggleHarness activeFilter="all" onFilterChange={onFilterChange} />
        </TestWrapper>
      </ThemeProvider>
    );

    const totalCard = screen.getByRole('button', { name: /total defects/i });
    const totalCount = totalCard.querySelector('.tabular-nums');
    expect(totalCount).toBeTruthy();
    if (!totalCount) {
      throw new Error('Expected active Total Defects count element');
    }

    expect(totalCount.getAttribute('style')).toContain('var(--text-primary)');
    expect(totalCount.getAttribute('style')).not.toContain('#0f172a');

    fireEvent.click(screen.getByRole('button', { name: 'Toggle theme' }));

    expect(document.documentElement).toHaveClass('dark');
    expect(totalCount.getAttribute('style')).toContain('var(--text-primary)');
    expect(totalCount.getAttribute('style')).not.toContain('#0f172a');
  });
});

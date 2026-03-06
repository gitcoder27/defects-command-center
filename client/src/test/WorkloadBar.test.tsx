import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkloadBar } from '@/components/workload/WorkloadBar';
import { TestWrapper } from '@/test/wrapper';
import type { DeveloperWorkload } from '@/types';

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
    developer: { accountId: 'eve-5', displayName: 'Eve', isActive: true },
    activeDefects: 0,
    dueToday: 0,
    blocked: 0,
    score: 0,
    level: 'light',
  },
];

vi.mock('@/hooks/useWorkload', () => ({
  useWorkload: () => ({ data: mockWorkload, isLoading: false }),
}));

describe('WorkloadBar', () => {
  const onDeveloperClick = vi.fn();

  it('renders developer cards', () => {
    render(
      <TestWrapper>
        <WorkloadBar onDeveloperClick={onDeveloperClick} />
      </TestWrapper>
    );

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Eve')).toBeInTheDocument();
  });

  it('shows idle badge for score=0', async () => {
    render(
      <TestWrapper>
        <WorkloadBar onDeveloperClick={onDeveloperClick} />
      </TestWrapper>
    );

    // Expand the workload panel to reveal full DeveloperCards with ⚠ badges
    const toggle = screen.getByText('Workload').closest('button')!;
    fireEvent.click(toggle);

    // Eve has 0 active defects, should show warning
    const warnings = screen.getAllByText('⚠');
    expect(warnings.length).toBeGreaterThanOrEqual(1);
  });

  it('displays scores', () => {
    render(
      <TestWrapper>
        <WorkloadBar onDeveloperClick={onDeveloperClick} />
      </TestWrapper>
    );

    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});

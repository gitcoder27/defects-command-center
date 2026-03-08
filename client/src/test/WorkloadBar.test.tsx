import { beforeEach, describe, it, expect, vi } from 'vitest';
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

  beforeEach(() => {
    onDeveloperClick.mockClear();
  });

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

    fireEvent.click(screen.getAllByLabelText('Expand workload panel')[0]!);

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

  it('applies a developer filter when a collapsed pill is clicked', () => {
    render(
      <TestWrapper>
        <WorkloadBar onDeveloperClick={onDeveloperClick} />
      </TestWrapper>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Filter by Alice' }));

    expect(onDeveloperClick).toHaveBeenCalledWith('alice-1');
  });

  it('expands when the collapsed header empty space is clicked', () => {
    render(
      <TestWrapper>
        <WorkloadBar onDeveloperClick={onDeveloperClick} />
      </TestWrapper>
    );

    fireEvent.click(screen.getByTestId('workload-bar-header'));

    expect(screen.getByText('Team capacity radar')).toBeInTheDocument();
    expect(onDeveloperClick).not.toHaveBeenCalled();
  });

  it('clears the developer filter when the active pill is clicked again', () => {
    render(
      <TestWrapper>
        <WorkloadBar activeDeveloper="alice-1" onDeveloperClick={onDeveloperClick} />
      </TestWrapper>
    );

    const aliceFilter = screen.getByRole('button', { name: 'Filter by Alice' });
    expect(aliceFilter).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(aliceFilter);

    expect(onDeveloperClick).toHaveBeenCalledWith(undefined);
  });
});

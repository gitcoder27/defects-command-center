import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

const mockTriggerSync = {
  mutate: vi.fn(),
};

const defectTableSpy = vi.fn();

vi.mock('@/hooks/useTriggerSync', () => ({
  useTriggerSync: () => mockTriggerSync,
}));

vi.mock('@/hooks/useMediaQuery', () => ({
  useMediaQuery: () => false,
}));

vi.mock('@/components/layout/Header', () => ({
  Header: () => <div>Header</div>,
}));

vi.mock('@/components/overview/OverviewCards', () => ({
  OverviewCards: ({ onFilterChange }: { onFilterChange: (filter: 'new') => void }) => (
    <button onClick={() => onFilterChange('new')}>New Card</button>
  ),
}));

vi.mock('@/components/alerts/AlertBanner', () => ({
  AlertBanner: () => null,
}));

vi.mock('@/components/alerts/ErrorBanner', () => ({
  ErrorBanner: () => null,
}));

vi.mock('@/components/filters/FilterSidebar', () => ({
  FilterSidebar: () => null,
}));

vi.mock('@/components/table/DefectTable', () => ({
  DefectTable: (props: unknown) => {
    defectTableSpy(props);
    return <div>Defect Table</div>;
  },
  useTableIssueKeys: () => [],
}));

vi.mock('@/components/triage/TriagePanel', () => ({
  TriagePanel: () => null,
}));

vi.mock('@/components/workload/WorkloadBar', () => ({
  WorkloadBar: ({ onDeveloperClick }: { onDeveloperClick: (accountId: string) => void }) => (
    <button onClick={() => onDeveloperClick('dev-1')}>Select Developer</button>
  ),
}));

vi.mock('@/components/settings/SettingsPanel', () => ({
  SettingsPanel: () => null,
}));

describe('DashboardLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clears the active developer when a top overview card is clicked', () => {
    render(<DashboardLayout />);

    fireEvent.click(screen.getByText('Select Developer'));
    fireEvent.click(screen.getByText('New Card'));

    const lastCall = defectTableSpy.mock.calls.at(-1)?.[0] as { filter: string; assigneeFilter?: string };
    expect(lastCall.filter).toBe('new');
    expect(lastCall.assigneeFilter).toBeUndefined();
  });
});

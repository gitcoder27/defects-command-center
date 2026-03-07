import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

const mockTriggerSync = {
  mutate: vi.fn(),
};

const defectTableSpy = vi.fn();
const filterSidebarSpy = vi.fn();
const useMediaQueryMock = vi.fn(() => false);

vi.mock('@/hooks/useTriggerSync', () => ({
  useTriggerSync: () => mockTriggerSync,
}));

vi.mock('@/hooks/useMediaQuery', () => ({
  useMediaQuery: () => useMediaQueryMock(),
}));

vi.mock('@/components/layout/Header', () => ({
  Header: ({ onOpenMobileSidebar }: { onOpenMobileSidebar?: () => void }) => (
    <button onClick={onOpenMobileSidebar}>Header</button>
  ),
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
  FilterSidebar: (props: { onCollapse?: () => void }) => {
    filterSidebarSpy(props);
    return <button onClick={props.onCollapse}>Sidebar</button>;
  },
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
  WorkloadBar: ({ activeDeveloper, onDeveloperClick }: { activeDeveloper?: string; onDeveloperClick: (accountId?: string) => void }) => (
    <button onClick={() => onDeveloperClick(activeDeveloper === 'dev-1' ? undefined : 'dev-1')}>Select Developer</button>
  ),
}));

vi.mock('@/components/settings/SettingsPanel', () => ({
  SettingsPanel: () => null,
}));

describe('DashboardLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useMediaQueryMock.mockReturnValue(false);
  });

  it('keeps the active developer when a top overview card is clicked', () => {
    render(<DashboardLayout />);

    fireEvent.click(screen.getByText('Select Developer'));
    fireEvent.click(screen.getByText('New Card'));

    const lastCall = defectTableSpy.mock.calls.at(-1)?.[0] as { filter: string; assigneeFilter?: string };
    expect(lastCall.filter).toBe('new');
    expect(lastCall.assigneeFilter).toBe('dev-1');
  });

  it('renders the desktop sidebar collapsed by default', () => {
    render(<DashboardLayout />);

    const lastCall = filterSidebarSpy.mock.calls.at(-1)?.[0] as { collapsed: boolean; open: boolean; isMobile: boolean };
    expect(lastCall.isMobile).toBe(false);
    expect(lastCall.open).toBe(true);
    expect(lastCall.collapsed).toBe(true);
  });

  it('syncs workload developer selection into the sidebar and defect table filters', () => {
    render(<DashboardLayout />);

    fireEvent.click(screen.getByText('Select Developer'));

    const lastSidebarCall = filterSidebarSpy.mock.calls.at(-1)?.[0] as { activeDeveloper?: string };
    const lastTableCall = defectTableSpy.mock.calls.at(-1)?.[0] as { assigneeFilter?: string };

    expect(lastSidebarCall.activeDeveloper).toBe('dev-1');
    expect(lastTableCall.assigneeFilter).toBe('dev-1');
  });

  it('keeps the active jira filter when a workload developer is selected', () => {
    render(<DashboardLayout />);

    fireEvent.click(screen.getByText('New Card'));
    fireEvent.click(screen.getByText('Select Developer'));

    const lastSidebarCall = filterSidebarSpy.mock.calls.at(-1)?.[0] as { activeFilter: string; activeDeveloper?: string };
    const lastTableCall = defectTableSpy.mock.calls.at(-1)?.[0] as { filter: string; assigneeFilter?: string };

    expect(lastSidebarCall.activeFilter).toBe('new');
    expect(lastSidebarCall.activeDeveloper).toBe('dev-1');
    expect(lastTableCall.filter).toBe('new');
    expect(lastTableCall.assigneeFilter).toBe('dev-1');
  });

  it('opens the mobile drawer from the header toggle', () => {
    useMediaQueryMock.mockReturnValue(true);

    render(<DashboardLayout />);

    fireEvent.click(screen.getByText('Header'));

    const lastCall = filterSidebarSpy.mock.calls.at(-1)?.[0] as { collapsed: boolean; open: boolean; isMobile: boolean };
    expect(lastCall.isMobile).toBe(true);
    expect(lastCall.open).toBe(true);
    expect(lastCall.collapsed).toBe(false);
  });
});

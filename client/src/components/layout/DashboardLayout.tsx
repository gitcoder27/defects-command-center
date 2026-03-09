import { useState, useCallback, useEffect, useRef } from 'react';
import { Header } from './Header';
import { OverviewCards } from '@/components/overview/OverviewCards';
import { AlertBanner } from '@/components/alerts/AlertBanner';
import { ErrorBanner } from '@/components/alerts/ErrorBanner';
import { FilterSidebar } from '@/components/filters/FilterSidebar';
import { DefectTable, useTableIssueKeys } from '@/components/table/DefectTable';
import { TriagePanel } from '@/components/triage/TriagePanel';
import { WorkloadBar } from '@/components/workload/WorkloadBar';
import { useTriggerSync } from '@/hooks/useTriggerSync';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import type { FilterType, Alert } from '@/types';
import type { AppView } from '@/App';

export interface DashboardFilterState {
  activeFilter: FilterType;
  activeDeveloper?: string;
  selectedTagId?: number;
  noTagsFilter: boolean;
}

export const DEFAULT_DASHBOARD_FILTER_STATE: DashboardFilterState = {
  activeFilter: 'all',
  activeDeveloper: undefined,
  selectedTagId: undefined,
  noTagsFilter: false,
};

interface DashboardLayoutProps {
  activeView?: AppView;
  onViewChange?: (view: AppView) => void;
  filterState?: DashboardFilterState;
  onFilterStateChange?: (state: DashboardFilterState) => void;
}

export function DashboardLayout({ activeView, onViewChange, filterState, onFilterStateChange }: DashboardLayoutProps) {
  const [internalFilterState, setInternalFilterState] = useState<DashboardFilterState>(DEFAULT_DASHBOARD_FILTER_STATE);
  const [selectedIssueKey, setSelectedIssueKey] = useState<string | undefined>();
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [desktopSidebarExpanded, setDesktopSidebarExpanded] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const hasAnimatedRef = useRef(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const triggerSync = useTriggerSync();

  const isCompact = useMediaQuery('(max-width: 1023px)');
  const isControlled = filterState !== undefined && onFilterStateChange !== undefined;
  const resolvedFilterState = filterState ?? internalFilterState;
  const { activeFilter, activeDeveloper, selectedTagId, noTagsFilter } = resolvedFilterState;

  const setFilterState = useCallback((updater: DashboardFilterState | ((prev: DashboardFilterState) => DashboardFilterState)) => {
    const nextState = typeof updater === 'function' ? updater(resolvedFilterState) : updater;

    if (isControlled) {
      onFilterStateChange(nextState);
      return;
    }

    setInternalFilterState(nextState);
  }, [isControlled, onFilterStateChange, resolvedFilterState]);

  useEffect(() => {
    if (!isCompact) {
      setMobileSidebarOpen(false);
    }
  }, [isCompact]);

  // Get current issue list for keyboard nav
  const issues = useTableIssueKeys(activeFilter, activeDeveloper, selectedTagId, noTagsFilter);

  // Mark animation as played after first render
  useEffect(() => {
    if (!hasAnimatedRef.current) {
      const timer = setTimeout(() => {
        hasAnimatedRef.current = true;
        setHasAnimated(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const closeSidebarOnCompact = useCallback(() => {
    if (isCompact) {
      setMobileSidebarOpen(false);
    }
  }, [isCompact]);

  const handleFilterChange = useCallback((filter: FilterType) => {
    setFilterState((prev) => ({ ...prev, activeFilter: filter }));
    setSelectedIssueKey(undefined);
    setFocusedIndex(-1);
    closeSidebarOnCompact();
  }, [closeSidebarOnCompact, setFilterState]);

  const handleDeveloperChange = useCallback((accountId?: string) => {
    setFilterState((prev) => ({ ...prev, activeDeveloper: accountId }));
    setSelectedIssueKey(undefined);
    setFocusedIndex(-1);
    closeSidebarOnCompact();
  }, [closeSidebarOnCompact, setFilterState]);

  const handleTagToggle = useCallback((tagId: number) => {
    setFilterState((prev) => ({
      ...prev,
      noTagsFilter: false,
      selectedTagId: prev.selectedTagId === tagId ? undefined : tagId,
    }));
    setSelectedIssueKey(undefined);
    setFocusedIndex(-1);
    closeSidebarOnCompact();
  }, [closeSidebarOnCompact, setFilterState]);

  const handleNoTagsToggle = useCallback(() => {
    setFilterState((prev) => ({
      ...prev,
      noTagsFilter: !prev.noTagsFilter,
      selectedTagId: undefined,
    }));
    setSelectedIssueKey(undefined);
    setFocusedIndex(-1);
    closeSidebarOnCompact();
  }, [closeSidebarOnCompact, setFilterState]);

  const handleClearTagFilters = useCallback(() => {
    setFilterState((prev) => ({
      ...prev,
      selectedTagId: undefined,
      noTagsFilter: false,
    }));
    setSelectedIssueKey(undefined);
    setFocusedIndex(-1);
    closeSidebarOnCompact();
  }, [closeSidebarOnCompact, setFilterState]);

  const handleClearAllFilters = useCallback(() => {
    setFilterState(DEFAULT_DASHBOARD_FILTER_STATE);
    setSelectedIssueKey(undefined);
    setFocusedIndex(-1);
  }, [setFilterState]);

  const handleSelectIssue = useCallback((key: string) => {
    setSelectedIssueKey((prev) => (prev === key ? undefined : key));
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedIssueKey(undefined);
  }, []);

  const handleAlertClick = useCallback((alert: Alert) => {
    if (alert.issueKey) {
      setSelectedIssueKey(alert.issueKey);
    } else if (alert.developerAccountId) {
      setFilterState((prev) => ({ ...prev, activeDeveloper: alert.developerAccountId }));
    }
  }, [setFilterState]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // Don't capture when typing in inputs
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex((prev) => Math.min(prev + 1, issues.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < issues.length) {
            const issue = issues[focusedIndex];
            if (issue) {
              setSelectedIssueKey((prev) => (prev === issue.jiraKey ? undefined : issue.jiraKey));
            }
          }
          break;
        case 'r':
          e.preventDefault();
          triggerSync.mutate();
          break;
        case '0':
          e.preventDefault();
          setFilterState((prev) => ({ ...prev, activeFilter: 'all' }));
          setFocusedIndex(-1);
          break;
        case '1':
          e.preventDefault();
          setFilterState((prev) => ({ ...prev, activeFilter: 'all' }));
          setFocusedIndex(-1);
          break;
        case '2':
          e.preventDefault();
          setFilterState((prev) => ({ ...prev, activeFilter: 'unassigned' }));
          setFocusedIndex(-1);
          break;
        case '3':
          e.preventDefault();
          setFilterState((prev) => ({ ...prev, activeFilter: 'dueToday' }));
          setFocusedIndex(-1);
          break;
        case '4':
          e.preventDefault();
          setFilterState((prev) => ({ ...prev, activeFilter: 'dueThisWeek' }));
          setFocusedIndex(-1);
          break;
        case '5':
          e.preventDefault();
          setFilterState((prev) => ({ ...prev, activeFilter: 'overdue' }));
          setFocusedIndex(-1);
          break;
        case '6':
          e.preventDefault();
          setFilterState((prev) => ({ ...prev, activeFilter: 'blocked' }));
          setFocusedIndex(-1);
          break;
        case '7':
          e.preventDefault();
          setFilterState((prev) => ({ ...prev, activeFilter: 'stale' }));
          setFocusedIndex(-1);
          break;
        case 'Escape':
          setSelectedIssueKey(undefined);
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [triggerSync, issues, focusedIndex, setFilterState]);

  const handleToggleSidebar = useCallback(() => {
    if (isCompact) {
      setMobileSidebarOpen((prev) => !prev);
      return;
    }

    setDesktopSidebarExpanded((prev) => !prev);
  }, [isCompact]);

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: 'transparent' }}>
      <Header
        onOpenMobileSidebar={isCompact ? () => setMobileSidebarOpen(true) : undefined}
        activeView={activeView}
        onViewChange={onViewChange}
      />

      <div className="flex-1 min-h-0 px-1.5 pb-1 md:px-2 md:pb-1.5">
        <div className="h-full min-h-0 min-w-0 rounded-[16px] border overflow-hidden flex flex-col" style={{ borderColor: 'var(--border-strong)', background: 'color-mix(in srgb, var(--bg-primary) 84%, transparent)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}>
          <OverviewCards activeFilter={activeFilter} onFilterChange={handleFilterChange} />

          <AlertBanner onAlertClick={handleAlertClick} />
          <ErrorBanner />

          <div className="flex flex-1 min-h-0 min-w-0 relative">
            <FilterSidebar
              activeFilter={activeFilter}
              activeDeveloper={activeDeveloper}
              onFilterChange={handleFilterChange}
              onDeveloperChange={handleDeveloperChange}
              selectedTagId={selectedTagId}
              noTagsFilter={noTagsFilter}
              onTagToggle={handleTagToggle}
              onNoTagsToggle={handleNoTagsToggle}
              onClearTagFilters={handleClearTagFilters}
              collapsed={!isCompact && !desktopSidebarExpanded}
              isMobile={isCompact}
              open={!isCompact || mobileSidebarOpen}
              onClose={() => setMobileSidebarOpen(false)}
              onCollapse={() => setDesktopSidebarExpanded(false)}
              onExpand={() => setDesktopSidebarExpanded(true)}
            />

            <DefectTable
              filter={activeFilter}
              assigneeFilter={activeDeveloper}
              selectedKey={selectedIssueKey}
              focusedIndex={focusedIndex}
              onFocusedIndexChange={setFocusedIndex}
              onSelectIssue={handleSelectIssue}
              hasAnimated={hasAnimated}
              tagId={selectedTagId}
              noTags={noTagsFilter}
              onClearFilters={handleClearAllFilters}
            />

            {/* Triage panel always overlays the table */}
            {selectedIssueKey && (
              <div
                className="absolute inset-0 bg-black/30 z-40 backdrop-blur-[1px]"
                onClick={handleClosePanel}
              />
            )}
            <div className="absolute right-0 top-0 bottom-0 z-50 pointer-events-none">
              <div className="pointer-events-auto h-full">
                <TriagePanel issueKey={selectedIssueKey} onClose={handleClosePanel} />
              </div>
            </div>
          </div>

          <WorkloadBar activeDeveloper={activeDeveloper} onDeveloperClick={handleDeveloperChange} />
        </div>
      </div>

    </div>
  );
}

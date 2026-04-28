import { useState, useCallback, useEffect, useRef } from 'react';
import { Header } from './Header';
import { OverviewCards } from '@/components/overview/OverviewCards';
import { ErrorBanner } from '@/components/alerts/ErrorBanner';
import { FilterSidebar } from '@/components/filters/FilterSidebar';
import { DefectTable, useTableIssueKeys } from '@/components/table/DefectTable';
import { TriagePanel } from '@/components/triage/TriagePanel';
import { WorkloadBar } from '@/components/workload/WorkloadBar';
import { WorkFocusStrip } from '@/components/work/WorkFocusStrip';
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

const RETAINED_HIGHLIGHT_INTERACTIVE_SELECTOR = [
  'button',
  'a',
  'input',
  'select',
  'textarea',
  '[role="button"]',
  '[role="link"]',
  '[data-inline-edit-trigger]',
  '[data-tag-editor-root]',
  '[data-tag-editor-popover]',
  '[contenteditable="true"]',
].join(', ');

interface DashboardLayoutProps {
  activeView?: AppView;
  onViewChange?: (view: AppView) => void;
  filterState?: DashboardFilterState;
  onFilterStateChange?: (state: DashboardFilterState) => void;
}

export function DashboardLayout({ activeView, onViewChange, filterState, onFilterStateChange }: DashboardLayoutProps) {
  const [internalFilterState, setInternalFilterState] = useState<DashboardFilterState>(DEFAULT_DASHBOARD_FILTER_STATE);
  const [selectedIssueKey, setSelectedIssueKey] = useState<string | undefined>();
  const [highlightedIssueKey, setHighlightedIssueKey] = useState<string | undefined>();
  const [shouldClearHighlightedIssueOnInteraction, setShouldClearHighlightedIssueOnInteraction] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [desktopSidebarExpanded, setDesktopSidebarExpanded] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const hasAnimatedRef = useRef(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const armHighlightClearTimeoutRef = useRef<number | null>(null);
  const clearHighlightTimeoutRef = useRef<number | null>(null);
  const selectedIssueKeyRef = useRef<string | undefined>(selectedIssueKey);
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

  selectedIssueKeyRef.current = selectedIssueKey;

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

  const cancelHighlightClearTimers = useCallback(() => {
    if (armHighlightClearTimeoutRef.current !== null) {
      window.clearTimeout(armHighlightClearTimeoutRef.current);
      armHighlightClearTimeoutRef.current = null;
    }

    if (clearHighlightTimeoutRef.current !== null) {
      window.clearTimeout(clearHighlightTimeoutRef.current);
      clearHighlightTimeoutRef.current = null;
    }
  }, []);

  const clearIssueHighlight = useCallback(() => {
    cancelHighlightClearTimers();
    setSelectedIssueKey(undefined);
    setHighlightedIssueKey(undefined);
    setShouldClearHighlightedIssueOnInteraction(false);
  }, [cancelHighlightClearTimers]);

  const openIssue = useCallback((key: string) => {
    cancelHighlightClearTimers();

    if (selectedIssueKeyRef.current === key) {
      setSelectedIssueKey(undefined);
      setHighlightedIssueKey(key);
      setShouldClearHighlightedIssueOnInteraction(true);
      return;
    }

    setSelectedIssueKey(key);
    setHighlightedIssueKey(key);
    setShouldClearHighlightedIssueOnInteraction(false);
  }, [cancelHighlightClearTimers]);

  const closePanel = useCallback(() => {
    cancelHighlightClearTimers();
    setSelectedIssueKey(undefined);
    setShouldClearHighlightedIssueOnInteraction(Boolean(highlightedIssueKey));
  }, [cancelHighlightClearTimers, highlightedIssueKey]);

  const scheduleHighlightedIssueClear = useCallback(() => {
    if (clearHighlightTimeoutRef.current !== null) {
      window.clearTimeout(clearHighlightTimeoutRef.current);
    }

    clearHighlightTimeoutRef.current = window.setTimeout(() => {
      clearHighlightTimeoutRef.current = null;

      if (selectedIssueKeyRef.current) {
        return;
      }

      setHighlightedIssueKey(undefined);
      setShouldClearHighlightedIssueOnInteraction(false);
    }, 0);
  }, []);

  const handleFilterChange = useCallback((filter: FilterType) => {
    setFilterState((prev) => ({ ...prev, activeFilter: filter }));
    clearIssueHighlight();
    setFocusedIndex(-1);
    closeSidebarOnCompact();
  }, [clearIssueHighlight, closeSidebarOnCompact, setFilterState]);

  const handleClearFilter = useCallback(() => {
    setFilterState((prev) => ({ ...prev, activeFilter: 'all' }));
    clearIssueHighlight();
    setFocusedIndex(-1);
    closeSidebarOnCompact();
  }, [clearIssueHighlight, closeSidebarOnCompact, setFilterState]);

  const handleDeveloperChange = useCallback((accountId?: string) => {
    setFilterState((prev) => ({ ...prev, activeDeveloper: accountId }));
    clearIssueHighlight();
    setFocusedIndex(-1);
    closeSidebarOnCompact();
  }, [clearIssueHighlight, closeSidebarOnCompact, setFilterState]);

  const handleClearDeveloper = useCallback(() => {
    setFilterState((prev) => ({ ...prev, activeDeveloper: undefined }));
    clearIssueHighlight();
    setFocusedIndex(-1);
    closeSidebarOnCompact();
  }, [clearIssueHighlight, closeSidebarOnCompact, setFilterState]);

  const handleTagToggle = useCallback((tagId: number) => {
    setFilterState((prev) => ({
      ...prev,
      noTagsFilter: false,
      selectedTagId: prev.selectedTagId === tagId ? undefined : tagId,
    }));
    clearIssueHighlight();
    setFocusedIndex(-1);
    closeSidebarOnCompact();
  }, [clearIssueHighlight, closeSidebarOnCompact, setFilterState]);

  const handleNoTagsToggle = useCallback(() => {
    setFilterState((prev) => ({
      ...prev,
      noTagsFilter: !prev.noTagsFilter,
      selectedTagId: undefined,
    }));
    clearIssueHighlight();
    setFocusedIndex(-1);
    closeSidebarOnCompact();
  }, [clearIssueHighlight, closeSidebarOnCompact, setFilterState]);

  const handleClearTagFilters = useCallback(() => {
    setFilterState((prev) => ({
      ...prev,
      selectedTagId: undefined,
      noTagsFilter: false,
    }));
    clearIssueHighlight();
    setFocusedIndex(-1);
    closeSidebarOnCompact();
  }, [clearIssueHighlight, closeSidebarOnCompact, setFilterState]);

  const handleClearAllFilters = useCallback(() => {
    setFilterState(DEFAULT_DASHBOARD_FILTER_STATE);
    clearIssueHighlight();
    setFocusedIndex(-1);
  }, [clearIssueHighlight, setFilterState]);

  const handleSelectIssue = useCallback((key: string) => {
    openIssue(key);
  }, [openIssue]);

  const handleClosePanel = useCallback(() => {
    closePanel();
  }, [closePanel]);

  const handleAlertClick = useCallback((alert: Alert) => {
    if (alert.issueKey) {
      openIssue(alert.issueKey);
    } else if (alert.developerAccountId) {
      setFilterState((prev) => ({ ...prev, activeDeveloper: alert.developerAccountId }));
    }
  }, [openIssue, setFilterState]);

  useEffect(() => {
    if (!shouldClearHighlightedIssueOnInteraction || selectedIssueKey || !highlightedIssueKey) {
      return;
    }

    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest(RETAINED_HIGHLIGHT_INTERACTIVE_SELECTOR)) {
        return;
      }

      scheduleHighlightedIssueClear();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Shift' || event.key === 'Control' || event.key === 'Alt' || event.key === 'Meta') {
        return;
      }

      scheduleHighlightedIssueClear();
    };

    armHighlightClearTimeoutRef.current = window.setTimeout(() => {
      armHighlightClearTimeoutRef.current = null;
      window.addEventListener('click', handleClick, true);
      window.addEventListener('keydown', handleKeyDown, true);
    }, 0);

    return () => {
      if (armHighlightClearTimeoutRef.current !== null) {
        window.clearTimeout(armHighlightClearTimeoutRef.current);
        armHighlightClearTimeoutRef.current = null;
      }

      window.removeEventListener('click', handleClick, true);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [highlightedIssueKey, scheduleHighlightedIssueClear, selectedIssueKey, shouldClearHighlightedIssueOnInteraction]);

  useEffect(() => {
    return () => {
      cancelHighlightClearTimers();
    };
  }, [cancelHighlightClearTimers]);

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
              openIssue(issue.jiraKey);
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
          clearIssueHighlight();
          setFocusedIndex(-1);
          break;
        case '1':
          e.preventDefault();
          setFilterState((prev) => ({ ...prev, activeFilter: 'all' }));
          clearIssueHighlight();
          setFocusedIndex(-1);
          break;
        case '2':
          e.preventDefault();
          setFilterState((prev) => ({ ...prev, activeFilter: 'unassigned' }));
          clearIssueHighlight();
          setFocusedIndex(-1);
          break;
        case '3':
          e.preventDefault();
          setFilterState((prev) => ({ ...prev, activeFilter: 'dueToday' }));
          clearIssueHighlight();
          setFocusedIndex(-1);
          break;
        case '4':
          e.preventDefault();
          setFilterState((prev) => ({ ...prev, activeFilter: 'dueThisWeek' }));
          clearIssueHighlight();
          setFocusedIndex(-1);
          break;
        case '5':
          e.preventDefault();
          setFilterState((prev) => ({ ...prev, activeFilter: 'overdue' }));
          clearIssueHighlight();
          setFocusedIndex(-1);
          break;
        case '6':
          e.preventDefault();
          setFilterState((prev) => ({ ...prev, activeFilter: 'blocked' }));
          clearIssueHighlight();
          setFocusedIndex(-1);
          break;
        case '7':
          e.preventDefault();
          setFilterState((prev) => ({ ...prev, activeFilter: 'stale' }));
          clearIssueHighlight();
          setFocusedIndex(-1);
          break;
        case 'Escape':
          closePanel();
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [clearIssueHighlight, closePanel, focusedIndex, issues, openIssue, setFilterState, triggerSync]);

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
        onDashboardAlertClick={handleAlertClick}
      />

      <div className="flex-1 min-h-0 px-1 pb-0.5 md:px-1.5 md:pb-1">
        <div className="h-full min-h-0 min-w-0 rounded-[16px] border overflow-hidden flex flex-col" style={{ borderColor: 'var(--border-strong)', background: 'color-mix(in srgb, var(--bg-primary) 84%, transparent)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}>
          <OverviewCards activeFilter={activeFilter} onFilterChange={handleFilterChange} />

          <WorkFocusStrip
            onFilterChange={handleFilterChange}
            onOpenDesk={onViewChange ? () => onViewChange('desk') : undefined}
            onOpenTeam={onViewChange ? () => onViewChange('team') : undefined}
          />

          <ErrorBanner />

          <div className="flex flex-1 min-h-0 min-w-0 relative">
            <FilterSidebar
              activeFilter={activeFilter}
              activeDeveloper={activeDeveloper}
              onFilterChange={handleFilterChange}
              onClearFilter={handleClearFilter}
              onDeveloperChange={handleDeveloperChange}
              onClearDeveloper={handleClearDeveloper}
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
              highlightedKey={highlightedIssueKey}
              focusedIndex={focusedIndex}
              onFocusedIndexChange={setFocusedIndex}
              onSelectIssue={handleSelectIssue}
              hasAnimated={hasAnimated}
              tagId={selectedTagId}
              noTags={noTagsFilter}
              onClearFilters={handleClearAllFilters}
            />

            {/* Subtle backdrop — click to dismiss */}
            {selectedIssueKey && (
              <div
                className="absolute inset-0 z-40 transition-opacity duration-200"
                style={{ background: 'rgba(0,0,0,0.08)', backdropFilter: 'blur(0.5px)' }}
                onClick={handleClosePanel}
              />
            )}
            <div className="absolute right-0 top-0 bottom-0 z-50 pointer-events-none">
              <div className="pointer-events-auto h-full">
                <TriagePanel
                  issueKey={selectedIssueKey}
                  onClose={handleClosePanel}
                  onOpenManagerDesk={onViewChange ? () => onViewChange('desk') : undefined}
                />
              </div>
            </div>
          </div>

          <WorkloadBar activeDeveloper={activeDeveloper} onDeveloperClick={handleDeveloperChange} />
        </div>
      </div>

    </div>
  );
}

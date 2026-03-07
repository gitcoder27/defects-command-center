import { useState, useCallback, useEffect, useRef } from 'react';
import { Header } from './Header';
import { OverviewCards } from '@/components/overview/OverviewCards';
import { AlertBanner } from '@/components/alerts/AlertBanner';
import { ErrorBanner } from '@/components/alerts/ErrorBanner';
import { FilterSidebar } from '@/components/filters/FilterSidebar';
import { DefectTable, useTableIssueKeys } from '@/components/table/DefectTable';
import { TriagePanel } from '@/components/triage/TriagePanel';
import { WorkloadBar } from '@/components/workload/WorkloadBar';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { useTriggerSync } from '@/hooks/useTriggerSync';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import type { FilterType, Alert } from '@/types';
import type { AppView } from '@/App';

interface DashboardLayoutProps {
  activeView?: AppView;
  onViewChange?: (view: AppView) => void;
}

export function DashboardLayout({ activeView, onViewChange }: DashboardLayoutProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [activeDeveloper, setActiveDeveloper] = useState<string | undefined>();
  const [selectedTagId, setSelectedTagId] = useState<number | undefined>();
  const [noTagsFilter, setNoTagsFilter] = useState(false);
  const [selectedIssueKey, setSelectedIssueKey] = useState<string | undefined>();
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [desktopSidebarExpanded, setDesktopSidebarExpanded] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const hasAnimatedRef = useRef(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const triggerSync = useTriggerSync();

  const isCompact = useMediaQuery('(max-width: 1023px)');

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
    setActiveFilter(filter);
    setActiveDeveloper(undefined);
    setSelectedIssueKey(undefined);
    setFocusedIndex(-1);
    closeSidebarOnCompact();
  }, [closeSidebarOnCompact]);

  const handleDeveloperChange = useCallback((accountId?: string) => {
    setActiveDeveloper(accountId);
    setSelectedIssueKey(undefined);
    setFocusedIndex(-1);
    closeSidebarOnCompact();
  }, [closeSidebarOnCompact]);

  const handleTagToggle = useCallback((tagId: number) => {
    setNoTagsFilter(false);
    setSelectedTagId((prev) => (prev === tagId ? undefined : tagId));
    setSelectedIssueKey(undefined);
    setFocusedIndex(-1);
    closeSidebarOnCompact();
  }, [closeSidebarOnCompact]);

  const handleNoTagsToggle = useCallback(() => {
    setNoTagsFilter((prev) => !prev);
    setSelectedTagId(undefined);
    setSelectedIssueKey(undefined);
    setFocusedIndex(-1);
    closeSidebarOnCompact();
  }, [closeSidebarOnCompact]);

  const handleClearTagFilters = useCallback(() => {
    setSelectedTagId(undefined);
    setNoTagsFilter(false);
    setSelectedIssueKey(undefined);
    setFocusedIndex(-1);
    closeSidebarOnCompact();
  }, [closeSidebarOnCompact]);

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
      setActiveDeveloper(alert.developerAccountId);
    }
  }, []);

  const handleDeveloperClick = useCallback((accountId: string) => {
    setActiveDeveloper(accountId);
  }, []);

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
          setActiveFilter('all');
          setActiveDeveloper(undefined);
          setFocusedIndex(-1);
          break;
        case '1':
          e.preventDefault();
          setActiveFilter('all');
          setFocusedIndex(-1);
          break;
        case '2':
          e.preventDefault();
          setActiveFilter('unassigned');
          setFocusedIndex(-1);
          break;
        case '3':
          e.preventDefault();
          setActiveFilter('dueToday');
          setFocusedIndex(-1);
          break;
        case '4':
          e.preventDefault();
          setActiveFilter('dueThisWeek');
          setFocusedIndex(-1);
          break;
        case '5':
          e.preventDefault();
          setActiveFilter('overdue');
          setFocusedIndex(-1);
          break;
        case '6':
          e.preventDefault();
          setActiveFilter('blocked');
          setFocusedIndex(-1);
          break;
        case '7':
          e.preventDefault();
          setActiveFilter('stale');
          setFocusedIndex(-1);
          break;
        case 'Escape':
          setSelectedIssueKey(undefined);
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [triggerSync, issues, focusedIndex]);

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
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenMobileSidebar={isCompact ? () => setMobileSidebarOpen(true) : undefined}
        activeView={activeView}
        onViewChange={onViewChange}
      />

      <div className="flex-1 min-h-0 px-2 pb-1.5 md:px-2.5 md:pb-2">
        <div className="h-full min-h-0 rounded-[22px] border overflow-hidden flex flex-col" style={{ borderColor: 'var(--border-strong)', background: 'color-mix(in srgb, var(--bg-primary) 84%, transparent)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}>
          <OverviewCards activeFilter={activeFilter} onFilterChange={handleFilterChange} />

          <AlertBanner onAlertClick={handleAlertClick} />
          <ErrorBanner />

          <div className="flex flex-1 min-h-0 relative">
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

          <WorkloadBar onDeveloperClick={handleDeveloperClick} />
        </div>
      </div>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

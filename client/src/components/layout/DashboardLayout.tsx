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

export function DashboardLayout() {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [activeDeveloper, setActiveDeveloper] = useState<string | undefined>();
  const [selectedIssueKey, setSelectedIssueKey] = useState<string | undefined>();
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const hasAnimatedRef = useRef(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const triggerSync = useTriggerSync();

  const isCompact = useMediaQuery('(max-width: 1023px)');

  // Collapse sidebar automatically on small screens
  useEffect(() => {
    setSidebarOpen(!isCompact);
  }, [isCompact]);

  // Get current issue list for keyboard nav
  const issues = useTableIssueKeys(activeFilter, activeDeveloper);

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

  const handleFilterChange = useCallback((filter: FilterType) => {
    setActiveFilter(filter);
    setSelectedIssueKey(undefined);
    setFocusedIndex(-1);
  }, []);

  const handleDeveloperChange = useCallback((accountId?: string) => {
    setActiveDeveloper(accountId);
    setSelectedIssueKey(undefined);
    setFocusedIndex(-1);
  }, []);

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

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      <Header onToggleSidebar={() => setSidebarOpen((p) => !p)} showSidebarToggle={isCompact} onOpenSettings={() => setSettingsOpen(true)} />

      <OverviewCards activeFilter={activeFilter} onFilterChange={handleFilterChange} />

      <AlertBanner onAlertClick={handleAlertClick} />
      <ErrorBanner />

      <div className="flex flex-1 min-h-0 relative">
        {sidebarOpen && (
          <FilterSidebar
            activeFilter={activeFilter}
            activeDeveloper={activeDeveloper}
            onFilterChange={handleFilterChange}
            onDeveloperChange={handleDeveloperChange}
          />
        )}

        <DefectTable
          filter={activeFilter}
          assigneeFilter={activeDeveloper}
          selectedKey={selectedIssueKey}
          focusedIndex={focusedIndex}
          onFocusedIndexChange={setFocusedIndex}
          onSelectIssue={handleSelectIssue}
          hasAnimated={hasAnimated}
        />

        {/* Triage panel always overlays the table */}
        {selectedIssueKey && (
          <div
            className="absolute inset-0 bg-black/30 z-40"
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

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

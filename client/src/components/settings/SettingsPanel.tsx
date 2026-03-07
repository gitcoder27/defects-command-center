import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, RefreshCw, Search, AlertTriangle, Loader2, UserPlus, UserMinus, Users } from 'lucide-react';
import { useConfig } from '@/hooks/useConfig';
import { useTriggerSync } from '@/hooks/useTriggerSync';
import { useToast } from '@/context/ToastContext';
import { api } from '@/lib/api';
import { useDevelopers } from '@/hooks/useDevelopers';

interface JiraField {
  id: string;
  name: string;
  custom: boolean;
}

interface DiscoveredUser {
  accountId: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
}

interface DiscoverUsersResponse {
  users: DiscoveredUser[];
  startAt: number;
  maxResults: number;
  count: number;
  hasMore: boolean;
}

type FieldPickerTarget = 'dueDate' | 'aspenSeverity';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const DISCOVER_PAGE_SIZE = 50;
  const DISCOVER_SEARCH_DEBOUNCE_MS = 350;
  const { data: config, refetch: refetchConfig } = useConfig();
  const triggerSync = useTriggerSync();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [jql, setJql] = useState('');
  const [devDueDateField, setDevDueDateField] = useState('');
  const [aspenSeverityField, setAspenSeverityField] = useState('');
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [fields, setFields] = useState<JiraField[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);
  const [fieldSearch, setFieldSearch] = useState('');
  const [fieldPickerTarget, setFieldPickerTarget] = useState<FieldPickerTarget | null>(null);
  const { data: developers = [], isLoading: loadingDevelopers } = useDevelopers();

  const [teamSearch, setTeamSearch] = useState('');
  const [discoveredUsers, setDiscoveredUsers] = useState<DiscoveredUser[]>([]);
  const [discoveredSearch, setDiscoveredSearch] = useState('');
  const [discoveringTeam, setDiscoveringTeam] = useState(false);
  const [loadingMoreTeam, setLoadingMoreTeam] = useState(false);
  const [discoverTeamError, setDiscoverTeamError] = useState('');
  const [discoverHasMore, setDiscoverHasMore] = useState(false);
  const [discoverNextStartAt, setDiscoverNextStartAt] = useState(0);
  const [debouncedDiscoveredSearch, setDebouncedDiscoveredSearch] = useState('');
  const [selectedAddUsers, setSelectedAddUsers] = useState<Set<string>>(new Set());
  const [savingTeam, setSavingTeam] = useState(false);
  const [removingAccountId, setRemovingAccountId] = useState<string | null>(null);
  const discoverRequestRef = useRef(0);

  const activeMemberIds = useMemo(() => new Set(developers.map((d) => d.accountId)), [developers]);

  const filteredDevelopers = useMemo(
    () =>
      developers.filter(
        (d) =>
          d.displayName.toLowerCase().includes(teamSearch.toLowerCase()) ||
          (d.email?.toLowerCase().includes(teamSearch.toLowerCase()) ?? false)
      ),
    [developers, teamSearch]
  );

  const teamActionLoading = savingTeam || Boolean(removingAccountId) || loadingMoreTeam;
  const addableSelectionCount = useMemo(
    () =>
      Array.from(selectedAddUsers).filter((accountId) => !activeMemberIds.has(accountId)).length,
    [selectedAddUsers, activeMemberIds]
  );

  useEffect(() => {
    if (config) {
      setJql(config.jiraSyncJql || '');
      setDevDueDateField(config.jiraDevDueDateField || 'customfield_10128');
      setAspenSeverityField(config.jiraAspenSeverityField || '');
    }
  }, [config]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedDiscoveredSearch(discoveredSearch.trim());
    }, DISCOVER_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
  }, [discoveredSearch]);

  const handleDiscoverFields = useCallback(async (target: FieldPickerTarget) => {
    setFieldPickerTarget(target);
    setFieldSearch('');
    setLoadingFields(true);
    try {
      const res = await api.get<{ fields: JiraField[] }>('/config/fields');
      setFields(res.fields);
    } catch (err) {
      setFieldPickerTarget(null);
      addToast({ type: 'error', title: 'Failed to fetch Jira fields', message: err instanceof Error ? err.message : 'Request failed' });
    } finally {
      setLoadingFields(false);
    }
  }, [addToast]);

  const handleSave = async (): Promise<boolean> => {
    setSaving(true);
    try {
      await api.put('/config/settings', {
        jiraSyncJql: jql,
        jiraDevDueDateField: devDueDateField,
        jiraAspenSeverityField: aspenSeverityField,
      });
      await refetchConfig();
      addToast({ type: 'success', title: 'Settings saved', message: 'Your Jira sync settings have been saved.' });
      return true;
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to save settings', message: err instanceof Error ? err.message : 'Unable to save settings' });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndSync = async () => {
    const saved = await handleSave();
    if (!saved) {
      return;
    }

    try {
      await triggerSync.mutateAsync();
      addToast({ type: 'success', title: 'Sync triggered with new settings', message: 'Issue sync has started.' });
      onClose();
    } catch (err) {
      addToast({ type: 'error', title: err instanceof Error ? err.message : 'Sync failed', message: 'Could not sync with updated settings.' });
    }
  };

  const handleResetConfig = async () => {
    if (!window.confirm('This will clear Jira configuration and return you to onboarding. Continue?')) {
      return;
    }

    setResetting(true);
    try {
      await api.post('/config/reset');
      await queryClient.invalidateQueries({ queryKey: ['config'] });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['issues'] }),
        queryClient.invalidateQueries({ queryKey: ['overview'] }),
        queryClient.invalidateQueries({ queryKey: ['workload'] }),
        queryClient.invalidateQueries({ queryKey: ['alerts'] }),
      ]);
      addToast({ type: 'success', title: 'Configuration reset', message: 'Re-run setup to configure a new Jira account.' });
      onClose();
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to reset configuration', message: err instanceof Error ? err.message : 'Please try again.' });
    } finally {
      setResetting(false);
    }
  };

  const filteredFields = fields.filter(
    (f) =>
      f.name.toLowerCase().includes(fieldSearch.toLowerCase()) ||
      f.id.toLowerCase().includes(fieldSearch.toLowerCase())
  );

  const currentFieldValue = fieldPickerTarget === 'aspenSeverity' ? aspenSeverityField : devDueDateField;
  const preferredKeywords = fieldPickerTarget === 'aspenSeverity' ? ['severity', 'aspen'] : ['due', 'date'];

  const preferredFields = filteredFields.filter(
    (f) =>
      f.custom &&
      (preferredKeywords.some((keyword) => f.name.toLowerCase().includes(keyword)) ||
        f.id === currentFieldValue)
  );

  const otherFields = filteredFields.filter(
    (f) => f.custom && !preferredFields.includes(f)
  );

  const handleFieldSelection = useCallback((fieldId: string) => {
    if (fieldPickerTarget === 'aspenSeverity') {
      setAspenSeverityField(fieldId);
    } else {
      setDevDueDateField(fieldId);
    }
    setFieldPickerTarget(null);
  }, [fieldPickerTarget]);

  const invalidateTeamAndWorkload = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['developers'] }),
      queryClient.invalidateQueries({ queryKey: ['workload'] }),
      queryClient.invalidateQueries({ queryKey: ['overview'] }),
      queryClient.invalidateQueries({ queryKey: ['alerts'] }),
    ]);
  }, [queryClient]);

  const handleDiscoverTeamMembers = useCallback(
    async (options?: { query?: string; startAt?: number; append?: boolean; silentEmpty?: boolean }) => {
      const query = options?.query ?? '';
      const startAt = options?.startAt ?? 0;
      const append = options?.append ?? false;
      const requestId = ++discoverRequestRef.current;

      if (append) {
        setLoadingMoreTeam(true);
      } else {
        setDiscoveringTeam(true);
        setDiscoverTeamError('');
      }

      try {
        const res = await api.post<DiscoverUsersResponse>('/team/discover', {
          query,
          startAt,
          maxResults: DISCOVER_PAGE_SIZE,
        });

        if (requestId !== discoverRequestRef.current) {
          return;
        }

        setDiscoverHasMore(res.hasMore);
        setDiscoverNextStartAt(startAt + res.users.length);
        if (!append) {
          setSelectedAddUsers(new Set());
        }
        setDiscoveredUsers((prev) => {
          if (!append) {
            return res.users;
          }
          const merged = new Map(prev.map((user) => [user.accountId, user]));
          for (const user of res.users) {
            merged.set(user.accountId, user);
          }
          return Array.from(merged.values());
        });

        if (!append && res.users.length === 0 && !options?.silentEmpty) {
          addToast({ type: 'warning', title: 'No team members found', message: 'No Jira users matched this search.' });
        }
      } catch (error) {
        if (requestId !== discoverRequestRef.current) {
          return;
        }
        setDiscoverTeamError(error instanceof Error ? error.message : 'Failed to discover Jira users');
        setDiscoverHasMore(false);
        if (!append) {
          setDiscoveredUsers([]);
        }
        addToast({ type: 'error', title: 'Failed to discover team members', message: error instanceof Error ? error.message : 'Request failed' });
      } finally {
        if (requestId !== discoverRequestRef.current) {
          return;
        }
        if (append) {
          setLoadingMoreTeam(false);
        } else {
          setDiscoveringTeam(false);
        }
      }
    },
    [addToast]
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    void handleDiscoverTeamMembers({
      query: debouncedDiscoveredSearch,
      startAt: 0,
      append: false,
      silentEmpty: debouncedDiscoveredSearch.length === 0,
    });
  }, [open, debouncedDiscoveredSearch, handleDiscoverTeamMembers]);

  const handleToggleAddUser = useCallback((accountId: string) => {
    setSelectedAddUsers((prev) => {
      const next = new Set(prev);
      if (next.has(accountId)) {
        next.delete(accountId);
      } else {
        next.add(accountId);
      }
      return next;
    });
  }, []);

  const handleSelectAllDiscovered = useCallback(() => {
    setSelectedAddUsers(
      new Set(discoveredUsers.filter((user) => !activeMemberIds.has(user.accountId)).map((u) => u.accountId))
    );
  }, [activeMemberIds, discoveredUsers]);

  const handleClearAddSelection = useCallback(() => {
    setSelectedAddUsers(new Set());
  }, []);

  const handleAddSelectedDevelopers = useCallback(async () => {
    if (selectedAddUsers.size === 0) {
      return;
    }

    setSavingTeam(true);
    try {
      const candidates = discoveredUsers.filter((u) => selectedAddUsers.has(u.accountId));
      const newMembers = candidates.filter((u) => !activeMemberIds.has(u.accountId));
      if (newMembers.length === 0) {
        addToast({
          type: 'info',
          title: 'No new members',
          message: 'Selected users are already on your team.',
        });
        setSelectedAddUsers(new Set());
        return;
      }

      await api.post('/team/developers', { developers: newMembers });
      setSelectedAddUsers(new Set());
      await invalidateTeamAndWorkload();
      addToast({
        type: 'success',
        title: 'Team updated',
        message: `Added ${newMembers.length} team member${newMembers.length === 1 ? '' : 's'}.`,
      });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to add team members', message: err instanceof Error ? err.message : 'Request failed' });
    } finally {
      setSavingTeam(false);
    }
  }, [activeMemberIds, discoveredUsers, selectedAddUsers, addToast, invalidateTeamAndWorkload]);

  const handleRemoveMember = useCallback(async (accountId: string) => {
    setRemovingAccountId(accountId);
    try {
      await api.delete(`/team/developers/${encodeURIComponent(accountId)}`);
      await invalidateTeamAndWorkload();
      addToast({
        type: 'success',
        title: 'Team updated',
        message: 'Developer removed from tracked team.',
      });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to remove developer', message: err instanceof Error ? err.message : 'Request failed' });
    } finally {
      setRemovingAccountId(null);
    }
  }, [addToast, invalidateTeamAndWorkload]);

  const hasChanges = saving || triggerSync.isPending || resetting || teamActionLoading;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="settings-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />
          <motion.div
            key="settings-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed right-0 top-0 bottom-0 w-[520px] max-w-full z-50 flex flex-col overflow-hidden"
            style={{ background: 'var(--bg-secondary)', boxShadow: '-12px 0 40px rgba(0,0,0,0.5)' }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4 border-b"
              style={{ borderColor: 'var(--border)' }}
            >
              <h2 className="text-[16px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                Settings
              </h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-md hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                <X size={16} style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">
              {/* JQL Query */}
              <div>
                <label
                  className="text-[11px] font-semibold uppercase mb-2 block"
                  style={{ letterSpacing: '0.06em', color: 'var(--text-muted)' }}
                >
                  Jira Sync Query (JQL)
                </label>
                <p className="text-[12px] mb-2" style={{ color: 'var(--text-secondary)' }}>
                  The base JQL query used to fetch defects from Jira. The assignee filter is managed automatically from your active team members and lead account on each sync.
                </p>
                <textarea
                  value={jql}
                  onChange={(e) => setJql(e.target.value)}
                  rows={5}
                  spellCheck={false}
                  className="w-full px-3 py-2.5 rounded-md text-[13px] font-mono leading-relaxed resize-y focus:outline-none focus:ring-1"
                  style={{
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border)',
                    outlineColor: 'var(--accent)',
                    minHeight: '100px',
                  }}
                  placeholder='project = PROJ AND issuetype = Bug AND statusCategory != Done'
                />
                <p className="text-[11px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
                  Use <code className="px-1 py-0.5 rounded text-[10px]" style={{ background: 'var(--bg-tertiary)' }}>{'{ PROJECT_KEY }'}</code> to
                  reference the configured project key dynamically.
                </p>
              </div>

              {/* Jira Field Mapping */}
              <div>
                <label
                  className="text-[11px] font-semibold uppercase mb-2 block"
                  style={{ letterSpacing: '0.06em', color: 'var(--text-muted)' }}
                >
                  Jira Field Mapping
                </label>
                <p className="text-[12px] mb-3" style={{ color: 'var(--text-secondary)' }}>
                  Map custom Jira fields that should appear in the triage panel. These values refresh on the next sync.
                </p>

                <div className="grid gap-3">
                  <div
                    className="rounded-xl p-4"
                    style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                          Development Due Date
                        </p>
                        <p className="text-[12px] mt-1" style={{ color: 'var(--text-secondary)' }}>
                          Jira custom date field used for the triage due date, for example <code className="text-[11px]" style={{ color: 'var(--accent)' }}>customfield_10128</code>.
                        </p>
                      </div>
                      <button
                        onClick={() => handleDiscoverFields('dueDate')}
                        disabled={loadingFields}
                        className="px-3 py-2 rounded-md text-[12px] font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                        style={{
                          background: fieldPickerTarget === 'dueDate' ? 'rgba(99,102,241,0.12)' : 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border)',
                        }}
                        title="Discover custom fields from Jira"
                      >
                        {loadingFields && fieldPickerTarget === 'dueDate' ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          <Search size={14} />
                        )}
                        Discover
                      </button>
                    </div>

                    <input
                      type="text"
                      value={devDueDateField}
                      onChange={(e) => setDevDueDateField(e.target.value)}
                      className="w-full px-3 py-2 rounded-md text-[13px] font-mono focus:outline-none focus:ring-1"
                      style={{
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border)',
                        outlineColor: 'var(--accent)',
                      }}
                      placeholder="customfield_10128"
                    />
                  </div>

                  <div
                    className="rounded-xl p-4"
                    style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                          ASPEN Severity
                        </p>
                        <p className="text-[12px] mt-1" style={{ color: 'var(--text-secondary)' }}>
                          Jira custom field used to display ASPEN Severity at the top of triage properties.
                        </p>
                      </div>
                      <button
                        onClick={() => handleDiscoverFields('aspenSeverity')}
                        disabled={loadingFields}
                        className="px-3 py-2 rounded-md text-[12px] font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                        style={{
                          background: fieldPickerTarget === 'aspenSeverity' ? 'rgba(99,102,241,0.12)' : 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border)',
                        }}
                        title="Discover custom fields from Jira"
                      >
                        {loadingFields && fieldPickerTarget === 'aspenSeverity' ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          <Search size={14} />
                        )}
                        Discover
                      </button>
                    </div>

                    <input
                      type="text"
                      value={aspenSeverityField}
                      onChange={(e) => setAspenSeverityField(e.target.value)}
                      className="w-full px-3 py-2 rounded-md text-[13px] font-mono focus:outline-none focus:ring-1"
                      style={{
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border)',
                        outlineColor: 'var(--accent)',
                      }}
                      placeholder="customfield_XXXXX"
                    />
                  </div>
                </div>

                {fieldPickerTarget && (
                  <div
                    className="mt-3 rounded-xl overflow-hidden"
                    style={{ border: '1px solid var(--border)', background: 'var(--bg-tertiary)' }}
                  >
                    <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                      <input
                        type="text"
                        value={fieldSearch}
                        onChange={(e) => setFieldSearch(e.target.value)}
                        placeholder={`Search ${fieldPickerTarget === 'aspenSeverity' ? 'ASPEN Severity' : 'due date'} fields...`}
                        className="w-full text-[12px] px-2 py-1.5 rounded focus:outline-none focus:ring-1"
                        style={{
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border)',
                          outlineColor: 'var(--accent)',
                        }}
                      />
                    </div>

                    <div className="max-h-[260px] overflow-y-auto">
                      {preferredFields.length > 0 && (
                        <>
                          <div
                            className="px-3 py-1.5 text-[10px] font-semibold uppercase"
                            style={{ color: 'var(--accent)', letterSpacing: '0.06em', background: 'var(--bg-secondary)' }}
                          >
                            Likely Matches
                          </div>
                          {preferredFields.map((f) => (
                            <button
                              key={f.id}
                              onClick={() => handleFieldSelection(f.id)}
                              className="w-full text-left px-3 py-2 flex items-center justify-between hover:bg-[var(--bg-secondary)] transition-colors"
                              style={{
                                borderBottom: '1px solid var(--border)',
                                background: f.id === currentFieldValue ? 'rgba(99,102,241,0.1)' : undefined,
                              }}
                            >
                              <div>
                                <span className="text-[12px] font-medium block" style={{ color: 'var(--text-primary)' }}>
                                  {f.name}
                                </span>
                                <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                                  {f.id}
                                </span>
                              </div>
                              {f.id === currentFieldValue && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--accent)', color: '#fff' }}>
                                  Selected
                                </span>
                              )}
                            </button>
                          ))}
                        </>
                      )}

                      {otherFields.length > 0 && (
                        <>
                          <div
                            className="px-3 py-1.5 text-[10px] font-semibold uppercase"
                            style={{ color: 'var(--text-muted)', letterSpacing: '0.06em', background: 'var(--bg-secondary)' }}
                          >
                            Other Custom Fields
                          </div>
                          {otherFields.slice(0, 50).map((f) => (
                            <button
                              key={f.id}
                              onClick={() => handleFieldSelection(f.id)}
                              className="w-full text-left px-3 py-2 flex items-center justify-between hover:bg-[var(--bg-secondary)] transition-colors"
                              style={{ borderBottom: '1px solid var(--border)' }}
                            >
                              <div>
                                <span className="text-[12px] font-medium block" style={{ color: 'var(--text-primary)' }}>
                                  {f.name}
                                </span>
                                <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                                  {f.id}
                                </span>
                              </div>
                            </button>
                          ))}
                          {otherFields.length > 50 && (
                            <div className="px-3 py-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                              +{otherFields.length - 50} more fields. Refine your search.
                            </div>
                          )}
                        </>
                      )}

                      {preferredFields.length === 0 && otherFields.length === 0 && (
                        <div className="px-3 py-4 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                          No custom fields match this search.
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setFieldPickerTarget(null)}
                      className="w-full text-center text-[11px] py-1.5 font-medium transition-colors hover:bg-[var(--bg-secondary)]"
                      style={{ borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>

              {/* Team members */}
              <div>
                <label
                  className="text-[11px] font-semibold uppercase mb-2 block"
                  style={{ letterSpacing: '0.06em', color: 'var(--text-muted)' }}
                >
                  Team Members
                </label>
                <p className="text-[12px] mb-3" style={{ color: 'var(--text-secondary)' }}>
                  Add or remove Jira users that should appear in workload calculations and assignments.
                </p>

                <div className="flex gap-2 mb-3">
                  <div className="flex-1 relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      value={teamSearch}
                      onChange={(e) => setTeamSearch(e.target.value)}
                      placeholder="Search current team…"
                      className="w-full pl-8 pr-3 py-1.5 rounded-md text-[12px] focus:outline-none focus:ring-1"
                      style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                    />
                  </div>
                  <button
                    onClick={() =>
                      handleDiscoverTeamMembers({
                        query: discoveredSearch.trim(),
                        startAt: 0,
                        append: false,
                        silentEmpty: false,
                      })
                    }
                    disabled={teamActionLoading || discoveringTeam}
                    className="px-3 py-2 rounded-md text-[12px] font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    style={{
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {discoveringTeam ? <Loader2 size={14} className="animate-spin" /> : <Users size={14} />}
                    Discover
                  </button>
                </div>

                <div
                  className="rounded-md overflow-hidden"
                  style={{ border: '1px solid var(--border)', background: 'var(--bg-tertiary)' }}
                >
                  {loadingDevelopers ? (
                    <div className="px-3 py-3 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                      Loading team members…
                    </div>
                  ) : filteredDevelopers.length === 0 ? (
                    <div className="px-3 py-3 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                      No tracked team members found.
                    </div>
                  ) : (
                    filteredDevelopers.map((member, index) => {
                      const isRemoving = removingAccountId === member.accountId;
                      return (
                        <div
                          key={member.accountId}
                          className="px-3 py-2 flex items-center gap-3"
                          style={{
                            borderBottom: index === filteredDevelopers.length - 1 ? 'none' : '1px solid var(--border)',
                          }}
                        >
                          {member.avatarUrl ? (
                            <img
                              src={member.avatarUrl}
                              alt={member.displayName}
                              className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0"
                              style={{ background: 'rgba(99,102,241,0.2)', color: 'var(--accent)' }}
                            >
                              {member.displayName[0]?.toUpperCase() ?? 'U'}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                              {member.displayName}
                            </p>
                            {member.email && (
                              <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                                {member.email}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => handleRemoveMember(member.accountId)}
                            disabled={teamActionLoading}
                            className="p-1.5 rounded-md transition-colors disabled:opacity-50"
                            style={{ color: 'var(--text-muted)' }}
                            title="Remove from team"
                          >
                            {isRemoving ? <Loader2 size={14} className="animate-spin" /> : <UserMinus size={14} />}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="mt-5 rounded-md p-3 space-y-2" style={{ border: '1px solid var(--border)' }}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>
                      Add Team Members
                    </p>
                    <button
                      onClick={() =>
                        handleDiscoverTeamMembers({
                          query: discoveredSearch.trim(),
                          startAt: 0,
                          append: false,
                          silentEmpty: false,
                        })
                      }
                      disabled={discoveringTeam || teamActionLoading}
                      className="text-[11px] font-medium transition-colors disabled:opacity-50"
                      style={{ color: 'var(--accent)' }}
                    >
                      Refresh list
                    </button>
                  </div>

                  <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      value={discoveredSearch}
                      onChange={(e) => setDiscoveredSearch(e.target.value)}
                      placeholder="Search discoverable users…"
                      className="w-full pl-8 pr-3 py-1.5 rounded-md text-[12px] focus:outline-none focus:ring-1"
                      style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                    />
                  </div>

                  {discoverTeamError && (
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {discoverTeamError}
                    </p>
                  )}

                  {discoveringTeam ? (
                    <div className="flex items-center gap-2 py-3">
                      <Loader2 size={14} className="animate-spin" style={{ color: 'var(--accent)' }} />
                      <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>Discovering users…</span>
                    </div>
                  ) : discoveredUsers.length === 0 ? (
                    <div className="text-[12px] py-2" style={{ color: 'var(--text-muted)' }}>
                      Discover users from Jira to add members to your team.
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-[11px]">
                        <button onClick={handleSelectAllDiscovered} className="font-semibold" style={{ color: 'var(--accent)' }}>
                          Select all
                        </button>
                        <span style={{ color: 'var(--text-muted)' }}>•</span>
                        <button onClick={handleClearAddSelection} className="font-semibold" style={{ color: 'var(--text-muted)' }}>
                          Clear
                        </button>
                        <span className="ml-auto text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          {discoveredUsers.length} users
                        </span>
                      </div>
                      <div className="max-h-52 overflow-y-auto">
                        {discoveredUsers.map((user) => {
                          const isAlreadyMember = activeMemberIds.has(user.accountId);
                          const isSelected = selectedAddUsers.has(user.accountId);
                          return (
                            <button
                              key={user.accountId}
                              type="button"
                              onClick={() => !isAlreadyMember && handleToggleAddUser(user.accountId)}
                              disabled={isAlreadyMember || teamActionLoading}
                              className="w-full text-left px-2 py-2 flex items-center gap-2 hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-100"
                            >
                              <span
                                className="w-4 h-4 rounded border flex items-center justify-center text-[10px]"
                                style={{
                                  borderColor: isAlreadyMember ? 'var(--accent)' : isSelected ? 'var(--accent)' : 'var(--border)',
                                  background: isAlreadyMember || isSelected ? 'rgba(99,102,241,0.12)' : 'transparent',
                                  color: isSelected ? 'var(--accent)' : 'var(--text-muted)',
                                }}
                              >
                                {isAlreadyMember ? '✓' : isSelected ? '✓' : ''}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                  {user.displayName}
                                </p>
                                {user.email && (
                                  <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                                    {user.email}
                                  </p>
                                )}
                              </div>
                              {isAlreadyMember && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.16)', color: 'var(--accent)' }}>
                                  Added
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      {discoverHasMore && (
                        <button
                          onClick={() =>
                            handleDiscoverTeamMembers({
                              query: discoveredSearch.trim(),
                              startAt: discoverNextStartAt,
                              append: true,
                              silentEmpty: true,
                            })
                          }
                          disabled={loadingMoreTeam || discoveringTeam}
                          className="w-full px-3 py-2 rounded-md text-[12px] font-medium transition-colors disabled:opacity-50"
                          style={{
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border)',
                          }}
                        >
                          {loadingMoreTeam ? 'Loading more…' : 'Load more users'}
                        </button>
                      )}
                      <button
                        onClick={handleAddSelectedDevelopers}
                        disabled={addableSelectionCount === 0 || savingTeam}
                        className="w-full px-3 py-2 rounded-md text-[12px] font-medium flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                        style={{ background: 'rgba(16,185,129,0.14)', color: '#34d399', border: '1px solid rgba(16,185,129,0.35)' }}
                      >
                        {savingTeam ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            Adding…
                          </>
                        ) : (
                          <>
                            <UserPlus size={14} />
                            Add selected
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Info */}
              <div
                className="rounded-md px-4 py-3 text-[12px] leading-relaxed"
                style={{
                  background: 'rgba(99,102,241,0.08)',
                  border: '1px solid rgba(99,102,241,0.2)',
                  color: 'var(--text-secondary)',
                }}
              >
                <strong style={{ color: 'var(--text-primary)' }}>How it works:</strong> Saving updates
                the dashboard configuration. The saved JQL stays as the base query, and sync appends the current team member assignees automatically. Click <strong>"Save & Sync"</strong> to apply it immediately.
              </div>

              {/* Row indicator legend */}
              <div>
                <label
                  className="text-[11px] font-semibold uppercase mb-2 block"
                  style={{ letterSpacing: '0.06em', color: 'var(--text-muted)' }}
                >
                  Row Indicator Legend
                </label>
                <div
                  className="rounded-md p-3"
                  style={{ border: '1px solid var(--border)', background: 'var(--bg-tertiary)' }}
                >
                  <div className="grid gap-2 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                    <div className="flex items-center gap-2">
                      <span className="h-4 w-[3px]" style={{ background: 'var(--accent)' }} />
                      <span>Selected or focused defect</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-4 w-[3px]" style={{ background: 'var(--info)' }} />
                      <span>Last opened in Jira</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-4 w-[3px]" style={{ background: 'var(--danger)' }} />
                      <span>Overdue development due date</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-4 w-[3px]" style={{ background: 'var(--warning)' }} />
                      <span>Development due date is today</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-4 w-[3px]" style={{ background: 'var(--danger-muted)' }} />
                      <span>Flagged issue</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-4 w-[3px]" style={{ background: 'var(--text-muted)' }} />
                      <span>Stale: not updated in the last 48 hours</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              className="flex items-center justify-end gap-3 px-6 py-4 border-t"
              style={{ borderColor: 'var(--border)' }}
            >
              <button
                onClick={handleResetConfig}
                disabled={hasChanges}
                className="px-4 py-2 rounded-md text-[13px] font-medium transition-colors disabled:opacity-50"
                style={{
                  background: 'rgba(239,68,68,0.14)',
                  color: '#fca5a5',
                  border: '1px solid rgba(239,68,68,0.35)',
                }}
              >
                <AlertTriangle size={14} className="inline mr-2" />
                {resetting ? 'Resetting…' : 'Reset & Reconfigure'}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-md text-[13px] font-medium transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={hasChanges}
                className="px-4 py-2 rounded-md text-[13px] font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                }}
              >
                <Save size={14} />
                Save
              </button>
              <button
                onClick={handleSaveAndSync}
                disabled={hasChanges || triggerSync.isPending}
                className="px-4 py-2 rounded-md text-[13px] font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                <RefreshCw size={14} className={triggerSync.isPending ? 'animate-spin' : ''} />
                Save & Sync
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

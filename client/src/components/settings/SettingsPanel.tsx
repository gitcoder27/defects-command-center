import { useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Save,
  RefreshCw,
  Search,
  AlertTriangle,
  Loader2,
  UserPlus,
  UserMinus,
  Users,
  Shield,
  ChevronDown,
  Copy,
  CheckCircle2,
} from 'lucide-react';
import { useConfig } from '@/hooks/useConfig';
import { useTriggerSync } from '@/hooks/useTriggerSync';
import { useToast } from '@/context/ToastContext';
import { api } from '@/lib/api';
import { useDevelopers } from '@/hooks/useDevelopers';
import type { AuthUser, UserRole } from '@/types';

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

export function SettingsPage() {
  const DISCOVER_PAGE_SIZE = 50;
  const DISCOVER_SEARCH_DEBOUNCE_MS = 350;
  const { data: config, refetch: refetchConfig } = useConfig();
  const triggerSync = useTriggerSync();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [jql, setJql] = useState('');
  const [devDueDateField, setDevDueDateField] = useState('');
  const [aspenSeverityField, setAspenSeverityField] = useState('');
  const [managerJiraAccountId, setManagerJiraAccountId] = useState('');
  const [managerSearch, setManagerSearch] = useState('');
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

  const [appUsers, setAppUsers] = useState<AuthUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('developer');
  const [newDevAccountId, setNewDevAccountId] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);
  const [confirmDeleteUsername, setConfirmDeleteUsername] = useState<string | null>(null);
  const [deletingUsername, setDeletingUsername] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const activeMemberIds = useMemo(() => new Set(developers.map((developer) => developer.accountId)), [developers]);

  const filteredDevelopers = useMemo(
    () =>
      developers.filter(
        (developer) =>
          developer.displayName.toLowerCase().includes(teamSearch.toLowerCase()) ||
          (developer.email?.toLowerCase().includes(teamSearch.toLowerCase()) ?? false)
      ),
    [developers, teamSearch]
  );

  const teamActionLoading = savingTeam || Boolean(removingAccountId) || loadingMoreTeam;
  const addableSelectionCount = useMemo(
    () => Array.from(selectedAddUsers).filter((accountId) => !activeMemberIds.has(accountId)).length,
    [selectedAddUsers, activeMemberIds]
  );

  useEffect(() => {
    if (config) {
      setJql(config.jiraSyncJql || '');
      setDevDueDateField(config.jiraDevDueDateField || 'customfield_10128');
      setAspenSeverityField(config.jiraAspenSeverityField || '');
      setManagerJiraAccountId(config.managerJiraAccountId || '');
    }
  }, [config]);

  useEffect(() => {
    let cancelled = false;
    setLoadingUsers(true);
    api.get<{ users: AuthUser[] }>('/auth/users')
      .then((res) => {
        if (!cancelled) setAppUsers(res.users ?? []);
      })
      .catch(() => {
        if (!cancelled) setAppUsers([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingUsers(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreateUser = async () => {
    if (!newUsername.trim() || !newDisplayName.trim() || !newPassword.trim()) return;
    if (newRole === 'developer' && !newDevAccountId) {
      addToast({ type: 'error', title: 'Missing Jira identity', message: 'Developer accounts must be linked to a Jira profile.' });
      return;
    }
    setCreatingUser(true);
    try {
      const res = await api.post<{ user: AuthUser }>('/auth/register', {
        username: newUsername.trim(),
        password: newPassword.trim(),
        displayName: newDisplayName.trim(),
        role: newRole,
        ...(newRole === 'developer' ? { developerAccountId: newDevAccountId } : {}),
      });
      setAppUsers((prev) => [...prev, res.user]);
      setNewUsername('');
      setNewDisplayName('');
      setNewPassword('');
      setNewRole('developer');
      setNewDevAccountId('');
      setShowCreateUser(false);
      addToast({ type: 'success', title: 'User created', message: `Account "${res.user.username}" created successfully.` });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to create user', message: err instanceof Error ? err.message : 'Request failed' });
    } finally {
      setCreatingUser(false);
    }
  };

  const handleCopyDevLink = () => {
    const url = `${window.location.origin}/my-day`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      addToast({ type: 'success', title: 'Link copied', message: url });
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  const handleDeleteUser = useCallback(async (user: AuthUser) => {
    setDeletingUsername(user.username);
    try {
      await api.delete<{ ok: true }>(`/auth/users/${encodeURIComponent(user.username)}`);
      setAppUsers((prev) => prev.filter((entry) => entry.username !== user.username));
      setConfirmDeleteUsername((current) => (current === user.username ? null : current));
      addToast({
        type: 'success',
        title: 'Developer account deleted',
        message: `Removed "${user.displayName}" from app access.`,
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Failed to delete account',
        message: err instanceof Error ? err.message : 'Request failed',
      });
    } finally {
      setDeletingUsername(null);
    }
  }, [addToast]);

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
        managerJiraAccountId: managerJiraAccountId.trim(),
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
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to reset configuration', message: err instanceof Error ? err.message : 'Please try again.' });
    } finally {
      setResetting(false);
    }
  };

  const filteredFields = fields.filter(
    (field) =>
      field.name.toLowerCase().includes(fieldSearch.toLowerCase()) ||
      field.id.toLowerCase().includes(fieldSearch.toLowerCase())
  );

  const currentFieldValue = fieldPickerTarget === 'aspenSeverity' ? aspenSeverityField : devDueDateField;
  const preferredKeywords = fieldPickerTarget === 'aspenSeverity' ? ['severity', 'aspen'] : ['due', 'date'];

  const preferredFields = filteredFields.filter(
    (field) =>
      field.custom &&
      (preferredKeywords.some((keyword) => field.name.toLowerCase().includes(keyword)) ||
        field.id === currentFieldValue)
  );

  const otherFields = filteredFields.filter(
    (field) => field.custom && !preferredFields.includes(field)
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
    void handleDiscoverTeamMembers({
      query: debouncedDiscoveredSearch,
      startAt: 0,
      append: false,
      silentEmpty: debouncedDiscoveredSearch.length === 0,
    });
  }, [debouncedDiscoveredSearch, handleDiscoverTeamMembers]);

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
      new Set(discoveredUsers.filter((user) => !activeMemberIds.has(user.accountId)).map((user) => user.accountId))
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
      const candidates = discoveredUsers.filter((user) => selectedAddUsers.has(user.accountId));
      const newMembers = candidates.filter((user) => !activeMemberIds.has(user.accountId));
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

  const knownJiraUsers = useMemo(() => {
    const merged = new Map<string, DiscoveredUser>();

    for (const developer of developers) {
      merged.set(developer.accountId, {
        accountId: developer.accountId,
        displayName: developer.displayName,
        email: developer.email,
        avatarUrl: developer.avatarUrl,
      });
    }

    for (const user of discoveredUsers) {
      const existing = merged.get(user.accountId);
      merged.set(user.accountId, existing ? { ...existing, ...user } : user);
    }

    return Array.from(merged.values());
  }, [developers, discoveredUsers]);

  const selectedManagerProfile = useMemo(
    () => knownJiraUsers.find((user) => user.accountId === managerJiraAccountId) ?? null,
    [knownJiraUsers, managerJiraAccountId]
  );

  const managerSuggestions = useMemo(() => {
    const term = managerSearch.trim().toLowerCase();
    const filtered = term
      ? knownJiraUsers.filter((user) =>
          user.displayName.toLowerCase().includes(term) ||
          user.accountId.toLowerCase().includes(term) ||
          (user.email?.toLowerCase().includes(term) ?? false)
        )
      : knownJiraUsers;

    if (selectedManagerProfile && !filtered.some((user) => user.accountId === selectedManagerProfile.accountId)) {
      return [selectedManagerProfile, ...filtered].slice(0, 6);
    }

    return filtered.slice(0, 6);
  }, [knownJiraUsers, managerSearch, selectedManagerProfile]);

  const connectionLabel = useMemo(() => {
    if (!config?.jiraBaseUrl) {
      return 'Connection pending';
    }

    try {
      return new URL(config.jiraBaseUrl).host;
    } catch {
      return config.jiraBaseUrl;
    }
  }, [config?.jiraBaseUrl]);

  const summaryStats = [
    {
      label: 'Jira workspace',
      value: connectionLabel,
      tone: 'neutral' as const,
    },
    {
      label: 'Project',
      value: config?.jiraProjectKey || 'Unset',
      tone: 'neutral' as const,
    },
    {
      label: 'Manager identity',
      value: managerJiraAccountId ? 'Linked' : 'Optional',
      tone: managerJiraAccountId ? 'good' as const : 'warn' as const,
    },
    {
      label: 'Developer access',
      value: loadingUsers ? 'Loading…' : `${appUsers.length} account${appUsers.length === 1 ? '' : 's'}`,
      tone: 'neutral' as const,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="flex h-full min-h-0 flex-col overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, color-mix(in srgb, var(--bg-primary) 96%, transparent) 0%, color-mix(in srgb, var(--bg-canvas) 94%, transparent) 100%)',
        ['--settings-shell-bg' as string]: 'linear-gradient(180deg, color-mix(in srgb, var(--bg-primary) 92%, var(--accent) 8%) 0%, color-mix(in srgb, var(--bg-secondary) 94%, transparent) 100%)',
        ['--settings-shell-border' as string]: '1px solid color-mix(in srgb, var(--border-strong) 88%, transparent)',
        ['--settings-shell-shadow' as string]: '0 18px 44px color-mix(in srgb, var(--text-primary) 8%, transparent)',
        ['--settings-soft-bg' as string]: 'color-mix(in srgb, var(--bg-tertiary) 84%, var(--bg-primary))',
        ['--settings-soft-border' as string]: '1px solid color-mix(in srgb, var(--border-strong) 82%, transparent)',
        ['--settings-deep-bg' as string]: 'color-mix(in srgb, var(--bg-secondary) 90%, var(--bg-primary))',
        ['--settings-deep-border' as string]: '1px solid color-mix(in srgb, var(--border-strong) 86%, transparent)',
        ['--settings-input-bg' as string]: 'color-mix(in srgb, var(--bg-primary) 82%, var(--bg-secondary) 18%)',
        ['--settings-input-border' as string]: '1px solid color-mix(in srgb, var(--border-strong) 86%, transparent)',
        ['--settings-neutral-chip-bg' as string]: 'color-mix(in srgb, var(--bg-primary) 88%, var(--bg-secondary) 12%)',
        ['--settings-accent-chip-bg' as string]: 'color-mix(in srgb, var(--accent) 12%, var(--bg-primary))',
        ['--settings-subtle-shadow' as string]: '0 10px 24px color-mix(in srgb, var(--text-primary) 6%, transparent)',
        ['--settings-pane-bg' as string]: 'color-mix(in srgb, var(--bg-secondary) 58%, var(--bg-primary) 42%)',
        ['--settings-pane-strong-bg' as string]: 'linear-gradient(180deg, color-mix(in srgb, var(--bg-secondary) 78%, var(--bg-primary) 22%) 0%, color-mix(in srgb, var(--bg-primary) 90%, transparent) 100%)',
        ['--settings-pane-border' as string]: '1px solid color-mix(in srgb, var(--border-strong) 84%, transparent)',
        ['--settings-inset-bg' as string]: 'color-mix(in srgb, var(--bg-tertiary) 72%, var(--bg-primary) 28%)',
        ['--settings-inset-border' as string]: '1px solid color-mix(in srgb, var(--border-strong) 76%, transparent)',
        ['--settings-row-even-bg' as string]: 'color-mix(in srgb, var(--bg-secondary) 62%, var(--bg-primary) 38%)',
        ['--settings-row-odd-bg' as string]: 'color-mix(in srgb, var(--bg-secondary) 48%, var(--bg-primary) 52%)',
        ['--settings-row-divider' as string]: '1px solid color-mix(in srgb, var(--border-strong) 72%, transparent)',
        ['--settings-accent-soft-bg' as string]: 'color-mix(in srgb, var(--accent) 12%, var(--bg-primary))',
        ['--settings-accent-soft-border' as string]: '1px solid color-mix(in srgb, var(--accent) 22%, var(--border-strong))',
        ['--settings-success-soft-bg' as string]: 'color-mix(in srgb, var(--success) 10%, var(--bg-primary))',
        ['--settings-success-soft-border' as string]: '1px solid color-mix(in srgb, var(--success) 24%, var(--border-strong))',
        ['--settings-warning-soft-bg' as string]: 'color-mix(in srgb, var(--warning) 12%, var(--bg-primary))',
        ['--settings-warning-soft-border' as string]: '1px solid color-mix(in srgb, var(--warning) 24%, var(--border-strong))',
        ['--settings-danger-soft-bg' as string]: 'color-mix(in srgb, var(--danger) 10%, var(--bg-primary))',
        ['--settings-danger-soft-border' as string]: '1px solid color-mix(in srgb, var(--danger) 24%, var(--border-strong))',
        ['--settings-code-bg' as string]: 'color-mix(in srgb, var(--bg-secondary) 68%, var(--bg-primary) 32%)',
        ['--settings-hero-badge-bg' as string]: 'color-mix(in srgb, var(--accent) 12%, var(--bg-primary))',
        ['--settings-hero-badge-border' as string]: '1px solid color-mix(in srgb, var(--accent) 24%, var(--border-strong))',
        ['--settings-hero-badge-text' as string]: 'var(--accent)',
        ['--settings-cta-bg' as string]: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 24%, var(--bg-primary)), color-mix(in srgb, var(--success) 18%, var(--bg-primary)))',
        ['--settings-cta-border' as string]: '1px solid color-mix(in srgb, var(--success) 28%, var(--border-strong))',
        ['--settings-cta-text' as string]: 'color-mix(in srgb, var(--text-primary) 92%, var(--bg-primary) 8%)',
        ['--settings-cta-primary-bg' as string]: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 90%, white 10%), color-mix(in srgb, var(--info) 72%, var(--accent) 28%))',
        ['--settings-cta-primary-text' as string]: '#f8fbff',
      }}
    >
            <div
              className="relative overflow-hidden border-b px-6 py-4 md:px-8"
              style={{ borderColor: 'var(--border-strong)' }}
            >
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background: 'radial-gradient(circle at top left, color-mix(in srgb, var(--accent) 12%, transparent), transparent 30%), radial-gradient(circle at 85% 20%, color-mix(in srgb, var(--warning) 10%, transparent), transparent 20%)',
                }}
              />
              <div className="relative flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div
                      className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]"
                      style={{
                        background: 'var(--settings-hero-badge-bg)',
                        color: 'var(--settings-hero-badge-text)',
                        border: 'var(--settings-hero-badge-border)',
                      }}
                    >
                      Manager Settings
                    </div>
                    <div
                      className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]"
                      style={{
                        background: 'var(--settings-neutral-chip-bg)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border-strong)',
                      }}
                    >
                      Manager-only workspace
                    </div>
                  </div>
                  <h2 className="mt-2 text-[18px] font-semibold tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>
                    Settings
                  </h2>
                  <p className="mt-1 text-[12px] leading-6" style={{ color: 'var(--text-secondary)' }}>
                    Connection, sync scope, tracked team, and developer access in one place.
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[620px] xl:grid-cols-4">
                  {summaryStats.map((stat) => (
                    <MetricCard
                      key={stat.label}
                      label={stat.label}
                      value={stat.value}
                      tone={stat.tone}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 md:px-8">
              <div className="flex flex-col gap-5">
                <SectionCard
                  icon={<Search size={16} />}
                  eyebrow="01"
                  title="Jira Connection"
                  description="Review the active Jira workspace and define the manager account used as the lead identity for sync scope."
                >
                  <div className="grid gap-4 lg:grid-cols-[1.05fr_1.2fr]">
                    <div
                      className="rounded-[24px] p-5"
                      style={{
                        background: 'var(--settings-pane-strong-bg)',
                        border: 'var(--settings-pane-border)',
                      }}
                    >
                      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>
                        <RefreshCw size={12} />
                        Active Connection
                      </div>
                      <div className="mt-4 space-y-4">
                        <InfoRow label="Workspace" value={connectionLabel} />
                        <InfoRow label="Project key" value={config?.jiraProjectKey || 'Not configured'} />
                        <InfoRow label="Manager scope behavior" value="Assignee filtering is appended automatically during sync." />
                      </div>
                      <div
                        className="mt-5 rounded-2xl px-4 py-3 text-[12px] leading-relaxed"
                        style={{
                          background: 'var(--settings-accent-soft-bg)',
                          color: 'var(--text-secondary)',
                          border: 'var(--settings-accent-soft-border)',
                        }}
                      >
                        Save the base query only. The dashboard composes team assignees and the manager lead identity around it at sync time.
                      </div>
                    </div>

                    <div
                      className="rounded-[24px] p-5"
                      style={{
                        background: 'var(--settings-pane-bg)',
                        border: 'var(--settings-pane-border)',
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <label
                            htmlFor="manager-jira-identity"
                            className="text-[11px] font-semibold uppercase tracking-[0.18em]"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            Manager Jira Identity
                          </label>
                          <p className="mt-2 text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                            Link the manager account Jira should treat as the lead when assembling sync scope and manager desk context.
                          </p>
                        </div>
                        {managerJiraAccountId ? (
                          <button
                            type="button"
                            onClick={() => setManagerJiraAccountId('')}
                            className="rounded-full px-3 py-1 text-[11px] font-semibold transition-colors"
                            style={{
                              background: 'var(--settings-danger-soft-bg)',
                              color: 'var(--danger-muted)',
                              border: 'var(--settings-danger-soft-border)',
                            }}
                          >
                            Clear
                          </button>
                        ) : null}
                      </div>

                      <div className="mt-4 space-y-3">
                        <TextInput
                          id="manager-jira-identity"
                          label="Manager Jira Identity"
                          hideLabel
                          value={managerJiraAccountId}
                          onChange={setManagerJiraAccountId}
                          placeholder="Paste or edit the Jira account id"
                          mono
                        />

                        <TextInput
                          label="Filter known Jira people"
                          hideLabel
                          value={managerSearch}
                          onChange={setManagerSearch}
                          placeholder="Filter known Jira people"
                        />
                      </div>

                      <div
                        className="mt-4 rounded-2xl p-4"
                        style={{
                          background: 'var(--settings-inset-bg)',
                          border: 'var(--settings-inset-border)',
                        }}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                              Directory picks
                            </p>
                            <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                              Suggestions come from your tracked developers and the latest Jira directory discovery.
                            </p>
                          </div>
                          {discoveringTeam ? (
                            <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                              <Loader2 size={12} className="animate-spin" />
                              Refreshing
                            </div>
                          ) : null}
                        </div>

                        <div className="mt-3 grid gap-2">
                          {managerSuggestions.length > 0 ? (
                            managerSuggestions.map((user) => (
                              <button
                                key={user.accountId}
                                type="button"
                                onClick={() => setManagerJiraAccountId(user.accountId)}
                                className="flex items-center gap-3 rounded-2xl px-3 py-2 text-left transition-colors"
                                style={{
                                  background: user.accountId === managerJiraAccountId ? 'var(--settings-accent-soft-bg)' : 'var(--settings-inset-bg)',
                                  border: user.accountId === managerJiraAccountId ? 'var(--settings-accent-soft-border)' : 'var(--settings-inset-border)',
                                }}
                              >
                                <IdentityAvatar user={user} accent={user.accountId === managerJiraAccountId ? 'var(--accent)' : 'var(--text-muted)'} />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>
                                    {user.displayName}
                                  </p>
                                  <p className="truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>
                                    {user.email || user.accountId}
                                  </p>
                                </div>
                                {user.accountId === managerJiraAccountId ? (
                                  <span
                                    className="rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em]"
                                    style={{ background: 'var(--settings-accent-soft-bg)', color: 'var(--accent)' }}
                                  >
                                    Active
                                  </span>
                                ) : null}
                              </button>
                            ))
                          ) : (
                            <div className="rounded-2xl border border-dashed px-4 py-5 text-[12px]" style={{ borderColor: 'color-mix(in srgb, var(--border-strong) 92%, transparent)', color: 'var(--text-muted)' }}>
                              No discovered Jira profiles match this filter yet. You can still paste an account id directly.
                            </div>
                          )}
                        </div>

                        {selectedManagerProfile ? (
                          <div
                            className="mt-4 rounded-2xl px-4 py-3 text-[12px]"
                            style={{
                              background: 'var(--settings-success-soft-bg)',
                              color: 'var(--text-secondary)',
                              border: 'var(--settings-success-soft-border)',
                            }}
                          >
                            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{selectedManagerProfile.displayName}</span>
                            {' '}is currently linked as the manager Jira identity.
                          </div>
                        ) : managerJiraAccountId ? (
                          <div
                            className="mt-4 rounded-2xl px-4 py-3 text-[12px]"
                            style={{
                              background: 'var(--settings-warning-soft-bg)',
                              color: 'var(--text-secondary)',
                              border: 'var(--settings-warning-soft-border)',
                            }}
                          >
                            This account id is saved manually and is not in the current local directory snapshot.
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </SectionCard>

                <SectionCard
                  icon={<RefreshCw size={16} />}
                  eyebrow="02"
                  title="Sync Scope"
                  description="Tune the base defect query and map Jira fields that the dashboard surfaces during triage."
                >
                  <div className="grid gap-4 lg:grid-cols-[1.2fr_0.95fr]">
                    <div
                      className="rounded-[24px] p-5"
                      style={{
                        background: 'var(--settings-pane-bg)',
                        border: 'var(--settings-pane-border)',
                      }}
                    >
                      <label
                        htmlFor="jira-base-query"
                        className="text-[11px] font-semibold uppercase tracking-[0.18em]"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        Base Jira Query
                      </label>
                      <p className="mt-2 text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        Keep this query focused on the defect universe you want to monitor. Team assignees and manager lead logic are layered on top automatically.
                      </p>
                      <textarea
                        id="jira-base-query"
                        value={jql}
                        onChange={(event) => setJql(event.target.value)}
                        rows={9}
                        spellCheck={false}
                        className="mt-4 w-full rounded-[22px] px-4 py-4 text-[13px] leading-relaxed outline-none transition-colors"
                        style={{
                          background: 'var(--settings-input-bg)',
                          color: 'var(--text-primary)',
                          border: 'var(--settings-input-border)',
                          minHeight: '180px',
                        }}
                        placeholder="project = PROJ AND issuetype = Bug AND statusCategory != Done"
                      />
                      <div
                        className="mt-4 rounded-2xl px-4 py-3 text-[12px] leading-relaxed"
                        style={{
                          background: 'var(--settings-accent-soft-bg)',
                          color: 'var(--text-secondary)',
                          border: 'var(--settings-accent-soft-border)',
                        }}
                      >
                        Use <code className="rounded px-1.5 py-0.5 text-[11px]" style={{ background: 'var(--settings-code-bg)', color: 'var(--accent)' }}>{'{ PROJECT_KEY }'}</code> to insert the configured Jira project key dynamically.
                      </div>
                    </div>

                    <div className="grid gap-4">
                      <FieldCard
                        label="Development Due Date"
                        description="Custom Jira date field shown as the development due date in triage."
                        value={devDueDateField}
                        onChange={setDevDueDateField}
                        onDiscover={() => handleDiscoverFields('dueDate')}
                        loading={loadingFields && fieldPickerTarget === 'dueDate'}
                        active={fieldPickerTarget === 'dueDate'}
                        placeholder="customfield_10128"
                      />
                      <FieldCard
                        label="ASPEN Severity"
                        description="Custom Jira field displayed at the top of triage properties."
                        value={aspenSeverityField}
                        onChange={setAspenSeverityField}
                        onDiscover={() => handleDiscoverFields('aspenSeverity')}
                        loading={loadingFields && fieldPickerTarget === 'aspenSeverity'}
                        active={fieldPickerTarget === 'aspenSeverity'}
                        placeholder="customfield_XXXXX"
                      />
                    </div>
                  </div>

                  {fieldPickerTarget ? (
                    <div
                      className="mt-4 overflow-hidden rounded-[24px]"
                      style={{
                        background: 'var(--settings-inset-bg)',
                        border: 'var(--settings-inset-border)',
                      }}
                    >
                      <div
                        className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                        style={{ borderColor: 'color-mix(in srgb, var(--border-strong) 78%, transparent)' }}
                      >
                        <div>
                          <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {fieldPickerTarget === 'aspenSeverity' ? 'ASPEN Severity field picker' : 'Development due date field picker'}
                          </p>
                          <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                            Search across Jira custom fields and click one to apply it.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="relative min-w-[220px] flex-1">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                            <input
                              type="text"
                              value={fieldSearch}
                              onChange={(event) => setFieldSearch(event.target.value)}
                              placeholder="Search fields…"
                              className="w-full rounded-xl py-2 pl-9 pr-3 text-[12px] outline-none"
                              style={{
                                background: 'var(--settings-input-bg)',
                                color: 'var(--text-primary)',
                                border: 'var(--settings-input-border)',
                              }}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => setFieldPickerTarget(null)}
                            className="rounded-xl px-3 py-2 text-[12px] font-medium transition-colors"
                            style={{
                              background: 'var(--settings-neutral-chip-bg)',
                              color: 'var(--text-secondary)',
                              border: '1px solid var(--border-strong)',
                            }}
                          >
                            Close
                          </button>
                        </div>
                      </div>

                      <div className="max-h-[280px] overflow-y-auto">
                        {preferredFields.length > 0 ? (
                          <FieldListGroup
                            title="Likely matches"
                            accent
                            fields={preferredFields}
                            currentFieldValue={currentFieldValue}
                            onSelect={handleFieldSelection}
                          />
                        ) : null}
                        {otherFields.length > 0 ? (
                          <FieldListGroup
                            title="Other custom fields"
                            fields={otherFields.slice(0, 50)}
                            currentFieldValue={currentFieldValue}
                            onSelect={handleFieldSelection}
                          />
                        ) : null}
                        {otherFields.length > 50 ? (
                          <div className="px-4 py-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                            +{otherFields.length - 50} more fields. Narrow the search to see them.
                          </div>
                        ) : null}
                        {preferredFields.length === 0 && otherFields.length === 0 ? (
                          <div className="px-4 py-5 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                            No custom fields match this search.
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </SectionCard>

                <SectionCard
                  icon={<Users size={16} />}
                  eyebrow="03"
                  title="Team Members"
                  description="Curate the tracked Jira developers that drive workload, routing, and manager visibility."
                >
                  <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                    <div
                      className="rounded-[24px] p-5"
                      style={{
                        background: 'var(--settings-pane-bg)',
                        border: 'var(--settings-pane-border)',
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
                            Tracked team
                          </p>
                          <p className="mt-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                            These Jira users are included in workload calculations and scoped sync results.
                          </p>
                        </div>
                        <div
                          className="rounded-full px-3 py-1 text-[11px] font-semibold"
                          style={{
                            background: 'var(--settings-accent-soft-bg)',
                            color: 'var(--accent)',
                            border: 'var(--settings-accent-soft-border)',
                          }}
                        >
                          {developers.length} tracked
                        </div>
                      </div>

                      <div className="relative mt-4">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                        <input
                          type="text"
                          value={teamSearch}
                          onChange={(event) => setTeamSearch(event.target.value)}
                          placeholder="Search current team"
                          aria-label="Search current team"
                          className="w-full rounded-xl py-2 pl-9 pr-3 text-[12px] outline-none"
                          style={{
                            background: 'var(--settings-input-bg)',
                            color: 'var(--text-primary)',
                            border: 'var(--settings-input-border)',
                          }}
                        />
                      </div>

                      <div className="mt-4 overflow-hidden rounded-[20px]" style={{ border: 'var(--settings-inset-border)' }}>
                        {loadingDevelopers ? (
                          <div className="px-4 py-5 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                            Loading team members…
                          </div>
                        ) : filteredDevelopers.length === 0 ? (
                          <div className="px-4 py-5 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                            No tracked team members match this search.
                          </div>
                        ) : (
                          filteredDevelopers.map((member, index) => {
                            const isRemoving = removingAccountId === member.accountId;
                            return (
                              <div
                                key={member.accountId}
                                className="flex items-center gap-3 px-4 py-3"
                                style={{
                                  background: index % 2 === 0 ? 'var(--settings-row-even-bg)' : 'var(--settings-row-odd-bg)',
                                  borderTop: index > 0 ? 'var(--settings-row-divider)' : 'none',
                                }}
                              >
                                <IdentityAvatar
                                  user={member}
                                  accent="var(--accent)"
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
                                    {member.displayName}
                                  </p>
                                  <p className="truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>
                                    {member.email || member.accountId}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveMember(member.accountId)}
                                  disabled={teamActionLoading}
                                  className="rounded-xl p-2 transition-colors disabled:opacity-50"
                                  style={{
                                    background: 'var(--settings-input-bg)',
                                    color: 'var(--text-secondary)',
                                    border: 'var(--settings-input-border)',
                                  }}
                                  title="Remove from team"
                                  aria-label={`Remove ${member.displayName} from team`}
                                >
                                  {isRemoving ? <Loader2 size={14} className="animate-spin" /> : <UserMinus size={14} />}
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    <div
                      className="rounded-[24px] p-5"
                      style={{
                        background: 'var(--settings-pane-bg)',
                        border: 'var(--settings-pane-border)',
                      }}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
                            Jira directory
                          </p>
                          <p className="mt-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                            Discover Jira users, select the people you want to track, and add them in one step.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            handleDiscoverTeamMembers({
                              query: discoveredSearch.trim(),
                              startAt: 0,
                              append: false,
                              silentEmpty: false,
                            })
                          }
                          disabled={teamActionLoading || discoveringTeam}
                          className="rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors disabled:opacity-50"
                          style={{
                            background: 'var(--settings-accent-soft-bg)',
                            color: 'var(--accent)',
                            border: 'var(--settings-accent-soft-border)',
                          }}
                        >
                          {discoveringTeam ? 'Refreshing…' : 'Refresh directory'}
                        </button>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                        <div className="relative">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                          <input
                            type="text"
                            value={discoveredSearch}
                            onChange={(event) => setDiscoveredSearch(event.target.value)}
                            placeholder="Search discoverable Jira users"
                            aria-label="Search discoverable Jira users"
                            className="w-full rounded-xl py-2 pl-9 pr-3 text-[12px] outline-none"
                            style={{
                              background: 'var(--settings-input-bg)',
                              color: 'var(--text-primary)',
                              border: 'var(--settings-input-border)',
                            }}
                          />
                        </div>
                        <div
                          className="flex items-center justify-center rounded-xl px-3 py-2 text-[11px] font-semibold"
                          style={{
                            background: 'var(--settings-neutral-chip-bg)',
                            color: 'var(--text-muted)',
                            border: '1px solid var(--border-strong)',
                          }}
                        >
                          {addableSelectionCount} selected
                        </div>
                      </div>

                      {discoverTeamError ? (
                        <div
                          className="mt-4 rounded-2xl px-4 py-3 text-[12px]"
                          style={{
                            background: 'var(--settings-danger-soft-bg)',
                            color: 'var(--danger-muted)',
                            border: 'var(--settings-danger-soft-border)',
                          }}
                        >
                          {discoverTeamError}
                        </div>
                      ) : null}

                      {discoveringTeam ? (
                        <div className="mt-4 flex items-center gap-2 rounded-2xl border px-4 py-4 text-[12px]" style={{ borderColor: 'color-mix(in srgb, var(--border-strong) 82%, transparent)', color: 'var(--text-secondary)', background: 'var(--settings-inset-bg)' }}>
                          <Loader2 size={14} className="animate-spin" style={{ color: 'var(--accent)' }} />
                          Discovering Jira users…
                        </div>
                      ) : discoveredUsers.length === 0 ? (
                        <div className="mt-4 rounded-2xl border border-dashed px-4 py-5 text-[12px]" style={{ borderColor: 'color-mix(in srgb, var(--border-strong) 92%, transparent)', color: 'var(--text-muted)' }}>
                          Discover users from Jira to build your tracked team.
                        </div>
                      ) : (
                        <>
                          <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px]">
                            <button type="button" onClick={handleSelectAllDiscovered} className="font-semibold" style={{ color: 'var(--accent)' }}>
                              Select all visible
                            </button>
                            <button type="button" onClick={handleClearAddSelection} className="font-semibold" style={{ color: 'var(--text-muted)' }}>
                              Clear
                            </button>
                            <span className="ml-auto" style={{ color: 'var(--text-muted)' }}>
                              {discoveredUsers.length} results loaded
                            </span>
                          </div>

                          <div className="mt-3 max-h-[320px] overflow-y-auto rounded-[20px]" style={{ border: 'var(--settings-inset-border)' }}>
                            {discoveredUsers.map((user, index) => {
                              const isAlreadyMember = activeMemberIds.has(user.accountId);
                              const isSelected = selectedAddUsers.has(user.accountId);
                              return (
                                <button
                                  key={user.accountId}
                                  type="button"
                                  onClick={() => !isAlreadyMember && handleToggleAddUser(user.accountId)}
                                  disabled={isAlreadyMember || teamActionLoading}
                                  className="flex w-full items-center gap-3 px-4 py-3 text-left disabled:opacity-100"
                                  style={{
                                    background: index % 2 === 0 ? 'var(--settings-row-even-bg)' : 'var(--settings-row-odd-bg)',
                                    borderTop: index > 0 ? 'var(--settings-row-divider)' : 'none',
                                  }}
                                >
                                  <span
                                    className="flex h-5 w-5 items-center justify-center rounded-md border text-[11px] font-semibold"
                                    style={{
                                      borderColor: isAlreadyMember || isSelected ? 'color-mix(in srgb, var(--accent) 26%, var(--border-strong))' : 'color-mix(in srgb, var(--border-strong) 88%, transparent)',
                                      background: isAlreadyMember || isSelected ? 'var(--settings-accent-soft-bg)' : 'transparent',
                                      color: isAlreadyMember || isSelected ? 'var(--accent)' : 'var(--text-muted)',
                                    }}
                                  >
                                    {isAlreadyMember || isSelected ? '✓' : ''}
                                  </span>
                                  <IdentityAvatar user={user} accent={isSelected ? 'var(--accent)' : 'var(--text-muted)'} />
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>
                                      {user.displayName}
                                    </p>
                                    <p className="truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>
                                      {user.email || user.accountId}
                                    </p>
                                  </div>
                                  {isAlreadyMember ? (
                                    <span className="rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ background: 'var(--settings-accent-soft-bg)', color: 'var(--accent)' }}>
                                      Added
                                    </span>
                                  ) : null}
                                </button>
                              );
                            })}
                          </div>

                          {discoverHasMore ? (
                            <button
                              type="button"
                              onClick={() =>
                                handleDiscoverTeamMembers({
                                  query: discoveredSearch.trim(),
                                  startAt: discoverNextStartAt,
                                  append: true,
                                  silentEmpty: true,
                                })
                              }
                              disabled={loadingMoreTeam || discoveringTeam}
                              className="mt-3 w-full rounded-2xl px-4 py-2.5 text-[12px] font-medium transition-colors disabled:opacity-50"
                              style={{
                                background: 'var(--settings-neutral-chip-bg)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-strong)',
                              }}
                            >
                              {loadingMoreTeam ? 'Loading more…' : 'Load more users'}
                            </button>
                          ) : null}

                          <button
                            type="button"
                            onClick={handleAddSelectedDevelopers}
                            disabled={addableSelectionCount === 0 || savingTeam}
                            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-[12px] font-semibold transition-colors disabled:opacity-50"
                            style={{
                              background: 'var(--settings-cta-bg)',
                              color: 'var(--settings-cta-text)',
                              border: 'var(--settings-cta-border)',
                            }}
                          >
                            {savingTeam ? (
                              <>
                                <Loader2 size={14} className="animate-spin" />
                                Adding selected members…
                              </>
                            ) : (
                              <>
                                <UserPlus size={14} />
                                Add selected developers
                              </>
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </SectionCard>

                <SectionCard
                  icon={<Shield size={16} />}
                  eyebrow="04"
                  title="Developer Access"
                  description="Create application accounts for the team and share the direct `/my-day` entry point with developers."
                >
                  <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                    <div className="grid gap-4">
                      <div
                        className="rounded-[24px] p-5"
                        style={{
                          background: 'var(--settings-pane-strong-bg)',
                          border: 'var(--settings-pane-border)',
                        }}
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
                          Developer login link
                        </p>
                        <p className="mt-2 text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                          Share the direct workspace URL with developers so they land in their day view immediately after sign-in.
                        </p>
                        <div
                          className="mt-4 rounded-2xl px-4 py-3 text-[12px] font-medium"
                          style={{
                            background: 'var(--settings-code-bg)',
                            color: 'var(--text-primary)',
                            border: 'var(--settings-inset-border)',
                          }}
                        >
                          {window.location.origin}/my-day
                        </div>
                        <button
                          type="button"
                          onClick={handleCopyDevLink}
                          className="mt-4 flex items-center gap-2 rounded-2xl px-4 py-2.5 text-[12px] font-semibold transition-colors"
                          style={{
                            background: copiedLink ? 'var(--settings-success-soft-bg)' : 'var(--settings-accent-soft-bg)',
                            color: copiedLink ? 'var(--success)' : 'var(--accent)',
                            border: copiedLink ? 'var(--settings-success-soft-border)' : 'var(--settings-accent-soft-border)',
                          }}
                        >
                          {copiedLink ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                          {copiedLink ? 'Copied /my-day link' : 'Copy /my-day link'}
                        </button>
                      </div>

                      <div
                        className="rounded-[24px] px-5 py-4 text-[12px] leading-relaxed"
                        style={{
                          background: 'var(--settings-accent-soft-bg)',
                          color: 'var(--text-secondary)',
                          border: 'var(--settings-accent-soft-border)',
                        }}
                      >
                        Managers can create new developer accounts here without reopening onboarding. Developer accounts still require a Jira identity link.
                      </div>
                    </div>

                    <div className="grid gap-4">
                      <div
                        className="rounded-[24px] p-5"
                        style={{
                          background: 'var(--settings-pane-bg)',
                          border: 'var(--settings-pane-border)',
                        }}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
                              Existing accounts
                            </p>
                            <p className="mt-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                              Review the current app users and their roles before creating more access.
                            </p>
                          </div>
                          <div
                            className="rounded-full px-3 py-1 text-[11px] font-semibold"
                            style={{
                              background: 'var(--settings-neutral-chip-bg)',
                              color: 'var(--text-muted)',
                              border: '1px solid var(--border-strong)',
                            }}
                          >
                            {loadingUsers ? 'Loading…' : `${appUsers.length} user${appUsers.length === 1 ? '' : 's'}`}
                          </div>
                        </div>

                        <div className="mt-4 overflow-hidden rounded-[20px]" style={{ border: 'var(--settings-inset-border)' }}>
                          {loadingUsers ? (
                            <div className="flex items-center gap-2 px-4 py-5 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                              <Loader2 size={14} className="animate-spin" />
                              Loading users…
                            </div>
                          ) : appUsers.length > 0 ? (
                            appUsers.map((user, index) => (
                              <div
                                key={user.username}
                                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center"
                                style={{
                                  background: index % 2 === 0 ? 'var(--settings-row-even-bg)' : 'var(--settings-row-odd-bg)',
                                  borderTop: index > 0 ? 'var(--settings-row-divider)' : 'none',
                                }}
                              >
                                <div className="flex min-w-0 flex-1 items-center gap-3">
                                  <div
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-[11px] font-bold"
                                    style={{
                                      background: user.role === 'manager' ? 'var(--settings-warning-soft-bg)' : 'var(--settings-accent-soft-bg)',
                                      color: user.role === 'manager' ? 'var(--warning)' : 'var(--accent)',
                                    }}
                                  >
                                    {user.displayName.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="truncate text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
                                        {user.displayName}
                                      </p>
                                      <span
                                        className="rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]"
                                        style={{
                                          background: user.role === 'manager' ? 'var(--settings-warning-soft-bg)' : 'var(--settings-accent-soft-bg)',
                                          color: user.role === 'manager' ? 'var(--warning)' : 'var(--accent)',
                                        }}
                                      >
                                        {user.role}
                                      </span>
                                      {user.developerAccountId ? (
                                        <span
                                          className="rounded-full px-2 py-1 text-[10px] font-medium"
                                          style={{
                                            background: 'var(--settings-neutral-chip-bg)',
                                            color: 'var(--text-muted)',
                                            border: '1px solid var(--border-strong)',
                                          }}
                                        >
                                          Jira linked
                                        </span>
                                      ) : null}
                                    </div>
                                    <p className="truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>
                                      @{user.username}
                                      {user.developerAccountId ? ` • ${user.developerAccountId}` : ''}
                                    </p>
                                  </div>
                                </div>
                                <div className="sm:ml-auto">
                                  {user.role === 'developer' ? (
                                    <UserAccountDeleteAction
                                      user={user}
                                      confirming={confirmDeleteUsername === user.username}
                                      deleting={deletingUsername === user.username}
                                      onStartConfirm={() => setConfirmDeleteUsername(user.username)}
                                      onCancel={() => setConfirmDeleteUsername((current) => (current === user.username ? null : current))}
                                      onConfirm={() => void handleDeleteUser(user)}
                                    />
                                  ) : (
                                    <div
                                      className="rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
                                      style={{
                                        background: 'var(--settings-warning-soft-bg)',
                                        color: 'var(--warning)',
                                        border: 'var(--settings-warning-soft-border)',
                                      }}
                                    >
                                      Manager access
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="px-4 py-5 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                              No access accounts found.
                            </div>
                          )}
                        </div>
                      </div>

                      {!showCreateUser ? (
                        <button
                          type="button"
                          onClick={() => setShowCreateUser(true)}
                          className="flex items-center justify-center gap-2 rounded-[24px] px-4 py-4 text-[13px] font-semibold transition-colors"
                          style={{
                            background: 'var(--settings-accent-soft-bg)',
                            color: 'var(--accent)',
                            border: 'var(--settings-accent-soft-border)',
                          }}
                        >
                          <UserPlus size={15} />
                          Create user account
                        </button>
                      ) : (
                        <div
                          className="rounded-[24px] p-5"
                          style={{
                            background: 'var(--settings-pane-bg)',
                            border: 'var(--settings-accent-soft-border)',
                          }}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>
                                New account
                              </p>
                              <p className="mt-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                                Create a developer or manager login without leaving settings.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowCreateUser(false)}
                              className="rounded-full px-3 py-1 text-[11px] font-semibold transition-colors"
                              style={{
                                background: 'var(--settings-neutral-chip-bg)',
                                color: 'var(--text-secondary)',
                                border: '1px solid var(--border-strong)',
                              }}
                            >
                              Cancel
                            </button>
                          </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-2">
                            <TextInput label="Username" value={newUsername} onChange={setNewUsername} placeholder="manager.smith" />
                            <TextInput label="Display Name" value={newDisplayName} onChange={setNewDisplayName} placeholder="Morgan Smith" />
                          </div>
                          <div className="mt-3">
                            <TextInput
                              label="Password"
                              value={newPassword}
                              onChange={setNewPassword}
                              placeholder="Password (min 6 characters)"
                              type="password"
                              autoComplete="new-password"
                            />
                          </div>
                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <SelectField
                              label="Role"
                              value={newRole}
                              onChange={(value) => {
                                setNewRole(value as UserRole);
                                if (value === 'manager') setNewDevAccountId('');
                              }}
                              options={[
                                { label: 'Developer', value: 'developer' },
                                { label: 'Manager', value: 'manager' },
                              ]}
                            />
                            {newRole === 'developer' ? (
                              <SelectField
                                label="Jira profile"
                                value={newDevAccountId}
                                onChange={setNewDevAccountId}
                                options={[
                                  { label: 'Select Jira profile…', value: '' },
                                  ...developers.map((developer) => ({
                                    label: `${developer.displayName}${developer.email ? ` (${developer.email})` : ''}`,
                                    value: developer.accountId,
                                  })),
                                ]}
                              />
                            ) : (
                              <div
                                className="rounded-[20px] px-4 py-3 text-[12px] leading-relaxed"
                                style={{
                                  background: 'var(--settings-inset-bg)',
                                  color: 'var(--text-secondary)',
                                  border: 'var(--settings-inset-border)',
                                }}
                              >
                                Manager accounts do not require a linked developer Jira profile.
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={handleCreateUser}
                            disabled={creatingUser || !newUsername.trim() || !newDisplayName.trim() || !newPassword.trim()}
                            className="mt-4 flex items-center gap-2 rounded-2xl px-4 py-3 text-[12px] font-semibold transition-colors disabled:opacity-50"
                            style={{
                              background: 'var(--settings-cta-bg)',
                              color: 'var(--settings-cta-text)',
                              border: 'var(--settings-cta-border)',
                            }}
                          >
                            {creatingUser ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                            Create account
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </SectionCard>
              </div>
            </div>

            <div
              className="border-t px-6 py-4 md:px-8"
              style={{
                borderColor: 'color-mix(in srgb, var(--border-strong) 84%, transparent)',
                background: 'color-mix(in srgb, var(--bg-secondary) 88%, transparent)',
              }}
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                  Save stages settings only. Save & Sync persists them and immediately starts a Jira refresh without leaving this page.
                </div>
                <div className="flex flex-wrap items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleResetConfig}
                    disabled={hasChanges}
                    className="rounded-2xl px-4 py-2.5 text-[13px] font-medium transition-colors disabled:opacity-50"
                    style={{
                      background: 'var(--settings-danger-soft-bg)',
                      color: 'var(--danger-muted)',
                      border: 'var(--settings-danger-soft-border)',
                    }}
                    >
                    <AlertTriangle size={14} className="mr-2 inline" />
                    {resetting ? 'Resetting…' : 'Reset & Reconfigure'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={hasChanges}
                    className="flex items-center gap-2 rounded-2xl px-4 py-2.5 text-[13px] font-medium transition-colors disabled:opacity-50"
                    style={{
                      background: 'var(--settings-neutral-chip-bg)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-strong)',
                    }}
                  >
                    <Save size={14} />
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAndSync}
                    disabled={hasChanges || triggerSync.isPending}
                    className="flex items-center gap-2 rounded-2xl px-4 py-2.5 text-[13px] font-semibold transition-colors disabled:opacity-50"
                    style={{
                      background: 'var(--settings-cta-primary-bg)',
                      color: 'var(--settings-cta-primary-text)',
                    }}
                  >
                    <RefreshCw size={14} className={triggerSync.isPending ? 'animate-spin' : ''} />
                    Save & Sync
                  </button>
                </div>
              </div>
            </div>
    </motion.div>
  );
}

export const SettingsPanel = SettingsPage;

function UserAccountDeleteAction({
  user,
  confirming,
  deleting,
  onStartConfirm,
  onCancel,
  onConfirm,
}: {
  user: AuthUser;
  confirming: boolean;
  deleting: boolean;
  onStartConfirm: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (confirming) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2"
      >
        <span className="text-[11px] font-medium" style={{ color: 'var(--danger-muted)' }}>
          Delete access?
        </span>
        <button
          type="button"
          onClick={onConfirm}
          disabled={deleting}
          className="rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors disabled:opacity-50"
          style={{
            background: 'var(--settings-danger-soft-bg)',
            color: 'var(--danger-muted)',
            border: 'var(--settings-danger-soft-border)',
          }}
          aria-label={`Confirm delete account for ${user.displayName}`}
        >
          {deleting ? (
            <span className="flex items-center gap-1.5">
              <Loader2 size={12} className="animate-spin" />
              Deleting…
            </span>
          ) : (
            'Confirm'
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={deleting}
          className="rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors disabled:opacity-50"
          style={{
            background: 'var(--settings-neutral-chip-bg)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-strong)',
          }}
          aria-label={`Cancel deleting account for ${user.displayName}`}
        >
          Cancel
        </button>
      </motion.div>
    );
  }

  return (
    <button
      type="button"
      onClick={onStartConfirm}
      className="flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors"
      style={{
        background: 'var(--settings-danger-soft-bg)',
        color: 'var(--danger-muted)',
        border: 'var(--settings-danger-soft-border)',
      }}
      aria-label={`Delete account for ${user.displayName}`}
    >
      <UserMinus size={12} />
      Delete
    </button>
  );
}

function SectionCard({
  icon,
  eyebrow,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section
      className="rounded-[30px] p-5 sm:p-6"
      style={{
        background: 'var(--settings-shell-bg)',
        border: 'var(--settings-shell-border)',
        boxShadow: 'var(--settings-shell-shadow)',
      }}
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
            style={{
              background: 'var(--settings-accent-chip-bg)',
              color: 'var(--accent)',
              border: '1px solid color-mix(in srgb, var(--accent) 28%, var(--border))',
            }}
          >
            {icon}
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>
              Section {eyebrow}
            </div>
            <h3 className="mt-1 text-[20px] font-semibold tracking-[-0.03em]" style={{ color: 'var(--text-primary)' }}>
              {title}
            </h3>
            <p className="mt-2 max-w-[560px] text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {description}
            </p>
          </div>
        </div>
      </div>
      {children}
    </section>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'neutral' | 'good' | 'warn';
}) {
  const color =
    tone === 'good'
      ? 'var(--settings-success-soft-bg)'
      : tone === 'warn'
        ? 'var(--settings-warning-soft-bg)'
        : 'var(--settings-neutral-chip-bg)';
  const borderColor =
    tone === 'good'
      ? 'var(--settings-success-soft-border)'
      : tone === 'warn'
        ? 'var(--settings-warning-soft-border)'
        : '1px solid var(--border-strong)';
  const textColor =
    tone === 'good'
      ? 'var(--success)'
      : tone === 'warn'
        ? 'var(--warning)'
        : 'var(--text-primary)';

  return (
    <div
      className="rounded-[22px] px-4 py-3"
        style={{
          background: color,
          border: borderColor,
        }}
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
        {label}
      </div>
      <div className="mt-2 text-[13px] font-semibold" style={{ color: textColor }}>
        {value}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>
        {label}
      </div>
      <div className="mt-1 text-[13px]" style={{ color: 'var(--text-primary)' }}>
        {value}
      </div>
    </div>
  );
}

function TextInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  autoComplete,
  mono = false,
  hideLabel = false,
}: {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  autoComplete?: string;
  mono?: boolean;
  hideLabel?: boolean;
}) {
  return (
    <label className="block">
      <span
        className={hideLabel ? 'sr-only' : 'mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em]'}
        style={hideLabel ? undefined : { color: 'var(--text-muted)' }}
      >
        {label}
      </span>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`w-full rounded-[20px] px-4 py-3 text-[13px] outline-none transition-colors ${mono ? 'font-mono' : ''}`}
        style={{
          background: 'var(--settings-input-bg)',
          color: 'var(--text-primary)',
          border: 'var(--settings-input-border)',
        }}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full appearance-none rounded-[20px] px-4 py-3 text-[13px] outline-none"
          style={{
            background: 'var(--settings-input-bg)',
            color: 'var(--text-primary)',
            border: 'var(--settings-input-border)',
          }}
        >
          {options.map((option) => (
            <option key={option.value || option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2"
          style={{ color: 'var(--text-muted)' }}
        />
      </div>
    </label>
  );
}

function FieldCard({
  label,
  description,
  value,
  onChange,
  onDiscover,
  loading,
  active,
  placeholder,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  onDiscover: () => void;
  loading: boolean;
  active: boolean;
  placeholder: string;
}) {
  return (
    <div
      className="rounded-[24px] p-5"
      style={{
        background: active ? 'var(--settings-accent-chip-bg)' : 'var(--settings-soft-bg)',
        border: active ? '1px solid color-mix(in srgb, var(--accent) 28%, var(--border))' : 'var(--settings-soft-border)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            {label}
          </p>
          <p className="mt-2 text-[12px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {description}
          </p>
        </div>
        <button
          type="button"
          onClick={onDiscover}
          className="flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors"
          style={{
            background: active ? 'var(--settings-accent-chip-bg)' : 'var(--settings-neutral-chip-bg)',
            color: active ? 'var(--accent)' : 'var(--text-primary)',
            border: '1px solid var(--border-strong)',
          }}
        >
          {loading ? <RefreshCw size={12} className="animate-spin" /> : <Search size={12} />}
          Discover
        </button>
      </div>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-4 w-full rounded-[20px] px-4 py-3 text-[13px] font-mono outline-none"
        style={{
          background: 'var(--settings-input-bg)',
          color: 'var(--text-primary)',
          border: 'var(--settings-input-border)',
        }}
      />
    </div>
  );
}

function FieldListGroup({
  title,
  fields,
  currentFieldValue,
  onSelect,
  accent = false,
}: {
  title: string;
  fields: JiraField[];
  currentFieldValue: string;
  onSelect: (fieldId: string) => void;
  accent?: boolean;
}) {
  return (
    <>
      <div
        className="px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em]"
        style={{
          color: accent ? 'var(--accent)' : 'var(--text-muted)',
          background: 'var(--settings-neutral-chip-bg)',
        }}
      >
        {title}
      </div>
      {fields.map((field) => (
        <button
          key={field.id}
          type="button"
          onClick={() => onSelect(field.id)}
          className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors"
          style={{
            background: field.id === currentFieldValue ? 'var(--settings-accent-soft-bg)' : 'transparent',
            borderTop: 'var(--settings-row-divider)',
          }}
        >
          <div className="min-w-0">
            <p className="truncate text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>
              {field.name}
            </p>
            <p className="truncate text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
              {field.id}
            </p>
          </div>
          {field.id === currentFieldValue ? (
            <span className="rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ background: 'var(--settings-accent-soft-bg)', color: 'var(--accent)' }}>
              Selected
            </span>
          ) : null}
        </button>
      ))}
    </>
  );
}

function IdentityAvatar({
  user,
  accent,
}: {
  user: { displayName: string; avatarUrl?: string };
  accent: string;
}) {
  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.displayName}
        className="h-9 w-9 shrink-0 rounded-2xl object-cover"
      />
    );
  }

  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-[11px] font-bold"
      style={{
        background: 'var(--settings-neutral-chip-bg)',
        color: accent,
        border: '1px solid var(--border-strong)',
      }}
    >
      {user.displayName.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'U'}
    </div>
  );
}

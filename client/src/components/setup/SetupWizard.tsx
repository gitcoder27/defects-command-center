import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Loader2,
  Moon,
  PlugZap,
  Search,
  ShieldPlus,
  Sun,
  UserCog,
  Users,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { useConfig } from '@/hooks/useConfig';
import { api } from '@/lib/api';
import { useTriggerSync } from '@/hooks/useTriggerSync';
import type { AuthUser } from '@/types';

interface DiscoveredUser {
  accountId: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
}

interface SetupWizardProps {
  onComplete: () => Promise<void> | void;
}

type WizardStep =
  | 'manager-account'
  | 'jira-connection'
  | 'manager-mapping'
  | 'team-members'
  | 'developer-access'
  | 'syncing';

const STEP_ORDER: Exclude<WizardStep, 'syncing'>[] = [
  'manager-account',
  'jira-connection',
  'manager-mapping',
  'team-members',
  'developer-access',
];

const STEP_COPY: Record<Exclude<WizardStep, 'syncing'>, { label: string; title: string; description: string; icon: typeof BriefcaseBusiness }> = {
  'manager-account': {
    label: '1',
    title: 'Create the first manager account',
    description: 'Bootstrap the app identity first. Jira mapping comes later and stays optional.',
    icon: BriefcaseBusiness,
  },
  'jira-connection': {
    label: '2',
    title: 'Connect Jira',
    description: 'Use any Jira account or service account with enough access to sync the project.',
    icon: PlugZap,
  },
  'manager-mapping': {
    label: '3',
    title: 'Optionally include the manager in sync scope',
    description: 'Only map a Jira identity here if the manager wants their own assignments included.',
    icon: UserCog,
  },
  'team-members': {
    label: '4',
    title: 'Select tracked developers',
    description: 'Choose which Jira assignees belong in the team roster and sync scope.',
    icon: Users,
  },
  'developer-access': {
    label: '5',
    title: 'Optionally create developer access',
    description: 'Create app accounts for tracked developers now, or skip and do it later from settings.',
    icon: ShieldPlus,
  },
};

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const { user, isAuthenticated, refreshSession } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { addToast } = useToast();
  const triggerSync = useTriggerSync();
  const configQuery = useConfig({ enabled: isAuthenticated && user?.role === 'manager' });

  const [step, setStep] = useState<WizardStep>(
    isAuthenticated && user?.role === 'manager' ? 'jira-connection' : 'manager-account'
  );
  const [errorMessage, setErrorMessage] = useState('');

  const [managerUsername, setManagerUsername] = useState('');
  const [managerDisplayName, setManagerDisplayName] = useState('');
  const [managerPassword, setManagerPassword] = useState('');
  const [creatingManager, setCreatingManager] = useState(false);

  const [jiraBaseUrl, setJiraBaseUrl] = useState('');
  const [jiraEmail, setJiraEmail] = useState('');
  const [jiraApiToken, setJiraApiToken] = useState('');
  const [jiraProjectKey, setJiraProjectKey] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);
  const [savingConnection, setSavingConnection] = useState(false);
  const [connectionValidated, setConnectionValidated] = useState(false);

  const [discoveringUsers, setDiscoveringUsers] = useState(false);
  const [discoverQuery, setDiscoverQuery] = useState('');
  const [discoveredUsers, setDiscoveredUsers] = useState<DiscoveredUser[]>([]);

  const [includeManagerJira, setIncludeManagerJira] = useState(false);
  const [selectedManagerJiraAccountId, setSelectedManagerJiraAccountId] = useState('');

  const [selectedDeveloperIds, setSelectedDeveloperIds] = useState<Set<string>>(new Set());
  const [savingDevelopers, setSavingDevelopers] = useState(false);

  const [appUsers, setAppUsers] = useState<AuthUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [newAccountUsername, setNewAccountUsername] = useState('');
  const [newAccountDisplayName, setNewAccountDisplayName] = useState('');
  const [newAccountPassword, setNewAccountPassword] = useState('');
  const [newAccountDeveloperId, setNewAccountDeveloperId] = useState('');
  const [creatingDeveloperAccess, setCreatingDeveloperAccess] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'manager' && step === 'manager-account') {
      setStep('jira-connection');
    }
  }, [isAuthenticated, step, user]);

  useEffect(() => {
    if (!configQuery.data) {
      return;
    }

    setJiraBaseUrl((value) => value || configQuery.data?.jiraBaseUrl || '');
    setJiraEmail((value) => value || configQuery.data?.jiraEmail || '');
    setJiraProjectKey((value) => value || configQuery.data?.jiraProjectKey || '');
    setSelectedManagerJiraAccountId((value) => value || configQuery.data?.managerJiraAccountId || '');
    if (configQuery.data.managerJiraAccountId) {
      setIncludeManagerJira(true);
    }
  }, [configQuery.data]);

  useEffect(() => {
    if (step !== 'developer-access' || !isAuthenticated || user?.role !== 'manager') {
      return;
    }

    let cancelled = false;
    setLoadingUsers(true);
    api
      .get<{ users: AuthUser[] }>('/auth/users')
      .then((response) => {
        if (!cancelled) {
          setAppUsers(response.users ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAppUsers([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingUsers(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, step, user]);

  const filteredDiscoveredUsers = useMemo(() => {
    const query = discoverQuery.trim().toLowerCase();
    const baseUsers = includeManagerJira && selectedManagerJiraAccountId
      ? discoveredUsers.filter((candidate) => candidate.accountId !== selectedManagerJiraAccountId)
      : discoveredUsers;

    if (!query) {
      return baseUsers;
    }

    return baseUsers.filter((candidate) =>
      candidate.displayName.toLowerCase().includes(query) ||
      (candidate.email?.toLowerCase().includes(query) ?? false)
    );
  }, [discoverQuery, discoveredUsers, includeManagerJira, selectedManagerJiraAccountId]);

  const trackedDevelopers = useMemo(
    () => discoveredUsers.filter((candidate) => selectedDeveloperIds.has(candidate.accountId)),
    [discoveredUsers, selectedDeveloperIds]
  );

  const trackedDeveloperIdSet = useMemo(
    () => new Set(trackedDevelopers.map((candidate) => candidate.accountId)),
    [trackedDevelopers]
  );

  const existingDeveloperAccountIds = useMemo(
    () => new Set(appUsers.map((account) => account.developerAccountId).filter(Boolean)),
    [appUsers]
  );

  const eligibleDeveloperAccounts = useMemo(
    () => trackedDevelopers.filter((candidate) => !existingDeveloperAccountIds.has(candidate.accountId)),
    [existingDeveloperAccountIds, trackedDevelopers]
  );

  const currentStepIndex = STEP_ORDER.indexOf(step === 'syncing' ? 'developer-access' : step);

  const clearError = () => setErrorMessage('');

  const loadDiscoverableUsers = async (search = '') => {
    setDiscoveringUsers(true);
    setErrorMessage('');

    try {
      const response = await api.post<{ users: DiscoveredUser[] }>('/team/discover', {
        query: search.trim() || undefined,
        maxResults: 100,
      });
      setDiscoveredUsers(response.users ?? []);
      return response.users ?? [];
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to discover Jira users';
      setErrorMessage(message);
      throw error;
    } finally {
      setDiscoveringUsers(false);
    }
  };

  const goToStep = (nextStep: WizardStep) => {
    clearError();
    setStep(nextStep);
  };

  const handleCreateManager = async () => {
    if (!managerUsername.trim() || !managerDisplayName.trim() || !managerPassword.trim()) {
      return;
    }

    setCreatingManager(true);
    setErrorMessage('');

    try {
      await api.post('/auth/register', {
        username: managerUsername.trim(),
        displayName: managerDisplayName.trim(),
        password: managerPassword,
        role: 'manager',
      });
      await refreshSession();
      addToast({
        type: 'success',
        title: 'Manager account created',
        message: 'You are signed in and can continue with Jira setup.',
      });
      goToStep('jira-connection');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create manager account');
    } finally {
      setCreatingManager(false);
    }
  };

  const handleTestConnection = async () => {
    if (!jiraBaseUrl || !jiraEmail || !jiraApiToken || !jiraProjectKey) {
      return;
    }

    setTestingConnection(true);
    setErrorMessage('');

    try {
      await api.post('/config/test', {
        jiraBaseUrl,
        jiraEmail,
        jiraApiToken,
        jiraProjectKey,
      });
      setConnectionValidated(true);
      addToast({
        type: 'success',
        title: 'Jira connection confirmed',
        message: 'The workspace can now save this Jira connection.',
      });
    } catch (error) {
      setConnectionValidated(false);
      setErrorMessage(error instanceof Error ? error.message : 'Connection test failed');
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveConnection = async () => {
    setSavingConnection(true);
    setErrorMessage('');

    try {
      await api.put('/config', {
        jiraBaseUrl,
        jiraEmail,
        jiraProjectKey,
        jiraApiToken: jiraApiToken && jiraApiToken !== '****' ? jiraApiToken : undefined,
      });
      await configQuery.refetch();
      await loadDiscoverableUsers();
      addToast({
        type: 'success',
        title: 'Jira connection saved',
        message: 'Now choose whether the manager should also be included in sync scope.',
      });
      goToStep('manager-mapping');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save Jira connection');
    } finally {
      setSavingConnection(false);
    }
  };

  const handleSaveManagerMapping = async () => {
    if (includeManagerJira && !selectedManagerJiraAccountId) {
      setErrorMessage('Select a Jira identity for the manager or continue without manager mapping.');
      return;
    }

    try {
      await api.put('/config/settings', {
        managerJiraAccountId: includeManagerJira ? selectedManagerJiraAccountId : '',
      });
      await configQuery.refetch();
      if (discoveredUsers.length === 0) {
        await loadDiscoverableUsers();
      }
      addToast({
        type: 'success',
        title: 'Sync scope manager mapping saved',
        message: includeManagerJira
          ? 'Manager assignments will be included in sync scope.'
          : 'The workspace will sync only tracked developers.',
      });
      goToStep('team-members');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save manager Jira mapping');
    }
  };

  const handleSaveTrackedDevelopers = async () => {
    setSavingDevelopers(true);
    setErrorMessage('');

    try {
      await api.post('/team/developers', {
        developers: trackedDevelopers,
      });
      addToast({
        type: 'success',
        title: 'Tracked developers saved',
        message: `${trackedDevelopers.length} team member${trackedDevelopers.length === 1 ? '' : 's'} will be tracked.`,
      });
      goToStep('developer-access');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save tracked developers');
    } finally {
      setSavingDevelopers(false);
    }
  };

  const handleCreateDeveloperAccount = async () => {
    if (!newAccountUsername.trim() || !newAccountDisplayName.trim() || !newAccountPassword.trim() || !newAccountDeveloperId) {
      return;
    }

    setCreatingDeveloperAccess(true);
    setErrorMessage('');

    try {
      const response = await api.post<{ user: AuthUser }>('/auth/register', {
        username: newAccountUsername.trim(),
        displayName: newAccountDisplayName.trim(),
        password: newAccountPassword,
        role: 'developer',
        developerAccountId: newAccountDeveloperId,
      });
      setAppUsers((current) => [...current, response.user]);
      setNewAccountUsername('');
      setNewAccountDisplayName('');
      setNewAccountPassword('');
      setNewAccountDeveloperId('');
      addToast({
        type: 'success',
        title: 'Developer access created',
        message: `Created login access for ${response.user.displayName}.`,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create developer access');
    } finally {
      setCreatingDeveloperAccess(false);
    }
  };

  const handleFinish = async () => {
    setStep('syncing');
    setErrorMessage('');

    try {
      await triggerSync.mutateAsync();
      await onComplete();
    } catch (error) {
      setStep('developer-access');
      setErrorMessage(error instanceof Error ? error.message : 'Initial Jira sync failed');
    }
  };

  const stepContent = (() => {
    switch (step) {
      case 'manager-account':
        return (
          <div className="space-y-5">
            <Field label="Username">
              <input
                value={managerUsername}
                onChange={(event) => setManagerUsername(event.target.value)}
                placeholder="manager"
                className={fieldClassName}
                style={fieldStyle}
              />
            </Field>
            <Field label="Display name">
              <input
                value={managerDisplayName}
                onChange={(event) => setManagerDisplayName(event.target.value)}
                placeholder="Taylor Morgan"
                className={fieldClassName}
                style={fieldStyle}
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                value={managerPassword}
                onChange={(event) => setManagerPassword(event.target.value)}
                placeholder="At least 6 characters"
                className={fieldClassName}
                style={fieldStyle}
              />
            </Field>
            <FooterActions
              primaryLabel={creatingManager ? 'Creating…' : 'Create Manager Account'}
              primaryIcon={creatingManager ? Loader2 : ArrowRight}
              primaryDisabled={!managerUsername.trim() || !managerDisplayName.trim() || managerPassword.length < 6 || creatingManager}
              onPrimary={handleCreateManager}
            />
          </div>
        );
      case 'jira-connection':
        return (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Jira base URL">
                <input
                  value={jiraBaseUrl}
                  onChange={(event) => {
                    setJiraBaseUrl(event.target.value);
                    setConnectionValidated(false);
                  }}
                  placeholder="https://tenant.atlassian.net"
                  className={fieldClassName}
                  style={fieldStyle}
                />
              </Field>
              <Field label="Jira project key">
                <input
                  value={jiraProjectKey}
                  onChange={(event) => {
                    setJiraProjectKey(event.target.value.toUpperCase());
                    setConnectionValidated(false);
                  }}
                  placeholder="AM"
                  className={fieldClassName}
                  style={fieldStyle}
                />
              </Field>
            </div>
            <Field label="Jira email">
              <input
                type="email"
                value={jiraEmail}
                onChange={(event) => {
                  setJiraEmail(event.target.value);
                  setConnectionValidated(false);
                }}
                placeholder="jira-sync@example.com"
                className={fieldClassName}
                style={fieldStyle}
              />
            </Field>
            <Field label="Jira API token">
              <input
                type="password"
                value={jiraApiToken}
                onChange={(event) => {
                  setJiraApiToken(event.target.value);
                  setConnectionValidated(false);
                }}
                placeholder={configQuery.data?.jiraApiToken ? 'Leave blank to keep the saved token' : 'Paste API token'}
                className={fieldClassName}
                style={fieldStyle}
              />
            </Field>
            <div className="grid gap-3 md:grid-cols-2">
              <button
                onClick={handleTestConnection}
                disabled={!jiraBaseUrl || !jiraEmail || !jiraProjectKey || (!jiraApiToken && !configQuery.data?.jiraApiToken) || testingConnection}
                className={secondaryButtonClassName}
                style={secondaryButtonStyle}
              >
                {testingConnection ? <Loader2 size={15} className="animate-spin" /> : <PlugZap size={15} />}
                {connectionValidated ? 'Connection confirmed' : 'Test connection'}
              </button>
              <button
                onClick={handleSaveConnection}
                disabled={!jiraBaseUrl || !jiraEmail || !jiraProjectKey || (!jiraApiToken && !configQuery.data?.jiraApiToken) || savingConnection}
                className={primaryButtonClassName}
                style={primaryButtonStyle}
              >
                {savingConnection ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
                Save Jira connection
              </button>
            </div>
          </div>
        );
      case 'manager-mapping':
        return (
          <div className="space-y-5">
            <div
              className="rounded-[22px] border p-4"
              style={{
                borderColor: 'var(--border)',
                background: 'color-mix(in srgb, var(--bg-tertiary) 72%, transparent)',
              }}
            >
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={includeManagerJira}
                  onChange={(event) => {
                    setIncludeManagerJira(event.target.checked);
                    if (!event.target.checked) {
                      setSelectedManagerJiraAccountId('');
                    }
                  }}
                  className="mt-1"
                />
                <span>
                  <span className="block text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Include the manager&apos;s own Jira assignments
                  </span>
                  <span className="mt-1 block text-[13px] leading-6" style={{ color: 'var(--text-secondary)' }}>
                    Leave this off if Jira is connected with a service account or if the manager should stay outside the
                    tracked assignment scope.
                  </span>
                </span>
              </label>
            </div>

            {includeManagerJira && (
              <>
                <button
                  onClick={() => void loadDiscoverableUsers()}
                  disabled={discoveringUsers}
                  className={secondaryButtonClassName}
                  style={secondaryButtonStyle}
                >
                  {discoveringUsers ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
                  Refresh Jira users
                </button>
                <div className="space-y-2">
                  {discoveredUsers.map((candidate) => (
                    <button
                      key={candidate.accountId}
                      onClick={() => setSelectedManagerJiraAccountId(candidate.accountId)}
                      className="flex w-full items-center justify-between rounded-[18px] border px-4 py-3 text-left transition-colors"
                      style={{
                        borderColor:
                          selectedManagerJiraAccountId === candidate.accountId ? 'var(--warning)' : 'var(--border)',
                        background:
                          selectedManagerJiraAccountId === candidate.accountId
                            ? 'rgba(245, 158, 11, 0.12)'
                            : 'var(--bg-tertiary)',
                      }}
                    >
                      <div>
                        <div className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {candidate.displayName}
                        </div>
                        <div className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                          {candidate.email || candidate.accountId}
                        </div>
                      </div>
                      {selectedManagerJiraAccountId === candidate.accountId && (
                        <CheckCircle2 size={16} style={{ color: 'var(--warning)' }} />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}

            <FooterActions
              secondaryLabel="Back"
              secondaryIcon={ArrowLeft}
              onSecondary={() => goToStep('jira-connection')}
              primaryLabel="Continue to team selection"
              primaryIcon={ArrowRight}
              onPrimary={handleSaveManagerMapping}
            />
          </div>
        );
      case 'team-members':
        return (
          <div className="space-y-5">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-4 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-muted)' }}
              />
              <input
                value={discoverQuery}
                onChange={(event) => setDiscoverQuery(event.target.value)}
                placeholder="Search Jira users"
                className={`${fieldClassName} pl-10`}
                style={fieldStyle}
              />
            </div>
            <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
              {filteredDiscoveredUsers.map((candidate) => {
                const selected = selectedDeveloperIds.has(candidate.accountId);
                return (
                  <button
                    key={candidate.accountId}
                    onClick={() => {
                      setSelectedDeveloperIds((current) => {
                        const next = new Set(current);
                        if (next.has(candidate.accountId)) {
                          next.delete(candidate.accountId);
                        } else {
                          next.add(candidate.accountId);
                        }
                        return next;
                      });
                    }}
                    className="flex w-full items-center justify-between rounded-[18px] border px-4 py-3 text-left transition-colors"
                    style={{
                      borderColor: selected ? 'var(--accent)' : 'var(--border)',
                      background: selected ? 'rgba(6, 182, 212, 0.12)' : 'var(--bg-tertiary)',
                    }}
                  >
                    <div>
                      <div className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {candidate.displayName}
                      </div>
                      <div className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                        {candidate.email || candidate.accountId}
                      </div>
                    </div>
                    {selected && <CheckCircle2 size={16} style={{ color: 'var(--accent)' }} />}
                  </button>
                );
              })}
            </div>
            <div className="rounded-[18px] border px-4 py-3 text-[13px]" style={{ borderColor: 'var(--border)', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
              {selectedDeveloperIds.size} tracked developer{selectedDeveloperIds.size === 1 ? '' : 's'} selected.
            </div>
            <FooterActions
              secondaryLabel="Back"
              secondaryIcon={ArrowLeft}
              onSecondary={() => goToStep('manager-mapping')}
              primaryLabel={savingDevelopers ? 'Saving team…' : 'Save tracked developers'}
              primaryIcon={savingDevelopers ? Loader2 : ArrowRight}
              primaryDisabled={savingDevelopers}
              onPrimary={handleSaveTrackedDevelopers}
            />
          </div>
        );
      case 'developer-access':
        return (
          <div className="space-y-5">
            <div
              className="rounded-[22px] border p-4"
              style={{
                borderColor: 'var(--border)',
                background: 'color-mix(in srgb, var(--bg-tertiary) 72%, transparent)',
              }}
            >
              <div className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                Developer login link
              </div>
              <div className="mt-1 text-[13px] leading-6" style={{ color: 'var(--text-secondary)' }}>
                Share <span className="font-mono">{`${window.location.origin}/my-day`}</span> with developers after their
                accounts are created.
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Username">
                <input
                  value={newAccountUsername}
                  onChange={(event) => setNewAccountUsername(event.target.value)}
                  placeholder="jamie"
                  className={fieldClassName}
                  style={fieldStyle}
                />
              </Field>
              <Field label="Display name">
                <input
                  value={newAccountDisplayName}
                  onChange={(event) => setNewAccountDisplayName(event.target.value)}
                  placeholder="Jamie Chen"
                  className={fieldClassName}
                  style={fieldStyle}
                />
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-[1fr_1.1fr]">
              <Field label="Password">
                <input
                  type="password"
                  value={newAccountPassword}
                  onChange={(event) => setNewAccountPassword(event.target.value)}
                  placeholder="Temporary password"
                  className={fieldClassName}
                  style={fieldStyle}
                />
              </Field>
              <Field label="Tracked developer">
                <select
                  value={newAccountDeveloperId}
                  onChange={(event) => {
                    const nextDeveloperId = event.target.value;
                    setNewAccountDeveloperId(nextDeveloperId);
                    const matchedDeveloper = trackedDevelopers.find((candidate) => candidate.accountId === nextDeveloperId);
                    if (matchedDeveloper && !newAccountDisplayName) {
                      setNewAccountDisplayName(matchedDeveloper.displayName);
                    }
                  }}
                  className={fieldClassName}
                  style={fieldStyle}
                >
                  <option value="">Select tracked developer</option>
                  {eligibleDeveloperAccounts.map((candidate) => (
                    <option key={candidate.accountId} value={candidate.accountId}>
                      {candidate.displayName}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <button
              onClick={handleCreateDeveloperAccount}
              disabled={!newAccountUsername.trim() || !newAccountDisplayName.trim() || !newAccountPassword.trim() || !newAccountDeveloperId || creatingDeveloperAccess}
              className={primaryButtonClassName}
              style={primaryButtonStyle}
            >
              {creatingDeveloperAccess ? <Loader2 size={15} className="animate-spin" /> : <ShieldPlus size={15} />}
              Create developer access
            </button>

            <div className="rounded-[22px] border" style={{ borderColor: 'var(--border)' }}>
              <div className="border-b px-4 py-3 text-[13px] font-semibold" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                Existing app accounts
              </div>
              <div className="px-4 py-3">
                {loadingUsers ? (
                  <div className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                    <Loader2 size={14} className="animate-spin" />
                    Loading accounts…
                  </div>
                ) : appUsers.length === 0 ? (
                  <div className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                    No app users found yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {appUsers.map((account) => (
                      <div
                        key={account.username}
                        className="flex items-center justify-between rounded-[16px] px-3 py-2"
                        style={{ background: 'var(--bg-tertiary)' }}
                      >
                        <div>
                          <div className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {account.displayName}
                          </div>
                          <div className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                            @{account.username} {account.developerAccountId ? `• ${account.developerAccountId}` : '• manager'}
                          </div>
                        </div>
                        <span
                          className="rounded-full px-2 py-1 text-[10px] font-semibold uppercase"
                          style={{
                            background: account.role === 'manager' ? 'rgba(245, 158, 11, 0.14)' : 'rgba(6, 182, 212, 0.14)',
                            color: account.role === 'manager' ? 'var(--warning)' : 'var(--accent)',
                          }}
                        >
                          {account.role}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <FooterActions
              secondaryLabel="Back"
              secondaryIcon={ArrowLeft}
              onSecondary={() => goToStep('team-members')}
              tertiaryLabel="Skip for now"
              onTertiary={handleFinish}
              primaryLabel="Finish and sync"
              primaryIcon={ArrowRight}
              primaryDisabled={triggerSync.isPending}
              onPrimary={handleFinish}
            />
          </div>
        );
      case 'syncing':
        return (
          <div className="flex min-h-[320px] items-center justify-center">
            <div className="text-center">
              <Loader2 size={32} className="mx-auto animate-spin" style={{ color: 'var(--accent)' }} />
              <h2 className="mt-6 text-[22px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                Syncing the initial workspace
              </h2>
              <p className="mt-3 text-[14px] leading-7" style={{ color: 'var(--text-secondary)' }}>
                Jira data is being pulled into the manager surface. This usually takes a moment.
              </p>
            </div>
          </div>
        );
    }
  })();

  const activeStepKey: Exclude<WizardStep, 'syncing'> = step === 'syncing' ? 'developer-access' : step;
  const activeStepMeta = STEP_COPY[activeStepKey];

  return (
    <div
      className="min-h-full overflow-y-auto px-4 py-6 md:px-8 md:py-8"
      style={{
        background:
          'radial-gradient(circle at top left, rgba(245, 158, 11, 0.12), transparent 28%), radial-gradient(circle at bottom right, rgba(6, 182, 212, 0.12), transparent 30%), var(--bg-canvas)',
      }}
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[12px] font-semibold transition-colors"
            style={{
              background: 'color-mix(in srgb, var(--bg-primary) 88%, transparent)',
              color: 'var(--text-primary)',
              borderColor: 'var(--border-strong)',
            }}
            aria-label="Toggle theme"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="grid gap-6 lg:grid-cols-[0.88fr_1.12fr]"
        >
          <aside
            className="rounded-[32px] border px-6 py-7 md:px-8 md:py-9"
            style={{
              borderColor: 'var(--border-strong)',
              background: 'linear-gradient(160deg, color-mix(in srgb, var(--bg-secondary) 92%, var(--warning) 8%), color-mix(in srgb, var(--bg-primary) 86%, var(--bg-secondary) 14%))',
              color: 'var(--text-primary)',
              boxShadow: 'var(--panel-shadow)',
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-[20px]"
                style={{ background: 'rgba(245, 158, 11, 0.14)', color: '#fbbf24' }}
              >
                <BriefcaseBusiness size={24} />
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.28em]" style={{ color: '#fbbf24' }}>
                  First-Run Bootstrap
                </div>
                <div className="mt-1 text-[14px]" style={{ color: 'var(--text-secondary)' }}>Manager-first onboarding</div>
              </div>
            </div>

            <h1 className="mt-10 text-[34px] font-semibold leading-[1.02] md:text-[42px]">
              Build the manager surface in the right order.
            </h1>
            <p className="mt-4 text-[14px] leading-7" style={{ color: 'var(--text-secondary)' }}>
              App identity comes first. Jira connection comes second. Team scope and developer access only happen after
              those two foundations are in place.
            </p>

            <div className="mt-10 space-y-3">
              {STEP_ORDER.map((stepKey, index) => {
                const meta = STEP_COPY[stepKey];
                const Icon = meta.icon;
                const isActive = stepKey === activeStepKey;
                const isComplete = index < currentStepIndex;

                return (
                  <div
                    key={stepKey}
                    className="rounded-[22px] border px-4 py-4"
                    style={{
                      borderColor: isActive ? 'rgba(251, 191, 36, 0.36)' : 'rgba(148, 163, 184, 0.22)',
                      background: isActive ? 'rgba(251, 191, 36, 0.08)' : 'rgba(15, 23, 42, 0.28)',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-semibold"
                        style={{
                          background: isComplete ? 'rgba(34, 197, 94, 0.18)' : isActive ? 'rgba(251, 191, 36, 0.18)' : 'rgba(148, 163, 184, 0.14)',
                          color: isComplete ? '#4ade80' : isActive ? '#fbbf24' : '#cbd5e1',
                        }}
                      >
                        {isComplete ? <CheckCircle2 size={16} /> : meta.label}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-[13px] font-semibold">
                          <Icon size={14} />
                          {meta.title}
                        </div>
                        <p className="mt-1 text-[12px] leading-6" style={{ color: 'var(--text-secondary)' }}>{meta.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

          <section
            className="rounded-[32px] border px-6 py-7 md:px-8 md:py-9"
            style={{
              borderColor: 'var(--border-strong)',
              background: 'color-mix(in srgb, var(--bg-primary) 95%, transparent)',
              boxShadow: 'var(--panel-shadow)',
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[12px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--warning)' }}>
                  Step {STEP_COPY[activeStepKey].label}
                </div>
                <h2 className="mt-3 text-[28px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {activeStepMeta.title}
                </h2>
                <p className="mt-3 max-w-2xl text-[14px] leading-7" style={{ color: 'var(--text-secondary)' }}>
                  {activeStepMeta.description}
                </p>
              </div>
            </div>

            {errorMessage && (
              <div
                className="mt-6 rounded-[20px] border px-4 py-3 text-[13px]"
                style={{
                  borderColor: 'rgba(239, 68, 68, 0.35)',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#fca5a5',
                }}
              >
                {errorMessage}
              </div>
            )}

            <div className="mt-8">{stepContent}</div>
          </section>
        </motion.div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      {children}
    </label>
  );
}

function FooterActions({
  secondaryLabel,
  secondaryIcon: SecondaryIcon,
  onSecondary,
  tertiaryLabel,
  onTertiary,
  primaryLabel,
  primaryIcon: PrimaryIcon,
  primaryDisabled,
  onPrimary,
}: {
  secondaryLabel?: string;
  secondaryIcon?: typeof ArrowLeft;
  onSecondary?: () => void;
  tertiaryLabel?: string;
  onTertiary?: () => void;
  primaryLabel: string;
  primaryIcon: typeof ArrowRight | typeof Loader2;
  primaryDisabled?: boolean;
  onPrimary: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
      <div className="flex flex-wrap items-center gap-3">
        {secondaryLabel && onSecondary && SecondaryIcon && (
          <button onClick={onSecondary} className={secondaryButtonClassName} style={secondaryButtonStyle}>
            <SecondaryIcon size={15} />
            {secondaryLabel}
          </button>
        )}
        {tertiaryLabel && onTertiary && (
          <button
            onClick={onTertiary}
            className="rounded-[18px] px-4 py-3 text-[13px] font-semibold transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            {tertiaryLabel}
          </button>
        )}
      </div>
      <button onClick={onPrimary} disabled={primaryDisabled} className={primaryButtonClassName} style={primaryButtonStyle}>
        <PrimaryIcon size={15} className={PrimaryIcon === Loader2 ? 'animate-spin' : undefined} />
        {primaryLabel}
      </button>
    </div>
  );
}

const fieldClassName = 'w-full rounded-[18px] border px-4 py-3 text-[14px] outline-none transition-colors';
const fieldStyle = {
  background: 'var(--bg-tertiary)',
  color: 'var(--text-primary)',
  borderColor: 'var(--border)',
};

const primaryButtonClassName = 'inline-flex items-center justify-center gap-2 rounded-[18px] px-4 py-3 text-[13px] font-semibold transition-all disabled:opacity-50';
const primaryButtonStyle = {
  background: 'linear-gradient(135deg, var(--warning), #facc15)',
  color: '#111827',
};

const secondaryButtonClassName = 'inline-flex items-center justify-center gap-2 rounded-[18px] px-4 py-3 text-[13px] font-semibold transition-colors disabled:opacity-50';
const secondaryButtonStyle = {
  background: 'var(--bg-tertiary)',
  color: 'var(--text-primary)',
  border: '1px solid var(--border)',
};

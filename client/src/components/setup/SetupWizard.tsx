import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle, XCircle, Search, UserCheck, UserX } from 'lucide-react';
import { api } from '@/lib/api';
import { useTriggerSync } from '@/hooks/useTriggerSync';

interface DiscoveredUser {
  accountId: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
}

interface SetupWizardProps {
  onComplete: () => void;
}

type WizardStep = 'connect' | 'team' | 'syncing';

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const [step, setStep] = useState<WizardStep>('connect');
  const [jiraUrl, setJiraUrl] = useState('');
  const [email, setEmail] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [projectKey, setProjectKey] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [saving, setSaving] = useState(false);

  // Team selection state
  const [discoveredUsers, setDiscoveredUsers] = useState<DiscoveredUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [discovering, setDiscovering] = useState(false);
  const [savingTeam, setSavingTeam] = useState(false);

  const triggerSync = useTriggerSync();

  const handleTest = async () => {
    setTestStatus('testing');
    setErrorMessage('');
    try {
      await api.post('/config/test', { jiraBaseUrl: jiraUrl, jiraEmail: email, jiraApiToken: apiToken, jiraProjectKey: projectKey });
      setTestStatus('success');
    } catch (err) {
      setTestStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Connection failed');
    }
  };

  const handleSaveAndDiscover = async () => {
    setSaving(true);
    setErrorMessage('');
    try {
      await api.put('/config', { jiraBaseUrl: jiraUrl, jiraEmail: email, jiraApiToken: apiToken, jiraProjectKey: projectKey });
      setDiscovering(true);
      try {
        const res = await api.get<{ users: DiscoveredUser[] }>('/team/discover');
        setDiscoveredUsers(res.users);
        setSelectedUsers(new Set(res.users.map((u) => u.accountId)));
      } catch {
        // Discovery may fail but config is saved, still allow proceeding
        setDiscoveredUsers([]);
      }
      setDiscovering(false);
      setStep('team');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = async () => {
    setSavingTeam(true);
    try {
      const devs = discoveredUsers.filter((u) => selectedUsers.has(u.accountId));
      if (devs.length > 0) {
        await api.post('/team/developers', { developers: devs });
      }
      setStep('syncing');
      triggerSync.mutate(undefined, {
        onSettled: () => {
          onComplete();
        },
      });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save team');
      setSavingTeam(false);
    }
  };

  const toggleUser = (accountId: string) => {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(accountId)) next.delete(accountId);
      else next.add(accountId);
      return next;
    });
  };

  const selectAll = () => setSelectedUsers(new Set(filteredUsers.map((u) => u.accountId)));
  const deselectAll = () => setSelectedUsers(new Set());

  const filteredUsers = discoveredUsers.filter(
    (u) =>
      u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  const isFormValid = jiraUrl && email && apiToken && projectKey;

  if (step === 'syncing') {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent)' }} />
          <span className="text-[14px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            Syncing from Jira…
          </span>
        </motion.div>
      </div>
    );
  }

  if (step === 'team') {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-lg rounded-xl p-8"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
        >
          <h1 className="text-[18px] font-semibold text-center mb-2" style={{ color: 'var(--text-primary)' }}>
            Select Team Members
          </h1>
          <p className="text-[14px] text-center mb-4" style={{ color: 'var(--text-secondary)' }}>
            Choose the developers to track in the dashboard.
          </p>

          {discovering ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent)' }} />
              <span className="ml-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>Discovering users…</span>
            </div>
          ) : discoveredUsers.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-[13px] mb-4" style={{ color: 'var(--text-secondary)' }}>
                No assignable users found. You can add team members later.
              </p>
            </div>
          ) : (
            <>
              {/* Search & bulk actions */}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search…"
                    className="w-full pl-8 pr-3 py-1.5 rounded-md text-[13px] focus:outline-none focus:ring-1"
                    style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                  />
                </div>
                <button onClick={selectAll} className="text-[11px] px-2 py-1 rounded" style={{ color: 'var(--accent)' }}>All</button>
                <button onClick={deselectAll} className="text-[11px] px-2 py-1 rounded" style={{ color: 'var(--text-muted)' }}>None</button>
              </div>

              {/* User list */}
              <div className="max-h-[300px] overflow-y-auto flex flex-col gap-1 mb-4" style={{ border: '1px solid var(--border)', borderRadius: '0.5rem' }}>
                {filteredUsers.map((user) => {
                  const isSelected = selectedUsers.has(user.accountId);
                  return (
                    <button
                      key={user.accountId}
                      onClick={() => toggleUser(user.accountId)}
                      className="flex items-center gap-3 px-3 py-2 transition-colors text-left w-full"
                      style={{
                        background: isSelected ? 'rgba(99,102,241,0.08)' : 'transparent',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      {isSelected ? (
                        <UserCheck size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                      ) : (
                        <UserX size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="text-[13px] font-medium block truncate" style={{ color: 'var(--text-primary)' }}>
                          {user.displayName}
                        </span>
                        {user.email && (
                          <span className="text-[11px] block truncate" style={{ color: 'var(--text-muted)' }}>
                            {user.email}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <span className="text-[12px] block mb-3" style={{ color: 'var(--text-muted)' }}>
                {selectedUsers.size} of {discoveredUsers.length} selected
              </span>
            </>
          )}

          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 p-2 rounded-md text-[12px] mb-3"
                style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)' }}
              >
                <XCircle size={14} />
                {errorMessage}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('connect')}
              className="flex-1 py-2 rounded-md text-[13px] font-semibold transition-all"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            >
              ◂ Back
            </button>
            <button
              onClick={handleFinish}
              disabled={savingTeam}
              className="flex-1 py-2 rounded-md text-[13px] font-semibold transition-all disabled:opacity-50"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              {savingTeam ? 'Saving…' : 'Finish & Sync ▸'}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Step: connect
  return (
    <div className="h-full flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md rounded-xl p-8"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
      >
        <h1 className="text-[18px] font-semibold text-center mb-1" style={{ color: 'var(--text-primary)' }}>
          Welcome to Defect
        </h1>
        <h1 className="text-[18px] font-semibold text-center mb-6" style={{ color: 'var(--text-primary)' }}>
          Command Center
        </h1>
        <p className="text-[14px] text-center mb-6" style={{ color: 'var(--text-secondary)' }}>
          Let's connect to Jira.
        </p>

        <div className="flex flex-col gap-4">
          <InputField label="Jira Instance URL" placeholder="https://your-domain.atlassian.net" value={jiraUrl} onChange={setJiraUrl} />
          <InputField label="Email" placeholder="you@company.com" type="email" value={email} onChange={setEmail} />
          <div>
            <InputField label="API Token" placeholder="••••••••" type="password" value={apiToken} onChange={setApiToken} />
            <a
              href="https://id.atlassian.com/manage/api-tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] mt-1 inline-block"
              style={{ color: 'var(--accent)' }}
            >
              ℹ Create API token at id.atlassian.com
            </a>
          </div>
          <InputField label="Project Key" placeholder="PROJ" value={projectKey} onChange={setProjectKey} />

          <AnimatePresence>
            {testStatus === 'error' && errorMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 p-2 rounded-md text-[12px]"
                style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)' }}
              >
                <XCircle size={14} />
                {errorMessage}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-3 mt-2">
            <button
              onClick={handleTest}
              disabled={!isFormValid || testStatus === 'testing'}
              className="flex-1 py-2 rounded-md text-[13px] font-semibold transition-all disabled:opacity-50"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            >
              {testStatus === 'testing' ? (
                <span className="flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" /> Testing…</span>
              ) : testStatus === 'success' ? (
                <span className="flex items-center justify-center gap-2"><CheckCircle size={14} style={{ color: 'var(--success)' }} /> Connected</span>
              ) : (
                'Test Connection'
              )}
            </button>

            {testStatus === 'success' && (
              <motion.button
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={handleSaveAndDiscover}
                disabled={saving}
                className="flex-1 py-2 rounded-md text-[13px] font-semibold transition-all disabled:opacity-50"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                {saving ? 'Saving…' : 'Next: Select Team ▸'}
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function InputField({
  label,
  placeholder,
  type = 'text',
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[12px] font-medium" style={{ color: 'var(--text-muted)' }}>
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 rounded-md text-[13px] focus:outline-none focus:ring-1"
        style={{
          background: 'var(--bg-tertiary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)',
          outlineColor: 'var(--accent)',
        }}
      />
    </div>
  );
}

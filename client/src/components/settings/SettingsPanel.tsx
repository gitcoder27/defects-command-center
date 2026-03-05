import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, RefreshCw, Search, AlertTriangle } from 'lucide-react';
import { useConfig } from '@/hooks/useConfig';
import { useTriggerSync } from '@/hooks/useTriggerSync';
import { useToast } from '@/context/ToastContext';
import { api } from '@/lib/api';

interface JiraField {
  id: string;
  name: string;
  custom: boolean;
}

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const { data: config, refetch: refetchConfig } = useConfig();
  const triggerSync = useTriggerSync();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [jql, setJql] = useState('');
  const [devDueDateField, setDevDueDateField] = useState('');
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [fields, setFields] = useState<JiraField[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);
  const [fieldSearch, setFieldSearch] = useState('');
  const [showFieldPicker, setShowFieldPicker] = useState(false);

  useEffect(() => {
    if (config) {
      setJql(config.jiraSyncJql || '');
      setDevDueDateField(config.jiraDevDueDateField || 'customfield_10128');
    }
  }, [config]);

  const handleDiscoverFields = useCallback(async () => {
    setLoadingFields(true);
    try {
      const res = await api.get<{ fields: JiraField[] }>('/config/fields');
      setFields(res.fields);
      setShowFieldPicker(true);
    } catch (err) {
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

  const dueDateFields = filteredFields.filter(
    (f) =>
      f.custom &&
      (f.name.toLowerCase().includes('due') ||
        f.name.toLowerCase().includes('date') ||
        f.id === devDueDateField)
  );

  const otherFields = filteredFields.filter(
    (f) => f.custom && !dueDateFields.includes(f)
  );

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
                  The JQL query used to fetch defects from Jira. Changes take effect on the next sync.
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

              {/* Dev Due Date Field */}
              <div>
                <label
                  className="text-[11px] font-semibold uppercase mb-2 block"
                  style={{ letterSpacing: '0.06em', color: 'var(--text-muted)' }}
                >
                  Development Due Date Field
                </label>
                <p className="text-[12px] mb-2" style={{ color: 'var(--text-secondary)' }}>
                  The Jira custom field ID used for the development due date (e.g. <code className="text-[11px]" style={{ color: 'var(--accent)' }}>customfield_10128</code>).
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={devDueDateField}
                    onChange={(e) => setDevDueDateField(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-md text-[13px] font-mono focus:outline-none focus:ring-1"
                    style={{
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border)',
                      outlineColor: 'var(--accent)',
                    }}
                    placeholder="customfield_10128"
                  />
                  <button
                    onClick={handleDiscoverFields}
                    disabled={loadingFields}
                    className="px-3 py-2 rounded-md text-[12px] font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    style={{
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border)',
                    }}
                    title="Discover custom fields from Jira"
                  >
                    {loadingFields ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Search size={14} />
                    )}
                    Discover
                  </button>
                </div>

                {/* Field picker */}
                {showFieldPicker && fields.length > 0 && (
                  <div
                    className="mt-3 rounded-md overflow-hidden"
                    style={{ border: '1px solid var(--border)', background: 'var(--bg-tertiary)' }}
                  >
                    <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                      <input
                        type="text"
                        value={fieldSearch}
                        onChange={(e) => setFieldSearch(e.target.value)}
                        placeholder="Search fields..."
                        className="w-full text-[12px] px-2 py-1.5 rounded focus:outline-none focus:ring-1"
                        style={{
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border)',
                          outlineColor: 'var(--accent)',
                        }}
                      />
                    </div>

                    <div className="max-h-[240px] overflow-y-auto">
                      {dueDateFields.length > 0 && (
                        <>
                          <div
                            className="px-3 py-1.5 text-[10px] font-semibold uppercase"
                            style={{ color: 'var(--accent)', letterSpacing: '0.06em', background: 'var(--bg-secondary)' }}
                          >
                            Date Fields (likely matches)
                          </div>
                          {dueDateFields.map((f) => (
                            <button
                              key={f.id}
                              onClick={() => {
                                setDevDueDateField(f.id);
                                setShowFieldPicker(false);
                              }}
                              className="w-full text-left px-3 py-2 flex items-center justify-between hover:bg-[var(--bg-secondary)] transition-colors"
                              style={{
                                borderBottom: '1px solid var(--border)',
                                background: f.id === devDueDateField ? 'rgba(99,102,241,0.1)' : undefined,
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
                              {f.id === devDueDateField && (
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
                              onClick={() => {
                                setDevDueDateField(f.id);
                                setShowFieldPicker(false);
                              }}
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
                    </div>

                    <button
                      onClick={() => setShowFieldPicker(false)}
                      className="w-full text-center text-[11px] py-1.5 font-medium transition-colors hover:bg-[var(--bg-secondary)]"
                      style={{ borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}
                    >
                      Close
                    </button>
                  </div>
                )}
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
                the dashboard configuration. Click <strong>"Save & Sync"</strong> to apply the new JQL
                immediately and trigger a fresh sync from Jira.
              </div>
            </div>

            {/* Footer */}
            <div
              className="flex items-center justify-end gap-3 px-6 py-4 border-t"
              style={{ borderColor: 'var(--border)' }}
            >
              <button
                onClick={handleResetConfig}
                disabled={saving || triggerSync.isPending || resetting}
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
                disabled={saving}
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
                disabled={saving || triggerSync.isPending}
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

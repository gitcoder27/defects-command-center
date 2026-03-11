import { useState, useMemo, useCallback } from 'react';
import { Plus, Check, Users } from 'lucide-react';
import type { Developer } from '@/types';

interface TrackerIssueAssignment {
  itemId: number;
  date: string;
  jiraKey: string;
  title: string;
  state: 'planned' | 'in_progress' | 'done' | 'dropped';
  developer: { accountId: string; displayName: string; isActive: boolean };
}

interface TriageTrackerSectionProps {
  issueKey: string;
  issueAssigneeId?: string;
  developers: Developer[];
  assignments: TrackerIssueAssignment[];
  trackerDate: string;
  firstLinkedAccountId?: string;
  onAdd: (accountId: string, title: string) => void;
  isAdding: boolean;
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

function stateLabel(state: TrackerIssueAssignment['state']): string {
  switch (state) {
    case 'in_progress': return 'Active';
    case 'done': return 'Done';
    case 'dropped': return 'Dropped';
    default: return 'Planned';
  }
}

export function TriageTrackerSection({
  issueKey,
  issueAssigneeId,
  developers,
  assignments,
  trackerDate,
  firstLinkedAccountId,
  onAdd,
  isAdding,
}: TriageTrackerSectionProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [addedAccountId, setAddedAccountId] = useState<string>();

  const selectedAccountId = useMemo(() => {
    if (issueAssigneeId && developers.some((d) => d.accountId === issueAssigneeId)) return issueAssigneeId;
    if (firstLinkedAccountId && developers.some((d) => d.accountId === firstLinkedAccountId)) return firstLinkedAccountId;
    return developers[0]?.accountId;
  }, [developers, issueAssigneeId, firstLinkedAccountId]);

  const [accountId, setAccountId] = useState<string | undefined>(selectedAccountId);
  const currentAccountId = accountId ?? selectedAccountId;
  const selectedDev = developers.find((d) => d.accountId === currentAccountId);

  const handleAdd = useCallback(() => {
    if (!currentAccountId || !taskTitle.trim()) return;
    onAdd(currentAccountId, taskTitle.trim());
    setAddedAccountId(currentAccountId);
    setTaskTitle('');
  }, [currentAccountId, taskTitle, onAdd]);

  if (!developers.length) {
    return (
      <div className="triage-section">
        <span className="triage-section-label"><Users size={11} /> Team Tracker</span>
        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>No team members available.</span>
      </div>
    );
  }

  return (
    <div className="triage-section">
      <button
        type="button"
        onClick={() => setCollapsed((p) => !p)}
        className="flex items-center justify-between w-full group"
      >
        <span className="triage-section-label">
          <Users size={11} /> Team Tracker
        </span>
        <div className="flex items-center gap-2">
          {assignments.length > 0 && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
              style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>
              {assignments.length} linked
            </span>
          )}
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {collapsed ? '+' : '−'}
          </span>
        </div>
      </button>

      {!collapsed && (
        <div className="mt-2 space-y-2">
          <div className="flex gap-1.5">
            <input
              id="tracker-task-title"
              type="text"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
              placeholder="Task description…"
              aria-label="Task"
              className="flex-1 rounded-md px-2.5 py-1.5 text-[11.5px] outline-none transition-colors"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
              }}
            />
          </div>

          <div className="flex flex-wrap gap-1">
            {developers.map((dev) => {
              const isSelected = currentAccountId === dev.accountId;
              const isAssigned = issueAssigneeId === dev.accountId;
              const wasAdded = addedAccountId === dev.accountId;
              const linkedCount = assignments.filter((a) => a.developer.accountId === dev.accountId).length;

              return (
                <button
                  key={dev.accountId}
                  type="button"
                  onClick={() => setAccountId(dev.accountId)}
                  aria-pressed={isSelected}
                  className="rounded-full px-2 py-1 text-[11px] font-medium transition-colors"
                  style={{
                    background: isSelected ? 'var(--accent-glow)' : 'transparent',
                    color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
                    border: `1px solid ${isSelected ? 'var(--border-active)' : 'var(--border)'}`,
                  }}
                >
                  <span className="inline-flex items-center gap-1">
                    {wasAdded && <Check size={10} />}
                    {dev.displayName}
                    {isAssigned && (
                      <span className="text-[9px] opacity-60">Assigned</span>
                    )}
                    {linkedCount > 0 && (
                      <span className="text-[9px] opacity-60">{linkedCount} linked</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {assignments.length > 0 && (
            <div className="rounded-md px-2 py-1.5 space-y-0.5" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
              <div className="text-[9px] font-semibold uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                Linked Today
              </div>
              {assignments.map((a) => (
                <div key={a.itemId} className="text-[10.5px]" style={{ color: 'var(--text-secondary)' }}>
                  {a.developer.displayName} · {stateLabel(a.state)} · {a.title}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-[10.5px]" style={{ color: 'var(--text-muted)' }}>
              {selectedDev
                ? assignments.length > 0
                  ? `${assignments.length} linked task${assignments.length === 1 ? '' : 's'} on ${issueKey}`
                  : `${selectedDev.displayName} for ${trackerDate}`
                : 'Choose a developer'}
            </span>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!selectedDev || isAdding || !taskTitle.trim()}
              className="rounded-md px-2.5 py-1 text-[11px] font-medium disabled:opacity-30 transition-colors"
              style={{
                background: 'var(--accent-glow)',
                color: 'var(--accent)',
                border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)',
              }}
            >
              {isAdding
                ? 'Adding…'
                : selectedDev
                  ? `Add Task to ${firstName(selectedDev.displayName)}`
                  : 'Add to Team Tracker'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

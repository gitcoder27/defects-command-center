import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Trash2,
  CheckCircle2,
  XCircle,
  Link2,
  Plus,
  Search,
  ExternalLink,
  UserCircle,
  Bug,
  Users,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useAddManagerDeskLink, useRemoveManagerDeskLink, useManagerDeskIssueLookup, useManagerDeskDeveloperLookup } from '@/hooks/useManagerDesk';
import type {
  ManagerDeskItem,
  ManagerDeskItemKind,
  ManagerDeskCategory,
  ManagerDeskStatus,
  ManagerDeskPriority,
  ManagerDeskUpdateItemPayload,
} from '@/types/manager-desk';
import { KIND_LABELS, CATEGORY_LABELS, STATUS_LABELS, PRIORITY_LABELS } from '@/types/manager-desk';

interface Props {
  item: ManagerDeskItem | null;
  open: boolean;
  date: string;
  onClose: () => void;
  onUpdate: (itemId: number, updates: Record<string, unknown>) => void;
  onDelete: (itemId: number) => void;
}

export function ItemDetailDrawer({ item, open, date, onClose, onUpdate, onDelete }: Props) {
  if (!item) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-lg z-50 flex flex-col overflow-hidden"
            style={{
              background: 'var(--bg-primary)',
              borderLeft: '1px solid var(--border)',
              boxShadow: '-20px 0 60px rgba(0,0,0,0.3)',
            }}
          >
            <DrawerContent
              item={item}
              date={date}
              onClose={onClose}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function DrawerContent({
  item,
  date,
  onClose,
  onUpdate,
  onDelete,
}: {
  item: ManagerDeskItem;
  date: string;
  onClose: () => void;
  onUpdate: (itemId: number, updates: Record<string, unknown>) => void;
  onDelete: (itemId: number) => void;
}) {
  const addLink = useAddManagerDeskLink(date);
  const removeLink = useRemoveManagerDeskLink(date);

  const [editTitle, setEditTitle] = useState(item.title);
  const [showLinkSearch, setShowLinkSearch] = useState<'issue' | 'developer' | 'external' | null>(null);

  // Sync title when item changes
  useEffect(() => { setEditTitle(item.title); }, [item.title]);

  const commitTitle = useCallback(() => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== item.title) {
      onUpdate(item.id, { title: trimmed });
    }
  }, [editTitle, item.title, item.id, onUpdate]);

  const handleFieldChange = useCallback(
    (field: keyof ManagerDeskUpdateItemPayload, value: string) => {
      onUpdate(item.id, { [field]: value || undefined });
    },
    [item.id, onUpdate],
  );

  const handleDeleteLink = useCallback(
    (linkId: number) => {
      removeLink.mutate({ itemId: item.id, linkId });
    },
    [removeLink, item.id],
  );

  const isDone = item.status === 'done' || item.status === 'cancelled';

  return (
    <>
      {/* Header */}
      <div
        className="shrink-0 flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: 'var(--md-accent)' }}
          >
            Item Detail
          </span>
          <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
            #{item.id}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onDelete(item.id)}
            className="h-7 w-7 rounded-lg flex items-center justify-center transition-colors hover:opacity-80"
            style={{ color: 'var(--danger)' }}
            title="Delete item"
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-4 space-y-4">
          {/* Title (editable inline) */}
          <div>
            <input
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={e => e.key === 'Enter' && commitTitle()}
              className="w-full bg-transparent text-[17px] font-semibold outline-none"
              style={{ color: 'var(--text-primary)', caretColor: 'var(--md-accent)' }}
              maxLength={200}
            />
          </div>

          {/* Status quick actions */}
          <div className="flex flex-wrap gap-1.5">
            {!isDone && (
              <button
                onClick={() => onUpdate(item.id, { status: 'done' })}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all"
                style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.25)' }}
              >
                <CheckCircle2 size={12} /> Mark Done
              </button>
            )}
            {!isDone && (
              <button
                onClick={() => onUpdate(item.id, { status: 'cancelled' })}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
              >
                <XCircle size={12} /> Cancel
              </button>
            )}
            {isDone && (
              <button
                onClick={() => onUpdate(item.id, { status: 'planned' })}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
              >
                Reopen
              </button>
            )}
          </div>

          {/* Grid of selects */}
          <div className="grid grid-cols-2 gap-2">
            <FieldSelect
              label="Kind"
              value={item.kind}
              options={(['action', 'meeting', 'decision', 'waiting'] as const).map(v => ({ value: v, label: KIND_LABELS[v] }))}
              onChange={v => handleFieldChange('kind', v)}
            />
            <FieldSelect
              label="Status"
              value={item.status}
              options={(['inbox', 'planned', 'in_progress', 'waiting', 'done', 'cancelled'] as const).map(v => ({ value: v, label: STATUS_LABELS[v] }))}
              onChange={v => handleFieldChange('status', v)}
            />
            <FieldSelect
              label="Category"
              value={item.category}
              options={(['analysis', 'design', 'team_management', 'cross_team', 'follow_up', 'escalation', 'admin', 'planning', 'other'] as const).map(v => ({ value: v, label: CATEGORY_LABELS[v] }))}
              onChange={v => handleFieldChange('category', v)}
            />
            <FieldSelect
              label="Priority"
              value={item.priority}
              options={(['low', 'medium', 'high', 'critical'] as const).map(v => ({ value: v, label: PRIORITY_LABELS[v] }))}
              onChange={v => handleFieldChange('priority', v)}
            />
          </div>

          {/* Participants */}
          <FieldText
            label="Participants"
            value={item.participants ?? ''}
            placeholder="e.g. Onshore Design Team, Rahul"
            onChange={v => handleFieldChange('participants', v)}
          />

          {/* Time */}
          <div className="grid grid-cols-2 gap-2">
            <FieldDatetime
              label="Start Time"
              value={item.plannedStartAt ?? ''}
              onChange={v => handleFieldChange('plannedStartAt', v)}
            />
            <FieldDatetime
              label="End Time"
              value={item.plannedEndAt ?? ''}
              onChange={v => handleFieldChange('plannedEndAt', v)}
            />
          </div>

          <FieldDatetime
            label="Follow-Up"
            value={item.followUpAt ?? ''}
            onChange={v => handleFieldChange('followUpAt', v)}
          />

          {/* Text areas */}
          <FieldTextArea
            label="Context / Notes"
            value={item.contextNote ?? ''}
            placeholder="Agenda, background, key context…"
            onChange={v => handleFieldChange('contextNote', v)}
          />

          <FieldTextArea
            label="Next Action"
            value={item.nextAction ?? ''}
            placeholder="What needs to happen next?"
            onChange={v => handleFieldChange('nextAction', v)}
          />

          <FieldTextArea
            label="Outcome"
            value={item.outcome ?? ''}
            placeholder="What was the result or decision?"
            onChange={v => handleFieldChange('outcome', v)}
          />

          {/* ── Links ────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: 'var(--text-muted)' }}
              >
                <Link2 size={10} className="inline mr-1" />
                Linked Context
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowLinkSearch('issue')}
                  className="rounded-md px-2 py-0.5 text-[10px] font-medium transition-all"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                >
                  <Bug size={9} className="inline mr-0.5" /> Issue
                </button>
                <button
                  onClick={() => setShowLinkSearch('developer')}
                  className="rounded-md px-2 py-0.5 text-[10px] font-medium transition-all"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                >
                  <UserCircle size={9} className="inline mr-0.5" /> Developer
                </button>
                <button
                  onClick={() => setShowLinkSearch('external')}
                  className="rounded-md px-2 py-0.5 text-[10px] font-medium transition-all"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                >
                  <Users size={9} className="inline mr-0.5" /> External
                </button>
              </div>
            </div>

            {/* Existing links */}
            {item.links.length > 0 && (
              <div className="space-y-1 mb-2">
                {item.links.map(link => (
                  <div
                    key={link.id}
                    className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 group"
                    style={{ background: 'var(--bg-tertiary)' }}
                  >
                    {link.linkType === 'issue' && <Bug size={11} style={{ color: 'var(--accent)' }} />}
                    {link.linkType === 'developer' && <UserCircle size={11} style={{ color: 'var(--info)' }} />}
                    {link.linkType === 'external_group' && <Users size={11} style={{ color: 'var(--text-secondary)' }} />}
                    <span className="text-[12px] font-medium flex-1 truncate" style={{ color: 'var(--text-primary)' }}>
                      {link.displayLabel}
                    </span>
                    <button
                      onClick={() => handleDeleteLink(link.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Link search */}
            {showLinkSearch && (
              <LinkSearchPanel
                type={showLinkSearch}
                itemId={item.id}
                date={date}
                onClose={() => setShowLinkSearch(null)}
                addLink={addLink}
              />
            )}
          </div>

          {/* Timestamps */}
          <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
            <div className="text-[10px] space-y-0.5" style={{ color: 'var(--text-muted)' }}>
              <div>Created {formatSafe(item.createdAt)}</div>
              <div>Updated {formatSafe(item.updatedAt)}</div>
              {item.completedAt && <div>Completed {formatSafe(item.completedAt)}</div>}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Field components ──────────────────────────────────

function FieldSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-widest block mb-1" style={{ color: 'var(--text-muted)' }}>
        {label}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg px-2.5 py-1.5 text-[12px] font-medium outline-none cursor-pointer"
        style={{
          background: 'var(--bg-tertiary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)',
        }}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

function FieldText({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => { setLocal(value); }, [value]);

  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-widest block mb-1" style={{ color: 'var(--text-muted)' }}>
        {label}
      </label>
      <input
        type="text"
        value={local}
        onChange={e => setLocal(e.target.value)}
        onBlur={() => {
          if (local !== value) onChange(local);
        }}
        placeholder={placeholder}
        className="w-full rounded-lg px-2.5 py-1.5 text-[12px] outline-none"
        style={{
          background: 'var(--bg-tertiary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)',
        }}
      />
    </div>
  );
}

function FieldDatetime({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const localValue = value ? value.slice(0, 16) : '';

  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-widest block mb-1" style={{ color: 'var(--text-muted)' }}>
        {label}
      </label>
      <input
        type="datetime-local"
        value={localValue}
        onChange={e => {
          const val = e.target.value;
          onChange(val ? new Date(val).toISOString() : '');
        }}
        className="w-full rounded-lg px-2.5 py-1.5 text-[12px] outline-none"
        style={{
          background: 'var(--bg-tertiary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)',
          colorScheme: 'dark',
        }}
      />
    </div>
  );
}

function FieldTextArea({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => { setLocal(value); }, [value]);

  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-widest block mb-1" style={{ color: 'var(--text-muted)' }}>
        {label}
      </label>
      <textarea
        value={local}
        onChange={e => setLocal(e.target.value)}
        onBlur={() => {
          if (local !== value) onChange(local);
        }}
        placeholder={placeholder}
        rows={3}
        className="w-full rounded-lg px-2.5 py-2 text-[12px] outline-none resize-none"
        style={{
          background: 'var(--bg-tertiary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)',
        }}
      />
    </div>
  );
}

// ── Link search panel ─────────────────────────────────

function LinkSearchPanel({
  type,
  itemId,
  date,
  onClose,
  addLink,
}: {
  type: 'issue' | 'developer' | 'external';
  itemId: number;
  date: string;
  onClose: () => void;
  addLink: ReturnType<typeof useAddManagerDeskLink>;
}) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const { data: issues } = useManagerDeskIssueLookup(query, type === 'issue');
  const { data: devs } = useManagerDeskDeveloperLookup(query, type === 'developer');

  const handleSelectIssue = (jiraKey: string) => {
    addLink.mutate({ itemId, linkType: 'issue', issueKey: jiraKey } as Parameters<typeof addLink.mutate>[0]);
    onClose();
  };

  const handleSelectDeveloper = (accountId: string) => {
    addLink.mutate({ itemId, linkType: 'developer', developerAccountId: accountId } as Parameters<typeof addLink.mutate>[0]);
    onClose();
  };

  const handleAddExternal = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    addLink.mutate({ itemId, linkType: 'external_group', externalLabel: trimmed } as Parameters<typeof addLink.mutate>[0]);
    onClose();
  };

  return (
    <div
      className="rounded-xl overflow-hidden border"
      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--md-accent)' }}
    >
      <div className="flex items-center gap-2 px-2.5 py-2">
        <Search size={12} style={{ color: 'var(--text-muted)' }} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'Enter' && type === 'external') handleAddExternal();
          }}
          placeholder={
            type === 'issue' ? 'Search issues…'
            : type === 'developer' ? 'Search developers…'
            : 'Type external group name and press Enter…'
          }
          className="flex-1 bg-transparent text-[12px] outline-none"
          style={{ color: 'var(--text-primary)' }}
        />
        <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
          <X size={12} />
        </button>
      </div>

      {/* Results */}
      {type === 'issue' && issues && issues.length > 0 && (
        <div className="max-h-40 overflow-y-auto border-t" style={{ borderColor: 'var(--border)' }}>
          {issues.map(issue => (
            <button
              key={issue.jiraKey}
              onClick={() => handleSelectIssue(issue.jiraKey)}
              className="w-full text-left px-3 py-1.5 flex items-center gap-2 transition-colors hover:opacity-80"
              style={{ background: 'transparent' }}
            >
              <span className="text-[11px] font-mono font-bold" style={{ color: 'var(--accent)' }}>
                {issue.jiraKey}
              </span>
              <span className="text-[11px] flex-1 truncate" style={{ color: 'var(--text-secondary)' }}>
                {issue.summary}
              </span>
            </button>
          ))}
        </div>
      )}

      {type === 'developer' && devs && devs.length > 0 && (
        <div className="max-h-40 overflow-y-auto border-t" style={{ borderColor: 'var(--border)' }}>
          {devs.map(dev => (
            <button
              key={dev.accountId}
              onClick={() => handleSelectDeveloper(dev.accountId)}
              className="w-full text-left px-3 py-1.5 flex items-center gap-2 transition-colors hover:opacity-80"
              style={{ background: 'transparent' }}
            >
              <UserCircle size={14} style={{ color: 'var(--info)' }} />
              <span className="text-[11px] font-medium" style={{ color: 'var(--text-primary)' }}>
                {dev.displayName}
              </span>
              {dev.email && (
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {dev.email}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {type === 'external' && query.trim() && (
        <div className="border-t px-3 py-1.5" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={handleAddExternal}
            className="flex items-center gap-1.5 text-[11px] font-medium transition-colors"
            style={{ color: 'var(--md-accent)' }}
          >
            <Plus size={11} /> Add "{query.trim()}"
          </button>
        </div>
      )}
    </div>
  );
}

function formatSafe(iso: string): string {
  try {
    return format(parseISO(iso), 'MMM d, yyyy HH:mm');
  } catch {
    return iso;
  }
}

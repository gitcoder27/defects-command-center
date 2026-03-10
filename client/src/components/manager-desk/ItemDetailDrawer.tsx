import { useState, useCallback, useRef, useEffect, useId, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Trash2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Link2,
  Plus,
  Search,
  UserCircle,
  Bug,
  Users,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import {
  useAddManagerDeskLink,
  useRemoveManagerDeskLink,
  useManagerDeskIssueLookup,
  useManagerDeskDeveloperLookup,
} from '@/hooks/useManagerDesk';
import type {
  ManagerDeskItem,
  ManagerDeskUpdateItemPayload,
} from '@/types/manager-desk';
import {
  KIND_LABELS,
  CATEGORY_LABELS,
  STATUS_LABELS,
  PRIORITY_LABELS,
} from '@/types/manager-desk';

interface Props {
  item: ManagerDeskItem | null;
  open: boolean;
  date: string;
  onClose: () => void;
  onUpdate: (itemId: number, updates: Record<string, unknown>) => void;
  onDelete: (itemId: number) => void;
}

type FieldSaveState = 'idle' | 'dirty' | 'saving' | 'saved';

const sectionSurfaceStyle = {
  background:
    'linear-gradient(180deg, color-mix(in srgb, var(--bg-elevated) 72%, transparent) 0%, color-mix(in srgb, var(--bg-secondary) 88%, transparent) 100%)',
  border: '1px solid var(--border)',
  boxShadow: 'var(--soft-shadow)',
} as const;

export function ItemDetailDrawer({ item, open, date, onClose, onUpdate, onDelete }: Props) {
  if (!item) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(2, 6, 23, 0.46)', backdropFilter: 'blur(3px)' }}
            onClick={onClose}
          />

          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-2xl flex-col overflow-hidden"
            style={{
              background: 'var(--bg-primary)',
              borderLeft: '1px solid var(--border)',
              boxShadow: '-28px 0 72px rgba(15, 23, 42, 0.22)',
            }}
            aria-label="Manager Desk item detail"
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
  const [activeFollowThroughTab, setActiveFollowThroughTab] = useState<'nextAction' | 'outcome'>('nextAction');
  const [collapsedSections, setCollapsedSections] = useState({
    context: false,
    followThrough: true,
    details: false,
    links: false,
  });

  useEffect(() => {
    setEditTitle(item.title);
    setShowLinkSearch(null);
    setActiveFollowThroughTab('nextAction');
    setCollapsedSections({
      context: false,
      followThrough: true,
      details: false,
      links: false,
    });
  }, [item.id, item.title]);

  const toggleSection = useCallback((section: keyof typeof collapsedSections) => {
    setCollapsedSections((current) => ({ ...current, [section]: !current[section] }));
  }, []);

  const commitTitle = useCallback(() => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== item.title) {
      onUpdate(item.id, { title: trimmed });
    }
  }, [editTitle, item.id, item.title, onUpdate]);

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
    [item.id, removeLink],
  );

  const isDone = item.status === 'done' || item.status === 'cancelled';

  return (
    <>
      <div
        className="shrink-0 border-b px-4 pb-4 pt-3 md:px-5"
        style={{
          borderColor: 'var(--border)',
          background:
            'linear-gradient(180deg, color-mix(in srgb, var(--bg-primary) 94%, var(--md-accent-dim) 6%) 0%, color-mix(in srgb, var(--bg-secondary) 88%, transparent) 100%)',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="text-[10px] font-bold uppercase tracking-[0.22em]"
                style={{ color: 'var(--md-accent)' }}
              >
                Item Detail
              </span>
              <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                #{item.id}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <MetaChip label={KIND_LABELS[item.kind]} tone="accent" />
              <MetaChip label={STATUS_LABELS[item.status]} tone={isDone ? 'success' : 'neutral'} />
              <MetaChip label={CATEGORY_LABELS[item.category]} tone="neutral" />
              <MetaChip label={PRIORITY_LABELS[item.priority]} tone={item.priority === 'critical' ? 'danger' : 'neutral'} />
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onDelete(item.id)}
              className="flex h-8 w-8 items-center justify-center rounded-xl transition-colors hover:opacity-80"
              style={{ color: 'var(--danger)' }}
              title="Delete item"
              aria-label="Delete item"
            >
              <Trash2 size={15} />
            </button>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-xl transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              aria-label="Close item detail"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="mt-3">
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => e.key === 'Enter' && commitTitle()}
            className="w-full bg-transparent text-[20px] font-semibold leading-tight outline-none md:text-[22px]"
            style={{ color: 'var(--text-primary)', caretColor: 'var(--md-accent)' }}
            maxLength={200}
            aria-label="Item title"
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {!isDone && (
            <button
              onClick={() => onUpdate(item.id, { status: 'done' })}
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-semibold transition-all"
              style={{
                background: 'rgba(16,185,129,0.12)',
                color: 'var(--success)',
                border: '1px solid rgba(16,185,129,0.24)',
              }}
            >
              <CheckCircle2 size={12} /> Mark Done
            </button>
          )}
          {!isDone && (
            <button
              onClick={() => onUpdate(item.id, { status: 'cancelled' })}
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-semibold transition-all"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-muted)',
                border: '1px solid var(--border)',
              }}
            >
              <XCircle size={12} /> Cancel
            </button>
          )}
          {isDone && (
            <button
              onClick={() => onUpdate(item.id, { status: 'planned' })}
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-semibold transition-all"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
              }}
            >
              Reopen
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-4 p-4 md:p-5">
          <DraftTextArea
            key={`${item.id}-context`}
            label="Context / Notes"
            value={item.contextNote ?? ''}
            placeholder="Agenda, background, dependencies, private context, reminders..."
            onChange={(value) => handleFieldChange('contextNote', value)}
            description="Use this as the working space for everything you want to retain about the task."
            minHeightClassName="min-h-[240px] md:min-h-[320px]"
            rows={12}
            variant="primary"
            collapsed={collapsedSections.context}
            onToggleCollapse={() => toggleSection('context')}
          />

          <TabbedDraftTextArea
            key={`${item.id}-follow-through`}
            title="Action & Outcome"
            description="Keep the immediate next move and the eventual result in one compact follow-through section."
            activeTab={activeFollowThroughTab}
            onTabChange={setActiveFollowThroughTab}
            tabs={[
              {
                id: 'nextAction',
                label: 'Next Action',
                description: 'Capture the next concrete move.',
                value: item.nextAction ?? '',
                placeholder: 'What should happen next?',
                onChange: (value) => handleFieldChange('nextAction', value),
              },
              {
                id: 'outcome',
                label: 'Outcome',
                description: 'Keep the final decision or result visible.',
                value: item.outcome ?? '',
                placeholder: 'What was the result or decision?',
                onChange: (value) => handleFieldChange('outcome', value),
              },
            ]}
            minHeightClassName="min-h-[140px]"
            rows={5}
            collapsed={collapsedSections.followThrough}
            onToggleCollapse={() => toggleSection('followThrough')}
          />

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <SectionCard
              eyebrow="Details"
              title="Operational settings"
              description="Keep the task organized without taking over the writing surface."
              collapsed={collapsedSections.details}
              onToggleCollapse={() => toggleSection('details')}
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FieldSelect
                  label="Kind"
                  value={item.kind}
                  options={
                    (['action', 'meeting', 'decision', 'waiting'] as const).map((value) => ({
                      value,
                      label: KIND_LABELS[value],
                    }))
                  }
                  onChange={(value) => handleFieldChange('kind', value)}
                />
                <FieldSelect
                  label="Status"
                  value={item.status}
                  options={
                    (['inbox', 'planned', 'in_progress', 'waiting', 'done', 'cancelled'] as const).map((value) => ({
                      value,
                      label: STATUS_LABELS[value],
                    }))
                  }
                  onChange={(value) => handleFieldChange('status', value)}
                />
                <FieldSelect
                  label="Category"
                  value={item.category}
                  options={
                    (['analysis', 'design', 'team_management', 'cross_team', 'follow_up', 'escalation', 'admin', 'planning', 'other'] as const).map((value) => ({
                      value,
                      label: CATEGORY_LABELS[value],
                    }))
                  }
                  onChange={(value) => handleFieldChange('category', value)}
                />
                <FieldSelect
                  label="Priority"
                  value={item.priority}
                  options={
                    (['low', 'medium', 'high', 'critical'] as const).map((value) => ({
                      value,
                      label: PRIORITY_LABELS[value],
                    }))
                  }
                  onChange={(value) => handleFieldChange('priority', value)}
                />
                <FieldText
                  label="Participants"
                  value={item.participants ?? ''}
                  placeholder="e.g. Onshore Design Team, Rahul"
                  onChange={(value) => handleFieldChange('participants', value)}
                  className="sm:col-span-2"
                />
                <FieldDatetime
                  label="Start Time"
                  value={item.plannedStartAt ?? ''}
                  onChange={(value) => handleFieldChange('plannedStartAt', value)}
                />
                <FieldDatetime
                  label="End Time"
                  value={item.plannedEndAt ?? ''}
                  onChange={(value) => handleFieldChange('plannedEndAt', value)}
                />
                <FieldDatetime
                  label="Follow-Up"
                  value={item.followUpAt ?? ''}
                  onChange={(value) => handleFieldChange('followUpAt', value)}
                  className="sm:col-span-2"
                />
              </div>
            </SectionCard>

            <SectionCard
              eyebrow="Linked Context"
              title="Connected people and work"
              description="Attach the issue, developer, or external team involved in this item."
              collapsed={collapsedSections.links}
              onToggleCollapse={() => toggleSection('links')}
            >
              <div className="flex flex-wrap gap-1.5">
                <LinkActionButton
                  label="Issue"
                  icon={<Bug size={10} />}
                  onClick={() => setShowLinkSearch('issue')}
                />
                <LinkActionButton
                  label="Developer"
                  icon={<UserCircle size={10} />}
                  onClick={() => setShowLinkSearch('developer')}
                />
                <LinkActionButton
                  label="External"
                  icon={<Users size={10} />}
                  onClick={() => setShowLinkSearch('external')}
                />
              </div>

              {item.links.length > 0 ? (
                <div className="mt-3 space-y-1.5">
                  {item.links.map((link) => (
                    <div
                      key={link.id}
                      className="group flex items-center gap-2 rounded-xl px-3 py-2"
                      style={{
                        background: 'color-mix(in srgb, var(--bg-secondary) 92%, transparent)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      {link.linkType === 'issue' && <Bug size={12} style={{ color: 'var(--accent)' }} />}
                      {link.linkType === 'developer' && <UserCircle size={12} style={{ color: 'var(--info)' }} />}
                      {link.linkType === 'external_group' && <Users size={12} style={{ color: 'var(--text-secondary)' }} />}
                      <span className="flex-1 truncate text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>
                        {link.displayLabel}
                      </span>
                      <button
                        onClick={() => handleDeleteLink(link.id)}
                        className="transition-opacity group-hover:opacity-100 xl:opacity-0"
                        style={{ color: 'var(--text-muted)' }}
                        aria-label={`Remove linked context ${link.displayLabel}`}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className="mt-3 rounded-xl px-3 py-3 text-[12px]"
                  style={{
                    background: 'color-mix(in srgb, var(--bg-secondary) 78%, transparent)',
                    color: 'var(--text-muted)',
                    border: '1px dashed var(--border)',
                  }}
                >
                  No linked context yet.
                </div>
              )}

              {showLinkSearch && (
                <div className="mt-3">
                  <LinkSearchPanel
                    type={showLinkSearch}
                    itemId={item.id}
                    onClose={() => setShowLinkSearch(null)}
                    addLink={addLink}
                  />
                </div>
              )}

              <div className="mt-4 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
                  Activity
                </div>
                <div className="mt-2 space-y-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  <div>Created {formatSafe(item.createdAt)}</div>
                  <div>Updated {formatSafe(item.updatedAt)}</div>
                  {item.completedAt && <div>Completed {formatSafe(item.completedAt)}</div>}
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </>
  );
}

function MetaChip({
  label,
  tone,
}: {
  label: string;
  tone: 'accent' | 'neutral' | 'success' | 'danger';
}) {
  const toneStyles = {
    accent: {
      background: 'var(--md-accent-dim)',
      color: 'var(--md-accent)',
      border: '1px solid color-mix(in srgb, var(--md-accent) 24%, transparent)',
    },
    neutral: {
      background: 'color-mix(in srgb, var(--bg-secondary) 92%, transparent)',
      color: 'var(--text-secondary)',
      border: '1px solid var(--border)',
    },
    success: {
      background: 'rgba(16,185,129,0.10)',
      color: 'var(--success)',
      border: '1px solid rgba(16,185,129,0.18)',
    },
    danger: {
      background: 'rgba(239,68,68,0.10)',
      color: 'var(--danger)',
      border: '1px solid rgba(239,68,68,0.18)',
    },
  } as const;

  return (
    <span
      className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]"
      style={toneStyles[tone]}
    >
      {label}
    </span>
  );
}

function SectionCard({
  eyebrow,
  title,
  description,
  children,
  collapsed = false,
  onToggleCollapse,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  return (
    <section className="rounded-[22px] p-4 md:p-5" style={sectionSurfaceStyle}>
      <button
        type="button"
        onClick={onToggleCollapse}
        className="flex w-full items-start justify-between gap-3 text-left"
        aria-expanded={!collapsed}
        aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${title}`}
      >
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>
            {eyebrow}
          </div>
          <div className="mt-1 text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            {title}
          </div>
          <p className="mt-1 text-[12px] leading-5" style={{ color: 'var(--text-secondary)' }}>
            {collapsed ? 'Collapsed. Expand when you need this section.' : description}
          </p>
        </div>
        <span
          className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all"
          style={{
            background: 'var(--bg-tertiary)',
            color: collapsed ? 'var(--md-accent)' : 'var(--text-secondary)',
            border: '1px solid var(--border)',
            transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
          }}
        >
          <ChevronDown size={16} />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="section-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="mt-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function useDraftFieldState({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const fieldId = useId();
  const [local, setLocal] = useState(value);
  const [saveState, setSaveState] = useState<FieldSaveState>('idle');
  const localRef = useRef(value);
  const saveStateRef = useRef<FieldSaveState>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const savedTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    localRef.current = local;
  }, [local]);

  useEffect(() => {
    saveStateRef.current = saveState;
  }, [saveState]);

  useEffect(() => {
    const matchesDraft = value === localRef.current;
    setLocal(value);

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    if (matchesDraft && (saveStateRef.current === 'dirty' || saveStateRef.current === 'saving')) {
      setSaveState('saved');
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaveState('idle'), 1400);
      return;
    }

    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    setSaveState('idle');
  }, [value]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  const commitDraft = useCallback(
    (nextValue: string) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);

      if (nextValue === value) {
        setSaveState('idle');
        return;
      }

      setSaveState('saving');
      onChange(nextValue);
    },
    [onChange, value],
  );

  const handleDraftChange = useCallback(
    (nextValue: string) => {
      setLocal(nextValue);
      localRef.current = nextValue;

      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

      if (nextValue === value) {
        setSaveState('idle');
        return;
      }

      setSaveState('dirty');
      saveTimerRef.current = setTimeout(() => commitDraft(nextValue), 900);
    },
    [commitDraft, value],
  );

  return {
    fieldId,
    local,
    saveState,
    commitDraft,
    handleDraftChange,
    localRef,
  };
}

function DraftTextArea({
  label,
  value,
  placeholder,
  onChange,
  description,
  minHeightClassName,
  rows,
  variant = 'secondary',
  collapsed = false,
  onToggleCollapse,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  description: string;
  minHeightClassName: string;
  rows: number;
  variant?: 'primary' | 'secondary';
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const { fieldId, local, saveState, commitDraft, handleDraftChange, localRef } = useDraftFieldState({
    value,
    onChange,
  });

  const headerTone = variant === 'primary' ? 'var(--md-accent)' : 'var(--text-muted)';
  const textareaStyle =
    variant === 'primary'
      ? {
          background: 'color-mix(in srgb, var(--bg-elevated) 90%, transparent)',
          border: '1px solid color-mix(in srgb, var(--md-accent) 20%, var(--border) 80%)',
        }
      : {
          background: 'color-mix(in srgb, var(--bg-secondary) 90%, transparent)',
          border: '1px solid var(--border)',
        };

  return (
    <section className="rounded-[22px] p-4 md:p-5" style={sectionSurfaceStyle}>
      <button
        type="button"
        onClick={onToggleCollapse}
        className="flex w-full items-start justify-between gap-3 text-left"
        aria-expanded={!collapsed}
        aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${label}`}
      >
        <div className="min-w-0">
          <div
            className="text-[10px] font-bold uppercase tracking-[0.2em]"
            style={{ color: headerTone }}
          >
            {label}
          </div>
          <p className="mt-1 text-[12px] leading-5" style={{ color: 'var(--text-secondary)' }}>
            {collapsed ? 'Collapsed. Expand when you want to review or write here.' : description}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SaveStateLabel state={saveState} />
          <span
            className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all"
            style={{
              background: 'var(--bg-tertiary)',
              color: collapsed ? 'var(--md-accent)' : 'var(--text-secondary)',
              border: '1px solid var(--border)',
              transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
            }}
          >
            <ChevronDown size={16} />
          </span>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="textarea-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <textarea
              id={fieldId}
              aria-label={label}
              value={local}
              onChange={(e) => handleDraftChange(e.target.value)}
              onBlur={() => commitDraft(localRef.current)}
              placeholder={placeholder}
              rows={rows}
              className={`mt-3 w-full rounded-[18px] px-4 py-3 outline-none resize-y text-[13px] leading-6 ${minHeightClassName}`}
              style={{
                ...textareaStyle,
                color: 'var(--text-primary)',
                caretColor: 'var(--md-accent)',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function TabbedDraftTextArea({
  title,
  description,
  tabs,
  activeTab,
  onTabChange,
  minHeightClassName,
  rows,
  collapsed = false,
  onToggleCollapse,
}: {
  title: string;
  description: string;
  tabs: Array<{
    id: 'nextAction' | 'outcome';
    label: string;
    description: string;
    value: string;
    placeholder: string;
    onChange: (value: string) => void;
  }>;
  activeTab: 'nextAction' | 'outcome';
  onTabChange: (tab: 'nextAction' | 'outcome') => void;
  minHeightClassName: string;
  rows: number;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const nextActionDraft = useDraftFieldState({
    value: tabs.find((tab) => tab.id === 'nextAction')?.value ?? '',
    onChange: tabs.find((tab) => tab.id === 'nextAction')?.onChange ?? (() => {}),
  });
  const outcomeDraft = useDraftFieldState({
    value: tabs.find((tab) => tab.id === 'outcome')?.value ?? '',
    onChange: tabs.find((tab) => tab.id === 'outcome')?.onChange ?? (() => {}),
  });

  const tabState = {
    nextAction: nextActionDraft,
    outcome: outcomeDraft,
  } as const;

  const activeConfig = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];
  const activeDraft = tabState[activeConfig.id];
  const panelId = `action-outcome-panel-${activeConfig.id}`;
  const populatedTabs = tabs.filter((tab) => tab.value.trim().length > 0);
  const headerState = tabs.reduce<FieldSaveState>((current, tab) => {
    const state = tabState[tab.id].saveState;
    if (state === 'saving' || state === 'dirty') return 'saving';
    if (current !== 'saving' && state === 'saved') return 'saved';
    return current;
  }, 'idle');

  return (
    <section className="rounded-[22px] p-4 md:p-5" style={sectionSurfaceStyle}>
      <button
        type="button"
        onClick={onToggleCollapse}
        className="flex w-full items-start justify-between gap-3 text-left"
        aria-expanded={!collapsed}
        aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${title}`}
      >
        <div className="min-w-0">
          <div
            className="text-[10px] font-bold uppercase tracking-[0.2em]"
            style={{ color: 'var(--text-muted)' }}
          >
            Secondary Notes
          </div>
          <div className="mt-1 text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            {title}
          </div>
          <p className="mt-1 text-[12px] leading-5" style={{ color: 'var(--text-secondary)' }}>
            {collapsed ? 'Collapsed by default. Expand when you want to plan the next move or capture the result.' : description}
          </p>
          {collapsed && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {populatedTabs.length > 0 ? (
                populatedTabs.map((tab) => (
                  <CollapsedStateBadge key={tab.id} label={`${tab.label} saved`} tone="filled" />
                ))
              ) : (
                <CollapsedStateBadge label="No saved follow-through yet" tone="empty" />
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <SaveStateLabel state={headerState} />
          <span
            className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all"
            style={{
              background: 'var(--bg-tertiary)',
              color: collapsed ? 'var(--md-accent)' : 'var(--text-secondary)',
              border: '1px solid var(--border)',
              transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
            }}
          >
            <ChevronDown size={16} />
          </span>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="tabbed-textarea-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="mt-3">
              <div
                className="inline-flex rounded-xl p-1"
                style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
                role="tablist"
                aria-label="Action and outcome tabs"
              >
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    id={`action-outcome-tab-${tab.id}`}
                    aria-selected={activeTab === tab.id}
                    aria-controls={`action-outcome-panel-${tab.id}`}
                    tabIndex={activeTab === tab.id ? 0 : -1}
                    onClick={() => onTabChange(tab.id)}
                    className="rounded-[10px] px-3 py-1.5 text-[11px] font-semibold transition-all"
                    style={{
                      background: activeTab === tab.id ? 'var(--bg-elevated)' : 'transparent',
                      color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                      boxShadow: activeTab === tab.id ? 'var(--soft-shadow)' : 'none',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="mt-3">
                <div className="text-[11px] font-medium" style={{ color: 'var(--text-primary)' }}>
                  {activeConfig.label}
                </div>
                <p className="mt-1 text-[12px] leading-5" style={{ color: 'var(--text-secondary)' }}>
                  {activeConfig.description}
                </p>
              </div>

              <textarea
                id={panelId}
                aria-label={activeConfig.label}
                role="tabpanel"
                aria-labelledby={`action-outcome-tab-${activeConfig.id}`}
                data-testid={`action-outcome-panel-${activeConfig.id}`}
                value={activeDraft.local}
                onChange={(e) => activeDraft.handleDraftChange(e.target.value)}
                onBlur={() => activeDraft.commitDraft(activeDraft.localRef.current)}
                placeholder={activeConfig.placeholder}
                rows={rows}
                className={`mt-3 w-full rounded-[18px] px-4 py-3 outline-none resize-y text-[13px] leading-6 ${minHeightClassName}`}
                style={{
                  background: 'color-mix(in srgb, var(--bg-secondary) 90%, transparent)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  caretColor: 'var(--md-accent)',
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function CollapsedStateBadge({
  label,
  tone,
}: {
  label: string;
  tone: 'filled' | 'empty';
}) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em]"
      style={{
        background: tone === 'filled' ? 'var(--md-accent-dim)' : 'color-mix(in srgb, var(--bg-secondary) 92%, transparent)',
        color: tone === 'filled' ? 'var(--md-accent)' : 'var(--text-muted)',
        border: tone === 'filled'
          ? '1px solid color-mix(in srgb, var(--md-accent) 22%, transparent)'
          : '1px solid var(--border)',
      }}
    >
      {label}
    </span>
  );
}

function SaveStateLabel({ state }: { state: FieldSaveState }) {
  if (state === 'idle') return null;

  const isSaved = state === 'saved';
  return (
    <span
      className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.16em]"
      style={{ color: isSaved ? 'var(--success)' : 'var(--warning)' }}
    >
      {isSaved ? 'Saved' : 'Saving...'}
    </span>
  );
}

function LinkActionButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] transition-all"
      style={{
        background: 'var(--bg-tertiary)',
        color: 'var(--text-secondary)',
        border: '1px solid var(--border)',
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function FieldSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: string) => void;
}) {
  const fieldId = useId();

  return (
    <div>
      <label
        htmlFor={fieldId}
        className="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em]"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
      </label>
      <select
        id={fieldId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full cursor-pointer rounded-xl px-3 py-2 text-[12px] font-medium outline-none"
        style={{
          background: 'var(--bg-tertiary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)',
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
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
  className,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const fieldId = useId();
  const [local, setLocal] = useState(value);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  return (
    <div className={className}>
      <label
        htmlFor={fieldId}
        className="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em]"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
      </label>
      <input
        id={fieldId}
        type="text"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => {
          if (local !== value) onChange(local);
        }}
        placeholder={placeholder}
        className="w-full rounded-xl px-3 py-2 text-[12px] outline-none"
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
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const fieldId = useId();
  const localValue = value ? value.slice(0, 16) : '';

  return (
    <div className={className}>
      <label
        htmlFor={fieldId}
        className="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em]"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
      </label>
      <input
        id={fieldId}
        type="datetime-local"
        value={localValue}
        onChange={(e) => {
          const nextValue = e.target.value;
          onChange(nextValue ? new Date(nextValue).toISOString() : '');
        }}
        className="w-full rounded-xl px-3 py-2 text-[12px] outline-none"
        style={{
          background: 'var(--bg-tertiary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)',
        }}
      />
    </div>
  );
}

function LinkSearchPanel({
  type,
  itemId,
  onClose,
  addLink,
}: {
  type: 'issue' | 'developer' | 'external';
  itemId: number;
  onClose: () => void;
  addLink: ReturnType<typeof useAddManagerDeskLink>;
}) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const { data: issues } = useManagerDeskIssueLookup(query, type === 'issue');
  const { data: developers } = useManagerDeskDeveloperLookup(query, type === 'developer');

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
      className="overflow-hidden rounded-[18px]"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid color-mix(in srgb, var(--md-accent) 50%, var(--border) 50%)',
      }}
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <Link2 size={12} style={{ color: 'var(--md-accent)' }} />
        <Search size={12} style={{ color: 'var(--text-muted)' }} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'Enter' && type === 'external') handleAddExternal();
          }}
          placeholder={
            type === 'issue'
              ? 'Search issues...'
              : type === 'developer'
                ? 'Search developers...'
                : 'Type external group name and press Enter...'
          }
          className="flex-1 bg-transparent text-[12px] outline-none"
          style={{ color: 'var(--text-primary)' }}
        />
        <button onClick={onClose} style={{ color: 'var(--text-muted)' }} aria-label="Close link search">
          <X size={12} />
        </button>
      </div>

      {type === 'issue' && issues && issues.length > 0 && (
        <div className="max-h-40 overflow-y-auto border-t" style={{ borderColor: 'var(--border)' }}>
          {issues.map((issue) => (
            <button
              key={issue.jiraKey}
              onClick={() => handleSelectIssue(issue.jiraKey)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:opacity-80"
              style={{ background: 'transparent' }}
            >
              <span className="text-[11px] font-mono font-bold" style={{ color: 'var(--accent)' }}>
                {issue.jiraKey}
              </span>
              <span className="flex-1 truncate text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                {issue.summary}
              </span>
            </button>
          ))}
        </div>
      )}

      {type === 'developer' && developers && developers.length > 0 && (
        <div className="max-h-40 overflow-y-auto border-t" style={{ borderColor: 'var(--border)' }}>
          {developers.map((developer) => (
            <button
              key={developer.accountId}
              onClick={() => handleSelectDeveloper(developer.accountId)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:opacity-80"
              style={{ background: 'transparent' }}
            >
              <UserCircle size={14} style={{ color: 'var(--info)' }} />
              <span className="text-[11px] font-medium" style={{ color: 'var(--text-primary)' }}>
                {developer.displayName}
              </span>
              {developer.email && (
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {developer.email}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {type === 'external' && query.trim() && (
        <div className="border-t px-3 py-2" style={{ borderColor: 'var(--border)' }}>
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

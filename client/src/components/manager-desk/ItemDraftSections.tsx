import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { sectionSurfaceStyle } from './ItemDetailPrimitives';

type FieldSaveState = 'idle' | 'dirty' | 'saving' | 'saved';

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

  return { fieldId, local, saveState, commitDraft, handleDraftChange, localRef };
}

function SaveStateLabel({ state }: { state: FieldSaveState }) {
  if (state === 'idle') return null;

  return (
    <span
      className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.16em]"
      style={{ color: state === 'saved' ? 'var(--success)' : 'var(--warning)' }}
    >
      {state === 'saved' ? 'Saved' : 'Saving...'}
    </span>
  );
}

export function DraftTextArea({
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
          <div className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: headerTone }}>
            {label}
          </div>
          <p className="mt-1 text-[13px] leading-5" style={{ color: 'var(--text-secondary)' }}>
            {collapsed ? 'Collapsed. Expand when you want to review or write here.' : description}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SaveStateLabel state={saveState} />
          <ChevronBadge collapsed={collapsed} />
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
              className={`mt-3 w-full resize-y rounded-[18px] px-4 py-3 text-[13px] leading-6 outline-none ${minHeightClassName}`}
              style={{ ...textareaStyle, color: 'var(--text-primary)', caretColor: 'var(--md-accent)' }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export function TabbedDraftTextArea({
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
  const stateByTab = { nextAction: nextActionDraft, outcome: outcomeDraft } as const;
  const defaultTab = tabs.find((tab) => tab.id === 'nextAction') ?? tabs[0];
  if (!defaultTab) {
    return null;
  }
  const activeConfig = tabs.find((tab) => tab.id === activeTab) ?? defaultTab;
  const activeDraft = stateByTab[activeConfig.id];
  const populatedTabs = tabs.filter((tab) => tab.value.trim().length > 0);
  const headerState = tabs.reduce<FieldSaveState>((current, tab) => {
    const nextState = stateByTab[tab.id].saveState;
    if (nextState === 'saving' || nextState === 'dirty') return 'saving';
    if (current !== 'saving' && nextState === 'saved') return 'saved';
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
          <div className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>
            Secondary Notes
          </div>
          <div className="mt-1 text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            {title}
          </div>
          <p className="mt-1 text-[13px] leading-5" style={{ color: 'var(--text-secondary)' }}>
            {collapsed ? 'Collapsed by default. Expand when you want to plan the next move or capture the result.' : description}
          </p>
          {collapsed ? <CollapsedTabState tabs={populatedTabs} /> : null}
        </div>
        <div className="flex items-center gap-2">
          <SaveStateLabel state={headerState} />
          <ChevronBadge collapsed={collapsed} />
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
            <TabbedDraftPanel
              activeConfig={activeConfig}
              activeDraft={activeDraft}
              activeTab={activeTab}
              minHeightClassName={minHeightClassName}
              onTabChange={onTabChange}
              rows={rows}
              tabs={tabs}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function CollapsedTabState({
  tabs,
}: {
  tabs: Array<{ id: 'nextAction' | 'outcome'; label: string }>;
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {tabs.length > 0 ? (
        tabs.map((tab) => <StateBadge key={tab.id} label={`${tab.label} saved`} tone="filled" />)
      ) : (
        <StateBadge label="No saved follow-through yet" tone="empty" />
      )}
    </div>
  );
}

function TabbedDraftPanel({
  activeConfig,
  activeDraft,
  activeTab,
  minHeightClassName,
  onTabChange,
  rows,
  tabs,
}: {
  activeConfig: {
    id: 'nextAction' | 'outcome';
    label: string;
    description: string;
    placeholder: string;
  };
  activeDraft: ReturnType<typeof useDraftFieldState>;
  activeTab: 'nextAction' | 'outcome';
  minHeightClassName: string;
  onTabChange: (tab: 'nextAction' | 'outcome') => void;
  rows: number;
  tabs: Array<{ id: 'nextAction' | 'outcome'; label: string }>;
}) {
  return (
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
            className="rounded-[10px] px-3 py-1.5 text-[12px] font-semibold transition-all"
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
        <div className="text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>
          {activeConfig.label}
        </div>
        <p className="mt-1 text-[13px] leading-5" style={{ color: 'var(--text-secondary)' }}>
          {activeConfig.description}
        </p>
      </div>
      <textarea
        id={`action-outcome-panel-${activeConfig.id}`}
        aria-label={activeConfig.label}
        role="tabpanel"
        aria-labelledby={`action-outcome-tab-${activeConfig.id}`}
        data-testid={`action-outcome-panel-${activeConfig.id}`}
        value={activeDraft.local}
        onChange={(e) => activeDraft.handleDraftChange(e.target.value)}
        onBlur={() => activeDraft.commitDraft(activeDraft.localRef.current)}
        placeholder={activeConfig.placeholder}
        rows={rows}
        className={`mt-3 w-full resize-y rounded-[18px] px-4 py-3 text-[13px] leading-6 outline-none ${minHeightClassName}`}
        style={{
          background: 'color-mix(in srgb, var(--bg-secondary) 90%, transparent)',
          border: '1px solid var(--border)',
          color: 'var(--text-primary)',
          caretColor: 'var(--md-accent)',
        }}
      />
    </div>
  );
}

function StateBadge({
  label,
  tone,
}: {
  label: string;
  tone: 'filled' | 'empty';
}) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em]"
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

function ChevronBadge({ collapsed }: { collapsed: boolean }) {
  return (
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
  );
}

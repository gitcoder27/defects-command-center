import type { ManagerDeskItem, ManagerDeskUpdateItemPayload } from '@/types/manager-desk';
import { useDraftField, type DraftSaveState } from './useDraftField';

interface DrawerNotesProps {
  item: ManagerDeskItem;
  onFieldChange: (field: keyof ManagerDeskUpdateItemPayload, value: string) => void;
}

export function DrawerNotes({ item, onFieldChange }: DrawerNotesProps) {
  const context = useDraftField({
    value: item.contextNote ?? '',
    onChange: (v) => onFieldChange('contextNote', v),
  });
  const nextAction = useDraftField({
    value: item.nextAction ?? '',
    onChange: (v) => onFieldChange('nextAction', v),
  });
  const outcome = useDraftField({
    value: item.outcome ?? '',
    onChange: (v) => onFieldChange('outcome', v),
  });

  return (
    <div className="space-y-3 px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
      <DraftArea
        label="Context / Notes"
        fieldId={context.fieldId}
        value={context.local}
        saveState={context.saveState}
        onChange={context.handleChange}
        onBlur={() => context.commitDraft(context.localRef.current)}
        placeholder="Agenda, background, dependencies, reminders…"
        rows={5}
        variant="primary"
      />
      <DraftArea
        label="Next Action"
        fieldId={nextAction.fieldId}
        value={nextAction.local}
        saveState={nextAction.saveState}
        onChange={nextAction.handleChange}
        onBlur={() => nextAction.commitDraft(nextAction.localRef.current)}
        placeholder="What should happen next?"
        rows={2}
      />
      <DraftArea
        label="Outcome"
        fieldId={outcome.fieldId}
        value={outcome.local}
        saveState={outcome.saveState}
        onChange={outcome.handleChange}
        onBlur={() => outcome.commitDraft(outcome.localRef.current)}
        placeholder="What was the result or decision?"
        rows={2}
      />
    </div>
  );
}

function DraftArea({ label, fieldId, value, saveState, onChange, onBlur, placeholder, rows, variant = 'default' }: {
  label: string;
  fieldId: string;
  value: string;
  saveState: DraftSaveState;
  onChange: (value: string) => void;
  onBlur: () => void;
  placeholder: string;
  rows: number;
  variant?: 'primary' | 'default';
}) {
  const borderStyle = variant === 'primary'
    ? '1px solid color-mix(in srgb, var(--md-accent) 20%, var(--border) 80%)'
    : '1px solid var(--border)';

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label
          htmlFor={fieldId}
          className="text-[9px] font-bold uppercase tracking-[0.16em]"
          style={{ color: variant === 'primary' ? 'var(--md-accent)' : 'var(--text-muted)' }}
        >
          {label}
        </label>
        <SaveIndicator state={saveState} />
      </div>
      <textarea
        id={fieldId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        rows={rows}
        className="w-full resize-y rounded-lg px-3 py-2 text-[12px] leading-relaxed outline-none"
        style={{
          background: 'var(--bg-secondary)',
          color: 'var(--text-primary)',
          border: borderStyle,
          caretColor: 'var(--md-accent)',
        }}
      />
    </div>
  );
}

function SaveIndicator({ state }: { state: DraftSaveState }) {
  if (state === 'idle') return null;
  const saved = state === 'saved';
  return (
    <span
      className="text-[9px] font-semibold uppercase tracking-[0.12em]"
      style={{ color: saved ? 'var(--success)' : 'var(--warning)' }}
    >
      {saved ? '✓ Saved' : 'Saving…'}
    </span>
  );
}

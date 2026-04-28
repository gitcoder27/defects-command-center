import type { ManagerDeskItem, ManagerDeskUpdateItemPayload } from '@/types/manager-desk';
import { TriageNotesEditor } from '@/components/triage/TriageNotesEditor';
import { useDraftField } from './useDraftField';

interface DrawerNotesProps {
  item: ManagerDeskItem;
  readOnly?: boolean;
  onFieldChange: (field: keyof ManagerDeskUpdateItemPayload, value: string | null) => void;
}

export function DrawerNotes({ item, readOnly = false, onFieldChange }: DrawerNotesProps) {
  const notes = useDraftField({
    value: item.contextNote ?? '',
    onChange: (v) => onFieldChange('contextNote', v.trim() ? v : null),
  });
  const isSaved = notes.saveState !== 'dirty' && notes.saveState !== 'saving';

  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <TriageNotesEditor
        value={notes.local}
        onChange={readOnly ? () => undefined : notes.handleChange}
        onBlurSave={() => notes.commitDraft(notes.localRef.current)}
        isSaved={isSaved}
        readOnly={readOnly}
      />
    </div>
  );
}

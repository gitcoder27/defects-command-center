import { useCallback, useEffect, useId, useRef, useState } from 'react';

export type DraftSaveState = 'idle' | 'dirty' | 'saving' | 'saved';

export function useDraftField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const fieldId = useId();
  const [local, setLocal] = useState(value);
  const [saveState, setSaveState] = useState<DraftSaveState>('idle');
  const localRef = useRef(value);
  const saveStateRef = useRef<DraftSaveState>('idle');
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

  const handleChange = useCallback(
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

  return { fieldId, local, saveState, commitDraft, handleChange, localRef };
}

import { useState, useRef, useCallback, useEffect } from 'react';
import { useUpdateIssue } from '@/hooks/useUpdateIssue';
import { useToast } from '@/context/ToastContext';

export function useTriageNotes(issueKey?: string, issueNotes?: string) {
  const updateIssue = useUpdateIssue();
  const { addToast } = useToast();
  const [notesValue, setNotesValue] = useState('');
  const [notesSaved, setNotesSaved] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setNotesValue(issueNotes ?? '');
    setNotesSaved(true);
  }, [issueKey, issueNotes]);

  const saveNotes = useCallback(
    (value: string) => {
      if (!issueKey) return;
      updateIssue.mutate(
        { key: issueKey, update: { analysisNotes: value } },
        {
          onError: (err) => {
            addToast({ type: 'error', title: 'Failed to save notes', message: err.message });
          },
        },
      );
      setNotesSaved(true);
    },
    [issueKey, updateIssue, addToast],
  );

  const handleChange = useCallback(
    (value: string) => {
      setNotesValue(value);
      setNotesSaved(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => saveNotes(value), 1500);
    },
    [saveNotes],
  );

  const handleBlurSave = useCallback(() => {
    if (!notesSaved) saveNotes(notesValue);
  }, [notesSaved, notesValue, saveNotes]);

  return { notesValue, notesSaved, handleChange, handleBlurSave };
}

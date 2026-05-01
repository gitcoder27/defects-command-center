import { useEffect, useRef } from 'react';
import { useUpdateIssue } from '@/hooks/useUpdateIssue';
import { useToast } from '@/context/ToastContext';

interface InlineEditDueDateProps {
  issueKey: string;
  currentValue?: string;
  onClose: () => void;
}

export function InlineEditDueDate({ issueKey, currentValue, onClose }: InlineEditDueDateProps) {
  const ref = useRef<HTMLInputElement>(null);
  const updateIssue = useUpdateIssue();
  const { addToast } = useToast();

  useEffect(() => {
    ref.current?.focus();
  }, []);

  const handleChange = (value: string) => {
    if (value !== (currentValue ?? '')) {
      updateIssue.mutate(
        { key: issueKey, update: { developmentDueDate: value } },
        {
          onError: (err) => {
            addToast({ type: 'error', title: `Failed to update ${issueKey}`, message: err.message });
          },
        }
      );
    }
    onClose();
  };

  return (
    <input
      ref={ref}
      type="date"
      value={currentValue ?? ''}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={onClose}
      onClick={(e) => e.stopPropagation()}
      className="text-[13px] px-1.5 py-0.5 rounded cursor-pointer font-mono"
      style={{
        background: 'var(--bg-tertiary)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border-active)',
        outline: 'none',
      }}
    />
  );
}

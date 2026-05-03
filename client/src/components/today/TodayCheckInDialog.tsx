import { useEffect, useId, useState } from 'react';
import { MessageSquare, X } from 'lucide-react';

interface TodayCheckInDialogProps {
  developerName: string;
  defaultSummary?: string;
  isSaving: boolean;
  onClose: () => void;
  onSave: (summary: string) => void;
}

export function TodayCheckInDialog({
  developerName,
  defaultSummary = '',
  isSaving,
  onClose,
  onSave,
}: TodayCheckInDialogProps) {
  const [summary, setSummary] = useState(defaultSummary);
  const titleId = useId();
  const descriptionId = useId();
  const canSave = summary.trim().length > 0 && !isSaving;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Close check-in dialog"
        className="absolute inset-0 cursor-default"
        style={{ background: 'rgba(0, 0, 0, 0.48)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative w-full max-w-[440px] overflow-hidden rounded-xl border"
        style={{
          background: 'linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)',
          borderColor: 'var(--border-strong)',
          boxShadow: '0 24px 80px rgba(0, 0, 0, 0.36)',
        }}
      >
        <div className="flex items-start justify-between gap-3 border-b px-4 py-3" style={{ borderColor: 'var(--border)' }}>
          <div className="flex min-w-0 items-start gap-3">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              style={{
                background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
                color: 'var(--accent)',
                border: '1px solid color-mix(in srgb, var(--accent) 24%, var(--border))',
              }}
            >
              <MessageSquare size={16} />
            </span>
            <div className="min-w-0">
              <h2 id={titleId} className="truncate text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                Add check-in
              </h2>
              <p id={descriptionId} className="mt-1 text-[12px] leading-5" style={{ color: 'var(--text-muted)' }}>
                Saves to Team / {developerName} / Check-ins for today.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-[var(--bg-tertiary)]"
            aria-label="Close"
          >
            <X size={15} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        <div className="px-4 py-4">
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>
              Check-in note
            </span>
            <textarea
              autoFocus
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              rows={4}
              className="w-full resize-none rounded-lg px-3 py-2.5 text-[13px] leading-5 outline-none transition-colors focus:ring-2 focus:ring-[var(--border-active)]"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
              }}
              placeholder="Asked for today update, blocker detail, or current status..."
            />
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-4 py-3" style={{ borderColor: 'var(--border)' }}>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors hover:bg-[var(--bg-tertiary)]"
            style={{ color: 'var(--text-secondary)' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(summary)}
            disabled={!canSave}
            className="rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-opacity disabled:opacity-45"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            {isSaving ? 'Saving' : 'Save check-in'}
          </button>
        </div>
      </section>
    </div>
  );
}

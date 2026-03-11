import { useCallback, useEffect, useRef, useState } from 'react';
import { FileText, Check } from 'lucide-react';

interface TriageNotesEditorProps {
  value: string;
  onChange: (value: string) => void;
  onBlurSave: () => void;
  isSaved: boolean;
}

export function TriageNotesEditor({ value, onChange, onBlurSave, isSaved }: TriageNotesEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const minH = 72;
    const maxH = 280;
    el.style.height = `${Math.min(Math.max(el.scrollHeight, minH), maxH)}px`;
  }, []);

  useEffect(() => {
    autoResize();
  }, [value, autoResize]);

  return (
    <div className="triage-section">
      <div className="flex items-center justify-between mb-1.5">
        <span className="triage-section-label">
          <FileText size={11} /> Notes
        </span>
        <span
          className="text-[10px] transition-opacity"
          style={{
            color: !isSaved ? 'var(--warning)' : 'var(--success)',
            opacity: value ? 1 : 0,
          }}
        >
          {!isSaved ? 'Saving…' : (
            <span className="inline-flex items-center gap-0.5">
              <Check size={9} /> Saved
            </span>
          )}
        </span>
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setIsFocused(false);
          onBlurSave();
        }}
        placeholder="Root cause, observations, action items…"
        className="w-full px-3 py-2 rounded-lg text-[12.5px] leading-[1.65] resize-none focus:outline-none transition-all"
        style={{
          background: isFocused ? 'var(--bg-tertiary)' : 'var(--bg-tertiary)',
          color: 'var(--text-primary)',
          border: `1px solid ${isFocused ? 'var(--border-active)' : 'var(--border)'}`,
          minHeight: '72px',
          maxHeight: '280px',
          fontFamily: "'Geist Variable', sans-serif",
        }}
      />
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';

interface TriageNotesTextAreaProps {
  value: string;
  label: string;
  badge?: string;
  placeholder: string;
  ariaLabel: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  tone?: 'today' | 'default' | 'legacy';
}

export function TriageNotesTextArea({
  value,
  label,
  badge,
  placeholder,
  ariaLabel,
  onChange,
  onBlur,
  tone = 'default',
}: TriageNotesTextAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const isToday = tone === 'today';
  const borderColor = isFocused || isToday ? 'var(--border-active)' : 'var(--border)';
  const panelBackground = tone === 'legacy'
    ? 'linear-gradient(180deg, color-mix(in srgb, var(--bg-tertiary) 92%, transparent), color-mix(in srgb, var(--bg-secondary) 88%, transparent))'
    : 'linear-gradient(180deg, color-mix(in srgb, var(--bg-tertiary) 96%, rgba(14, 165, 233, 0.06) 4%), color-mix(in srgb, var(--bg-secondary) 92%, transparent))';

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const minHeight = 70;
    const maxHeight = 220;
    el.style.height = `${Math.min(Math.max(el.scrollHeight, minHeight), maxHeight)}px`;
  }, []);

  const scrollToBottom = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    autoResize();
    if (!isFocused) {
      scrollToBottom();
    }
  }, [autoResize, isFocused, scrollToBottom, value]);

  return (
    <div
      className="rounded-[18px] border px-3 py-3 transition-all"
      style={{ borderColor, background: panelBackground, boxShadow: isToday ? 'inset 0 1px 0 rgba(14, 165, 233, 0.08)' : 'none' }}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
          {label}
        </span>
        {badge ? (
          <span
            className="rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em]"
            style={{
              color: isToday ? 'var(--info)' : 'var(--text-secondary)',
              background: isToday ? 'rgba(14, 165, 233, 0.12)' : 'var(--bg-primary)',
              border: `1px solid ${isToday ? 'rgba(14, 165, 233, 0.22)' : 'var(--border)'}`,
            }}
          >
            {badge}
          </span>
        ) : null}
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        aria-label={ariaLabel}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setIsFocused(false);
          onBlur();
        }}
        placeholder={placeholder}
        className="w-full resize-none bg-transparent px-0 py-0 text-[12.5px] leading-[1.7] focus:outline-none transition-all"
        style={{ color: 'var(--text-primary)', minHeight: '70px', maxHeight: '220px', fontFamily: "'Geist Variable', sans-serif" }}
      />
    </div>
  );
}

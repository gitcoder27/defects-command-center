import { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Plus, Zap, Tag } from 'lucide-react';
import type { ManagerDeskItemKind, ManagerDeskCategory } from '@/types/manager-desk';
import { KIND_LABELS, CATEGORY_LABELS } from '@/types/manager-desk';

interface Props {
  onCapture: (title: string, kind?: ManagerDeskItemKind, category?: ManagerDeskCategory) => void;
  isPending: boolean;
  disabled?: boolean;
  disabledLabel?: string;
}

const kindOptions: ManagerDeskItemKind[] = ['action', 'meeting', 'decision', 'waiting'];
const categoryOptions: ManagerDeskCategory[] = [
  'analysis', 'design', 'team_management', 'cross_team',
  'follow_up', 'escalation', 'admin', 'planning', 'other',
];

export function QuickCapture({ onCapture, isPending, disabled = false, disabledLabel = 'Capture is unavailable for this view.' }: Props) {
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<ManagerDeskItemKind | ''>('');
  const [category, setCategory] = useState<ManagerDeskCategory | ''>('');
  const [expanded, setExpanded] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const shouldRestoreFocusRef = useRef(false);

  useEffect(() => {
    if (!shouldRestoreFocusRef.current || title) return;
    inputRef.current?.focus();
    shouldRestoreFocusRef.current = false;
  }, [title]);

  const handleSubmit = useCallback(() => {
    if (isPending || disabled) return;
    const trimmed = title.trim();
    if (!trimmed) return;
    shouldRestoreFocusRef.current = true;
    onCapture(trimmed, kind || undefined, category || undefined);
    setTitle('');
    setKind('');
    setCategory('');
    setExpanded(false);
  }, [title, kind, category, onCapture, isPending, disabled]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
      if (e.key === 'Escape') {
        setExpanded(false);
        setTitle('');
      }
    },
    [handleSubmit],
  );

  return (
    <div
      className="md-glass-panel rounded-lg overflow-hidden transition-all"
      style={{
        boxShadow: expanded || isFocused
          ? '0 0 0 1px var(--md-accent), 0 2px 12px rgba(217,169,78,0.06)'
          : undefined,
      }}
    >
      <div className="flex items-center gap-1.5 px-2 py-1.5">
        <div
          className="h-5 w-5 rounded flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--md-accent-glow)', color: 'var(--md-accent)' }}
        >
          <Plus size={11} />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={e => {
            setTitle(e.target.value);
            if (e.target.value && !expanded) setExpanded(true);
          }}
          onFocus={() => {
            if (disabled) return;
            setIsFocused(true);
            if (title) setExpanded(true);
          }}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder="Quick capture — Enter to add…"
          className="flex-1 bg-transparent outline-none text-[11px] font-medium placeholder:font-normal"
          style={{
            color: 'var(--text-primary)',
            caretColor: 'var(--md-accent)',
          }}
          aria-busy={isPending}
          disabled={disabled}
          maxLength={200}
        />

        <button
          onClick={handleSubmit}
          disabled={!title.trim() || isPending || disabled}
          className="h-5 px-2 rounded text-[9px] font-bold uppercase tracking-wide transition-all disabled:opacity-30"
          style={{
            background: 'var(--md-accent)',
            color: '#000',
          }}
        >
          {isPending ? '…' : 'Add'}
        </button>
      </div>

      {/* Expanded options row */}
      {expanded && !disabled && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="border-t px-2 py-1 flex items-center gap-2"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-1">
            <Zap size={9} style={{ color: 'var(--text-muted)' }} />
            <select
              value={kind}
              onChange={e => setKind(e.target.value as ManagerDeskItemKind | '')}
              className="bg-transparent text-[10px] font-medium outline-none cursor-pointer"
              style={{ color: kind ? 'var(--text-primary)' : 'var(--text-muted)' }}
            >
              <option value="">Kind…</option>
              {kindOptions.map(k => (
                <option key={k} value={k}>{KIND_LABELS[k]}</option>
              ))}
            </select>
          </div>

          <div className="w-px h-3" style={{ background: 'var(--border)' }} />

          <div className="flex items-center gap-1">
            <Tag size={9} style={{ color: 'var(--text-muted)' }} />
            <select
              value={category}
              onChange={e => setCategory(e.target.value as ManagerDeskCategory | '')}
              className="bg-transparent text-[10px] font-medium outline-none cursor-pointer"
              style={{ color: category ? 'var(--text-primary)' : 'var(--text-muted)' }}
            >
              <option value="">Category…</option>
              {categoryOptions.map(c => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </div>

          <span className="ml-auto text-[9px]" style={{ color: 'var(--text-muted)' }}>
            ↵ Enter
          </span>
        </motion.div>
      )}

      {disabled && (
        <div
          className="border-t px-2 py-1 text-[10px]"
          style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
        >
          {disabledLabel}
        </div>
      )}
    </div>
  );
}

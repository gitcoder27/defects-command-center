import { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Zap, Tag } from 'lucide-react';
import type { ManagerDeskItemKind, ManagerDeskCategory } from '@/types/manager-desk';
import { KIND_LABELS, CATEGORY_LABELS } from '@/types/manager-desk';

interface Props {
  onCapture: (title: string, kind?: ManagerDeskItemKind, category?: ManagerDeskCategory) => void;
  isPending: boolean;
}

const kindOptions: ManagerDeskItemKind[] = ['action', 'meeting', 'decision', 'waiting'];
const categoryOptions: ManagerDeskCategory[] = [
  'analysis', 'design', 'team_management', 'cross_team',
  'follow_up', 'escalation', 'admin', 'planning', 'other',
];

export function QuickCapture({ onCapture, isPending }: Props) {
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<ManagerDeskItemKind | ''>('');
  const [category, setCategory] = useState<ManagerDeskCategory | ''>('');
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(() => {
    const trimmed = title.trim();
    if (!trimmed) return;
    onCapture(trimmed, kind || undefined, category || undefined);
    setTitle('');
    setKind('');
    setCategory('');
    setExpanded(false);
    inputRef.current?.focus();
  }, [title, kind, category, onCapture]);

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

  // Auto-focus on mount
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className="md-glass-panel rounded-[14px] overflow-hidden transition-all"
      style={{
        boxShadow: expanded
          ? '0 0 0 1px var(--md-accent), 0 4px 24px rgba(217,169,78,0.08)'
          : undefined,
      }}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <div
          className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--md-accent-glow)', color: 'var(--md-accent)' }}
        >
          <Plus size={14} />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={e => {
            setTitle(e.target.value);
            if (e.target.value && !expanded) setExpanded(true);
          }}
          onFocus={() => title && setExpanded(true)}
          onKeyDown={handleKeyDown}
          placeholder="Quick capture — type and press Enter…"
          className="flex-1 bg-transparent outline-none text-[13px] font-medium placeholder:font-normal"
          style={{
            color: 'var(--text-primary)',
            caretColor: 'var(--md-accent)',
          }}
          disabled={isPending}
          maxLength={200}
        />

        <button
          onClick={handleSubmit}
          disabled={!title.trim() || isPending}
          className="h-7 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all disabled:opacity-30"
          style={{
            background: 'var(--md-accent)',
            color: '#000',
          }}
        >
          {isPending ? '…' : 'Add'}
        </button>
      </div>

      {/* Expanded options row */}
      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="border-t px-3 py-1.5 flex items-center gap-3"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-1.5">
            <Zap size={10} style={{ color: 'var(--text-muted)' }} />
            <select
              value={kind}
              onChange={e => setKind(e.target.value as ManagerDeskItemKind | '')}
              className="bg-transparent text-[11px] font-medium outline-none cursor-pointer"
              style={{ color: kind ? 'var(--text-primary)' : 'var(--text-muted)' }}
            >
              <option value="">Kind…</option>
              {kindOptions.map(k => (
                <option key={k} value={k}>{KIND_LABELS[k]}</option>
              ))}
            </select>
          </div>

          <div className="w-px h-3.5" style={{ background: 'var(--border)' }} />

          <div className="flex items-center gap-1.5">
            <Tag size={10} style={{ color: 'var(--text-muted)' }} />
            <select
              value={category}
              onChange={e => setCategory(e.target.value as ManagerDeskCategory | '')}
              className="bg-transparent text-[11px] font-medium outline-none cursor-pointer"
              style={{ color: category ? 'var(--text-primary)' : 'var(--text-muted)' }}
            >
              <option value="">Category…</option>
              {categoryOptions.map(c => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </div>

          <span className="ml-auto text-[10px]" style={{ color: 'var(--text-muted)' }}>
            ↵ Enter to add
          </span>
        </motion.div>
      )}
    </div>
  );
}

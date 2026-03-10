import { motion } from 'framer-motion';
import { Play, CheckCircle2, XCircle, Zap } from 'lucide-react';
import type { TrackerWorkItem } from '@/types';
import { formatDate, priorityColor } from '@/lib/utils';

interface CurrentTaskProps {
  item?: TrackerWorkItem;
  onMarkDone?: (id: number) => void;
  onDrop?: (id: number) => void;
  hasPlannedItems?: boolean;
}

export function CurrentTask({ item, onMarkDone, onDrop, hasPlannedItems }: CurrentTaskProps) {
  if (!item) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-2xl p-5 text-center"
        style={{
          background: 'var(--bg-tertiary)',
          border: '1px dashed var(--border-strong)',
        }}
      >
        <div
          className="h-10 w-10 rounded-xl flex items-center justify-center mx-auto mb-3"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
        >
          <Play size={18} />
        </div>
        <p className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
          No active task
        </p>
        <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
          {hasPlannedItems
            ? 'Select a planned item below to start working'
            : 'Add a task to get started'}
        </p>
      </motion.div>
    );
  }

  const jiraMeta = [
    item.jiraPriorityName,
    item.jiraDueDate ? `Due ${formatDate(item.jiraDueDate)}` : undefined,
  ]
    .filter(Boolean)
    .join(' · ');
  const jiraLabel = item.jiraSummary && item.jiraSummary !== item.title
    ? `${item.jiraKey} · ${item.jiraSummary}`
    : item.jiraKey;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl p-4 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(6, 182, 212, 0.02) 100%)',
        border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)',
        boxShadow: '0 0 30px rgba(6, 182, 212, 0.06)',
      }}
    >
      {/* Accent glow line at top */}
      <div
        className="absolute top-0 left-4 right-4 h-[2px] rounded-full"
        style={{
          background: 'linear-gradient(90deg, transparent, var(--accent), transparent)',
          opacity: 0.5,
        }}
      />

      <div className="flex items-start gap-3">
        <div
          className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}
        >
          <Zap size={16} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[10px] font-bold uppercase"
              style={{ color: 'var(--accent)', letterSpacing: '0.1em' }}
            >
              Working On
            </span>
          </div>

          <h3
            className="text-[15px] font-semibold leading-snug"
            style={{ color: 'var(--text-primary)' }}
          >
            {item.title}
          </h3>

          {item.jiraKey && (
            <div className="mt-1.5 flex items-center gap-2">
              <span
                className="text-[10px] font-bold uppercase"
                style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}
              >
                Linked Jira
              </span>
              <span
                className="font-mono text-[11px] truncate"
                style={{ color: 'var(--accent)' }}
              >
                {jiraLabel}
              </span>
            </div>
          )}

          {jiraMeta && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <span
                className="text-[11px]"
                style={{
                  color: item.jiraPriorityName
                    ? priorityColor(item.jiraPriorityName)
                    : 'var(--text-muted)',
                }}
              >
                {jiraMeta}
              </span>
            </div>
          )}

          {item.note && (
            <p
              className="text-[12px] mt-2 leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              {item.note}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-4 pl-12">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => onMarkDone?.(item.id)}
          className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-semibold transition-colors"
          style={{
            background: 'rgba(16, 185, 129, 0.12)',
            color: 'var(--success)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
          }}
        >
          <CheckCircle2 size={13} />
          Mark Done
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => onDrop?.(item.id)}
          className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-medium transition-colors"
          style={{
            background: 'var(--bg-tertiary)',
            color: 'var(--text-muted)',
            border: '1px solid var(--border)',
          }}
        >
          <XCircle size={13} />
          Drop
        </motion.button>
      </div>
    </motion.div>
  );
}

import { motion } from 'framer-motion';
import { Inbox, Sparkles } from 'lucide-react';

interface Props {
  date: string;
}

export function EmptyDay({ date }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="md-glass-panel rounded-xl px-4 py-6 flex flex-col items-center text-center"
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
        style={{ background: 'var(--md-accent-glow)' }}
      >
        <Sparkles size={18} style={{ color: 'var(--md-accent)' }} />
      </div>

      <h3
        className="text-[13px] font-semibold mb-0.5"
        style={{ color: 'var(--text-primary)' }}
      >
        Clean slate
      </h3>
      <p className="text-[11px] max-w-xs" style={{ color: 'var(--text-secondary)' }}>
        No items for {date}. Use quick capture to start, or carry forward from yesterday.
      </p>

      <div className="flex items-center gap-1 mt-2 text-[9px] font-medium" style={{ color: 'var(--text-muted)' }}>
        <Inbox size={10} />
        Type in capture bar and press Enter
      </div>
    </motion.div>
  );
}

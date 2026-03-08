import { motion } from 'framer-motion';
import { Inbox, Sparkles } from 'lucide-react';

interface Props {
  date: string;
}

export function EmptyDay({ date }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="md-glass-panel rounded-[14px] px-6 py-12 flex flex-col items-center text-center"
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'var(--md-accent-glow)' }}
      >
        <Sparkles size={24} style={{ color: 'var(--md-accent)' }} />
      </div>

      <h3
        className="text-[15px] font-semibold mb-1"
        style={{ color: 'var(--text-primary)' }}
      >
        Clean slate
      </h3>
      <p className="text-[12px] max-w-xs" style={{ color: 'var(--text-secondary)' }}>
        No items for {date}. Use quick capture above to start planning your day, 
        or carry forward unfinished items from yesterday.
      </p>

      <div className="flex items-center gap-1.5 mt-4 text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
        <Inbox size={11} />
        Type in the capture bar and press Enter
      </div>
    </motion.div>
  );
}

import { motion, AnimatePresence } from 'framer-motion';
import { XCircle } from 'lucide-react';
import type { TrackerWorkItem } from '@/types';

interface DroppedWorkProps {
  items: TrackerWorkItem[];
}

export function DroppedWork({ items }: DroppedWorkProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1">
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 rounded-lg px-3 py-2"
            style={{
              background: 'var(--bg-secondary)',
              opacity: 0.6,
            }}
          >
            <XCircle size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                {item.jiraKey && (
                  <span
                    className="font-mono text-[10px] font-semibold shrink-0"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {item.jiraKey}
                  </span>
                )}
                <span
                  className="text-[12px] truncate line-through"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {item.title}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

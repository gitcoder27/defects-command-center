import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { JiraIssueLink } from '@/components/JiraIssueLink';
import type { TrackerWorkItem } from '@/types';
import { formatRelativeTime } from '@/lib/utils';

interface CompletedWorkProps {
  items: TrackerWorkItem[];
}

export function CompletedWork({ items }: CompletedWorkProps) {
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
            style={{ background: 'var(--bg-secondary)' }}
          >
            <CheckCircle2 size={13} style={{ color: 'var(--success)', flexShrink: 0 }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  className="text-[13px] truncate line-through"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {item.title}
                </span>
              </div>
              {item.jiraKey && (
                <div className="mt-0.5">
                  <JiraIssueLink issueKey={item.jiraKey} className="font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {item.jiraSummary && item.jiraSummary !== item.title
                      ? `${item.jiraKey} · ${item.jiraSummary}`
                      : item.jiraKey}
                  </JiraIssueLink>
                </div>
              )}
              {item.note && (
                <div className="mt-1">
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {item.note}
                  </span>
                </div>
              )}
            </div>
            {item.completedAt && (
              <span className="text-[11px] shrink-0" style={{ color: 'var(--text-muted)' }}>
                {formatRelativeTime(item.completedAt)}
              </span>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

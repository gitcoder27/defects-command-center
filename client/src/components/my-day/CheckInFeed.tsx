import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageSquare, Clock } from 'lucide-react';
import type { TrackerCheckIn, TrackerDeveloperStatus } from '@/types';
import { formatRelativeTime } from '@/lib/utils';

interface CheckInFeedProps {
  checkIns: TrackerCheckIn[];
  onAddCheckIn: (summary: string, status?: TrackerDeveloperStatus) => void;
  isPending?: boolean;
}

export function CheckInFeed({ checkIns, onAddCheckIn, isPending }: CheckInFeedProps) {
  const [draft, setDraft] = useState('');

  const handleSubmit = () => {
    const text = draft.trim();
    if (!text) return;
    onAddCheckIn(text);
    setDraft('');
  };

  return (
    <div className="space-y-3">
      {/* Quick input */}
      <div
        className="flex items-start gap-2 rounded-xl p-3"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
        }}
      >
        <MessageSquare
          size={14}
          className="mt-1.5 shrink-0"
          style={{ color: 'var(--text-muted)' }}
        />
        <div className="flex-1 min-w-0">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Quick update... what's happening?"
            rows={2}
            className="w-full text-[13px] outline-none resize-none bg-transparent"
            style={{
              color: 'var(--text-primary)',
            }}
          />
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              Press Enter to send
            </span>
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={handleSubmit}
              disabled={!draft.trim() || isPending}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all disabled:opacity-40"
              style={{
                background: draft.trim() ? 'var(--accent-glow)' : 'var(--bg-tertiary)',
                color: draft.trim() ? 'var(--accent)' : 'var(--text-muted)',
                border: `1px solid ${draft.trim() ? 'color-mix(in srgb, var(--accent) 30%, transparent)' : 'var(--border)'}`,
              }}
            >
              <Send size={10} />
              Send
            </motion.button>
          </div>
        </div>
      </div>

      {/* Timeline */}
      {checkIns.length > 0 && (
        <div className="space-y-0">
          <AnimatePresence initial={false}>
            {checkIns.map((ci, idx) => (
              <motion.div
                key={ci.id}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="flex gap-3 py-2.5 relative"
              >
                {/* Timeline connector */}
                <div className="flex flex-col items-center shrink-0 pt-0.5">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{
                      background: idx === 0 ? 'var(--accent)' : 'var(--text-muted)',
                      boxShadow: idx === 0 ? '0 0 8px var(--accent-glow)' : 'none',
                    }}
                  />
                  {idx < checkIns.length - 1 && (
                    <div
                      className="w-px flex-1 mt-1"
                      style={{ background: 'var(--border)' }}
                    />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 -mt-0.5">
                  <p
                    className="text-[12px] leading-relaxed"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {ci.summary}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Clock size={9} style={{ color: 'var(--text-muted)' }} />
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {formatRelativeTime(ci.createdAt)}
                    </span>
                    {ci.authorType && (
                      <span
                        className="text-[9px] uppercase font-semibold px-1 rounded"
                        style={{
                          color: ci.authorType === 'manager' ? 'var(--warning)' : 'var(--accent)',
                          background:
                            ci.authorType === 'manager'
                              ? 'rgba(245, 158, 11, 0.1)'
                              : 'rgba(6, 182, 212, 0.1)',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {ci.authorType}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {checkIns.length === 0 && (
        <p className="text-[11px] text-center py-2" style={{ color: 'var(--text-muted)' }}>
          No updates yet today
        </p>
      )}
    </div>
  );
}

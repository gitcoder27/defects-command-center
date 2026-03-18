import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';
import type { TrackerAttentionActionItem } from '@/types';

interface SetCurrentMenuProps {
  candidates: TrackerAttentionActionItem[];
  isPending: boolean;
  onSelect: (itemId: number) => void;
  onClose: () => void;
}

export function SetCurrentMenu({ candidates, isPending, onSelect, onClose }: SetCurrentMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, y: -4, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -4, scale: 0.97 }}
        transition={{ duration: 0.12 }}
        className="absolute bottom-full left-0 mb-1.5 z-50 w-[260px] rounded-xl border overflow-hidden"
        style={{
          background: 'var(--bg-secondary)',
          borderColor: 'color-mix(in srgb, var(--accent) 20%, var(--border-strong))',
          boxShadow: '0 12px 40px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.03) inset',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="px-3 py-2 text-[11px] font-semibold"
          style={{
            color: 'var(--text-secondary)',
            borderBottom: '1px solid var(--border)',
            background: 'color-mix(in srgb, var(--accent-glow) 30%, transparent)',
          }}
        >
          Set as current work
        </div>
        <div className="py-1 max-h-[200px] overflow-y-auto">
          {candidates.map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              disabled={isPending}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(candidate.id);
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors disabled:opacity-40"
              style={{ color: 'var(--text-primary)' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'color-mix(in srgb, var(--accent) 8%, transparent)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              <Zap size={12} style={{ color: 'var(--accent)', flexShrink: 0, opacity: 0.7 }} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] font-medium">{candidate.title}</div>
                {candidate.jiraKey && (
                  <div className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                    {candidate.jiraKey}
                  </div>
                )}
              </div>
              {candidate.lifecycle === 'manager_desk_linked' && (
                <span
                  className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium"
                  style={{
                    color: 'var(--md-accent)',
                    background: 'rgba(217,169,78,0.1)',
                    border: '1px solid rgba(217,169,78,0.18)',
                  }}
                >
                  Desk
                </span>
              )}
            </button>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

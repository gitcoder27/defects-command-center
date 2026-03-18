import { useEffect, useId, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Calendar, X } from 'lucide-react';
import type { TrackerDeveloperStatus } from '@/types';
import { TrackerStatusPill } from './TrackerStatusPill';

interface StatusUpdateSheetProps {
  developerName: string;
  currentStatus: TrackerDeveloperStatus;
  isPending: boolean;
  onSubmit: (params: {
    status: TrackerDeveloperStatus;
    rationale?: string;
    summary?: string;
    nextFollowUpAt?: string | null;
  }) => void;
  onClose: () => void;
}

const statuses: TrackerDeveloperStatus[] = ['on_track', 'at_risk', 'blocked', 'waiting', 'done_for_today'];

const statusMeta: Record<TrackerDeveloperStatus, { label: string; accent: string; bg: string }> = {
  on_track: { label: 'On Track', accent: 'var(--success)', bg: 'rgba(16,185,129,0.12)' },
  at_risk: { label: 'At Risk', accent: 'var(--warning)', bg: 'rgba(245,158,11,0.12)' },
  blocked: { label: 'Blocked', accent: 'var(--danger)', bg: 'rgba(239,68,68,0.12)' },
  waiting: { label: 'Waiting', accent: 'var(--info)', bg: 'rgba(59,130,246,0.12)' },
  done_for_today: { label: 'Done', accent: 'var(--accent)', bg: 'rgba(6,182,212,0.12)' },
};

function needsRationale(status: TrackerDeveloperStatus): boolean {
  return status === 'blocked' || status === 'at_risk';
}

export function StatusUpdateSheet({
  developerName,
  currentStatus,
  isPending,
  onSubmit,
  onClose,
}: StatusUpdateSheetProps) {
  const titleId = useId();
  const [status, setStatus] = useState<TrackerDeveloperStatus>(currentStatus);
  const [rationale, setRationale] = useState('');
  const [summary, setSummary] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [showFollowUp, setShowFollowUp] = useState(false);
  const rationaleRef = useRef<HTMLTextAreaElement>(null);

  const rationaleRequired = needsRationale(status);
  const canSubmit = !isPending && (!rationaleRequired || rationale.trim().length > 0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (rationaleRequired) {
      const timer = window.setTimeout(() => rationaleRef.current?.focus(), 80);
      return () => window.clearTimeout(timer);
    }
  }, [rationaleRequired]);

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit({
      status,
      rationale: rationale.trim() || undefined,
      summary: summary.trim() || undefined,
      nextFollowUpAt: followUp || null,
    });
  }

  return (
    <>
      {/* Scrim */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.12 }}
        className="fixed inset-0 z-[80]"
        style={{ background: 'rgba(6, 10, 15, 0.45)', backdropFilter: 'blur(3px)' }}
        onClick={onClose}
      />
      {/* Sheet */}
      <div className="fixed inset-0 z-[81] flex items-start justify-center pt-[14vh] overflow-hidden" style={{ pointerEvents: 'none' }}>
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.97 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="w-[calc(100%-2rem)] max-w-[400px] rounded-2xl border overflow-hidden"
          style={{
            pointerEvents: 'auto',
            background: 'var(--bg-secondary)',
            borderColor: 'var(--border-strong)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.03) inset',
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="flex items-center gap-2.5 px-4 py-3"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
              style={{ background: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)' }}
            >
              <Activity size={13} />
            </div>
            <div className="min-w-0 flex-1">
              <div id={titleId} className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                Update status — {developerName}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Current:</span>
                <TrackerStatusPill status={currentStatus} />
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
              aria-label="Close status update"
            >
              <X size={14} />
            </button>
          </div>

          {/* Body */}
          <div className="px-4 py-3 space-y-3">
            {/* Status selector */}
            <div className="flex flex-wrap gap-1.5">
              {statuses.map((s) => {
                const meta = statusMeta[s];
                const active = status === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-all"
                    style={{
                      background: active ? meta.bg : 'var(--bg-tertiary)',
                      color: active ? meta.accent : 'var(--text-muted)',
                      border: `1px solid ${active ? `color-mix(in srgb, ${meta.accent} 30%, transparent)` : 'var(--border)'}`,
                      boxShadow: active ? `0 0 8px color-mix(in srgb, ${meta.accent} 10%, transparent)` : undefined,
                    }}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>

            {/* Rationale — shown for blocked/at_risk */}
            {rationaleRequired && (
              <div>
                <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Rationale <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <textarea
                  ref={rationaleRef}
                  value={rationale}
                  onChange={(e) => setRationale(e.target.value)}
                  placeholder={status === 'blocked' ? 'What is blocking them?' : 'What is the risk?'}
                  rows={2}
                  className="w-full rounded-xl px-3 py-2 text-[12px] outline-none resize-none"
                  style={{
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    border: `1px solid ${rationaleRequired && rationale.trim().length === 0 ? 'color-mix(in srgb, var(--danger) 30%, var(--border))' : 'var(--border)'}`,
                  }}
                  maxLength={2000}
                />
              </div>
            )}

            {/* Optional note */}
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Optional note…"
              rows={1}
              className="w-full rounded-xl px-3 py-2 text-[12px] outline-none resize-none"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
              }}
              maxLength={2000}
            />

            {/* Follow-up datetime toggle */}
            {!showFollowUp ? (
              <button
                type="button"
                onClick={() => setShowFollowUp(true)}
                className="flex items-center gap-1.5 text-[11px] font-medium transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--accent)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
              >
                <Calendar size={11} />
                Add follow-up time
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <Calendar size={11} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <input
                  type="datetime-local"
                  value={followUp}
                  onChange={(e) => setFollowUp(e.target.value)}
                  className="flex-1 rounded-lg px-2.5 py-1.5 text-[11px] font-mono outline-none"
                  style={{
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => { setFollowUp(''); setShowFollowUp(false); }}
                  className="flex h-6 w-6 items-center justify-center rounded-md"
                  style={{ color: 'var(--text-muted)', background: 'var(--bg-tertiary)' }}
                  aria-label="Remove follow-up"
                >
                  <X size={10} />
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-end gap-2 px-4 py-2.5"
            style={{ borderTop: '1px solid var(--border)', background: 'color-mix(in srgb, var(--bg-tertiary) 40%, transparent)' }}
          >
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-2.5 py-1.5 text-[11px] font-medium"
              style={{ color: 'var(--text-muted)' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all disabled:opacity-40"
              style={{
                background: statusMeta[status].bg,
                color: statusMeta[status].accent,
                border: `1px solid color-mix(in srgb, ${statusMeta[status].accent} 30%, transparent)`,
              }}
            >
              {isPending ? 'Saving…' : 'Update Status'}
            </button>
          </div>
        </motion.div>
      </div>
    </>
  );
}

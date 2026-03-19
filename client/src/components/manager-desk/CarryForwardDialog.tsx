import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { format, addDays, parseISO } from 'date-fns';
import {
  AlertTriangle,
  ArrowRightFromLine,
  CalendarDays,
  CheckSquare,
  Clock,
  Layers3,
  Loader2,
  RefreshCw,
  Square,
  X,
} from 'lucide-react';
import type { ManagerDeskCarryForwardPreviewItem } from '@/types/manager-desk';
import { KIND_LABELS, STATUS_LABELS } from '@/types/manager-desk';
import { useManagerDeskCarryForwardPreview } from '@/hooks/useManagerDesk';

// ── Props ───────────────────────────────────────────────

interface Props {
  fromDate: string;
  /** Initial target date — only used when mode is 'header' (user picks date). In 'prompt' mode the target is fixed. */
  toDate: string;
  /** Whether the target date is editable (header mode) or fixed (prompt mode). */
  allowDateChange?: boolean;
  isPending: boolean;
  onConfirm: (toDate: string, itemIds?: number[]) => void;
  onClose: () => void;
}

// ── Helpers ─────────────────────────────────────────────

function formatTime(iso: string): string {
  try {
    const d = parseISO(iso);
    return format(d, 'h:mm a');
  } catch {
    return iso;
  }
}

function formatShortDate(iso: string): string {
  try {
    return format(parseISO(iso), 'EEE, MMM d');
  } catch {
    return iso;
  }
}

const WARNING_COPY: Record<string, string> = {
  follow_up_overdue_on_arrival: 'Follow-up will already be overdue on the target day',
  planned_end_overdue_on_arrival: 'Time window will already have ended on the target day',
};

// ── Item row ────────────────────────────────────────────

function PreviewItemRow({
  preview,
  isSelected,
  onToggle,
}: {
  preview: ManagerDeskCarryForwardPreviewItem;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const { item, rebasedPlannedStartAt, rebasedPlannedEndAt, rebasedFollowUpAt, warningCodes } = preview;
  const hasWarnings = warningCodes.length > 0;
  const hasTimeFields = rebasedPlannedStartAt || rebasedPlannedEndAt || rebasedFollowUpAt;

  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full rounded-2xl px-3 py-3 text-left transition-colors"
      style={{
        background: isSelected
          ? hasWarnings
            ? 'color-mix(in srgb, var(--md-accent-glow) 38%, color-mix(in srgb, var(--warning) 6%, var(--bg-tertiary)))'
            : 'color-mix(in srgb, var(--md-accent-glow) 54%, var(--bg-tertiary) 46%)'
          : 'transparent',
        border: isSelected
          ? hasWarnings
            ? '1px solid color-mix(in srgb, var(--warning) 28%, transparent)'
            : '1px solid color-mix(in srgb, var(--md-accent) 22%, transparent)'
          : '1px solid transparent',
      }}
    >
      <div className="flex items-start gap-3">
        <div className="pt-0.5 shrink-0">
          {isSelected ? (
            <CheckSquare size={15} style={{ color: hasWarnings ? 'var(--warning)' : 'var(--md-accent)' }} />
          ) : (
            <Square size={15} style={{ color: 'var(--text-muted)' }} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
            {item.title}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
              style={{
                background: 'var(--bg-secondary)',
                color: 'var(--text-muted)',
                border: '1px solid var(--border)',
              }}
            >
              {KIND_LABELS[item.kind]}
            </span>
            <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
              {STATUS_LABELS[item.status] ?? item.status.replace(/_/g, ' ')}
            </span>
          </div>

          {/* Rebased time fields */}
          {hasTimeFields && (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              {(rebasedPlannedStartAt || rebasedPlannedEndAt) && (
                <span
                  className="inline-flex items-center gap-1 text-[10px]"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <Clock size={10} />
                  {rebasedPlannedStartAt && rebasedPlannedEndAt
                    ? `${formatTime(rebasedPlannedStartAt)} – ${formatTime(rebasedPlannedEndAt)}`
                    : rebasedPlannedStartAt
                    ? `Starts ${formatTime(rebasedPlannedStartAt)}`
                    : `Ends ${formatTime(rebasedPlannedEndAt!)}`}
                </span>
              )}
              {rebasedFollowUpAt && (
                <span
                  className="inline-flex items-center gap-1 text-[10px]"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <RefreshCw size={9} />
                  Follow-up {formatTime(rebasedFollowUpAt)}
                </span>
              )}
            </div>
          )}

          {/* Warnings */}
          {hasWarnings && (
            <div className="mt-2 space-y-1">
              {warningCodes.map((code) => (
                <div
                  key={code}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-medium"
                  style={{
                    background: 'rgba(245, 158, 11, 0.10)',
                    color: 'var(--warning)',
                    border: '1px solid rgba(245, 158, 11, 0.18)',
                  }}
                  data-testid={`warning-${code}`}
                >
                  <AlertTriangle size={10} />
                  {WARNING_COPY[code] ?? code}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

// ── Main dialog ─────────────────────────────────────────

export function CarryForwardDialog({
  fromDate,
  toDate: initialToDate,
  allowDateChange = true,
  isPending,
  onConfirm,
  onClose,
}: Props) {
  const defaultToDate = useMemo(
    () => allowDateChange ? format(addDays(parseISO(fromDate), 1), 'yyyy-MM-dd') : initialToDate,
    [fromDate, allowDateChange, initialToDate],
  );
  const [toDate, setToDate] = useState(initialToDate);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const formattedFromDate = useMemo(() => formatShortDate(fromDate), [fromDate]);
  const formattedToDate = useMemo(() => formatShortDate(toDate), [toDate]);

  // Fetch preview from backend
  const isFutureDate = toDate > fromDate;
  const preview = useManagerDeskCarryForwardPreview(fromDate, toDate, isFutureDate);
  const previewItems = preview.data?.items ?? [];
  const overdueCount = preview.data?.overdueOnArrivalCount ?? 0;

  // Track items key to detect changes and reset selection
  const itemKey = previewItems.map((p) => p.item.id).join(',');
  const [lastItemKey, setLastItemKey] = useState('');

  // Reset selection when preview items change (including initial population)
  if (itemKey !== lastItemKey) {
    setLastItemKey(itemKey);
    if (itemKey !== '') {
      setSelected(new Set(previewItems.map((p) => p.item.id)));
    }
  }

  // Reset toDate if fromDate changes
  useEffect(() => {
    setToDate(defaultToDate);
  }, [defaultToDate]);

  // Keyboard + scroll lock
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const toggle = useCallback((id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((prev) =>
      prev.size === previewItems.length
        ? new Set()
        : new Set(previewItems.map((p) => p.item.id)),
    );
  }, [previewItems]);

  const handleConfirm = useCallback(() => {
    if (selected.size === 0) return;
    const allSelected = selected.size === previewItems.length;
    onConfirm(toDate, allSelected ? undefined : Array.from(selected));
  }, [onConfirm, previewItems.length, selected, toDate]);

  if (typeof document === 'undefined') return null;

  const isLoading = preview.isLoading || preview.isFetching;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-4 md:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0"
        style={{ background: 'rgba(6, 10, 15, 0.62)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex max-h-[min(88vh,760px)] w-full max-w-[720px] flex-col overflow-hidden rounded-[28px]"
        style={{
          background:
            'linear-gradient(180deg, color-mix(in srgb, var(--bg-primary) 95%, rgba(217,169,78,0.04)) 0%, var(--bg-secondary) 100%)',
          border: '1px solid color-mix(in srgb, var(--md-accent) 18%, var(--border-strong) 82%)',
          boxShadow: '0 32px 88px rgba(0,0,0,0.42)',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="manager-desk-carry-forward-title"
        onClick={(event) => event.stopPropagation()}
      >
        {/* ── Header ────────────────────────────────────── */}
        <div
          className="shrink-0 border-b px-4 py-4 sm:px-5"
          style={{
            borderColor: 'color-mix(in srgb, var(--md-accent) 14%, var(--border) 86%)',
            background:
              'linear-gradient(135deg, color-mix(in srgb, var(--md-accent-glow) 78%, transparent) 0%, transparent 70%)',
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-2xl shrink-0"
                  style={{
                    background: 'var(--md-accent-glow)',
                    color: 'var(--md-accent)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)',
                  }}
                >
                  <ArrowRightFromLine size={18} />
                </div>
                <div>
                  <div
                    id="manager-desk-carry-forward-title"
                    className="text-[16px] font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Carry Forward
                  </div>
                  <div className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                    Move unfinished work from {formattedFromDate} into {formattedToDate}.
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <div
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium"
                  style={{
                    background: 'rgba(217,169,78,0.12)',
                    color: 'var(--md-accent)',
                    border: '1px solid rgba(217,169,78,0.22)',
                  }}
                >
                  <Layers3 size={12} />
                  {isLoading ? '…' : `${selected.size} of ${previewItems.length} selected`}
                </div>
                <div
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium"
                  style={{
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <CalendarDays size={12} />
                  Target: {formattedToDate}
                </div>
                {overdueCount > 0 && !isLoading && (
                  <div
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium"
                    style={{
                      background: 'rgba(245, 158, 11, 0.10)',
                      color: 'var(--warning)',
                      border: '1px solid rgba(245, 158, 11, 0.22)',
                    }}
                  >
                    <AlertTriangle size={11} />
                    {overdueCount} overdue on arrival
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl transition-colors shrink-0"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
              aria-label="Close carry forward dialog"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Body ──────────────────────────────────────── */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 sm:px-5">
          <div className="space-y-4">
            {/* Date + controls row */}
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <div>
                <label
                  className="mb-1.5 block text-[11px] font-semibold uppercase"
                  style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}
                >
                  Carry to date
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  min={defaultToDate}
                  disabled={!allowDateChange}
                  className="w-full rounded-xl px-3 py-2 text-[13px] outline-none disabled:opacity-60"
                  style={{
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border)',
                  }}
                />
              </div>

              <button
                type="button"
                onClick={toggleAll}
                disabled={isLoading || previewItems.length === 0}
                className="rounded-xl px-3 py-2 text-[11px] font-semibold transition-colors disabled:opacity-50"
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--md-accent)',
                  border: '1px solid color-mix(in srgb, var(--md-accent) 18%, var(--border) 82%)',
                }}
              >
                {selected.size === previewItems.length && previewItems.length > 0 ? 'Deselect all' : 'Select all'}
              </button>
            </div>

            {/* Time rebase info */}
            <div
              className="flex items-start gap-2.5 rounded-xl px-3 py-2.5"
              style={{
                background: 'color-mix(in srgb, var(--md-accent) 5%, var(--bg-tertiary))',
                border: '1px solid color-mix(in srgb, var(--md-accent) 12%, var(--border))',
              }}
            >
              <Clock size={13} className="mt-0.5 shrink-0" style={{ color: 'var(--md-accent)' }} />
              <div className="text-[11px] leading-[1.5]" style={{ color: 'var(--text-secondary)' }}>
                Scheduled times are automatically rebased to the target day. The original time-of-day is preserved.
              </div>
            </div>

            {/* Items list */}
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label
                  className="text-[11px] font-semibold uppercase"
                  style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}
                >
                  Unfinished items
                </label>
                {!isLoading && previewItems.length > 0 && (
                  <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    Choose what should appear on {formattedToDate}.
                  </span>
                )}
              </div>

              {!isFutureDate && (
                <p className="mb-2 text-[11px]" style={{ color: 'var(--danger)' }}>
                  Carry forward only supports dates after {formattedFromDate}.
                </p>
              )}

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2
                    size={20}
                    className="animate-spin"
                    style={{ color: 'var(--md-accent)' }}
                  />
                </div>
              ) : previewItems.length === 0 ? (
                <div
                  className="rounded-[18px] px-4 py-6 text-center text-[12px]"
                  style={{ background: 'color-mix(in srgb, var(--bg-secondary) 88%, transparent)', color: 'var(--text-muted)' }}
                >
                  No items are eligible to carry forward.
                </div>
              ) : (
                <div
                  className="space-y-1 rounded-[18px] p-2"
                  style={{ background: 'color-mix(in srgb, var(--bg-secondary) 88%, transparent)' }}
                >
                  {previewItems.map((pi) => (
                    <PreviewItemRow
                      key={pi.item.id}
                      preview={pi}
                      isSelected={selected.has(pi.item.id)}
                      onToggle={() => toggle(pi.item.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Footer ────────────────────────────────────── */}
        <div
          className="shrink-0 border-t px-4 py-4 sm:px-5"
          style={{
            borderColor: 'color-mix(in srgb, var(--md-accent) 14%, var(--border) 86%)',
            background: 'color-mix(in srgb, var(--bg-primary) 90%, transparent)',
          }}
        >
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-3 py-2 text-[12px] font-medium transition-colors"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={selected.size === 0 || isPending || !isFutureDate || isLoading}
              className="rounded-xl px-4 py-2 text-[12px] font-bold uppercase tracking-wide transition-all disabled:opacity-40"
              style={{
                background: 'var(--md-accent)',
                color: '#000',
              }}
            >
              {isPending ? 'Carrying…' : `Carry ${selected.size} item${selected.size !== 1 ? 's' : ''} forward`}
            </button>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}

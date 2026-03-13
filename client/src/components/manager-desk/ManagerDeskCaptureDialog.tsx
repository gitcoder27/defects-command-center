import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Briefcase,
  Bug,
  CalendarDays,
  FileText,
  Plus,
  Tag,
  UserRound,
  X,
  Zap,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useToast } from '@/context/ToastContext';
import { useCreateManagerDeskItem } from '@/hooks/useManagerDesk';
import { JiraIssueLink } from '@/components/JiraIssueLink';
import { getLocalIsoDate } from '@/lib/utils';
import type {
  ManagerDeskCategory,
  ManagerDeskCreateItemPayload,
  ManagerDeskItemKind,
} from '@/types/manager-desk';
import { CATEGORY_LABELS, KIND_LABELS } from '@/types/manager-desk';

type CaptureLink = NonNullable<ManagerDeskCreateItemPayload['links']>[number];

interface ContextChip {
  label: string;
  value: string;
  tone?: 'issue' | 'developer' | 'generic';
}

interface ManagerDeskCaptureDialogProps {
  onClose: () => void;
  onOpenManagerDesk?: () => void;
  heading?: string;
  description?: string;
  initialTitle?: string;
  initialKind?: ManagerDeskItemKind;
  initialCategory?: ManagerDeskCategory;
  initialContextNote?: string;
  initialLinks?: CaptureLink[];
  contextChips?: ContextChip[];
  date?: string;
}

const kindOptions: ManagerDeskItemKind[] = ['action', 'meeting', 'decision', 'waiting'];
const categoryOptions: ManagerDeskCategory[] = [
  'analysis',
  'design',
  'team_management',
  'cross_team',
  'follow_up',
  'escalation',
  'admin',
  'planning',
  'other',
];

function chipAccent(tone: ContextChip['tone']) {
  if (tone === 'issue') {
    return {
      background: 'color-mix(in srgb, var(--accent-glow) 72%, var(--bg-secondary) 28%)',
      border: 'color-mix(in srgb, var(--accent) 24%, transparent)',
      color: 'var(--accent)',
      Icon: Bug,
    };
  }

  if (tone === 'developer') {
    return {
      background: 'rgba(16,185,129,0.12)',
      border: 'rgba(16,185,129,0.24)',
      color: 'var(--success)',
      Icon: UserRound,
    };
  }

  return {
    background: 'var(--bg-tertiary)',
    border: 'var(--border)',
    color: 'var(--text-secondary)',
    Icon: Briefcase,
  };
}

export function ManagerDeskCaptureDialog({
  onClose,
  onOpenManagerDesk,
  heading = 'Capture For Manager Desk',
  description = 'Save a follow-up for today without losing the screen context you are already in.',
  initialTitle = '',
  initialKind = 'action',
  initialCategory = 'other',
  initialContextNote = '',
  initialLinks = [],
  contextChips = [],
  date,
}: ManagerDeskCaptureDialogProps) {
  const captureDate = date ?? getLocalIsoDate();
  const createItem = useCreateManagerDeskItem(captureDate);
  const { addToast } = useToast();
  const titleRef = useRef<HTMLInputElement>(null);
  const dialogTitleId = useId();
  const dialogDescriptionId = useId();
  const [title, setTitle] = useState(initialTitle);
  const [kind, setKind] = useState<ManagerDeskItemKind>(initialKind);
  const [category, setCategory] = useState<ManagerDeskCategory>(initialCategory);
  const [contextNote, setContextNote] = useState(initialContextNote);
  const [detailsOpen, setDetailsOpen] = useState(Boolean(initialContextNote));

  const formattedDate = useMemo(() => format(parseISO(captureDate), 'EEEE, MMM d'), [captureDate]);

  useEffect(() => {
    const timer = window.setTimeout(() => titleRef.current?.focus(), 140);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || createItem.isPending) {
      return;
    }

    createItem.mutate(
      {
        date: captureDate,
        title: trimmedTitle,
        kind,
        category,
        contextNote: contextNote.trim() || undefined,
        links: initialLinks.length > 0 ? initialLinks : undefined,
      },
      {
        onSuccess: () => {
          addToast({
            type: 'success',
            title: 'Saved to Manager Desk',
            message: `Scheduled for ${formattedDate}.`,
            action: onOpenManagerDesk
              ? {
                  label: 'Open Desk',
                  onClick: onOpenManagerDesk,
                }
              : undefined,
          });
          onClose();
        },
        onError: (error) => {
          addToast({
            type: 'error',
            title: 'Could not save to Manager Desk',
            message: error.message,
          });
        },
      },
    );
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80]"
        style={{ background: 'rgba(6, 10, 15, 0.6)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 18, scale: 0.96 }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-x-4 top-3 bottom-3 z-[81] mx-auto flex w-auto max-w-[640px] min-h-0 flex-col overflow-hidden rounded-[26px] md:inset-x-6 md:top-6 md:bottom-6"
        style={{
          background:
            'linear-gradient(180deg, color-mix(in srgb, var(--bg-primary) 94%, rgba(217,169,78,0.05)) 0%, var(--bg-secondary) 100%)',
          border: '1px solid color-mix(in srgb, var(--md-accent) 18%, var(--border-strong) 82%)',
          boxShadow: '0 30px 80px rgba(0, 0, 0, 0.42)',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogTitleId}
        aria-describedby={dialogDescriptionId}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="shrink-0 border-b px-4 py-3 sm:px-5 sm:py-4"
          style={{
            borderColor: 'color-mix(in srgb, var(--md-accent) 14%, var(--border) 86%)',
            background:
              'linear-gradient(135deg, color-mix(in srgb, var(--md-accent-glow) 78%, transparent) 0%, transparent 68%)',
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-2xl"
                  style={{
                    background: 'var(--md-accent-glow)',
                    color: 'var(--md-accent)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)',
                  }}
                >
                  <Plus size={18} />
                </div>
                <div>
                  <div id={dialogTitleId} className="text-[15px] font-semibold sm:text-[16px]" style={{ color: 'var(--text-primary)' }}>
                    {heading}
                  </div>
                  <div id={dialogDescriptionId} className="text-[11px] sm:text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                    {description}
                  </div>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl transition-colors"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
              aria-label="Close manager desk capture"
            >
              <X size={16} />
            </button>
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
              <CalendarDays size={12} />
              {formattedDate}
            </div>

            {contextChips.map((chip) => {
              const accent = chipAccent(chip.tone);
              const Icon = accent.Icon;
              const chipContent = (
                <>
                  <Icon size={12} />
                  <span className="opacity-80">{chip.label}</span>
                  <span>{chip.value}</span>
                </>
              );

              if (chip.tone === 'issue') {
                return (
                  <JiraIssueLink
                    key={`${chip.label}-${chip.value}`}
                    issueKey={chip.value}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium"
                    style={{
                      background: accent.background,
                      color: accent.color,
                      border: `1px solid ${accent.border}`,
                    }}
                  >
                    {chipContent}
                  </JiraIssueLink>
                );
              }

              return (
                <div
                  key={`${chip.label}-${chip.value}`}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium"
                  style={{
                    background: accent.background,
                    color: accent.color,
                    border: `1px solid ${accent.border}`,
                  }}
                >
                  {chipContent}
                </div>
              );
            })}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
          <div className="space-y-4">
          <div>
            <label
              htmlFor="manager-desk-capture-title"
              className="mb-1.5 block text-[11px] font-semibold uppercase"
              style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}
            >
              Task
            </label>
            <input
              id="manager-desk-capture-title"
              ref={titleRef}
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="What should land in your Manager Desk?"
              className="w-full rounded-2xl px-4 py-3 text-[14px] outline-none transition-colors"
              style={{
                background: 'color-mix(in srgb, var(--bg-tertiary) 92%, transparent)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
              }}
              maxLength={200}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-[1.5fr_1fr]">
            <div>
              <div
                className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase"
                style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}
              >
                <Zap size={12} />
                Kind
              </div>
              <div className="grid grid-cols-2 gap-2">
                {kindOptions.map((option) => {
                  const isActive = kind === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setKind(option)}
                      className="rounded-2xl px-3 py-2.5 text-[12px] font-medium transition-all"
                      style={{
                        background: isActive
                          ? 'linear-gradient(135deg, var(--md-accent-glow), rgba(217,169,78,0.08))'
                          : 'var(--bg-tertiary)',
                        color: isActive ? 'var(--md-accent)' : 'var(--text-secondary)',
                        border: `1px solid ${isActive ? 'rgba(217,169,78,0.26)' : 'var(--border)'}`,
                        boxShadow: isActive ? '0 10px 24px rgba(217,169,78,0.08)' : undefined,
                      }}
                    >
                      {KIND_LABELS[option]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label
                htmlFor="manager-desk-capture-category"
                className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase"
                style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}
              >
                <Tag size={12} />
                Category
              </label>
              <select
                id="manager-desk-capture-category"
                value={category}
                onChange={(event) => setCategory(event.target.value as ManagerDeskCategory)}
                className="w-full rounded-2xl px-3 py-3 text-[13px] outline-none"
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                }}
              >
                {categoryOptions.map((option) => (
                  <option key={option} value={option}>
                    {CATEGORY_LABELS[option]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div
            className="overflow-hidden rounded-[22px] border"
            style={{ borderColor: 'var(--border)' }}
          >
            <button
              type="button"
              onClick={() => setDetailsOpen((current) => !current)}
              className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors"
              style={{
                background: detailsOpen ? 'color-mix(in srgb, var(--bg-tertiary) 92%, transparent)' : 'transparent',
              }}
            >
              <span className="flex items-center gap-2 text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>
                <FileText size={13} style={{ color: 'var(--text-secondary)' }} />
                Add context note
              </span>
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {detailsOpen ? 'Hide' : 'Optional'}
              </span>
            </button>

            {detailsOpen && (
              <div className="border-t px-4 py-4" style={{ borderColor: 'var(--border)' }}>
                <textarea
                  value={contextNote}
                  onChange={(event) => setContextNote(event.target.value)}
                  rows={4}
                  placeholder="Add a little context so future-you remembers why this was captured."
                  className="w-full rounded-2xl px-3 py-2.5 text-[13px] outline-none resize-y"
                  style={{
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border)',
                    minHeight: '96px',
                  }}
                  maxLength={1500}
                />
              </div>
            )}
          </div>
          </div>
        </div>

        <div
          className="shrink-0 border-t px-4 py-3 sm:px-5 sm:py-4"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-[11px] sm:text-[12px]" style={{ color: 'var(--text-secondary)' }}>
              This lands in your Manager Desk inbox for <span style={{ color: 'var(--text-primary)' }}>{formattedDate}</span>.
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-3.5 py-2 text-[12px] font-medium transition-colors"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!title.trim() || createItem.isPending}
                className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-[12px] font-semibold transition-all disabled:opacity-50"
                style={{
                  background: 'var(--md-accent)',
                  color: '#111',
                  boxShadow: '0 10px 24px rgba(217,169,78,0.18)',
                }}
              >
                <Briefcase size={13} />
                {createItem.isPending ? 'Saving...' : 'Add To Manager Desk'}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}

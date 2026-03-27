import { ArrowRightFromLine, X } from 'lucide-react';

interface Props {
  carryableCount: number;
  sourceDate: string;
  viewedDate: string;
  isPending: boolean;
  onReviewAndCarry: () => void;
  onDismiss: () => void;
}

export function CarryForwardPrompt({
  carryableCount,
  sourceDate,
  viewedDate,
  isPending,
  onReviewAndCarry,
  onDismiss,
}: Props) {
  return (
    <div
      className="flex items-center justify-between gap-3 rounded-2xl border px-3 py-2.5"
      style={{
        background:
          'linear-gradient(135deg, color-mix(in srgb, var(--md-accent) 6%, var(--bg-secondary)) 0%, var(--bg-secondary) 100%)',
        borderColor: 'color-mix(in srgb, var(--md-accent) 18%, var(--border))',
      }}
      role="status"
      data-testid="carry-forward-prompt"
    >
      <div className="min-w-0">
        <div className="text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>
          {carryableCount} unfinished item{carryableCount === 1 ? '' : 's'} from{' '}
          <span style={{ color: 'var(--md-accent)' }}>{sourceDate}</span>
        </div>
        <div className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
          Review and carry items into {viewedDate}.
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onReviewAndCarry}
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-semibold transition-colors disabled:opacity-50"
          style={{
            background: 'var(--md-accent)',
            borderColor: 'var(--md-accent)',
            color: '#000',
          }}
        >
          <ArrowRightFromLine size={11} />
          Review &amp; Carry
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
          style={{ color: 'var(--text-muted)' }}
          aria-label="Dismiss carry-forward prompt"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

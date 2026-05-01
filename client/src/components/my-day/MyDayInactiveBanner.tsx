import { CalendarX2 } from 'lucide-react';
import type { DeveloperAvailability } from '@/types';

interface MyDayInactiveBannerProps {
  availability: DeveloperAvailability;
}

export function MyDayInactiveBanner({ availability }: MyDayInactiveBannerProps) {
  if (availability.state !== 'inactive') {
    return null;
  }

  return (
    <div
      className="rounded-3xl border px-4 py-3"
      style={{
        borderColor: 'rgba(245, 158, 11, 0.24)',
        background: 'color-mix(in srgb, rgba(245, 158, 11, 0.12) 72%, var(--bg-primary) 28%)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
          style={{ background: 'rgba(245, 158, 11, 0.12)', color: 'var(--warning)' }}
        >
          <CalendarX2 size={18} />
        </div>
        <div>
          <div className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            You are marked inactive for this day
          </div>
          <div className="mt-1 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
            {availability.note || 'A manager marked this day unavailable. Your workspace is read-only until you are reactivated.'}
          </div>
        </div>
      </div>
    </div>
  );
}

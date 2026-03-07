import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

interface OverviewCardProps {
  label: string;
  count: number;
  color: string;
  isActive: boolean;
  onClick: () => void;
  delay?: number;
}

function AnimatedCounter({ value, duration = 600 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    const from = 0;
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplay(Math.round(from + (value - from) * eased));
      if (progress < 1) {
        ref.current = requestAnimationFrame(animate);
      }
    };
    ref.current = requestAnimationFrame(animate);
    return () => {
      if (ref.current) cancelAnimationFrame(ref.current);
    };
  }, [value, duration]);

  return <>{display}</>;
}

export function OverviewCard({ label, count, color, isActive, onClick, delay = 0 }: OverviewCardProps) {
  const activeCountColor = `color-mix(in srgb, ${color} 22%, #0f172a 78%)`;

  return (
    <motion.button
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, delay: 0.06 + delay * 0.05, ease: 'easeOut' }}
      onClick={onClick}
      aria-pressed={isActive}
      className="w-full cursor-pointer transition-all duration-200 rounded-[10px] border px-2 py-1.5 text-left overflow-hidden relative min-h-[48px]"
      style={{
        background: isActive
          ? `linear-gradient(160deg, ${color}16 0%, color-mix(in srgb, var(--bg-secondary) 93%, white 7%) 72%)`
          : 'linear-gradient(180deg, color-mix(in srgb, var(--bg-secondary) 94%, white 6%) 0%, color-mix(in srgb, var(--bg-primary) 90%, var(--bg-secondary) 10%) 100%)',
        borderColor: isActive ? `${color}70` : 'var(--border)',
        boxShadow: isActive ? `0 14px 32px ${color}18, inset 0 1px 0 rgba(255,255,255,0.06)` : 'var(--soft-shadow)',
      }}
      whileHover={{ y: -1, scale: 1.005 }}
    >
      <span
        className="absolute right-1 top-1 h-10 w-10 rounded-full"
        style={{ background: `${color}18`, filter: 'blur(4px)' }}
      />
      <span
        className="absolute inset-x-2 bottom-0 h-[2px] rounded-full transition-opacity duration-200"
        style={{
          background: `linear-gradient(90deg, ${color}00 0%, ${color}CC 35%, ${color}FF 50%, ${color}CC 65%, ${color}00 100%)`,
          opacity: isActive ? 1 : 0.18,
        }}
      />
      <div className="relative flex h-full items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="flex h-6 w-6 items-center justify-center rounded-lg flex-shrink-0"
            style={{ background: `${color}18`, color }}
          >
            <span
              className="rounded-full transition-all duration-200"
              style={{
                background: color,
                height: isActive ? '9px' : '7px',
                width: isActive ? '9px' : '7px',
                boxShadow: isActive ? `0 0 0 4px ${color}20` : 'none',
              }}
            />
          </span>
          <span
            className="block truncate text-[11px] font-medium leading-tight md:text-[12px]"
            style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}
          >
            {label}
          </span>
        </div>

        <div className="flex flex-shrink-0 items-center gap-1.5">
          <span
            className="text-[18px] font-semibold tabular-nums leading-none md:text-[20px]"
            style={{
              color: count === 0 ? 'var(--text-muted)' : isActive ? activeCountColor : 'var(--text-primary)',
              textShadow: isActive ? `0 1px 0 rgba(255,255,255,0.14)` : 'none',
            }}
          >
            <AnimatedCounter value={count} />
          </span>
        </div>
      </div>
    </motion.button>
  );
}

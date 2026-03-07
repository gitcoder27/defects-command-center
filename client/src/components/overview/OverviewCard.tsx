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
  return (
    <motion.button
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, delay: 0.06 + delay * 0.05, ease: 'easeOut' }}
      onClick={onClick}
      className="w-full cursor-pointer transition-all duration-200 rounded-[18px] border px-3 py-2.5 text-left overflow-hidden relative min-h-[62px]"
      style={{
        background: isActive
          ? `linear-gradient(160deg, ${color}14 0%, color-mix(in srgb, var(--bg-secondary) 95%, white 5%) 72%)`
          : 'linear-gradient(180deg, color-mix(in srgb, var(--bg-secondary) 94%, white 6%) 0%, color-mix(in srgb, var(--bg-primary) 90%, var(--bg-secondary) 10%) 100%)',
        borderColor: isActive ? `${color}55` : 'var(--border)',
        boxShadow: isActive ? `0 18px 42px ${color}18` : 'var(--soft-shadow)',
      }}
      whileHover={{ y: -1, scale: 1.005 }}
    >
      <span
        className="absolute right-2 top-2 h-12 w-12 rounded-full"
        style={{ background: `${color}18`, filter: 'blur(4px)' }}
      />
      <div className="relative flex h-full items-center gap-3 min-w-0">
        <div className="flex items-center justify-center gap-3">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-xl flex-shrink-0"
            style={{ background: `${color}18`, color }}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: color }} />
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <span
            className="text-[10px] font-medium uppercase block truncate"
            style={{ letterSpacing: '0.08em', color: 'var(--text-secondary)' }}
          >
            {label}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className="text-[22px] font-semibold tabular-nums leading-none"
            style={{ color: count === 0 ? 'var(--text-muted)' : 'var(--text-primary)' }}
          >
            <AnimatedCounter value={count} />
          </span>
          <span
            className="text-[9px] font-semibold uppercase rounded-full px-2 py-1"
            style={{
              letterSpacing: '0.08em',
              color: isActive ? color : 'var(--text-muted)',
              background: isActive ? `${color}12` : 'var(--bg-tertiary)',
            }}
          >
            {isActive ? 'On' : 'View'}
          </span>
        </div>
      </div>
    </motion.button>
  );
}

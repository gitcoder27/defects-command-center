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
      className="flex flex-col items-start gap-0.5 rounded-md px-3 py-2 w-full cursor-pointer transition-all duration-200"
      style={{
        background: 'var(--bg-secondary)',
        border: `1px solid ${isActive ? color : 'var(--border)'}`,
        boxShadow: isActive
          ? `0 0 16px ${color}20, 0 1px 2px rgba(0,0,0,0.25)`
          : '0 1px 2px rgba(0,0,0,0.2), 0 0 1px rgba(6,182,212,0.04)',
      }}
    >
      <span className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
        <span
          className="text-[10px] font-medium uppercase"
          style={{ letterSpacing: '0.06em', color: 'var(--text-secondary)' }}
        >
          {label}
        </span>
      </span>
      <span
        className="text-[24px] font-bold tabular-nums leading-tight"
        style={{ color: count === 0 ? 'var(--text-muted)' : 'var(--text-primary)' }}
      >
        <AnimatedCounter value={count} />
      </span>
    </motion.button>
  );
}

import { motion } from 'framer-motion';
import { ArrowLeft, Briefcase, LoaderCircle } from 'lucide-react';
import { useEffect } from 'react';

interface Props {
  onGoToDashboard: () => void;
}

export function ManagerMyDayLanding({ onGoToDashboard }: Props) {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      onGoToDashboard();
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [onGoToDashboard]);

  return (
    <div
      className="h-full flex items-center justify-center p-4"
      style={{ background: 'var(--bg-canvas)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[420px]"
      >
        <div
          className="dashboard-panel rounded-2xl p-6 text-center space-y-4"
          style={{ borderColor: 'var(--border-strong)' }}
        >
          <div
            className="mx-auto h-12 w-12 rounded-2xl flex items-center justify-center"
            style={{
              background: 'var(--md-accent-glow)',
              color: 'var(--md-accent)',
            }}
          >
            <Briefcase size={22} />
          </div>

          <div className="space-y-1.5">
            <h1
              className="text-[20px] font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              Use Today
            </h1>
            <p
              className="text-[13px]"
              style={{ color: 'var(--text-secondary)' }}
            >
              My Day is only for developers. As a manager, use Today from the command center.
            </p>
          </div>

          <div
            className="rounded-xl px-3 py-2.5 flex items-center justify-center gap-2 text-[13px]"
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            <LoaderCircle size={14} className="animate-spin" />
            Redirecting to Today...
          </div>

          <button
            onClick={onGoToDashboard}
            className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-all"
            style={{
              background: 'var(--accent)',
              color: '#fff',
              boxShadow: '0 4px 20px rgba(6, 182, 212, 0.3)',
            }}
          >
            <ArrowLeft size={14} />
            Go Now
          </button>
        </div>
      </motion.div>
    </div>
  );
}

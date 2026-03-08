import { motion } from 'framer-motion';
import { Radar, LogOut, ArrowLeft, Users, Copy, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

interface Props {
  onGoToDashboard: () => void;
}

export function ManagerMyDayLanding({ onGoToDashboard }: Props) {
  const { user, logout } = useAuth();
  const [copied, setCopied] = useState(false);

  const devLink = `${window.location.origin}/my-day`;

  const handleCopy = () => {
    navigator.clipboard.writeText(devLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleLogout = async () => {
    await logout();
    window.location.reload();
  };

  return (
    <div
      className="h-full flex items-center justify-center p-4"
      style={{ background: 'var(--bg-canvas)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[420px]"
      >
        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <div
            className="h-12 w-12 rounded-2xl flex items-center justify-center mb-4"
            style={{
              background: 'rgba(245, 158, 11, 0.12)',
              color: 'var(--warning)',
            }}
          >
            <Users size={24} />
          </div>
          <h1
            className="text-[20px] font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            Welcome, {user?.displayName}
          </h1>
          <p
            className="text-[13px] mt-1 text-center"
            style={{ color: 'var(--text-secondary)' }}
          >
            My Day is the developer workspace. As a manager, use the Dashboard and Team Tracker to oversee your team.
          </p>
        </div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="dashboard-panel rounded-2xl p-5 space-y-4"
          style={{ borderColor: 'var(--border-strong)' }}
        >
          {/* Developer link sharing */}
          <div>
            <label
              className="text-[11px] font-semibold uppercase block mb-2"
              style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}
            >
              Share with developers
            </label>
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2.5"
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
            >
              <Radar size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <span
                className="text-[12px] flex-1 truncate select-all"
                style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono, monospace)' }}
              >
                {devLink}
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition-all shrink-0"
                style={{
                  background: copied ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-elevated)',
                  color: copied ? 'var(--success)' : 'var(--accent)',
                  border: `1px solid ${copied ? 'rgba(16, 185, 129, 0.3)' : 'var(--border)'}`,
                }}
              >
                {copied ? <CheckCircle2 size={11} /> : <Copy size={11} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-[11px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
              Send this link to developers so they can log in to their personal workspace.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-1">
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
              Go to Dashboard
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-medium transition-all"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
              }}
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        </motion.div>

        <p
          className="text-center text-[11px] mt-4"
          style={{ color: 'var(--text-muted)' }}
        >
          You can create developer accounts from Settings (gear icon) on the Dashboard.
        </p>
      </motion.div>
    </div>
  );
}

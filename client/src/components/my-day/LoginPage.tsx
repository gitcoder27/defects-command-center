import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, BriefcaseBusiness, Eye, EyeOff, Moon, Radar, Sun, UserRound } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import type { UserRole } from '@/types';

interface LoginPageProps {
  role?: UserRole;
}

const ROLE_COPY = {
  manager: {
    eyebrow: 'Manager Workspace',
    tagline: 'Run the desk.',
    note: 'Create developer accounts and manage your team after signing in.',
    accent: 'var(--warning)',
    glow: 'rgba(245, 158, 11, 0.18)',
    orbGlow: 'rgba(245, 158, 11, 0.06)',
    icon: BriefcaseBusiness,
    submitLabel: 'Enter Manager Workspace',
  },
  developer: {
    eyebrow: 'Developer Workspace',
    tagline: 'Start your day.',
    note: 'No account yet? Contact your manager to get access.',
    accent: 'var(--accent)',
    glow: 'rgba(6, 182, 212, 0.18)',
    orbGlow: 'rgba(6, 182, 212, 0.06)',
    icon: UserRound,
    submitLabel: 'Open My Day',
  },
} as const;

export function LoginPage({ role = 'developer' }: LoginPageProps) {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const copy = ROLE_COPY[role];

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!username.trim() || !password.trim()) {
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await login(username.trim(), password.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="relative flex min-h-full items-center justify-center overflow-hidden px-4 py-8"
      style={{
        background: `radial-gradient(circle at 30% 20%, ${copy.glow}, transparent 40%), radial-gradient(circle at 70% 80%, rgba(15, 23, 42, 0.18), transparent 50%), var(--bg-canvas)`,
      }}
    >
      {/* Ambient floating orbs */}
      <motion.div
        className="pointer-events-none absolute rounded-full blur-3xl"
        style={{
          width: 500,
          height: 500,
          top: '-10%',
          left: '-8%',
          background: `radial-gradient(circle, ${copy.orbGlow}, transparent 70%)`,
        }}
        animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="pointer-events-none absolute rounded-full blur-3xl"
        style={{
          width: 400,
          height: 400,
          bottom: '-10%',
          right: '-5%',
          background: `radial-gradient(circle, ${copy.orbGlow}, transparent 70%)`,
        }}
        animate={{ x: [0, -30, 0], y: [0, -40, 0] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Theme toggle */}
      <button
        type="button"
        onClick={toggleTheme}
        className="absolute right-5 top-5 z-20 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[12px] font-semibold transition-colors"
        style={{
          background: 'color-mix(in srgb, var(--bg-primary) 88%, transparent)',
          color: 'var(--text-primary)',
          borderColor: 'var(--border-strong)',
        }}
        aria-label="Toggle theme"
        title="Toggle theme"
      >
        {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        {theme === 'dark' ? 'Light mode' : 'Dark mode'}
      </button>

      {/* Centered content */}
      <div className="relative z-10 w-full max-w-[420px]">
        {/* Branding */}
        <motion.div
          className="mb-10 text-center"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="mb-4 inline-flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-[14px]"
              style={{
                background: copy.glow,
                color: copy.accent,
                boxShadow: `0 0 24px ${copy.glow}`,
              }}
            >
              <Radar size={18} />
            </div>
            <div className="text-left">
              <div
                className="text-[10px] font-semibold uppercase tracking-[0.3em]"
                style={{ color: copy.accent }}
              >
                {copy.eyebrow}
              </div>
              <div className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                Defect Command Center
              </div>
            </div>
          </div>

          <h1
            className="text-[32px] font-semibold leading-tight tracking-tight md:text-[38px]"
            style={{ color: 'var(--text-primary)' }}
          >
            {copy.tagline}
          </h1>
        </motion.div>

        {/* Sign-in card */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-[28px] border p-7 md:p-9"
          style={{
            borderColor: 'var(--border-strong)',
            background: 'color-mix(in srgb, var(--bg-primary) 92%, transparent)',
            boxShadow: 'var(--panel-shadow)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <div
            className="absolute inset-x-8 top-0 h-px"
            style={{ background: `linear-gradient(90deg, transparent, ${copy.accent}, transparent)` }}
          />

          <div
            className="text-[11px] font-semibold uppercase tracking-[0.24em]"
            style={{ color: copy.accent }}
          >
            Sign in
          </div>

          <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
            <Field label="Username">
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                autoFocus
                placeholder={role === 'manager' ? 'manager username' : 'developer username'}
                className="w-full rounded-[16px] border px-4 py-3 text-[14px] outline-none transition-colors"
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  borderColor: 'var(--border)',
                }}
              />
            </Field>

            <Field label="Password">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  placeholder="your password"
                  className="w-full rounded-[16px] border px-4 py-3 pr-12 text-[14px] outline-none transition-colors"
                  style={{
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    borderColor: 'var(--border)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2"
                  style={{ color: 'var(--text-muted)' }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-[14px] border px-4 py-3 text-[13px]"
                style={{
                  borderColor: 'rgba(239, 68, 68, 0.35)',
                  background: 'rgba(239, 68, 68, 0.08)',
                  color: '#fca5a5',
                }}
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={!username.trim() || !password.trim() || submitting}
              className="flex w-full items-center justify-center gap-2 rounded-[16px] px-4 py-3.5 text-[14px] font-semibold transition-all disabled:opacity-40"
              style={{
                background: `linear-gradient(135deg, ${copy.accent}, color-mix(in srgb, ${copy.accent} 60%, white))`,
                color: '#111827',
                boxShadow: `0 4px 20px ${copy.glow}`,
              }}
            >
              {submitting ? 'Signing in…' : copy.submitLabel}
              {!submitting && <ArrowRight size={15} />}
            </button>
          </form>

          <p
            className="mt-6 text-center text-[12px] leading-5"
            style={{ color: 'var(--text-muted)' }}
          >
            {copy.note}
          </p>
        </motion.section>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      {children}
    </label>
  );
}

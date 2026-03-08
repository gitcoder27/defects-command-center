import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, BriefcaseBusiness, Eye, EyeOff, KeyRound, Moon, Radar, ShieldCheck, Sun, UserRound } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import type { UserRole } from '@/types';

interface LoginPageProps {
  role?: UserRole;
}

const ROLE_COPY = {
  manager: {
    eyebrow: 'Manager Workspace',
    title: 'Run the desk, not the detour.',
    description:
      'Use this entry to access the dashboard, team tracker, manager desk, Jira connection, and team administration.',
    badge: 'Manager-first surface',
    note: 'Managers can create developer accounts and share the /my-day link from settings after setup.',
    accent: 'var(--warning)',
    glow: 'rgba(245, 158, 11, 0.18)',
    icon: BriefcaseBusiness,
    submitLabel: 'Enter Manager Workspace',
  },
  developer: {
    eyebrow: 'Developer Workspace',
    title: 'Sign in to My Day.',
    description:
      'This surface is only for individual developer check-ins, planned work, and daily updates. Accounts are created by your manager.',
    badge: 'Developer-only surface',
    note: 'If you do not have an account yet, contact your manager instead of trying to register here.',
    accent: 'var(--accent)',
    glow: 'rgba(6, 182, 212, 0.18)',
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
  const RoleIcon = copy.icon;

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
      className="min-h-full overflow-y-auto px-4 py-8 md:px-8"
      style={{
        background: `radial-gradient(circle at top left, ${copy.glow}, transparent 38%), radial-gradient(circle at bottom right, rgba(15, 23, 42, 0.24), transparent 40%), var(--bg-canvas)`,
      }}
    >
      <div className="mx-auto grid min-h-full max-w-6xl items-center gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="lg:col-span-2 flex justify-end">
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[12px] font-semibold transition-colors"
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
        </div>
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-[32px] border px-6 py-8 md:px-10 md:py-12"
          style={{
            borderColor: 'var(--border-strong)',
            background:
              'linear-gradient(145deg, color-mix(in srgb, var(--bg-primary) 94%, transparent), color-mix(in srgb, var(--bg-secondary) 88%, transparent))',
            boxShadow: 'var(--panel-shadow)',
          }}
        >
          <div
            className="absolute inset-x-10 top-0 h-px"
            style={{ background: `linear-gradient(90deg, transparent, ${copy.accent}, transparent)` }}
          />

          <div className="flex items-center gap-3">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-[20px]"
              style={{
                background: copy.glow,
                color: copy.accent,
                boxShadow: `0 0 32px ${copy.glow}`,
              }}
            >
              <Radar size={24} />
            </div>
            <div>
              <div
                className="text-[11px] font-semibold uppercase tracking-[0.3em]"
                style={{ color: copy.accent }}
              >
                {copy.eyebrow}
              </div>
              <div className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>
                Defect Command Center
              </div>
            </div>
          </div>

          <div className="mt-10 max-w-xl space-y-5">
            <span
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
              style={{
                background: 'color-mix(in srgb, var(--bg-tertiary) 72%, transparent)',
                color: copy.accent,
                border: `1px solid color-mix(in srgb, ${copy.accent} 26%, var(--border))`,
              }}
            >
              <RoleIcon size={14} />
              {copy.badge}
            </span>

            <h1
              className="max-w-lg text-[34px] font-semibold leading-[1.02] md:text-[48px]"
              style={{ color: 'var(--text-primary)' }}
            >
              {copy.title}
            </h1>

            <p className="max-w-xl text-[15px] leading-7" style={{ color: 'var(--text-secondary)' }}>
              {copy.description}
            </p>
          </div>

          <div className="mt-10 grid gap-3 md:grid-cols-3">
            {[
              {
                icon: ShieldCheck,
                label: role === 'manager' ? 'Admin controls' : 'Personal workspace',
                text:
                  role === 'manager'
                    ? 'Protect configuration, sync scope, team roster, and developer access behind manager auth.'
                    : 'Keep check-ins, current work, and daily planning separate from the manager desk.',
              },
              {
                icon: KeyRound,
                label: role === 'manager' ? 'Bootstrap-safe' : 'No public signup',
                text:
                  role === 'manager'
                    ? 'The first manager can bootstrap the system here, then ongoing access stays manager-controlled.'
                    : 'Access accounts are created for you. This surface no longer exposes self-service registration.',
              },
              {
                icon: RoleIcon,
                label: role === 'manager' ? 'Manager-first routing' : 'Developer-first routing',
                text:
                  role === 'manager'
                    ? 'Developers are redirected away from this surface so the main desk stays manager-focused.'
                    : 'Managers are redirected away from this surface so My Day stays quiet and focused.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="rounded-[20px] border p-4"
                  style={{
                    borderColor: 'var(--border)',
                    background: 'color-mix(in srgb, var(--bg-tertiary) 70%, transparent)',
                  }}
                >
                  <div className="flex items-center gap-2 text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                    <Icon size={14} style={{ color: copy.accent }} />
                    {item.label}
                  </div>
                  <p className="mt-2 text-[12px] leading-6" style={{ color: 'var(--text-secondary)' }}>
                    {item.text}
                  </p>
                </div>
              );
            })}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-[32px] border p-6 md:p-8"
          style={{
            borderColor: 'var(--border-strong)',
            background: 'color-mix(in srgb, var(--bg-primary) 95%, transparent)',
            boxShadow: 'var(--panel-shadow)',
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[12px] font-semibold uppercase tracking-[0.24em]" style={{ color: copy.accent }}>
                Sign In
              </div>
              <h2 className="mt-3 text-[24px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                {role === 'manager' ? 'Manager access' : 'Developer access'}
              </h2>
            </div>
            <div
              className="rounded-full px-3 py-1 text-[11px] font-semibold"
              style={{
                background: copy.glow,
                color: copy.accent,
              }}
            >
              {role}
            </div>
          </div>

          <p className="mt-3 text-[13px] leading-6" style={{ color: 'var(--text-secondary)' }}>
            {copy.note}
          </p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <Field label="Username">
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                autoFocus
                placeholder={role === 'manager' ? 'manager username' : 'developer username'}
                className="w-full rounded-[18px] border px-4 py-3 text-[14px] outline-none transition-colors"
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
                  className="w-full rounded-[18px] border px-4 py-3 pr-12 text-[14px] outline-none transition-colors"
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
              <div
                className="rounded-[18px] border px-4 py-3 text-[13px]"
                style={{
                  borderColor: 'rgba(239, 68, 68, 0.35)',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#fca5a5',
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!username.trim() || !password.trim() || submitting}
              className="flex w-full items-center justify-center gap-2 rounded-[20px] px-4 py-3 text-[14px] font-semibold transition-all disabled:opacity-50"
              style={{
                background: `linear-gradient(135deg, ${copy.accent}, color-mix(in srgb, ${copy.accent} 58%, white))`,
                color: '#111827',
              }}
            >
              {submitting ? 'Signing in…' : copy.submitLabel}
              {!submitting && <ArrowRight size={15} />}
            </button>
          </form>
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

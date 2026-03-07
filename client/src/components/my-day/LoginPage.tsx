import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radar, LogIn, AlertCircle, Eye, EyeOff, UserPlus, ChevronDown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useDevelopers } from '@/hooks/useDevelopers';
import { api } from '@/lib/api';
import type { AuthUser, UserRole } from '@/types';

type Mode = 'login' | 'signup';

export function LoginPage() {
  const { login } = useAuth();
  const [mode, setMode] = useState<Mode>('login');

  return (
    <div
      className="h-full flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: 'var(--bg-canvas)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as const }}
        className="w-full max-w-[400px] my-auto"
      >
        {/* Logo / Brand */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="flex flex-col items-center mb-6"
        >
          <div
            className="h-12 w-12 rounded-2xl flex items-center justify-center mb-4"
            style={{
              background: 'var(--accent-glow)',
              color: 'var(--accent)',
              boxShadow: '0 0 40px rgba(6, 182, 212, 0.2)',
            }}
          >
            <Radar size={24} />
          </div>
          <h1
            className="text-[22px] font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            Defect Command Center
          </h1>
          <p
            className="text-[13px] mt-1"
            style={{ color: 'var(--text-secondary)' }}
          >
            {mode === 'login' ? 'Sign in to your workspace' : 'Create a new account'}
          </p>
        </motion.div>

        {/* Tab Switcher */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="flex items-center rounded-xl p-0.5 gap-0.5 mb-4"
          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
        >
          <button
            onClick={() => setMode('login')}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-semibold transition-all"
            style={{
              background: mode === 'login' ? 'var(--bg-elevated)' : 'transparent',
              color: mode === 'login' ? 'var(--accent)' : 'var(--text-muted)',
              boxShadow: mode === 'login' ? 'var(--soft-shadow)' : 'none',
            }}
          >
            <LogIn size={13} />
            Sign In
          </button>
          <button
            onClick={() => setMode('signup')}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-semibold transition-all"
            style={{
              background: mode === 'signup' ? 'var(--bg-elevated)' : 'transparent',
              color: mode === 'signup' ? 'var(--accent)' : 'var(--text-muted)',
              boxShadow: mode === 'signup' ? 'var(--soft-shadow)' : 'none',
            }}
          >
            <UserPlus size={13} />
            Sign Up
          </button>
        </motion.div>

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="dashboard-panel rounded-2xl p-6"
          style={{ borderColor: 'var(--border-strong)' }}
        >
          <AnimatePresence mode="wait">
            {mode === 'login' ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <LoginForm onLogin={login} onSwitchToSignup={() => setMode('signup')} />
              </motion.div>
            ) : (
              <motion.div
                key="signup"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <SignupForm onLogin={login} onSwitchToLogin={() => setMode('login')} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="text-center text-[11px] mt-4"
          style={{ color: 'var(--text-muted)' }}
        >
          Internal use only
        </motion.p>
      </motion.div>
    </div>
  );
}

/* ─── Login Form ─── */
function LoginForm({
  onLogin,
  onSwitchToSignup,
}: {
  onLogin: (username: string, password: string) => Promise<void>;
  onSwitchToSignup: () => void;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setError('');
    setIsLoading(true);
    try {
      await onLogin(username.trim(), password.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <ErrorBanner message={error} />}

      <FormField label="Username">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
          autoComplete="username"
          placeholder="Enter your username"
          className="w-full rounded-xl px-3.5 py-2.5 text-[13px] outline-none transition-colors"
          style={{
            background: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
          }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--border-active)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
        />
      </FormField>

      <FormField label="Password">
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="Enter your password"
            className="w-full rounded-xl px-3.5 py-2.5 pr-10 text-[13px] outline-none transition-colors"
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
            }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--border-active)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </FormField>

      <SubmitButton isLoading={isLoading} disabled={!username.trim() || !password.trim()}>
        <LogIn size={14} />
        Sign In
      </SubmitButton>

      <p className="text-center text-[12px]" style={{ color: 'var(--text-muted)' }}>
        Don&apos;t have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToSignup}
          className="font-semibold underline transition-colors"
          style={{ color: 'var(--accent)' }}
        >
          Sign up
        </button>
      </p>
    </form>
  );
}

/* ─── Signup Form ─── */
function SignupForm({
  onLogin,
  onSwitchToLogin,
}: {
  onLogin: (username: string, password: string) => Promise<void>;
  onSwitchToLogin: () => void;
}) {
  const { data: developers = [] } = useDevelopers();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('developer');
  const [developerAccountId, setDeveloperAccountId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !displayName.trim() || !password.trim()) return;

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (role === 'developer' && !developerAccountId) {
      setError('Please select your Jira identity');
      return;
    }

    setError('');
    setIsLoading(true);
    try {
      await api.post<{ user: AuthUser }>('/auth/register', {
        username: username.trim(),
        password,
        displayName: displayName.trim(),
        role,
        ...(role === 'developer' ? { developerAccountId } : {}),
      });

      // Auto-login after successful registration
      await onLogin(username.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
      {error && <ErrorBanner message={error} />}

      <FormField label="Username">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
          autoComplete="username"
          placeholder="Choose a username"
          className="w-full rounded-xl px-3.5 py-2.5 text-[13px] outline-none transition-colors"
          style={{
            background: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
          }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--border-active)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
        />
      </FormField>

      <FormField label="Display Name">
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          autoComplete="name"
          placeholder="Your full name"
          className="w-full rounded-xl px-3.5 py-2.5 text-[13px] outline-none transition-colors"
          style={{
            background: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
          }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--border-active)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
        />
      </FormField>

      <FormField label="Role">
        <div className="relative">
          <select
            value={role}
            onChange={(e) => {
              setRole(e.target.value as UserRole);
              if (e.target.value === 'manager') setDeveloperAccountId('');
            }}
            className="w-full rounded-xl px-3.5 py-2.5 text-[13px] outline-none transition-colors appearance-none"
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
            }}
          >
            <option value="developer">Developer</option>
            <option value="manager">Manager</option>
          </select>
          <ChevronDown
            size={14}
            className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--text-muted)' }}
          />
        </div>
      </FormField>

      {role === 'developer' && (
        <FormField label="Jira Identity" hint="Link your account to a Jira developer profile">
          <div className="relative">
            <select
              value={developerAccountId}
              onChange={(e) => setDeveloperAccountId(e.target.value)}
              className="w-full rounded-xl px-3.5 py-2.5 text-[13px] outline-none transition-colors appearance-none"
              style={{
                background: 'var(--bg-tertiary)',
                color: developerAccountId ? 'var(--text-primary)' : 'var(--text-muted)',
                border: '1px solid var(--border)',
              }}
            >
              <option value="">Select your Jira profile…</option>
              {developers.map((dev) => (
                <option key={dev.accountId} value={dev.accountId}>
                  {dev.displayName} {dev.email ? `(${dev.email})` : ''}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--text-muted)' }}
            />
          </div>
        </FormField>
      )}

      <FormField label="Password">
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="Minimum 6 characters"
            className="w-full rounded-xl px-3.5 py-2.5 pr-10 text-[13px] outline-none transition-colors"
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
            }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--border-active)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </FormField>

      <FormField label="Confirm Password">
        <input
          type={showPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          placeholder="Repeat your password"
          className="w-full rounded-xl px-3.5 py-2.5 text-[13px] outline-none transition-colors"
          style={{
            background: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: `1px solid ${confirmPassword && confirmPassword !== password ? 'var(--danger)' : 'var(--border)'}`,
          }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--border-active)')}
          onBlur={(e) => (e.target.style.borderColor = confirmPassword && confirmPassword !== password ? 'var(--danger)' : 'var(--border)')}
        />
      </FormField>

      <SubmitButton
        isLoading={isLoading}
        disabled={!username.trim() || !displayName.trim() || !password.trim() || password !== confirmPassword}
      >
        <UserPlus size={14} />
        Create Account
      </SubmitButton>

      <p className="text-center text-[12px]" style={{ color: 'var(--text-muted)' }}>
        Already have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="font-semibold underline transition-colors"
          style={{ color: 'var(--accent)' }}
        >
          Sign in
        </button>
      </p>
    </form>
  );
}

/* ─── Shared Sub-components ─── */
function ErrorBanner({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className="flex items-center gap-2 rounded-xl px-3 py-2.5"
      style={{
        background: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.2)',
      }}
    >
      <AlertCircle size={14} style={{ color: 'var(--danger)', flexShrink: 0 }} />
      <span className="text-[12px]" style={{ color: 'var(--danger)' }}>
        {message}
      </span>
    </motion.div>
  );
}

function FormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label
          className="text-[11px] font-semibold uppercase"
          style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}
        >
          {label}
        </label>
        {hint && (
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function SubmitButton({
  isLoading,
  disabled,
  children,
}: {
  isLoading: boolean;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={isLoading || disabled}
      className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-all disabled:opacity-50"
      style={{
        background: 'var(--accent)',
        color: '#fff',
        boxShadow: '0 4px 20px rgba(6, 182, 212, 0.3)',
      }}
    >
      {isLoading ? (
        <div
          className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: '#fff', borderTopColor: 'transparent' }}
        />
      ) : (
        children
      )}
    </button>
  );
}

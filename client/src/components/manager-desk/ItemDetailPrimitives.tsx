import { useEffect, useId, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

export const sectionSurfaceStyle = {
  background:
    'linear-gradient(180deg, color-mix(in srgb, var(--bg-elevated) 72%, transparent) 0%, color-mix(in srgb, var(--bg-secondary) 88%, transparent) 100%)',
  border: '1px solid var(--border)',
  boxShadow: 'var(--soft-shadow)',
} as const;

export function MetaChip({
  label,
  tone,
}: {
  label: string;
  tone: 'accent' | 'neutral' | 'success' | 'danger';
}) {
  const toneStyles = {
    accent: {
      background: 'var(--md-accent-dim)',
      color: 'var(--md-accent)',
      border: '1px solid color-mix(in srgb, var(--md-accent) 24%, transparent)',
    },
    neutral: {
      background: 'color-mix(in srgb, var(--bg-secondary) 92%, transparent)',
      color: 'var(--text-secondary)',
      border: '1px solid var(--border)',
    },
    success: {
      background: 'rgba(16,185,129,0.10)',
      color: 'var(--success)',
      border: '1px solid rgba(16,185,129,0.18)',
    },
    danger: {
      background: 'rgba(239,68,68,0.10)',
      color: 'var(--danger)',
      border: '1px solid rgba(239,68,68,0.18)',
    },
  } as const;

  return (
    <span
      className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]"
      style={toneStyles[tone]}
    >
      {label}
    </span>
  );
}

export function SectionCard({
  eyebrow,
  title,
  description,
  children,
  collapsed = false,
  onToggleCollapse,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  return (
    <section className="rounded-[22px] p-4 md:p-5" style={sectionSurfaceStyle}>
      <button
        type="button"
        onClick={onToggleCollapse}
        className="flex w-full items-start justify-between gap-3 text-left"
        aria-expanded={!collapsed}
        aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${title}`}
      >
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>
            {eyebrow}
          </div>
          <div className="mt-1 text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            {title}
          </div>
          <p className="mt-1 text-[12px] leading-5" style={{ color: 'var(--text-secondary)' }}>
            {collapsed ? 'Collapsed. Expand when you need this section.' : description}
          </p>
        </div>
        <span
          className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all"
          style={{
            background: 'var(--bg-tertiary)',
            color: collapsed ? 'var(--md-accent)' : 'var(--text-secondary)',
            border: '1px solid var(--border)',
            transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
          }}
        >
          <ChevronDown size={16} />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="section-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="mt-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export function LinkActionButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] transition-all"
      style={{
        background: 'var(--bg-tertiary)',
        color: 'var(--text-secondary)',
        border: '1px solid var(--border)',
      }}
    >
      {icon}
      {label}
    </button>
  );
}

export function FieldSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  emptyLabel,
}: {
  label: string;
  value: T | '';
  options: Array<{ value: T; label: string }>;
  onChange: (value: string) => void;
  emptyLabel?: string;
}) {
  const fieldId = useId();

  return (
    <div>
      <label
        htmlFor={fieldId}
        className="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em]"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
      </label>
      <select
        id={fieldId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full cursor-pointer rounded-xl px-3 py-2 text-[12px] font-medium outline-none"
        style={{
          background: 'var(--bg-tertiary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)',
        }}
      >
        {emptyLabel ? <option value="">{emptyLabel}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function FieldText({
  label,
  value,
  placeholder,
  onChange,
  className,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const fieldId = useId();
  const [local, setLocal] = useState(value);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  return (
    <div className={className}>
      <label
        htmlFor={fieldId}
        className="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em]"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
      </label>
      <input
        id={fieldId}
        type="text"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => {
          if (local !== value) onChange(local);
        }}
        placeholder={placeholder}
        className="w-full rounded-xl px-3 py-2 text-[12px] outline-none"
        style={{
          background: 'var(--bg-tertiary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)',
        }}
      />
    </div>
  );
}

export function FieldDatetime({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const fieldId = useId();
  const localValue = value ? value.slice(0, 16) : '';

  return (
    <div className={className}>
      <label
        htmlFor={fieldId}
        className="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em]"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
      </label>
      <input
        id={fieldId}
        type="datetime-local"
        value={localValue}
        onChange={(e) => {
          const nextValue = e.target.value;
          onChange(nextValue ? new Date(nextValue).toISOString() : '');
        }}
        className="w-full rounded-xl px-3 py-2 text-[12px] outline-none"
        style={{
          background: 'var(--bg-tertiary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)',
        }}
      />
    </div>
  );
}

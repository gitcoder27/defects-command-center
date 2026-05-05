interface LeadOSMarkProps {
  size?: number;
  className?: string;
  monochrome?: boolean;
}

export function LeadOSMark({ size = 24, className, monochrome = false }: LeadOSMarkProps) {
  const accent = monochrome ? 'currentColor' : 'var(--accent)';
  const warning = monochrome ? 'currentColor' : 'var(--warning)';
  const success = monochrome ? 'currentColor' : 'var(--success)';
  const divider = monochrome ? 'currentColor' : 'var(--text-muted)';

  return (
    <svg
      width={size}
      height={size}
      viewBox="32 32 152 152"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect x="44" y="44" width="128" height="128" rx="31" stroke={accent} strokeWidth="16" />
      <path
        d="M108 46V170M46 108H170"
        stroke={divider}
        strokeWidth="12"
        strokeLinecap="round"
        opacity={monochrome ? 0.42 : 0.58}
      />
      <rect x="57" y="57" width="39" height="39" rx="12" fill={accent} />
      <rect x="120" y="120" width="39" height="39" rx="12" fill={warning} />
      <path d="M122 71H149M149 71V97" stroke={warning} strokeWidth="12" strokeLinecap="round" />
      <circle cx="83" cy="136" r="11" fill={success} />
    </svg>
  );
}

interface LeadOSMarkProps {
  size?: number;
  className?: string;
  monochrome?: boolean;
}

export function LeadOSMark({ size = 24, className, monochrome = false }: LeadOSMarkProps) {
  const cyan = monochrome ? 'currentColor' : 'var(--accent)';
  const amber = monochrome ? 'currentColor' : 'var(--warning)';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 216 216"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M66 42V96C66 112.569 79.4315 126 96 126H136C152.569 126 166 139.431 166 156C166 172.569 152.569 186 136 186H64"
        stroke={cyan}
        strokeWidth="13"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M66 82H136C166.928 82 192 107.072 192 138C192 168.928 166.928 194 136 194H96"
        stroke={cyan}
        strokeWidth="13"
        strokeLinecap="round"
      />
      <path
        d="M44 154H132"
        stroke={cyan}
        strokeWidth="13"
        strokeLinecap="round"
      />
      <circle cx="136" cy="154" r="26" fill="var(--bg-primary)" stroke={cyan} strokeWidth="12" />
      <circle cx="136" cy="154" r="9" fill={amber} />
      <circle cx="66" cy="82" r="15" fill={cyan} />
      <circle cx="66" cy="126" r="15" fill={amber} />
      <circle cx="44" cy="154" r="15" fill={cyan} />
    </svg>
  );
}

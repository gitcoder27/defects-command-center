const ASPEN_SEVERITY_COLORS: Record<string, string> = {
  '1 - Critical': 'var(--danger)',
  '2 - Major': '#EC4899',
  '3 - Minor': 'var(--warning)',
  '4 - Low': 'var(--accent)',
};

export function PriorityCell({ severity }: { severity?: string }) {
  const color = severity ? (ASPEN_SEVERITY_COLORS[severity] ?? 'var(--text-muted)') : 'var(--text-muted)';
  const title = severity ?? 'ASPEN Severity not set';
  return (
    <span
      className="inline-block w-3 h-3 rounded-full transition-all duration-150 hover:scale-125 cursor-pointer"
      style={{
        background: color,
        boxShadow: `0 0 0 1px var(--bg-secondary), 0 0 8px ${color}`,
      }}
      onMouseEnter={(e) => {
        (e.target as HTMLElement).style.boxShadow = `0 0 0 1px var(--bg-secondary), 0 0 12px ${color}`;
      }}
      onMouseLeave={(e) => {
        (e.target as HTMLElement).style.boxShadow = `0 0 0 1px var(--bg-secondary), 0 0 8px ${color}`;
      }}
      title={title}
    />
  );
}

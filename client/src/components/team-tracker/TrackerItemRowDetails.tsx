interface TrackerItemRowDetailsProps {
  regionId: string;
  title: string;
  note?: string;
}

export function TrackerItemRowDetails({ regionId, title, note }: TrackerItemRowDetailsProps) {
  return (
    <div
      id={regionId}
      role="region"
      aria-label={`Task details for ${title}`}
      className="mt-2 rounded-lg px-2.5 py-2"
      style={{
        background: 'color-mix(in srgb, var(--bg-tertiary) 88%, transparent)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="text-[9px] font-semibold uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
        Full title
      </div>
      <div className="mt-1 text-[11px] break-words" style={{ color: 'var(--text-primary)' }}>
        {title}
      </div>
      {note && (
        <>
          <div className="mt-2 text-[9px] font-semibold uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
            Notes
          </div>
          <div className="mt-1 whitespace-pre-wrap break-words text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            {note}
          </div>
        </>
      )}
    </div>
  );
}

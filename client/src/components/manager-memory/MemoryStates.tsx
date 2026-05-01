export function MemorySkeleton() {
  return (
    <div className="space-y-7">
      {[0, 1, 2].map((group) => (
        <div key={group}>
          <div className="mb-2 h-4 w-24 animate-pulse rounded-sm" style={{ background: 'var(--bg-tertiary)' }} />
          <div style={{ borderTop: '1px solid var(--memory-line)', borderBottom: '1px solid var(--memory-line)' }}>
            {[0, 1, 2].map((row) => (
              <div
                key={row}
                className="grid gap-3 px-1 py-3 md:grid-cols-[minmax(0,1fr)_150px_120px_148px]"
                style={{ borderTop: row > 0 ? '1px solid var(--memory-line)' : 'none' }}
              >
                <div className="h-5 animate-pulse rounded-sm" style={{ background: 'var(--bg-tertiary)' }} />
                <div className="h-5 animate-pulse rounded-sm" style={{ background: 'var(--bg-tertiary)' }} />
                <div className="h-5 animate-pulse rounded-sm" style={{ background: 'var(--bg-tertiary)' }} />
                <div className="h-5 animate-pulse rounded-sm" style={{ background: 'var(--bg-tertiary)' }} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function MemoryError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-[320px] items-center justify-center border-y text-center" style={{ borderColor: 'var(--memory-line)' }}>
      <div>
        <h2 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>Could not load this workflow</h2>
        <p className="mt-1 text-[13px]" style={{ color: 'var(--text-muted)' }}>{message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-md px-3 py-1.5 text-[13px] font-semibold"
          style={{ background: 'var(--memory-accent)', color: 'var(--memory-button-text)' }}
        >
          Retry
        </button>
      </div>
    </div>
  );
}

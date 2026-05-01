import { useState, useRef, useEffect } from 'react';

interface TrackerDropdownMenuProps {
  trigger: React.ReactNode;
  items: Array<{ value: string; label: string }>;
  activeValue: string;
  onSelect: (value: string) => void;
}

export function TrackerDropdownMenu({ trigger, items, activeValue, onSelect }: TrackerDropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-50 min-w-[160px] rounded-xl py-1 shadow-lg"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
          }}
        >
          {items.map((item) => {
            const isActive = item.value === activeValue;
            return (
              <button
                key={item.value}
                onClick={() => { onSelect(item.value); setOpen(false); }}
                className="w-full text-left px-3 py-1.5 text-[13px] font-medium transition-colors flex items-center gap-2"
                style={{
                  color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                  background: isActive ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : 'transparent',
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: isActive ? 'var(--accent)' : 'transparent' }}
                />
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

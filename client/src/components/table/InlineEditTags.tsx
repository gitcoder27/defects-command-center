import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Plus, Tag, X } from 'lucide-react';
import { useIssueTagActions } from '@/hooks/useIssueTagActions';
import { findTagByName, normalizeTagName } from '@/lib/tag-utils';
import type { LocalTag } from '@/types';

interface InlineEditTagsProps {
  issueKey: string;
  localTags: LocalTag[];
}

export function InlineEditTags({ issueKey, localTags }: InlineEditTagsProps) {
  const { allTags, assignedTagIds, isPending, toggleTag, createOrAssignTag } = useIssueTagActions({
    issueKey,
    localTags,
  });
  const [isOpen, setIsOpen] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const normalizedInput = normalizeTagName(tagInput).toLowerCase();

  const filteredTags = useMemo(() => {
    if (!normalizedInput) {
      return allTags;
    }
    return allTags.filter((tag) => tag.name.toLowerCase().includes(normalizedInput));
  }, [allTags, normalizedInput]);

  const exactMatch = useMemo(() => findTagByName(allTags, normalizedInput), [allTags, normalizedInput]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    inputRef.current?.focus();

    const onOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('mousedown', onOutsideClick);
    window.addEventListener('keydown', onEscape);
    return () => {
      window.removeEventListener('mousedown', onOutsideClick);
      window.removeEventListener('keydown', onEscape);
    };
  }, [isOpen]);

  return (
    <div ref={rootRef} className="relative max-w-[260px]" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-1 flex-wrap">
        {localTags.length > 0 ? (
          <>
            {localTags.slice(0, 2).map((tag) => (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                className="text-[10px] px-1.5 py-0.5 rounded-full font-medium leading-none whitespace-nowrap hover:opacity-80 transition-opacity"
                style={{ background: `${tag.color}25`, color: tag.color, border: `1px solid ${tag.color}40` }}
                title={`Remove "${tag.name}"`}
              >
                {tag.name}
              </button>
            ))}
            {localTags.length > 2 && (
              <span className="text-[10px] px-1 py-0.5 rounded-full" style={{ color: 'var(--text-muted)' }}>
                +{localTags.length - 2}
              </span>
            )}
          </>
        ) : (
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            No tags
          </span>
        )}

        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className="p-0.5 rounded transition-colors hover:bg-[var(--bg-tertiary)]"
          title="Manage tags"
          aria-label={`Manage tags for ${issueKey}`}
        >
          <Plus size={12} style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>

      {isOpen && (
        <div
          className="absolute top-full left-0 z-40 mt-2 w-[280px] rounded-md p-2.5"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', boxShadow: '0 8px 24px rgba(0,0,0,0.28)' }}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <Tag size={12} style={{ color: 'var(--text-muted)' }} />
            <span className="text-[11px] font-semibold uppercase" style={{ letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
              Tags
            </span>
          </div>

          <div className="flex gap-1.5 mb-2">
            <input
              ref={inputRef}
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  createOrAssignTag(tagInput, { onSuccess: () => setTagInput('') });
                }
              }}
              placeholder="Search or create tag…"
              className="flex-1 text-[12px] px-2 py-1 rounded focus:outline-none focus:ring-1"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)', outlineColor: 'var(--accent)' }}
            />
            <button
              onClick={() => createOrAssignTag(tagInput, { onSuccess: () => setTagInput('') })}
              disabled={!tagInput.trim() || isPending}
              className="text-[11px] px-2 py-1 rounded font-medium disabled:opacity-40 transition-colors"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              {exactMatch ? 'Use' : 'Add'}
            </button>
          </div>

          <div className="max-h-[140px] overflow-y-auto rounded-sm p-1" style={{ background: 'var(--bg-tertiary)' }}>
            {filteredTags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {filteredTags.map((tag) => {
                  const isAssigned = assignedTagIds.has(tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      className="text-[11px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 transition-opacity"
                      style={{
                        background: isAssigned ? `${tag.color}40` : `${tag.color}15`,
                        color: tag.color,
                        border: `1px solid ${tag.color}${isAssigned ? '80' : '30'}`,
                        opacity: isAssigned ? 1 : 0.75,
                      }}
                      title={isAssigned ? `Remove "${tag.name}"` : `Add "${tag.name}"`}
                    >
                      {isAssigned ? <Check size={10} /> : <Plus size={10} />}
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-[11px] px-1 py-1.5" style={{ color: 'var(--text-muted)' }}>
                No matching tags. Create one with the input above.
              </p>
            )}
          </div>

          <div className="mt-2 flex justify-end">
            <button
              onClick={() => setIsOpen(false)}
              className="text-[11px] px-2 py-1 rounded transition-colors hover:bg-[var(--bg-tertiary)]"
              style={{ color: 'var(--text-secondary)' }}
            >
              <span className="inline-flex items-center gap-1">
                <X size={11} />
                Close
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

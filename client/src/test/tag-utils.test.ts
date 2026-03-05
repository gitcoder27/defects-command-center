import { describe, expect, it } from 'vitest';
import { findTagByName, normalizeTagName } from '@/lib/tag-utils';

describe('tag-utils', () => {
  it('normalizes whitespace and trims', () => {
    expect(normalizeTagName('  needs   triage   now  ')).toBe('needs triage now');
  });

  it('matches tags by name case-insensitively', () => {
    const tags = [
      { id: 1, name: 'Backend', color: '#6366f1' },
      { id: 2, name: 'Critical Bug', color: '#ef4444' },
    ];

    expect(findTagByName(tags, 'backend')?.id).toBe(1);
    expect(findTagByName(tags, 'CRITICAL bug')?.id).toBe(2);
    expect(findTagByName(tags, 'not-found')).toBeUndefined();
  });
});

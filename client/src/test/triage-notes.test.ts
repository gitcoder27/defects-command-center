import { describe, expect, it } from 'vitest';
import { parseTriageNotes, serializeTriageNotes } from '@/components/triage/triage-notes';

describe('triage note serialization', () => {
  it('keeps manual date prefixes inside the legacy block', () => {
    expect(parseTriageNotes('3/14: finding one\n\n3/15: finding two')).toEqual({
      legacyBody: '3/14: finding one\n\n3/15: finding two',
      datedSections: [],
    });
  });

  it('omits empty auto-dated sections when serializing', () => {
    expect(serializeTriageNotes({
      legacyBody: '',
      datedSections: [
        { date: '2026-03-07', body: '' },
        { date: '2026-03-08', body: 'Validated the local reproduction path.' },
      ],
    })).toBe('Mar 8, 2026:\nValidated the local reproduction path.');
  });
});

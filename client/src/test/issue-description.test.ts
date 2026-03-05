import { describe, expect, it } from 'vitest';
import { formatIssueDescription } from '@/lib/issue-description';

describe('issue-description', () => {
  it('returns plain markdown as-is', () => {
    expect(formatIssueDescription('Users report **crash** on submit')).toBe('Users report **crash** on submit');
  });

  it('parses JSON-encoded string descriptions', () => {
    const value = JSON.stringify('Already markdown **value**');
    expect(formatIssueDescription(value)).toBe('Already markdown **value**');
  });

  it('renders Jira ADF JSON into markdown text', () => {
    const adf = JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Login fails for ' },
            { type: 'text', text: 'admins', marks: [{ type: 'strong' }] },
          ],
        },
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Repro in Firefox' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Repro in Safari' }] }] },
          ],
        },
      ],
    });

    const formatted = formatIssueDescription(adf);
    expect(formatted).toContain('Login fails for **admins**');
    expect(formatted).toContain('- Repro in Firefox');
    expect(formatted).toContain('- Repro in Safari');
  });
});

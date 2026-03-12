import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TriageNotesEditor } from '@/components/triage/TriageNotesEditor';

describe('TriageNotesEditor', () => {
  const originalScrollHeight = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'scrollHeight');

  beforeEach(() => {
    Object.defineProperty(HTMLTextAreaElement.prototype, 'scrollHeight', {
      configurable: true,
      get() {
        return 480;
      },
    });
  });

  afterEach(() => {
    if (originalScrollHeight) {
      Object.defineProperty(HTMLTextAreaElement.prototype, 'scrollHeight', originalScrollHeight);
    } else {
      Reflect.deleteProperty(HTMLTextAreaElement.prototype, 'scrollHeight');
    }
  });

  it('scrolls to the bottom when rendered with existing overflowing notes', () => {
    render(
      <TriageNotesEditor
        value={'Line 1\n'.repeat(80)}
        onChange={() => {}}
        onBlurSave={() => {}}
        isSaved
      />
    );

    const textarea = screen.getByPlaceholderText('Root cause, observations, action items…') as HTMLTextAreaElement;

    expect(textarea.style.height).toBe('280px');
    expect(textarea.scrollTop).toBe(480);
  });

  it('does not force-scroll while the user is actively editing', () => {
    const { rerender } = render(
      <TriageNotesEditor
        value={'Line 1\n'.repeat(20)}
        onChange={() => {}}
        onBlurSave={() => {}}
        isSaved
      />
    );

    const textarea = screen.getByPlaceholderText('Root cause, observations, action items…') as HTMLTextAreaElement;

    fireEvent.focus(textarea);
    textarea.scrollTop = 24;

    rerender(
      <TriageNotesEditor
        value={'Line 1\n'.repeat(21)}
        onChange={() => {}}
        onBlurSave={() => {}}
        isSaved={false}
      />
    );

    expect(textarea.scrollTop).toBe(24);
  });
});

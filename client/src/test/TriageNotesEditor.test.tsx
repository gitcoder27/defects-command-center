import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { TriageNotesEditor } from '@/components/triage/TriageNotesEditor';

describe('TriageNotesEditor', () => {
  const originalScrollHeight = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'scrollHeight');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T12:00:00.000Z'));
    Object.defineProperty(HTMLTextAreaElement.prototype, 'scrollHeight', {
      configurable: true,
      get() {
        return 480;
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    if (originalScrollHeight) {
      Object.defineProperty(HTMLTextAreaElement.prototype, 'scrollHeight', originalScrollHeight);
    } else {
      Reflect.deleteProperty(HTMLTextAreaElement.prototype, 'scrollHeight');
    }
  });

  it('renders existing plain text as a legacy block and does not parse manual date prefixes', () => {
    render(
      <TriageNotesEditor
        value={'3/14: - analysis of pending casework lineup logic\n\n3/15: - validate how the system will work'}
        onChange={() => {}}
        onBlurSave={() => {}}
        isSaved
      />
    );

    const legacyNotes = screen.getByLabelText('Earlier notes') as HTMLTextAreaElement;

    expect(legacyNotes.value).toContain('3/14: - analysis of pending casework lineup logic');
    expect(screen.queryByText('Mar 14, 2026')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Notes for today')).toBeInTheDocument();
  });

  it('scrolls to the bottom when rendered with existing overflowing legacy notes', () => {
    render(
      <TriageNotesEditor
        value={'Line 1\n'.repeat(80)}
        onChange={() => {}}
        onBlurSave={() => {}}
        isSaved
      />
    );

    const textarea = screen.getByLabelText('Earlier notes') as HTMLTextAreaElement;

    expect(textarea.style.height).toBe('220px');
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

    const textarea = screen.getByLabelText('Earlier notes') as HTMLTextAreaElement;

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

  it('serializes a new entry into today’s dated section automatically', () => {
    const onChange = vi.fn();

    render(
      <TriageNotesEditor
        value=""
        onChange={onChange}
        onBlurSave={() => {}}
        isSaved
      />
    );

    fireEvent.change(screen.getByLabelText('Notes for today'), {
      target: { value: 'Investigated the pending casework lineup logic.' },
    });

    expect(onChange).toHaveBeenLastCalledWith(
      'Mar 7, 2026:\nInvestigated the pending casework lineup logic.'
    );
  });

  it('allows editing an older dated section inline', () => {
    const onChange = vi.fn();

    render(
      <TriageNotesEditor
        value={'Mar 6, 2026:\nReplicated in local and captured findings.'}
        onChange={onChange}
        onBlurSave={() => {}}
        isSaved
      />
    );

    fireEvent.change(screen.getByLabelText('Notes for Mar 6, 2026'), {
      target: { value: 'Replicated in local and confirmed the fix path.' },
    });

    expect(onChange).toHaveBeenLastCalledWith(
      'Mar 6, 2026:\nReplicated in local and confirmed the fix path.'
    );
  });

  it('adds a new dated section when the local date advances', () => {
    const onChange = vi.fn();

    render(
      <TriageNotesEditor
        value={'Mar 6, 2026:\nReplicated in local and captured findings.'}
        onChange={onChange}
        onBlurSave={() => {}}
        isSaved
      />
    );

    act(() => {
      vi.setSystemTime(new Date('2026-03-08T12:01:00.000Z'));
      vi.advanceTimersByTime(60000);
    });

    fireEvent.change(screen.getByLabelText('Notes for today'), {
      target: { value: 'Handed over to Karthik for local verification.' },
    });

    expect(onChange).toHaveBeenLastCalledWith(
      'Mar 6, 2026:\nReplicated in local and captured findings.\n\nMar 8, 2026:\nHanded over to Karthik for local verification.'
    );
  });
});

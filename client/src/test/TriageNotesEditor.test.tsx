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

    // Legacy entry appears as a collapsed history item — expand it to access textarea
    fireEvent.click(screen.getByRole('button', { name: /earlier notes/i }));

    const legacyNotes = screen.getByLabelText('Earlier notes') as HTMLTextAreaElement;

    expect(legacyNotes.value).toContain('3/14: - analysis of pending casework lineup logic');
    expect(screen.queryByText('Mar 14, 2026')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Notes for today')).toBeInTheDocument();
  });

  it('shows collapsed previews for past dated entries', () => {
    render(
      <TriageNotesEditor
        value={'Mar 6, 2026:\nReplicated in local and captured findings.\n\nMar 5, 2026:\nInitial investigation of the issue.'}
        onChange={() => {}}
        onBlurSave={() => {}}
        isSaved
      />
    );

    // Previews visible in collapsed state
    expect(screen.getByText(/Replicated in local/)).toBeInTheDocument();
    expect(screen.getByText(/Initial investigation/)).toBeInTheDocument();

    // Textareas are not rendered until expanded
    expect(screen.queryByLabelText('Notes for Mar 6, 2026')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Notes for Mar 5, 2026')).not.toBeInTheDocument();
  });

  it('expands a past entry to reveal its editable textarea', () => {
    render(
      <TriageNotesEditor
        value={'Mar 6, 2026:\nReplicated in local and captured findings.'}
        onChange={() => {}}
        onBlurSave={() => {}}
        isSaved
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /mar 6, 2026/i }));

    const textarea = screen.getByLabelText('Notes for Mar 6, 2026') as HTMLTextAreaElement;
    expect(textarea.value).toBe('Replicated in local and captured findings.');
  });

  it('serializes a new entry into today\u2019s dated section automatically', () => {
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

    // Expand the collapsed past entry first
    fireEvent.click(screen.getByRole('button', { name: /mar 6, 2026/i }));

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

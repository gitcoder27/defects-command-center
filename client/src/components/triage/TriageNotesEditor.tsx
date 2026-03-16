import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileText, Check } from 'lucide-react';
import { getLocalIsoDate } from '@/lib/utils';
import { TriageNotesTextArea } from './TriageNotesTextArea';
import { parseTriageNotes, serializeTriageNotes, formatTriageNotesHeading } from './triage-notes';

interface TriageNotesEditorProps {
  value: string;
  onChange: (value: string) => void;
  onBlurSave: () => void;
  isSaved: boolean;
}

export function TriageNotesEditor({ value, onChange, onBlurSave, isSaved }: TriageNotesEditorProps) {
  const [todayIsoDate, setTodayIsoDate] = useState(() => getLocalIsoDate());
  const parsedNotes = useMemo(() => parseTriageNotes(value), [value]);
  const todaySectionIndex = parsedNotes.datedSections.findIndex((section) => section.date === todayIsoDate);
  const datedSections = todaySectionIndex === -1
    ? [...parsedNotes.datedSections, { date: todayIsoDate, body: '' }]
    : parsedNotes.datedSections;

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setTodayIsoDate((current) => {
        const next = getLocalIsoDate();
        return current === next ? current : next;
      });
    }, 60000);

    return () => window.clearInterval(intervalId);
  }, []);

  const emitChange = useCallback((legacyBody: string, nextSections = parsedNotes.datedSections) => {
    onChange(serializeTriageNotes({ legacyBody, datedSections: nextSections }));
  }, [onChange, parsedNotes.datedSections]);

  const handleLegacyChange = useCallback((legacyBody: string) => {
    emitChange(legacyBody);
  }, [emitChange]);

  const handleSectionChange = useCallback((index: number, body: string) => {
    const nextSections = parsedNotes.datedSections.map((section, sectionIndex) => (
      sectionIndex === index ? { ...section, body } : section
    ));

    if (index >= parsedNotes.datedSections.length) {
      nextSections.push({ date: todayIsoDate, body });
    }

    emitChange(parsedNotes.legacyBody, nextSections);
  }, [emitChange, parsedNotes.datedSections, parsedNotes.legacyBody, todayIsoDate]);

  return (
    <div className="triage-section">
      <div className="flex items-center justify-between mb-1.5">
        <span className="triage-section-label">
          <FileText size={11} /> Notes
        </span>
        <span
          className="text-[10px] transition-opacity"
          style={{
            color: !isSaved ? 'var(--warning)' : 'var(--success)',
            opacity: value ? 1 : 0,
          }}
        >
          {!isSaved ? 'Saving…' : (
            <span className="inline-flex items-center gap-0.5">
              <Check size={9} /> Saved
            </span>
          )}
        </span>
      </div>
      <div className="flex flex-col gap-2.5">
        {parsedNotes.legacyBody ? (
          <TriageNotesTextArea
            value={parsedNotes.legacyBody}
            label="Earlier Notes"
            tone="legacy"
            ariaLabel="Earlier notes"
            placeholder="Earlier plain notes…"
            onChange={handleLegacyChange}
            onBlur={onBlurSave}
          />
        ) : null}
        {datedSections.map((section, index) => {
          const isToday = section.date === todayIsoDate;
          return (
            <TriageNotesTextArea
              key={`${section.date}-${index}`}
              value={section.body}
              label={formatTriageNotesHeading(section.date).replace(/:$/, '')}
              badge={isToday ? 'Today' : 'Entry'}
              tone={isToday ? 'today' : 'default'}
              ariaLabel={isToday ? 'Notes for today' : `Notes for ${formatTriageNotesHeading(section.date).replace(/:$/, '')}`}
              placeholder={isToday ? "Add today's analysis, findings, or handoff…" : 'Notes for this day…'}
              onChange={(nextValue) => handleSectionChange(index, nextValue)}
              onBlur={onBlurSave}
            />
          );
        })}
      </div>
    </div>
  );
}

import { format, parse } from 'date-fns';

export interface TriageDatedNoteSection {
  date: string;
  body: string;
}

export interface ParsedTriageNotes {
  legacyBody: string;
  datedSections: TriageDatedNoteSection[];
}

const DATED_HEADER_PATTERN = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{1,2}, \d{4}:$/;

function normalizeText(value: string): string {
  return value.replace(/\r\n/g, '\n');
}

function trimBlankLines(value: string): string {
  const lines = normalizeText(value).split('\n');

  while (lines.length > 0) {
    const firstLine = lines[0];
    if (firstLine === undefined || firstLine.trim() !== '') {
      break;
    }
    lines.shift();
  }

  while (lines.length > 0) {
    const lastLine = lines[lines.length - 1];
    if (lastLine === undefined || lastLine.trim() !== '') {
      break;
    }
    lines.pop();
  }

  return lines.join('\n');
}

function parseHeaderDate(header: string): string | null {
  const parsed = parse(header.slice(0, -1), 'MMM d, yyyy', new Date());
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return format(parsed, 'yyyy-MM-dd');
}

export function formatTriageNotesHeading(date: string): string {
  return `${format(new Date(`${date}T00:00:00`), 'MMM d, yyyy')}:`;
}

export function parseTriageNotes(value: string): ParsedTriageNotes {
  const lines = normalizeText(value).split('\n');
  const legacyLines: string[] = [];
  const datedSections: TriageDatedNoteSection[] = [];
  let currentSection: TriageDatedNoteSection | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (DATED_HEADER_PATTERN.test(trimmed)) {
      if (currentSection) {
        datedSections.push({
          ...currentSection,
          body: trimBlankLines(currentSection.body),
        });
      }

      const parsedDate = parseHeaderDate(trimmed);
      if (!parsedDate) {
        if (currentSection) {
          currentSection.body = currentSection.body ? `${currentSection.body}\n${line}` : line;
        } else {
          legacyLines.push(line);
        }
        continue;
      }

      currentSection = { date: parsedDate, body: '' };
      continue;
    }

    if (currentSection) {
      currentSection.body = currentSection.body ? `${currentSection.body}\n${line}` : line;
      continue;
    }

    legacyLines.push(line);
  }

  if (currentSection) {
    datedSections.push({
      ...currentSection,
      body: trimBlankLines(currentSection.body),
    });
  }

  return {
    legacyBody: trimBlankLines(legacyLines.join('\n')),
    datedSections,
  };
}

export function serializeTriageNotes({ legacyBody, datedSections }: ParsedTriageNotes): string {
  const segments: string[] = [];
  const trimmedLegacyBody = trimBlankLines(legacyBody);
  const nonEmptySections = datedSections
    .map((section) => ({
      ...section,
      body: trimBlankLines(section.body),
    }))
    .filter((section) => section.body.length > 0);

  if (trimmedLegacyBody) {
    segments.push(trimmedLegacyBody);
  }

  for (const section of nonEmptySections) {
    segments.push(`${formatTriageNotesHeading(section.date)}\n${section.body}`);
  }

  return segments.join('\n\n');
}

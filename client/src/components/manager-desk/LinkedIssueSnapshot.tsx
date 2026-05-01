import { useEffect, useMemo, useState, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import { AlertCircle, Bug, CalendarClock, ExternalLink, Flag, Layers3, LoaderCircle, Sparkles, UserCircle2 } from 'lucide-react';
import { useIssueDetail } from '@/hooks/useIssueDetail';
import { useConfig } from '@/hooks/useConfig';
import { formatIssueDescription } from '@/lib/issue-description';
import { sectionSurfaceStyle } from './ItemDetailPrimitives';

interface LinkedIssueSnapshotProps {
  issueKeys: string[];
  showDescription?: boolean;
}

export function LinkedIssueSnapshot({ issueKeys, showDescription = true }: LinkedIssueSnapshotProps) {
  const normalizedKeys = useMemo(() => [...new Set(issueKeys.filter(Boolean))], [issueKeys]);
  const [selectedIssueKey, setSelectedIssueKey] = useState(normalizedKeys[0] ?? '');
  const { data: issue, isLoading } = useIssueDetail(selectedIssueKey || undefined);
  const { data: config } = useConfig();
  const formattedDescription = useMemo(
    () => formatIssueDescription(issue?.description),
    [issue?.description],
  );

  useEffect(() => {
    setSelectedIssueKey((current) => (normalizedKeys.includes(current) ? current : normalizedKeys[0] ?? ''));
  }, [normalizedKeys]);

  if (normalizedKeys.length === 0) {
    return null;
  }

  return (
    <section className="rounded-[22px] p-4 md:p-5" style={sectionSurfaceStyle}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--md-accent)' }}>
            Linked Jira
          </div>
          <div className="mt-1 text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            Triage snapshot
          </div>
          <p className="mt-1 text-[13px] leading-5" style={{ color: 'var(--text-secondary)' }}>
            Keep the connected defect context visible without leaving Desk.
          </p>
        </div>
        {issue && config?.jiraBaseUrl ? (
          <a
            href={`${config.jiraBaseUrl}/browse/${issue.jiraKey}`}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-semibold transition-opacity hover:opacity-80"
            style={{
              background: 'color-mix(in srgb, var(--bg-secondary) 90%, transparent)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
            }}
          >
            <ExternalLink size={12} />
            Open in Jira
          </a>
        ) : null}
      </div>

      {normalizedKeys.length > 1 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {normalizedKeys.map((jiraKey) => {
            const isActive = jiraKey === selectedIssueKey;
            return (
              <button
                key={jiraKey}
                type="button"
                onClick={() => setSelectedIssueKey(jiraKey)}
                className="rounded-full px-3 py-1.5 text-[12px] font-semibold transition-all"
                style={{
                  background: isActive ? 'var(--md-accent-glow)' : 'var(--bg-tertiary)',
                  color: isActive ? 'var(--md-accent)' : 'var(--text-secondary)',
                  border: `1px solid ${isActive ? 'color-mix(in srgb, var(--md-accent) 42%, transparent)' : 'var(--border)'}`,
                }}
              >
                {jiraKey}
              </button>
            );
          })}
        </div>
      ) : null}

      {isLoading ? (
        <div className="mt-4 flex items-center gap-2 rounded-[18px] px-4 py-5" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <LoaderCircle size={16} className="animate-spin" style={{ color: 'var(--md-accent)' }} />
          <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
            Loading issue context…
          </span>
        </div>
      ) : issue ? (
        <div className="mt-4 space-y-4">
          <div
            className="rounded-[20px] px-4 py-4"
            style={{
              background:
                'linear-gradient(135deg, color-mix(in srgb, var(--md-accent) 10%, var(--bg-elevated)) 0%, color-mix(in srgb, var(--bg-secondary) 92%, transparent) 100%)',
              border: '1px solid color-mix(in srgb, var(--md-accent) 24%, var(--border) 76%)',
            }}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em]" style={{ background: 'var(--md-accent-glow)', color: 'var(--md-accent)' }}>
                <Bug size={11} />
                {issue.jiraKey}
              </span>
              <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                {issue.statusName}
              </span>
              <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                {issue.priorityName}
              </span>
            </div>
            <h3 className="mt-3 text-[16px] font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>
              {issue.summary}
            </h3>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <SnapshotFact icon={<UserCircle2 size={12} />} label="Assignee" value={issue.assigneeName ?? 'Unassigned'} />
            <SnapshotFact icon={<Layers3 size={12} />} label="Component" value={issue.component ?? '—'} />
            <SnapshotFact icon={<CalendarClock size={12} />} label="Due" value={issue.developmentDueDate ?? issue.dueDate ?? '—'} />
            <SnapshotFact icon={<Flag size={12} />} label="Severity" value={issue.aspenSeverity ?? '—'} />
          </div>

          {issue.analysisNotes?.trim() ? (
            <div className="rounded-[20px] px-4 py-4" style={{ background: 'rgba(14, 165, 233, 0.07)', border: '1px solid rgba(14, 165, 233, 0.18)' }}>
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--info)' }}>
                <Sparkles size={11} />
                Analysis Notes
              </div>
              <p className="mt-2 text-[13px] leading-6 whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
                {issue.analysisNotes}
              </p>
            </div>
          ) : null}

          {showDescription && formattedDescription ? (
            <div className="rounded-[20px] px-4 py-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              <div className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>
                Description
              </div>
              <div className="prose prose-sm mt-3 max-w-none text-[13px] leading-6" style={{ color: 'var(--text-secondary)' }}>
                <ReactMarkdown>{formattedDescription}</ReactMarkdown>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 rounded-[18px] px-4 py-5" style={{ background: 'var(--bg-secondary)', border: '1px dashed var(--border)' }}>
          <div className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
            <AlertCircle size={14} />
            Linked issue details are not available in the synced issue cache right now.
          </div>
        </div>
      )}
    </section>
  );
}

function SnapshotFact({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[18px] px-3.5 py-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
        {icon}
        {label}
      </div>
      <div className="mt-2 text-[13px] font-medium leading-5" style={{ color: 'var(--text-primary)' }}>
        {value}
      </div>
    </div>
  );
}

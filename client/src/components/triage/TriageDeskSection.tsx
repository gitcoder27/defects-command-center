import { Briefcase } from 'lucide-react';
import { JiraIssueLink } from '@/components/JiraIssueLink';
import type { Issue } from '@/types';

interface TriageDeskSectionProps {
  issue: Issue;
  onCapture: () => void;
}

export function TriageDeskSection({ issue, onCapture }: TriageDeskSectionProps) {
  return (
    <div className="triage-section">
      <div className="flex items-center justify-between mb-1.5">
        <span className="triage-section-label">
          <Briefcase size={11} /> Manager Desk
        </span>
      </div>
      <div
        className="rounded-lg px-3 py-2 flex items-center justify-between gap-3"
        style={{
          background: 'linear-gradient(135deg, color-mix(in srgb, var(--md-accent-glow) 60%, var(--bg-tertiary) 40%), var(--bg-tertiary))',
          border: '1px solid rgba(217,169,78,0.14)',
        }}
      >
        <div className="min-w-0">
          <div className="text-[11.5px] font-medium" style={{ color: 'var(--text-primary)' }}>
            Add follow-up to desk
          </div>
          <div className="mt-0.5 flex flex-wrap gap-1">
            <JiraIssueLink
              issueKey={issue.jiraKey}
              className="rounded-full px-1.5 py-[1px] text-[10px] font-medium"
              style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--md-accent)', border: '1px solid rgba(217,169,78,0.14)' }}
            >
              {issue.jiraKey}
            </JiraIssueLink>
            {issue.assigneeName && (
              <span
                className="rounded-full px-1.5 py-[1px] text-[10px] font-medium"
                style={{ background: 'rgba(16,185,129,0.08)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.14)' }}
              >
                {issue.assigneeName}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onCapture}
          className="shrink-0 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors"
          style={{
            background: 'rgba(217,169,78,0.12)',
            color: 'var(--md-accent)',
            border: '1px solid rgba(217,169,78,0.2)',
          }}
        >
          Add to Manager Desk
        </button>
      </div>
    </div>
  );
}

import type { CSSProperties, MouseEventHandler, ReactNode } from 'react';
import { useConfig } from '@/hooks/useConfig';

interface JiraIssueLinkProps {
  issueKey: string;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  title?: string;
  ariaLabel?: string;
  stopPropagation?: boolean;
  dataJiraLink?: boolean;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}

export function JiraIssueLink({
  issueKey,
  children,
  className,
  style,
  title,
  ariaLabel,
  stopPropagation = false,
  dataJiraLink = false,
  onClick,
}: JiraIssueLinkProps) {
  const { data: config } = useConfig();
  const href = config?.jiraBaseUrl
    ? `${config.jiraBaseUrl}/browse/${issueKey}`
    : undefined;
  const content = children ?? issueKey;

  if (!href) {
    return (
      <span
        className={className}
        style={style}
        title={title}
        aria-label={ariaLabel}
      >
        {content}
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      style={style}
      title={title}
      aria-label={ariaLabel}
      data-jira-link={dataJiraLink || undefined}
      onClick={(event) => {
        if (stopPropagation) {
          event.stopPropagation();
        }
        onClick?.(event);
      }}
    >
      {content}
    </a>
  );
}

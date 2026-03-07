import { isOlderThanHours } from "../utils/date";

type RuleIssue = {
  statusCategory: string;
  excluded?: boolean | number | null;
  teamScopeState?: string | null;
  syncScopeState?: string | null;
  dueDate?: string | null;
  developmentDueDate?: string | null;
  updatedAt: string;
};

function isExcluded(issue: Pick<RuleIssue, "excluded">): boolean {
  return issue.excluded === true || issue.excluded === 1;
}

export function getEffectiveDueDate(issue: Pick<RuleIssue, "developmentDueDate" | "dueDate">): string | null {
  return issue.developmentDueDate ?? issue.dueDate ?? null;
}

export function isActiveTeamIssue(issue: Pick<RuleIssue, "statusCategory" | "excluded" | "teamScopeState" | "syncScopeState">): boolean {
  return issue.statusCategory !== "done" &&
    !isExcluded(issue) &&
    (issue.teamScopeState ?? "in_team") !== "out_of_team" &&
    (issue.syncScopeState ?? "active") === "active";
}

export function isOutOfTeamIssue(issue: Pick<RuleIssue, "statusCategory" | "excluded" | "teamScopeState" | "syncScopeState">): boolean {
  return issue.statusCategory !== "done" &&
    !isExcluded(issue) &&
    (issue.teamScopeState ?? "in_team") === "out_of_team" &&
    (issue.syncScopeState ?? "active") === "active";
}

export function isStaleIssue(issue: Pick<RuleIssue, "updatedAt">, staleThresholdHours: number, now = new Date()): boolean {
  return isOlderThanHours(issue.updatedAt, staleThresholdHours, now);
}

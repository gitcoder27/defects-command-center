function isBoundaryChar(char: string | undefined): boolean {
  return !char || !/[A-Za-z0-9_]/.test(char);
}

function startsWithKeyword(source: string, index: number, keyword: string): boolean {
  const slice = source.slice(index, index + keyword.length);
  if (slice.toUpperCase() !== keyword) {
    return false;
  }

  return isBoundaryChar(source[index - 1]) && isBoundaryChar(source[index + keyword.length]);
}

function splitOrderBy(query: string): { body: string; orderBy: string } {
  let parenDepth = 0;
  let inDoubleQuote = false;

  for (let index = 0; index < query.length; index += 1) {
    const char = query[index];
    if (char === '"' && query[index - 1] !== "\\") {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if (inDoubleQuote) {
      continue;
    }

    if (char === "(") {
      parenDepth += 1;
      continue;
    }

    if (char === ")" && parenDepth > 0) {
      parenDepth -= 1;
      continue;
    }

    if (parenDepth === 0 && startsWithKeyword(query, index, "ORDER")) {
      let cursor = index + "ORDER".length;
      while (cursor < query.length && /\s/.test(query[cursor] ?? "")) {
        cursor += 1;
      }

      if (startsWithKeyword(query, cursor, "BY")) {
        return {
          body: query.slice(0, index).trim(),
          orderBy: query.slice(index).trim(),
        };
      }
    }
  }

  return { body: query.trim(), orderBy: "" };
}

function splitTopLevelAndClauses(body: string): string[] {
  const clauses: string[] = [];
  let segmentStart = 0;
  let parenDepth = 0;
  let inDoubleQuote = false;

  for (let index = 0; index < body.length; index += 1) {
    const char = body[index];
    if (char === '"' && body[index - 1] !== "\\") {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if (inDoubleQuote) {
      continue;
    }

    if (char === "(") {
      parenDepth += 1;
      continue;
    }

    if (char === ")" && parenDepth > 0) {
      parenDepth -= 1;
      continue;
    }

    if (parenDepth === 0 && startsWithKeyword(body, index, "AND")) {
      clauses.push(body.slice(segmentStart, index).trim());
      segmentStart = index + "AND".length;
    }
  }

  clauses.push(body.slice(segmentStart).trim());
  return clauses.filter(Boolean);
}

function hasTopLevelKeyword(body: string, keyword: "OR"): boolean {
  let parenDepth = 0;
  let inDoubleQuote = false;

  for (let index = 0; index < body.length; index += 1) {
    const char = body[index];
    if (char === '"' && body[index - 1] !== "\\") {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if (inDoubleQuote) {
      continue;
    }

    if (char === "(") {
      parenDepth += 1;
      continue;
    }

    if (char === ")" && parenDepth > 0) {
      parenDepth -= 1;
      continue;
    }

    if (parenDepth === 0 && startsWithKeyword(body, index, keyword)) {
      return true;
    }
  }

  return false;
}

function joinClauses(clauses: string[], multiline: boolean): string {
  return clauses.join(multiline ? "\nAND " : " AND ").trim();
}

function isAssigneeClause(clause: string): boolean {
  return /^assignee\b/i.test(clause.trim());
}

function combineBodyAndOrder(body: string, orderBy: string): string {
  if (body && orderBy) {
    return `${body}\n${orderBy}`;
  }
  return body || orderBy;
}

export function stripManagedAssigneeClause(query: string): string {
  const trimmed = query.trim();
  if (!trimmed) {
    return "";
  }

  const { body, orderBy } = splitOrderBy(trimmed);
  const multiline = body.includes("\n");
  const remainingClauses = splitTopLevelAndClauses(body).filter((clause) => !isAssigneeClause(clause));
  const normalizedBody = joinClauses(remainingClauses, multiline);
  return combineBodyAndOrder(normalizedBody, orderBy);
}

function quoteAccountId(accountId: string): string {
  return JSON.stringify(accountId);
}

export function appendManagedAssigneeClause(query: string, teamAccountIds: Iterable<string>): string {
  const uniqueTeamIds = Array.from(new Set(Array.from(teamAccountIds).map((id) => id.trim()).filter(Boolean)));
  const assigneeClause = uniqueTeamIds.length > 0
    ? `assignee IN (${uniqueTeamIds.map(quoteAccountId).join(", ")})`
    : "assignee IS EMPTY AND assignee IS NOT EMPTY";
  const { body, orderBy } = splitOrderBy(query.trim());
  const multiline = body.includes("\n");
  const clauses = hasTopLevelKeyword(body, "OR")
    ? [multiline ? `(\n${body}\n)` : `(${body})`]
    : splitTopLevelAndClauses(body);
  clauses.push(assigneeClause);
  const nextBody = joinClauses(clauses, multiline);
  return combineBodyAndOrder(nextBody, orderBy);
}

export function buildScopedJql(projectKey: string, configuredJql: string | undefined, teamAccountIds: Iterable<string>): string {
  const rawConfigured = (configuredJql ?? "").trim();
  const baseQuery = rawConfigured
    ? stripManagedAssigneeClause(rawConfigured.replaceAll("{PROJECT_KEY}", projectKey))
    : `project = ${projectKey} AND issuetype = Bug AND statusCategory != Done`;

  return appendManagedAssigneeClause(baseQuery, teamAccountIds);
}

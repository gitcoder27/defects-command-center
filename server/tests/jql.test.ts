import { describe, expect, it } from "vitest";
import { appendManagedAssigneeClause, buildScopedJql, stripManagedAssigneeClause } from "../src/jira/jql";

describe("jira jql helpers", () => {
  it("removes a top-level assignee clause and preserves ordering", () => {
    const query = `project = AM
AND issuetype = "AS: Test Defect"
AND assignee IN ("lead-1", "dev-1")
ORDER BY updated DESC`;

    expect(stripManagedAssigneeClause(query)).toBe(`project = AM
AND issuetype = "AS: Test Defect"
ORDER BY updated DESC`);
  });

  it("appends the managed assignee clause before ORDER BY", () => {
    const query = `project = AM
AND issuetype = Bug
ORDER BY updated DESC`;

    expect(appendManagedAssigneeClause(query, ["lead-1", "dev-1"])).toBe(`project = AM
AND issuetype = Bug
AND assignee IN ("lead-1", "dev-1")
ORDER BY updated DESC`);
  });

  it("builds a scoped query from the normalized base query", () => {
    const query = `project = {PROJECT_KEY}
AND statusCategory != Done
AND assignee IN ("legacy-user")
    ORDER BY Rank ASC`;

    expect(buildScopedJql("AM", query, ["lead-1", "dev-1"])).toBe(`project = AM
AND statusCategory != Done
AND assignee IN ("lead-1", "dev-1")
ORDER BY Rank ASC`);
  });

  it("wraps top-level OR queries before appending the managed assignee clause", () => {
    const query = 'status = Open OR status = "In Progress"';

    expect(appendManagedAssigneeClause(query, ["lead-1"])).toBe(
      '(status = Open OR status = "In Progress") AND assignee IN ("lead-1")'
    );
  });

  it("falls back to the default query when no custom base query is configured", () => {
    expect(buildScopedJql("AM", "", ["lead-1"])).toBe(
      'project = AM AND issuetype = Bug AND statusCategory != Done AND assignee IN ("lead-1")'
    );
  });
});

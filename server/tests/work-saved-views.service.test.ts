import { beforeEach, describe, expect, it } from "vitest";
import { resetDatabase } from "./helpers/db";
import { WorkSavedViewsService } from "../src/services/work-saved-views.service";
import { HttpError } from "../src/middleware/errorHandler";

const service = new WorkSavedViewsService();

async function expectHttpError(promise: Promise<unknown>, status: number) {
  let caught: unknown;
  try {
    await promise;
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(HttpError);
  expect((caught as HttpError).status).toBe(status);
}

beforeEach(async () => {
  await resetDatabase();
});

describe("WorkSavedViewsService", () => {
  it("creates, lists, updates, and deletes saved views", async () => {
    const created = await service.createSavedView("manager-a", {
      name: "Blocked for Priya",
      filter: "blocked",
      developerAccountId: "dev-1",
      noTagsFilter: true,
    });

    expect(created).toMatchObject({
      name: "Blocked for Priya",
      filter: "blocked",
      developerAccountId: "dev-1",
      tagId: null,
      noTagsFilter: true,
    });

    const listed = await service.listSavedViews("manager-a");
    expect(listed).toHaveLength(1);

    const updated = await service.updateSavedView("manager-a", created.id, {
      name: "Overdue triage",
      filter: "overdue",
      developerAccountId: null,
      tagId: 7,
      noTagsFilter: false,
    });

    expect(updated).toMatchObject({
      id: created.id,
      name: "Overdue triage",
      filter: "overdue",
      developerAccountId: null,
      tagId: 7,
      noTagsFilter: false,
    });

    await service.deleteSavedView("manager-a", created.id);
    expect(await service.listSavedViews("manager-a")).toHaveLength(0);
  });

  it("applies defaults when creating a view from the default filter state", async () => {
    const created = await service.createSavedView("manager-a", { name: "Everything" });

    expect(created).toMatchObject({
      filter: "all",
      developerAccountId: null,
      tagId: null,
      noTagsFilter: false,
    });
  });

  it("rejects blank names", async () => {
    await expectHttpError(service.createSavedView("manager-a", { name: "   " }), 400);
  });

  it("rejects duplicate names per manager and allows the same name for another manager", async () => {
    await service.createSavedView("manager-a", { name: "My view", filter: "blocked" });

    await expectHttpError(service.createSavedView("manager-a", { name: "My view" }), 409);

    const otherManager = await service.createSavedView("manager-b", { name: "My view" });
    expect(otherManager.name).toBe("My view");
  });

  it("rejects renaming a view onto another view's name", async () => {
    await service.createSavedView("manager-a", { name: "First" });
    const second = await service.createSavedView("manager-a", { name: "Second" });

    await expectHttpError(service.updateSavedView("manager-a", second.id, { name: "First" }), 409);
  });

  it("allows keeping the same name when updating a view", async () => {
    const created = await service.createSavedView("manager-a", { name: "My view", filter: "stale" });

    const updated = await service.updateSavedView("manager-a", created.id, { filter: "blocked" });
    expect(updated.name).toBe("My view");
    expect(updated.filter).toBe("blocked");
  });

  it("returns 404 when updating or deleting a missing or foreign view", async () => {
    const created = await service.createSavedView("manager-a", { name: "Mine" });

    await expectHttpError(service.updateSavedView("manager-a", 9999, { name: "Nope" }), 404);
    await expectHttpError(service.deleteSavedView("manager-a", 9999), 404);
    await expectHttpError(service.updateSavedView("manager-b", created.id, { name: "Steal" }), 404);
    await expectHttpError(service.deleteSavedView("manager-b", created.id), 404);
  });

  it("scopes lists per manager and per workspace", async () => {
    await service.createSavedView("manager-a", { name: "A view", filter: "overdue" });
    await service.createSavedView("manager-b", { name: "B view", filter: "stale" });
    await service.createSavedView("manager-a", { name: "Other workspace", filter: "new" }, "other");

    const forManagerA = await service.listSavedViews("manager-a");
    expect(forManagerA.map((view) => view.name)).toEqual(["A view"]);

    const forManagerAOtherWorkspace = await service.listSavedViews("manager-a", "other");
    expect(forManagerAOtherWorkspace.map((view) => view.name)).toEqual(["Other workspace"]);
  });

  it("falls back to the default filter for unknown filter values", async () => {
    const created = await service.createSavedView("manager-a", {
      name: "Weird",
      filter: "not-a-filter" as never,
    });

    expect(created.filter).toBe("all");
  });
});

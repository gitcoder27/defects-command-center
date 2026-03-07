import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SyncEngine } from "../src/sync/engine";

describe("SyncEngine", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("schedules syncs using the persisted interval", async () => {
    const settings = {
      getSyncIntervalMs: vi.fn(async () => 120_000),
    };
    const engine = new SyncEngine(settings as any);
    const syncSpy = vi.spyOn(engine, "syncNow").mockResolvedValue({
      status: "success",
      issuesSynced: 0,
      startedAt: "2026-03-07T00:00:00.000Z",
      completedAt: "2026-03-07T00:00:00.000Z",
    });

    await engine.start();
    await vi.advanceTimersByTimeAsync(119_999);
    expect(syncSpy).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(syncSpy).toHaveBeenCalledTimes(1);

    engine.stop();
  });
});

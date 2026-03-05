import { Router } from "express";
import { SyncEngine } from "../sync/engine";

export function createSyncRouter(syncEngine: SyncEngine): Router {
  const router = Router();

  router.post("/", async (_req, res, next) => {
    try {
      const result = await syncEngine.syncNow();
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  router.get("/status", async (_req, res, next) => {
    try {
      const latest = await syncEngine.getLastSyncLog();
      const runtime = syncEngine.getRuntimeStatus();
      res.json({
        lastSyncedAt: latest?.completedAt,
        status: runtime.status,
        issuesSynced: latest?.issuesSynced,
        errorMessage: runtime.errorMessage,
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

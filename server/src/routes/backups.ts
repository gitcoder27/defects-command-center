import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { BackupService } from "../services/backup.service";
import { HttpError } from "../middleware/errorHandler";

const manualBackupSchema = z.object({
  body: z.object({
    reason: z.string().trim().min(1).max(64).optional(),
  }),
  params: z.any().optional(),
  query: z.any().optional(),
});

export function createBackupsRouter(backupService: BackupService): Router {
  const router = Router();
  const rejectManagerBackupAccess = () => {
    throw new HttpError(403, "Full database backups require application administrator access");
  };

  router.get("/", async (_req, res, next) => {
    try {
      rejectManagerBackupAccess();
      const [backups, runtime] = await Promise.all([backupService.listBackups(), backupService.getRuntimeStatus()]);
      res.json({ backups, runtime });
    } catch (error) {
      next(error);
    }
  });

  router.post("/run", validate(manualBackupSchema), async (req, res, next) => {
    try {
      rejectManagerBackupAccess();
      const backup = await backupService.createManualBackup(req.body.reason);
      res.status(201).json({ success: true, backup });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

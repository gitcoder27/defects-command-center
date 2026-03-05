import { Router } from "express";
import { AlertService } from "../services/alert.service";

export function createAlertsRouter(alertService: AlertService): Router {
  const router = Router();

  router.get("/", async (_req, res, next) => {
    try {
      const alerts = await alertService.computeAlerts();
      res.json({ alerts });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

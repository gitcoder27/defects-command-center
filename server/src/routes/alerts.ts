import { Router } from "express";
import { z } from "zod";
import type { AlertDismissResponse } from "shared/types";
import { validate } from "../middleware/validate";
import { AlertService } from "../services/alert.service";

const dismissAlertsSchema = z.object({
  params: z.any().optional(),
  body: z.object({
    alertIds: z.array(z.string().min(1)).min(1),
  }),
  query: z.any().optional(),
});

export function createAlertsRouter(alertService: AlertService): Router {
  const router = Router();

  router.get("/", async (req, res, next) => {
    try {
      const managerAccountId = req.auth?.user.accountId;
      const alerts = await alertService.listAlertsForManager(managerAccountId ?? "");
      res.json({ alerts });
    } catch (error) {
      next(error);
    }
  });

  router.post("/dismiss", validate(dismissAlertsSchema), async (req, res, next) => {
    try {
      const managerAccountId = req.auth?.user.accountId;
      const dismissedIds = await alertService.dismissAlerts(managerAccountId ?? "", req.body.alertIds);
      const response: AlertDismissResponse = { success: true, dismissedIds };
      res.json(response);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

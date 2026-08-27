import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { TodayService } from "../services/today.service";

const dateQuerySchema = z.object({
  query: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  }),
  body: z.any().optional(),
  params: z.any().optional(),
});

export function createTodayRouter(todayService: TodayService): Router {
  const router = Router();

  router.get("/", validate(dateQuerySchema), async (req, res, next) => {
    try {
      const result = await todayService.getTodayWithMetadata(
        req.auth!.user.accountId,
        req.query.date as string,
        req.auth!.user.workspaceId
      );
      res.setHeader("X-Today-Cache", result.cacheStatus);
      res.setHeader("Server-Timing", [
        `today;dur=${result.requestDurationMs.toFixed(1)}`,
        `today-build;dur=${result.cacheStatus === "miss" ? result.buildDurationMs.toFixed(1) : "0.0"}`,
        `today-issues;dur=${result.cacheStatus === "miss" ? result.sourceTimings.issues.toFixed(1) : "0.0"}`,
        `today-team;dur=${result.cacheStatus === "miss" ? result.sourceTimings.team.toFixed(1) : "0.0"}`,
        `today-desk;dur=${result.cacheStatus === "miss" ? result.sourceTimings.desk.toFixed(1) : "0.0"}`,
        `today-sync;dur=${result.cacheStatus === "miss" ? result.sourceTimings.sync.toFixed(1) : "0.0"}`,
      ].join(", "));
      res.json(result.today);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

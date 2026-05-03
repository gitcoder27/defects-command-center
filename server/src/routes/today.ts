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
      const today = await todayService.getToday(req.auth!.user.accountId, req.query.date as string);
      res.json(today);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

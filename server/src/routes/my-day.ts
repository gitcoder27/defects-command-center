import { Router } from "express";
import { z } from "zod";
import { requireDeveloper } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { AuthService } from "../services/auth.service";
import { IssueService } from "../services/issue.service";
import { MyDayService } from "../services/my-day.service";

const dateQuerySchema = z.object({
  query: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  }),
  body: z.any().optional(),
  params: z.any().optional(),
});

const patchDaySchema = z.object({
  body: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    status: z
      .enum(["on_track", "at_risk", "blocked", "waiting", "done_for_today"])
      .optional(),
  }),
  query: z.any().optional(),
  params: z.any().optional(),
});

const addItemSchema = z.object({
  body: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    jiraKey: z.string().trim().optional(),
    title: z.string().min(1).max(500),
    note: z.string().max(2000).optional(),
  }),
  query: z.any().optional(),
  params: z.any().optional(),
});

const itemIdParamSchema = z.object({
  params: z.object({
    itemId: z.string().regex(/^\d+$/, "Invalid item id"),
  }),
  body: z.any().optional(),
  query: z.any().optional(),
});

const updateItemSchema = z.object({
  params: z.object({
    itemId: z.string().regex(/^\d+$/, "Invalid item id"),
  }),
  body: z.object({
    title: z.string().min(1).max(500).optional(),
    state: z.enum(["planned", "in_progress", "done", "dropped"]).optional(),
    note: z.string().max(2000).nullable().optional(),
    position: z.number().int().min(0).optional(),
  }),
  query: z.any().optional(),
});

const addCheckInSchema = z.object({
  body: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    summary: z.string().min(1).max(2000),
    status: z
      .enum(["on_track", "at_risk", "blocked", "waiting", "done_for_today"])
      .optional(),
  }),
  query: z.any().optional(),
  params: z.any().optional(),
});

export function createMyDayRouter(
  myDayService: MyDayService,
  authService: AuthService,
  issueService: IssueService
): Router {
  const router = Router();

  router.use(requireDeveloper(authService));

  router.get("/issues", async (req, res, next) => {
    try {
      const accountId = req.auth!.user.developerAccountId!;
      const issues = await issueService.getAll({ assignee: accountId });
      res.json({ issues });
    } catch (error) {
      next(error);
    }
  });

  router.get("/", validate(dateQuerySchema), async (req, res, next) => {
    try {
      const date = req.query.date as string;
      const accountId = req.auth!.user.developerAccountId!;
      const day = await myDayService.getMyDay(accountId, date);
      res.json(day);
    } catch (error) {
      next(error);
    }
  });

  router.patch("/", validate(patchDaySchema), async (req, res, next) => {
    try {
      const accountId = req.auth!.user.developerAccountId!;
      const { date, status } = req.body;
      const day = await myDayService.updateStatus(accountId, date, status);
      res.json(day);
    } catch (error) {
      next(error);
    }
  });

  router.post("/items", validate(addItemSchema), async (req, res, next) => {
    try {
      const accountId = req.auth!.user.developerAccountId!;
      const item = await myDayService.addItem(accountId, req.body);
      res.status(201).json(item);
    } catch (error) {
      next(error);
    }
  });

  router.patch("/items/:itemId", validate(updateItemSchema), async (req, res, next) => {
    try {
      const accountId = req.auth!.user.developerAccountId!;
      const itemId = parseInt(req.params.itemId as string, 10);
      const item = await myDayService.updateItem(accountId, itemId, req.body);
      res.json(item);
    } catch (error) {
      next(error);
    }
  });

  router.delete("/items/:itemId", validate(itemIdParamSchema), async (req, res, next) => {
    try {
      const accountId = req.auth!.user.developerAccountId!;
      const itemId = parseInt(req.params.itemId as string, 10);
      await myDayService.deleteItem(accountId, itemId);
      res.json({ deleted: true });
    } catch (error) {
      next(error);
    }
  });

  router.post(
    "/items/:itemId/set-current",
    validate(itemIdParamSchema),
    async (req, res, next) => {
      try {
        const accountId = req.auth!.user.developerAccountId!;
        const itemId = parseInt(req.params.itemId as string, 10);
        const item = await myDayService.setCurrentItem(accountId, itemId);
        res.json(item);
      } catch (error) {
        next(error);
      }
    }
  );

  router.post("/checkins", validate(addCheckInSchema), async (req, res, next) => {
    try {
      const accountId = req.auth!.user.developerAccountId!;
      const { date, summary, status } = req.body;
      const checkIn = await myDayService.addCheckIn(accountId, date, {
        summary,
        status,
      });
      res.status(201).json(checkIn);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

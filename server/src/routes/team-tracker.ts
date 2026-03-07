import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { TeamTrackerService } from "../services/team-tracker.service";

const dateQuerySchema = z.object({
  query: z.object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  }),
  body: z.any().optional(),
  params: z.any().optional(),
});

const updateDaySchema = z.object({
  params: z.object({
    accountId: z.string().regex(/^[A-Za-z0-9:_-]+$/, "Invalid account id"),
  }),
  body: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    status: z
      .enum(["on_track", "at_risk", "blocked", "waiting", "done_for_today"])
      .optional(),
    managerNotes: z.string().optional(),
  }),
  query: z.any().optional(),
});

const addItemSchema = z.object({
  params: z.object({
    accountId: z.string().regex(/^[A-Za-z0-9:_-]+$/, "Invalid account id"),
  }),
  body: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    itemType: z.enum(["jira", "custom"]),
    jiraKey: z.string().optional(),
    title: z.string().min(1).max(500),
    note: z.string().max(2000).optional(),
  }),
  query: z.any().optional(),
});

const updateItemSchema = z.object({
  params: z.object({
    itemId: z.string().regex(/^\d+$/, "Invalid item id"),
  }),
  body: z.object({
    title: z.string().min(1).max(500).optional(),
    state: z.enum(["planned", "in_progress", "done", "dropped"]).optional(),
    note: z.string().max(2000).optional(),
    position: z.number().int().min(0).optional(),
  }),
  query: z.any().optional(),
});

const deleteItemSchema = z.object({
  params: z.object({
    itemId: z.string().regex(/^\d+$/, "Invalid item id"),
  }),
  body: z.any().optional(),
  query: z.any().optional(),
});

const setCurrentSchema = z.object({
  params: z.object({
    itemId: z.string().regex(/^\d+$/, "Invalid item id"),
  }),
  body: z.any().optional(),
  query: z.any().optional(),
});

const addCheckInSchema = z.object({
  params: z.object({
    accountId: z.string().regex(/^[A-Za-z0-9:_-]+$/, "Invalid account id"),
  }),
  body: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    summary: z.string().min(1).max(2000),
    status: z
      .enum(["on_track", "at_risk", "blocked", "waiting", "done_for_today"])
      .optional(),
  }),
  query: z.any().optional(),
});

const carryForwardSchema = z.object({
  body: z.object({
    fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  params: z.any().optional(),
  query: z.any().optional(),
});

export function createTeamTrackerRouter(
  trackerService: TeamTrackerService
): Router {
  const router = Router();

  // GET /api/team-tracker?date=YYYY-MM-DD
  router.get("/", validate(dateQuerySchema), async (req, res, next) => {
    try {
      const date = req.query.date as string;
      const board = await trackerService.getBoard(date);
      res.json(board);
    } catch (error) {
      next(error);
    }
  });

  // PATCH /api/team-tracker/:accountId/day
  router.patch(
    "/:accountId/day",
    validate(updateDaySchema),
    async (req, res, next) => {
      try {
        const accountId = req.params.accountId as string;
        const { date, status, managerNotes } = req.body;
        const day = await trackerService.updateDay(accountId, date, {
          status,
          managerNotes,
        });
        res.json(day);
      } catch (error) {
        next(error);
      }
    }
  );

  // POST /api/team-tracker/:accountId/items
  router.post(
    "/:accountId/items",
    validate(addItemSchema),
    async (req, res, next) => {
      try {
        const accountId = req.params.accountId as string;
        const { date, itemType, jiraKey, title, note } = req.body;
        const item = await trackerService.addItem(accountId, date, {
          itemType,
          jiraKey,
          title,
          note,
        });
        res.status(201).json(item);
      } catch (error) {
        next(error);
      }
    }
  );

  // PATCH /api/team-tracker/items/:itemId
  router.patch(
    "/items/:itemId",
    validate(updateItemSchema),
    async (req, res, next) => {
      try {
        const itemId = parseInt(req.params.itemId as string, 10);
        const item = await trackerService.updateItem(itemId, req.body);
        res.json(item);
      } catch (error) {
        next(error);
      }
    }
  );

  // DELETE /api/team-tracker/items/:itemId
  router.delete(
    "/items/:itemId",
    validate(deleteItemSchema),
    async (req, res, next) => {
      try {
        const itemId = parseInt(req.params.itemId as string, 10);
        await trackerService.deleteItem(itemId);
        res.json({ deleted: true });
      } catch (error) {
        next(error);
      }
    }
  );

  // POST /api/team-tracker/items/:itemId/set-current
  router.post(
    "/items/:itemId/set-current",
    validate(setCurrentSchema),
    async (req, res, next) => {
      try {
        const itemId = parseInt(req.params.itemId as string, 10);
        const item = await trackerService.setCurrentItem(itemId);
        res.json(item);
      } catch (error) {
        next(error);
      }
    }
  );

  // POST /api/team-tracker/:accountId/checkins
  router.post(
    "/:accountId/checkins",
    validate(addCheckInSchema),
    async (req, res, next) => {
      try {
        const accountId = req.params.accountId as string;
        const { date, summary, status } = req.body;
        const checkIn = await trackerService.addCheckIn(accountId, date, {
          summary,
          status,
        });
        res.status(201).json(checkIn);
      } catch (error) {
        next(error);
      }
    }
  );

  // POST /api/team-tracker/carry-forward
  router.post(
    "/carry-forward",
    validate(carryForwardSchema),
    async (req, res, next) => {
      try {
        const { fromDate, toDate } = req.body;
        const carried = await trackerService.carryForward(fromDate, toDate);
        res.json({ carried });
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}

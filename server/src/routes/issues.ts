import { Router } from "express";
import { z } from "zod";
import { IssueService } from "../services/issue.service";
import { validate } from "../middleware/validate";
import { HttpError } from "../middleware/errorHandler";

const keyRegex = /^[A-Z]+-\d+$/;
const accountIdRegex = /^[A-Za-z0-9:-]+$/;

const paramsSchema = z.object({
  params: z.object({ key: z.string().regex(keyRegex, "Invalid issue key format") }),
  body: z.any().optional(),
  query: z.any().optional(),
});

const updateSchema = z.object({
  params: z.object({ key: z.string().regex(keyRegex, "Invalid issue key format") }),
  body: z
    .object({
      assigneeId: z.string().regex(accountIdRegex).optional(),
      priorityName: z.enum(["Highest", "High", "Medium", "Low", "Lowest"]).optional(),
      dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      developmentDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      flagged: z.boolean().optional(),
      analysisNotes: z.string().max(10000).optional(),
    })
    .refine((value) => Object.keys(value).length > 0, { message: "At least one field is required" }),
  query: z.any().optional(),
});

const commentSchema = z.object({
  params: z.object({ key: z.string().regex(keyRegex, "Invalid issue key format") }),
  body: z.object({ text: z.string().min(1).max(5000) }),
  query: z.any().optional(),
});

export function createIssuesRouter(issueService: IssueService): Router {
  const router = Router();

  router.get("/", async (req, res, next) => {
    try {
      const tagsParam = typeof req.query.tags === 'string' ? req.query.tags : undefined;
      const tagIds = tagsParam
        ? tagsParam.split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0)
        : undefined;
      const noTags = req.query.noTags === 'true';

      const issues = await issueService.getAll({
        filter: req.query.filter as any,
        assignee: req.query.assignee as string | undefined,
        priority: req.query.priority as string | undefined,
        status: req.query.status as string | undefined,
        sort: req.query.sort as any,
        order: req.query.order as any,
        tagIds,
        noTags,
      });
      res.json({ issues });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:key", validate(paramsSchema), async (req, res, next) => {
    try {
      const key = req.params.key as string;
      const issue = await issueService.getById(key);
      if (!issue) {
        throw new HttpError(404, "Issue not found");
      }
      res.json(issue);
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:key", validate(updateSchema), async (req, res, next) => {
    try {
      const key = req.params.key as string;
      const issue = await issueService.update(key, req.body);
      res.json(issue);
    } catch (error) {
      next(error);
    }
  });

  router.post("/:key/comments", validate(commentSchema), async (req, res, next) => {
    try {
      const key = req.params.key as string;
      await issueService.addComment(key, req.body.text);
      res.status(201).json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

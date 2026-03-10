import { Router } from "express";
import { z } from "zod";
import { TagService } from "../services/tag.service";
import { HttpError } from "../middleware/errorHandler";
import { validate } from "../middleware/validate";

const keyRegex = /^[A-Z]+-\d+$/;

const createTagSchema = z.object({
  params: z.any().optional(),
  body: z.object({
    name: z.string().min(1).max(50),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  }),
  query: z.any().optional(),
});

const deleteTagSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: z.any().optional(),
  query: z.object({ force: z.enum(["true", "false"]).optional() }),
});

const getTagUsageSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: z.any().optional(),
  query: z.any().optional(),
});

const setIssueTagsSchema = z.object({
  params: z.object({ key: z.string().regex(keyRegex, "Invalid issue key format") }),
  body: z.object({ tagIds: z.array(z.number().int().positive()) }),
  query: z.any().optional(),
});

export function createTagsRouter(tagService: TagService, issueService?: import('../services/issue.service').IssueService): Router {
  const router = Router();

  router.get("/counts", async (req, res, next) => {
    try {
      if (!issueService) {
        res.json({ counts: [], untaggedCount: 0 });
        return;
      }
      const result = await issueService.getTagCounts({
        filter: req.query.filter as any,
        assignee: req.query.assignee as string | undefined,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  router.get("/", async (_req, res, next) => {
    try {
      const tags = await tagService.getAll();
      res.json({ tags });
    } catch (error) {
      next(error);
    }
  });

  router.post("/", validate(createTagSchema), async (req, res, next) => {
    try {
      const tag = await tagService.create(req.body.name, req.body.color);
      res.status(201).json(tag);
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id/usage", validate(getTagUsageSchema), async (req, res, next) => {
    try {
      const usage = await tagService.getUsage(Number(req.params.id));
      if (!usage) {
        throw new HttpError(404, "Tag not found");
      }
      res.json(usage);
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:id", validate(deleteTagSchema), async (req, res, next) => {
    try {
      const usage = await tagService.getUsage(Number(req.params.id));
      if (!usage) {
        throw new HttpError(404, "Tag not found");
      }

      const forceDelete = req.query.force === "true";
      if (usage.issueCount > 0 && !forceDelete) {
        res.status(409).json({
          error: `Tag "${usage.tag.name}" is still assigned to ${usage.issueCount} defect${usage.issueCount === 1 ? "" : "s"}`,
          status: 409,
          usage,
        });
        return;
      }

      await tagService.remove(Number(req.params.id));
      res.json({ success: true, removedIssueCount: usage.issueCount });
    } catch (error) {
      next(error);
    }
  });

  router.put("/issue/:key", validate(setIssueTagsSchema), async (req, res, next) => {
    try {
      const tags = await tagService.setIssueTags(req.params.key as string, req.body.tagIds);
      res.json({ tags });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

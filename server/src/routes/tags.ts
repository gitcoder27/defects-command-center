import { Router } from "express";
import { z } from "zod";
import { TagService } from "../services/tag.service";
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
  query: z.any().optional(),
});

const setIssueTagsSchema = z.object({
  params: z.object({ key: z.string().regex(keyRegex, "Invalid issue key format") }),
  body: z.object({ tagIds: z.array(z.number().int().positive()) }),
  query: z.any().optional(),
});

export function createTagsRouter(tagService: TagService): Router {
  const router = Router();

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

  router.delete("/:id", validate(deleteTagSchema), async (req, res, next) => {
    try {
      await tagService.remove(Number(req.params.id));
      res.json({ success: true });
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

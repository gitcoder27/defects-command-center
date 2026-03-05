import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { AutomationService } from "../services/automation.service";
import { IssueService } from "../services/issue.service";
import { HttpError } from "../middleware/errorHandler";

const keySchema = z.object({
  params: z.object({ key: z.string().regex(/^[A-Z]+-\d+$/) }),
  query: z.any().optional(),
  body: z.any().optional(),
});

const prioritySchema = z.object({
  params: z.object({ priority: z.enum(["Highest", "High", "Medium", "Low", "Lowest"]) }),
  query: z.any().optional(),
  body: z.any().optional(),
});

export function createSuggestionsRouter(automationService: AutomationService, issueService: IssueService): Router {
  const router = Router();

  router.get("/assignee/:key", validate(keySchema), async (req, res, next) => {
    try {
      const key = req.params.key as string;
      const issue = await issueService.getById(key);
      if (!issue) {
        throw new HttpError(404, "Issue not found");
      }
      const ranked = await automationService.suggestAssignee();
      res.json({ issueKey: issue.jiraKey, suggestions: ranked });
    } catch (error) {
      next(error);
    }
  });

  router.get("/priority/:key", validate(keySchema), async (req, res, next) => {
    try {
      const key = req.params.key as string;
      const issue = await issueService.getById(key);
      if (!issue) {
        throw new HttpError(404, "Issue not found");
      }
      res.json(automationService.suggestPriority(issue.labels));
    } catch (error) {
      next(error);
    }
  });

  router.get("/duedate/:priority", validate(prioritySchema), async (req, res, next) => {
    try {
      const priority = req.params.priority as string;
      const suggestion = automationService.suggestDueDate(priority, new Date().toISOString());
      res.json(suggestion);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

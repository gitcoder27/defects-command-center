import { Router } from "express";
import { IssueService } from "../services/issue.service";

export function createOverviewRouter(issueService: IssueService): Router {
  const router = Router();

  router.get("/", async (req, res, next) => {
    try {
      const counts = await issueService.getOverviewCounts(req.auth!.user.workspaceId);
      res.json(counts);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

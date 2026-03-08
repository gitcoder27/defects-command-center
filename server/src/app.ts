import express from "express";
import path from "node:path";
import { existsSync } from "node:fs";
import { createIssuesRouter } from "./routes/issues";
import { createOverviewRouter } from "./routes/overview";
import { createTeamRouter } from "./routes/team";
import { createAlertsRouter } from "./routes/alerts";
import { createSuggestionsRouter } from "./routes/suggestions";
import { createSyncRouter } from "./routes/sync";
import { createConfigRouter } from "./routes/config";
import { createBackupsRouter } from "./routes/backups";
import { createTagsRouter } from "./routes/tags";
import { createTeamTrackerRouter } from "./routes/team-tracker";
import { createAuthRouter } from "./routes/auth";
import { createMyDayRouter } from "./routes/my-day";
import { createManagerDeskRouter } from "./routes/manager-desk";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { AlertService } from "./services/alert.service";
import { AutomationService } from "./services/automation.service";
import { AuthService } from "./services/auth.service";
import { BackupService } from "./services/backup.service";
import { IssueService } from "./services/issue.service";
import { ManagerDeskService } from "./services/manager-desk.service";
import { MyDayService } from "./services/my-day.service";
import { WorkloadService } from "./services/workload.service";
import { TagService } from "./services/tag.service";
import { TeamTrackerService } from "./services/team-tracker.service";
import { SyncEngine } from "./sync/engine";

export interface AppServices {
  issueService: IssueService;
  workloadService: WorkloadService;
  alertService: AlertService;
  automationService: AutomationService;
  syncEngine: SyncEngine;
  backupService: BackupService;
  tagService: TagService;
  teamTrackerService: TeamTrackerService;
  authService: AuthService;
  myDayService: MyDayService;
  managerDeskService: ManagerDeskService;
}

export function createApp(services: AppServices) {
  const app = express();
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/issues", createIssuesRouter(services.issueService));
  app.use("/api/overview", createOverviewRouter(services.issueService));
  app.use("/api/team", createTeamRouter(services.workloadService));
  app.use("/api/alerts", createAlertsRouter(services.alertService));
  app.use("/api/suggestions", createSuggestionsRouter(services.automationService, services.issueService));
  app.use("/api/sync", createSyncRouter(services.syncEngine));
  app.use("/api/config", createConfigRouter(services.syncEngine, services.backupService));
  app.use("/api/backups", createBackupsRouter(services.backupService));
  app.use("/api/tags", createTagsRouter(services.tagService, services.issueService));
  app.use("/api/auth", createAuthRouter(services.authService));
  app.use("/api/team-tracker", createTeamTrackerRouter(services.teamTrackerService));
  app.use("/api/my-day", createMyDayRouter(services.myDayService, services.authService));
  app.use(
    "/api/manager-desk",
    createManagerDeskRouter(services.managerDeskService, services.authService)
  );

  if (process.env.NODE_ENV === "production") {
    const clientDistPath = path.resolve(process.cwd(), "client", "dist");
    if (existsSync(clientDistPath)) {
      app.use(express.static(clientDistPath));
      app.get(/^\/(?!api).*/, (_req, res) => {
        res.sendFile(path.join(clientDistPath, "index.html"));
      });
    }
  }

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

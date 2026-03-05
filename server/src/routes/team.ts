import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { WorkloadService } from "../services/workload.service";
import { JiraClient } from "../jira/client";
import { db } from "../db/connection";
import { componentMap, configTable, developers as developersTable, issues } from "../db/schema";
import { eq } from "drizzle-orm";
import { config } from "../config";
import { getJiraApiToken } from "../runtime-credentials";

const paramsSchema = z.object({
  params: z.object({ accountId: z.string().regex(/^[A-Za-z0-9:-]+$/, "Invalid account id format") }),
  body: z.any().optional(),
  query: z.any().optional(),
});

const saveDevelopersSchema = z.object({
  body: z.object({
    developers: z.array(
      z.object({
        accountId: z.string().min(1),
        displayName: z.string().min(1),
        email: z.string().optional(),
        avatarUrl: z.string().optional(),
      })
    ),
  }),
  params: z.any().optional(),
  query: z.any().optional(),
});

const discoverSchema = z.object({
  body: z
    .object({
      jiraApiToken: z.string().min(1).optional(),
      query: z.string().optional(),
      startAt: z.number().int().min(0).optional(),
      maxResults: z.number().int().min(1).max(200).optional(),
    })
    .default({}),
  params: z.any().optional(),
  query: z.any().optional(),
});

async function getConfigValue(key: string): Promise<string | undefined> {
  const rows = await db.select().from(configTable).where(eq(configTable.key, key)).limit(1);
  return rows[0]?.value;
}

async function getStoredJiraApiToken(): Promise<string | undefined> {
  const rows = await db.select().from(configTable).where(eq(configTable.key, "jira_api_token")).limit(1);
  return rows[0]?.value;
}

async function normalizeLegacyDevelopers(): Promise<void> {
  // Remove deprecated placeholder developer records from legacy setup flows.
  await db.delete(componentMap).where(eq(componentMap.accountId, "dev-1"));
  await db.delete(developersTable).where(eq(developersTable.accountId, "dev-1"));

  const leadAccountId = await getConfigValue("jira_lead_account_id");
  if (!leadAccountId) {
    return;
  }

  const currentLead = await db
    .select()
    .from(developersTable)
    .where(eq(developersTable.accountId, leadAccountId))
    .limit(1);

  const fallbackLeadName = await db
    .select({ assigneeName: issues.assigneeName })
    .from(issues)
    .where(eq(issues.assigneeId, leadAccountId))
    .limit(1);

  const leadDisplayName = fallbackLeadName[0]?.assigneeName?.trim() || currentLead[0]?.displayName || "Lead";

  await db
    .insert(developersTable)
    .values({
      accountId: leadAccountId,
      displayName: leadDisplayName,
      email: currentLead[0]?.email ?? null,
      avatarUrl: currentLead[0]?.avatarUrl ?? null,
      isActive: 1,
    })
    .onConflictDoUpdate({
      target: developersTable.accountId,
      set: {
        displayName: leadDisplayName,
        isActive: 1,
      },
    });

  await db.delete(componentMap).where(eq(componentMap.accountId, "lead-1"));
  await db.delete(developersTable).where(eq(developersTable.accountId, "lead-1"));
}

export function createTeamRouter(workloadService: WorkloadService): Router {
  const router = Router();

  router.get("/workload", async (_req, res, next) => {
    try {
      await normalizeLegacyDevelopers();
      const workloads = await workloadService.getTeamWorkload();
      res.json({ developers: workloads });
    } catch (error) {
      next(error);
    }
  });

  router.get("/developers", async (_req, res, next) => {
    try {
      await normalizeLegacyDevelopers();
      const developers = await workloadService.getDevelopers();
      res.json({ developers });
    } catch (error) {
      next(error);
    }
  });

  router.post("/discover", validate(discoverSchema), async (req, res, next) => {
    try {
      const jiraBaseUrl = (await getConfigValue("jira_base_url")) ?? config.JIRA_BASE_URL ?? "";
      const jiraEmail = (await getConfigValue("jira_email")) ?? config.JIRA_EMAIL ?? "";
      const projectKey = (await getConfigValue("jira_project_key")) ?? config.JIRA_PROJECT_KEY ?? "";
      const token = req.body.jiraApiToken ?? (await getStoredJiraApiToken()) ?? getJiraApiToken() ?? config.JIRA_API_TOKEN ?? "";
      const query = (req.body.query as string | undefined)?.trim() || undefined;
      const startAt = (req.body.startAt as number | undefined) ?? 0;
      const maxResults = (req.body.maxResults as number | undefined) ?? 50;
      const missing: string[] = [];

      if (!jiraBaseUrl) {
        missing.push("jira base url");
      }
      if (!jiraEmail) {
        missing.push("jira email");
      }
      if (!projectKey) {
        missing.push("jira project key");
      }
      if (!token) {
        missing.push("jira api token");
      }

      if (missing.length > 0) {
        res.status(400).json({
          error: `Jira not configured: missing ${missing.join(", ")}`,
          status: 400,
        });
        return;
      }

      const client = new JiraClient(jiraBaseUrl, jiraEmail, token);
      const users = await client.getAssignableUsers(projectKey, {
        query,
        startAt,
        maxResults,
      });
      res.json({
        users: users.map((u) => ({
          accountId: u.accountId,
          displayName: u.displayName,
          email: u.emailAddress,
          avatarUrl: u.avatarUrls?.["48x48"],
        })),
        startAt,
        maxResults,
        count: users.length,
        hasMore: users.length === maxResults,
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/developers", validate(saveDevelopersSchema), async (req, res, next) => {
    try {
      const devs = req.body.developers as Array<{
        accountId: string;
        displayName: string;
        email?: string;
        avatarUrl?: string;
      }>;

      for (const dev of devs) {
        await db
          .insert(developersTable)
          .values({
            accountId: dev.accountId,
            displayName: dev.displayName,
            email: dev.email ?? null,
            avatarUrl: dev.avatarUrl ?? null,
            isActive: 1,
          })
          .onConflictDoUpdate({
            target: developersTable.accountId,
            set: {
              displayName: dev.displayName,
              email: dev.email ?? null,
              avatarUrl: dev.avatarUrl ?? null,
              isActive: 1,
            },
          });
      }

      res.json({ success: true, count: devs.length });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/developers/:accountId", validate(paramsSchema), async (req, res, next) => {
    try {
      const accountId = req.params.accountId as string;

      await db
        .update(developersTable)
        .set({ isActive: 0 })
        .where(eq(developersTable.accountId, accountId));

      res.json({ success: true, accountId });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:accountId/issues", validate(paramsSchema), async (req, res, next) => {
    try {
      const accountId = req.params.accountId as string;
      const issues = await workloadService.getDeveloperIssues(accountId);
      res.json({ issues });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

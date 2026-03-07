import { Router } from "express";
import { z } from "zod";
import type { AuthSessionResponse, AuthUser } from "shared/types";
import { validate } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";
import { AuthService, clearSessionCookie, serializeSessionCookie } from "../services/auth.service";

const loginSchema = z.object({
  body: z.object({
    username: z.string().min(1),
    password: z.string().min(1),
  }),
  params: z.any().optional(),
  query: z.any().optional(),
});

const registerSchema = z.object({
  body: z.object({
    username: z.string().min(1).max(100),
    password: z.string().min(6).max(200),
    displayName: z.string().min(1).max(200),
    role: z.enum(["manager", "developer"]),
    developerAccountId: z.string().optional(),
  }),
  params: z.any().optional(),
  query: z.any().optional(),
});

export function createAuthRouter(authService: AuthService): Router {
  const router = Router();

  router.post("/login", validate(loginSchema), async (req, res, next) => {
    try {
      const { username, password } = req.body;
      const result = await authService.authenticate(username, password);
      res.setHeader(
        "Set-Cookie",
        serializeSessionCookie(result.sessionId, authService.sessionMaxAgeSeconds)
      );
      const response: AuthSessionResponse = { user: result.user };
      res.json(response);
    } catch (error) {
      next(error);
    }
  });

  router.post("/register", validate(registerSchema), async (req, res, next) => {
    try {
      const userCount = await authService.getUserCount();

      // If users already exist, only a logged-in manager can create new users
      if (userCount > 0) {
        const cookies = parseCookieHeader(req.headers.cookie);
        const sessionId = cookies["dcc_session"];
        if (!sessionId) {
          res.status(401).json({ error: "Authentication required", status: 401 });
          return;
        }
        const caller = await authService.getUserForSession(sessionId);
        if (!caller || caller.role !== "manager") {
          res.status(403).json({ error: "Only managers can create users", status: 403 });
          return;
        }
      }

      const { username, password, displayName, role, developerAccountId } = req.body;
      const user = await authService.createUser({
        username,
        password,
        displayName,
        role,
        developerAccountId,
      });
      res.status(201).json({ user });
    } catch (error) {
      next(error);
    }
  });

  router.get("/users", requireAuth(authService), async (req, res, next) => {
    try {
      if (req.auth!.user.role !== "manager") {
        res.status(403).json({ error: "Manager access required", status: 403 });
        return;
      }
      const users = await authService.listUsers();
      res.json({ users });
    } catch (error) {
      next(error);
    }
  });

  router.get("/me", requireAuth(authService), async (req, res) => {
    const response: AuthSessionResponse = { user: req.auth!.user };
    res.json(response);
  });

  router.post("/logout", requireAuth(authService), async (req, res, next) => {
    try {
      await authService.invalidateSession(req.auth!.sessionId);
      res.setHeader("Set-Cookie", clearSessionCookie());
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

function parseCookieHeader(header?: string): Record<string, string> {
  if (!header) return {};
  return header
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, part) => {
      const idx = part.indexOf("=");
      if (idx > 0) {
        acc[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
      }
      return acc;
    }, {});
}

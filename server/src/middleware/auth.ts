import type { NextFunction, Request, Response } from "express";
import { AuthService, SESSION_COOKIE_NAME } from "../services/auth.service";
import { HttpError } from "./errorHandler";

function parseCookies(header?: string): Record<string, string> {
  if (!header) {
    return {};
  }

  return header
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, part) => {
      const equalsIndex = part.indexOf("=");
      if (equalsIndex <= 0) {
        return acc;
      }

      const name = part.slice(0, equalsIndex).trim();
      const value = part.slice(equalsIndex + 1).trim();
      acc[name] = decodeURIComponent(value);
      return acc;
    }, {});
}

async function loadRequestAuth(req: Request, authService: AuthService): Promise<void> {
  const cookies = parseCookies(req.headers.cookie);
  const sessionId = cookies[SESSION_COOKIE_NAME];
  if (!sessionId) {
    return;
  }

  const user = await authService.getUserForSession(sessionId);
  if (!user) {
    return;
  }

  req.auth = { sessionId, user };
}

export function requireAuth(authService: AuthService) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      await loadRequestAuth(req, authService);
      if (!req.auth) {
        throw new HttpError(401, "Authentication required");
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireDeveloper(authService: AuthService) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      await loadRequestAuth(req, authService);
      if (!req.auth) {
        throw new HttpError(401, "Authentication required");
      }
      if (req.auth.user.role !== "developer" || !req.auth.user.developerAccountId) {
        throw new HttpError(403, "Developer access required");
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

import type { AuthUser } from "shared/types";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        sessionId: string;
        user: AuthUser;
      };
    }
  }
}

export {};

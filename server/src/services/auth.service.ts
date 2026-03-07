import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { AuthUser, UserRole } from "shared/types";
import { db } from "../db/connection";
import { appSessions, appUsers } from "../db/schema";
import { HttpError } from "../middleware/errorHandler";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
export const SESSION_COOKIE_NAME = "dcc_session";

interface CreateUserParams {
  username: string;
  displayName: string;
  password: string;
  role: UserRole;
  developerAccountId?: string;
  isActive?: boolean;
}

interface PersistedUser {
  id: number;
  username: string;
  displayName: string;
  role: UserRole;
  developerAccountId?: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function addSeconds(iso: string, seconds: number): string {
  return new Date(new Date(iso).getTime() + seconds * 1000).toISOString();
}

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password: string, encoded: string): boolean {
  const [scheme, salt, hash] = encoded.split("$");
  if (scheme !== "scrypt" || !salt || !hash) {
    return false;
  }

  const derived = scryptSync(password, salt, 64);
  const stored = Buffer.from(hash, "hex");

  if (stored.length !== derived.length) {
    return false;
  }

  return timingSafeEqual(derived, stored);
}

function mapAuthUser(user: PersistedUser): AuthUser {
  return {
    username: user.username,
    accountId: user.developerAccountId ?? user.username,
    displayName: user.displayName,
    role: user.role,
    developerAccountId: user.developerAccountId,
  };
}

export function serializeSessionCookie(sessionId: string, maxAgeSeconds = SESSION_MAX_AGE_SECONDS): string {
  return [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionId)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
  ].join("; ");
}

export function clearSessionCookie(): string {
  return [
    `${SESSION_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ].join("; ");
}

export class AuthService {
  readonly sessionMaxAgeSeconds = SESSION_MAX_AGE_SECONDS;

  async createUser(params: CreateUserParams): Promise<AuthUser> {
    const username = normalizeUsername(params.username);
    if (!username) {
      throw new HttpError(400, "username is required");
    }

    if (params.role === "developer" && !params.developerAccountId) {
      throw new HttpError(400, "developerAccountId is required for developer users");
    }

    const now = nowIso();
    const inserted = await db
      .insert(appUsers)
      .values({
        username,
        displayName: params.displayName.trim(),
        passwordHash: hashPassword(params.password),
        role: params.role,
        developerAccountId: params.developerAccountId ?? null,
        isActive: params.isActive === false ? 0 : 1,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    const row = inserted[0];
    if (!row) {
      throw new Error("Failed to create user");
    }

    return mapAuthUser({
      id: row.id,
      username: row.username,
      displayName: row.displayName,
      role: row.role as UserRole,
      developerAccountId: row.developerAccountId ?? undefined,
    });
  }

  async authenticate(username: string, password: string): Promise<{ sessionId: string; user: AuthUser }> {
    const normalizedUsername = normalizeUsername(username);
    const rows = await db
      .select()
      .from(appUsers)
      .where(and(eq(appUsers.username, normalizedUsername), eq(appUsers.isActive, 1)))
      .limit(1);

    const row = rows[0];
    if (!row || !verifyPassword(password, row.passwordHash)) {
      throw new HttpError(401, "Invalid username or password");
    }

    const now = nowIso();
    const sessionId = randomBytes(32).toString("hex");
    await db.insert(appSessions).values({
      id: sessionId,
      userId: row.id,
      createdAt: now,
      expiresAt: addSeconds(now, this.sessionMaxAgeSeconds),
      lastSeenAt: now,
    });

    return {
      sessionId,
      user: mapAuthUser({
        id: row.id,
        username: row.username,
        displayName: row.displayName,
        role: row.role as UserRole,
        developerAccountId: row.developerAccountId ?? undefined,
      }),
    };
  }

  async getUserForSession(sessionId: string): Promise<AuthUser | undefined> {
    const rows = await db
      .select({
        sessionId: appSessions.id,
        userId: appUsers.id,
        username: appUsers.username,
        displayName: appUsers.displayName,
        role: appUsers.role,
        developerAccountId: appUsers.developerAccountId,
        isActive: appUsers.isActive,
        expiresAt: appSessions.expiresAt,
      })
      .from(appSessions)
      .innerJoin(appUsers, eq(appUsers.id, appSessions.userId))
      .where(eq(appSessions.id, sessionId))
      .limit(1);

    const row = rows[0];
    if (!row || row.isActive !== 1) {
      return undefined;
    }

    const now = nowIso();
    if (new Date(row.expiresAt).getTime() <= new Date(now).getTime()) {
      await this.invalidateSession(sessionId);
      return undefined;
    }

    await db
      .update(appSessions)
      .set({ lastSeenAt: now })
      .where(eq(appSessions.id, sessionId));

    return mapAuthUser({
      id: row.userId,
      username: row.username,
      displayName: row.displayName,
      role: row.role as UserRole,
      developerAccountId: row.developerAccountId ?? undefined,
    });
  }

  async invalidateSession(sessionId: string): Promise<void> {
    await db.delete(appSessions).where(eq(appSessions.id, sessionId));
  }

  async getUserCount(): Promise<number> {
    const rows = await db
      .select({ id: appUsers.id })
      .from(appUsers)
      .where(eq(appUsers.isActive, 1));
    return rows.length;
  }

  async listUsers(): Promise<AuthUser[]> {
    const rows = await db
      .select()
      .from(appUsers)
      .where(eq(appUsers.isActive, 1));

    return rows.map((row) =>
      mapAuthUser({
        id: row.id,
        username: row.username,
        displayName: row.displayName,
        role: row.role as UserRole,
        developerAccountId: row.developerAccountId ?? undefined,
      })
    );
  }
}

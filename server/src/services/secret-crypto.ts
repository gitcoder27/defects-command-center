import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { resolveWorkspacePath } from "../db/paths";

const SECRET_PREFIX = "enc:v1:";
const KEY_FILE_PATH = resolveWorkspacePath("data/secrets/jira-token.key");
const KEY_ENV_NAMES = ["JIRA_TOKEN_ENCRYPTION_KEY", "LEADOS_SECRET_KEY"] as const;

function decodeConfiguredKey(raw: string): Buffer {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Jira token encryption key is empty");
  }

  const base64 = Buffer.from(trimmed, "base64");
  if (base64.length === 32) {
    return base64;
  }

  const hex = Buffer.from(trimmed, "hex");
  if (hex.length === 32) {
    return hex;
  }

  return crypto.createHash("sha256").update(trimmed).digest();
}

function readConfiguredKey(): Buffer | undefined {
  for (const envName of KEY_ENV_NAMES) {
    const raw = process.env[envName];
    if (raw?.trim()) {
      return decodeConfiguredKey(raw);
    }
  }
  return undefined;
}

function getDevelopmentKey(): Buffer {
  if (process.env.VITEST) {
    return crypto.createHash("sha256").update("lead-os-vitest-secret-key").digest();
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("Set JIRA_TOKEN_ENCRYPTION_KEY or LEADOS_SECRET_KEY before storing Jira API tokens");
  }

  fs.mkdirSync(path.dirname(KEY_FILE_PATH), { recursive: true, mode: 0o700 });
  if (!fs.existsSync(KEY_FILE_PATH)) {
    fs.writeFileSync(KEY_FILE_PATH, crypto.randomBytes(32).toString("base64"), { mode: 0o600 });
  }

  return decodeConfiguredKey(fs.readFileSync(KEY_FILE_PATH, "utf8"));
}

function getEncryptionKey(): Buffer {
  return readConfiguredKey() ?? getDevelopmentKey();
}

export function isEncryptedSecret(value: string): boolean {
  return value.startsWith(SECRET_PREFIX);
}

export function encryptSecret(plainText: string): string {
  const trimmed = plainText.trim();
  if (!trimmed) {
    throw new Error("Cannot encrypt an empty secret");
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(trimmed, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    SECRET_PREFIX.slice(0, -1),
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
}

export function decryptSecret(storedValue: string): string {
  if (!isEncryptedSecret(storedValue)) {
    return storedValue;
  }

  const [, , ivValue, tagValue, encryptedValue] = storedValue.split(":");
  if (!ivValue || !tagValue || !encryptedValue) {
    throw new Error("Stored Jira API token is not a valid encrypted secret");
  }

  const decipher = crypto.createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function encryptSecretIfNeeded(storedValue: string): string {
  return isEncryptedSecret(storedValue) ? storedValue : encryptSecret(storedValue);
}

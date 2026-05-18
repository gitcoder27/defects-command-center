import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  decryptSecret,
  encryptSecret,
  encryptSecretIfNeeded,
  isEncryptedSecret,
} from "../src/services/secret-crypto";

const originalJiraKey = process.env.JIRA_TOKEN_ENCRYPTION_KEY;
const originalLeadOsKey = process.env.LEADOS_SECRET_KEY;

function restoreEnv() {
  if (originalJiraKey === undefined) {
    delete process.env.JIRA_TOKEN_ENCRYPTION_KEY;
  } else {
    process.env.JIRA_TOKEN_ENCRYPTION_KEY = originalJiraKey;
  }

  if (originalLeadOsKey === undefined) {
    delete process.env.LEADOS_SECRET_KEY;
  } else {
    process.env.LEADOS_SECRET_KEY = originalLeadOsKey;
  }
}

describe("secret crypto", () => {
  beforeEach(() => {
    delete process.env.JIRA_TOKEN_ENCRYPTION_KEY;
    delete process.env.LEADOS_SECRET_KEY;
  });

  afterEach(() => {
    restoreEnv();
  });

  it("round-trips secrets with a configured base64 encryption key", () => {
    process.env.JIRA_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");

    const encrypted = encryptSecret("  jira-token-value  ");

    expect(isEncryptedSecret(encrypted)).toBe(true);
    expect(encrypted).not.toContain("jira-token-value");
    expect(decryptSecret(encrypted)).toBe("jira-token-value");
  });

  it("accepts hex and passphrase fallback keys", () => {
    process.env.JIRA_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 3).toString("hex");
    const hexEncrypted = encryptSecret("hex-token");
    expect(decryptSecret(hexEncrypted)).toBe("hex-token");

    delete process.env.JIRA_TOKEN_ENCRYPTION_KEY;
    process.env.LEADOS_SECRET_KEY = "workspace-local-passphrase";
    const passphraseEncrypted = encryptSecret("passphrase-token");
    expect(decryptSecret(passphraseEncrypted)).toBe("passphrase-token");
  });

  it("leaves plaintext values alone and avoids double encryption", () => {
    process.env.JIRA_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString("base64");

    const encrypted = encryptSecret("stored-token");

    expect(decryptSecret("plain-token")).toBe("plain-token");
    expect(encryptSecretIfNeeded(encrypted)).toBe(encrypted);
    expect(decryptSecret(encryptSecretIfNeeded("new-token"))).toBe("new-token");
  });

  it("rejects empty, malformed, and tampered encrypted secrets", () => {
    process.env.JIRA_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 5).toString("base64");

    expect(() => encryptSecret("   ")).toThrow("Cannot encrypt an empty secret");
    expect(() => decryptSecret("enc:v1:missing")).toThrow(
      "Stored Jira API token is not a valid encrypted secret"
    );

    const encrypted = encryptSecret("token-to-tamper");
    const parts = encrypted.split(":");
    parts[4] = Buffer.from("tampered").toString("base64url");

    expect(() => decryptSecret(parts.join(":"))).toThrow();
  });
});

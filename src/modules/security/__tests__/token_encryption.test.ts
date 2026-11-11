import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  encryptOAuthToken,
  decryptOAuthToken,
  type OAuthTokenPayload,
} from "../token_encryption";

describe("Token Encryption (Key Derivation from Master Secret)", () => {
  const originalEnv = process.env.FLAG_GMAIL_AUTO_SYNC;

  beforeEach(() => {
    delete process.env.FLAG_GMAIL_AUTO_SYNC;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.FLAG_GMAIL_AUTO_SYNC = originalEnv;
    } else {
      delete process.env.FLAG_GMAIL_AUTO_SYNC;
    }
  });

  const samplePayload: OAuthTokenPayload = {
    accessToken: "ya29.sample_access_token_12345",
    refreshToken: "1//04_sample_refresh_token_abcde",
    expiresAt: Date.now() + 3600 * 1000,
    scopes: ["https://www.googleapis.com/auth/gmail.readonly"],
    provider: "google",
    workspaceId: "00000000-0000-0000-0000-000000000001",
  };

  it("fails fast if feature flag gmail_auto_sync is disabled (kill-switch)", () => {
    expect(() => encryptOAuthToken(samplePayload)).toThrow(
      "OAuth token encryption is disabled by feature flag 'gmail_auto_sync'."
    );
  });

  it("successfully encrypts and decrypts payload when feature flag is enabled", () => {
    process.env.FLAG_GMAIL_AUTO_SYNC = "true";

    const encrypted = encryptOAuthToken(samplePayload);

    expect(encrypted.algorithm).toBe("aes-256-gcm");
    expect(encrypted.keyVersion).toBe("v1");
    expect(encrypted.ciphertext).toBeTruthy();
    expect(encrypted.encryptedDek).toBeTruthy();

    const decrypted = decryptOAuthToken(encrypted);
    expect(decrypted.accessToken).toBe(samplePayload.accessToken);
    expect(decrypted.refreshToken).toBe(samplePayload.refreshToken);
    expect(decrypted.workspaceId).toBe(samplePayload.workspaceId);
    expect(decrypted.provider).toBe("google");
  });

  it("throws authentication integrity error if ciphertext is tampered with", () => {
    process.env.FLAG_GMAIL_AUTO_SYNC = "true";

    const encrypted = encryptOAuthToken(samplePayload);
    // Tamper with the ciphertext
    const tampered = {
      ...encrypted,
      ciphertext: Buffer.from("tampered_content_data").toString("base64"),
    };

    expect(() => decryptOAuthToken(tampered)).toThrow();
  });
});

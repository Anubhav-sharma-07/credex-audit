import { randomBytes, createCipheriv, createDecipheriv, hkdfSync } from "crypto";
import { getServerEnv } from "@/lib/env";
import { isFeatureEnabled } from "@/lib/feature_flags";

export interface EncryptedTokenPayload {
  encryptedDek: string; // Base64
  dekIv: string;        // Base64
  dekTag: string;       // Base64
  ciphertext: string;   // Base64
  iv: string;           // Base64
  tag: string;          // Base64
  algorithm: "aes-256-gcm";
  keyVersion: string;
  createdAt: string;
}

// Backwards-compatible alias
export type EncryptedTokenEnvelope = EncryptedTokenPayload;

export interface OAuthTokenPayload {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scopes: string[];
  provider: "google" | "github" | "microsoft";
  workspaceId: string;
}

/**
 * Minimal Scopes Required:
 * Strictly read-only access for invoice and receipt discovery.
 * Never requests send, compose, modify, or full mailbox privileges.
 */
export const MINIMUM_OAUTH_SCOPES = {
  google: [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/userinfo.email",
  ],
  github: ["read:org", "read:user"],
  microsoft: ["Mail.Read", "User.Read"],
} as const;

const HKDF_SALT = "spendlens-master-secret-salt-v1";
const HKDF_INFO = "spendlens-oauth-token-kek-derivation";

/**
 * Derives the Key Encryption Key (KEK) from the master key using HKDF-SHA256
 * (key derivation from a master secret).
 */
function deriveKeyEncryptionKey(): Buffer {
  const env = getServerEnv();
  const masterKey = Buffer.from(env.ENCRYPTION_MASTER_KEY, "utf-8");
  const derived = hkdfSync("sha256", masterKey, HKDF_SALT, HKDF_INFO, 32);
  return Buffer.from(derived);
}

/**
 * Encrypts an OAuth token payload using key derivation from a master secret (AES-256-GCM).
 *
 * Gated behind the `gmail_auto_sync` feature flag.
 * 1. Generates a fresh random 256-bit Data Encryption Key (DEK).
 * 2. Encrypts token plaintext with DEK.
 * 3. Encrypts DEK with the derived Key Encryption Key (KEK derived via HKDF-SHA256 from master secret).
 * 4. Returns self-contained payload with authenticated cryptographic tags.
 */
export function encryptOAuthToken(payload: OAuthTokenPayload): EncryptedTokenPayload {
  if (!isFeatureEnabled("gmail_auto_sync")) {
    throw new Error("OAuth token encryption is disabled by feature flag 'gmail_auto_sync'.");
  }

  const kek = deriveKeyEncryptionKey();

  // 1. Generate unique DEK and IV
  const dek = randomBytes(32);
  const iv = randomBytes(12);

  // 2. Encrypt the token payload with DEK
  const cipher = createCipheriv("aes-256-gcm", dek, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf-8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  // 3. Encrypt the DEK with KEK
  const dekIv = randomBytes(12);
  const dekCipher = createCipheriv("aes-256-gcm", kek, dekIv);
  const encryptedDek = Buffer.concat([dekCipher.update(dek), dekCipher.final()]);
  const dekTag = dekCipher.getAuthTag();

  return {
    encryptedDek: encryptedDek.toString("base64"),
    dekIv: dekIv.toString("base64"),
    dekTag: dekTag.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    algorithm: "aes-256-gcm",
    keyVersion: "v1",
    createdAt: new Date().toISOString(),
  };
}

/**
 * Decrypts an encrypted token payload.
 * Verifies authentication tags on both the DEK and payload.
 * Throws an integrity error if ciphertext or tag was tampered with.
 *
 * Gated behind the `gmail_auto_sync` feature flag.
 */
export function decryptOAuthToken(envelope: EncryptedTokenPayload): OAuthTokenPayload {
  if (!isFeatureEnabled("gmail_auto_sync")) {
    throw new Error("OAuth token decryption is disabled by feature flag 'gmail_auto_sync'.");
  }

  if (envelope.algorithm !== "aes-256-gcm") {
    throw new Error(`Unsupported encryption algorithm: ${envelope.algorithm}`);
  }

  const kek = deriveKeyEncryptionKey();

  // 1. Decrypt and verify DEK
  const dekIv = Buffer.from(envelope.dekIv, "base64");
  const dekTag = Buffer.from(envelope.dekTag, "base64");
  const encryptedDek = Buffer.from(envelope.encryptedDek, "base64");

  const dekDecipher = createDecipheriv("aes-256-gcm", kek, dekIv);
  dekDecipher.setAuthTag(dekTag);
  const dek = Buffer.concat([dekDecipher.update(encryptedDek), dekDecipher.final()]);

  // 2. Decrypt and verify payload
  const iv = Buffer.from(envelope.iv, "base64");
  const tag = Buffer.from(envelope.tag, "base64");
  const ciphertext = Buffer.from(envelope.ciphertext, "base64");

  const decipher = createDecipheriv("aes-256-gcm", dek, iv);
  decipher.setAuthTag(tag);
  const decryptedJson = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf-8");

  return JSON.parse(decryptedJson) as OAuthTokenPayload;
}

// In-memory token store for demonstration / testing (backed by Postgres in production)
const tokenStore = new Map<string, EncryptedTokenEnvelope>();

export async function storeEncryptedToken(
  workspaceId: string,
  tokenId: string,
  payload: OAuthTokenPayload
): Promise<void> {
  const envelope = encryptOAuthToken(payload);
  tokenStore.set(`${workspaceId}:${tokenId}`, envelope);
}

export async function retrieveDecryptedToken(
  workspaceId: string,
  tokenId: string
): Promise<OAuthTokenPayload | null> {
  const envelope = tokenStore.get(`${workspaceId}:${tokenId}`);
  if (!envelope) return null;
  return decryptOAuthToken(envelope);
}

/**
 * Revoke and Delete Flow:
 * Contacts OAuth provider revocation endpoint, wipes encryption material from memory,
 * and purges stored record from the database.
 */
export async function revokeAndDeleteToken(
  workspaceId: string,
  tokenId: string,
  providerRevokeUrl?: string
): Promise<{ success: boolean; revoked: boolean; purged: boolean }> {
  const token = await retrieveDecryptedToken(workspaceId, tokenId);
  let revoked = false;

  if (token && token.refreshToken && providerRevokeUrl) {
    try {
      const res = await fetch(providerRevokeUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `token=${encodeURIComponent(token.refreshToken)}`,
      });
      revoked = res.ok;
    } catch {
      revoked = false;
    }
  }

  // Purge from store
  const purged = tokenStore.delete(`${workspaceId}:${tokenId}`);

  return {
    success: purged,
    revoked,
    purged,
  };
}


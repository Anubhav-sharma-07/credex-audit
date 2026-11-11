import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getServerEnv, resetServerEnv } from "../env";

describe("Environment Boot Validation & Secrets Gate", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetServerEnv();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    resetServerEnv();
    process.env = { ...originalEnv };
  });

  it("fails fast in production when secrets are missing or use default values", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    delete process.env.ENCRYPTION_MASTER_KEY;
    delete process.env.SESSION_SECRET;
    delete process.env.CSRF_SECRET;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    expect(() => getServerEnv()).toThrow(/Environment configuration error at boot/);
  });

  it("fails in production when placeholder Supabase URL or known defaults are passed", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://placeholder.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "placeholder-anon-key";
    process.env.ENCRYPTION_MASTER_KEY = "spendlens_default_master_encryption_key_32_bytes_min!";
    process.env.SESSION_SECRET = "spendlens_session_rotation_secret_32_bytes_minimum!";
    process.env.CSRF_SECRET = "spendlens_csrf_hmac_secret_key_32_bytes_minimum!";

    expect(() => getServerEnv()).toThrow(/Production deployment requires a valid, non-placeholder/);
  });

  it("succeeds in production when valid, high-entropy secrets are provided", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://real-project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "eyJh...real-anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "eyJh...real-service-key";
    process.env.ENCRYPTION_MASTER_KEY = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90";
    process.env.SESSION_SECRET = "b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1";
    process.env.CSRF_SECRET = "c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2";

    const env = getServerEnv();
    expect(env.NODE_ENV).toBe("production");
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe("https://real-project.supabase.co");
    expect(env.ENCRYPTION_MASTER_KEY).toBe("a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90");
  });

  it("provides safe development fallback in development/test environment", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
    delete process.env.ENCRYPTION_MASTER_KEY;
    delete process.env.SESSION_SECRET;
    delete process.env.CSRF_SECRET;

    const env = getServerEnv();
    expect(env.NODE_ENV).toBe("development");
    expect(env.ENCRYPTION_MASTER_KEY).toBeDefined();
    expect(env.SESSION_SECRET).toBeDefined();
    expect(env.CSRF_SECRET).toBeDefined();
  });
});

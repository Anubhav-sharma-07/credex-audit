import { z } from "zod";

const KNOWN_INSECURE_DEFAULTS = new Set([
  "spendlens_default_master_encryption_key_32_bytes_min!",
  "spendlens_session_rotation_secret_32_bytes_minimum!",
  "spendlens_csrf_hmac_secret_key_32_bytes_minimum!",
  "placeholder-anon-key",
  "https://placeholder.supabase.co",
]);

/**
 * Server-side Environment Variables Schema.
 * Evaluated at boot time to fail fast on missing, placeholder, or default secrets.
 * In production: strictly rejects any placeholder or default values.
 */
const ServerEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  
  // Database & Supabase
  DATABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

  // Cryptographic Keys (NO public defaults in schema - production must fail if missing)
  ENCRYPTION_MASTER_KEY: z
    .string()
    .min(32, "ENCRYPTION_MASTER_KEY must be at least 32 characters (256 bits)")
    .optional(),
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET must be at least 32 characters")
    .optional(),
  CSRF_SECRET: z
    .string()
    .min(32, "CSRF_SECRET must be at least 32 characters")
    .optional(),

  // Rate Limiting (Distributed Upstash Redis)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Email & Turnstile
  RESEND_API_KEY: z.string().optional(),
  TURNSTILE_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),

  // Observability
  SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),

  // LLM Inference
  GROQ_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.NODE_ENV === "production") {
    // 1. Supabase URL and Anon Key
    if (!data.NEXT_PUBLIC_SUPABASE_URL || data.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder") || KNOWN_INSECURE_DEFAULTS.has(data.NEXT_PUBLIC_SUPABASE_URL)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["NEXT_PUBLIC_SUPABASE_URL"],
        message: "Production deployment requires a valid, non-placeholder NEXT_PUBLIC_SUPABASE_URL.",
      });
    }
    if (!data.NEXT_PUBLIC_SUPABASE_ANON_KEY || data.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes("placeholder") || KNOWN_INSECURE_DEFAULTS.has(data.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["NEXT_PUBLIC_SUPABASE_ANON_KEY"],
        message: "Production deployment requires a valid, non-placeholder NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      });
    }
    if (!data.SUPABASE_SERVICE_ROLE_KEY && !data.DATABASE_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SUPABASE_SERVICE_ROLE_KEY"],
        message: "Production deployment requires SUPABASE_SERVICE_ROLE_KEY or DATABASE_URL for server-side persistence.",
      });
    }

    // 2. Cryptographic Keys (Must not use known defaults in production)
    if (!data.ENCRYPTION_MASTER_KEY || KNOWN_INSECURE_DEFAULTS.has(data.ENCRYPTION_MASTER_KEY)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ENCRYPTION_MASTER_KEY"],
        message: "Production requires a unique ENCRYPTION_MASTER_KEY (min 32 chars). Insecure default rejected.",
      });
    }
    if (!data.SESSION_SECRET || KNOWN_INSECURE_DEFAULTS.has(data.SESSION_SECRET)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SESSION_SECRET"],
        message: "Production requires a unique SESSION_SECRET (min 32 chars). Insecure default rejected.",
      });
    }
    if (!data.CSRF_SECRET || KNOWN_INSECURE_DEFAULTS.has(data.CSRF_SECRET)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["CSRF_SECRET"],
        message: "Production requires a unique CSRF_SECRET (min 32 chars). Insecure default rejected.",
      });
    }
  }
});

export type ServerEnv = {
  NODE_ENV: "development" | "production" | "test";
  DATABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  ENCRYPTION_MASTER_KEY: string;
  SESSION_SECRET: string;
  CSRF_SECRET: string;
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
  RESEND_API_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  NEXT_PUBLIC_TURNSTILE_SITE_KEY?: string;
  SENTRY_DSN?: string;
  NEXT_PUBLIC_SENTRY_DSN?: string;
  GROQ_API_KEY?: string;
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
};

let parsedEnv: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (parsedEnv) return parsedEnv;

  const result = ServerEnvSchema.safeParse(process.env);
  if (!result.success) {
    const errorDetails = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    const message = `[FATAL] Environment configuration error at boot:\n${errorDetails}`;
    if (process.env.NODE_ENV === "production") {
      throw new Error(message);
    } else {
      console.warn(`[WARN] Development environment configuration fallback:\n${errorDetails}`);
      parsedEnv = {
        NODE_ENV: (process.env.NODE_ENV as "development" | "production" | "test") || "development",
        DATABASE_URL: process.env.DATABASE_URL,
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key",
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
        ENCRYPTION_MASTER_KEY: process.env.ENCRYPTION_MASTER_KEY || "spendlens_dev_master_encryption_key_32_bytes_min!",
        SESSION_SECRET: process.env.SESSION_SECRET || "spendlens_dev_session_secret_32_bytes_minimum!",
        CSRF_SECRET: process.env.CSRF_SECRET || "spendlens_dev_csrf_secret_key_32_bytes_minimum!",
        UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
        UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
        RESEND_API_KEY: process.env.RESEND_API_KEY,
        TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
        NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
        SENTRY_DSN: process.env.SENTRY_DSN,
        NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
        GROQ_API_KEY: process.env.GROQ_API_KEY,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      };
      return parsedEnv;
    }
  }

  // When parsing succeeds in production, fill non-optional fields
  parsedEnv = {
    ...result.data,
    NEXT_PUBLIC_SUPABASE_URL: result.data.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: result.data.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key",
    ENCRYPTION_MASTER_KEY: result.data.ENCRYPTION_MASTER_KEY || "",
    SESSION_SECRET: result.data.SESSION_SECRET || "",
    CSRF_SECRET: result.data.CSRF_SECRET || "",
  };

  return parsedEnv;
}

export function resetServerEnv(): void {
  parsedEnv = null;
}

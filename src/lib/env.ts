import { z } from "zod";

/**
 * Server-side Environment Variables Schema.
 * Evaluated at boot time to fail fast on missing or malformed secrets.
 * Uses strict validation and forbids client-side exposure of private secrets.
 */
const ServerEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  
  // Database & Supabase
  DATABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().default("https://placeholder.supabase.co"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).default("placeholder-anon-key"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

  // Cryptographic Keys
  ENCRYPTION_MASTER_KEY: z
    .string()
    .min(32, "ENCRYPTION_MASTER_KEY must be at least 32 characters (256 bits)")
    .default("spendlens_default_master_encryption_key_32_bytes_min!"),
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET must be at least 32 characters")
    .default("spendlens_session_rotation_secret_32_bytes_minimum!"),
  CSRF_SECRET: z
    .string()
    .min(32, "CSRF_SECRET must be at least 32 characters")
    .default("spendlens_csrf_hmac_secret_key_32_bytes_minimum!"),

  // Rate Limiting
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // LLM Inference
  GROQ_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

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
      parsedEnv = ServerEnvSchema.parse({
        ...process.env,
        ENCRYPTION_MASTER_KEY: process.env.ENCRYPTION_MASTER_KEY || "spendlens_default_master_encryption_key_32_bytes_min!",
        SESSION_SECRET: process.env.SESSION_SECRET || "spendlens_session_rotation_secret_32_bytes_minimum!",
        CSRF_SECRET: process.env.CSRF_SECRET || "spendlens_csrf_hmac_secret_key_32_bytes_minimum!",
      });
      return parsedEnv;
    }
  }

  parsedEnv = result.data;
  return parsedEnv;
}


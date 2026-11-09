import { NextResponse } from "next/server";

export interface RateLimitConfig {
  windowSeconds: number;
  maxRequests: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

interface WindowEntry {
  timestamps: number[];
}

// In-memory sliding window store (can be seamlessly swapped for Upstash Redis / Postgres)
const slidingWindowStore = new Map<string, WindowEntry>();

// Default Rate Limit Configurations per Route
export const ROUTE_RATE_LIMITS = {
  audit: { windowSeconds: 60, maxRequests: 20 },
  summary: { windowSeconds: 60, maxRequests: 10 },
  lead: { windowSeconds: 60, maxRequests: 5 },
  insights: { windowSeconds: 60, maxRequests: 30 },
  claimAudit: { windowSeconds: 60, maxRequests: 10 },
  import: { windowSeconds: 60, maxRequests: 15 },
  auth: { windowSeconds: 60, maxRequests: 10 },
} as const;

/**
 * Evaluates rate limit for a given identifier using a sliding window algorithm.
 *
 * @param identifier - Client IP or Account / Workspace ID
 * @param routeName - Route identifier for distinct buckets
 * @param config - Window duration and maximum request ceiling
 */
export function checkRateLimit(
  identifier: string,
  routeName: string,
  config: RateLimitConfig
): RateLimitResult {
  const key = `${routeName}:${identifier}`;
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const windowStart = now - windowMs;

  let entry = slidingWindowStore.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    slidingWindowStore.set(key, entry);
  }

  // Filter timestamps within current sliding window
  entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);

  if (entry.timestamps.length >= config.maxRequests) {
    const oldest = entry.timestamps[0] || now;
    const resetMs = oldest + windowMs - now;
    const resetSeconds = Math.max(1, Math.ceil(resetMs / 1000));

    return {
      allowed: false,
      limit: config.maxRequests,
      remaining: 0,
      resetSeconds,
    };
  }

  // Record current request
  entry.timestamps.push(now);
  const remaining = config.maxRequests - entry.timestamps.length;
  const resetSeconds = config.windowSeconds;

  return {
    allowed: true,
    limit: config.maxRequests,
    remaining,
    resetSeconds,
  };
}

/**
 * Creates standard HTTP 429 Rate Limit Response with Retry-After headers.
 */
export function createRateLimitResponse(
  result: RateLimitResult,
  requestId?: string
): NextResponse {
  return NextResponse.json(
    {
      error: "Too many requests. Rate limit exceeded.",
      retryAfterSeconds: result.resetSeconds,
      limit: result.limit,
      requestId: requestId || `req_${Date.now()}`,
    },
    {
      status: 429,
      headers: {
        "Retry-After": result.resetSeconds.toString(),
        "X-RateLimit-Limit": result.limit.toString(),
        "X-RateLimit-Remaining": result.remaining.toString(),
        "X-RateLimit-Reset": result.resetSeconds.toString(),
      },
    }
  );
}

/**
 * Extracts client IP from request headers (supporting x-forwarded-for, x-real-ip, etc.).
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "127.0.0.1";
}

/**
 * Clear rate limit store (useful for test suites).
 */
export function resetRateLimits(): void {
  slidingWindowStore.clear();
}


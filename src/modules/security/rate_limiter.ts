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

// In-memory sliding window store (used for tests and when Upstash Redis is unconfigured)
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
 * Distributed rate limiter via Upstash Redis REST API.
 * Guarantees atomicity across multi-region serverless instances without local state drift.
 */
async function checkUpstashRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token || url.includes("placeholder")) return null;

  try {
    const redisKey = `ratelimit:${key}`;
    const resp = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", redisKey],
        ["EXPIRE", redisKey, config.windowSeconds, "NX"],
        ["TTL", redisKey],
      ]),
      cache: "no-store",
    });

    if (!resp.ok) return null;
    const results = await resp.json();
    const count = Number(results[0]?.result || 1);
    const ttl = Number(results[2]?.result || config.windowSeconds);
    const resetSeconds = Math.max(1, ttl);

    if (count > config.maxRequests) {
      return {
        allowed: false,
        limit: config.maxRequests,
        remaining: 0,
        resetSeconds,
      };
    }

    return {
      allowed: true,
      limit: config.maxRequests,
      remaining: Math.max(0, config.maxRequests - count),
      resetSeconds,
    };
  } catch {
    return null;
  }
}

/**
 * Evaluates rate limit for a given identifier using distributed Upstash Redis if configured,
 * with automatic fallback to an in-memory sliding window algorithm.
 */
export async function checkRateLimitAsync(
  identifier: string,
  routeName: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const key = `${routeName}:${identifier}`;
  const upstashResult = await checkUpstashRateLimit(key, config);
  if (upstashResult) {
    return upstashResult;
  }
  return checkRateLimit(identifier, routeName, config);
}

/**
 * Synchronous in-memory rate limit check (sliding window).
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

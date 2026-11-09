import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseAndValidateBody } from "@/modules/security/request_validation";
import { checkRateLimit, createRateLimitResponse, getClientIp } from "@/modules/security/rate_limiter";
import { logger } from "@/lib/logger";

const MetricSchema = z.object({
  id: z.string().max(100),
  name: z.enum(["CLS", "FCP", "FID", "INP", "LCP", "TTFB"]),
  value: z.number().min(0),
  rating: z.enum(["good", "needs-improvement", "poor"]),
  delta: z.number().optional(),
  navigationType: z.string().max(50).optional(),
  pathname: z.string().max(255).default("/"),
}).strict();

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(ip, "web_vitals", { windowSeconds: 60, maxRequests: 60 });
  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit);
  }

  const validation = await parseAndValidateBody(request, MetricSchema, {
    maxSizeBytes: 8 * 1024,
    routeContext: "api/vitals",
  });

  if (!validation.success) {
    return validation.response;
  }

  const { data, requestId } = validation;

  // Log Web Vitals metric in structured Pino format for analytics & alerting
  logger.info(`[WEB_VITALS] ${data.name} on ${data.pathname}: ${data.value} (${data.rating})`, {
    requestId,
    metric: data.name,
    value: data.value,
    rating: data.rating,
    pathname: data.pathname,
  });

  return NextResponse.json({ ok: true, requestId }, { status: 200 });
}


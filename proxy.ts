import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit, createRateLimitResponse, ROUTE_RATE_LIMITS, getClientIp } from "@/modules/security/rate_limiter";

const PROTECTED_PREFIXES = [
  "/overview",
  "/subscriptions",
  "/vendors",
  "/renewals",
  "/analytics",
  "/savings",
  "/insights",
  "/reports",
  "/admin",
  "/import",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const clientIp = getClientIp(request);

  // 1. Generate Cryptographic Nonce for Strict CSP
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  // Define Strict Content Security Policy with Nonces (no unsafe-inline on scripts)
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval';
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https:;
    font-src 'self' data:;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `
    .replace(/\s{2,}/g, " ")
    .trim();

  // 2. Rate Limiting on Public APIs
  if (pathname.startsWith("/api/audit")) {
    const rateCheck = checkRateLimit(clientIp, "audit", ROUTE_RATE_LIMITS.audit);
    if (!rateCheck.allowed) {
      return createRateLimitResponse(rateCheck);
    }
  } else if (pathname.startsWith("/api/summary")) {
    const rateCheck = checkRateLimit(clientIp, "summary", ROUTE_RATE_LIMITS.summary);
    if (!rateCheck.allowed) {
      return createRateLimitResponse(rateCheck);
    }
  } else if (pathname.startsWith("/api/lead")) {
    const rateCheck = checkRateLimit(clientIp, "lead", ROUTE_RATE_LIMITS.lead);
    if (!rateCheck.allowed) {
      return createRateLimitResponse(rateCheck);
    }
  } else if (pathname.startsWith("/api/insights")) {
    const rateCheck = checkRateLimit(clientIp, "insights", ROUTE_RATE_LIMITS.insights);
    if (!rateCheck.allowed) {
      return createRateLimitResponse(rateCheck);
    }
  } else if (pathname.startsWith("/api/workspace/claim-audit")) {
    const rateCheck = checkRateLimit(clientIp, "claimAudit", ROUTE_RATE_LIMITS.claimAudit);
    if (!rateCheck.allowed) {
      return createRateLimitResponse(rateCheck);
    }
  }

  // 3. Protected Workspace Route Enforcement
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  let response: NextResponse;

  if (isProtected) {
    const cookies = request.cookies;
    const hasAuthCookie = Array.from(cookies.getAll()).some(
      (c) =>
        c.name.includes("auth-token") ||
        c.name.startsWith("sb-") ||
        c.name === "spendlens_session"
    );

    const isDevMock = process.env.NODE_ENV === "development" && !process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!hasAuthCookie && !isDevMock) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      response = NextResponse.redirect(loginUrl);
    } else {
      response = NextResponse.next({
        request: {
          headers: new Headers(request.headers),
        },
      });
    }
  } else {
    response = NextResponse.next({
      request: {
        headers: new Headers(request.headers),
      },
    });
  }

  // 4. Attach Security Headers
  response.headers.set("x-nonce", nonce);
  response.headers.set("Content-Security-Policy", cspHeader);
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

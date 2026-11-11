import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import {
  checkRateLimit,
  createRateLimitResponse,
  ROUTE_RATE_LIMITS,
  getClientIp,
} from "@/modules/security/rate_limiter";

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

async function getSupabaseUser(request: NextRequest, response: NextResponse) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey || url === "https://mock.supabase.co" || url.includes("placeholder")) {
    return null;
  }

  try {
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.delete(name);
          response.cookies.set({ name, value: "", ...options, maxAge: 0 });
        },
      },
    });

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const clientIp = getClientIp(request);

  // 1. Generate Cryptographic Nonce for Strict CSP
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";

  // Strict Content Security Policy with Nonces
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ""};
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
    if (!rateCheck.allowed) return createRateLimitResponse(rateCheck);
  } else if (pathname.startsWith("/api/summary")) {
    const rateCheck = checkRateLimit(clientIp, "summary", ROUTE_RATE_LIMITS.summary);
    if (!rateCheck.allowed) return createRateLimitResponse(rateCheck);
  } else if (pathname.startsWith("/api/lead")) {
    const rateCheck = checkRateLimit(clientIp, "lead", ROUTE_RATE_LIMITS.lead);
    if (!rateCheck.allowed) return createRateLimitResponse(rateCheck);
  } else if (pathname.startsWith("/api/insights")) {
    const rateCheck = checkRateLimit(clientIp, "insights", ROUTE_RATE_LIMITS.insights);
    if (!rateCheck.allowed) return createRateLimitResponse(rateCheck);
  } else if (pathname.startsWith("/api/workspace/claim-audit")) {
    const rateCheck = checkRateLimit(clientIp, "claimAudit", ROUTE_RATE_LIMITS.claimAudit);
    if (!rateCheck.allowed) return createRateLimitResponse(rateCheck);
  }

  // 3. Inject Nonce and CSP into Request Headers for Next.js Server Components / SSR
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", cspHeader);

  // 4. Protected Workspace Route Enforcement
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  let response: NextResponse;

  if (isProtected) {
    const candidateResponse = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    const user = await getSupabaseUser(request, candidateResponse);
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    response = candidateResponse;
  } else {
    response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // 5. Attach Security Headers to Outgoing Response
  response.headers.set("x-nonce", nonce);
  response.headers.set("Content-Security-Policy", cspHeader);
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
  );

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

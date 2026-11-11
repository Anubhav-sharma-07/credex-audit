import { NextRequest, NextResponse } from "next/server";
import { getAuditRepository } from "@/modules/audit/repository";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, createRateLimitResponse, ROUTE_RATE_LIMITS, getClientIp } from "@/modules/security/rate_limiter";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(clientIp, "audit_read_api", ROUTE_RATE_LIMITS.audit);
  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let supabaseClient = undefined;

  if (url && key && !url.includes("placeholder")) {
    if (typeof globalThis.WebSocket === "undefined") {
      globalThis.WebSocket = class DummyWebSocket {} as unknown as typeof WebSocket;
    }
    supabaseClient = createClient(url, key, { auth: { persistSession: false } });
  }

  const repo = getAuditRepository(supabaseClient);
  // Search by share_token first, then fallback to id
  let audit = await repo.getByShareToken(token);
  if (!audit) {
    audit = await repo.getById(token);
  }

  if (!audit) {
    return NextResponse.json({ error: "Audit record not found or expired" }, { status: 404 });
  }

  return NextResponse.json({ audit }, { status: 200 });
}

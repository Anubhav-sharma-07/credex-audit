import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { getAuditRepository } from "@/modules/audit/repository";
import { createClient } from "@supabase/supabase-js";
import { formatCurrency } from "@/lib/formatters";

// No `runtime = "edge"`: the default Node.js runtime has a much larger size limit,
// which fixes the "Edge Function api/og is 1.05 MB" deploy error.

const MONEY = /^\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?$|^\$\d{1,9}(?:\.\d{2})?$/;
const PLACEHOLDER = "—";

function money(value: string | null): string {
  return value && MONEY.test(value) ? value : PLACEHOLDER;
}

function teamSize(value: string | null): string {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 9999 ? String(n) : PLACEHOLDER;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const token = searchParams.get("token") || searchParams.get("id");

    let spend = PLACEHOLDER;
    let savings = PLACEHOLDER;
    let team = PLACEHOLDER;

    // 1. Authoritative lookup from database using share_token / audit id
    if (token) {
      try {
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
        let audit = await repo.getByShareToken(token);
        if (!audit) {
          audit = await repo.getById(token);
        }
        if (audit) {
          spend = formatCurrency(Math.round(audit.totalMonthlySpend * 100), "USD");
          savings = formatCurrency(Math.round(audit.totalMonthlySavings * 100), "USD");
          team = String(audit.teamSize);
        }
      } catch (err) {
        console.error("OG authoritative database lookup failed:", err);
      }
    }

    // 2. Fallback to sanitized parameters only if no token parameter was given
    if (spend === PLACEHOLDER && !token) {
      spend = money(searchParams.get("spend"));
      savings = money(searchParams.get("savings"));
      team = teamSize(searchParams.get("team"));
    }

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            backgroundColor: "#F6F4EF",
            padding: "60px 80px",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {/* Top brand bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  backgroundColor: "#F28B38",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#15191F",
                  fontWeight: 900,
                  fontSize: "24px",
                }}
              >
                SL
              </div>
              <span style={{ fontSize: "28px", fontWeight: 800, color: "#15191F", letterSpacing: "-0.5px" }}>
                SpendLens
              </span>
            </div>
            <div
              style={{
                fontSize: "16px",
                color: "#625D53",
                fontFamily: "monospace",
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
              AI spend audit
            </div>
          </div>

          {/* Findings */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div style={{ fontSize: "20px", color: "#625D53" }}>
              Team of {team} • monthly AI tool spend
            </div>
            <div style={{ display: "flex", gap: "40px" }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  backgroundColor: "#FFFFFF",
                  border: "2px solid #DCD8CD",
                  borderRadius: "8px",
                  padding: "24px 32px",
                  minWidth: "300px",
                }}
              >
                <span style={{ fontSize: "14px", fontWeight: 600, color: "#625D53", textTransform: "uppercase" }}>
                  Current monthly spend
                </span>
                <span style={{ fontSize: "44px", fontWeight: 800, color: "#15191F", marginTop: "8px" }}>
                  {spend}
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  backgroundColor: "#EBF5F0",
                  border: "2px solid #23734B",
                  borderRadius: "8px",
                  padding: "24px 32px",
                  minWidth: "300px",
                }}
              >
                <span style={{ fontSize: "14px", fontWeight: 600, color: "#23734B", textTransform: "uppercase" }}>
                  Estimated monthly savings
                </span>
                <span style={{ fontSize: "44px", fontWeight: 800, color: "#23734B", marginTop: "8px" }}>
                  {savings === PLACEHOLDER ? savings : `+${savings}`}
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: "1px solid #DCD8CD",
              paddingTop: "24px",
              color: "#969083",
              fontSize: "14px",
            }}
          >
            <span>Estimate based on published list pricing. Review before acting.</span>
            <span>spendlens.demo</span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        // Cached appropriately
        headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" },
      }
    );
  } catch {
    return new Response("Failed to generate OG image", { status: 500 });
  }
}

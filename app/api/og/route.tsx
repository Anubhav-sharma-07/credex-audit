import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const spend = searchParams.get("spend") || "$476.00";
    const savings = searchParams.get("savings") || "$180.00";
    const team = searchParams.get("team") || "5";

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
          {/* Top Brand Bar */}
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
              Deterministic Audit Report
            </div>
          </div>

          {/* Center Audit Findings Callout */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div style={{ fontSize: "20px", color: "#625D53" }}>
              Engineering Team Spend Evaluation • {team} Active Engineers
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
                  Current Monthly Spend
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
                  Identified Monthly Savings
                </span>
                <span style={{ fontSize: "44px", fontWeight: 800, color: "#23734B", marginTop: "8px" }}>
                  +{savings}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Metadata */}
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
            <span>Verified against official vendor pricing catalog rules</span>
            <span>spendlens.demo</span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch {
    return new Response("Failed to generate OG image", { status: 500 });
  }
}


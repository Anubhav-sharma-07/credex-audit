import { describe, it, expect } from "vitest";
import { runAuditEngine } from "../engine";
import type { AuditContext } from "../types";

describe("Audit Engine Output & Finding Wording Snapshots", () => {
  it("generates exact user-facing wording and evidence for Cursor Business downgrade", () => {
    const ctx: AuditContext = {
      teamSize: 4,
      useCase: "coding",
      referenceDate: "2026-05-15T00:00:00Z",
      subscriptions: [
        {
          id: "sub_cursor_biz",
          toolId: "cursor",
          planId: "business",
          seats: 4,
          actualMonthlySpendMinor: 16000, // $160/mo
          billingCycle: "monthly",
          ownerEmail: "eng@company.com",
        },
      ],
    };

    const result = runAuditEngine(ctx);
    expect(result.findings.length).toBe(1);
    const f = result.findings[0];

    expect(f.title).toBe("Right-size Business to Pro");
    expect(f.description).toBe(
      "Cursor Business adds SSO and audit logs primarily needed by teams of 10+. Cursor Pro covers complete AI feature set at $20/seat."
    );
    expect(f.confidence).toBe("confirmed");
    expect(f.currentMonthlyMinor).toBe(16000);
    expect(f.projectedMonthlyMinor).toBe(8000);
    expect(f.savingsMinor).toBe(8000);
    expect(f.pricingSource.url).toBe("https://www.cursor.com/pricing");
    expect(f.evidence).toContain(
      "4 seats is at or below the recommended threshold (9 seats) for Business."
    );
    expect(f.evidence).toContain(
      "You currently pay $160/mo (list price for 4 seats: $160/mo). Projected cost on Pro: $80/mo."
    );
  });

  it("generates exact phrasing and question format for consolidation review", () => {
    const ctx: AuditContext = {
      teamSize: 5,
      useCase: "coding",
      referenceDate: "2026-05-15T00:00:00Z",
      subscriptions: [
        {
          id: "sub_cur",
          toolId: "cursor",
          planId: "pro",
          seats: 5,
          actualMonthlySpendMinor: 10000,
          billingCycle: "monthly",
        },
        {
          id: "sub_win",
          toolId: "windsurf",
          planId: "pro",
          seats: 5,
          actualMonthlySpendMinor: 7500,
          billingCycle: "monthly",
        },
      ],
    };

    const result = runAuditEngine(ctx);
    const dupFinding = result.findings.find((f) => f.kind === "duplicate_category");
    expect(dupFinding).toBeDefined();
    expect(dupFinding!.confidence).toBe("estimated");
    expect(dupFinding!.title).toContain("Possible duplicate category");
    expect(dupFinding!.description).toContain(
      "Review whether your developers could standardize on one coding assistant"
    );
  });
});


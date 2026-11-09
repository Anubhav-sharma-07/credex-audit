import { describe, it, expect } from "vitest";
import { seatsExceedTeamRule, planDowngradeRule, annualVsMonthlyRule } from "../rules";
import { resolveFindings } from "../resolver";
import type { AuditContext, SubscriptionInput, Finding } from "../types";

describe("Mutation Check (Confirming rule integrity)", () => {
  const ctx: AuditContext = {
    subscriptions: [],
    teamSize: 5,
    useCase: "coding",
    referenceDate: "2026-05-15T00:00:00Z",
  };

  it("fails if seatsExceedTeamRule applies operator is mutated to >=", () => {
    // If mutated from `sub.seats > ctx.teamSize` to `sub.seats >= ctx.teamSize`:
    const subAtTeamSize: SubscriptionInput = {
      id: "sub_exact",
      toolId: "cursor",
      planId: "pro",
      seats: 5, // Exactly teamSize
      actualMonthlySpendMinor: 10000,
      billingCycle: "monthly",
    };
    // Proper rule must NOT apply when seats == teamSize
    expect(seatsExceedTeamRule.applies(ctx, subAtTeamSize)).toBe(false);
    expect(seatsExceedTeamRule.evaluate(ctx, subAtTeamSize)).toBeNull();
  });

  it("fails if planDowngradeRule threshold is mutated from 9 to 10 for Cursor Business", () => {
    const subAtThreshold: SubscriptionInput = {
      id: "sub_cursor_10",
      toolId: "cursor",
      planId: "business",
      seats: 10,
      actualMonthlySpendMinor: 40000,
      billingCycle: "monthly",
    };
    // At 10 seats, Cursor Business is justified (SSO / compliance needed at 10+)
    expect(planDowngradeRule.applies(ctx, subAtThreshold)).toBe(false);
    expect(planDowngradeRule.evaluate(ctx, subAtThreshold)).toBeNull();
  });

  it("fails if annualVsMonthlyRule applies to annual subscriptions", () => {
    const subAnnual: SubscriptionInput = {
      id: "sub_ann",
      toolId: "claude",
      planId: "team",
      seats: 5,
      actualMonthlySpendMinor: 12500,
      billingCycle: "annual",
    };
    expect(annualVsMonthlyRule.applies(ctx, subAnnual)).toBe(false);
  });

  it("fails if resolver fails to deduplicate findings touching the same subscription", () => {
    const finding1: Finding = {
      id: "f1",
      ruleId: "seats_exceed_team",
      toolId: "cursor",
      subscriptionId: "sub_1",
      kind: "seats_exceed_team",
      title: "Excess seats",
      description: "Downsize seats",
      currentMonthlyMinor: 10000,
      projectedMonthlyMinor: 6000,
      savingsMinor: 4000,
      confidence: "confirmed",
      evidence: [],
      assumptions: [],
      pricingSource: { url: "https://cursor.com", verifiedAt: "2026-05-10", isStale: false },
    };

    const finding2: Finding = {
      id: "f2",
      ruleId: "annual_vs_monthly",
      toolId: "cursor",
      subscriptionId: "sub_1", // Same subscription!
      kind: "annual_vs_monthly",
      title: "Annual switch",
      description: "Switch to annual",
      currentMonthlyMinor: 10000,
      projectedMonthlyMinor: 8000,
      savingsMinor: 2000,
      confidence: "confirmed",
      evidence: [],
      assumptions: [],
      pricingSource: { url: "https://cursor.com", verifiedAt: "2026-05-10", isStale: false },
    };

    const result = resolveFindings([finding1, finding2]);
    // Exactly 1 winner
    expect(result.resolvedFindings.length).toBe(1);
    expect(result.resolvedFindings[0].id).toBe("f1"); // Winner has higher savings ($40 vs $20)
    // Finding2 must be listed as alternative
    expect(result.resolvedFindings[0].alternatives?.length).toBe(1);
    expect(result.resolvedFindings[0].alternatives![0].id).toBe("f2");
    expect(result.suppressedFindings.length).toBe(1);
  });
});


import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import type { SubscriptionInput, ToolId, BillingCycle, UseCase } from "../types";
import { runAuditEngine } from "../engine";

const toolArbitrary = fc.constantFrom<ToolId>(
  "cursor",
  "github_copilot",
  "claude",
  "chatgpt",
  "gemini",
  "windsurf"
);

const planArbitrary = fc.constantFrom(
  "hobby",
  "free",
  "pro",
  "plus",
  "team",
  "business",
  "enterprise"
);

const billingCycleArbitrary = fc.constantFrom<BillingCycle>("monthly", "annual");
const useCaseArbitrary = fc.constantFrom<UseCase>("coding", "writing", "data", "research", "mixed");

const subscriptionArbitrary = (id: string): fc.Arbitrary<SubscriptionInput> =>
  fc.record({
    id: fc.constant(id),
    toolId: toolArbitrary,
    planId: planArbitrary,
    seats: fc.integer({ min: 1, max: 100 }),
    actualMonthlySpendMinor: fc.option(fc.integer({ min: 0, max: 500000 }), { nil: null }),
    billingCycle: billingCycleArbitrary,
    ownerEmail: fc.option(fc.emailAddress(), { nil: null }),
    renewalDate: fc.option(
      fc.constantFrom("2026-05-20", "2026-06-01", "2026-06-15", "2026-07-01"),
      { nil: null }
    ),
    previousPriceMinor: fc.option(fc.integer({ min: 0, max: 500000 }), { nil: null }),
  });

const contextArbitrary = fc
  .record({
    subCount: fc.integer({ min: 1, max: 6 }),
    teamSize: fc.integer({ min: 1, max: 50 }),
    useCase: useCaseArbitrary,
    monthlyBudgetMinor: fc.option(fc.integer({ min: 1000, max: 1000000 }), { nil: null }),
  })
  .chain(({ subCount, teamSize, useCase, monthlyBudgetMinor }) => {
    const subArbs = Array.from({ length: subCount }, (_, i) => subscriptionArbitrary(`sub_${i}`));
    return fc.tuple(...subArbs).map((subscriptions) => ({
      subscriptions,
      teamSize,
      useCase,
      monthlyBudgetMinor,
      referenceDate: "2026-05-15T00:00:00Z",
    }));
  });

describe("Property-Based Invariants (fast-check)", () => {
  it("Property 1: savings are strictly non-negative (savingsMinor >= 0)", () => {
    fc.assert(
      fc.property(contextArbitrary, (ctx) => {
        const result = runAuditEngine(ctx);
        expect(result.forecast.monthlySavingsMinor).toBeGreaterThanOrEqual(0);
        expect(result.forecast.annualSavingsMinor).toBeGreaterThanOrEqual(0);
        for (const f of result.findings) {
          expect(f.savingsMinor).toBeGreaterThanOrEqual(0);
          expect(f.projectedMonthlyMinor).toBeLessThanOrEqual(f.currentMonthlyMinor);
        }
      }),
      { numRuns: 100 }
    );
  });

  it("Property 2: annual savings strictly equal 12x monthly in minor units with zero drift", () => {
    fc.assert(
      fc.property(contextArbitrary, (ctx) => {
        const result = runAuditEngine(ctx);
        expect(result.forecast.annualCurrentMinor).toBe(result.forecast.monthlyCurrentMinor * 12);
        expect(result.forecast.annualProjectedMinor).toBe(result.forecast.monthlyProjectedMinor * 12);
        expect(result.forecast.annualSavingsMinor).toBe(result.forecast.monthlySavingsMinor * 12);
        for (const r of result.forecast.renewalProjections) {
          expect(r.annualSavingsMinor).toBe(r.currentAnnualMinor - r.projectedAnnualMinor);
        }
      }),
      { numRuns: 100 }
    );
  });

  it("Property 3: result is independent of input subscription order (permutation invariance)", () => {
    fc.assert(
      fc.property(contextArbitrary, (ctx) => {
        const reversedCtx = {
          ...ctx,
          subscriptions: [...ctx.subscriptions].reverse(),
        };
        const result1 = runAuditEngine(ctx);
        const result2 = runAuditEngine(reversedCtx);

        expect(result1.forecast.monthlySavingsMinor).toBe(result2.forecast.monthlySavingsMinor);
        expect(result1.forecast.annualSavingsMinor).toBe(result2.forecast.annualSavingsMinor);
        expect(result1.findings.map((f) => f.id).sort()).toEqual(
          result2.findings.map((f) => f.id).sort()
        );
      }),
      { numRuns: 100 }
    );
  });

  it("Property 4: idempotency (running twice produces identical output)", () => {
    fc.assert(
      fc.property(contextArbitrary, (ctx) => {
        const run1 = runAuditEngine(ctx);
        const run2 = runAuditEngine(ctx);
        expect(run1).toEqual(run2);
      }),
      { numRuns: 100 }
    );
  });

  it("Property 5: no subscription is double counted in primary findings", () => {
    fc.assert(
      fc.property(contextArbitrary, (ctx) => {
        const result = runAuditEngine(ctx);
        const subscriptionIds = result.findings
          .map((f) => f.subscriptionId)
          .filter((id): id is string => id !== undefined);

        const uniqueSubIds = new Set(subscriptionIds);
        expect(uniqueSubIds.size).toBe(subscriptionIds.length);
      }),
      { numRuns: 100 }
    );
  });
});


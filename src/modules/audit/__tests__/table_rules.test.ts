import { describe, it, expect } from "vitest";
import type { AuditContext, SubscriptionInput } from "../types";
import {
  seatsExceedTeamRule,
  planDowngradeRule,
  annualVsMonthlyRule,
  unusedFreeTierRule,
  missingOwnerRule,
  priceIncreaseRule,
  renewalUpcomingRule,
  budgetOverrunRule,
  duplicateCategoryRule,
} from "../rules";

const baseCtx: AuditContext = {
  subscriptions: [],
  teamSize: 5,
  useCase: "coding",
  referenceDate: "2026-05-15T00:00:00Z",
};

describe("Table-Driven Rule Tests", () => {
  describe("seatsExceedTeamRule", () => {
    const cases = [
      { seats: 3, teamSize: 5, expectedFires: false, desc: "seats < teamSize" },
      { seats: 5, teamSize: 5, expectedFires: false, desc: "seats == teamSize (boundary)" },
      { seats: 6, teamSize: 5, expectedFires: true, expectedExcess: 1, desc: "seats == teamSize + 1 (boundary)" },
      { seats: 10, teamSize: 5, expectedFires: true, expectedExcess: 5, desc: "seats > teamSize" },
    ];

    cases.forEach(({ seats, teamSize, expectedFires, expectedExcess, desc }) => {
      it(`evaluates ${desc}`, () => {
        const sub: SubscriptionInput = {
          id: "sub_cursor",
          toolId: "cursor",
          planId: "pro",
          seats,
          actualMonthlySpendMinor: seats * 2000,
          billingCycle: "monthly",
        };
        const ctx = { ...baseCtx, teamSize };
        const applies = seatsExceedTeamRule.applies(ctx, sub);
        expect(applies).toBe(expectedFires);

        const finding = seatsExceedTeamRule.evaluate(ctx, sub);
        if (expectedFires) {
          expect(finding).not.toBeNull();
          expect(finding!.confidence).toBe("confirmed");
          expect(finding!.savingsMinor).toBe(expectedExcess! * 2000);
        } else {
          expect(finding).toBeNull();
        }
      });
    });
  });

  describe("planDowngradeRule boundaries", () => {
    const cases = [
      // Cursor Business: threshold 9 seats
      { toolId: "cursor" as const, planId: "business", seats: 9, expectedFires: true, desc: "Cursor Business at 9 seats" },
      { toolId: "cursor" as const, planId: "business", seats: 10, expectedFires: false, desc: "Cursor Business at 10 seats" },
      // GitHub Copilot Enterprise: threshold 19 seats
      { toolId: "github_copilot" as const, planId: "enterprise", seats: 19, expectedFires: true, desc: "Copilot Enterprise at 19 seats" },
      { toolId: "github_copilot" as const, planId: "enterprise", seats: 20, expectedFires: false, desc: "Copilot Enterprise at 20 seats" },
      // Claude Team: threshold 4 seats (min 5 seats for team workspace)
      { toolId: "claude" as const, planId: "team", seats: 4, expectedFires: true, desc: "Claude Team at 4 seats" },
      { toolId: "claude" as const, planId: "team", seats: 5, expectedFires: false, desc: "Claude Team at 5 seats" },
      // ChatGPT Team: threshold 1 seat (min 2 seats for team workspace)
      { toolId: "chatgpt" as const, planId: "team", seats: 1, expectedFires: true, desc: "ChatGPT Team at 1 seat" },
      { toolId: "chatgpt" as const, planId: "team", seats: 2, expectedFires: false, desc: "ChatGPT Team at 2 seats" },
      // Windsurf Team: threshold 2 seats
      { toolId: "windsurf" as const, planId: "team", seats: 2, expectedFires: true, desc: "Windsurf Team at 2 seats" },
      { toolId: "windsurf" as const, planId: "team", seats: 3, expectedFires: false, desc: "Windsurf Team at 3 seats" },
    ];

    cases.forEach(({ toolId, planId, seats, expectedFires, desc }) => {
      it(`evaluates ${desc}`, () => {
        const sub: SubscriptionInput = {
          id: `sub_${toolId}`,
          toolId,
          planId,
          seats,
          actualMonthlySpendMinor: null, // Test list price fallback
          billingCycle: "monthly",
        };
        const applies = planDowngradeRule.applies(baseCtx, sub);
        expect(applies).toBe(expectedFires);

        const finding = planDowngradeRule.evaluate(baseCtx, sub);
        if (expectedFires) {
          expect(finding).not.toBeNull();
          expect(finding!.savingsMinor).toBeGreaterThan(0);
          expect(finding!.confidence).toBe("confirmed");
        } else {
          expect(finding).toBeNull();
        }
      });
    });
  });

  describe("annualVsMonthlyRule", () => {
    it("fires when monthly flex is used on plan offering annual discount", () => {
      const sub: SubscriptionInput = {
        id: "sub_claude_monthly",
        toolId: "claude",
        planId: "team",
        seats: 5,
        actualMonthlySpendMinor: 15000, // 5 * $30 = $150
        billingCycle: "monthly",
      };
      expect(annualVsMonthlyRule.applies(baseCtx, sub)).toBe(true);
      const finding = annualVsMonthlyRule.evaluate(baseCtx, sub);
      expect(finding).not.toBeNull();
      // Monthly flex: $150/mo. Annual: 5 * $25 = $125/mo. Savings: $25/mo (2500 minor)
      expect(finding!.savingsMinor).toBe(2500);
      expect(finding!.confidence).toBe("confirmed");
    });

    it("does not fire when already on annual billing", () => {
      const sub: SubscriptionInput = {
        id: "sub_claude_annual",
        toolId: "claude",
        planId: "team",
        seats: 5,
        actualMonthlySpendMinor: 12500,
        billingCycle: "annual",
      };
      expect(annualVsMonthlyRule.applies(baseCtx, sub)).toBe(false);
      expect(annualVsMonthlyRule.evaluate(baseCtx, sub)).toBeNull();
    });
  });

  describe("unusedFreeTierRule", () => {
    it("fires when user is on hobby/free tier", () => {
      const subHobby: SubscriptionInput = {
        id: "sub_cursor_hobby",
        toolId: "cursor",
        planId: "hobby",
        seats: 1,
        actualMonthlySpendMinor: 0,
        billingCycle: "monthly",
      };
      expect(unusedFreeTierRule.applies(baseCtx, subHobby)).toBe(true);
      const finding = unusedFreeTierRule.evaluate(baseCtx, subHobby);
      expect(finding).not.toBeNull();
      expect(finding!.kind).toBe("unused_free_tier");
      expect(finding!.savingsMinor).toBe(0);
      expect(finding!.confidence).toBe("confirmed");
    });
  });

  describe("missingOwnerRule", () => {
    it("fires when owner is unassigned or whitespace", () => {
      const subNoOwner: SubscriptionInput = {
        id: "sub_missing",
        toolId: "cursor",
        planId: "pro",
        seats: 2,
        actualMonthlySpendMinor: 4000,
        billingCycle: "monthly",
        ownerEmail: null,
      };
      expect(missingOwnerRule.applies(baseCtx, subNoOwner)).toBe(true);
      const finding = missingOwnerRule.evaluate(baseCtx, subNoOwner);
      expect(finding).not.toBeNull();
      expect(finding!.kind).toBe("missing_owner");
      expect(finding!.savingsMinor).toBe(0); // Governance finding
      expect(finding!.confidence).toBe("confirmed");

      const subWhitespace: SubscriptionInput = { ...subNoOwner, ownerEmail: "   " };
      expect(missingOwnerRule.applies(baseCtx, subWhitespace)).toBe(true);
    });

    it("does not fire when owner is provided", () => {
      const subWithOwner: SubscriptionInput = {
        id: "sub_owned",
        toolId: "cursor",
        planId: "pro",
        seats: 2,
        actualMonthlySpendMinor: 4000,
        billingCycle: "monthly",
        ownerEmail: "lead@startup.com",
      };
      expect(missingOwnerRule.applies(baseCtx, subWithOwner)).toBe(false);
      expect(missingOwnerRule.evaluate(baseCtx, subWithOwner)).toBeNull();
    });
  });

  describe("priceIncreaseRule", () => {
    it("fires when actual spend exceeds previous price", () => {
      const sub: SubscriptionInput = {
        id: "sub_increased",
        toolId: "cursor",
        planId: "business",
        seats: 10,
        actualMonthlySpendMinor: 44000, // $440/mo
        previousPriceMinor: 40000,      // was $400/mo
        previousPriceDate: "2026-01-01",
        billingCycle: "monthly",
      };
      expect(priceIncreaseRule.applies(baseCtx, sub)).toBe(true);
      const finding = priceIncreaseRule.evaluate(baseCtx, sub);
      expect(finding).not.toBeNull();
      expect(finding!.savingsMinor).toBe(4000); // $40 difference
      expect(finding!.confidence).toBe("estimated");
    });

    it("does not fire when price is unchanged or decreased", () => {
      const sub: SubscriptionInput = {
        id: "sub_stable",
        toolId: "cursor",
        planId: "pro",
        seats: 2,
        actualMonthlySpendMinor: 4000,
        previousPriceMinor: 4000,
        billingCycle: "monthly",
      };
      expect(priceIncreaseRule.applies(baseCtx, sub)).toBe(false);
    });
  });

  describe("renewalUpcomingRule boundaries", () => {
    // Reference date: 2026-05-15
    const cases = [
      { renewalDate: "2026-05-14", expectedFires: false, desc: "yesterday (past renewal)" },
      { renewalDate: "2026-05-15", expectedFires: true, desc: "today (0 days, boundary)" },
      { renewalDate: "2026-06-14", expectedFires: true, desc: "30 days away (boundary)" },
      { renewalDate: "2026-06-15", expectedFires: false, desc: "31 days away (boundary)" },
    ];

    cases.forEach(({ renewalDate, expectedFires, desc }) => {
      it(`evaluates renewal date ${desc}`, () => {
        const sub: SubscriptionInput = {
          id: "sub_renewal",
          toolId: "cursor",
          planId: "pro",
          seats: 5,
          actualMonthlySpendMinor: 10000,
          billingCycle: "monthly",
          renewalDate,
        };
        const applies = renewalUpcomingRule.applies(baseCtx, sub);
        expect(applies).toBe(expectedFires);
        const finding = renewalUpcomingRule.evaluate(baseCtx, sub);
        if (expectedFires) {
          expect(finding).not.toBeNull();
          expect(finding!.kind).toBe("renewal_upcoming");
        } else {
          expect(finding).toBeNull();
        }
      });
    });
  });

  describe("budgetOverrunRule", () => {
    it("fires when total monthly spend exceeds budget cap", () => {
      const ctx: AuditContext = {
        ...baseCtx,
        monthlyBudgetMinor: 5000, // $50 budget
        subscriptions: [
          {
            id: "s1",
            toolId: "cursor",
            planId: "pro",
            seats: 2,
            actualMonthlySpendMinor: 4000, // $40
            billingCycle: "monthly",
          },
          {
            id: "s2",
            toolId: "chatgpt",
            planId: "plus",
            seats: 1,
            actualMonthlySpendMinor: 2000, // $20 (total $60 > $50)
            billingCycle: "monthly",
          },
        ],
      };
      const findings = budgetOverrunRule.evaluate(ctx);
      expect(findings.length).toBe(1);
      expect(findings[0].savingsMinor).toBe(1000); // $10 overrun
    });

    it("does not fire when spend is under budget", () => {
      const ctx: AuditContext = {
        ...baseCtx,
        monthlyBudgetMinor: 10000, // $100 budget
        subscriptions: [
          {
            id: "s1",
            toolId: "cursor",
            planId: "pro",
            seats: 2,
            actualMonthlySpendMinor: 4000,
            billingCycle: "monthly",
          },
        ],
      };
      expect(budgetOverrunRule.evaluate(ctx).length).toBe(0);
    });
  });

  describe("duplicateCategoryRule", () => {
    it("flags duplicate IDE assistants with estimated confidence", () => {
      const ctx: AuditContext = {
        ...baseCtx,
        subscriptions: [
          { id: "s_cur", toolId: "cursor", planId: "pro", seats: 2, actualMonthlySpendMinor: 4000, billingCycle: "monthly" },
          { id: "s_win", toolId: "windsurf", planId: "pro", seats: 2, actualMonthlySpendMinor: 3000, billingCycle: "monthly" },
        ],
      };
      const findings = duplicateCategoryRule.evaluate(ctx);
      expect(findings.length).toBe(1);
      const f = findings[0];
      expect(f.kind).toBe("duplicate_category");
      expect(f.confidence).toBe("estimated");
      // Candidate to review is the cheaper one (Windsurf $30/mo)
      expect(f.toolId).toBe("windsurf");
      expect(f.savingsMinor).toBe(3000);
      expect(f.description).toContain("Review whether your developers could standardize");
    });

    it("flags duplicate chat assistants for non-coding use case", () => {
      const ctx: AuditContext = {
        ...baseCtx,
        useCase: "writing",
        subscriptions: [
          { id: "s_chat", toolId: "chatgpt", planId: "plus", seats: 1, actualMonthlySpendMinor: 2000, billingCycle: "monthly" },
          { id: "s_claude", toolId: "claude", planId: "pro", seats: 1, actualMonthlySpendMinor: 2000, billingCycle: "monthly" },
        ],
      };
      const findings = duplicateCategoryRule.evaluate(ctx);
      expect(findings.length).toBe(1);
      expect(findings[0].confidence).toBe("estimated");
      expect(findings[0].description).toContain("Review whether a single frontier assistant meets your team's needs");
    });
  });
});


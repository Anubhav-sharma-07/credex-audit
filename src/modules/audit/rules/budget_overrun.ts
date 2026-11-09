import type { MultiSubscriptionRule, AuditContext, Finding } from "../types";
import { calculateListMonthlyCostMinor, getPricingEntry } from "../pricing_catalog";
import { formatMinorToUsd, sumMinor } from "../money";

export const budgetOverrunRule: MultiSubscriptionRule = {
  id: "budget_overrun",
  name: "Budget Overrun Detection",
  evaluate: (ctx: AuditContext): Finding[] => {
    if (ctx.monthlyBudgetMinor === null || ctx.monthlyBudgetMinor === undefined || ctx.monthlyBudgetMinor <= 0) {
      return [];
    }

    const totalSpend = sumMinor(
      ctx.subscriptions.map((s) => {
        if (s.actualMonthlySpendMinor !== null) return s.actualMonthlySpendMinor;
        const catalog = getPricingEntry(s.toolId, s.planId);
        return catalog ? calculateListMonthlyCostMinor(catalog, s.seats, s.billingCycle) : 0;
      })
    );

    if (totalSpend <= ctx.monthlyBudgetMinor) {
      return [];
    }

    const overrun = totalSpend - ctx.monthlyBudgetMinor;
    const overrunPct = Math.round((overrun / ctx.monthlyBudgetMinor) * 100);

    return [
      {
        id: "budget_overrun_workspace",
        ruleId: "budget_overrun",
        toolId: ctx.subscriptions[0]?.toolId ?? "cursor",
        kind: "budget_overrun",
        title: `Monthly AI spend exceeds budget by ${formatMinorToUsd(overrun)} (${overrunPct}%)`,
        description: `Total monthly spend of ${formatMinorToUsd(totalSpend)} exceeds your designated AI budget of ${formatMinorToUsd(ctx.monthlyBudgetMinor)}. Immediate optimization across underutilized subscriptions is advised.`,
        currentMonthlyMinor: totalSpend,
        projectedMonthlyMinor: ctx.monthlyBudgetMinor,
        savingsMinor: overrun,
        confidence: "confirmed",
        evidence: [
          `Allocated monthly budget: ${formatMinorToUsd(ctx.monthlyBudgetMinor)}.`,
          `Current aggregate monthly spend: ${formatMinorToUsd(totalSpend)} across ${ctx.subscriptions.length} subscriptions.`,
          `Overrun amount: ${formatMinorToUsd(overrun)}.`,
        ],
        assumptions: [
          `Assumes monthly budget reflects a strict organizational spend cap.`,
        ],
        pricingSource: {
          url: "https://spendlens.ai",
          verifiedAt: ctx.referenceDate,
          isStale: false,
        },
      },
    ];
  },
};


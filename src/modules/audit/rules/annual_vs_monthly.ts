import type { Rule, AuditContext, SubscriptionInput, Finding } from "../types";
import { getPricingEntry, getPricingSource, calculateListMonthlyCostMinor } from "../pricing_catalog";
import { formatMinorToUsd } from "../money";

export const annualVsMonthlyRule: Rule = {
  id: "annual_vs_monthly",
  name: "Annual vs Monthly Billing Optimization",
  applies: (_ctx: AuditContext, sub: SubscriptionInput): boolean => {
    if (sub.billingCycle !== "monthly") return false;
    const catalog = getPricingEntry(sub.toolId, sub.planId);
    if (!catalog) return false;
    return catalog.annualPricePerSeatMinor < catalog.monthlyPricePerSeatMinor;
  },
  evaluate: (ctx: AuditContext, sub: SubscriptionInput): Finding | null => {
    const catalog = getPricingEntry(sub.toolId, sub.planId);
    if (!catalog || sub.billingCycle !== "monthly") return null;
    if (catalog.annualPricePerSeatMinor >= catalog.monthlyPricePerSeatMinor) return null;

    const pricingSource = getPricingSource(catalog, ctx.referenceDate);
    const listMonthly = calculateListMonthlyCostMinor(catalog, sub.seats, "monthly");
    const listAnnualMonthlyEquivalent = calculateListMonthlyCostMinor(catalog, sub.seats, "annual");

    const hasActualSpend = sub.actualMonthlySpendMinor !== null;
    const currentCost = hasActualSpend ? sub.actualMonthlySpendMinor! : listMonthly;

    // Projected cost under annual rate
    const projectedCost = hasActualSpend && listMonthly > 0
      ? Math.round((currentCost * listAnnualMonthlyEquivalent) / listMonthly)
      : listAnnualMonthlyEquivalent;

    const savings = Math.max(0, currentCost - projectedCost);
    if (savings <= 0) return null;

    const diffPerSeatMonthly = catalog.monthlyPricePerSeatMinor - catalog.annualPricePerSeatMinor;
    const annualSavingsTotal = savings * 12;

    const spendDiscrepancy = hasActualSpend && currentCost !== listMonthly
      ? `You currently pay ${formatMinorToUsd(currentCost)}/mo; catalog list price for ${sub.seats} seats is ${formatMinorToUsd(listMonthly)}/mo (possible non-standard discount, custom tier, or overage).`
      : `Monthly list rate: ${formatMinorToUsd(catalog.monthlyPricePerSeatMinor)}/seat/mo; annual rate: ${formatMinorToUsd(catalog.annualPricePerSeatMinor)}/seat/mo.`;

    return {
      id: `annual_vs_monthly_${sub.id}`,
      ruleId: "annual_vs_monthly",
      toolId: sub.toolId,
      subscriptionId: sub.id,
      kind: "annual_vs_monthly",
      title: `Switch ${catalog.planName} to annual billing to save ${formatMinorToUsd(savings)}/mo`,
      description: `Switching from monthly flex to an annual commitment lowers your effective monthly cost by ${formatMinorToUsd(diffPerSeatMonthly)}/seat/mo, saving ${formatMinorToUsd(annualSavingsTotal)} across the year.`,
      currentMonthlyMinor: currentCost,
      projectedMonthlyMinor: projectedCost,
      savingsMinor: savings,
      confidence: "confirmed",
      evidence: [
        `Monthly billing rate: ${formatMinorToUsd(catalog.monthlyPricePerSeatMinor)}/seat vs annual rate: ${formatMinorToUsd(catalog.annualPricePerSeatMinor)}/seat.`,
        spendDiscrepancy,
      ],
      assumptions: [
        `Assuming team will retain this tool for at least 12 months.`,
        `Annual commitment requires paying upfront or agreeing to a 12-month lock-in.`,
      ],
      pricingSource,
    };
  },
};


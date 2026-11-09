import type { Rule, AuditContext, SubscriptionInput, Finding } from "../types";
import { getPricingEntry, getPricingSource } from "../pricing_catalog";
import { formatMinorToUsd } from "../money";

export const priceIncreaseRule: Rule = {
  id: "price_increase",
  name: "Historical Price Increase Detected",
  applies: (_ctx: AuditContext, sub: SubscriptionInput): boolean => {
    return (
      sub.previousPriceMinor !== null &&
      sub.previousPriceMinor !== undefined &&
      sub.actualMonthlySpendMinor !== null &&
      sub.actualMonthlySpendMinor !== undefined &&
      sub.actualMonthlySpendMinor > sub.previousPriceMinor
    );
  },
  evaluate: (ctx: AuditContext, sub: SubscriptionInput): Finding | null => {
    if (
      sub.previousPriceMinor === null ||
      sub.previousPriceMinor === undefined ||
      sub.actualMonthlySpendMinor === null ||
      sub.actualMonthlySpendMinor === undefined ||
      sub.actualMonthlySpendMinor <= sub.previousPriceMinor
    ) {
      return null;
    }

    const catalog = getPricingEntry(sub.toolId, sub.planId);
    const pricingSource = catalog
      ? getPricingSource(catalog, ctx.referenceDate)
      : { url: "https://spendlens.ai", verifiedAt: ctx.referenceDate, isStale: false };

    const currentCost = sub.actualMonthlySpendMinor;
    const previousCost = sub.previousPriceMinor;
    const diff = currentCost - previousCost;
    const pct = Math.round((diff / previousCost) * 100);

    const dateNote = sub.previousPriceDate ? ` since ${sub.previousPriceDate}` : "";

    return {
      id: `price_increase_${sub.id}`,
      ruleId: "price_increase",
      toolId: sub.toolId,
      subscriptionId: sub.id,
      kind: "price_increase",
      title: `${pct}% spend increase detected on ${catalog?.planName || sub.toolId}`,
      description: `Monthly spend increased from ${formatMinorToUsd(previousCost)} to ${formatMinorToUsd(currentCost)}${dateNote} (+${formatMinorToUsd(diff)}/mo). Investigate whether this reflects intentional seat expansion or unmonitored vendor price hikes.`,
      currentMonthlyMinor: currentCost,
      projectedMonthlyMinor: previousCost,
      savingsMinor: diff,
      confidence: "estimated",
      evidence: [
        `Historical recorded cost: ${formatMinorToUsd(previousCost)}/mo.`,
        `Current monthly spend: ${formatMinorToUsd(currentCost)}/mo (+${pct}% change).`,
      ],
      assumptions: [
        `Assumes prior spend reflected an acceptable baseline that may be renegotiated or restored.`,
      ],
      pricingSource,
    };
  },
};


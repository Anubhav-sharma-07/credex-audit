import type { Rule, AuditContext, SubscriptionInput, Finding } from "../types";
import { getPricingEntry, getPricingSource, calculateListMonthlyCostMinor } from "../pricing_catalog";
import { formatMinorToUsd } from "../money";

export const renewalUpcomingRule: Rule = {
  id: "renewal_upcoming",
  name: "Upcoming Contract Renewal",
  applies: (ctx: AuditContext, sub: SubscriptionInput): boolean => {
    if (!sub.renewalDate) return false;
    const renewalMs = new Date(sub.renewalDate).getTime();
    const refMs = new Date(ctx.referenceDate).getTime();
    const diffDays = Math.floor((renewalMs - refMs) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  },
  evaluate: (ctx: AuditContext, sub: SubscriptionInput): Finding | null => {
    if (!sub.renewalDate) return null;
    const renewalMs = new Date(sub.renewalDate).getTime();
    const refMs = new Date(ctx.referenceDate).getTime();
    const diffDays = Math.floor((renewalMs - refMs) / (1000 * 60 * 60 * 24));
    if (diffDays < 0 || diffDays > 30) return null;

    const catalog = getPricingEntry(sub.toolId, sub.planId);
    const pricingSource = catalog
      ? getPricingSource(catalog, ctx.referenceDate)
      : { url: "https://spendlens.ai", verifiedAt: ctx.referenceDate, isStale: false };

    const currentCost = sub.actualMonthlySpendMinor ?? (catalog ? calculateListMonthlyCostMinor(catalog, sub.seats, sub.billingCycle) : 0);
    const annualCommitment = currentCost * 12;

    return {
      id: `renewal_${sub.id}`,
      ruleId: "renewal_upcoming",
      toolId: sub.toolId,
      subscriptionId: sub.id,
      kind: "renewal_upcoming",
      title: `Renewal in ${diffDays} days for ${catalog?.planName || sub.toolId}`,
      description: `Your ${catalog?.planName || sub.toolId} subscription renews on ${sub.renewalDate} (${diffDays} days away). Contract renewal commits ${formatMinorToUsd(annualCommitment)} for the upcoming cycle. Review seat utilization and cancel unneeded licenses before the opt-out notice window closes.`,
      currentMonthlyMinor: currentCost,
      projectedMonthlyMinor: currentCost,
      savingsMinor: 0,
      confidence: "confirmed",
      evidence: [
        `Renewal date: ${sub.renewalDate} (${diffDays} days from reference date).`,
        `Annualized financial commitment at stake: ${formatMinorToUsd(annualCommitment)}.`,
      ],
      assumptions: [
        `Assumes standard auto-renew clause with 30-day cancellation notice requirement.`,
      ],
      pricingSource,
    };
  },
};


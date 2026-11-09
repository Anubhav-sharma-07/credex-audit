import type { Rule, AuditContext, SubscriptionInput, Finding } from "../types";
import { getPricingEntry, getPricingSource, calculateListMonthlyCostMinor } from "../pricing_catalog";
import { formatMinorToUsd } from "../money";

export const missingOwnerRule: Rule = {
  id: "missing_owner",
  name: "Missing Subscription Owner",
  applies: (_ctx: AuditContext, sub: SubscriptionInput): boolean => {
    return !sub.ownerEmail || sub.ownerEmail.trim().length === 0;
  },
  evaluate: (ctx: AuditContext, sub: SubscriptionInput): Finding | null => {
    if (sub.ownerEmail && sub.ownerEmail.trim().length > 0) return null;

    const catalog = getPricingEntry(sub.toolId, sub.planId);
    const pricingSource = catalog
      ? getPricingSource(catalog, ctx.referenceDate)
      : { url: "https://spendlens.ai", verifiedAt: ctx.referenceDate, isStale: false };

    const currentCost = sub.actualMonthlySpendMinor ?? (catalog ? calculateListMonthlyCostMinor(catalog, sub.seats, sub.billingCycle) : 0);

    return {
      id: `missing_owner_${sub.id}`,
      ruleId: "missing_owner",
      toolId: sub.toolId,
      subscriptionId: sub.id,
      kind: "missing_owner",
      title: `Assign an owner to ${catalog?.planName || sub.toolId} subscription`,
      description: `No designated team owner or administrator is assigned to this subscription. Subscriptions without owners become orphaned recurring expenses that nobody audits or decommissions.`,
      currentMonthlyMinor: currentCost,
      projectedMonthlyMinor: currentCost,
      savingsMinor: 0,
      confidence: "confirmed",
      evidence: [
        `Owner email field is empty or unassigned.`,
        `Recurring monthly cost of ${formatMinorToUsd(currentCost)} has no verified accountable stakeholder.`,
      ],
      assumptions: [
        `Designating an owner enables quarterly usage reviews and offboarding verification.`,
      ],
      pricingSource,
    };
  },
};


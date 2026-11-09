import type { Rule, AuditContext, SubscriptionInput, Finding } from "../types";
import { getPricingEntry, getPricingSource } from "../pricing_catalog";
import { formatMinorToUsd } from "../money";

export const unusedFreeTierRule: Rule = {
  id: "unused_free_tier",
  name: "Free/Hobby Tier Eligibility",
  applies: (_ctx: AuditContext, sub: SubscriptionInput): boolean => {
    // Check if free or hobby plan exists for this tool
    const freeCatalog = getPricingEntry(sub.toolId, "free") || getPricingEntry(sub.toolId, "hobby");
    if (!freeCatalog) return false;
    // Applies if subscription has 1 seat and spend is low or user is already on free/hobby
    return sub.seats === 1 && (sub.planId === "hobby" || sub.planId === "free");
  },
  evaluate: (ctx: AuditContext, sub: SubscriptionInput): Finding | null => {
    const catalog = getPricingEntry(sub.toolId, sub.planId);
    if (!catalog) return null;
    const pricingSource = getPricingSource(catalog, ctx.referenceDate);

    const hasActualSpend = sub.actualMonthlySpendMinor !== null;
    const currentCost = hasActualSpend ? sub.actualMonthlySpendMinor! : 0;

    return {
      id: `free_tier_${sub.id}`,
      ruleId: "unused_free_tier",
      toolId: sub.toolId,
      subscriptionId: sub.id,
      kind: "unused_free_tier",
      title: `Optimal on ${catalog.planName} tier`,
      description: `You are currently on the free/hobby tier for ${catalog.toolId}. No license cost is incurred.`,
      currentMonthlyMinor: currentCost,
      projectedMonthlyMinor: 0,
      savingsMinor: 0,
      confidence: "confirmed",
      evidence: [
        `Plan is ${catalog.planName} with $0 list price.`,
        hasActualSpend && currentCost > 0
          ? `You reported ${formatMinorToUsd(currentCost)}/mo spend on a nominally free tier (possible usage credits or add-ons).`
          : `Current list cost is $0/mo.`,
      ],
      assumptions: [
        `Assuming usage remains within free tier quotas and rate limits.`,
      ],
      pricingSource,
    };
  },
};


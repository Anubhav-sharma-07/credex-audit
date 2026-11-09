import type { Rule, AuditContext, SubscriptionInput, Finding } from "../types";
import { getPricingEntry, getPricingSource, calculateListMonthlyCostMinor } from "../pricing_catalog";
import { formatMinorToUsd } from "../money";

interface DowngradeCandidate {
  targetPlanId: string;
  maxSeatsThreshold: number;
  reason: string;
}

const DOWNGRADE_THRESHOLDS: Record<string, Record<string, DowngradeCandidate>> = {
  cursor: {
    business: {
      targetPlanId: "pro",
      maxSeatsThreshold: 9, // cursor business is overkill for < 10 seats
      reason: "Cursor Business adds SSO and audit logs primarily needed by teams of 10+. Cursor Pro covers complete AI feature set at $20/seat.",
    },
  },
  github_copilot: {
    enterprise: {
      targetPlanId: "business",
      maxSeatsThreshold: 19, // copilot enterprise is overkill for < 20 seats
      reason: "Copilot Enterprise adds custom org knowledge bases for large departments. Copilot Business covers IDE features for teams under 20.",
    },
  },
  claude: {
    team: {
      targetPlanId: "pro",
      maxSeatsThreshold: 4, // team plan enforces 5 seats minimum ($150/mo minimum)
      reason: "Claude Team enforces a 5-seat minimum ($150/mo base). For 4 or fewer users, individual Pro plans ($20/seat) deliver the same model access for less.",
    },
  },
  chatgpt: {
    team: {
      targetPlanId: "plus",
      maxSeatsThreshold: 1, // team plan enforces 2 seats minimum ($60/mo base)
      reason: "ChatGPT Team requires a 2-seat minimum ($60/mo). A single user can use ChatGPT Plus ($20/mo) for individual access without paying for an idle seat.",
    },
  },
  windsurf: {
    team: {
      targetPlanId: "pro",
      maxSeatsThreshold: 2, // team plan min seats 2 ($70/mo) vs pro $15/seat
      reason: "Windsurf Team adds centralized admin controls. For small teams, Windsurf Pro ($15/seat) delivers full IDE AI features.",
    },
  },
};

export const planDowngradeRule: Rule = {
  id: "downgrade_plan",
  name: "Plan Right-Sizing / Downgrade",
  applies: (_ctx: AuditContext, sub: SubscriptionInput): boolean => {
    const toolCandidates = DOWNGRADE_THRESHOLDS[sub.toolId];
    if (!toolCandidates) return false;
    const candidate = toolCandidates[sub.planId.toLowerCase()];
    if (!candidate) return false;
    return sub.seats <= candidate.maxSeatsThreshold;
  },
  evaluate: (ctx: AuditContext, sub: SubscriptionInput): Finding | null => {
    const toolCandidates = DOWNGRADE_THRESHOLDS[sub.toolId];
    if (!toolCandidates) return null;
    const candidate = toolCandidates[sub.planId.toLowerCase()];
    if (!candidate || sub.seats > candidate.maxSeatsThreshold) return null;

    const currentCatalog = getPricingEntry(sub.toolId, sub.planId);
    const targetCatalog = getPricingEntry(sub.toolId, candidate.targetPlanId);
    if (!currentCatalog || !targetCatalog) return null;

    const pricingSource = getPricingSource(targetCatalog, ctx.referenceDate);

    // List prices
    const currentListCost = calculateListMonthlyCostMinor(currentCatalog, sub.seats, sub.billingCycle);
    const projectedListCost = calculateListMonthlyCostMinor(targetCatalog, sub.seats, sub.billingCycle);

    const hasActualSpend = sub.actualMonthlySpendMinor !== null;
    const currentCost = hasActualSpend ? sub.actualMonthlySpendMinor! : currentListCost;

    // Projected cost scaled by discount ratio if actual spend differs
    const projectedCost = hasActualSpend && currentListCost > 0
      ? Math.round((currentCost * projectedListCost) / currentListCost)
      : projectedListCost;

    const savings = Math.max(0, currentCost - projectedCost);
    if (savings <= 0) return null;

    const spendNote = hasActualSpend
      ? `You currently pay ${formatMinorToUsd(currentCost)}/mo (list price for ${sub.seats} seats: ${formatMinorToUsd(currentListCost)}/mo). Projected cost on ${targetCatalog.planName}: ${formatMinorToUsd(projectedCost)}/mo.`
      : `Current list price: ${formatMinorToUsd(currentListCost)}/mo. Projected cost on ${targetCatalog.planName}: ${formatMinorToUsd(projectedListCost)}/mo.`;

    return {
      id: `downgrade_${sub.id}`,
      ruleId: "downgrade_plan",
      toolId: sub.toolId,
      subscriptionId: sub.id,
      kind: "downgrade_plan",
      title: `Right-size ${currentCatalog.planName} to ${targetCatalog.planName}`,
      description: candidate.reason,
      currentMonthlyMinor: currentCost,
      projectedMonthlyMinor: projectedCost,
      savingsMinor: savings,
      confidence: "confirmed",
      evidence: [
        `${sub.seats} seats is at or below the recommended threshold (${candidate.maxSeatsThreshold} seats) for ${currentCatalog.planName}.`,
        spendNote,
      ],
      assumptions: [
        `Assuming team does not strictly require enterprise-only features (e.g. SAML SSO, compliance audit exports).`,
        `Assumes downgrading is permissible under current vendor contract terms.`,
      ],
      pricingSource,
    };
  },
};


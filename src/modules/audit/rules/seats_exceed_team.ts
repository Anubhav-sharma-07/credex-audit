import type { Rule, AuditContext, SubscriptionInput, Finding } from "../types";
import { getPricingEntry, getPricingSource, calculateListMonthlyCostMinor } from "../pricing_catalog";
import { formatMinorToUsd } from "../money";

export const seatsExceedTeamRule: Rule = {
  id: "seats_exceed_team",
  name: "Seats Exceed Team Size",
  applies: (_ctx: AuditContext, sub: SubscriptionInput): boolean => {
    return sub.seats > _ctx.teamSize;
  },
  evaluate: (ctx: AuditContext, sub: SubscriptionInput): Finding | null => {
    const catalog = getPricingEntry(sub.toolId, sub.planId);
    if (!catalog || sub.seats <= ctx.teamSize) return null;

    const excessSeats = sub.seats - ctx.teamSize;
    const pricingSource = getPricingSource(catalog, ctx.referenceDate);

    // Current cost and projected cost (for teamSize seats)
    const listCurrentCost = calculateListMonthlyCostMinor(catalog, sub.seats, sub.billingCycle);
    const listProjectedCost = calculateListMonthlyCostMinor(catalog, ctx.teamSize, sub.billingCycle);
    
    // Effective current spend (entered actual or list price)
    const hasActualSpend = sub.actualMonthlySpendMinor !== null;
    const currentCost = hasActualSpend ? sub.actualMonthlySpendMinor! : listCurrentCost;
    
    // Ratio-based projection when actual spend differs from list
    const projectedCost = hasActualSpend && listCurrentCost > 0
      ? Math.round((currentCost * listProjectedCost) / listCurrentCost)
      : listProjectedCost;

    const savings = Math.max(0, currentCost - projectedCost);

    const spendNote = hasActualSpend
      ? `You currently pay ${formatMinorToUsd(currentCost)}/mo (list price for ${sub.seats} seats: ${formatMinorToUsd(listCurrentCost)}/mo).`
      : `List price for ${sub.seats} seats is ${formatMinorToUsd(listCurrentCost)}/mo.`;

    return {
      id: `seats_exceed_${sub.id}`,
      ruleId: "seats_exceed_team",
      toolId: sub.toolId,
      subscriptionId: sub.id,
      kind: "seats_exceed_team",
      title: `${sub.seats} seats provisioned for team of ${ctx.teamSize}`,
      description: `Your ${catalog.planName} subscription has ${sub.seats} seats provisioned, which exceeds your team size of ${ctx.teamSize} by ${excessSeats} ${excessSeats === 1 ? "seat" : "seats"}. Reducing seat count aligns licenses with active headcount.`,
      currentMonthlyMinor: currentCost,
      projectedMonthlyMinor: projectedCost,
      savingsMinor: savings,
      confidence: "confirmed",
      evidence: [
        `${sub.seats} provisioned seats vs ${ctx.teamSize} team members (${excessSeats} excess seats).`,
        spendNote,
      ],
      assumptions: [
        `Assuming each team member requires at most one seat.`,
        `Assuming vendor allows downsizing to ${ctx.teamSize} seats upon billing cycle or co-terming.`,
      ],
      pricingSource,
    };
  },
};


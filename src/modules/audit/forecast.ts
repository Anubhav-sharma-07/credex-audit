import type {
  AuditContext,
  Finding,
  AuditForecast,
  RenewalProjection,
  SubscriptionInput,
} from "./types";
import { getPricingEntry, calculateListMonthlyCostMinor } from "./pricing_catalog";
import { annualizeMinor } from "./money";

function getSubscriptionCurrentCost(sub: SubscriptionInput): number {
  if (sub.actualMonthlySpendMinor !== null && sub.actualMonthlySpendMinor !== undefined) {
    return sub.actualMonthlySpendMinor;
  }
  const catalog = getPricingEntry(sub.toolId, sub.planId);
  return catalog ? calculateListMonthlyCostMinor(catalog, sub.seats, sub.billingCycle) : 0;
}

export function generateForecast(ctx: AuditContext, resolvedFindings: Finding[]): AuditForecast {
  // Map subscription ID -> winning finding with savings
  const savingsBySub = new Map<string, number>();
  for (const f of resolvedFindings) {
    if (f.subscriptionId && f.savingsMinor > 0) {
      savingsBySub.set(f.subscriptionId, f.savingsMinor);
    }
  }

  let totalMonthlyCurrentMinor = 0;
  let totalMonthlyProjectedMinor = 0;
  const renewalProjections: RenewalProjection[] = [];

  const refMs = new Date(ctx.referenceDate).getTime();

  for (const sub of ctx.subscriptions) {
    const currentCost = getSubscriptionCurrentCost(sub);
    const savings = savingsBySub.get(sub.id) ?? 0;
    const projectedCost = Math.max(0, currentCost - savings);

    totalMonthlyCurrentMinor += currentCost;
    totalMonthlyProjectedMinor += projectedCost;

    if (sub.renewalDate) {
      const renewalMs = new Date(sub.renewalDate).getTime();
      const diffDays = Math.floor((renewalMs - refMs) / (1000 * 60 * 60 * 24));
      renewalProjections.push({
        subscriptionId: sub.id,
        toolId: sub.toolId,
        renewalDate: sub.renewalDate,
        daysUntilRenewal: diffDays,
        currentAnnualMinor: annualizeMinor(currentCost),
        projectedAnnualMinor: annualizeMinor(projectedCost),
        annualSavingsMinor: annualizeMinor(savings),
      });
    }
  }

  const totalMonthlySavingsMinor = totalMonthlyCurrentMinor - totalMonthlyProjectedMinor;

  // Strict integer arithmetic: annual is 12x monthly with zero drift
  const totalAnnualCurrentMinor = annualizeMinor(totalMonthlyCurrentMinor);
  const totalAnnualProjectedMinor = annualizeMinor(totalMonthlyProjectedMinor);
  const totalAnnualSavingsMinor = annualizeMinor(totalMonthlySavingsMinor);

  // Sort renewal projections chronologically by renewal date
  renewalProjections.sort((a, b) => a.daysUntilRenewal - b.daysUntilRenewal);

  return {
    monthlyCurrentMinor: totalMonthlyCurrentMinor,
    monthlyProjectedMinor: totalMonthlyProjectedMinor,
    monthlySavingsMinor: totalMonthlySavingsMinor,
    annualCurrentMinor: totalAnnualCurrentMinor,
    annualProjectedMinor: totalAnnualProjectedMinor,
    annualSavingsMinor: totalAnnualSavingsMinor,
    renewalProjections,
    label: "projection",
  };
}


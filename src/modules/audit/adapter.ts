import type { ToolEntry, AuditResult as LegacyAuditResult, UseCase } from "@/types";
import type { AuditEngineResult, AuditContext, SubscriptionInput, ToolId } from "./types";
import { runAuditEngine } from "./engine";
import { toMinorUnits, toMajorUnits } from "./money";

/**
 * Adapter converting legacy top-of-funnel public audit inputs into the robust
 * deterministic `src/modules/audit` engine format, and mapping the output back.
 */
export function runLegacyAudit(
  tools: ToolEntry[],
  teamSize: number,
  useCase: UseCase
): LegacyAuditResult {
  const subscriptions: SubscriptionInput[] = tools.map((t, idx) => ({
    id: `sub_${t.tool}_${idx}`,
    toolId: t.tool as ToolId,
    planId: t.plan,
    seats: t.seats,
    actualMonthlySpendMinor: toMinorUnits(t.monthlySpend),
    billingCycle: "monthly",
  }));

  const ctx: AuditContext = {
    subscriptions,
    teamSize,
    useCase,
    referenceDate: "2026-05-15T00:00:00Z",
  };

  const engineResult: AuditEngineResult = runAuditEngine(ctx);

  // Map engine findings back to legacy ToolAuditResult
  const legacyToolResults = tools.map((t, idx) => {
    const subId = `sub_${t.tool}_${idx}`;
    const finding = engineResult.findings.find((f) => f.subscriptionId === subId);

    if (finding && finding.savingsMinor > 0) {
      const monthlySavings = toMajorUnits(finding.savingsMinor);
      const projectedCost = toMajorUnits(finding.projectedMonthlyMinor);
      return {
        tool: t.tool,
        plan: t.plan,
        currentMonthlySpend: t.monthlySpend,
        recommendedAction: (finding.kind === "downgrade_plan"
          ? "downgrade_plan"
          : finding.kind === "duplicate_category"
          ? "consolidate"
          : "optimal") as "optimal" | "downgrade_plan" | "consolidate",
        projectedMonthlyCost: projectedCost,
        monthlySavings,
        annualSavings: monthlySavings * 12,
        reason: finding.description,
      };
    }

    return {
      tool: t.tool,
      plan: t.plan,
      currentMonthlySpend: t.monthlySpend,
      recommendedAction: "optimal" as const,
      projectedMonthlyCost: t.monthlySpend,
      monthlySavings: 0,
      annualSavings: 0,
      reason: "Current plan and provisioning look right-sized for your team.",
    };
  });

  const totalMonthlySpend = toMajorUnits(engineResult.forecast.monthlyCurrentMinor);
  const totalMonthlySavings = toMajorUnits(engineResult.forecast.monthlySavingsMinor);
  const totalAnnualSavings = toMajorUnits(engineResult.forecast.annualSavingsMinor);

  return {
    tools: legacyToolResults,
    toolResults: legacyToolResults,
    totalMonthlySpend,
    totalMonthlySavings,
    totalAnnualSavings,
    useCase,
    teamSize,
    summary: "",
  };
}


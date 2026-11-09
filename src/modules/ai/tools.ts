import { z } from "zod";
import type { StructuredFindingInput } from "./types";

export const SpendBreakdownArgsSchema = z.object({
  workspaceId: z.string().min(1),
  categoryFilter: z.enum(["ide_assistant", "chat_assistant", "api", "general", "all"]).optional(),
});

export const VendorComparisonArgsSchema = z.object({
  workspaceId: z.string().min(1),
  toolIds: z.array(z.string().min(1)).min(2).max(4),
});

export const UpcomingRenewalsArgsSchema = z.object({
  workspaceId: z.string().min(1),
  withinDays: z.number().int().min(1).max(90).default(30),
});

export const BudgetStatusArgsSchema = z.object({
  workspaceId: z.string().min(1),
});

export const SavingsOpportunitiesArgsSchema = z.object({
  workspaceId: z.string().min(1),
  minSavingsUsd: z.number().nonnegative().optional(),
});

export type SpendBreakdownArgs = z.infer<typeof SpendBreakdownArgsSchema>;
export type VendorComparisonArgs = z.infer<typeof VendorComparisonArgsSchema>;
export type UpcomingRenewalsArgs = z.infer<typeof UpcomingRenewalsArgsSchema>;
export type BudgetStatusArgs = z.infer<typeof BudgetStatusArgsSchema>;
export type SavingsOpportunitiesArgs = z.infer<typeof SavingsOpportunitiesArgsSchema>;

/**
 * Pure, in-memory, workspace-scoped, read-only tool functions.
 * Strictly operates on validated structured findings. Zero arbitrary SQL execution.
 */
export class WorkspaceSpendTools {
  constructor(
    private readonly workspaceId: string,
    private readonly findings: StructuredFindingInput[],
    private readonly monthlySpendUsd: number,
    private readonly monthlySavingsUsd: number,
    private readonly budgetMonthlyUsd?: number | null
  ) {}

  public getSpendBreakdown(rawArgs: unknown) {
    const args = SpendBreakdownArgsSchema.parse(rawArgs);
    if (args.workspaceId !== this.workspaceId) {
      throw new Error("Access denied: workspaceId mismatch in tool invocation");
    }
    return {
      workspaceId: this.workspaceId,
      totalMonthlySpendUsd: this.monthlySpendUsd,
      totalMonthlySavingsUsd: this.monthlySavingsUsd,
      activeVendorCount: new Set(this.findings.map((f) => f.toolId)).size,
      vendors: this.findings.map((f) => ({
        findingId: f.id,
        toolId: f.toolId,
        toolName: f.toolName,
        currentSpendUsd: f.currentMonthlyUsd,
        projectedSpendUsd: f.projectedMonthlyUsd,
      })),
    };
  }

  public compareVendors(rawArgs: unknown) {
    const args = VendorComparisonArgsSchema.parse(rawArgs);
    if (args.workspaceId !== this.workspaceId) {
      throw new Error("Access denied: workspaceId mismatch in tool invocation");
    }
    const matched = this.findings.filter((f) => args.toolIds.includes(f.toolId));
    return {
      workspaceId: this.workspaceId,
      comparedVendors: matched.map((f) => ({
        findingId: f.id,
        toolId: f.toolId,
        toolName: f.toolName,
        spendUsd: f.currentMonthlyUsd,
        potentialSavingsUsd: f.savingsMonthlyUsd,
        confidence: f.confidence,
        evidence: f.evidenceSummary,
      })),
    };
  }

  public getUpcomingRenewals(rawArgs: unknown) {
    const args = UpcomingRenewalsArgsSchema.parse(rawArgs);
    if (args.workspaceId !== this.workspaceId) {
      throw new Error("Access denied: workspaceId mismatch in tool invocation");
    }
    const renewalFindings = this.findings.filter((f) => f.kind === "renewal_upcoming");
    return {
      workspaceId: this.workspaceId,
      windowDays: args.withinDays,
      renewals: renewalFindings.map((f) => ({
        findingId: f.id,
        toolName: f.toolName,
        spendUsd: f.currentMonthlyUsd,
        evidence: f.evidenceSummary,
      })),
    };
  }

  public getBudgetStatus(rawArgs: unknown) {
    const args = BudgetStatusArgsSchema.parse(rawArgs);
    if (args.workspaceId !== this.workspaceId) {
      throw new Error("Access denied: workspaceId mismatch in tool invocation");
    }
    const budget = this.budgetMonthlyUsd ?? null;
    const isOverrun = budget !== null && this.monthlySpendUsd > budget;
    const overrunUsd = isOverrun ? this.monthlySpendUsd - budget : 0;
    return {
      workspaceId: this.workspaceId,
      budgetMonthlyUsd: budget,
      spendMonthlyUsd: this.monthlySpendUsd,
      isOverrun,
      overrunUsd,
      budgetFindings: this.findings.filter((f) => f.kind === "budget_overrun"),
    };
  }

  public getSavingsOpportunities(rawArgs: unknown) {
    const args = SavingsOpportunitiesArgsSchema.parse(rawArgs);
    if (args.workspaceId !== this.workspaceId) {
      throw new Error("Access denied: workspaceId mismatch in tool invocation");
    }
    const min = args.minSavingsUsd ?? 0;
    const opportunities = this.findings
      .filter((f) => f.savingsMonthlyUsd >= min && f.savingsMonthlyUsd > 0)
      .sort((a, b) => b.savingsMonthlyUsd - a.savingsMonthlyUsd);
    return {
      workspaceId: this.workspaceId,
      totalPotentialSavingsUsd: this.monthlySavingsUsd,
      opportunities: opportunities.map((f) => ({
        findingId: f.id,
        toolName: f.toolName,
        monthlySavingsUsd: f.savingsMonthlyUsd,
        confidence: f.confidence,
        evidence: f.evidenceSummary,
      })),
    };
  }
}


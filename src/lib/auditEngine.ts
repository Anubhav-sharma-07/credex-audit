import type { ToolEntry, ToolAuditResult, AuditResult, UseCase } from "@/types";
import { getPricing, calcMonthlyCost } from "./pricing";

function auditCursor(entry: ToolEntry, useCase: UseCase): ToolAuditResult {
  const base = { tool: entry.tool, plan: entry.plan, currentMonthlySpend: entry.monthlySpend };

  if (entry.plan === "hobby") {
    return { ...base, recommendedAction: "optimal", projectedMonthlyCost: 0, monthlySavings: 0, annualSavings: 0, reason: "You're on the free tier. No savings possible." };
  }

  if (entry.plan === "business" && entry.seats < 10) {
    const proPricing = getPricing("cursor", "pro")!;
    const projected = calcMonthlyCost(proPricing, entry.seats);
    const savings = entry.monthlySpend - projected;
    return { ...base, recommendedAction: "downgrade_plan", recommendedPlan: "pro", recommendedSeats: entry.seats, projectedMonthlyCost: projected, monthlySavings: Math.max(savings, 0), annualSavings: Math.max(savings, 0) * 12, reason: `Cursor Business ($40/seat) adds SSO and audit logs only needed at 10+ person teams. Cursor Pro ($20/seat) covers all AI features for your team size. Saves $${Math.round(Math.max(savings, 0))}/mo.` };
  }

  return { ...base, recommendedAction: "optimal", projectedMonthlyCost: entry.monthlySpend, monthlySavings: 0, annualSavings: 0, reason: "Current plan is well matched to your team." };
}

function auditCopilot(entry: ToolEntry): ToolAuditResult {
  const base = { tool: entry.tool, plan: entry.plan, currentMonthlySpend: entry.monthlySpend };

  if (entry.plan === "enterprise" && entry.seats < 20) {
    const bizPricing = getPricing("github_copilot", "business")!;
    const projected = calcMonthlyCost(bizPricing, entry.seats);
    const savings = entry.monthlySpend - projected;
    return { ...base, recommendedAction: "downgrade_plan", recommendedPlan: "business", recommendedSeats: entry.seats, projectedMonthlyCost: projected, monthlySavings: Math.max(savings, 0), annualSavings: Math.max(savings, 0) * 12, reason: `Copilot Enterprise ($39/seat) adds custom knowledge bases for large orgs. Copilot Business ($19/seat) covers all IDE features for teams under 20. Saves $${Math.round(Math.max(savings, 0))}/mo.` };
  }

  return { ...base, recommendedAction: "optimal", projectedMonthlyCost: entry.monthlySpend, monthlySavings: 0, annualSavings: 0, reason: "Copilot plan looks right-sized for your team." };
}

function auditClaude(entry: ToolEntry): ToolAuditResult {
  const base = { tool: entry.tool, plan: entry.plan, currentMonthlySpend: entry.monthlySpend };

  if (entry.plan === "team" && entry.seats <= 4) {
    const proPricing = getPricing("claude", "pro")!;
    const projected = calcMonthlyCost(proPricing, entry.seats);
    const savings = entry.monthlySpend - projected;
    return { ...base, recommendedAction: "downgrade_plan", recommendedPlan: "pro", recommendedSeats: entry.seats, projectedMonthlyCost: projected, monthlySavings: Math.max(savings, 0), annualSavings: Math.max(savings, 0) * 12, reason: `Claude Team ($30/seat, min 5) is for admin controls and collaboration. For ${entry.seats} users, individual Pro plans ($20/seat) give the same model access for less. Saves $${Math.round(Math.max(savings, 0))}/mo.` };
  }

  return { ...base, recommendedAction: "optimal", projectedMonthlyCost: entry.monthlySpend, monthlySavings: 0, annualSavings: 0, reason: "Claude plan appears well matched to your usage." };
}

function auditChatGPT(entry: ToolEntry): ToolAuditResult {
  const base = { tool: entry.tool, plan: entry.plan, currentMonthlySpend: entry.monthlySpend };

  if (entry.plan === "team" && entry.seats <= 2) {
    const plusPricing = getPricing("chatgpt", "plus")!;
    const projected = calcMonthlyCost(plusPricing, entry.seats);
    const savings = entry.monthlySpend - projected;
    return { ...base, recommendedAction: "downgrade_plan", recommendedPlan: "plus", recommendedSeats: entry.seats, projectedMonthlyCost: projected, monthlySavings: Math.max(savings, 0), annualSavings: Math.max(savings, 0) * 12, reason: `ChatGPT Team ($30/seat) adds shared workspaces — overkill for ${entry.seats} users. ChatGPT Plus ($20/seat) gives the same GPT-4o access. Saves $${Math.round(Math.max(savings, 0))}/mo.` };
  }

  return { ...base, recommendedAction: "optimal", projectedMonthlyCost: entry.monthlySpend, monthlySavings: 0, annualSavings: 0, reason: "ChatGPT plan looks well matched." };
}

function auditAPITool(entry: ToolEntry): ToolAuditResult {
  return { tool: entry.tool, plan: entry.plan, currentMonthlySpend: entry.monthlySpend, recommendedAction: "optimal", projectedMonthlyCost: entry.monthlySpend, monthlySavings: 0, annualSavings: 0, reason: entry.monthlySpend > 500 ? `At $${entry.monthlySpend}/mo you're spending enough to negotiate discounted credits. Credex can help here.` : "API spend looks reasonable. Monitor for prompt caching opportunities." };
}

function auditWindsurf(entry: ToolEntry): ToolAuditResult {
  const base = { tool: entry.tool, plan: entry.plan, currentMonthlySpend: entry.monthlySpend };

  if (entry.plan === "team" && entry.seats <= 2) {
    const proPricing = getPricing("windsurf", "pro")!;
    const projected = calcMonthlyCost(proPricing, entry.seats);
    const savings = entry.monthlySpend - projected;
    return { ...base, recommendedAction: "downgrade_plan", recommendedPlan: "pro", recommendedSeats: entry.seats, projectedMonthlyCost: projected, monthlySavings: Math.max(savings, 0), annualSavings: Math.max(savings, 0) * 12, reason: `Windsurf Team ($35/seat) adds admin controls. For ${entry.seats} users, Pro ($15/seat) covers the same AI features. Saves $${Math.round(Math.max(savings, 0))}/mo.` };
  }

  return { ...base, recommendedAction: "optimal", projectedMonthlyCost: entry.monthlySpend, monthlySavings: 0, annualSavings: 0, reason: "Windsurf plan appears appropriately sized." };
}

function checkConsolidation(entries: ToolEntry[], results: ToolAuditResult[], useCase: UseCase): ToolAuditResult[] {
  const toolNames = entries.map((e) => e.tool);

  const hasCursor = toolNames.includes("cursor");
  const hasWindsurf = toolNames.includes("windsurf");
  if (hasCursor && hasWindsurf) {
    const cursorEntry = entries.find((e) => e.tool === "cursor")!;
    const dropTool = cursorEntry.monthlySpend <= entries.find((e) => e.tool === "windsurf")!.monthlySpend ? "windsurf" : "cursor";
    results = results.map((r) => {
      if (r.tool === dropTool) {
        return { ...r, recommendedAction: "consolidate", projectedMonthlyCost: 0, monthlySavings: r.currentMonthlySpend, annualSavings: r.currentMonthlySpend * 12, reason: `You're paying for both Cursor and Windsurf — two AI coding editors that do the same job. Drop ${dropTool === "cursor" ? "Cursor" : "Windsurf"} and save $${r.currentMonthlySpend}/mo.` };
      }
      return r;
    });
  }

  const hasChatGPT = toolNames.includes("chatgpt");
  const hasClaude = toolNames.includes("claude");
  if (hasChatGPT && hasClaude && useCase !== "coding") {
    const chatEntry = entries.find((e) => e.tool === "chatgpt")!;
    const claudeEntry = entries.find((e) => e.tool === "claude")!;
    if (chatEntry.plan === "plus" && claudeEntry.plan === "pro" && chatEntry.seats === 1 && claudeEntry.seats === 1) {
      results = results.map((r) => {
        if (r.tool === "chatgpt" && r.recommendedAction === "optimal") {
          return { ...r, recommendedAction: "consolidate", recommendedTool: "claude", projectedMonthlyCost: 0, monthlySavings: chatEntry.monthlySpend, annualSavings: chatEntry.monthlySpend * 12, reason: `You're paying $20/mo each for ChatGPT Plus and Claude Pro. One frontier model is enough for ${useCase} work. Drop ChatGPT Plus and save $20/mo.` };
        }
        return r;
      });
    }
  }

  return results;
}

export function runAudit(tools: ToolEntry[], teamSize: number, useCase: UseCase): AuditResult {
  let results: ToolAuditResult[] = tools.map((entry) => {
    switch (entry.tool) {
      case "cursor":         return auditCursor(entry, useCase);
      case "github_copilot": return auditCopilot(entry);
      case "claude":         return auditClaude(entry);
      case "chatgpt":        return auditChatGPT(entry);
      case "anthropic_api":  return auditAPITool(entry);
      case "openai_api":     return auditAPITool(entry);
      case "windsurf":       return auditWindsurf(entry);
      default:               return { tool: entry.tool, plan: entry.plan, currentMonthlySpend: entry.monthlySpend, recommendedAction: "optimal", projectedMonthlyCost: entry.monthlySpend, monthlySavings: 0, annualSavings: 0, reason: "No specific optimization found." };
    }
  });

  results = checkConsolidation(tools, results, useCase);

  const totalMonthlySpend = tools.reduce((sum, t) => sum + t.monthlySpend, 0);
  const totalMonthlySavings = results.reduce((sum, r) => sum + r.monthlySavings, 0);

  return { toolResults: results, totalMonthlySpend, totalMonthlySavings, totalAnnualSavings: totalMonthlySavings * 12, useCase, teamSize };
}
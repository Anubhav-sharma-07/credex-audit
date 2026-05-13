import { describe, it, expect } from "vitest";
import { runAudit } from "../lib/auditEngine";

describe("runAudit", () => {
  it("should return correct total monthly spend", () => {
    const tools = [
      { tool: "cursor" as const, plan: "pro" as const, seats: 2, monthlySpend: 40 },
      { tool: "claude" as const, plan: "pro" as const, seats: 1, monthlySpend: 20 },
    ];
    const result = runAudit(tools, 2, "coding");
    expect(result.totalMonthlySpend).toBe(60);
  });

  it("should return toolResults for each tool", () => {
    const tools = [
      { tool: "cursor" as const, plan: "pro" as const, seats: 1, monthlySpend: 20 },
    ];
    const result = runAudit(tools, 1, "coding");
    expect(result.toolResults).toHaveLength(1);
    expect(result.toolResults[0].tool).toBe("cursor");
  });

  it("should return zero savings when spend is optimal", () => {
    const tools = [
      { tool: "cursor" as const, plan: "pro" as const, seats: 1, monthlySpend: 20 },
    ];
    const result = runAudit(tools, 1, "coding");
    expect(result.totalMonthlySavings).toBeGreaterThanOrEqual(0);
  });

  it("should return correct useCase and teamSize in result", () => {
    const tools = [
      { tool: "chatgpt" as const, plan: "plus" as const, seats: 3, monthlySpend: 60 },
    ];
    const result = runAudit(tools, 3, "writing");
    expect(result.useCase).toBe("writing");
    expect(result.teamSize).toBe(3);
  });

  it("should calculate annual savings as 12x monthly savings", () => {
    const tools = [
      { tool: "cursor" as const, plan: "pro" as const, seats: 5, monthlySpend: 100 },
    ];
    const result = runAudit(tools, 5, "coding");
    expect(result.totalAnnualSavings).toBe(result.totalMonthlySavings * 12);
  });
});
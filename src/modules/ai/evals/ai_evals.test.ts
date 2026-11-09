import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { answerAIQuestion, generatePromptsMarkdown, type StructuredAILog } from "../index";
import { EVAL_FIXTURES } from "./fixtures";
import { AIRateLimiter } from "../rate_limiter";
import { WorkspaceSpendTools } from "../tools";

describe("AI Layer Automated Evals Suite (33 Fixture Cases)", () => {
  let logs: StructuredAILog[] = [];
  let testRateLimiter: AIRateLimiter;

  beforeEach(() => {
    logs = [];
    testRateLimiter = new AIRateLimiter({
      maxRequestsPerMinuteUser: 100,
      maxRequestsPerMinuteWorkspace: 200,
      maxDailyCostUsdWorkspace: 50.0,
    });
  });

  EVAL_FIXTURES.forEach((fixture) => {
    it(`evaluates [${fixture.id}] - ${fixture.description}`, async () => {
      const response = await answerAIQuestion(fixture.context, {
        rateLimiter: testRateLimiter,
        stubModelResponse: () => fixture.simulatedModelResponse,
        onLog: (log) => logs.push(log),
      });

      if (fixture.expectedOutcome === "success") {
        expect(response.isFallback).toBe(false);
        expect(response.meta.outcome).toBe("success");
      } else {
        expect(response.isFallback).toBe(true);
        expect(["validation_fallback", "error_fallback"]).toContain(response.meta.outcome);
      }

      if (fixture.expectedKeywords) {
        for (const kw of fixture.expectedKeywords) {
          expect(response.answer).toContain(kw);
        }
      }

      if (fixture.mustNotContain) {
        for (const prohibited of fixture.mustNotContain) {
          expect(response.answer).not.toContain(prohibited);
        }
      }
    });
  });

  it("verifies structured audit logging records latency and tokens with zero personal data", async () => {
    const fixture = EVAL_FIXTURES[0];
    await answerAIQuestion(fixture.context, {
      rateLimiter: testRateLimiter,
      stubModelResponse: () => fixture.simulatedModelResponse,
      onLog: (log) => logs.push(log),
    });

    expect(logs.length).toBeGreaterThan(0);
    const lastLog = logs[logs.length - 1];
    expect(lastLog.workspaceId).toBe("ws_1");
    expect(lastLog.questionType).toBe("spend_analysis");
    expect(lastLog.latencyMs).toBeGreaterThanOrEqual(0);
    expect(lastLog.tokenCount).toBeGreaterThan(0);

    // Verify personal data is absent
    const logString = JSON.stringify(lastLog);
    expect(logString).not.toContain("@");
    expect(logString).not.toContain("email");
    expect(logString).not.toContain("ipAddress");
  });

  it("enforces per-user rate limit and falls back deterministically when exceeded", async () => {
    const restrictiveLimiter = new AIRateLimiter({
      maxRequestsPerMinuteUser: 2,
      maxRequestsPerMinuteWorkspace: 10,
      maxDailyCostUsdWorkspace: 10.0,
    });

    const ctx = EVAL_FIXTURES[0].context;

    // Call 1: OK
    const res1 = await answerAIQuestion(ctx, {
      rateLimiter: restrictiveLimiter,
      stubModelResponse: () => EVAL_FIXTURES[0].simulatedModelResponse,
    });
    expect(res1.isFallback).toBe(false);

    // Call 2: OK
    const res2 = await answerAIQuestion(ctx, {
      rateLimiter: restrictiveLimiter,
      stubModelResponse: () => EVAL_FIXTURES[0].simulatedModelResponse,
    });
    expect(res2.isFallback).toBe(false);

    // Call 3: Exceeded -> fallback
    const res3 = await answerAIQuestion(ctx, {
      rateLimiter: restrictiveLimiter,
      stubModelResponse: () => EVAL_FIXTURES[0].simulatedModelResponse,
    });
    expect(res3.isFallback).toBe(true);
    expect(res3.fallbackReason).toContain("Rate limit exceeded");
  });

  it("enforces workspace daily cost cap and falls back deterministically when cap is reached", async () => {
    const costCapLimiter = new AIRateLimiter({
      maxRequestsPerMinuteUser: 100,
      maxRequestsPerMinuteWorkspace: 100,
      maxDailyCostUsdWorkspace: 1.0, // $1.00 daily cap
    });

    const ctx = EVAL_FIXTURES[0].context;

    // Simulate recording $1.50 in spend for this workspace
    costCapLimiter.recordCost(ctx.workspaceId, 1.5);

    const res = await answerAIQuestion(ctx, {
      rateLimiter: costCapLimiter,
      stubModelResponse: () => EVAL_FIXTURES[0].simulatedModelResponse,
    });

    expect(res.isFallback).toBe(true);
    expect(res.fallbackReason).toContain("Daily AI cost limit");
  });

  it("keeps PROMPTS.md in sync automatically with versioned code prompts", () => {
    const promptsMdPath = path.resolve(__dirname, "../../../../PROMPTS.md");
    if (fs.existsSync(promptsMdPath)) {
      const currentOnDisk = fs.readFileSync(promptsMdPath, "utf-8").trim().replace(/\r\n/g, "\n");
      const generated = generatePromptsMarkdown().trim().replace(/\r\n/g, "\n");
      expect(currentOnDisk).toBe(generated);
    }
  });

  describe("WorkspaceSpendTools", () => {
    it("executes read-only, workspace-scoped tool queries with strict Zod validation", () => {
      const tools = new WorkspaceSpendTools(
        "ws_test",
        EVAL_FIXTURES[0].context.findings,
        EVAL_FIXTURES[0].context.monthlySpendUsd,
        EVAL_FIXTURES[0].context.monthlySavingsUsd,
        400
      );

      // Successful queries
      const breakdown = tools.getSpendBreakdown({ workspaceId: "ws_test" });
      expect(breakdown.totalMonthlySpendUsd).toBe(200);

      const renewals = tools.getUpcomingRenewals({ workspaceId: "ws_test", withinDays: 30 });
      expect(renewals.workspaceId).toBe("ws_test");

      const budget = tools.getBudgetStatus({ workspaceId: "ws_test" });
      expect(budget.isOverrun).toBe(false);

      const savings = tools.getSavingsOpportunities({ workspaceId: "ws_test", minSavingsUsd: 10 });
      expect(savings.opportunities.length).toBeGreaterThan(0);

      // Rejects invalid workspaceId
      expect(() => tools.getSpendBreakdown({ workspaceId: "other_ws" })).toThrow(/workspaceId mismatch/);

      // Rejects invalid input types
      expect(() => tools.getUpcomingRenewals({ workspaceId: "ws_test", withinDays: -5 })).toThrow();
    });
  });
});


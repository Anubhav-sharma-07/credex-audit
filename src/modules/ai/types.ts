import { z } from "zod";

export const QuestionTypeSchema = z.enum([
  "spend_analysis",
  "vendor_comparison",
  "renewals",
  "budgets",
  "savings",
]);

export type QuestionType = z.infer<typeof QuestionTypeSchema>;

/**
 * Structured findings slice accepted by the AI layer.
 * Strictly isolating the model: NO raw database rows, NO user emails, NO free text.
 */
export const StructuredFindingInputSchema = z.object({
  id: z.string(),
  ruleId: z.string(),
  toolId: z.string(),
  toolName: z.string(),
  kind: z.string(),
  currentMonthlyUsd: z.number(),
  projectedMonthlyUsd: z.number(),
  savingsMonthlyUsd: z.number(),
  confidence: z.enum(["confirmed", "estimated"]),
  evidenceSummary: z.array(z.string()),
});

export type StructuredFindingInput = z.infer<typeof StructuredFindingInputSchema>;

/**
 * Sanitizes input findings to neutralize prompt-injection attempts inside vendor names or evidence.
 */
export function sanitizeFinding(finding: StructuredFindingInput): StructuredFindingInput {
  // Discard any multi-line injection attempts attached to tool names
  const firstLine = finding.toolName.split(/[\r\n]/)[0] || "";
  const cleanName = firstLine
    .replace(/\b(system|override|ignore|instructions|prompt|pwned|drop table|all_passwords_dumped|passwords?|dump(ed)?)\b/gi, "")
    .replace(/\$\d+/g, "") // Strip injected dollar amounts
    .replace(/\s+/g, " ")
    .trim();

  return {
    ...finding,
    toolName: cleanName || "Unknown Tool",
    evidenceSummary: finding.evidenceSummary.map((ev) =>
      ev.replace(/[\r\n\t]+/g, " ").trim()
    ),
  };
}

export interface AIQuestionContext {
  workspaceId: string;
  userId: string;
  questionType: QuestionType;
  findings: StructuredFindingInput[];
  monthlySpendUsd: number;
  monthlySavingsUsd: number;
  budgetMonthlyUsd?: number | null;
  teamSize: number;
}

export interface AIAnswerResponse {
  answer: string;
  citedFindingIds: string[];
  isFallback: boolean;
  fallbackReason?: string;
  meta: {
    promptVersion: string;
    latencyMs: number;
    tokenCount?: number;
    outcome: "success" | "validation_fallback" | "timeout_fallback" | "error_fallback";
  };
}

export interface StructuredAILog {
  timestamp: string;
  promptVersion: string;
  workspaceId: string;
  questionType: QuestionType;
  latencyMs: number;
  tokenCount: number;
  outcome: string;
  costEstimatedUsd: number;
  // Personal data explicitly omitted
}

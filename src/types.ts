export type ToolName =
  | "cursor"
  | "github_copilot"
  | "claude"
  | "chatgpt"
  | "anthropic_api"
  | "openai_api"
  | "gemini"
  | "windsurf";

export type PlanName =
  | "hobby"
  | "pro"
  | "business"
  | "enterprise"
  | "individual"
  | "free"
  | "max"
  | "team"
  | "api"
  | "plus"
  | "ultra"
  | "pay_as_you_go";

export type UseCase = "coding" | "writing" | "data" | "research" | "mixed";

export interface ToolEntry {
  tool: ToolName;
  plan: PlanName;
  seats: number;
  monthlySpend: number;
}

export interface FormState {
  tools: ToolEntry[];
  teamSize: number;
  useCase: UseCase;
}

export type RecommendedAction = "optimal" | "downgrade_plan" | "consolidate";

export interface ToolAuditResult {
  tool: ToolName;
  plan: PlanName;
  currentMonthlySpend: number;
  recommendedAction: RecommendedAction;
  projectedMonthlyCost: number;
  monthlySavings: number;
  annualSavings: number;
  reason: string;
  recommendedPlan?: PlanName;
  recommendedSeats?: number;
  recommendedTool?: ToolName;
}

export interface AuditResult {
  toolResults: ToolAuditResult[];
  totalMonthlySpend: number;
  totalMonthlySavings: number;
  totalAnnualSavings: number;
  useCase: UseCase;
  teamSize: number;
}

export type CurrencyCode = "USD";

export type ToolId =
  | "cursor"
  | "github_copilot"
  | "claude"
  | "chatgpt"
  | "gemini"
  | "windsurf"
  | "anthropic_api"
  | "openai_api";

export type UseCase = "coding" | "writing" | "data" | "research" | "mixed";

export type ToolCategory = "ide_assistant" | "chat_assistant" | "api" | "general";

export type Confidence = "confirmed" | "estimated";

export type BillingCycle = "monthly" | "annual";

export type FindingKind =
  | "downgrade_plan"
  | "consolidate"
  | "seats_exceed_team"
  | "annual_vs_monthly"
  | "unused_free_tier"
  | "missing_owner"
  | "price_increase"
  | "renewal_upcoming"
  | "budget_overrun"
  | "duplicate_category";

export interface PricingSource {
  url: string;
  verifiedAt: string; // ISO 8601 string, e.g. "2026-05-10T00:00:00Z"
  isStale: boolean;   // true if older than 60 days from referenceDate
}

export interface PricingCatalogEntry {
  toolId: ToolId;
  planId: string;
  planName: string;
  category: ToolCategory;
  monthlyPricePerSeatMinor: number; // e.g. 2000 for $20/mo
  annualPricePerSeatMinor: number;  // e.g. 2500 for $25/mo billed annually
  minSeats: number;
  sourceUrl: string;
  verifiedAt: string;
}

export interface SubscriptionInput {
  id: string;
  toolId: ToolId;
  planId: string;
  seats: number;
  /** Actual monthly spend in integer minor units (cents). If null, marked as unknown. NEVER silently defaulted to 0. */
  actualMonthlySpendMinor: number | null;
  billingCycle: BillingCycle;
  ownerEmail?: string | null;
  /** ISO 8601 date string, e.g. "2026-06-01" */
  renewalDate?: string | null;
  /** Previous price in integer minor units for tracking price increases */
  previousPriceMinor?: number | null;
  previousPriceDate?: string | null;
}

export interface AuditContext {
  subscriptions: SubscriptionInput[];
  teamSize: number;
  useCase: UseCase;
  monthlyBudgetMinor?: number | null;
  /** Reference date in ISO string format (defaults to current system date) */
  referenceDate: string;
}

export interface Finding {
  id: string;
  ruleId: string;
  toolId: ToolId;
  subscriptionId?: string;
  kind: FindingKind;
  title: string;
  description: string;
  currentMonthlyMinor: number;
  projectedMonthlyMinor: number;
  savingsMinor: number;
  confidence: Confidence;
  evidence: string[];
  assumptions: string[];
  pricingSource: PricingSource;
  /** Alternative findings for the same subscription to prevent double counting */
  alternatives?: Finding[];
}

export interface Rule {
  id: string;
  name: string;
  applies: (ctx: AuditContext, sub: SubscriptionInput) => boolean;
  evaluate: (ctx: AuditContext, sub: SubscriptionInput) => Finding | null;
}

export interface MultiSubscriptionRule {
  id: string;
  name: string;
  evaluate: (ctx: AuditContext) => Finding[];
}

export interface RenewalProjection {
  subscriptionId: string;
  toolId: ToolId;
  renewalDate: string;
  daysUntilRenewal: number;
  currentAnnualMinor: number;
  projectedAnnualMinor: number;
  annualSavingsMinor: number;
}

export interface AuditForecast {
  monthlyCurrentMinor: number;
  monthlyProjectedMinor: number;
  monthlySavingsMinor: number;
  annualCurrentMinor: number;
  annualProjectedMinor: number;
  annualSavingsMinor: number;
  renewalProjections: RenewalProjection[];
  label: "projection";
}

export interface StalePricingWarning {
  toolId: ToolId;
  planId: string;
  verifiedAt: string;
  daysOld: number;
}

export interface AuditMetadata {
  generatedAt: string;
  catalogVersion: string;
  stalePricingWarnings: StalePricingWarning[];
  unknownSpendSubscriptions: string[];
}

export interface AuditEngineResult {
  findings: Finding[];
  suppressedFindings: Finding[];
  forecast: AuditForecast;
  metadata: AuditMetadata;
}


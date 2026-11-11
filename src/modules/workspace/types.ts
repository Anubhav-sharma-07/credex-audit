export type WorkspaceRole = "owner" | "admin" | "finance" | "member" | "viewer";

export type SubscriptionCategory = "ide_assistant" | "chat_assistant" | "api" | "general";

export type SubscriptionStatus = "active" | "review" | "cancelled" | "archived";

export type DecisionStatus = "keep" | "cancel" | "review" | "undecided";

export type BillingFrequency = "monthly" | "annual";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  monthlyBudgetMinor?: number | null;
  createdAt: string;
}

export interface WorkspaceMember {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  createdAt: string;
}

export interface Subscription {
  id: string;
  workspaceId: string;
  vendorName: string;
  toolId: string;
  planName: string;
  category: SubscriptionCategory;
  seats: number;
  costMinor: number; // integer minor units (USD cents)
  currency: "USD";
  billingFrequency: BillingFrequency;
  renewalDate: string | null; // ISO YYYY-MM-DD
  ownerEmail: string | null;
  status: SubscriptionStatus;
  decisionStatus: DecisionStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PriceHistoryEntry {
  id: string;
  subscriptionId: string;
  effectiveDate: string;
  costMinor: number;
  currency: "USD";
  reason: string;
}

export interface CSVImportRecord {
  id: string;
  workspaceId: string;
  filename: string;
  rowCount: number;
  status: "preview" | "completed" | "rolled_back" | "failed";
  errorLog: Array<{ row: number; error: string }>;
  importedSubscriptionIds: string[];
  createdAt: string;
}

export interface InvitationRecord {
  id: string;
  workspaceId: string;
  email: string;
  role: "admin" | "member";
  token: string;
  expiresAt: string;
  createdAt: string;
}


import type {
  Subscription,
  SubscriptionCategory,
  BillingFrequency,
  SubscriptionStatus,
  DecisionStatus,
  PriceHistoryEntry,
} from "./types";
import { runAuditEngine } from "@/modules/audit";
import type { ToolId } from "@/modules/audit/types";
import { formatMinorToUsd } from "@/modules/audit/money";

export interface ListSubscriptionsOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: SubscriptionCategory | "all";
  billingFrequency?: BillingFrequency | "all";
  status?: SubscriptionStatus | "all";
  sortBy?: "vendorName" | "costMinor" | "renewalDate" | "seats";
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// In-memory tenant store for resilient operations and offline verification
const mockSubscriptionStore = new Map<string, Subscription[]>();
const mockPriceHistoryStore = new Map<string, PriceHistoryEntry[]>();

export function resetStore(workspaceId?: string) {
  if (workspaceId) {
    mockSubscriptionStore.delete(workspaceId);
    mockPriceHistoryStore.delete(workspaceId);
  } else {
    mockSubscriptionStore.clear();
    mockPriceHistoryStore.clear();
  }
}

// Initialize default seed data for mock workspace
function getInitialSeed(workspaceId: string): Subscription[] {
  return [
    {
      id: "sub_cursor_seed",
      workspaceId,
      vendorName: "Cursor",
      toolId: "cursor",
      planName: "Business",
      category: "ide_assistant",
      seats: 4,
      costMinor: 16000, // $160/mo
      currency: "USD",
      billingFrequency: "monthly",
      renewalDate: "2026-06-01",
      ownerEmail: "lead@spendlens.demo",
      status: "active",
      decisionStatus: "review",
      notes: "Need to verify if SSO features are required before next renewal.",
      createdAt: "2026-01-15T00:00:00Z",
      updatedAt: "2026-05-10T00:00:00Z",
    },
    {
      id: "sub_chatgpt_seed",
      workspaceId,
      vendorName: "ChatGPT",
      toolId: "chatgpt",
      planName: "Team",
      category: "chat_assistant",
      seats: 2,
      costMinor: 6000, // $60/mo
      currency: "USD",
      billingFrequency: "monthly",
      renewalDate: "2026-05-28",
      ownerEmail: "marketing@spendlens.demo",
      status: "active",
      decisionStatus: "undecided",
      notes: "Monthly flex billing. Evaluate annual discount or Plus downgrade.",
      createdAt: "2026-02-01T00:00:00Z",
      updatedAt: "2026-05-10T00:00:00Z",
    },
    {
      id: "sub_claude_seed",
      workspaceId,
      vendorName: "Claude",
      toolId: "claude",
      planName: "Team",
      category: "chat_assistant",
      seats: 5,
      costMinor: 15000, // $150/mo
      currency: "USD",
      billingFrequency: "monthly",
      renewalDate: "2026-06-15",
      ownerEmail: "cto@spendlens.demo",
      status: "active",
      decisionStatus: "keep",
      notes: "Primary coding and writing model workspace.",
      createdAt: "2026-01-10T00:00:00Z",
      updatedAt: "2026-05-10T00:00:00Z",
    },
    {
      id: "sub_copilot_seed",
      workspaceId,
      vendorName: "GitHub Copilot",
      toolId: "github_copilot",
      planName: "Business",
      category: "ide_assistant",
      seats: 4,
      costMinor: 7600, // $76/mo
      currency: "USD",
      billingFrequency: "monthly",
      renewalDate: "2026-07-01",
      ownerEmail: "eng@spendlens.demo",
      status: "active",
      decisionStatus: "undecided",
      notes: "Active developer IDE extension.",
      createdAt: "2026-03-01T00:00:00Z",
      updatedAt: "2026-05-10T00:00:00Z",
    },
    {
      id: "sub_windsurf_seed",
      workspaceId,
      vendorName: "Windsurf",
      toolId: "windsurf",
      planName: "Pro",
      category: "ide_assistant",
      seats: 2,
      costMinor: 3000, // $30/mo
      currency: "USD",
      billingFrequency: "monthly",
      renewalDate: "2026-05-22",
      ownerEmail: null, // missing owner finding candidate
      status: "active",
      decisionStatus: "cancel",
      notes: "Duplicate IDE assistant alongside Cursor.",
      createdAt: "2026-04-01T00:00:00Z",
      updatedAt: "2026-05-10T00:00:00Z",
    },
  ];
}

function getStore(workspaceId: string): Subscription[] {
  if (!mockSubscriptionStore.has(workspaceId)) {
    const isBlank = workspaceId.startsWith("ws_blank_");
    mockSubscriptionStore.set(workspaceId, isBlank ? [] : getInitialSeed(workspaceId));
  }
  return mockSubscriptionStore.get(workspaceId)!;
}

export async function listSubscriptions(
  workspaceId: string,
  options: ListSubscriptionsOptions = {}
): Promise<PaginatedResult<Subscription>> {
  const store = getStore(workspaceId);
  const {
    page = 1,
    pageSize = 10,
    search = "",
    category = "all",
    billingFrequency = "all",
    status = "all",
    sortBy = "vendorName",
    sortOrder = "asc",
  } = options;

  let filtered = store.filter((s) => s.workspaceId === workspaceId);

  // Search filter
  if (search.trim()) {
    const q = search.toLowerCase().trim();
    filtered = filtered.filter(
      (s) =>
        s.vendorName.toLowerCase().includes(q) ||
        s.planName.toLowerCase().includes(q) ||
        (s.ownerEmail && s.ownerEmail.toLowerCase().includes(q))
    );
  }

  // Category filter
  if (category !== "all") {
    filtered = filtered.filter((s) => s.category === category);
  }

  // Billing frequency filter
  if (billingFrequency !== "all") {
    filtered = filtered.filter((s) => s.billingFrequency === billingFrequency);
  }

  // Status filter
  if (status !== "all") {
    filtered = filtered.filter((s) => s.status === status);
  }

  // Sorting
  filtered.sort((a, b) => {
    let cmp = 0;
    if (sortBy === "vendorName") {
      cmp = a.vendorName.localeCompare(b.vendorName);
    } else if (sortBy === "costMinor") {
      cmp = a.costMinor - b.costMinor;
    } else if (sortBy === "seats") {
      cmp = a.seats - b.seats;
    } else if (sortBy === "renewalDate") {
      const d1 = a.renewalDate || "9999-12-31";
      const d2 = b.renewalDate || "9999-12-31";
      cmp = d1.localeCompare(d2);
    }
    return sortOrder === "asc" ? cmp : -cmp;
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startIndex = (page - 1) * pageSize;
  const paginatedData = filtered.slice(startIndex, startIndex + pageSize);

  return {
    data: paginatedData,
    total,
    page,
    pageSize,
    totalPages,
  };
}

export async function getSubscriptionById(
  workspaceId: string,
  id: string
): Promise<Subscription | null> {
  const store = getStore(workspaceId);
  return store.find((s) => s.workspaceId === workspaceId && s.id === id) || null;
}

export interface CreateSubscriptionInput {
  vendorName: string;
  toolId?: string;
  planName: string;
  category: SubscriptionCategory;
  seats: number;
  costMinor: number;
  billingFrequency: BillingFrequency;
  renewalDate?: string | null;
  ownerEmail?: string | null;
  decisionStatus?: DecisionStatus;
  notes?: string | null;
}

export async function createSubscription(
  workspaceId: string,
  input: CreateSubscriptionInput
): Promise<Subscription> {
  if (input.seats < 1) throw new Error("Seats must be at least 1.");
  if (input.costMinor < 0) throw new Error("Cost cannot be negative.");

  const store = getStore(workspaceId);
  const now = new Date().toISOString();
  const sub: Subscription = {
    id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    workspaceId,
    vendorName: input.vendorName,
    toolId: input.toolId || input.vendorName.toLowerCase().replace(/\s+/g, "_"),
    planName: input.planName,
    category: input.category,
    seats: input.seats,
    costMinor: input.costMinor,
    currency: "USD",
    billingFrequency: input.billingFrequency,
    renewalDate: input.renewalDate || null,
    ownerEmail: input.ownerEmail || null,
    status: "active",
    decisionStatus: input.decisionStatus || "undecided",
    notes: input.notes || null,
    createdAt: now,
    updatedAt: now,
  };

  store.push(sub);
  return sub;
}

export async function updateSubscription(
  workspaceId: string,
  id: string,
  updates: Partial<CreateSubscriptionInput> & { decisionStatus?: DecisionStatus; status?: SubscriptionStatus }
): Promise<Subscription> {
  const store = getStore(workspaceId);
  const index = store.findIndex((s) => s.workspaceId === workspaceId && s.id === id);
  if (index === -1) throw new Error("Subscription not found.");

  const existing = store[index];

  // If cost changed, record price history
  if (updates.costMinor !== undefined && updates.costMinor !== existing.costMinor) {
    const history = mockPriceHistoryStore.get(id) || [];
    history.push({
      id: `hist_${Date.now()}`,
      subscriptionId: id,
      effectiveDate: new Date().toISOString().slice(0, 10),
      costMinor: existing.costMinor,
      currency: "USD",
      reason: `Cost updated to ${formatMinorToUsd(updates.costMinor)}`,
    });
    mockPriceHistoryStore.set(id, history);
  }

  const updated: Subscription = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  store[index] = updated;
  return updated;
}

export async function bulkArchiveSubscriptions(
  workspaceId: string,
  ids: string[]
): Promise<number> {
  const store = getStore(workspaceId);
  let count = 0;
  for (const sub of store) {
    if (sub.workspaceId === workspaceId && ids.includes(sub.id)) {
      sub.status = "archived";
      sub.updatedAt = new Date().toISOString();
      count++;
    }
  }
  return count;
}

export async function deleteSubscription(workspaceId: string, id: string): Promise<boolean> {
  const store = getStore(workspaceId);
  const idx = store.findIndex((s) => s.workspaceId === workspaceId && s.id === id);
  if (idx === -1) return false;
  store.splice(idx, 1);
  return true;
}

export async function getPriceHistory(subscriptionId: string): Promise<PriceHistoryEntry[]> {
  return mockPriceHistoryStore.get(subscriptionId) || [];
}

/**
 * Returns aggregated vendor directory data.
 */
export async function getVendorDirectory(workspaceId: string) {
  const store = getStore(workspaceId);
  const activeSubs = store.filter((s) => s.workspaceId === workspaceId && s.status !== "archived");

  const vendorMap = new Map<
    string,
    {
      vendorName: string;
      toolId: string;
      category: SubscriptionCategory;
      subscriptionCount: number;
      totalMonthlyCostMinor: number;
      primaryOwner: string | null;
      billingFrequencies: Set<BillingFrequency>;
    }
  >();

  for (const s of activeSubs) {
    const existing = vendorMap.get(s.vendorName) || {
      vendorName: s.vendorName,
      toolId: s.toolId,
      category: s.category,
      subscriptionCount: 0,
      totalMonthlyCostMinor: 0,
      primaryOwner: s.ownerEmail,
      billingFrequencies: new Set<BillingFrequency>(),
    };

    existing.subscriptionCount += 1;
    existing.totalMonthlyCostMinor += s.costMinor;
    existing.billingFrequencies.add(s.billingFrequency);
    if (!existing.primaryOwner && s.ownerEmail) existing.primaryOwner = s.ownerEmail;
    vendorMap.set(s.vendorName, existing);
  }

  return Array.from(vendorMap.values()).map((v) => ({
    ...v,
    billingFrequencies: Array.from(v.billingFrequencies),
  }));
}

/**
 * Returns upcoming contract renewals with 7 / 30 / 90 day filtering.
 */
export async function getRenewalsSchedule(workspaceId: string, withinDays: number = 30) {
  const store = getStore(workspaceId);
  const now = new Date();
  const maxDate = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);

  const activeSubs = store.filter((s) => s.workspaceId === workspaceId && s.status !== "archived" && s.renewalDate);

  return activeSubs
    .filter((s) => {
      const ren = new Date(s.renewalDate!);
      return ren >= now && ren <= maxDate;
    })
    .sort((a, b) => a.renewalDate!.localeCompare(b.renewalDate!));
}

/**
 * Returns four core numbers with explicit basis and top evidence-backed findings.
 */
export async function getOverviewMetrics(workspaceId: string) {
  const store = getStore(workspaceId);
  const activeSubs = store.filter((s) => s.workspaceId === workspaceId && s.status === "active");

  const monthlyRecurringMinor = activeSubs.reduce((acc, s) => acc + s.costMinor, 0);
  const annualisedMinor = monthlyRecurringMinor * 12;
  const activeSubscriptionsCount = activeSubs.length;

  // Run audit engine to identify verifiable savings
  const engineResult = runAuditEngine({
    subscriptions: activeSubs.map((s) => ({
      id: s.id,
      toolId: s.toolId as ToolId,
      planId: s.planName.toLowerCase(),
      seats: s.seats,
      actualMonthlySpendMinor: s.costMinor,
      billingCycle: s.billingFrequency,
      ownerEmail: s.ownerEmail,
      renewalDate: s.renewalDate,
    })),
    teamSize: 4,
    useCase: "coding",
    referenceDate: new Date().toISOString(),
  });

  const potentialSavingsMonthlyMinor = engineResult.forecast.monthlySavingsMinor;

  return {
    monthlyRecurring: {
      amountMinor: monthlyRecurringMinor,
      basis: `from ${activeSubscriptionsCount} active subscriptions`,
    },
    annualised: {
      amountMinor: annualisedMinor,
      basis: "12x monthly recurring run rate",
    },
    activeSubscriptions: {
      count: activeSubscriptionsCount,
      basis: "currently provisioned licenses",
    },
    potentialSavings: {
      amountMinor: potentialSavingsMonthlyMinor,
      basis: `from ${engineResult.findings.filter((f) => f.savingsMinor > 0).length} evidence-backed findings`,
    },
    topFindings: engineResult.findings.slice(0, 3),
    upcomingRenewals: await getRenewalsSchedule(workspaceId, 30),
    topVendors: (await getVendorDirectory(workspaceId)).slice(0, 4),
  };
}

export function exportSubscriptionsCsv(subscriptions: Subscription[]): string {
  const headers = [
    "ID",
    "Vendor",
    "Plan",
    "Category",
    "Seats",
    "Monthly Spend USD",
    "Billing Frequency",
    "Renewal Date",
    "Owner Email",
    "Decision Status",
    "Status",
  ];

  const rows = subscriptions.map((s) => [
    `"${s.id}"`,
    `"${s.vendorName}"`,
    `"${s.planName}"`,
    `"${s.category}"`,
    s.seats,
    (s.costMinor / 100).toFixed(2),
    `"${s.billingFrequency}"`,
    `"${s.renewalDate || ""}"`,
    `"${s.ownerEmail || ""}"`,
    `"${s.decisionStatus}"`,
    `"${s.status}"`,
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

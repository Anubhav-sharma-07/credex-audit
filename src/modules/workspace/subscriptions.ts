import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Subscription,
  SubscriptionCategory,
  BillingFrequency,
  SubscriptionStatus,
  DecisionStatus,
} from "./types";
import {
  getSubscriptionRepository,
  type ListSubscriptionsOptions,
  type PaginatedResult,
} from "./repository";

export type { ListSubscriptionsOptions, PaginatedResult };

export function resetStore(workspaceId?: string) {
  const repo = getSubscriptionRepository();
  if ("clear" in repo && typeof (repo as { clear: (wsId?: string) => void }).clear === "function") {
    (repo as { clear: (wsId?: string) => void }).clear(workspaceId);
  }
}

export async function listSubscriptions(
  workspaceId: string,
  options: ListSubscriptionsOptions = {},
  client?: SupabaseClient
): Promise<PaginatedResult<Subscription>> {
  const repo = getSubscriptionRepository(client);
  return repo.list(workspaceId, options);
}

export async function getSubscriptionById(
  workspaceId: string,
  id: string,
  client?: SupabaseClient
): Promise<Subscription | null> {
  const repo = getSubscriptionRepository(client);
  return repo.getById(workspaceId, id);
}

export interface CreateSubscriptionInput {
  vendorName: string;
  toolId?: string;
  planName: string;
  category: SubscriptionCategory;
  seats: number;
  costMinor: number;
  currency?: "USD";
  billingFrequency: BillingFrequency;
  renewalDate?: string | null;
  ownerEmail?: string | null;
  decisionStatus?: DecisionStatus;
  status?: SubscriptionStatus;
  notes?: string | null;
}

export async function createSubscription(
  workspaceId: string,
  input: CreateSubscriptionInput,
  client?: SupabaseClient
): Promise<Subscription> {
  const repo = getSubscriptionRepository(client);
  return repo.create(workspaceId, {
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
    status: input.status || "active",
    decisionStatus: input.decisionStatus || "undecided",
    notes: input.notes || null,
  });
}

export async function updateSubscription(
  workspaceId: string,
  id: string,
  updates: Partial<CreateSubscriptionInput> & { decisionStatus?: DecisionStatus; status?: SubscriptionStatus },
  client?: SupabaseClient
): Promise<Subscription> {
  const repo = getSubscriptionRepository(client);
  return repo.update(workspaceId, id, updates);
}

export async function deleteSubscription(
  workspaceId: string,
  id: string,
  client?: SupabaseClient
): Promise<boolean> {
  const repo = getSubscriptionRepository(client);
  return repo.delete(workspaceId, id);
}

export async function bulkArchiveSubscriptions(
  workspaceId: string,
  ids: string[],
  client?: SupabaseClient
): Promise<number> {
  const repo = getSubscriptionRepository(client);
  return repo.bulkArchive(workspaceId, ids);
}

export async function getRenewalsSchedule(
  workspaceId: string,
  withinDays: number = 30,
  client?: SupabaseClient
) {
  const repo = getSubscriptionRepository(client);
  return repo.getRenewalsSchedule(workspaceId, withinDays);
}

export async function getVendorDirectory(workspaceId: string, client?: SupabaseClient) {
  const repo = getSubscriptionRepository(client);
  return repo.getVendorDirectory(workspaceId);
}

export async function getOverviewMetrics(workspaceId: string, client?: SupabaseClient) {
  const repo = getSubscriptionRepository(client);
  return repo.getOverviewMetrics(workspaceId);
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

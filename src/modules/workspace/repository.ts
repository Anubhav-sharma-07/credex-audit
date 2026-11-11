import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Subscription,
  SubscriptionCategory,
  BillingFrequency,
  SubscriptionStatus,
  DecisionStatus,
} from "./types";
import { runAuditEngine } from "@/modules/audit";
import type { ToolId, Finding } from "@/modules/audit/types";

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

export interface OverviewMetricsData {
  monthlyRecurring: {
    amountMinor: number;
    basis: string;
  };
  annualised: {
    amountMinor: number;
    basis: string;
  };
  activeSubscriptions: {
    count: number;
    basis: string;
  };
  potentialSavings: {
    amountMinor: number;
    basis: string;
  };
  topFindings: Finding[];
  upcomingRenewals: Subscription[];
  topVendors: Array<{
    vendorName: string;
    toolId: string;
    category: SubscriptionCategory;
    subscriptionCount: number;
    totalMonthlyCostMinor: number;
    primaryOwner: string | null;
    billingFrequencies: BillingFrequency[];
  }>;
}

export interface SubscriptionRepository {
  list(workspaceId: string, options?: ListSubscriptionsOptions): Promise<PaginatedResult<Subscription>>;
  getById(workspaceId: string, id: string): Promise<Subscription | null>;
  create(
    workspaceId: string,
    data: Omit<Subscription, "id" | "workspaceId" | "createdAt" | "updatedAt">
  ): Promise<Subscription>;
  update(
    workspaceId: string,
    id: string,
    updates: Partial<Omit<Subscription, "id" | "workspaceId" | "createdAt">>
  ): Promise<Subscription>;
  delete(workspaceId: string, id: string): Promise<boolean>;
  bulkArchive(workspaceId: string, ids: string[]): Promise<number>;
  getOverviewMetrics(workspaceId: string): Promise<OverviewMetricsData>;
  getRenewalsSchedule(workspaceId: string, withinDays?: number): Promise<Subscription[]>;
  getVendorDirectory(workspaceId: string): Promise<Array<{
    vendorName: string;
    toolId: string;
    category: SubscriptionCategory;
    subscriptionCount: number;
    totalMonthlyCostMinor: number;
    primaryOwner: string | null;
    billingFrequencies: BillingFrequency[];
  }>>;
}

// Database Row mapping
interface SubscriptionRow {
  id: string;
  workspace_id: string;
  vendor_name: string;
  tool_id: string;
  plan_name: string;
  category: string;
  seats: number;
  cost_minor: number | string;
  currency: string;
  billing_frequency: string;
  renewal_date: string | null;
  owner_email: string | null;
  status: string;
  decision_status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToSubscription(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    vendorName: row.vendor_name,
    toolId: row.tool_id,
    planName: row.plan_name,
    category: row.category as SubscriptionCategory,
    seats: row.seats,
    costMinor: Number(row.cost_minor),
    currency: "USD",
    billingFrequency: row.billing_frequency as BillingFrequency,
    renewalDate: row.renewal_date,
    ownerEmail: row.owner_email,
    status: row.status as SubscriptionStatus,
    decisionStatus: row.decision_status as DecisionStatus,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Production Postgres (Supabase) Subscription Repository.
 * Executes queries bound to the authenticated user's session so Postgres RLS applies.
 */
export class SupabaseSubscriptionRepository implements SubscriptionRepository {
  constructor(private supabase: SupabaseClient) {}

  async list(workspaceId: string, options?: ListSubscriptionsOptions): Promise<PaginatedResult<Subscription>> {
    let query = this.supabase
      .from("subscriptions")
      .select("*", { count: "exact" })
      .eq("workspace_id", workspaceId);

    if (options?.category && options.category !== "all") {
      query = query.eq("category", options.category);
    }
    if (options?.billingFrequency && options.billingFrequency !== "all") {
      query = query.eq("billing_frequency", options.billingFrequency);
    }
    if (options?.status && options.status !== "all") {
      query = query.eq("status", options.status);
    }
    if (options?.search) {
      query = query.or(`vendor_name.ilike.%${options.search}%,plan_name.ilike.%${options.search}%`);
    }

    const sortBy = options?.sortBy || "costMinor";
    const sortOrder = options?.sortOrder || "desc";
    const dbSortCol =
      sortBy === "vendorName"
        ? "vendor_name"
        : sortBy === "costMinor"
        ? "cost_minor"
        : sortBy === "renewalDate"
        ? "renewal_date"
        : "seats";

    query = query.order(dbSortCol, { ascending: sortOrder === "asc" });

    const page = Math.max(1, options?.page || 1);
    const pageSize = Math.min(100, Math.max(1, options?.pageSize || 25));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query.range(from, to);

    const { data, count, error } = await query;
    if (error) {
      throw new Error(`Failed to list subscriptions: ${error.message}`);
    }

    const total = count || 0;
    const rows = (data || []) as SubscriptionRow[];

    return {
      data: rows.map(mapRowToSubscription),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  async getById(workspaceId: string, id: string): Promise<Subscription | null> {
    const { data, error } = await this.supabase
      .from("subscriptions")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("id", id)
      .single();

    if (error || !data) return null;
    return mapRowToSubscription(data as SubscriptionRow);
  }

  async create(
    workspaceId: string,
    data: Omit<Subscription, "id" | "workspaceId" | "createdAt" | "updatedAt">
  ): Promise<Subscription> {
    if (data.seats < 1) throw new Error("Seats must be at least 1.");
    if (data.costMinor < 0) throw new Error("Cost cannot be negative.");

    const insertPayload = {
      workspace_id: workspaceId,
      vendor_name: data.vendorName,
      tool_id: data.toolId || data.vendorName.toLowerCase().replace(/\s+/g, "_"),
      plan_name: data.planName,
      category: data.category,
      seats: data.seats,
      cost_minor: data.costMinor,
      currency: "USD",
      billing_frequency: data.billingFrequency,
      renewal_date: data.renewalDate || null,
      owner_email: data.ownerEmail || null,
      status: data.status || "active",
      decision_status: data.decisionStatus || "undecided",
      notes: data.notes || null,
    };

    const { data: created, error } = await this.supabase
      .from("subscriptions")
      .insert(insertPayload)
      .select()
      .single();

    if (error || !created) {
      throw new Error(`Failed to create subscription: ${error?.message || "Unknown error"}`);
    }

    return mapRowToSubscription(created as SubscriptionRow);
  }

  async update(
    workspaceId: string,
    id: string,
    updates: Partial<Omit<Subscription, "id" | "workspaceId" | "createdAt">>
  ): Promise<Subscription> {
    const patchPayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.vendorName !== undefined) patchPayload.vendor_name = updates.vendorName;
    if (updates.toolId !== undefined) patchPayload.tool_id = updates.toolId;
    if (updates.planName !== undefined) patchPayload.plan_name = updates.planName;
    if (updates.category !== undefined) patchPayload.category = updates.category;
    if (updates.seats !== undefined) {
      if (updates.seats < 1) throw new Error("Seats must be at least 1.");
      patchPayload.seats = updates.seats;
    }
    if (updates.costMinor !== undefined) {
      if (updates.costMinor < 0) throw new Error("Cost cannot be negative.");
      patchPayload.cost_minor = updates.costMinor;
    }
    if (updates.billingFrequency !== undefined) patchPayload.billing_frequency = updates.billingFrequency;
    if (updates.renewalDate !== undefined) patchPayload.renewal_date = updates.renewalDate;
    if (updates.ownerEmail !== undefined) patchPayload.owner_email = updates.ownerEmail;
    if (updates.status !== undefined) patchPayload.status = updates.status;
    if (updates.decisionStatus !== undefined) patchPayload.decision_status = updates.decisionStatus;
    if (updates.notes !== undefined) patchPayload.notes = updates.notes;

    const { data: updated, error } = await this.supabase
      .from("subscriptions")
      .update(patchPayload)
      .eq("workspace_id", workspaceId)
      .eq("id", id)
      .select()
      .single();

    if (error || !updated) {
      throw new Error(`Failed to update subscription: ${error?.message || "Unknown error"}`);
    }

    return mapRowToSubscription(updated as SubscriptionRow);
  }

  async delete(workspaceId: string, id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from("subscriptions")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("id", id);

    return !error;
  }

  async bulkArchive(workspaceId: string, ids: string[]): Promise<number> {
    const { data, error } = await this.supabase
      .from("subscriptions")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .eq("workspace_id", workspaceId)
      .in("id", ids)
      .select("id");

    if (error) throw new Error(`Bulk archive failed: ${error.message}`);
    return data ? data.length : 0;
  }

  async getRenewalsSchedule(workspaceId: string, withinDays: number = 30): Promise<Subscription[]> {
    const now = new Date();
    const maxDate = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);
    const minIso = now.toISOString().slice(0, 10);
    const maxIso = maxDate.toISOString().slice(0, 10);

    const { data, error } = await this.supabase
      .from("subscriptions")
      .select("*")
      .eq("workspace_id", workspaceId)
      .neq("status", "archived")
      .not("renewal_date", "is", null)
      .gte("renewal_date", minIso)
      .lte("renewal_date", maxIso)
      .order("renewal_date", { ascending: true });

    if (error || !data) return [];
    return (data as SubscriptionRow[]).map(mapRowToSubscription);
  }

  async getVendorDirectory(workspaceId: string) {
    const { data, error } = await this.supabase
      .from("subscriptions")
      .select("*")
      .eq("workspace_id", workspaceId)
      .neq("status", "archived");

    if (error || !data) return [];
    const subs = (data as SubscriptionRow[]).map(mapRowToSubscription);

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

    for (const s of subs) {
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

  async getOverviewMetrics(workspaceId: string): Promise<OverviewMetricsData> {
    const { data, error } = await this.supabase
      .from("subscriptions")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("status", "active");

    const activeSubs = error || !data ? [] : (data as SubscriptionRow[]).map(mapRowToSubscription);

    const monthlyRecurringMinor = activeSubs.reduce((acc, s) => acc + s.costMinor, 0);
    const annualisedMinor = monthlyRecurringMinor * 12;
    const activeSubscriptionsCount = activeSubs.length;

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
      upcomingRenewals: await this.getRenewalsSchedule(workspaceId, 30),
      topVendors: (await this.getVendorDirectory(workspaceId)).slice(0, 4),
    };
  }
}

/**
 * Clean In-Memory Subscription Repository for Unit Tests.
 * Zero hardcoded production data.
 */
export class InMemorySubscriptionRepository implements SubscriptionRepository {
  private store: Map<string, Subscription[]> = new Map();

  constructor(initialData?: Map<string, Subscription[]>) {
    if (initialData) {
      this.store = new Map(initialData);
    }
  }

  clear(workspaceId?: string) {
    if (workspaceId) this.store.delete(workspaceId);
    else this.store.clear();
  }

  private getList(workspaceId: string): Subscription[] {
    if (!this.store.has(workspaceId)) {
      this.store.set(workspaceId, []);
    }
    return this.store.get(workspaceId)!;
  }

  async list(workspaceId: string, options?: ListSubscriptionsOptions): Promise<PaginatedResult<Subscription>> {
    let items = [...this.getList(workspaceId)];

    if (options?.category && options.category !== "all") {
      items = items.filter((s) => s.category === options.category);
    }
    if (options?.billingFrequency && options.billingFrequency !== "all") {
      items = items.filter((s) => s.billingFrequency === options.billingFrequency);
    }
    if (options?.status && options.status !== "all") {
      items = items.filter((s) => s.status === options.status);
    }
    if (options?.search) {
      const q = options.search.toLowerCase();
      items = items.filter(
        (s) => s.vendorName.toLowerCase().includes(q) || s.planName.toLowerCase().includes(q)
      );
    }

    const sortBy = options?.sortBy || "costMinor";
    const sortOrder = options?.sortOrder || "desc";
    items.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "vendorName") cmp = a.vendorName.localeCompare(b.vendorName);
      else if (sortBy === "costMinor") cmp = a.costMinor - b.costMinor;
      else if (sortBy === "renewalDate") cmp = (a.renewalDate || "").localeCompare(b.renewalDate || "");
      else if (sortBy === "seats") cmp = a.seats - b.seats;
      return sortOrder === "asc" ? cmp : -cmp;
    });

    const page = Math.max(1, options?.page || 1);
    const pageSize = Math.min(100, Math.max(1, options?.pageSize || 25));
    const total = items.length;
    const start = (page - 1) * pageSize;
    const paged = items.slice(start, start + pageSize);

    return {
      data: paged,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  async getById(workspaceId: string, id: string): Promise<Subscription | null> {
    const items = this.getList(workspaceId);
    return items.find((s) => s.id === id) || null;
  }

  async create(
    workspaceId: string,
    data: Omit<Subscription, "id" | "workspaceId" | "createdAt" | "updatedAt">
  ): Promise<Subscription> {
    if (data.seats < 1) throw new Error("Seats must be at least 1.");
    if (data.costMinor < 0) throw new Error("Cost cannot be negative.");

    const items = this.getList(workspaceId);
    const now = new Date().toISOString();
    const created: Subscription = {
      ...data,
      id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      workspaceId,
      createdAt: now,
      updatedAt: now,
    };
    items.push(created);
    return created;
  }

  async update(
    workspaceId: string,
    id: string,
    updates: Partial<Omit<Subscription, "id" | "workspaceId" | "createdAt">>
  ): Promise<Subscription> {
    const items = this.getList(workspaceId);
    const idx = items.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error("Subscription not found.");

    if (updates.seats !== undefined && updates.seats < 1) {
      throw new Error("Seats must be at least 1.");
    }
    if (updates.costMinor !== undefined && updates.costMinor < 0) {
      throw new Error("Cost cannot be negative.");
    }

    const updated: Subscription = {
      ...items[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    items[idx] = updated;
    return updated;
  }

  async delete(workspaceId: string, id: string): Promise<boolean> {
    const items = this.getList(workspaceId);
    const idx = items.findIndex((s) => s.id === id);
    if (idx === -1) return false;
    items.splice(idx, 1);
    return true;
  }

  async bulkArchive(workspaceId: string, ids: string[]): Promise<number> {
    const items = this.getList(workspaceId);
    let count = 0;
    for (const sub of items) {
      if (ids.includes(sub.id)) {
        sub.status = "archived";
        sub.updatedAt = new Date().toISOString();
        count++;
      }
    }
    return count;
  }

  async getRenewalsSchedule(workspaceId: string, withinDays: number = 30): Promise<Subscription[]> {
    const items = this.getList(workspaceId).filter((s) => s.status !== "archived" && s.renewalDate);
    const now = new Date();
    const maxDate = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);

    return items
      .filter((s) => {
        const ren = new Date(s.renewalDate!);
        return ren >= now && ren <= maxDate;
      })
      .sort((a, b) => a.renewalDate!.localeCompare(b.renewalDate!));
  }

  async getVendorDirectory(workspaceId: string) {
    const items = this.getList(workspaceId).filter((s) => s.status !== "archived");
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

    for (const s of items) {
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

  async getOverviewMetrics(workspaceId: string): Promise<OverviewMetricsData> {
    const activeSubs = this.getList(workspaceId).filter((s) => s.status === "active");
    const monthlyRecurringMinor = activeSubs.reduce((acc, s) => acc + s.costMinor, 0);
    const annualisedMinor = monthlyRecurringMinor * 12;
    const activeSubscriptionsCount = activeSubs.length;

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
        amountMinor: engineResult.forecast.monthlySavingsMinor,
        basis: `from ${engineResult.findings.filter((f) => f.savingsMinor > 0).length} evidence-backed findings`,
      },
      topFindings: engineResult.findings.slice(0, 3),
      upcomingRenewals: await this.getRenewalsSchedule(workspaceId, 30),
      topVendors: (await this.getVendorDirectory(workspaceId)).slice(0, 4),
    };
  }
}

let testSubscriptionRepo: InMemorySubscriptionRepository | null = null;

export function setTestSubscriptionRepository(repo: InMemorySubscriptionRepository | null) {
  testSubscriptionRepo = repo;
}

export function getSubscriptionRepository(supabaseClient?: SupabaseClient): SubscriptionRepository {
  if (testSubscriptionRepo) {
    return testSubscriptionRepo;
  }
  if (supabaseClient) {
    return new SupabaseSubscriptionRepository(supabaseClient);
  }
  // Default in-memory for testing environments when no client is passed
  if (process.env.NODE_ENV === "test") {
    if (!testSubscriptionRepo) {
      testSubscriptionRepo = new InMemorySubscriptionRepository();
    }
    return testSubscriptionRepo;
  }
  throw new Error("SupabaseClient is required to instantiate SupabaseSubscriptionRepository in non-test environment.");
}

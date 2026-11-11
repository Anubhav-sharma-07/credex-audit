import type { SupabaseClient } from "@supabase/supabase-js";
import { runAuditEngine } from "./engine";
import type { ToolId, Finding, AuditForecast, UseCase } from "./types";
import crypto from "crypto";

function parseUseCase(val: string): UseCase {
  const normalized = (val || "").toLowerCase();
  if (normalized === "writing" || normalized === "data" || normalized === "research" || normalized === "mixed") {
    return normalized;
  }
  return "coding";
}

export interface AuditToolResult {
  tool: string;
  plan: string;
  monthlySpend?: number;
  currentMonthlySpend?: number;
  projectedMonthlyCost?: number;
  monthlySavings?: number;
  annualSavings?: number;
  reason?: string;
}

export interface CreateAuditInput {
  teamSize: number;
  useCase: string;
  tools: AuditToolResult[];
  summary?: string;
}

export interface AuditRecord {
  id: string;
  shareToken: string;
  teamSize: number;
  useCase: string;
  totalMonthlySpend: number;
  totalMonthlySavings: number;
  totalAnnualSavings: number;
  toolResults: AuditToolResult[];
  findings: Finding[];
  forecast: AuditForecast;
  summary: string;
  isClaimed: boolean;
  claimedWorkspaceId: string | null;
  createdAt: string;
}

interface AuditRow {
  id: string;
  share_token: string;
  team_size: number;
  use_case: string;
  total_monthly_spend: number | string;
  total_monthly_savings: number | string;
  total_annual_savings: number | string;
  tool_results: unknown;
  summary: string;
  is_claimed: boolean;
  claimed_workspace_id: string | null;
  created_at: string;
}

export interface AuditRepository {
  create(input: CreateAuditInput): Promise<{ id: string; shareToken: string; record: AuditRecord }>;
  getByShareToken(token: string): Promise<AuditRecord | null>;
  getById(id: string): Promise<AuditRecord | null>;
  claim(id: string, workspaceId: string): Promise<boolean>;
}

export class SupabaseAuditRepository implements AuditRepository {
  constructor(private supabase: SupabaseClient) {}

  async create(input: CreateAuditInput): Promise<{ id: string; shareToken: string; record: AuditRecord }> {
    const rawTools = input.tools || [];
    
    // Map submitted tools to audit engine subscription inputs
    const engineSubs = rawTools.map((t, idx) => {
      const toolId = (t.tool || "general").toLowerCase().replace(/\s+/g, "_") as ToolId;
      const spend = Number(t.monthlySpend ?? t.currentMonthlySpend ?? 0);
      const spendMinor = Math.round(spend * 100);
      return {
        id: `aud_sub_${idx}`,
        toolId,
        planId: (t.plan || "standard").toLowerCase(),
        seats: input.teamSize,
        actualMonthlySpendMinor: spendMinor,
        billingCycle: "monthly" as const,
      };
    });

    // Run deterministic audit engine server-side to calculate authoritative totals
    const engineResult = runAuditEngine({
      subscriptions: engineSubs,
      teamSize: input.teamSize,
      useCase: parseUseCase(input.useCase),
      referenceDate: new Date().toISOString(),
    });

    const totalMonthlySpend = engineSubs.reduce((sum, s) => sum + s.actualMonthlySpendMinor, 0) / 100;
    const totalMonthlySavings = engineResult.forecast.monthlySavingsMinor / 100;
    const totalAnnualSavings = engineResult.forecast.annualSavingsMinor / 100;

    // Cryptographically secure 128-bit random share_token and non-guessable random ID
    const shareToken = crypto.randomBytes(16).toString("hex");
    const auditId = `aud_${crypto.randomBytes(12).toString("hex")}`;

    const insertPayload = {
      id: auditId,
      share_token: shareToken,
      team_size: input.teamSize,
      use_case: input.useCase,
      total_monthly_spend: totalMonthlySpend,
      total_monthly_savings: totalMonthlySavings,
      total_annual_savings: totalAnnualSavings,
      tool_results: rawTools,
      summary: input.summary || engineResult.findings[0]?.evidence || "Automated SpendLens audit findings",
      is_claimed: false,
    };

    interface InsertChain {
      select?: () => { single?: () => Promise<{ data: unknown; error: { message?: string } | null }> };
      single?: () => Promise<{ data: unknown; error: { message?: string } | null }>;
    }
    const insertBuilder = this.supabase.from("audits").insert(insertPayload) as unknown as InsertChain;
    const selectBuilder = typeof insertBuilder.select === "function" 
      ? insertBuilder.select() 
      : insertBuilder;
    const { data, error } = typeof selectBuilder.single === "function"
      ? await selectBuilder.single()
      : await (selectBuilder as unknown as Promise<{ data: unknown; error: { message?: string } | null }>);

    if (error) {
      throw new Error(`Database error saving audit snapshot: ${error?.message || "Insert failed"}`);
    }

    const row = (data || insertPayload) as Record<string, unknown>;
    const resolvedId = (data as { id?: string })?.id || (row.id as string) || auditId;
    const resolvedToken = (data as { share_token?: string })?.share_token || (row.share_token as string) || ((data as { id?: string })?.id ? (data as { id: string }).id : shareToken);
    const record: AuditRecord = {
      id: resolvedId,
      shareToken: resolvedToken,
      teamSize: (row.team_size as number) ?? input.teamSize,
      useCase: (row.use_case as string) ?? input.useCase,
      totalMonthlySpend,
      totalMonthlySavings,
      totalAnnualSavings,
      toolResults: rawTools,
      findings: engineResult.findings,
      forecast: engineResult.forecast,
      summary: (row.summary as string) ?? insertPayload.summary,
      isClaimed: (row.is_claimed as boolean) ?? false,
      claimedWorkspaceId: (row.claimed_workspace_id as string | null) ?? null,
      createdAt: (row.created_at as string) ?? new Date().toISOString(),
    };

    return { id: resolvedId, shareToken: resolvedToken, record };
  }

  async getByShareToken(token: string): Promise<AuditRecord | null> {
    const { data, error } = await this.supabase
      .from("audits")
      .select("*")
      .eq("share_token", token)
      .single();

    if (error || !data) return null;
    return this.hydrateAuditRecord(data as AuditRow);
  }

  async getById(id: string): Promise<AuditRecord | null> {
    const { data, error } = await this.supabase
      .from("audits")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) return null;
    return this.hydrateAuditRecord(data as AuditRow);
  }

  async claim(id: string, workspaceId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from("audits")
      .update({ is_claimed: true, claimed_workspace_id: workspaceId })
      .eq("id", id);

    return !error;
  }

  private hydrateAuditRecord(row: AuditRow): AuditRecord {
    const toolResults = (Array.isArray(row.tool_results) ? row.tool_results : []) as AuditToolResult[];
    const engineSubs = toolResults.map((t, idx) => ({
      id: `aud_sub_${idx}`,
      toolId: (t.tool || "general").toLowerCase().replace(/\s+/g, "_") as ToolId,
      planId: (t.plan || "standard").toLowerCase(),
      seats: row.team_size,
      actualMonthlySpendMinor: Math.round(Number(t.monthlySpend ?? t.currentMonthlySpend ?? 0) * 100),
      billingCycle: "monthly" as const,
    }));

    const engineResult = runAuditEngine({
      subscriptions: engineSubs,
      teamSize: row.team_size,
      useCase: parseUseCase(row.use_case),
      referenceDate: row.created_at,
    });

    return {
      id: row.id,
      shareToken: row.share_token,
      teamSize: row.team_size,
      useCase: row.use_case,
      totalMonthlySpend: Number(row.total_monthly_spend) / 100,
      totalMonthlySavings: Number(row.total_monthly_savings) / 100,
      totalAnnualSavings: Number(row.total_annual_savings) / 100,
      toolResults,
      findings: engineResult.findings,
      forecast: engineResult.forecast,
      summary: row.summary,
      isClaimed: row.is_claimed,
      claimedWorkspaceId: row.claimed_workspace_id,
      createdAt: row.created_at,
    };
  }
}

export class InMemoryAuditRepository implements AuditRepository {
  private store: Map<string, AuditRecord> = new Map();

  async create(input: CreateAuditInput): Promise<{ id: string; shareToken: string; record: AuditRecord }> {
    const rawTools = input.tools || [];
    const engineSubs = rawTools.map((t, idx) => ({
      id: `aud_sub_${idx}`,
      toolId: (t.tool || "general").toLowerCase().replace(/\s+/g, "_") as ToolId,
      planId: (t.plan || "standard").toLowerCase(),
      seats: input.teamSize,
      actualMonthlySpendMinor: Math.round(Number(t.monthlySpend ?? t.currentMonthlySpend ?? 0) * 100),
      billingCycle: "monthly" as const,
    }));

    const engineResult = runAuditEngine({
      subscriptions: engineSubs,
      teamSize: input.teamSize,
      useCase: parseUseCase(input.useCase),
      referenceDate: new Date().toISOString(),
    });

    const totalMonthlySpend = engineSubs.reduce((sum, s) => sum + s.actualMonthlySpendMinor, 0) / 100;
    const totalMonthlySavings = engineResult.forecast.monthlySavingsMinor / 100;
    const totalAnnualSavings = engineResult.forecast.annualSavingsMinor / 100;

    const shareToken = crypto.randomBytes(16).toString("hex");
    const id = `aud_${crypto.randomBytes(12).toString("hex")}`;

    const record: AuditRecord = {
      id,
      shareToken,
      teamSize: input.teamSize,
      useCase: input.useCase,
      totalMonthlySpend,
      totalMonthlySavings,
      totalAnnualSavings,
      toolResults: rawTools,
      findings: engineResult.findings,
      forecast: engineResult.forecast,
      summary: input.summary || "Automated SpendLens audit findings",
      isClaimed: false,
      claimedWorkspaceId: null,
      createdAt: new Date().toISOString(),
    };

    this.store.set(id, record);
    this.store.set(shareToken, record);
    return { id, shareToken, record };
  }

  async getByShareToken(token: string): Promise<AuditRecord | null> {
    return this.store.get(token) || null;
  }

  async getById(id: string): Promise<AuditRecord | null> {
    return this.store.get(id) || null;
  }

  async claim(id: string, workspaceId: string): Promise<boolean> {
    const rec = this.store.get(id);
    if (!rec) return false;
    rec.isClaimed = true;
    rec.claimedWorkspaceId = workspaceId;
    return true;
  }
}

let testAuditRepo: InMemoryAuditRepository | null = null;

export function setTestAuditRepository(repo: InMemoryAuditRepository | null) {
  testAuditRepo = repo;
}

export function getAuditRepository(client?: SupabaseClient): AuditRepository {
  if (testAuditRepo) return testAuditRepo;
  if (client) return new SupabaseAuditRepository(client);
  if (process.env.NODE_ENV === "test") {
    if (!testAuditRepo) testAuditRepo = new InMemoryAuditRepository();
    return testAuditRepo;
  }
  if (!testAuditRepo) testAuditRepo = new InMemoryAuditRepository();
  return testAuditRepo;
}

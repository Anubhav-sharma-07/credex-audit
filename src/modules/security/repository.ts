import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkspaceRole } from "@/modules/workspace/types";

export type AuditAction =
  | "role_change"
  | "subscription_create"
  | "subscription_delete"
  | "csv_import"
  | "csv_rollback"
  | "data_export"
  | "workspace_delete"
  | "token_revoke"
  | "lead_capture";

export interface AuditLogEntry {
  id: string;
  workspaceId: string;
  actorId: string;
  actorEmail: string;
  action: AuditAction;
  targetId?: string;
  ipAddress: string;
  userAgent: string;
  metadata: Record<string, unknown>;
  timestamp: string;
}

export interface AuditLogRepository {
  record(entry: Omit<AuditLogEntry, "id" | "timestamp">): Promise<AuditLogEntry>;
  list(
    workspaceId: string,
    callerRole: WorkspaceRole,
    options?: { action?: AuditAction; limit?: number }
  ): Promise<AuditLogEntry[]>;
}

interface AuditLogRow {
  id: string;
  workspace_id: string;
  actor_id: string;
  actor_email: string;
  action: string;
  target_id: string | null;
  ip_address: string;
  user_agent: string;
  metadata: Record<string, unknown> | null;
  timestamp: string;
}

function mapRowToLog(row: AuditLogRow): AuditLogEntry {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    actorId: row.actor_id,
    actorEmail: row.actor_email,
    action: row.action as AuditAction,
    targetId: row.target_id || undefined,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    metadata: row.metadata || {},
    timestamp: row.timestamp,
  };
}

export class SupabaseAuditLogRepository implements AuditLogRepository {
  constructor(private supabase: SupabaseClient) {}

  async record(entry: Omit<AuditLogEntry, "id" | "timestamp">): Promise<AuditLogEntry> {
    const payload = {
      workspace_id: entry.workspaceId,
      actor_id: entry.actorId,
      actor_email: entry.actorEmail,
      action: entry.action,
      target_id: entry.targetId || null,
      ip_address: entry.ipAddress,
      user_agent: entry.userAgent,
      metadata: entry.metadata || {},
    };

    const { data, error } = await this.supabase
      .from("audit_logs")
      .insert(payload)
      .select()
      .single();

    if (error || !data) {
      // In dev or when logging from middleware before DB is connected
      console.warn(`[AUDIT_LOG_FALLBACK] Failed to insert into DB: ${error?.message}`);
      return {
        ...entry,
        id: `log_${Date.now()}`,
        timestamp: new Date().toISOString(),
      };
    }

    return mapRowToLog(data as AuditLogRow);
  }

  async list(
    workspaceId: string,
    callerRole: WorkspaceRole,
    options?: { action?: AuditAction; limit?: number }
  ): Promise<AuditLogEntry[]> {
    if (callerRole !== "owner" && callerRole !== "admin") {
      throw new Error("Permission denied: Audit logs are restricted to workspace admins and owners.");
    }

    let query = this.supabase
      .from("audit_logs")
      .select("*")
      .eq("workspace_id", workspaceId);

    if (options?.action) {
      query = query.eq("action", options.action);
    }

    const limit = Math.min(100, Math.max(1, options?.limit || 50));
    query = query.order("timestamp", { ascending: false }).limit(limit);

    const { data, error } = await query;
    if (error || !data) return [];

    return (data as AuditLogRow[]).map(mapRowToLog);
  }
}

export class InMemoryAuditLogRepository implements AuditLogRepository {
  private logs: AuditLogEntry[] = [];

  clear() {
    this.logs.length = 0;
  }

  async record(entry: Omit<AuditLogEntry, "id" | "timestamp">): Promise<AuditLogEntry> {
    const created: AuditLogEntry = {
      ...entry,
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
    };
    this.logs.unshift(created);
    console.info(
      `[AUDIT_LOG] [${created.workspaceId}] ${created.action} by ${created.actorEmail} on target ${created.targetId || "none"}`
    );
    return created;
  }

  async list(
    workspaceId: string,
    callerRole: WorkspaceRole,
    options?: { action?: AuditAction; limit?: number }
  ): Promise<AuditLogEntry[]> {
    if (callerRole !== "owner" && callerRole !== "admin") {
      throw new Error("Permission denied: Audit logs are restricted to workspace admins and owners.");
    }

    let filtered = this.logs.filter((l) => l.workspaceId === workspaceId);
    if (options?.action) {
      filtered = filtered.filter((l) => l.action === options.action);
    }
    const limit = options?.limit || 50;
    return filtered.slice(0, limit);
  }
}

let testAuditLogRepo: InMemoryAuditLogRepository | null = null;

export function setTestAuditLogRepository(repo: InMemoryAuditLogRepository | null) {
  testAuditLogRepo = repo;
}

export function getAuditLogRepository(client?: SupabaseClient): AuditLogRepository {
  if (testAuditLogRepo) {
    return testAuditLogRepo;
  }
  if (client) {
    return new SupabaseAuditLogRepository(client);
  }
  if (process.env.NODE_ENV === "test") {
    if (!testAuditLogRepo) {
      testAuditLogRepo = new InMemoryAuditLogRepository();
    }
    return testAuditLogRepo;
  }
  // If in production/server runtime without explicit client passed, use fallback in-memory or throw
  if (!testAuditLogRepo) {
    testAuditLogRepo = new InMemoryAuditLogRepository();
  }
  return testAuditLogRepo;
}

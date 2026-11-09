import type { WorkspaceRole } from "@/modules/workspace/types";

function generateLogId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `log_${crypto.randomUUID()}`;
  }
  return `log_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

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

// In-memory store (backed by Postgres audit_logs table in production)
const auditLogsStore: AuditLogEntry[] = [
  {
    id: "log_init_001",
    workspaceId: "ws_default",
    actorId: "usr_lead_dev",
    actorEmail: "admin@spendlens.demo",
    action: "csv_import",
    targetId: "imp_batch_initial",
    ipAddress: "192.168.1.10",
    userAgent: "Mozilla/5.0 SpendLens/1.0",
    metadata: { importedCount: 8, source: "q2_seed_subscriptions.csv" },
    timestamp: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
  },
  {
    id: "log_init_002",
    workspaceId: "ws_default",
    actorId: "usr_lead_dev",
    actorEmail: "admin@spendlens.demo",
    action: "role_change",
    targetId: "usr_dev_02",
    ipAddress: "192.168.1.10",
    userAgent: "Mozilla/5.0 SpendLens/1.0",
    metadata: { previousRole: "member", newRole: "admin", reason: "Billing lead delegate" },
    timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
];

/**
 * Records an immutable audit log entry for sensitive operations.
 */
export async function recordAuditLog(
  entry: Omit<AuditLogEntry, "id" | "timestamp">
): Promise<AuditLogEntry> {
  const newLog: AuditLogEntry = {
    ...entry,
    id: generateLogId(),
    timestamp: new Date().toISOString(),
  };

  auditLogsStore.unshift(newLog);
  console.info(`[AUDIT_LOG] [${newLog.workspaceId}] ${newLog.action} by ${newLog.actorEmail} on target ${newLog.targetId || "none"}`);
  return newLog;
}

/**
 * Lists audit log entries for a workspace.
 * Strict RBAC enforcement: Only 'owner' and 'admin' roles can access audit logs.
 */
export async function listAuditLogs(
  workspaceId: string,
  callerRole: WorkspaceRole,
  options: {
    action?: AuditAction;
    limit?: number;
  } = {}
): Promise<AuditLogEntry[]> {
  if (callerRole !== "owner" && callerRole !== "admin") {
    throw new Error("Permission denied: Audit logs are restricted to workspace admins and owners.");
  }

  let logs = auditLogsStore.filter((l) => l.workspaceId === workspaceId);

  if (options.action) {
    logs = logs.filter((l) => l.action === options.action);
  }

  const limit = options.limit || 50;
  return logs.slice(0, limit);
}

/**
 * Helper to purge or reset audit logs in test suites.
 */
export function resetAuditLogs(): void {
  auditLogsStore.length = 0;
}


import type { WorkspaceRole } from "@/modules/workspace/types";
import {
  type AuditAction,
  type AuditLogEntry,
  getAuditLogRepository,
} from "./repository";
import type { SupabaseClient } from "@supabase/supabase-js";

export type { AuditAction, AuditLogEntry };

/**
 * Records an immutable audit log entry for sensitive operations.
 */
export async function recordAuditLog(
  entry: Omit<AuditLogEntry, "id" | "timestamp">,
  client?: SupabaseClient
): Promise<AuditLogEntry> {
  const repo = getAuditLogRepository(client);
  return repo.record(entry);
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
  } = {},
  client?: SupabaseClient
): Promise<AuditLogEntry[]> {
  const repo = getAuditLogRepository(client);
  return repo.list(workspaceId, callerRole, options);
}

/**
 * Helper to purge or reset audit logs in test suites.
 */
export function resetAuditLogs(): void {
  const repo = getAuditLogRepository();
  if ("clear" in repo && typeof (repo as { clear: () => void }).clear === "function") {
    (repo as { clear: () => void }).clear();
  }
}

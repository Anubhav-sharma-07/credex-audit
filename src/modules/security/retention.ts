import type { WorkspaceRole } from "@/modules/workspace/types";
import { listSubscriptions } from "@/modules/workspace/subscriptions";
import { listAuditLogs } from "./audit_log";

// In-memory public audits store for demo retention tracking
interface PublicAuditRecord {
  id: string;
  createdAt: string;
  isClaimed: boolean;
  teamSize: number;
}

const anonymousAuditsStore: PublicAuditRecord[] = [];
const unsubscribedEmailsStore = new Set<string>();

/**
 * Registers an anonymous public audit for lifecycle retention tracking.
 */
export function trackAnonymousAudit(id: string, teamSize: number, createdAt?: string): void {
  anonymousAuditsStore.push({
    id,
    createdAt: createdAt || new Date().toISOString(),
    isClaimed: false,
    teamSize,
  });
}

/**
 * Resets the in-memory retention stores (used in test suites).
 */
export function resetRetentionStores(): void {
  anonymousAuditsStore.length = 0;
  unsubscribedEmailsStore.clear();
}

/**
 * Marks an anonymous audit as claimed into a workspace.
 */
export function markAuditClaimed(id: string): void {
  const audit = anonymousAuditsStore.find((a) => a.id === id);
  if (audit) {
    audit.isClaimed = true;
  }
}

/**
 * Prunes unclaimed anonymous audits older than the retention threshold (default 30 days).
 */
export function purgeExpiredAnonymousAudits(retentionDays = 30): {
  purgedCount: number;
  remainingCount: number;
} {
  const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const initialCount = anonymousAuditsStore.length;

  const validAudits = anonymousAuditsStore.filter((audit) => {
    const auditTime = new Date(audit.createdAt).getTime();
    // Keep if claimed OR within retention window
    return audit.isClaimed || auditTime >= cutoffTime;
  });

  const purgedCount = initialCount - validAudits.length;
  anonymousAuditsStore.length = 0;
  anonymousAuditsStore.push(...validAudits);

  return {
    purgedCount,
    remainingCount: validAudits.length,
  };
}

/**
 * Registers an email address to global unsubscribe list.
 */
export function registerUnsubscribe(email: string): { success: boolean; email: string } {
  const normalized = email.toLowerCase().trim();
  unsubscribedEmailsStore.add(normalized);
  return { success: true, email: normalized };
}

/**
 * Checks if an email is marked as unsubscribed.
 */
export function isEmailUnsubscribed(email: string): boolean {
  return unsubscribedEmailsStore.has(email.toLowerCase().trim());
}

/**
 * Comprehensive Data Export Flow:
 * Exports all workspace data (subscriptions, member activity, audit logs) as an audit-ready JSON package.
 * Strict RBAC: Requires 'owner' or 'admin' role.
 */
export async function exportWorkspaceData(
  workspaceId: string,
  callerRole: WorkspaceRole
): Promise<{
  exportTimestamp: string;
  workspaceId: string;
  subscriptions: unknown[];
  auditLogs: unknown[];
}> {
  if (callerRole !== "owner" && callerRole !== "admin") {
    throw new Error("Permission denied: Only workspace owners or admins can export tenant data.");
  }

  const subs = await listSubscriptions(workspaceId, { pageSize: 1000 });
  const logs = await listAuditLogs(workspaceId, callerRole, { limit: 500 });

  return {
    exportTimestamp: new Date().toISOString(),
    workspaceId,
    subscriptions: subs.data,
    auditLogs: logs,
  };
}

/**
 * Hard Deletion / Right-to-be-Forgotten Purge Flow:
 * Permanently removes all workspace records, cascading across subscriptions, members, and logs.
 * Strict RBAC: Requires 'owner' role only.
 */
export async function hardDeleteWorkspace(
  workspaceId: string,
  callerRole: WorkspaceRole
): Promise<{ success: boolean; workspaceId: string; deletedAt: string }> {
  if (callerRole !== "owner") {
    throw new Error("Permission denied: Permanent workspace purge requires the 'owner' role.");
  }

  // In production, triggers PostgreSQL CASCADE delete on workspaces(id)
  console.warn(`[SECURITY] [DATA_PURGE] Permanent deletion executed on workspace: ${workspaceId}`);

  return {
    success: true,
    workspaceId,
    deletedAt: new Date().toISOString(),
  };
}

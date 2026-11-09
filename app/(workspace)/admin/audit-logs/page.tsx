"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Filter,
} from "lucide-react";
import { listAuditLogs, type AuditLogEntry, type AuditAction } from "@/modules/security/audit_log";

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<AuditAction | "all">("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        // Current caller is owner/admin
        const data = await listAuditLogs("ws_default", "owner", {
          action: actionFilter === "all" ? undefined : actionFilter,
        });
        setLogs(data);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load audit logs";
        setError(msg);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [actionFilter]);

  function getActionBadge(action: AuditAction) {
    switch (action) {
      case "role_change":
        return "bg-warning-surface text-warning border-warning-border";
      case "subscription_delete":
      case "workspace_delete":
        return "bg-danger-surface text-danger border-danger-border";
      case "csv_import":
      case "subscription_create":
        return "bg-savings-surface text-savings border-savings-border";
      case "data_export":
      case "csv_rollback":
        return "bg-info-surface text-info border-info-border";
      default:
        return "bg-canvas-subtle text-ink-muted border-border";
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/team"
              className="text-xs text-ink-muted hover:text-ink inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>Admin</span>
            </Link>
            <span className="text-xs text-ink-subtle">•</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-action-text bg-canvas-subtle border border-border px-2 py-0.5 rounded-xs">
              Immutable Security Ledger
            </span>
          </div>
          <h1 className="text-xl font-bold text-ink tracking-tight font-serif mt-1">
            System Security Audit Logs
          </h1>
          <p className="text-xs text-ink-muted">
            Tamper-evident record of all sensitive operations, role elevations, data exports, and deletions.
          </p>
        </div>

        {/* Action Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-ink-subtle" strokeWidth={1.75} />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value as AuditAction | "all")}
            className="text-xs border border-border rounded-xs px-2.5 py-1.5 bg-surface text-ink focus-visible:outline-2 focus-visible:outline-ink min-h-[36px]"
            aria-label="Filter by audit action"
          >
            <option value="all">All Actions</option>
            <option value="role_change">Role Changes</option>
            <option value="subscription_create">Subscription Added</option>
            <option value="subscription_delete">Subscription Deleted</option>
            <option value="csv_import">CSV Imports</option>
            <option value="csv_rollback">CSV Rollbacks</option>
            <option value="data_export">Data Exports</option>
            <option value="workspace_delete">Workspace Purges</option>
          </select>
        </div>
      </div>

      {error && (
        <div role="alert" className="p-3.5 bg-danger-surface border border-danger-border rounded-xs text-xs text-danger">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-xs text-ink-muted bg-surface border border-border rounded-sm">
          Loading audit entries…
        </div>
      ) : logs.length === 0 ? (
        <div className="p-8 text-center text-xs text-ink-muted bg-surface border border-border rounded-sm">
          No audit log entries matching this filter.
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-sm shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-canvas-subtle text-ink-muted font-semibold border-b border-border">
                <tr>
                  <th className="py-2.5 px-3 text-[11px]">Timestamp</th>
                  <th className="py-2.5 px-3 text-[11px]">Action</th>
                  <th className="py-2.5 px-3 text-[11px]">Actor</th>
                  <th className="py-2.5 px-3 text-[11px]">Target ID</th>
                  <th className="py-2.5 px-3 text-[11px]">Origin IP</th>
                  <th className="py-2.5 px-3 text-[11px]">Metadata Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-canvas-subtle/50">
                    <td className="py-2.5 px-3 text-ink-muted font-mono text-[11px] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-xs border ${getActionBadge(log.action)}`}>
                        {log.action.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-ink">
                      {log.actorEmail}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-ink-subtle text-[11px]">
                      {log.targetId || "—"}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-ink-muted text-[11px]">
                      {log.ipAddress}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-ink-subtle text-[10px] max-w-xs truncate">
                      {JSON.stringify(log.metadata)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Edit2, Trash2, ShieldCheck, History, Calendar, Mail, FileText } from "lucide-react";
import type { Subscription, PriceHistoryEntry, DecisionStatus, WorkspaceRole } from "@/modules/workspace/types";
import { updateSubscription, deleteSubscription } from "@/modules/workspace/subscriptions";
import { formatMinorToUsd } from "@/modules/audit/money";
import SubscriptionSheet from "@/components/workspace/SubscriptionSheet";

interface SubscriptionDetailClientProps {
  initialSubscription: Subscription;
  initialHistory?: PriceHistoryEntry[];
  workspaceId: string;
  userRole: WorkspaceRole;
}

export default function SubscriptionDetailClient({
  initialSubscription,
  initialHistory = [],
  workspaceId,
  userRole,
}: SubscriptionDetailClientProps) {
  const router = useRouter();
  const [sub, setSub] = useState<Subscription>(initialSubscription);
  const [history] = useState<PriceHistoryEntry[]>(initialHistory);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const isReadOnly = userRole === "viewer";
  const canDelete = userRole === "owner" || userRole === "admin";

  async function handleDecisionChange(decisionStatus: DecisionStatus) {
    if (isReadOnly) return;
    const updated = await updateSubscription(workspaceId, sub.id, { decisionStatus });
    setSub(updated);
  }

  async function handleDelete() {
    if (!canDelete || !confirm(`Are you sure you want to delete ${sub.vendorName}?`)) return;
    await deleteSubscription(workspaceId, sub.id);
    router.push("/subscriptions");
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/subscriptions"
          className="flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink min-h-[36px]"
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
          Back to Subscriptions
        </Link>

        {!isReadOnly && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-xs text-xs font-semibold text-ink bg-surface hover:bg-canvas-subtle min-h-[36px] cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 text-ink-muted" strokeWidth={1.75} />
              Edit
            </button>
            {canDelete && (
              <button
                onClick={handleDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-danger-border rounded-xs text-xs font-semibold text-danger hover:bg-danger-surface min-h-[36px] cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                Delete
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Card */}
      <div className="bg-surface p-6 rounded-sm border border-border shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-ink">{sub.vendorName}</h1>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-xs border bg-savings-surface text-savings border-savings-border">
                {sub.status.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-ink-muted mt-1">
              {sub.planName} Plan · {sub.category.replace(/_/g, " ")}
            </p>
          </div>

          <div className="text-right">
            <p className="text-2xl font-bold text-ink tabular-nums">{formatMinorToUsd(sub.costMinor)}</p>
            <p className="text-[11px] text-ink-muted">
              per {sub.billingFrequency === "annual" ? "year (annualized)" : "month"} · {sub.seats} {sub.seats === 1 ? "seat" : "seats"}
            </p>
          </div>
        </div>

        {/* Decision & Action Bar */}
        <div className="bg-canvas p-4 rounded-xs border border-border-subtle flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider">Renewal Decision</p>
            <p className="text-xs text-ink font-medium capitalize mt-0.5">
              Current status: <span className="font-bold">{sub.decisionStatus}</span>
            </p>
          </div>

          {!isReadOnly && (
            <div className="flex items-center gap-2">
              {(["keep", "review", "cancel"] as DecisionStatus[]).map((st) => (
                <button
                  key={st}
                  onClick={() => handleDecisionChange(st)}
                  className={`px-3 py-1.5 rounded-xs text-xs font-semibold capitalize transition-standard min-h-[36px] cursor-pointer ${
                    sub.decisionStatus === st
                      ? st === "keep"
                        ? "bg-savings-surface text-savings border border-savings-border"
                        : st === "cancel"
                        ? "bg-danger-surface text-danger border border-danger-border"
                        : "bg-warning-surface text-warning border border-warning-border"
                      : "bg-surface text-ink border border-border hover:bg-canvas-subtle"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Metadata Details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-xs border border-border-subtle bg-canvas flex items-start gap-3">
            <Calendar className="w-4 h-4 text-ink-subtle mt-0.5" strokeWidth={1.75} />
            <div>
              <p className="text-[10px] text-ink-muted uppercase">Renewal Date</p>
              <p className="font-semibold text-ink mt-0.5">{sub.renewalDate || "Not scheduled"}</p>
            </div>
          </div>

          <div className="p-3.5 rounded-xs border border-border-subtle bg-canvas flex items-start gap-3">
            <Mail className="w-4 h-4 text-ink-subtle mt-0.5" strokeWidth={1.75} />
            <div>
              <p className="text-[10px] text-ink-muted uppercase">Owner</p>
              <p className="font-semibold text-ink mt-0.5">{sub.ownerEmail || "Unassigned"}</p>
            </div>
          </div>

          <div className="p-3.5 rounded-xs border border-border-subtle bg-canvas flex items-start gap-3">
            <ShieldCheck className="w-4 h-4 text-ink-subtle mt-0.5" strokeWidth={1.75} />
            <div>
              <p className="text-[10px] text-ink-muted uppercase">Billing Cycle</p>
              <p className="font-semibold text-ink mt-0.5 capitalize">{sub.billingFrequency}</p>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <h2 className="text-xs font-bold text-ink flex items-center gap-2 mb-2 uppercase tracking-wider">
            <FileText className="w-3.5 h-3.5 text-ink-muted" strokeWidth={1.75} />
            Internal Notes
          </h2>
          <p className="text-xs text-ink-muted bg-canvas p-3.5 rounded-xs border border-border-subtle leading-relaxed">
            {sub.notes || "No internal notes recorded for this subscription."}
          </p>
        </div>

        {/* Price History */}
        <div>
          <h2 className="text-xs font-bold text-ink flex items-center gap-2 mb-2.5 uppercase tracking-wider">
            <History className="w-3.5 h-3.5 text-ink-muted" strokeWidth={1.75} />
            Price History Audit Trail
          </h2>
          {history.length === 0 ? (
            <p className="text-xs text-ink-muted italic">No price adjustments recorded yet.</p>
          ) : (
            <ul className="divide-y divide-border-subtle border border-border rounded-xs overflow-hidden text-xs">
              {history.map((h) => (
                <li key={h.id} className="p-3 flex items-center justify-between bg-surface">
                  <div>
                    <p className="font-semibold text-ink">{formatMinorToUsd(h.costMinor)}</p>
                    <p className="text-[11px] text-ink-muted">{h.reason}</p>
                  </div>
                  <span className="text-[11px] text-ink-muted">{h.effectiveDate}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {!isReadOnly && (
        <SubscriptionSheet
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          onSuccess={() => router.refresh()}
          subscriptionToEdit={sub}
          workspaceId={workspaceId}
        />
      )}
    </div>
  );
}

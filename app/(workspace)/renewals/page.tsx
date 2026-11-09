"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
} from "lucide-react";
import type { Subscription, DecisionStatus } from "@/modules/workspace/types";
import { getRenewalsSchedule, updateSubscription } from "@/modules/workspace/subscriptions";
import { formatCurrency, formatRelativeDays } from "@/lib/formatters";
import EmptyState from "@/components/workspace/EmptyState";
import { TableSkeleton } from "@/components/workspace/Skeletons";

const WORKSPACE_ID = "ws_default_demo";

export default function RenewalsPage() {
  const [renewals, setRenewals] = useState<Subscription[]>([]);
  const [daysWindow, setDaysWindow] = useState<number>(30);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [loading, setLoading] = useState(true);

  const loadRenewals = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getRenewalsSchedule(WORKSPACE_ID, daysWindow);
      setRenewals(data);
    } finally {
      setLoading(false);
    }
  }, [daysWindow]);

  useEffect(() => {
    loadRenewals();
  }, [loadRenewals]);

  async function handleDecision(id: string, decisionStatus: DecisionStatus) {
    await updateSubscription(WORKSPACE_ID, id, { decisionStatus });
    await loadRenewals();
  }

  function getDaysRemaining(renewalDate: string): number {
    const ren = new Date(renewalDate).getTime();
    const now = new Date().getTime();
    return Math.max(0, Math.ceil((ren - now) / (1000 * 60 * 60 * 24)));
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Horizon Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-bold text-ink tracking-tight font-serif">Contract Renewals</h1>
          <p className="text-xs text-ink-muted">
            Track renewal commitments, review seat utilization, and record cancellation notice decisions.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* 7 / 30 / 90-day filters */}
          <div className="inline-flex rounded-xs border border-border bg-surface p-0.5">
            {[7, 30, 90].map((days) => (
              <button
                key={days}
                onClick={() => setDaysWindow(days)}
                className={`px-3 py-1.5 rounded-xs text-xs font-semibold transition-standard min-h-[36px] cursor-pointer ${
                  daysWindow === days
                    ? "bg-ink text-canvas"
                    : "text-ink-muted hover:text-ink hover:bg-canvas-subtle"
                }`}
                aria-pressed={daysWindow === days}
              >
                {days} Days
              </button>
            ))}
          </div>

          {/* List vs Calendar toggle */}
          <div className="inline-flex rounded-xs border border-border bg-surface p-0.5">
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 rounded-xs text-xs font-semibold transition-standard min-h-[36px] cursor-pointer ${
                viewMode === "list" ? "bg-ink text-canvas" : "text-ink-muted hover:text-ink hover:bg-canvas-subtle"
              }`}
              aria-pressed={viewMode === "list"}
            >
              List View
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`px-3 py-1.5 rounded-xs text-xs font-semibold transition-standard min-h-[36px] cursor-pointer ${
                viewMode === "calendar" ? "bg-ink text-canvas" : "text-ink-muted hover:text-ink hover:bg-canvas-subtle"
              }`}
              aria-pressed={viewMode === "calendar"}
            >
              Timeline
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-surface p-4 rounded-sm border border-border">
          <TableSkeleton rows={4} />
        </div>
      ) : renewals.length === 0 ? (
        <EmptyState
          title={`No renewals in the next ${daysWindow} days`}
          description="None of your active software subscriptions require contract renewal or cancellation notice in this time window."
          actionLabel="View All Subscriptions"
          actionHref="/subscriptions"
        />
      ) : viewMode === "list" ? (
        /* List View */
        <div className="bg-surface rounded-sm border border-border shadow-xs divide-y divide-border-subtle overflow-hidden">
          {renewals.map((r) => {
            const daysLeft = getDaysRemaining(r.renewalDate!);
            const annualAmount = r.costMinor * 12;

            return (
              <div key={r.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-10 h-10 rounded-xs flex flex-col items-center justify-center shrink-0 font-bold text-xs border ${
                      daysLeft <= 7
                        ? "bg-danger-surface text-danger border-danger-border"
                        : daysLeft <= 30
                        ? "bg-warning-surface text-warning border-warning-border"
                        : "bg-canvas-subtle text-ink border-border"
                    }`}
                  >
                    <span className="tabular-nums">{daysLeft}d</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-ink text-sm">
                        {r.vendorName}
                      </span>
                      <span className="text-xs text-ink-muted">({r.planName})</span>
                    </div>
                    <p className="text-xs text-ink-muted mt-0.5">
                      Renews: <strong className="text-ink">{r.renewalDate ? formatRelativeDays(r.renewalDate) : "TBD"}</strong> • {r.seats} seats • Owner: {r.ownerEmail || "Unassigned"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-5">
                  <div className="text-right">
                    <p className="font-bold text-ink text-xs tabular-nums">{formatCurrency(r.costMinor, "USD")}/mo</p>
                    <p className="text-[10px] text-ink-muted tabular-nums">{formatCurrency(annualAmount, "USD")}/yr commit</p>
                  </div>

                  {/* Decision Controls with 44px min touch target */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDecision(r.id, "keep")}
                      title="Decision: Keep Subscription"
                      aria-label={`Keep ${r.vendorName}`}
                      className={`min-h-[44px] min-w-[44px] rounded-xs border flex items-center justify-center transition-standard cursor-pointer ${
                        r.decisionStatus === "keep"
                          ? "bg-savings-surface text-savings border-savings-border"
                          : "text-ink-muted hover:text-savings border-border hover:bg-canvas-subtle"
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" strokeWidth={1.75} />
                    </button>
                    <button
                      onClick={() => handleDecision(r.id, "review")}
                      title="Decision: Flag for Review"
                      aria-label={`Flag ${r.vendorName} for review`}
                      className={`min-h-[44px] min-w-[44px] rounded-xs border flex items-center justify-center transition-standard cursor-pointer ${
                        r.decisionStatus === "review"
                          ? "bg-warning-surface text-warning border-warning-border"
                          : "text-ink-muted hover:text-warning border-border hover:bg-canvas-subtle"
                      }`}
                    >
                      <Clock className="w-4 h-4" strokeWidth={1.75} />
                    </button>
                    <button
                      onClick={() => handleDecision(r.id, "cancel")}
                      title="Decision: Mark to Cancel"
                      aria-label={`Mark ${r.vendorName} to cancel`}
                      className={`min-h-[44px] min-w-[44px] rounded-xs border flex items-center justify-center transition-standard cursor-pointer ${
                        r.decisionStatus === "cancel"
                          ? "bg-danger-surface text-danger border-danger-border"
                          : "text-ink-muted hover:text-danger border-border hover:bg-canvas-subtle"
                      }`}
                    >
                      <XCircle className="w-4 h-4" strokeWidth={1.75} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Timeline View */
        <div className="bg-surface p-5 rounded-sm border border-border shadow-xs space-y-3">
          <p className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
            Chronological Timeline ({daysWindow}-Day Horizon)
          </p>
          <div className="space-y-2.5">
            {renewals.map((r) => {
              const daysLeft = getDaysRemaining(r.renewalDate!);
              return (
                <div
                  key={r.id}
                  className="p-3.5 rounded-xs border border-border-subtle bg-canvas flex items-center justify-between hover:bg-canvas-subtle transition-standard"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className={`w-4 h-4 ${daysLeft <= 14 ? "text-warning" : "text-ink-subtle"}`} strokeWidth={1.75} />
                    <div>
                      <p className="text-xs font-bold text-ink">{r.vendorName} ({r.planName})</p>
                      <p className="text-[11px] text-ink-muted">
                        Due: {r.renewalDate} ({daysLeft} days away) • Status: <span className="uppercase font-semibold">{r.decisionStatus}</span>
                      </p>
                    </div>
                  </div>
                  <span className="font-bold text-xs text-ink tabular-nums">{formatCurrency(r.costMinor * 12, "USD")}/yr</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

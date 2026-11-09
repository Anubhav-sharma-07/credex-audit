"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  DollarSign,
  TrendingUp,
  Layers,
  Sparkles,
  Calendar,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Plus,
  UploadCloud,
  Clock,
} from "lucide-react";
import { getOverviewMetrics } from "@/modules/workspace/subscriptions";
import { formatCurrency, formatRelativeDays } from "@/lib/formatters";
import type { Finding } from "@/modules/audit/types";
import type { Subscription } from "@/modules/workspace/types";
import SpendBarChart from "@/components/workspace/SpendBarChart";
import { MetricCardSkeleton, ChartSkeleton } from "@/components/workspace/Skeletons";
import EmptyState from "@/components/workspace/EmptyState";

interface OverviewData {
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
    category: string;
    subscriptionCount: number;
    totalMonthlyCostMinor: number;
    primaryOwner: string | null;
  }>;
}

export default function OverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedFindings, setExpandedFindings] = useState<Record<string, boolean>>({});

  const loadData = useCallback(async () => {
    try {
      const res = await getOverviewMetrics("ws_default");
      setData(res as OverviewData);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load workspace overview metrics.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function toggleFinding(ruleId: string) {
    setExpandedFindings((prev) => ({
      ...prev,
      [ruleId]: !prev[ruleId],
    }));
  }

  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading workspace overview">
        <div className="h-7 w-48 bg-canvas-subtle rounded-xs animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <MetricCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ChartSkeleton />
          </div>
          <div className="h-64 bg-surface border border-border rounded-sm animate-pulse p-4" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-sm border border-danger-border bg-danger-surface p-6 text-center space-y-3"
      >
        <AlertCircle className="w-8 h-8 text-danger mx-auto" strokeWidth={1.75} />
        <h2 className="text-sm font-bold text-ink">Unable to Load Workspace Overview</h2>
        <p className="text-xs text-ink-muted max-w-md mx-auto">{error}</p>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-ink text-canvas rounded-xs text-xs font-semibold hover:bg-neutral-8 transition-standard min-h-[44px] cursor-pointer"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  if (!data || data.activeSubscriptions.count === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-ink tracking-tight font-serif">Spend Overview</h1>
          <p className="text-xs text-ink-muted">Executive summary of active software licenses and AI spend.</p>
        </div>

        <EmptyState
          title="No active subscriptions yet"
          description="Get started by adding your team's software subscriptions or importing from an existing billing export."
          actionLabel="Add Subscription"
          actionHref="/subscriptions"
          secondaryActionLabel="Import CSV"
          secondaryActionHref="/import"
        />
      </div>
    );
  }

  const totalMonthlySpend = data.monthlyRecurring.amountMinor;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-bold text-ink tracking-tight font-serif">Spend Overview</h1>
          <p className="text-xs text-ink-muted">
            Institutional financial metrics, renewal schedules, and verified savings opportunities.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            href="/import"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-surface border border-border text-ink text-xs font-semibold rounded-xs hover:bg-canvas-subtle transition-standard min-h-[44px]"
          >
            <UploadCloud className="w-3.5 h-3.5 text-ink-muted" strokeWidth={1.75} />
            <span>Import CSV</span>
          </Link>
          <Link
            href="/subscriptions"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-action-fill text-action-fill-foreground text-xs font-semibold rounded-xs hover:bg-action-fill-hover transition-standard min-h-[44px]"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>Add Subscription</span>
          </Link>
        </div>
      </div>

      {/* 4 Primary Metric Cards: each linking to detail view and showing its basis */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Monthly Recurring */}
        <Link
          href="/subscriptions"
          className="group block p-4 bg-surface border border-border rounded-sm shadow-sm hover:border-ink transition-standard focus-visible:outline-2 focus-visible:outline-ink"
        >
          <div className="flex items-center justify-between text-ink-muted mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Monthly Recurring</span>
            <DollarSign className="w-4 h-4 text-ink-muted group-hover:text-ink transition-standard" strokeWidth={1.75} />
          </div>
          <div className="text-2xl font-bold text-ink tracking-tight tabular-nums">
            {formatCurrency(data.monthlyRecurring.amountMinor, "USD")}
            <span className="text-xs font-normal text-ink-muted">/mo</span>
          </div>
          <p className="text-[11px] text-ink-muted mt-2.5 flex items-center justify-between border-t border-border-subtle pt-2">
            <span className="truncate">{data.monthlyRecurring.basis}</span>
            <ArrowRight className="w-3 h-3 text-ink-muted group-hover:translate-x-0.5 transition-transform shrink-0" strokeWidth={1.75} />
          </p>
        </Link>

        {/* 2. Annualised Run-Rate */}
        <Link
          href="/subscriptions"
          className="group block p-4 bg-surface border border-border rounded-sm shadow-sm hover:border-ink transition-standard focus-visible:outline-2 focus-visible:outline-ink"
        >
          <div className="flex items-center justify-between text-ink-muted mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Annualised Run-Rate</span>
            <TrendingUp className="w-4 h-4 text-ink-muted group-hover:text-ink transition-standard" strokeWidth={1.75} />
          </div>
          <div className="text-2xl font-bold text-ink tracking-tight tabular-nums">
            {formatCurrency(data.annualised.amountMinor, "USD")}
            <span className="text-xs font-normal text-ink-muted">/yr</span>
          </div>
          <p className="text-[11px] text-ink-muted mt-2.5 flex items-center justify-between border-t border-border-subtle pt-2">
            <span className="truncate">{data.annualised.basis}</span>
            <ArrowRight className="w-3 h-3 text-ink-muted group-hover:translate-x-0.5 transition-transform shrink-0" strokeWidth={1.75} />
          </p>
        </Link>

        {/* 3. Active Subscriptions */}
        <Link
          href="/subscriptions"
          className="group block p-4 bg-surface border border-border rounded-sm shadow-sm hover:border-ink transition-standard focus-visible:outline-2 focus-visible:outline-ink"
        >
          <div className="flex items-center justify-between text-ink-muted mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Active Subscriptions</span>
            <Layers className="w-4 h-4 text-ink-muted group-hover:text-ink transition-standard" strokeWidth={1.75} />
          </div>
          <div className="text-2xl font-bold text-ink tracking-tight tabular-nums">
            {data.activeSubscriptions.count}
            <span className="text-xs font-normal text-ink-muted"> plans</span>
          </div>
          <p className="text-[11px] text-ink-muted mt-2.5 flex items-center justify-between border-t border-border-subtle pt-2">
            <span className="truncate">{data.activeSubscriptions.basis}</span>
            <ArrowRight className="w-3 h-3 text-ink-muted group-hover:translate-x-0.5 transition-transform shrink-0" strokeWidth={1.75} />
          </p>
        </Link>

        {/* 4. Potential Savings */}
        <Link
          href="/insights"
          className="group block p-4 bg-surface border border-border rounded-sm shadow-sm hover:border-savings transition-standard focus-visible:outline-2 focus-visible:outline-ink"
        >
          <div className="flex items-center justify-between text-ink-muted mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-savings">Potential Savings</span>
            <Sparkles className="w-4 h-4 text-savings group-hover:scale-110 transition-transform" strokeWidth={1.75} />
          </div>
          <div className="text-2xl font-bold text-savings tracking-tight tabular-nums">
            {formatCurrency(data.potentialSavings.amountMinor, "USD")}
            <span className="text-xs font-normal text-ink-muted">/mo</span>
          </div>
          <p className="text-[11px] text-ink-muted mt-2.5 flex items-center justify-between border-t border-border-subtle pt-2">
            <span className="truncate">{data.potentialSavings.basis}</span>
            <ArrowRight className="w-3 h-3 text-savings group-hover:translate-x-0.5 transition-transform shrink-0" strokeWidth={1.75} />
          </p>
        </Link>
      </div>

      {/* Middle Section: Spend Breakdown & Top Vendors via CFO-grade SpendBarChart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SpendBarChart with direct labels, 0-baseline, accessible table fallback */}
        <div className="lg:col-span-2">
          <SpendBarChart
            title="Top Vendors by Monthly Spend"
            subtitle="Aggregated software expenditure across active engineering subscriptions"
            data={data.topVendors.map((v) => ({
              label: v.vendorName,
              amountMinor: v.totalMonthlyCostMinor,
              percentage: totalMonthlySpend > 0 ? (v.totalMonthlyCostMinor / totalMonthlySpend) * 100 : 0,
              category: v.category,
            }))}
            totalMinor={totalMonthlySpend}
            currency="USD"
            caption="Direct labels show monthly committed spend and portfolio share. Calculated from verified subscription records."
          />
        </div>

        {/* Upcoming Renewals in 30 Days */}
        <div className="bg-surface border border-border rounded-sm p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-border pb-3">
              <div>
                <h2 className="text-sm font-bold text-ink">Upcoming Renewals</h2>
                <p className="text-[11px] text-ink-muted">Contracts up for renewal within 30 days.</p>
              </div>
              <Link
                href="/renewals"
                className="text-xs font-semibold text-action-text hover:underline flex items-center gap-1 min-h-[32px]"
              >
                Schedule <ArrowRight className="w-3 h-3" strokeWidth={1.75} />
              </Link>
            </div>

            {data.upcomingRenewals.length === 0 ? (
              <div className="py-8 text-center text-xs text-ink-muted">
                <Calendar className="w-6 h-6 text-ink-subtle mx-auto mb-2" strokeWidth={1.75} />
                No renewals scheduled in the next 30 days.
              </div>
            ) : (
              <ul className="divide-y divide-border-subtle" role="list">
                {data.upcomingRenewals.slice(0, 4).map((sub) => (
                  <li key={sub.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-ink">{sub.vendorName}</p>
                      <p className="text-[11px] text-ink-muted flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-ink-subtle" strokeWidth={1.75} />
                        <span>{sub.renewalDate ? formatRelativeDays(sub.renewalDate) : "Date TBD"}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-ink tabular-nums">{formatCurrency(sub.costMinor, "USD")}</p>
                      <span
                        className={`inline-block text-[10px] font-semibold uppercase px-2 py-0.5 rounded-xs mt-0.5 ${
                          sub.decisionStatus === "keep"
                            ? "bg-savings-surface text-savings border border-savings-border"
                            : sub.decisionStatus === "cancel"
                            ? "bg-danger-surface text-danger border border-danger-border"
                            : "bg-warning-surface text-warning border border-warning-border"
                        }`}
                      >
                        {sub.decisionStatus}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-border-subtle">
            <Link
              href="/renewals"
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-ink bg-canvas border border-border rounded-xs hover:bg-canvas-subtle transition-standard min-h-[44px]"
            >
              Review all renewal decisions
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Section: Top Evidence-Backed Audit Findings */}
      <div className="bg-surface border border-border rounded-sm p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-ink">Top Verified Savings Opportunities</h2>
              <span className="text-[10px] font-bold uppercase bg-savings-surface text-savings border border-savings-border px-2 py-0.5 rounded-xs">
                Deterministic Engine
              </span>
            </div>
            <p className="text-[11px] text-ink-muted mt-0.5">
              Recommendations derived strictly from the official vendor pricing catalog.
            </p>
          </div>
          <Link
            href="/insights"
            className="text-xs font-semibold text-action-text hover:underline flex items-center gap-1 min-h-[32px]"
          >
            Ask AI Assistant <ArrowRight className="w-3 h-3" strokeWidth={1.75} />
          </Link>
        </div>

        {data.topFindings.length === 0 ? (
          <div className="p-6 text-center text-xs text-ink-muted bg-canvas rounded-xs border border-border">
            <ShieldCheck className="w-6 h-6 text-savings mx-auto mb-2" strokeWidth={1.75} />
            No wasteful spending detected. Your current subscriptions match optimal team allocations.
          </div>
        ) : (
          <div className="space-y-3">
            {data.topFindings.map((finding) => {
              const isExpanded = expandedFindings[finding.ruleId];
              const isConfirmed = finding.confidence === "confirmed";

              return (
                <div
                  key={finding.ruleId}
                  className="border border-border rounded-xs p-3.5 bg-canvas/40 hover:bg-canvas transition-standard"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono font-bold text-ink-muted bg-canvas-subtle border border-border px-1.5 py-0.5 rounded-xs">
                          {finding.ruleId}
                        </span>
                        <span className="font-semibold text-xs text-ink capitalize">
                          {finding.toolId.replace(/_/g, " ")}: {finding.kind.replace(/_/g, " ")}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-xs border ${
                            isConfirmed
                              ? "bg-savings-surface text-savings border-savings-border"
                              : "bg-warning-surface text-warning border-warning-border"
                          }`}
                        >
                          {finding.confidence}
                        </span>
                      </div>
                      <p className="text-xs text-ink-muted">
                        Current: <span className="font-semibold text-ink tabular-nums">{formatCurrency(finding.currentMonthlyMinor, "USD")}</span>
                        {"  "}• Projected:{" "}
                        <span className="font-semibold text-ink tabular-nums">{formatCurrency(finding.projectedMonthlyMinor, "USD")}</span>
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <div className="text-right">
                        <span className="text-[10px] text-ink-muted block uppercase">Savings</span>
                        <span className="text-sm font-bold text-savings tabular-nums">
                          +{formatCurrency(finding.savingsMinor, "USD")}/mo
                        </span>
                      </div>

                      <button
                        onClick={() => toggleFinding(finding.ruleId)}
                        className="p-1.5 text-ink-muted hover:text-ink rounded-xs hover:bg-canvas-subtle transition-standard min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                        aria-label="Toggle finding details"
                        aria-expanded={isExpanded}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" strokeWidth={1.75} /> : <ChevronDown className="w-4 h-4" strokeWidth={1.75} />}
                      </button>
                    </div>
                  </div>

                  {/* Accordion content */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-border-subtle text-xs space-y-2">
                      <div>
                        <span className="font-semibold text-ink">Evidence:</span>
                        <ul className="list-disc list-inside text-ink-muted mt-0.5 space-y-0.5">
                          {finding.evidence.map((ev, i) => (
                            <li key={i}>{ev}</li>
                          ))}
                        </ul>
                      </div>

                      {finding.assumptions.length > 0 && (
                        <div>
                          <span className="font-semibold text-ink">Assumptions:</span>
                          <ul className="list-disc list-inside text-ink-muted mt-0.5 space-y-0.5">
                            {finding.assumptions.map((as, i) => (
                              <li key={i}>{as}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="pt-1 flex flex-col sm:flex-row sm:items-center sm:justify-between text-[11px] text-ink-muted gap-1">
                        <span>Pricing verified: {finding.pricingSource.verifiedAt}</span>
                        <a
                          href={finding.pricingSource.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-action-text hover:underline"
                        >
                          Source documentation <ExternalLink className="w-3 h-3" strokeWidth={1.75} />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

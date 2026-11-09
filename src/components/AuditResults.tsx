"use client";

import { useEffect, useState } from "react";
import type { AuditResult } from "@/types";
import { PLAN_LABELS, TOOL_LABELS } from "@/lib/pricing";
import LeadCapture from "./LeadCapture";
import {
  TrendingDown,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  FolderPlus,
} from "lucide-react";

function formatUsd(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n);
}

interface AuditResultsProps {
  result: AuditResult;
  onStartOver: () => void;
}

/** Shape expected by `/api/summary` and `/api/audit` tool payloads */
function toolsPayload(result: AuditResult) {
  return result.toolResults.map((row) => ({
    tool: row.tool,
    plan: row.plan,
    monthlySpend: row.currentMonthlySpend,
  }));
}

export default function AuditResults({ result, onStartOver }: AuditResultsProps) {
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [auditId, setAuditId] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [auditLoading, setAuditLoading] = useState(true);
  const [persistError, setPersistError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const tools = toolsPayload(result);
    const savingsBody = {
      teamSize: result.teamSize,
      useCase: result.useCase,
      totalMonthlySpend: result.totalMonthlySpend,
      totalMonthlySavings: result.totalMonthlySavings,
      totalAnnualSavings: result.totalAnnualSavings,
      tools,
    };

    async function run() {
      setSummaryLoading(true);
      setAuditLoading(true);
      setPersistError(null);
      setAiSummary(null);
      setAuditId(null);

      let summaryText = "";

      try {
        const summaryRes = await fetch("/api/summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(savingsBody),
        });
        const summaryJson = (await summaryRes.json()) as { summary?: string };
        summaryText = summaryJson.summary ?? "";
      } catch {
        summaryText =
          "Your deterministic audit is complete. Review recommendations below for ways to eliminate seat overlaps and optimize commitment terms.";
      }

      if (cancelled) return;
      setAiSummary(summaryText);
      setSummaryLoading(false);

      try {
        const auditRes = await fetch("/api/audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...savingsBody,
            aiSummary: summaryText,
          }),
        });

        if (!auditRes.ok) {
          throw new Error("persist_failed");
        }

        const auditJson = (await auditRes.json()) as { id?: string; error?: string };
        if (cancelled) return;

        if (auditJson.id) {
          setAuditId(auditJson.id);
        } else {
          setPersistError("Unable to persist audit session.");
        }
      } catch {
        if (!cancelled) {
          setPersistError("Unable to persist audit session.");
        }
      } finally {
        if (!cancelled) {
          setAuditLoading(false);
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [result]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* 1) Hero savings: Calm, institutional banner */}
      <div className="rounded-sm border border-savings-border bg-savings-surface p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-savings" strokeWidth={1.75} />
            <span className="text-xs font-bold uppercase tracking-wider text-savings">
              Identified Monthly Reductions
            </span>
          </div>
          <span className="text-xs text-ink-muted">
            Team of {result.teamSize} • Verified Rules
          </span>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl sm:text-4xl font-bold tracking-tight text-ink tabular-nums">
            {formatUsd(result.totalMonthlySavings)}
          </span>
          <span className="text-xs font-medium text-ink-muted">/ month recurring</span>
        </div>

        <div className="mt-4 pt-3 border-t border-savings-border/60 flex items-center justify-between text-xs">
          <span className="text-ink-muted">Annualised Run-Rate Impact:</span>
          <span className="font-bold text-savings tabular-nums">
            {formatUsd(result.totalAnnualSavings)} / yr
          </span>
        </div>
      </div>

      {/* 2) Structured Findings Summary */}
      <div className="rounded-sm border border-border bg-surface p-6 shadow-sm space-y-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-ink-muted" strokeWidth={1.75} />
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink">
            Spend Intelligence Summary
          </h2>
        </div>

        {summaryLoading ? (
          <div className="space-y-2 pt-2" aria-busy="true">
            <div className="h-4 w-full animate-pulse rounded-xs bg-canvas-subtle" />
            <div className="h-4 w-[90%] animate-pulse rounded-xs bg-canvas-subtle" />
            <div className="h-4 w-[75%] animate-pulse rounded-xs bg-canvas-subtle" />
          </div>
        ) : (
          <p className="text-xs text-ink-muted leading-relaxed pt-1">
            {aiSummary ??
              "Deterministic rules have verified seat counts and pricing against current vendor lists. Review recommendations below."}
          </p>
        )}
      </div>

      {/* 3) Per-tool cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink">Recommendations by Tool</h2>
          <span className="text-xs text-ink-muted">
            {result.toolResults.length} audited tools
          </span>
        </div>

        <ul className="space-y-3" role="list">
          {result.toolResults.map((row) => (
            <li
              key={row.tool}
              className="rounded-sm border border-border bg-surface p-4 shadow-sm space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border-subtle pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xs bg-canvas-subtle border border-border flex items-center justify-center font-bold text-xs text-ink">
                    {TOOL_LABELS[row.tool]?.charAt(0) || "T"}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-ink">{TOOL_LABELS[row.tool]}</h3>
                    <p className="text-xs text-ink-muted">
                      Plan: {PLAN_LABELS[row.plan] ?? row.plan}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-right text-xs">
                  <div>
                    <span className="text-[10px] text-ink-muted block uppercase">Current</span>
                    <span className="font-semibold text-ink tabular-nums">
                      {formatUsd(row.currentMonthlySpend)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-ink-muted block uppercase">Projected</span>
                    <span className="font-semibold text-ink tabular-nums">
                      {formatUsd(row.projectedMonthlyCost)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-savings block uppercase">Savings</span>
                    <span className="font-bold text-savings tabular-nums">
                      {formatUsd(row.monthlySavings)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-xs text-ink-muted leading-relaxed">
                {row.reason}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* 4) Save this to a workspace (Conversion CTA) */}
      <div className="rounded-sm border border-border bg-surface p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-action-text" strokeWidth={1.75} />
              <h3 className="text-sm font-bold text-ink">Save this audit to a workspace</h3>
            </div>
            <p className="text-xs text-ink-muted max-w-md">
              Convert these audited tools into real tracked subscriptions. Monitor contract renewal dates, manage team seat allocations, and automate vendor invoice reconciliation.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              try {
                localStorage.setItem(
                  "spendlens_pending_audit",
                  JSON.stringify({
                    auditId,
                    teamSize: result.teamSize,
                    useCase: result.useCase,
                    toolResults: result.toolResults,
                    totalMonthlySpend: result.totalMonthlySpend,
                  })
                );
              } catch {
                // Ignore storage error
              }
              window.location.href = `/signup?claim_audit=true${auditId ? `&audit_id=${auditId}` : ""}`;
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-action-fill text-action-fill-foreground font-semibold rounded-xs text-xs min-h-[44px] hover:bg-action-fill-hover transition-standard shrink-0 cursor-pointer"
          >
            <span>Save to Workspace</span>
            <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* 5) Email report capture */}
      {auditLoading && (
        <div className="rounded-sm border border-border bg-surface p-4 text-center">
          <p className="text-xs text-ink-muted">Finalizing audit snapshot...</p>
        </div>
      )}
      {persistError && !auditLoading && (
        <p className="text-center text-xs text-danger">{persistError}</p>
      )}
      {!auditLoading && auditId !== null && (
        <LeadCapture auditId={auditId} totalMonthlySavings={result.totalMonthlySavings} />
      )}

      {/* 6) Start over button */}
      <div className="flex justify-center pt-2 pb-8">
        <button
          type="button"
          onClick={onStartOver}
          className="inline-flex items-center gap-2 rounded-xs border border-border bg-surface px-4 py-2 text-xs font-semibold text-ink-muted hover:text-ink hover:bg-canvas-subtle transition-standard min-h-[44px]"
        >
          <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.75} />
          <span>Start another audit</span>
        </button>
      </div>
    </div>
  );
}

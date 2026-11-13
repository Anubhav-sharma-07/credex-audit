"use client";

import { useEffect, useState, useCallback } from "react";
import type { AuditResult } from "@/types";
import { PLAN_LABELS, TOOL_LABELS } from "@/lib/pricing";
import LeadCapture from "./LeadCapture";
import {
  TrendingDown,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  FolderPlus,
  Share2,
  Check,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

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
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [auditLoading, setAuditLoading] = useState(true);
  const [persistError, setPersistError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const executePersist = useCallback(async () => {
    const tools = toolsPayload(result);
    const savingsBody = {
      teamSize: result.teamSize,
      useCase: result.useCase,
      totalMonthlySpend: result.totalMonthlySpend,
      totalMonthlySavings: result.totalMonthlySavings,
      totalAnnualSavings: result.totalAnnualSavings,
      tools,
    };

    setSummaryLoading(true);
    setAuditLoading(true);
    setPersistError(null);
    setAiSummary(null);
    setAuditId(null);
    setShareToken(null);

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
        "Your audit is complete. Review recommendations below for ways to eliminate seat overlaps and optimize commitment terms.";
    }

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

      const auditJson = (await auditRes.json()) as {
        id?: string;
        shareToken?: string;
        token?: string;
        error?: string;
      };

      if (auditJson.id) {
        setAuditId(auditJson.id);
        setShareToken(auditJson.shareToken || auditJson.token || auditJson.id);
      } else {
        setPersistError("Unable to persist audit snapshot. You can still review findings and retry.");
      }
    } catch {
      setPersistError("Network error persisting audit record. Findings remain visible below.");
    } finally {
      setAuditLoading(false);
    }
  }, [result]);

  useEffect(() => {
    executePersist();
  }, [executePersist]);

  function handleCopyShareLink() {
    const token = shareToken || auditId;
    if (!token) return;
    const url = `${window.location.origin}/results/${token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const activeShareUrl =
    typeof window !== "undefined" && (shareToken || auditId)
      ? `${window.location.origin}/results/${shareToken || auditId}`
      : "";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* 1) Hero savings: Calm, high-contrast banner */}
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

      {/* 2) Shareable Audit Link & Social Card Preview */}
      {(shareToken || auditId) && (
        <div className="rounded-sm border border-border bg-surface p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-action-text" strokeWidth={1.75} />
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink">
                Shareable Audit Snapshot
              </h2>
            </div>
            <span className="text-[10px] font-mono text-ink-muted bg-canvas-subtle border border-border px-1.5 py-0.2 rounded-xs">
              Token: {String(shareToken || auditId).slice(0, 8)}
            </span>
          </div>

          <p className="text-xs text-ink-muted">
            Anyone with this unique link can view this audit with database-verified figures.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="text"
              readOnly
              value={activeShareUrl}
              className="flex-1 px-3 py-1.5 text-xs bg-canvas border border-border rounded-xs font-mono text-ink-muted select-all min-h-[40px]"
              aria-label="Shareable audit URL"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyShareLink}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-surface hover:bg-canvas-subtle border border-border text-xs font-semibold text-ink rounded-xs transition-standard min-h-[40px] cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-savings" strokeWidth={2} />
                    <span className="text-savings">Copied</span>
                  </>
                ) : (
                  <span>Copy Link</span>
                )}
              </button>
              <Link
                href={`/results/${shareToken || auditId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-canvas-subtle hover:bg-canvas border border-border text-xs font-semibold text-ink rounded-xs transition-standard min-h-[40px]"
              >
                <span>View</span>
                <ExternalLink className="w-3 h-3 text-ink-muted" strokeWidth={1.75} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 3) Structured Findings Summary */}
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
              "Automated calculation rules have verified seat counts and pricing against current vendor lists. Review recommendations below."}
          </p>
        )}
      </div>

      {/* 4) Per-tool cards */}
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

      {/* 5) Save this to a workspace (Conversion CTA) */}
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
                    shareToken,
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

      {/* 6) Email report capture & Skeleton/Error States */}
      {auditLoading && (
        <div className="rounded-sm border border-border bg-surface p-5 text-center space-y-2">
          <div className="h-4 w-48 bg-canvas-subtle animate-pulse rounded-xs mx-auto" />
          <p className="text-xs text-ink-muted">Generating cryptographic snapshot and rate verification…</p>
        </div>
      )}

      {persistError && !auditLoading && (
        <div
          role="alert"
          className="p-4 bg-warning-surface border border-warning-border rounded-xs text-warning text-xs flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={1.75} />
            <span>{persistError}</span>
          </div>
          <button
            type="button"
            onClick={executePersist}
            className="px-2.5 py-1 text-xs font-semibold bg-surface border border-warning-border rounded-xs hover:bg-canvas text-ink transition-standard min-h-[32px] cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {!auditLoading && auditId !== null && (
        <LeadCapture auditId={auditId} totalMonthlySavings={result.totalMonthlySavings} />
      )}

      {/* 7) Start over button */}
      <div className="flex justify-center pt-2 pb-8">
        <button
          type="button"
          onClick={onStartOver}
          className="inline-flex items-center gap-2 rounded-xs border border-border bg-surface px-4 py-2 text-xs font-semibold text-ink-muted hover:text-ink hover:bg-canvas-subtle transition-standard min-h-[44px] cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.75} />
          <span>Start another audit</span>
        </button>
      </div>
    </div>
  );
}

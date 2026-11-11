"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Link2,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Building2,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import type { AuditRecord, ToolAuditResult } from "@/types";
import { formatCurrency } from "@/lib/formatters";

export default function ResultsPage() {
  const { id } = useParams();
  const [audit, setAudit] = useState<AuditRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    async function loadAudit() {
      try {
        const res = await fetch(`/api/audit/${id}`);
        if (res.ok) {
          const json = await res.json();
          setAudit(json.audit);
        } else {
          setAudit(null);
        }
      } catch (err) {
        console.error("Failed to load audit:", err);
        setAudit(null);
      } finally {
        setLoading(false);
      }
    }
    loadAudit();
  }, [id]);

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-canvas flex items-center justify-center p-4">
        <head>
          <meta name="robots" content="noindex, nofollow" />
        </head>
        <p className="text-xs text-ink-muted">Loading audit record…</p>
      </main>
    );
  }

  if (!audit) {
    return (
      <main className="min-h-screen bg-canvas flex flex-col items-center justify-center p-4 text-center">
        <head>
          <meta name="robots" content="noindex, nofollow" />
        </head>
        <p className="text-xs text-ink-muted mb-4">Audit record not found or expired.</p>
        <Link
          href="/audit"
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface border border-border text-xs font-semibold text-ink rounded-xs hover:bg-surface-hover transition-standard min-h-[44px]"
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} /> Run New Free Audit
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-canvas py-12 px-4 text-ink">
      <head>
        <meta name="robots" content="noindex, nofollow" />
      </head>

      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/audit"
            className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-ink font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} /> Start new audit
          </Link>
          <span className="text-[11px] font-mono text-ink-subtle bg-canvas-subtle px-2 py-0.5 rounded-xs border border-border">
            Audit ID: {String(id).slice(0, 8)}
          </span>
        </div>

        <div className="bg-surface border border-border rounded-sm shadow-sm p-6 sm:p-8 space-y-6">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-savings bg-savings-surface border border-savings-border px-2 py-0.5 rounded-xs font-semibold">
              Verified Audit Output
            </span>
            <h1 className="text-xl font-bold text-ink mt-2">SpendLens Executive Audit Report</h1>
            <p className="text-xs text-ink-muted mt-1">
              Evaluated for team size of <strong className="text-ink">{audit.team_size} engineers</strong> with primary use case &ldquo;{audit.use_case}&rdquo;.
            </p>
          </div>

          {/* 3 Core Spend Numbers */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-canvas-subtle border border-border rounded-xs p-3.5 text-center">
              <span className="text-[11px] font-semibold text-ink-muted block uppercase">Current Spend</span>
              <span className="text-lg sm:text-xl font-bold text-ink tabular-nums mt-1 block">
                {formatCurrency(Math.round(audit.total_monthly_spend * 100))}
                <span className="text-[10px] font-normal text-ink-muted">/mo</span>
              </span>
            </div>

            <div className="bg-savings-surface border border-savings-border rounded-xs p-3.5 text-center">
              <span className="text-[11px] font-semibold text-savings block uppercase">Monthly Savings</span>
              <span className="text-lg sm:text-xl font-bold text-savings tabular-nums mt-1 block">
                +{formatCurrency(Math.round(audit.total_monthly_savings * 100))}
                <span className="text-[10px] font-normal text-savings">/mo</span>
              </span>
            </div>

            <div className="bg-savings-surface border border-savings-border rounded-xs p-3.5 text-center">
              <span className="text-[11px] font-semibold text-savings block uppercase">Annual Run-Rate</span>
              <span className="text-lg sm:text-xl font-bold text-savings tabular-nums mt-1 block">
                +{formatCurrency(Math.round(audit.total_annual_savings * 100))}
                <span className="text-[10px] font-normal text-savings">/yr</span>
              </span>
            </div>
          </div>

          {/* AI Summary Section */}
          {audit.summary && (
            <div className="bg-canvas-subtle border-l-2 border-border p-4 rounded-r-xs space-y-1">
              <h2 className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-savings" strokeWidth={1.75} />
                Executive Summary
              </h2>
              <p className="text-xs text-ink-muted leading-relaxed">{audit.summary}</p>
            </div>
          )}

          {/* Tool Breakdown */}
          {audit.tool_results && audit.tool_results.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-bold text-ink uppercase tracking-wider">
                Evaluated Tool Allocations
              </h2>
              <div className="divide-y divide-border border border-border rounded-xs overflow-hidden">
                {audit.tool_results.map((t: ToolAuditResult) => (
                  <div key={t.tool} className="p-3.5 bg-surface hover:bg-canvas-subtle space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-ink-muted" strokeWidth={1.75} />
                        <span className="font-semibold text-ink capitalize">{t.tool}</span>
                        <span className="text-[10px] font-mono text-ink-muted bg-canvas-subtle px-1.5 py-0.2 rounded-xs">
                          {t.plan}
                        </span>
                      </div>
                      <div className="tabular-nums font-bold text-ink">
                        {formatCurrency(Math.round(t.currentMonthlySpend * 100))}/mo
                      </div>
                    </div>

                    <p className="text-xs text-ink-muted leading-relaxed">{t.reason}</p>

                    {t.monthlySavings > 0 && (
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border-subtle">
                        <span className="text-ink-muted">Action: {t.recommendedAction}</span>
                        <span className="font-bold text-savings tabular-nums">
                          +{formatCurrency(Math.round(t.monthlySavings * 100))}/mo savings
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Save to Workspace Funnel CTA */}
          <div className="p-4 bg-canvas-subtle border border-border rounded-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="font-bold text-ink text-xs">Save this audit to your workspace</h3>
              <p className="text-[11px] text-ink-muted mt-0.5">
                Convert these audited tools into real tracked subscriptions with contract renewal reminders.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (audit && audit.tool_results) {
                  try {
                    localStorage.setItem(
                      "spendlens_pending_audit",
                      JSON.stringify({
                        auditId: audit.id,
                        teamSize: audit.team_size,
                        useCase: audit.use_case,
                        toolResults: audit.tool_results,
                        totalMonthlySpend: audit.total_monthly_spend,
                      })
                    );
                  } catch {}
                }
                window.location.href = `/signup?claim_audit=true&audit_id=${audit.id}`;
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-action-fill text-action-fill-foreground hover:bg-action-fill-hover text-xs font-semibold rounded-xs transition-standard shrink-0 min-h-[44px] shadow-xs"
            >
              <span>Save to Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
          </div>

          {/* Copy Shareable Link */}
          <button
            type="button"
            onClick={copyLink}
            className="w-full inline-flex items-center justify-center gap-2 bg-ink hover:bg-neutral-7 text-neutral-1 py-2.5 px-4 rounded-xs text-xs font-semibold transition-standard min-h-[44px] focus-visible:ring-2"
          >
            {copied ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-savings" strokeWidth={1.75} />
                <span>Link Copied to Clipboard</span>
              </>
            ) : (
              <>
                <Link2 className="w-4 h-4 text-neutral-4" strokeWidth={1.75} />
                <span>Copy Shareable Link</span>
              </>
            )}
          </button>
        </div>
      </div>
    </main>
  );
}

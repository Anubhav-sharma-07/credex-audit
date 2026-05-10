"use client";

import { useEffect, useState } from "react";
import type { AuditResult } from "@/types";
import { PLAN_LABELS, TOOL_LABELS } from "@/lib/pricing";
import LeadCapture from "./LeadCapture";

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
          "Your audit is ready. Review the recommendations below for ways to tighten plan fit and consolidate overlapping tools.";
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
          setPersistError("We could not save this audit right now.");
        }
      } catch {
        if (!cancelled) {
          setPersistError("We could not save this audit right now.");
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

  const showCredexCta = result.totalMonthlySavings > 500;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* 1) Hero savings */}
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500 via-green-500 to-emerald-600 p-8 text-white shadow-lg shadow-emerald-900/10 ring-1 ring-white/20">
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-50/90">
          Estimated savings
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          <span className="text-white">{formatUsd(result.totalMonthlySavings)}</span>
          <span className="text-lg font-semibold text-emerald-100"> / month</span>
        </h2>
        <p className="mt-4 text-xl font-semibold text-emerald-50">
          Annual impact:{" "}
          <span className="text-white">{formatUsd(result.totalAnnualSavings)}</span>
        </p>
      </div>

      {/* 2) AI summary */}
      <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-sky-50 p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-800">
          AI summary
        </p>
        {summaryLoading ? (
          <div className="mt-4 space-y-3">
            <div className="h-4 w-full animate-pulse rounded bg-blue-200/80" />
            <div className="h-4 w-[92%] animate-pulse rounded bg-blue-200/80" />
            <div className="h-4 w-[85%] animate-pulse rounded bg-blue-200/80" />
          </div>
        ) : (
          <p className="mt-4 text-base leading-relaxed text-blue-950">
            {aiSummary ??
              "Your audit is ready. Scroll down for tailored recommendations by tool."}
          </p>
        )}
      </div>

      {/* 3) Credex CTA */}
      {showCredexCta && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-800">Credex</p>
          <h3 className="mt-2 text-xl font-bold text-emerald-950">
            You are leaving significant money on the table
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-emerald-900/80">
            Savings over $500/month usually mean consolidation, negotiation, or plan changes warrant a
            second look. Credex helps teams tighten AI vendor spend without guessing.
          </p>
          <a
            href="mailto:hello@credex.ai?subject=High%20AI%20savings%20audit"
            className="mt-4 inline-flex rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            Talk to Credex
          </a>
        </div>
      )}

      {/* 4) Per-tool cards */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Recommendations by tool</h3>
        <ul className="space-y-4">
          {result.toolResults.map((row) => (
            <li
              key={row.tool}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
                <div>
                  <p className="text-lg font-bold text-gray-900">{TOOL_LABELS[row.tool]}</p>
                  <p className="text-sm text-gray-500">
                    {PLAN_LABELS[row.plan] ?? row.plan}
                  </p>
                </div>
                <dl className="grid grid-cols-3 gap-3 text-sm sm:min-w-[280px] sm:text-right">
                  <div>
                    <dt className="text-gray-500">Current spend</dt>
                    <dd className="font-semibold text-gray-900">{formatUsd(row.currentMonthlySpend)}/mo</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Projected cost</dt>
                    <dd className="font-semibold text-gray-900">{formatUsd(row.projectedMonthlyCost)}/mo</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Savings</dt>
                    <dd className="font-semibold text-emerald-600">{formatUsd(row.monthlySavings)}/mo</dd>
                  </div>
                </dl>
              </div>
              <p className="mt-4 border-t border-gray-100 pt-4 text-sm leading-relaxed text-gray-700">
                {row.reason}
              </p>
            </li>
          ))}
        </ul>
      </div>

      {/* 5) Lead capture */}
      {auditLoading && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <p className="text-sm text-gray-600">Saving your audit…</p>
        </div>
      )}
      {persistError && !auditLoading && (
        <p className="text-center text-sm text-red-700">{persistError}</p>
      )}
      {!auditLoading && auditId !== null && (
        <LeadCapture auditId={auditId} totalMonthlySavings={result.totalMonthlySavings} />
      )}

      {/* 6) Start over */}
      <div className="flex justify-center pb-8">
        <button
          type="button"
          onClick={onStartOver}
          className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        >
          Start over
        </button>
      </div>
    </div>
  );
}

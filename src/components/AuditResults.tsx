"use client";

import type { AuditResult } from "@/types";
import { PLAN_LABELS, TOOL_LABELS } from "@/lib/pricing";

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

export default function AuditResults({ result, onStartOver }: AuditResultsProps) {
  const { toolResults, totalMonthlySavings, totalAnnualSavings } = result;
  const showCredexCta = totalMonthlySavings > 500;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500 via-green-500 to-emerald-600 p-8 text-white shadow-lg shadow-emerald-900/10 ring-1 ring-white/20">
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-50/90">
          Estimated savings
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          You could save{" "}
          <span className="text-white">{formatUsd(totalMonthlySavings)}</span>
          <span className="text-lg font-semibold text-emerald-100"> / month</span>
        </h2>
        <p className="mt-4 text-xl font-semibold text-emerald-50">
          Annual impact:{" "}
          <span className="text-white">{formatUsd(totalAnnualSavings)}</span>
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 bg-gray-50 px-5 py-4">
          <h3 className="text-lg font-semibold text-gray-900">Per-tool breakdown</h3>
          <p className="mt-1 text-sm text-gray-600">
            Current spend vs projected cost after optimizations
          </p>
        </div>
        <ul className="divide-y divide-gray-100">
          {toolResults.map((row) => (
            <li key={row.tool} className="px-5 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{TOOL_LABELS[row.tool]}</p>
                  <p className="text-sm text-gray-500">
                    Plan: {PLAN_LABELS[row.plan] ?? row.plan}
                  </p>
                </div>
                <dl className="grid grid-cols-3 gap-3 text-sm sm:min-w-[280px] sm:text-right">
                  <div>
                    <dt className="text-gray-500">Current</dt>
                    <dd className="font-medium text-gray-900">
                      {formatUsd(row.currentMonthlySpend)}
                      <span className="text-gray-400">/mo</span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Projected</dt>
                    <dd className="font-medium text-gray-900">
                      {formatUsd(row.projectedMonthlyCost)}
                      <span className="text-gray-400">/mo</span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Savings</dt>
                    <dd className="font-semibold text-emerald-600">
                      {formatUsd(row.monthlySavings)}
                      <span className="font-normal text-gray-400">/mo</span>
                    </dd>
                  </div>
                </dl>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {showCredexCta && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-800">
            Credex
          </p>
          <h3 className="mt-2 text-xl font-bold text-emerald-950">
            Savings over $500/month — talk to Credex
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-emerald-900/80">
            At this level of spend, negotiation, consolidation, and renewal strategy often recover
            meaningful budget. Credex helps teams right-size AI contracts and usage.
          </p>
          <a
            href="mailto:hello@credex.ai?subject=AI%20spend%20audit%20follow-up"
            className="mt-4 inline-flex rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            Contact Credex
          </a>
        </div>
      )}

      <div className="flex justify-center pb-8">
        <button
          type="button"
          onClick={onStartOver}
          className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        >
          Start over
        </button>
      </div>
    </div>
  );
}

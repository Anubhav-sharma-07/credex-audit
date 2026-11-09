"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Download,
  Printer,
  Layers,
  Building2,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import { listSubscriptions } from "@/modules/workspace/subscriptions";
import { runAuditEngine } from "@/modules/audit";
import { formatCurrency } from "@/lib/formatters";
import type { Subscription } from "@/modules/workspace/types";
import type { AuditEngineResult, ToolId } from "@/modules/audit/types";

export default function ReportsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [auditResult, setAuditResult] = useState<AuditEngineResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<"summary" | "savings">("summary");
  const [currency, setCurrency] = useState<"USD" | "INR">("USD");

  const loadReportData = useCallback(async () => {
    try {
      const res = await listSubscriptions("ws_default", { pageSize: 100 });
      setSubscriptions(res.data);

      const audit = runAuditEngine({
        subscriptions: res.data.map((s) => ({
          id: s.id,
          toolId: s.toolId as ToolId,
          planId: s.planName.toLowerCase(),
          seats: s.seats,
          actualMonthlySpendMinor: s.costMinor,
          billingCycle: s.billingFrequency,
          ownerEmail: s.ownerEmail,
          renewalDate: s.renewalDate,
        })),
        teamSize: 4,
        useCase: "coding",
        referenceDate: new Date().toISOString(),
      });
      setAuditResult(audit);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to generate report data.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  function handlePrint() {
    window.print();
  }

  function handleDownloadCsv() {
    const reportDate = new Date().toISOString().split("T")[0];
    let csv = `SpendLens Executive SaaS Report (${currency}) - ${reportDate}\n\n`;

    if (selectedReport === "summary") {
      csv += "Section 1: Active Subscriptions Summary\n";
      csv += "Vendor,Plan,Category,Seats,Monthly Cost Minor,Billing Cycle,Owner,Renewal Date\n";
      subscriptions.forEach((s) => {
        csv += `"${s.vendorName}","${s.planName}","${s.category}",${s.seats},${s.costMinor},"${s.billingFrequency}","${s.ownerEmail || ""}","${s.renewalDate || ""}"\n`;
      });
    } else {
      csv += "Section 2: Evidence-Backed Savings Opportunities\n";
      csv += "Rule ID,Tool,Finding Kind,Confidence,Current Monthly Minor,Projected Monthly Minor,Monthly Savings Minor,Pricing Verified\n";
      auditResult?.findings.forEach((f) => {
        csv += `"${f.ruleId}","${f.toolId}","${f.kind}","${f.confidence}",${f.currentMonthlyMinor},${f.projectedMonthlyMinor},${f.savingsMinor},"${f.pricingSource.verifiedAt}"\n`;
      });
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `spendlens-${selectedReport}-report-${reportDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const totalMonthlySpendMinor = subscriptions.reduce((sum, s) => sum + s.costMinor, 0);
  const totalAnnualisedSpendMinor = totalMonthlySpendMinor * 12;
  const totalSeats = subscriptions.reduce((sum, s) => sum + s.seats, 0);
  const avgCostPerSeatMinor = totalSeats > 0 ? Math.round(totalMonthlySpendMinor / totalSeats) : 0;
  const totalMonthlySavingsMinor = auditResult ? auditResult.forecast.monthlySavingsMinor : 0;
  const totalAnnualSavingsMinor = auditResult ? auditResult.forecast.annualSavingsMinor : 0;

  // Category breakdown
  const categoryMap: Record<string, { spendMinor: number; seats: number; count: number }> = {};
  subscriptions.forEach((s) => {
    if (!categoryMap[s.category]) {
      categoryMap[s.category] = { spendMinor: 0, seats: 0, count: 0 };
    }
    categoryMap[s.category].spendMinor += s.costMinor;
    categoryMap[s.category].seats += s.seats;
    categoryMap[s.category].count += 1;
  });

  return (
    <div className="space-y-6">
      {/* Action Header (Hidden in Print) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-ink tracking-tight font-serif">Executive Reports</h1>
          <p className="text-xs text-ink-muted">
            Export audit-ready executive spend summaries and catalog-verified savings reports in USD or INR.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Currency Toggle */}
          <div className="inline-flex rounded-xs border border-border bg-surface p-0.5">
            <button
              onClick={() => setCurrency("USD")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-xs transition-standard min-h-[32px] cursor-pointer ${
                currency === "USD" ? "bg-ink text-canvas" : "text-ink-muted hover:text-ink"
              }`}
              aria-pressed={currency === "USD"}
            >
              USD ($)
            </button>
            <button
              onClick={() => setCurrency("INR")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-xs transition-standard min-h-[32px] cursor-pointer ${
                currency === "INR" ? "bg-ink text-canvas" : "text-ink-muted hover:text-ink"
              }`}
              aria-pressed={currency === "INR"}
            >
              INR (₹)
            </button>
          </div>

          {/* Tab Selector */}
          <div className="inline-flex rounded-xs border border-border bg-surface p-0.5">
            <button
              onClick={() => setSelectedReport("summary")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xs transition-standard min-h-[36px] cursor-pointer ${
                selectedReport === "summary"
                  ? "bg-ink text-canvas"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              Monthly Summary
            </button>
            <button
              onClick={() => setSelectedReport("savings")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xs transition-standard min-h-[36px] cursor-pointer ${
                selectedReport === "savings"
                  ? "bg-ink text-canvas"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              Savings Report
            </button>
          </div>

          <button
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border text-ink text-xs font-semibold rounded-xs hover:bg-canvas-subtle transition-standard min-h-[36px] cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-ink-muted" strokeWidth={1.75} />
            <span>CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-action-fill text-action-fill-foreground text-xs font-semibold rounded-xs hover:bg-action-fill-hover transition-standard min-h-[36px] cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {loading && (
        <div className="p-8 text-center text-xs text-ink-muted bg-surface border border-border rounded-sm">
          Generating financial report data…
        </div>
      )}

      {error && (
        <div role="alert" className="p-4 bg-danger-surface border border-danger-border text-danger rounded-xs flex items-center gap-2 text-xs">
          <AlertCircle className="w-4 h-4 text-danger shrink-0" strokeWidth={1.75} />
          <p>{error}</p>
        </div>
      )}

      {/* Printable Report Canvas */}
      {!loading && !error && (
        <div className="bg-surface border border-border rounded-sm p-6 shadow-sm space-y-6 print:p-0 print:border-none print:shadow-none">
          {/* Printable Document Header */}
          <div className="border-b border-border pb-4 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-xs bg-ink text-canvas flex items-center justify-center font-bold text-xs tracking-wider">
                  SL
                </div>
                <span className="text-base font-bold text-ink tracking-tight font-serif">SpendLens</span>
                <span className="text-[10px] bg-canvas-subtle border border-border text-ink-muted px-2 py-0.5 rounded-xs font-mono uppercase">
                  Institutional Record
                </span>
              </div>
              <h2 className="text-base font-bold text-ink mt-2">
                {selectedReport === "summary" ? "Monthly SaaS Spend Summary" : "Verified Savings & Optimization Audit"}
              </h2>
              <p className="text-xs text-ink-muted">
                Workspace: <span className="font-semibold text-ink">Demo Engineering Org</span> • Generated on{" "}
                {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            </div>
            <div className="text-right text-[11px] text-ink-subtle">
              <p>Strict Minor-Unit Arithmetic</p>
              <p>Currency: {currency}</p>
            </div>
          </div>

          {/* Key Metric Highlights */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3.5 bg-canvas border border-border rounded-xs">
              <span className="text-[10px] text-ink-muted font-semibold uppercase block">Monthly Run-Rate</span>
              <p className="text-lg font-bold text-ink mt-1 tabular-nums">{formatCurrency(totalMonthlySpendMinor, currency)}</p>
              <span className="text-[10px] text-ink-muted">{subscriptions.length} active licenses</span>
            </div>

            <div className="p-3.5 bg-canvas border border-border rounded-xs">
              <span className="text-[10px] text-ink-muted font-semibold uppercase block">Annualised Run-Rate</span>
              <p className="text-lg font-bold text-ink mt-1 tabular-nums">{formatCurrency(totalAnnualisedSpendMinor, currency)}</p>
              <span className="text-[10px] text-ink-muted">12x monthly recurring</span>
            </div>

            <div className="p-3.5 bg-canvas border border-border rounded-xs">
              <span className="text-[10px] text-savings font-semibold uppercase block">Identified Savings</span>
              <p className="text-lg font-bold text-savings mt-1 tabular-nums">{formatCurrency(totalMonthlySavingsMinor, currency)}/mo</p>
              <span className="text-[10px] text-ink-muted">{formatCurrency(totalAnnualSavingsMinor, currency)}/yr potential</span>
            </div>

            <div className="p-3.5 bg-canvas border border-border rounded-xs">
              <span className="text-[10px] text-ink-muted font-semibold uppercase block">Avg Cost / Seat</span>
              <p className="text-lg font-bold text-ink mt-1 tabular-nums">{formatCurrency(avgCostPerSeatMinor, currency)}</p>
              <span className="text-[10px] text-ink-muted">{totalSeats} seats total</span>
            </div>
          </div>

          {/* Report 1: Monthly Summary View */}
          {selectedReport === "summary" && (
            <div className="space-y-5">
              {/* Category Breakdown Table */}
              <div>
                <h3 className="text-xs font-bold text-ink uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-ink-muted" strokeWidth={1.75} /> Spend by Category
                </h3>
                <div className="overflow-x-auto border border-border rounded-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-canvas-subtle text-ink-muted font-semibold border-b border-border">
                      <tr>
                        <th className="py-2 px-3 text-[11px]">Category</th>
                        <th className="py-2 px-3 text-[11px] text-center">Licenses</th>
                        <th className="py-2 px-3 text-[11px] text-center">Seats</th>
                        <th className="py-2 px-3 text-[11px] text-right">Monthly Spend</th>
                        <th className="py-2 px-3 text-[11px] text-right">Portfolio Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {Object.entries(categoryMap).map(([cat, val]) => {
                        const share = totalMonthlySpendMinor > 0 ? (val.spendMinor / totalMonthlySpendMinor) * 100 : 0;
                        return (
                          <tr key={cat} className="hover:bg-canvas-subtle/50">
                            <td className="py-2 px-3 font-semibold text-ink capitalize">{cat.replace(/_/g, " ")}</td>
                            <td className="py-2 px-3 text-center text-ink-muted tabular-nums">{val.count}</td>
                            <td className="py-2 px-3 text-center text-ink-muted tabular-nums">{val.seats}</td>
                            <td className="py-2 px-3 text-right font-bold text-ink tabular-nums">{formatCurrency(val.spendMinor, currency)}</td>
                            <td className="py-2 px-3 text-right text-ink-muted tabular-nums">{share.toFixed(1)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* All Subscriptions List */}
              <div>
                <h3 className="text-xs font-bold text-ink uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-ink-muted" strokeWidth={1.75} /> All Active Contracts
                </h3>
                <div className="overflow-x-auto border border-border rounded-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-canvas-subtle text-ink-muted font-semibold border-b border-border">
                      <tr>
                        <th className="py-2 px-3 text-[11px]">Vendor & Tool</th>
                        <th className="py-2 px-3 text-[11px]">Plan</th>
                        <th className="py-2 px-3 text-[11px] text-center">Seats</th>
                        <th className="py-2 px-3 text-[11px]">Billing Cycle</th>
                        <th className="py-2 px-3 text-[11px]">Owner</th>
                        <th className="py-2 px-3 text-[11px] text-right">Monthly Spend</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {subscriptions.map((s) => (
                        <tr key={s.id} className="hover:bg-canvas-subtle/50">
                          <td className="py-2 px-3 font-semibold text-ink">{s.vendorName}</td>
                          <td className="py-2 px-3 text-ink-muted">{s.planName}</td>
                          <td className="py-2 px-3 text-center text-ink tabular-nums">{s.seats}</td>
                          <td className="py-2 px-3 capitalize text-ink-muted">{s.billingFrequency}</td>
                          <td className="py-2 px-3 text-ink-muted">{s.ownerEmail || "Unassigned"}</td>
                          <td className="py-2 px-3 text-right font-bold text-ink tabular-nums">{formatCurrency(s.costMinor, currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Report 2: Savings Report View */}
          {selectedReport === "savings" && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-ink uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-savings" strokeWidth={1.75} /> Deterministic Finding Details
              </h3>
              <div className="overflow-x-auto border border-border rounded-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-canvas-subtle text-ink-muted font-semibold border-b border-border">
                    <tr>
                      <th className="py-2 px-3 text-[11px]">Rule ID</th>
                      <th className="py-2 px-3 text-[11px]">Tool</th>
                      <th className="py-2 px-3 text-[11px]">Kind</th>
                      <th className="py-2 px-3 text-[11px]">Confidence</th>
                      <th className="py-2 px-3 text-[11px] text-right">Current Spend</th>
                      <th className="py-2 px-3 text-[11px] text-right">Projected Spend</th>
                      <th className="py-2 px-3 text-[11px] text-right">Monthly Savings</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {auditResult?.findings.map((f) => (
                      <tr key={f.ruleId} className="hover:bg-canvas-subtle/50">
                        <td className="py-2 px-3 font-mono font-bold text-ink-muted text-[10px]">{f.ruleId}</td>
                        <td className="py-2 px-3 font-semibold text-ink capitalize">{f.toolId.replace(/_/g, " ")}</td>
                        <td className="py-2 px-3 text-ink-muted capitalize">{f.kind.replace(/_/g, " ")}</td>
                        <td className="py-2 px-3">
                          <span
                            className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-xs border ${
                              f.confidence === "confirmed"
                                ? "bg-savings-surface text-savings border-savings-border"
                                : "bg-warning-surface text-warning border-warning-border"
                            }`}
                          >
                            {f.confidence}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-ink tabular-nums">{formatCurrency(f.currentMonthlyMinor, currency)}</td>
                        <td className="py-2 px-3 text-right font-semibold text-ink tabular-nums">{formatCurrency(f.projectedMonthlyMinor, currency)}</td>
                        <td className="py-2 px-3 text-right font-bold text-savings tabular-nums">+{formatCurrency(f.savingsMinor, currency)}/mo</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

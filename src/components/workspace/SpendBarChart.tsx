"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/formatters";
import { Table, BarChart2 } from "lucide-react";

export interface ChartDataPoint {
  label: string;
  amountMinor: number;
  percentage: number;
  color?: string;
  category?: string;
}

interface SpendBarChartProps {
  title: string;
  subtitle?: string;
  data: ChartDataPoint[];
  totalMinor: number;
  currency?: "USD" | "INR";
  caption: string; // "What this means" caption
}

const COLOR_BLIND_PALETTE = [
  "#15191F", // Ink / Charcoal
  "#23734B", // Muted Forest Green
  "#0B61A4", // Muted Navy Blue
  "#9C4300", // Dark Amber Orange
  "#575D65", // Mid Slate
  "#625D53", // Warm Earth
];

export default function SpendBarChart({
  title,
  subtitle,
  data,
  totalMinor,
  currency = "USD",
  caption,
}: SpendBarChartProps) {
  const [showTableFallback, setShowTableFallback] = useState(false);

  const maxAmount = Math.max(...data.map((d) => d.amountMinor), 1);

  return (
    <div className="bg-surface border border-border rounded-sm p-5 shadow-sm space-y-4">
      {/* Header with Table Toggle for Accessibility */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border pb-3">
        <div>
          <h3 className="text-sm font-bold text-ink flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-ink-muted" strokeWidth={1.75} />
            {title}
          </h3>
          {subtitle && <p className="text-xs text-ink-muted mt-0.5">{subtitle}</p>}
        </div>

        <button
          type="button"
          onClick={() => setShowTableFallback((prev) => !prev)}
          className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink px-2.5 py-1 rounded-xs border border-border bg-canvas-subtle transition-standard min-h-[32px] focus-visible:ring-2"
          aria-expanded={showTableFallback}
          aria-controls="accessible-data-table"
        >
          <Table className="w-3.5 h-3.5" strokeWidth={1.75} />
          <span>{showTableFallback ? "Show Visual Bars" : "Accessible Data Table"}</span>
        </button>
      </div>

      {/* Mode 1: Visual Direct-Labeled Bar Chart */}
      {!showTableFallback ? (
        <div className="space-y-3 pt-1">
          <div className="space-y-3">
            {data.map((item, idx) => {
              const barColor = item.color || COLOR_BLIND_PALETTE[idx % COLOR_BLIND_PALETTE.length];
              const barWidthPercent = Math.max(4, Math.round((item.amountMinor / maxAmount) * 100));

              return (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-xs shrink-0"
                        style={{ backgroundColor: barColor }}
                        aria-hidden="true"
                      />
                      <span className="font-semibold text-ink truncate">{item.label}</span>
                      {item.category && (
                        <span className="text-[10px] text-ink-muted bg-canvas-subtle px-1.5 py-0.2 rounded-xs capitalize">
                          {item.category.replace(/_/g, " ")}
                        </span>
                      )}
                    </div>
                    {/* Direct label on bar data */}
                    <div className="tabular-nums font-bold text-ink shrink-0 ml-2">
                      {formatCurrency(item.amountMinor, { currency })}
                      <span className="text-ink-muted font-normal text-[11px] ml-1.5">
                        ({item.percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>

                  {/* Horizontal Bar with Sensible Baseline at 0 */}
                  <div className="w-full bg-canvas-subtle h-2 rounded-xs overflow-hidden">
                    <div
                      className="h-2 rounded-xs transition-standard"
                      style={{
                        width: `${barWidthPercent}%`,
                        backgroundColor: barColor,
                      }}
                      role="progressbar"
                      aria-valuenow={item.amountMinor}
                      aria-valuemin={0}
                      aria-valuemax={maxAmount}
                      aria-label={`${item.label}: ${formatCurrency(item.amountMinor, { currency })}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Baseline reference axis */}
          <div className="flex items-center justify-between text-[10px] font-mono text-ink-subtle pt-2 border-t border-border-subtle">
            <span>0.00 Baseline</span>
            <span>Total: {formatCurrency(totalMinor, { currency })}</span>
          </div>
        </div>
      ) : (
        /* Mode 2: Accessible Tabular Fallback */
        <div id="accessible-data-table" className="overflow-x-auto border border-border rounded-xs">
          <table className="w-full text-left text-xs">
            <caption className="sr-only">{title} data table</caption>
            <thead className="bg-canvas-subtle text-ink font-semibold border-b border-border">
              <tr>
                <th scope="col" className="py-2 px-3">Item / Category</th>
                <th scope="col" className="py-2 px-3 text-right">Spend Amount</th>
                <th scope="col" className="py-2 px-3 text-right">Share (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((item) => (
                <tr key={item.label} className="hover:bg-canvas-subtle">
                  <td className="py-2 px-3 font-semibold text-ink">{item.label}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-ink">
                    {formatCurrency(item.amountMinor, { currency })}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums text-ink-muted">
                    {item.percentage.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-canvas-subtle font-bold border-t border-border">
              <tr>
                <th scope="row" className="py-2 px-3 text-ink">Total</th>
                <td className="py-2 px-3 text-right tabular-nums text-ink">
                  {formatCurrency(totalMinor, { currency })}
                </td>
                <td className="py-2 px-3 text-right tabular-nums text-ink">100.0%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* "What this means" explanatory caption */}
      <div className="p-3 bg-canvas-subtle border-l-2 border-border text-xs text-ink-muted leading-relaxed">
        <strong className="text-ink">What this means:</strong> {caption}
      </div>
    </div>
  );
}


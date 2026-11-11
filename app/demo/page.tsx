import Link from "next/link";
import ThemeToggle from "@/components/workspace/ThemeToggle";
import {
  ShieldAlert,
  ArrowRight,
  TrendingDown,
  Layers,
  AlertTriangle,
  Lock,
  ArrowUpRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-canvas text-ink antialiased flex flex-col">
      {/* 1. Clear Institutional Demo Banner */}
      <div className="bg-canvas-subtle border-b border-border px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2 w-2 rounded-full bg-action-text animate-pulse" />
            <div className="flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-action-text" strokeWidth={1.75} />
              <span className="text-xs font-bold text-ink">
                Demo Mode (Read-Only)
              </span>
            </div>
            <span className="text-xs text-ink-muted hidden md:inline">
              — Simulated dataset for a 25-person engineering organization. Actions are disabled.
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-semibold text-ink-muted hover:text-ink transition-standard min-h-[36px] flex items-center px-2.5"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="py-1.5 px-3 rounded-xs text-xs font-semibold text-action-fill-foreground bg-action-fill hover:bg-action-fill-hover transition-standard min-h-[36px] flex items-center gap-1.5 shadow-xs"
            >
              <span>Create Live Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* 2. Main Dashboard Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Workspace Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-ink tracking-tight">
                Acme Engineering (Demo)
              </h1>
              <span className="text-[10px] font-mono uppercase bg-neutral-2 text-ink-muted px-2 py-0.5 rounded-xs border border-border">
                Sample
              </span>
            </div>
            <p className="text-xs text-ink-muted mt-1">
              Sample portfolio covering IDE coding assistants, foundation model licenses, and API consumption.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled
              title="Disabled in demo mode"
              className="py-2 px-3.5 rounded-xs text-xs font-medium bg-canvas border border-border text-ink-subtle opacity-60 cursor-not-allowed flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>Add Subscription</span>
            </button>
            <button
              disabled
              title="Disabled in demo mode"
              className="py-2 px-3.5 rounded-xs text-xs font-medium bg-canvas border border-border text-ink-subtle opacity-60 cursor-not-allowed flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>Import CSV</span>
            </button>
          </div>
        </div>

        {/* 3. Four Core Institutional Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-surface border border-border rounded-sm p-4 space-y-1 shadow-xs">
            <div className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
              Monthly Recurring Spend
            </div>
            <div className="text-2xl font-bold font-mono text-ink tracking-tight">
              $3,720.00
            </div>
            <div className="text-[11px] text-ink-muted">
              4 active vendor contracts
            </div>
          </div>

          <div className="bg-surface border border-border rounded-sm p-4 space-y-1 shadow-xs">
            <div className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
              Annualised Spend
            </div>
            <div className="text-2xl font-bold font-mono text-ink tracking-tight">
              $44,640.00
            </div>
            <div className="text-[11px] text-ink-muted">
              Based on contracted renewal commitments
            </div>
          </div>

          <div className="bg-surface border border-border rounded-sm p-4 space-y-1 shadow-xs">
            <div className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
              Active Subscriptions
            </div>
            <div className="text-2xl font-bold font-mono text-ink tracking-tight">
              4
            </div>
            <div className="text-[11px] text-ink-muted">
              70 seats provisioned across 25 engineers
            </div>
          </div>

          <div className="bg-savings-surface border border-savings-border rounded-sm p-4 space-y-1 shadow-xs">
            <div className="text-[11px] font-semibold text-savings uppercase tracking-wider flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5" strokeWidth={2} />
              <span>Identified Monthly Savings</span>
            </div>
            <div className="text-2xl font-bold font-mono text-savings tracking-tight">
              +$1,180.00
            </div>
            <div className="text-[11px] text-savings font-medium">
              3 actionable optimization findings
            </div>
          </div>
        </div>

        {/* 4. Active Subscriptions Table */}
        <div className="bg-surface border border-border rounded-sm overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-ink-muted" strokeWidth={1.75} />
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink">
                Active Subscriptions (Sample)
              </h2>
            </div>
            <span className="text-[11px] font-mono text-ink-muted">4 entries</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-canvas-subtle border-b border-border text-ink-muted font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Vendor & Tool</th>
                  <th className="py-2.5 px-4">Plan</th>
                  <th className="py-2.5 px-4">Seats</th>
                  <th className="py-2.5 px-4">Billing Cycle</th>
                  <th className="py-2.5 px-4 font-mono text-right">Monthly Cost</th>
                  <th className="py-2.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="py-3 px-4 font-semibold text-ink">Cursor</td>
                  <td className="py-3 px-4 text-ink-muted">Business</td>
                  <td className="py-3 px-4 font-mono">25</td>
                  <td className="py-3 px-4 text-ink-muted">Monthly</td>
                  <td className="py-3 px-4 font-mono text-right font-semibold">$1,000.00</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-xs text-[10px] font-medium bg-neutral-2 text-ink">Active</span>
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-ink">GitHub Copilot</td>
                  <td className="py-3 px-4 text-ink-muted">Business</td>
                  <td className="py-3 px-4 font-mono">20</td>
                  <td className="py-3 px-4 text-ink-muted">Monthly</td>
                  <td className="py-3 px-4 font-mono text-right font-semibold">$380.00</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-xs text-[10px] font-medium bg-action-text/10 text-action-text border border-action-text/20">Overlap</span>
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-ink">Claude (Anthropic)</td>
                  <td className="py-3 px-4 text-ink-muted">Team</td>
                  <td className="py-3 px-4 font-mono">25</td>
                  <td className="py-3 px-4 text-ink-muted">Monthly</td>
                  <td className="py-3 px-4 font-mono text-right font-semibold">$750.00</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-xs text-[10px] font-medium bg-savings-surface text-savings border border-savings-border">Annual Opp.</span>
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-ink">OpenAI API</td>
                  <td className="py-3 px-4 text-ink-muted">Pay-as-you-go</td>
                  <td className="py-3 px-4 font-mono">—</td>
                  <td className="py-3 px-4 text-ink-muted">Metered</td>
                  <td className="py-3 px-4 font-mono text-right font-semibold">$1,590.00</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-xs text-[10px] font-medium bg-neutral-2 text-ink">Active</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. Identified Savings Breakdown */}
        <div className="bg-surface border border-border rounded-sm p-5 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <AlertTriangle className="w-4 h-4 text-action-text" strokeWidth={1.75} />
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink">
              Actionable Spend Optimizations
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3.5 bg-canvas-subtle border border-border rounded-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-action-text">Duplicate License</span>
                <span className="font-mono font-bold text-savings text-sm">+$380/mo</span>
              </div>
              <h3 className="text-xs font-bold text-ink">Redundant Copilot & Cursor Seats</h3>
              <p className="text-[11px] text-ink-muted leading-relaxed">
                20 engineers have active GitHub Copilot Business licenses alongside Cursor Business IDE seats. Deprecating redundant Copilot licenses saves $380/mo.
              </p>
            </div>

            <div className="p-3.5 bg-canvas-subtle border border-border rounded-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-savings">Billing Term</span>
                <span className="font-mono font-bold text-savings text-sm">+$300/mo</span>
              </div>
              <h3 className="text-xs font-bold text-ink">Claude Team Annual Discount</h3>
              <p className="text-[11px] text-ink-muted leading-relaxed">
                Switching 25 Claude Team seats from monthly ($30/seat) to annual commitment ($25/seat) reduces monthly run-rate by $300 ($3,600/yr).
              </p>
            </div>

            <div className="p-3.5 bg-canvas-subtle border border-border rounded-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-savings">Tier Optimization</span>
                <span className="font-mono font-bold text-savings text-sm">+$500/mo</span>
              </div>
              <h3 className="text-xs font-bold text-ink">API Model Cache & Prompt Routing</h3>
              <p className="text-[11px] text-ink-muted leading-relaxed">
                Routing non-reasoning background workloads from GPT-4o to GPT-4o-mini reduces monthly token expenses by ~$500/mo.
              </p>
            </div>
          </div>
        </div>

        {/* 6. Call to Action Banner */}
        <div className="bg-ink text-canvas rounded-sm p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md">
          <div className="space-y-1.5 text-center sm:text-left">
            <h3 className="text-base sm:text-lg font-bold">
              Ready to eliminate spend waste across your engineering stack?
            </h3>
            <p className="text-xs text-neutral-4 max-w-xl">
              Connect your subscriptions or import a CSV to generate a customized, deterministic spend audit with zero client-side guesswork.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/audit"
              className="py-2.5 px-4 bg-canvas text-ink hover:bg-neutral-1 text-xs font-semibold rounded-xs transition-standard min-h-[44px] flex items-center"
            >
              Run Instant Audit
            </Link>
            <Link
              href="/signup"
              className="py-2.5 px-4 bg-action-fill hover:bg-action-fill-hover text-action-fill-foreground text-xs font-semibold rounded-xs transition-standard min-h-[44px] flex items-center gap-1.5"
            >
              <span>Get Started</span>
              <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.75} />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

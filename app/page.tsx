"use client";

import Link from "next/link";
import {
  Shield,
  ArrowRight,
  CheckCircle2,
  Lock,
  Layers,
  Database,
  Calendar,
  DollarSign,
  FileSpreadsheet,
  Cpu,
  Sparkles,
} from "lucide-react";
import ThemeToggle from "@/components/workspace/ThemeToggle";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col justify-between selection:bg-action-fill selection:text-action-fill-foreground">
      {/* Skip Link for Accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-ink focus:text-canvas focus:rounded-xs text-xs font-semibold"
      >
        Skip to main content
      </a>

      {/* Top Institutional Header */}
      <header className="border-b border-border bg-surface sticky top-0 z-40 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-7 h-7 rounded-xs bg-ink text-canvas flex items-center justify-center font-bold text-xs tracking-wider group-hover:scale-105 transition-transform">
                SL
              </div>
              <span className="font-bold text-base tracking-tight font-serif text-ink">SpendLens</span>
            </Link>

            <nav className="hidden md:flex items-center gap-5 text-xs font-medium text-ink-muted" aria-label="Main Navigation">
              <a href="#how-it-works" className="hover:text-ink transition-standard min-h-[32px] flex items-center">
                Architecture
              </a>
              <a href="#cost-drivers" className="hover:text-ink transition-standard min-h-[32px] flex items-center">
                Waste Analysis
              </a>
              <a href="#pricing" className="hover:text-ink transition-standard min-h-[32px] flex items-center">
                Pricing
              </a>
              <a href="#security" className="hover:text-ink transition-standard min-h-[32px] flex items-center">
                Security & Privacy
              </a>
              <a href="#faq" className="hover:text-ink transition-standard min-h-[32px] flex items-center">
                FAQ
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/overview"
              className="hidden sm:inline-flex items-center px-3 py-1.5 text-xs font-semibold text-ink bg-canvas border border-border rounded-xs hover:bg-canvas-subtle transition-standard min-h-[36px]"
            >
              Demo Workspace
            </Link>
            <Link
              href="/login"
              className="text-xs font-semibold text-ink-muted hover:text-ink px-2.5 py-1.5 transition-standard min-h-[36px] flex items-center"
            >
              Sign In
            </Link>
            <Link
              href="/audit"
              className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-action-fill text-action-fill-foreground text-xs font-semibold rounded-xs hover:bg-action-fill-hover transition-standard min-h-[36px] cursor-pointer"
            >
              <span>Run Free Audit</span>
              <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Landing Content */}
      <main id="main-content" className="flex-1 space-y-20 py-12 px-4 sm:px-6">
        {/* Section 1: Hero Explaining the Problem First */}
        <section className="max-w-4xl mx-auto space-y-6 pt-4 text-left">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-xs bg-canvas-subtle border border-border text-[11px] font-semibold text-action-text uppercase tracking-wider">
            <span>Engineering SaaS Spend Intelligence</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-ink font-serif leading-[1.15]">
            Engineering teams waste 20% to 35% of their AI tool budget on duplicate seats and unreviewed commitments.
          </h1>

          <p className="text-sm sm:text-base text-ink-muted leading-relaxed max-w-2xl">
            Cursor, GitHub Copilot, Windsurf, Claude Team, and OpenAI subscriptions accumulate across engineering departments without centralized oversight. SpendLens audits provisioned seats against active team headcount and published vendor rate cards in 2 minutes.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <Link
              href="/audit"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-action-fill text-action-fill-foreground font-semibold text-sm rounded-xs hover:bg-action-fill-hover transition-standard min-h-[44px] cursor-pointer shadow-xs"
            >
              <span>Run Free 2-Minute Audit</span>
              <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
            </Link>
            <Link
              href="/overview"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-surface border border-border text-ink font-semibold text-sm rounded-xs hover:bg-canvas-subtle transition-standard min-h-[44px]"
            >
              <span>Explore Interactive Demo Workspace</span>
            </Link>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-6 text-xs text-ink-muted">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-savings" strokeWidth={1.75} /> No credit card required
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-savings" strokeWidth={1.75} /> Deterministic rule engine
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-savings" strokeWidth={1.75} /> Zero credentials needed
            </span>
          </div>
        </section>

        {/* Section 2: Real Product Screenshot / Workspace Preview (Anti-template: no illustrations) */}
        <section className="max-w-5xl mx-auto" aria-label="SpendLens Workspace Preview">
          <div className="bg-surface border border-border rounded-sm shadow-md overflow-hidden">
            {/* Top Workspace Chrome Header */}
            <div className="bg-canvas-subtle border-b border-border px-4 py-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-border" />
                  <div className="w-2.5 h-2.5 rounded-full bg-border" />
                  <div className="w-2.5 h-2.5 rounded-full bg-border" />
                </div>
                <span className="font-mono text-[11px] text-ink-muted pl-2">
                  app.spendlens.internal / overview
                </span>
              </div>
              <span className="text-[10px] font-mono text-savings bg-savings-surface border border-savings-border px-2 py-0.5 rounded-xs">
                Active Tenant: Acme Engineering ($3,840/mo)
              </span>
            </div>

            {/* Simulated Live Workspace UI */}
            <div className="p-6 space-y-5 bg-canvas/30">
              {/* 4 Numbers Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-surface border border-border rounded-xs">
                  <span className="text-[10px] uppercase font-semibold text-ink-muted block">Monthly Recurring</span>
                  <p className="text-xl font-bold text-ink mt-0.5 tabular-nums">$3,840<span className="text-xs font-normal text-ink-muted">/mo</span></p>
                  <span className="text-[10px] text-ink-muted">from 6 active subscriptions</span>
                </div>
                <div className="p-3 bg-surface border border-border rounded-xs">
                  <span className="text-[10px] uppercase font-semibold text-ink-muted block">Annualised Run-Rate</span>
                  <p className="text-xl font-bold text-ink mt-0.5 tabular-nums">$46,080<span className="text-xs font-normal text-ink-muted">/yr</span></p>
                  <span className="text-[10px] text-ink-muted">12x monthly spend</span>
                </div>
                <div className="p-3 bg-surface border border-border rounded-xs">
                  <span className="text-[10px] uppercase font-semibold text-ink-muted block">Active Subscriptions</span>
                  <p className="text-xl font-bold text-ink mt-0.5 tabular-nums">6<span className="text-xs font-normal text-ink-muted"> plans</span></p>
                  <span className="text-[10px] text-ink-muted">40 provisioned seats</span>
                </div>
                <div className="p-3 bg-surface border border-border rounded-xs">
                  <span className="text-[10px] uppercase font-semibold text-savings block">Potential Savings</span>
                  <p className="text-xl font-bold text-savings mt-0.5 tabular-nums">$880<span className="text-xs font-normal text-ink-muted">/mo</span></p>
                  <span className="text-[10px] text-ink-muted">22.9% reduction identified</span>
                </div>
              </div>

              {/* Middle preview: Visual Bar Chart & Evidence Findings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Visual direct-labeled spend share */}
                <div className="p-4 bg-surface border border-border rounded-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <span className="text-xs font-bold text-ink">Spend Concentration by Vendor</span>
                    <span className="text-[10px] font-mono text-ink-muted">Monthly Commit</span>
                  </div>
                  <div className="space-y-2.5 text-xs">
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="font-semibold text-ink">Cursor Business (40 seats)</span>
                        <span className="font-bold text-ink tabular-nums">$1,600.00 (41.7%)</span>
                      </div>
                      <div className="h-2 bg-canvas-subtle rounded-xs overflow-hidden">
                        <div className="h-full bg-ink rounded-xs" style={{ width: "41.7%" }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="font-semibold text-ink">Claude Team (40 seats)</span>
                        <span className="font-bold text-ink tabular-nums">$1,200.00 (31.3%)</span>
                      </div>
                      <div className="h-2 bg-canvas-subtle rounded-xs overflow-hidden">
                        <div className="h-full bg-savings rounded-xs" style={{ width: "31.3%" }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="font-semibold text-ink">GitHub Copilot Enterprise</span>
                        <span className="font-bold text-ink tabular-nums">$640.00 (16.7%)</span>
                      </div>
                      <div className="h-2 bg-canvas-subtle rounded-xs overflow-hidden">
                        <div className="h-full bg-neutral-6 rounded-xs" style={{ width: "16.7%" }} />
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-ink-muted pt-1">
                    What this means: Top 2 vendors represent 73% of monthly software run-rate.
                  </p>
                </div>

                {/* Evidence findings sample */}
                <div className="p-4 bg-surface border border-border rounded-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <span className="text-xs font-bold text-ink">Catalog-Verified Savings Findings</span>
                    <span className="text-[10px] uppercase font-semibold text-savings">Deterministic Rules</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 bg-canvas rounded-xs border border-border-subtle flex items-start justify-between">
                      <div>
                        <span className="font-mono text-[9px] font-bold text-ink-muted bg-canvas-subtle px-1 rounded-xs">RULE_OVERLAPPING_IDE</span>
                        <p className="font-bold text-ink text-xs mt-0.5">Cursor & Copilot Duplicate IDE Seats</p>
                        <p className="text-[10px] text-ink-muted">Both tools assigned to 20 identical developers.</p>
                      </div>
                      <span className="font-bold text-savings text-xs tabular-nums">+$380/mo</span>
                    </div>

                    <div className="p-2.5 bg-canvas rounded-xs border border-border-subtle flex items-start justify-between">
                      <div>
                        <span className="font-mono text-[9px] font-bold text-ink-muted bg-canvas-subtle px-1 rounded-xs">RULE_ANNUAL_DISCOUNT</span>
                        <p className="font-bold text-ink text-xs mt-0.5">Claude Team Flexible vs Annual Rate</p>
                        <p className="text-[10px] text-ink-muted">Switch $30/seat flexible plan to $25 annual commitment.</p>
                      </div>
                      <span className="font-bold text-savings text-xs tabular-nums">+$200/mo</span>
                    </div>
                  </div>
                  <div className="pt-1 flex items-center justify-between text-[10px] text-ink-muted">
                    <span>Pricing verified against vendor catalog</span>
                    <Link href="/overview" className="text-action-text font-semibold hover:underline">
                      Launch Full Workspace →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Cost Driver Analysis (Real Numbers, Plain Copy) */}
        <section id="cost-drivers" className="max-w-4xl mx-auto space-y-8">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-action-text">
              Institutional Spend Diagnostic
            </h2>
            <h3 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight font-serif mt-1">
              Where AI tool budgets bleed capital
            </h3>
            <p className="text-xs sm:text-sm text-ink-muted mt-1 max-w-xl">
              Unlike traditional SaaS with annual IT purchasing cycles, developer AI subscriptions are decentralized across individual credit cards.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 bg-surface border border-border rounded-sm shadow-xs space-y-2.5">
              <div className="w-8 h-8 rounded-xs bg-canvas-subtle border border-border flex items-center justify-center">
                <Layers className="w-4 h-4 text-ink" strokeWidth={1.75} />
              </div>
              <h4 className="text-sm font-bold text-ink">IDE Assistant Overlap</h4>
              <p className="text-xs text-ink-muted leading-relaxed">
                Teams frequently provision GitHub Copilot ($19/seat) and Cursor Business ($40/seat) to the same engineers simultaneously. Choosing a primary IDE assistant immediately frees up $228 to $480 per developer annually.
              </p>
            </div>

            <div className="p-5 bg-surface border border-border rounded-sm shadow-xs space-y-2.5">
              <div className="w-8 h-8 rounded-xs bg-canvas-subtle border border-border flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-ink" strokeWidth={1.75} />
              </div>
              <h4 className="text-sm font-bold text-ink">Billing Frequency Inefficiencies</h4>
              <p className="text-xs text-ink-muted leading-relaxed">
                Anthropic prices Claude Team at $25/seat on annual billing versus $30/seat on monthly billing. On a 25-person team, remaining on monthly flexible billing incurs $1,500/yr in avoidable premium.
              </p>
            </div>

            <div className="p-5 bg-surface border border-border rounded-sm shadow-xs space-y-2.5">
              <div className="w-8 h-8 rounded-xs bg-canvas-subtle border border-border flex items-center justify-center">
                <Calendar className="w-4 h-4 text-ink" strokeWidth={1.75} />
              </div>
              <h4 className="text-sm font-bold text-ink">Unmonitored Contract Renewals</h4>
              <p className="text-xs text-ink-muted leading-relaxed">
                Enterprise contracts auto-renew with 30-day cancellation notice clauses. Without renewal countdowns and keep/cancel status records, teams roll over unwanted enterprise commitments for another 12 months.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: Architecture & Deterministic Engine */}
        <section id="how-it-works" className="max-w-4xl mx-auto space-y-8">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-action-text">
              Architecture & Trust
            </h2>
            <h3 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight font-serif mt-1">
              Pure, deterministic rules. Never LLM hallucinations.
            </h3>
            <p className="text-xs sm:text-sm text-ink-muted mt-1 max-w-xl">
              Financial decisions require mathematical certainty. SpendLens separates rule evaluation from natural language reporting.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 bg-surface border border-border rounded-sm shadow-xs space-y-2">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-ink" strokeWidth={1.75} />
                <h4 className="text-sm font-bold text-ink">Deterministic Rules Engine</h4>
              </div>
              <p className="text-xs text-ink-muted leading-relaxed">
                Rules execute as pure, idempotent TypeScript functions. Savings calculations are verified against exact vendor pricing catalogs with recorded timestamps. Resolvers prevent double-counting across overlapping tools.
              </p>
            </div>

            <div className="p-5 bg-surface border border-border rounded-sm shadow-xs space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-savings" strokeWidth={1.75} />
                <h4 className="text-sm font-bold text-ink">Read-Only Structured AI Layer</h4>
              </div>
              <p className="text-xs text-ink-muted leading-relaxed">
                The AI layer never receives raw invoices, emails, or free-text inputs. It receives strictly typed finding IDs and figures. Post-execution checks reject any number not produced by the deterministic engine.
              </p>
            </div>
          </div>
        </section>

        {/* Section 5: Transparent Flat Pricing */}
        <section id="pricing" className="max-w-4xl mx-auto space-y-8">
          <div className="text-left">
            <h2 className="text-xs font-bold uppercase tracking-wider text-action-text">
              Transparent Pricing
            </h2>
            <h3 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight font-serif mt-1">
              Predictable, flat rates for engineering organizations
            </h3>
            <p className="text-xs sm:text-sm text-ink-muted mt-1">
              No percentage-of-savings cut. No lock-in. Cancel anytime.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Free Tier */}
            <div className="p-5 bg-surface border border-border rounded-sm shadow-xs space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-ink">Public Audit</h4>
                  <span className="text-[10px] uppercase font-semibold text-ink-muted bg-canvas-subtle px-2 py-0.5 rounded-xs border border-border">Free</span>
                </div>
                <div className="text-2xl font-bold text-ink tabular-nums">$0</div>
                <p className="text-xs text-ink-muted">
                  Instant 2-minute diagnostic for engineering managers assessing team spend.
                </p>
                <ul className="text-xs text-ink-muted space-y-2 pt-2 border-t border-border-subtle" role="list">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-savings shrink-0" strokeWidth={1.75} />
                    <span>Deterministic rule evaluation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-savings shrink-0" strokeWidth={1.75} />
                    <span>Shareable public audit link</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-savings shrink-0" strokeWidth={1.75} />
                    <span>Email savings breakdown</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/audit"
                className="w-full py-2 bg-canvas-subtle hover:bg-canvas border border-border text-ink rounded-xs text-xs font-semibold text-center transition-standard min-h-[44px] flex items-center justify-center cursor-pointer"
              >
                Run Free Audit
              </Link>
            </div>

            {/* Team Tier */}
            <div className="p-5 bg-surface border-2 border-ink rounded-sm shadow-sm space-y-4 flex flex-col justify-between relative">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-ink">Team Workspace</h4>
                  <span className="text-[10px] uppercase font-bold text-action-fill-foreground bg-action-fill px-2 py-0.5 rounded-xs">Popular</span>
                </div>
                <div className="text-2xl font-bold text-ink tabular-nums">$49<span className="text-xs font-normal text-ink-muted">/month</span></div>
                <p className="text-xs text-ink-muted">
                  Full SaaS spend intelligence workspace for growing tech companies.
                </p>
                <ul className="text-xs text-ink space-y-2 pt-2 border-t border-border-subtle" role="list">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-savings shrink-0" strokeWidth={1.75} />
                    <span>Track up to 50 subscriptions</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-savings shrink-0" strokeWidth={1.75} />
                    <span>CSV import with 1-click rollback</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-savings shrink-0" strokeWidth={1.75} />
                    <span>7 / 30 / 90-day renewal reminders</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-savings shrink-0" strokeWidth={1.75} />
                    <span>Executive CSV & printable PDF reports</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/signup"
                className="w-full py-2 bg-action-fill hover:bg-action-fill-hover text-action-fill-foreground rounded-xs text-xs font-semibold text-center transition-standard min-h-[44px] flex items-center justify-center cursor-pointer"
              >
                Get Started
              </Link>
            </div>

            {/* Enterprise Tier */}
            <div className="p-5 bg-surface border border-border rounded-sm shadow-xs space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-ink">Enterprise</h4>
                  <span className="text-[10px] uppercase font-semibold text-ink-muted bg-canvas-subtle px-2 py-0.5 rounded-xs border border-border">Scale</span>
                </div>
                <div className="text-2xl font-bold text-ink tabular-nums">$149<span className="text-xs font-normal text-ink-muted">/month</span></div>
                <p className="text-xs text-ink-muted">
                  Unlimited tracking, custom rate cards, and multi-department controls.
                </p>
                <ul className="text-xs text-ink-muted space-y-2 pt-2 border-t border-border-subtle" role="list">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-savings shrink-0" strokeWidth={1.75} />
                    <span>Unlimited subscriptions & seats</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-savings shrink-0" strokeWidth={1.75} />
                    <span>Custom negotiated rate cards</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-savings shrink-0" strokeWidth={1.75} />
                    <span>Multi-workspace consolidation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-savings shrink-0" strokeWidth={1.75} />
                    <span>Dedicated spend engineering advisor</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/signup"
                className="w-full py-2 bg-canvas-subtle hover:bg-canvas border border-border text-ink rounded-xs text-xs font-semibold text-center transition-standard min-h-[44px] flex items-center justify-center cursor-pointer"
              >
                Contact Enterprise
              </Link>
            </div>
          </div>
        </section>

        {/* Section 6: Security & Truthful Privacy (No SOC 2 Claims) */}
        <section id="security" className="max-w-4xl mx-auto space-y-6">
          <div className="border-b border-border pb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-action-text">
              Institutional Privacy Architecture
            </h2>
            <h3 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight font-serif mt-1">
              Security claims we actually enforce
            </h3>
            <p className="text-xs sm:text-sm text-ink-muted mt-1 max-w-xl">
              We make zero false compliance claims. No marketing badges. Here is exactly how your data is isolated.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-surface border border-border rounded-xs space-y-1.5">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-ink" strokeWidth={1.75} />
                <h4 className="text-xs font-bold text-ink">Postgres Row-Level Security (RLS)</h4>
              </div>
              <p className="text-xs text-ink-muted leading-relaxed">
                Every subscription record and finding is strictly scoped by workspace ID at the database level. Cross-tenant reads are prevented by PostgreSQL kernel constraints.
              </p>
            </div>

            <div className="p-4 bg-surface border border-border rounded-xs space-y-1.5">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-ink" strokeWidth={1.75} />
                <h4 className="text-xs font-bold text-ink">Zero Model Training on Customer Data</h4>
              </div>
              <p className="text-xs text-ink-muted leading-relaxed">
                SpendLens passes only structured summaries into inference APIs. Your workspace data is never used to train, fine-tune, or calibrate public AI models.
              </p>
            </div>

            <div className="p-4 bg-surface border border-border rounded-xs space-y-1.5">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-ink" strokeWidth={1.75} />
                <h4 className="text-xs font-bold text-ink">No Production Credentials Required</h4>
              </div>
              <p className="text-xs text-ink-muted leading-relaxed">
                SpendLens operates entirely out-of-band. We never ask for GitHub Organization Admin tokens, AWS root keys, or sensitive credit card credentials.
              </p>
            </div>

            <div className="p-4 bg-surface border border-border rounded-xs space-y-1.5">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-ink" strokeWidth={1.75} />
                <h4 className="text-xs font-bold text-ink">Complete Export and Purge Rights</h4>
              </div>
              <p className="text-xs text-ink-muted leading-relaxed">
                Export your entire audit history and subscription data as clean CSV at any moment. Workspace deletion instantly cascades across all database tables.
              </p>
            </div>
          </div>
        </section>

        {/* Section 7: Honest FAQ */}
        <section id="faq" className="max-w-4xl mx-auto space-y-6">
          <div className="border-b border-border pb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-action-text">
              Frequently Answered Questions
            </h2>
            <h3 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight font-serif mt-1">
              Direct answers to common questions
            </h3>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-surface border border-border rounded-xs space-y-1.5">
              <h4 className="text-xs font-bold text-ink">
                Why did Claude show $25 vs $30 per seat in my audit?
              </h4>
              <p className="text-xs text-ink-muted leading-relaxed">
                Anthropic prices Claude Team at $25 per user/month on an annual commitment versus $30 per user/month on monthly flexible billing. The audit surfaces this difference so you know exactly how much you can save by switching billing cycles.
              </p>
            </div>

            <div className="p-4 bg-surface border border-border rounded-xs space-y-1.5">
              <h4 className="text-xs font-bold text-ink">
                How does the free public audit connect to the workspace product?
              </h4>
              <p className="text-xs text-ink-muted leading-relaxed">
                When you run the free audit at /audit, your results can be converted into active subscriptions in a new workspace with a single click. This lets you turn one-time audit recommendations into continuous renewal tracking and spend monitoring.
              </p>
            </div>

            <div className="p-4 bg-surface border border-border rounded-xs space-y-1.5">
              <h4 className="text-xs font-bold text-ink">
                Can I import subscriptions from my existing invoicing tool?
              </h4>
              <p className="text-xs text-ink-muted leading-relaxed">
                Yes. SpendLens includes a CSV importer with automatic column mapping, duplicate detection, and 1-click rollback. If you ever import the wrong file, rollback atomically removes all rows from that import batch.
              </p>
            </div>

            <div className="p-4 bg-surface border border-border rounded-xs space-y-1.5">
              <h4 className="text-xs font-bold text-ink">
                Do you support currencies other than USD?
              </h4>
              <p className="text-xs text-ink-muted leading-relaxed">
                Yes. SpendLens natively formats financial data in USD ($) and Indian Rupees (INR ₹) with appropriate locale separators, minor unit precision, and zero rounding drift.
              </p>
            </div>
          </div>
        </section>

        {/* Section 8: Final Call to Action */}
        <section className="max-w-4xl mx-auto bg-surface border border-border rounded-sm p-8 text-center space-y-4 shadow-sm">
          <h2 className="text-2xl sm:text-3xl font-bold text-ink font-serif tracking-tight">
            Audit your team&apos;s AI spend in 2 minutes
          </h2>
          <p className="text-xs sm:text-sm text-ink-muted max-w-md mx-auto">
            Free, deterministic, and no credit card required. Receive itemized findings across Cursor, Copilot, Windsurf, Claude, and OpenAI.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Link
              href="/audit"
              className="px-5 py-2.5 bg-action-fill text-action-fill-foreground font-semibold text-xs rounded-xs hover:bg-action-fill-hover transition-standard min-h-[44px] flex items-center justify-center cursor-pointer"
            >
              Start Free Audit
            </Link>
            <Link
              href="/overview"
              className="px-5 py-2.5 bg-canvas border border-border text-ink font-semibold text-xs rounded-xs hover:bg-canvas-subtle transition-standard min-h-[44px] flex items-center justify-center"
            >
              Explore Demo
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-surface py-8 px-4 sm:px-6 text-xs text-ink-muted">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-xs bg-ink text-canvas flex items-center justify-center font-bold text-xs tracking-wider">
              SL
            </div>
            <span className="font-bold text-ink">SpendLens</span>
            <span>• Institutional Software Spend Intelligence</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/audit" className="hover:text-ink transition-standard min-h-[32px] flex items-center">
              Public Audit
            </Link>
            <Link href="/overview" className="hover:text-ink transition-standard min-h-[32px] flex items-center">
              Workspace
            </Link>
            <Link href="/login" className="hover:text-ink transition-standard min-h-[32px] flex items-center">
              Sign In
            </Link>
            <a href="#security" className="hover:text-ink transition-standard min-h-[32px] flex items-center">
              Security
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

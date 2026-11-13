import Link from "next/link";
import { ArrowLeft, CheckCircle2, ShieldCheck, Sparkles, Smartphone, Accessibility } from "lucide-react";
import ThemeToggle from "@/components/workspace/ThemeToggle";

export const metadata = {
  title: "SpendLens Changelog & Product Updates",
  description: "Track all recent architectural updates, performance enhancements, and releases in SpendLens.",
};

export default function ChangelogPage() {
  const releases = [
    {
      version: "v0.2.0",
      date: "May 2026",
      tag: "Accessibility & Mobile Polish",
      items: [
        {
          title: "Responsive Mobile Workspace Layout (< 1024px)",
          description:
            "Replaced fixed desktop sidebar at mobile viewports with a sticky top bar, accessible hamburger drawer, and card-based table representations.",
          icon: Smartphone,
        },
        {
          title: "WCAG 2.1 AA Compliance & Axe-Core Automation",
          description:
            "Passed 100% axe-core accessibility checks with 0 violations across light and dark modes. Enhanced contrast ratios to exceed 4.5:1 across all typography and alerts.",
          icon: Accessibility,
        },
        {
          title: "Database-Authoritative Public Share & OG Cards",
          description:
            "Secured social preview cards and public audit sharing via cryptographically randomized 128-bit share tokens, querying Postgres directly instead of client query parameters.",
          icon: ShieldCheck,
        },
        {
          title: "Keyboard Shortcuts & Instant Undo",
          description:
            "Added global quick navigation (? to open shortcuts dialog, G+O, G+S, G+R) and optimistic archive with instant 6-second undo toast.",
          icon: Sparkles,
        },
      ],
    },
    {
      version: "v0.1.0",
      date: "April 2026",
      tag: "Initial Launch",
      items: [
        {
          title: "Deterministic AI Audit Engine",
          description:
            "Audits Cursor, Copilot, Windsurf, Claude Team, and OpenAI API licenses against active headcount with 15 verified rules.",
          icon: CheckCircle2,
        },
        {
          title: "Two-Tenant RLS & Session Verification",
          description:
            "Postgres Row-Level Security isolates multi-tenant workspaces with role-based access control (owner, admin, finance, member, viewer).",
          icon: ShieldCheck,
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b border-border bg-surface sticky top-0 z-40 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between h-14">
          <div className="flex items-center gap-4">
            <Link
              href="/overview"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink min-h-[36px]"
            >
              <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>Workspace</span>
            </Link>
            <span className="text-xs text-ink-subtle">•</span>
            <span className="text-xs font-bold text-ink font-serif">SpendLens Changelog</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" className="flex-1 max-w-4xl w-full mx-auto py-10 px-4 sm:px-6 space-y-10">
        <div className="space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-action-text bg-canvas-subtle border border-border px-2 py-0.5 rounded-xs font-semibold">
            Product Evolution
          </span>
          <h1 className="text-3xl font-bold font-serif tracking-tight text-ink">
            SpendLens Release Log
          </h1>
          <p className="text-xs text-ink-muted leading-relaxed max-w-xl">
            Continuous delivery logs, accessibility audits, and architecture decisions deployed to production.
          </p>
        </div>

        <div className="space-y-12">
          {releases.map((rel) => (
            <section key={rel.version} aria-labelledby={`release-${rel.version}`} className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2.5">
                  <h2 id={`release-${rel.version}`} className="text-xl font-bold font-serif text-ink">
                    {rel.version}
                  </h2>
                  <span className="text-[10px] font-mono bg-canvas-subtle border border-border text-ink-muted px-2 py-0.5 rounded-xs">
                    {rel.tag}
                  </span>
                </div>
                <span className="text-xs text-ink-muted font-mono">{rel.date}</span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {rel.items.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={idx}
                      className="p-4 bg-surface border border-border rounded-sm shadow-xs flex items-start gap-3.5"
                    >
                      <div className="w-8 h-8 rounded-xs bg-canvas-subtle border border-border text-ink flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="w-4 h-4 text-action-text" strokeWidth={1.75} />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-ink">{item.title}</h3>
                        <p className="text-xs text-ink-muted leading-relaxed">{item.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 px-4 text-center text-xs text-ink-muted bg-surface">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <span>SpendLens Engineering</span>
          <Link href="/" className="hover:text-ink">
            Back to Home
          </Link>
        </div>
      </footer>
    </div>
  );
}

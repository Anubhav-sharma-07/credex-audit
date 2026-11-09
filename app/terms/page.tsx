import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import ThemeToggle from "@/components/workspace/ThemeToggle";

export const metadata = {
  title: "Terms of Service • SpendLens",
  description: "Institutional terms of service, subscription policies, and service level agreements.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col justify-between">
      <header className="border-b border-border bg-surface px-4 py-3 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-semibold text-ink-muted hover:text-ink transition-standard min-h-[44px]"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>SpendLens Home</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-3xl mx-auto py-12 px-4 sm:px-6 space-y-8">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-action-text bg-canvas-subtle border border-border px-2 py-0.5 rounded-xs">
            Terms of Service
          </span>
          <h1 className="text-3xl font-bold text-ink tracking-tight font-serif mt-2">
            SpendLens Terms of Service
          </h1>
          <p className="text-xs text-ink-muted mt-1">
            Effective Date: May 15, 2026 • Version 1.1
          </p>
        </div>

        <div className="space-y-6 text-xs text-ink-muted leading-relaxed">
          <section className="p-4 bg-surface border border-border rounded-xs space-y-2">
            <h2 className="text-sm font-bold text-ink flex items-center gap-2">
              <FileText className="w-4 h-4 text-ink" strokeWidth={1.75} />
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing the SpendLens public audit, registering a workspace, or using our spend intelligence software, your organization agrees to be bound by these Terms of Service. If you are entering into these terms on behalf of a company, you represent that you have the requisite authority.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-bold text-ink">2. Software Spend Intelligence & Audit Disclaimers</h2>
            <p>
              SpendLens computes software savings recommendations using deterministic data-driven rules derived from current published vendor rate cards. While we make every commercially reasonable effort to maintain accurate pricing catalogs, software vendor pricing is subject to independent vendor change. Recommendations do not constitute binding legal, financial, or tax advice.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-bold text-ink">3. Customer Data & Tenant Isolation</h2>
            <p>
              You retain all ownership, intellectual property rights, and title to all data imported into your workspace. SpendLens maintains strict multi-tenant isolation via PostgreSQL Row-Level Security. We will not access your workspace data except as required to provide support or operate the services.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-bold text-ink">4. Subscription Terms & Cancellation</h2>
            <p>
              Paid workspace subscriptions are billed in advance on a recurring monthly or annual basis. You may cancel your subscription at any time through the workspace admin settings. Upon cancellation, your workspace remains accessible until the end of the current paid billing cycle.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-bold text-ink">5. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, SpendLens shall not be liable for any indirect, incidental, or consequential damages resulting from vendor price changes, contractual renegotiations, or third-party API deprecations.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-border bg-surface py-4 px-4 text-center text-xs text-ink-muted">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>SpendLens • Institutional Software Spend Intelligence</span>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-ink min-h-[44px] flex items-center">
              Privacy Policy
            </Link>
            <Link href="/" className="hover:text-ink min-h-[44px] flex items-center">
              Home
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

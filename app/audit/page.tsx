"use client";

import { useState } from "react";
import Link from "next/link";
import SpendForm from "@/components/SpendForm";
import AuditResults from "@/components/AuditResults";
import ThemeToggle from "@/components/workspace/ThemeToggle";
import type { AuditResult } from "@/types";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export default function AuditPage() {
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b border-border bg-surface px-4 py-3 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-semibold text-ink-muted hover:text-ink transition-standard min-h-[44px]"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>SpendLens Home</span>
          </Link>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs text-savings">
              <ShieldCheck className="w-4 h-4 text-savings" strokeWidth={1.75} />
              <span className="hidden sm:inline font-medium">Free • No Credit Card Required</span>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 py-10 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          {!auditResult ? (
            <>
              <div className="text-center mb-8 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-action-text bg-canvas-subtle px-2.5 py-1 rounded-xs border border-border">
                  Public Spend Diagnostic
                </span>
                <h1 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight">
                  Engineering AI Spend Audit
                </h1>
                <p className="text-xs sm:text-sm text-ink-muted max-w-lg mx-auto leading-relaxed">
                  Deterministic analysis across Cursor, Copilot, Windsurf, Claude, and OpenAI. Identify duplicate seats and tier mismatches in 2 minutes.
                </p>
              </div>

              <SpendForm onAuditComplete={setAuditResult} />
            </>
          ) : (
            <AuditResults
              result={auditResult}
              onStartOver={() => setAuditResult(null)}
            />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-surface py-4 px-4 text-center text-xs text-ink-muted">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>SpendLens • Institutional Software Spend Intelligence</span>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-ink transition-standard min-h-[44px] flex items-center">
              Workspace Login
            </Link>
            <Link href="/" className="hover:text-ink transition-standard min-h-[44px] flex items-center">
              Privacy & Architecture
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

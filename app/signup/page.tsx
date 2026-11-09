"use client";

import { useState, Suspense, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signInWithMagicLink, signInWithGoogle } from "@/lib/auth/client";
import { Mail, ArrowRight, CheckCircle2, AlertCircle, Shield, FolderCheck } from "lucide-react";
import ThemeToggle from "@/components/workspace/ThemeToggle";

interface StoredAudit {
  auditId?: string;
  teamSize?: number;
  useCase?: string;
  toolResults?: Array<{
    tool: string;
    plan: string;
    currentMonthlySpend: number;
    projectedMonthlyCost?: number;
    monthlySavings?: number;
    reason?: string;
  }>;
  totalMonthlySpend?: number;
}

function SignupContent() {
  const searchParams = useSearchParams();
  const claimAuditParam = searchParams.get("claim_audit");

  const [email, setEmail] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  const [pendingAudit] = useState<StoredAudit | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem("spendlens_pending_audit");
      if (stored) return JSON.parse(stored);
    } catch {
      // Ignore
    }
    return null;
  });

  async function handleClaimAudit() {
    if (pendingAudit && pendingAudit.toolResults) {
      try {
        await fetch("/api/workspace/claim-audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceId: "ws_default",
            teamSize: pendingAudit.teamSize || 4,
            toolResults: pendingAudit.toolResults,
          }),
        });
        localStorage.removeItem("spendlens_pending_audit");
      } catch (e) {
        console.error("Failed to claim audit automatically", e);
      }
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      setError("Please enter a valid work email address.");
      emailInputRef.current?.focus();
      return;
    }
    setLoading(true);
    setError(null);

    try {
      await signInWithMagicLink(email);
      await handleClaimAudit();
      setSent(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create account.";
      setError(message);
      emailInputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignUp() {
    setGoogleLoading(true);
    setError(null);
    try {
      await handleClaimAudit();
      await signInWithGoogle();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Google OAuth signup failed.";
      setError(message);
      setGoogleLoading(false);
    }
  }

  async function handleDemoSignUp() {
    setLoading(true);
    await handleClaimAudit();
    document.cookie = "spendlens_session=active_demo_user; path=/; max-age=86400";
    window.location.href = "/overview";
  }

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Header with Theme Toggle */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center items-center gap-2.5">
          <div className="w-8 h-8 rounded-xs bg-ink text-canvas flex items-center justify-center font-bold text-sm tracking-wider">
            SL
          </div>
          <span className="text-xl font-bold tracking-tight text-ink font-serif">SpendLens</span>
        </div>
        <h1 className="mt-4 text-center text-lg font-bold tracking-tight text-ink">
          Create your SpendLens workspace
        </h1>
        <p className="mt-1 text-center text-xs text-ink-muted">
          Start optimizing your software spend with automated evidence-backed audit rules.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Funnel Claim Banner */}
        {(claimAuditParam || pendingAudit) && (
          <div className="mb-4 p-4 bg-savings-surface border border-savings-border rounded-xs shadow-xs">
            <div className="flex items-start gap-3">
              <FolderCheck className="w-4 h-4 text-savings shrink-0 mt-0.5" strokeWidth={1.75} />
              <div>
                <p className="text-xs font-bold text-ink">
                  Claiming Public Audit Results
                </p>
                <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">
                  Your audited tools will be automatically imported as active subscriptions into your new workspace.
                </p>
                {pendingAudit?.toolResults && (
                  <div className="mt-2 text-[11px] font-semibold text-savings">
                    {pendingAudit.toolResults.length} tools detected • ${((pendingAudit.totalMonthlySpend || 0)).toFixed(0)}/mo tracked
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="bg-surface py-7 px-6 shadow-sm border border-border rounded-sm sm:px-8 space-y-5">
          {error && (
            <div
              role="alert"
              className="p-3 bg-danger-surface border border-danger-border rounded-xs flex items-center gap-2 text-danger text-xs"
            >
              <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={1.75} />
              <span>{error}</span>
            </div>
          )}

          {sent ? (
            <div className="text-center space-y-3 py-4">
              <div className="w-10 h-10 bg-savings-surface text-savings rounded-full flex items-center justify-center mx-auto border border-savings-border">
                <CheckCircle2 className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <h2 className="text-sm font-bold text-ink">Verify your email</h2>
              <p className="text-xs text-ink-muted leading-relaxed">
                We sent a secure activation link to <strong className="text-ink">{email}</strong>.
                Click the link in your email to launch your workspace.
              </p>
            </div>
          ) : (
            <>
              {/* Google OAuth Button */}
              <button
                type="button"
                onClick={handleGoogleSignUp}
                disabled={googleLoading}
                className="w-full flex justify-center items-center gap-3 py-2.5 px-4 border border-border rounded-xs bg-canvas text-xs font-semibold text-ink hover:bg-canvas-subtle transition-standard min-h-[44px] cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>{googleLoading ? "Setting up…" : "Continue with Google"}</span>
              </button>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-border w-full" />
                <span className="bg-surface px-2 text-[10px] text-ink-subtle uppercase tracking-wider">
                  or work email
                </span>
              </div>

              {/* Password-less Sign-up Form */}
              <form onSubmit={handleMagicLink} className="space-y-3.5">
                <div>
                  <label htmlFor="signup-workspace" className="block text-xs font-semibold text-ink mb-1">
                    Workspace / Company Name
                  </label>
                  <input
                    id="signup-workspace"
                    type="text"
                    autoComplete="organization"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    placeholder="Acme Engineering"
                    className="block w-full px-3 py-2 bg-canvas border border-border rounded-xs text-xs text-ink placeholder-ink-subtle min-h-[44px] focus-visible:outline-2 focus-visible:outline-ink"
                  />
                </div>

                <div>
                  <label htmlFor="signup-email" className="block text-xs font-semibold text-ink mb-1">
                    Work Email Address <span className="text-danger">*</span>
                  </label>
                  <input
                    ref={emailInputRef}
                    id="signup-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="finance-lead@company.com"
                    className="block w-full px-3 py-2 bg-canvas border border-border rounded-xs text-xs text-ink placeholder-ink-subtle min-h-[44px] focus-visible:outline-2 focus-visible:outline-ink"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-xs text-xs font-semibold text-action-fill-foreground bg-action-fill hover:bg-action-fill-hover transition-standard min-h-[44px] cursor-pointer disabled:opacity-50"
                >
                  <Mail className="w-3.5 h-3.5" strokeWidth={1.75} />
                  <span>{loading ? "Creating workspace…" : "Create Workspace"}</span>
                </button>
              </form>

              {/* Instant Sandbox Onboarding */}
              <div className="pt-2 border-t border-border-subtle">
                <button
                  type="button"
                  onClick={handleDemoSignUp}
                  className="w-full py-2.5 px-4 bg-canvas-subtle hover:bg-canvas border border-border text-ink rounded-xs text-xs font-medium transition-standard flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5 text-action-text" strokeWidth={1.75} />
                  <span>Launch Demo Workspace Instantly</span>
                  <ArrowRight className="w-3.5 h-3.5 text-ink-muted" strokeWidth={1.75} />
                </button>
              </div>
            </>
          )}

          <div className="pt-3 border-t border-border-subtle flex items-center justify-between text-xs text-ink-muted">
            <span>Already have an account?</span>
            <Link href="/login" className="text-action-text font-semibold hover:underline min-h-[44px] flex items-center">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-canvas flex items-center justify-center text-xs text-ink-muted">Loading workspace configuration…</div>}>
      <SignupContent />
    </Suspense>
  );
}

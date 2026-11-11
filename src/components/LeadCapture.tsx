"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Mail, Send } from "lucide-react";

interface LeadCaptureProps {
  auditId: string;
  totalMonthlySavings: number;
}

export default function LeadCapture({ auditId, totalMonthlySavings }: LeadCaptureProps) {
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [role, setRole] = useState("");
  const [consentGiven, setConsentGiven] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!consentGiven) {
      setError("Please check the consent box to receive your audit report.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auditId, email, companyName, role, consentGiven }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to submit lead request.");
      }

      setSubmitted(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to dispatch report.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="bg-savings-surface border border-savings-border rounded-sm p-6 text-center space-y-2">
        <CheckCircle2 className="w-8 h-8 text-savings mx-auto" strokeWidth={1.75} />
        <h3 className="font-bold text-ink text-base">Audit Registered & Consultation Requested</h3>
        <p className="text-ink-muted text-xs max-w-sm mx-auto">
          We have registered your audit for <strong className="text-ink">{email}</strong>. A spend advisor will review your findings.
          {totalMonthlySavings > 500 && " Institutional spend playbooks and negotiation guidance are being prepared."}
        </p>
        <p className="text-[11px] text-ink-subtle pt-2">
          If email delivery is enabled, a copy will be dispatched to your inbox. Every email includes a 1-click unsubscribe link.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-sm p-6 space-y-4 shadow-sm">
      <div className="border-b border-border-subtle pb-3">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-ink-muted" strokeWidth={1.75} />
          <h3 className="font-bold text-ink text-sm">Request Audit Consultation & Export</h3>
        </div>
        <p className="text-ink-muted text-xs mt-1">
          Enter your work email to register this audit and request vendor negotiation playbooks.
        </p>
      </div>

      {error && (
        <div role="alert" className="p-3 bg-danger-surface border border-danger-border rounded-xs text-xs text-danger">
          {error}
        </div>
      )}

      {/* Honeypot field - hidden from real users */}
      <input type="text" name="website" className="hidden" tabIndex={-1} aria-hidden="true" />
      <input type="hidden" name="turnstileToken" value="" />

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label htmlFor="lead-email" className="block text-xs font-semibold text-ink mb-1">
            Work Email Address <span className="text-danger">*</span>
          </label>
          <input
            id="lead-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="eng-finance@company.com"
            className="w-full bg-canvas border border-border text-ink rounded-xs px-3 py-2 text-xs min-h-[44px] focus-visible:outline-2 focus-visible:outline-ink"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="lead-company" className="block text-xs font-semibold text-ink mb-1">
              Company Name
            </label>
            <input
              id="lead-company"
              type="text"
              autoComplete="organization"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Acme Corp"
              className="w-full bg-canvas border border-border text-ink rounded-xs px-3 py-2 text-xs min-h-[44px] focus-visible:outline-2 focus-visible:outline-ink"
            />
          </div>
          <div>
            <label htmlFor="lead-role" className="block text-xs font-semibold text-ink mb-1">
              Your Role
            </label>
            <input
              id="lead-role"
              type="text"
              autoComplete="organization-title"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="CTO / Head of Eng"
              className="w-full bg-canvas border border-border text-ink rounded-xs px-3 py-2 text-xs min-h-[44px] focus-visible:outline-2 focus-visible:outline-ink"
            />
          </div>
        </div>

        {/* Lead Consent Checkbox */}
        <div className="flex items-start gap-2.5 pt-1">
          <input
            id="lead-consent"
            type="checkbox"
            checked={consentGiven}
            onChange={(e) => setConsentGiven(e.target.checked)}
            className="mt-0.5 rounded-xs border-border text-ink focus-visible:ring-2 focus-visible:ring-ink min-h-[20px] min-w-[20px] cursor-pointer"
          />
          <label htmlFor="lead-consent" className="text-[11px] text-ink-muted leading-relaxed cursor-pointer">
            I agree to receive the executive spend audit and agree to the SpendLens{" "}
            <Link href="/terms" className="text-action-text underline">Terms</Link> and{" "}
            <Link href="/privacy" className="text-action-text underline">Privacy Policy</Link>. You can unsubscribe at any time.
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-action-fill text-action-fill-foreground font-semibold py-2.5 px-4 rounded-xs text-xs min-h-[44px] hover:bg-action-fill-hover disabled:opacity-50 transition-standard flex items-center justify-center gap-2 cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" strokeWidth={1.75} />
          {loading ? "Registering Request..." : "Request Spend Consultation & Export"}
        </button>
      </form>
    </div>
  );
}

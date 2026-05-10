"use client";

import { useState } from "react";

interface LeadCaptureProps {
  auditId: string;
  totalMonthlySavings: number;
}

export default function LeadCapture({ auditId, totalMonthlySavings }: LeadCaptureProps) {
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [role, setRole] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auditId, email, companyName, role }),
      });
      setSubmitted(true);
    } catch {}
    setLoading(false);
  }

  if (submitted) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
        <p className="text-2xl mb-2">🎉</p>
        <h3 className="font-bold text-emerald-900 text-lg mb-1">Report sent!</h3>
        <p className="text-emerald-700 text-sm">
          Check your email for your full audit report.
          {totalMonthlySavings > 500 && " A Credex advisor will reach out shortly."}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-xl p-6 space-y-4">
      <div>
        <h3 className="font-bold text-gray-900 text-lg">Get your full report</h3>
        <p className="text-gray-600 text-sm mt-1">
          We will email you the complete audit with all recommendations.
        </p>
      </div>

      {/* Honeypot field - hidden from real users */}
      <input type="text" name="website" className="hidden" tabIndex={-1} />

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">Email address *</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Company name</label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Acme Inc."
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Your role</label>
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="CTO, Engineering Manager..."
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-emerald-600 text-white py-2.5 rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-40 transition-colors"
        >
          {loading ? "Sending..." : "Send me the report →"}
        </button>
      </form>
    </div>
  );
}
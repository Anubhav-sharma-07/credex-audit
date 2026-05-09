"use client";

import { useState } from "react";
import SpendForm from "@/components/SpendForm";
import type { AuditResult } from "@/types";

export default function Home() {
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            AI Spend Audit
          </h1>
          <p className="text-lg text-gray-600">
            Find out where you're overspending on AI tools in 2 minutes. Free.
          </p>
        </div>

        {!auditResult ? (
          <SpendForm onAuditComplete={setAuditResult} />
        ) : (
          <div className="bg-white rounded-xl p-8 shadow">
            <h2 className="text-2xl font-bold mb-4">Your Audit Results</h2>
            <p className="text-gray-600 mb-4">Total monthly spend: <strong>${auditResult.totalMonthlySpend}</strong></p>
            <p className="text-emerald-600 font-bold text-xl">Potential savings: ${auditResult.totalMonthlySavings}/mo</p>
            <button
              onClick={() => setAuditResult(null)}
              className="mt-6 text-sm text-gray-500 underline"
            >
              ← Start over
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
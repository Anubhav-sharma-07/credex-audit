"use client";

import { useState } from "react";
import SpendForm from "@/components/SpendForm";
import AuditResults from "@/components/AuditResults";
import type { AuditResult } from "@/types";

export default function Home() {
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {!auditResult ? (
          <>
            <div className="text-center mb-10">
              <h1 className="text-4xl font-bold text-gray-900 mb-3">
                AI Spend Audit
              </h1>
              <p className="text-lg text-gray-600">
                Find out where you're overspending on AI tools in 2 minutes. Free.
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
  );
}
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useParams } from "next/navigation";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ResultsPage() {
  const params = useParams();
  const id = params?.id as string;
  const [audit, setAudit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    async function loadAudit() {
      const { data, error } = await supabase
        .from("audits")
        .select("*")
        .eq("id", id)
        .single();
      if (error) console.error(error);
      else setAudit(data);
      setLoading(false);
    }
    loadAudit();
  }, [id]);

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500">Loading your audit...</p>
    </main>
  );

  if (!audit) return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500">Audit not found.</p>
    </main>
  );

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your AI Spend Audit</h1>
          <p className="text-gray-500 mb-6">Team size: {audit.team_size} · Use case: {audit.use_case}</p>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-500">Monthly Spend</p>
              <p className="text-2xl font-bold text-gray-900">${audit.total_monthly_spend}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-500">Monthly Savings</p>
              <p className="text-2xl font-bold text-green-600">${audit.total_monthly_savings}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-500">Annual Savings</p>
              <p className="text-2xl font-bold text-green-600">${audit.total_annual_savings}</p>
            </div>
          </div>
          {audit.summary && (
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <h2 className="font-semibold text-blue-900 mb-2">AI Summary</h2>
              <p className="text-blue-800 text-sm">{audit.summary}</p>
            </div>
          )}
          <button
            onClick={copyLink}
            className="w-full bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-gray-700 transition"
          >
            {copied ? "✅ Link Copied!" : "🔗 Copy Shareable Link"}
          </button>
        </div>
      </div>
    </main>
  );
}
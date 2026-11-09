"use client";

import { useEffect, useState, use, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Edit2, Trash2, ShieldCheck, History, Calendar, Mail, FileText } from "lucide-react";
import type { Subscription, PriceHistoryEntry, DecisionStatus } from "@/modules/workspace/types";
import {
  getSubscriptionById,
  getPriceHistory,
  updateSubscription,
  deleteSubscription,
} from "@/modules/workspace/subscriptions";
import { formatMinorToUsd } from "@/modules/audit/money";
import SubscriptionSheet from "@/components/workspace/SubscriptionSheet";

const WORKSPACE_ID = "ws_default_demo";

export default function SubscriptionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const router = useRouter();

  const [sub, setSub] = useState<Subscription | null>(null);
  const [history, setHistory] = useState<PriceHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const subscription = await getSubscriptionById(WORKSPACE_ID, id);
      setSub(subscription);
      if (subscription) {
        const hist = await getPriceHistory(id);
        setHistory(hist);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleDecisionChange(decisionStatus: DecisionStatus) {
    if (!sub) return;
    const updated = await updateSubscription(WORKSPACE_ID, sub.id, { decisionStatus });
    setSub(updated);
  }

  async function handleDelete() {
    if (!sub || !confirm(`Are you sure you want to delete ${sub.vendorName}?`)) return;
    await deleteSubscription(WORKSPACE_ID, sub.id);
    router.push("/subscriptions");
  }

  if (loading) {
    return <div className="p-12 text-center text-gray-500">Loading subscription details...</div>;
  }

  if (!sub) {
    return (
      <div className="p-12 text-center">
        <p className="text-lg font-bold text-gray-800">Subscription not found</p>
        <Link href="/subscriptions" className="mt-4 text-emerald-600 hover:underline inline-block">
          ← Back to subscriptions
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/subscriptions"
          className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Subscriptions
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Edit2 className="w-4 h-4 text-gray-500" />
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{sub.vendorName}</h1>
              <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-0.5 rounded-full border border-emerald-200">
                {sub.status.toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {sub.planName} Plan · {sub.category.replace(/_/g, " ")}
            </p>
          </div>

          <div className="text-right">
            <p className="text-3xl font-extrabold text-gray-900">{formatMinorToUsd(sub.costMinor)}</p>
            <p className="text-xs text-gray-400">
              per {sub.billingFrequency === "annual" ? "year (annualized)" : "month"} · {sub.seats} {sub.seats === 1 ? "seat" : "seats"}
            </p>
          </div>
        </div>

        {/* Decision & Action Bar */}
        <div className="bg-gray-50 p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Renewal Decision</p>
            <p className="text-sm text-gray-800 font-medium capitalize mt-0.5">
              Current status: <span className="font-bold">{sub.decisionStatus}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            {(["keep", "review", "cancel"] as DecisionStatus[]).map((st) => (
              <button
                key={st}
                onClick={() => handleDecisionChange(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                  sub.decisionStatus === st
                    ? st === "keep"
                      ? "bg-emerald-600 text-white"
                      : st === "cancel"
                      ? "bg-red-600 text-white"
                      : "bg-amber-500 text-white"
                    : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Metadata Details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="p-4 rounded-xl border border-gray-100 flex items-start gap-3">
            <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-xs text-gray-400 font-medium">Renewal Date</p>
              <p className="font-semibold text-gray-800 mt-0.5">{sub.renewalDate || "Not scheduled"}</p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-gray-100 flex items-start gap-3">
            <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-xs text-gray-400 font-medium">Owner</p>
              <p className="font-semibold text-gray-800 mt-0.5">{sub.ownerEmail || "Unassigned"}</p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-gray-100 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-xs text-gray-400 font-medium">Billing Cycle</p>
              <p className="font-semibold text-gray-800 mt-0.5 capitalize">{sub.billingFrequency}</p>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-gray-500" />
            Internal Notes
          </h3>
          <p className="text-sm text-gray-600 bg-gray-50 p-4 rounded-xl border border-gray-100 leading-relaxed">
            {sub.notes || "No internal notes recorded for this subscription."}
          </p>
        </div>

        {/* Price History */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-3">
            <History className="w-4 h-4 text-gray-500" />
            Price History Audit Trail
          </h3>
          {history.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No price adjustments recorded yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden text-sm">
              {history.map((h) => (
                <li key={h.id} className="p-3 flex items-center justify-between bg-white">
                  <div>
                    <p className="font-semibold text-gray-800">{formatMinorToUsd(h.costMinor)}</p>
                    <p className="text-xs text-gray-500">{h.reason}</p>
                  </div>
                  <span className="text-xs text-gray-400">{h.effectiveDate}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <SubscriptionSheet
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSuccess={loadData}
        subscriptionToEdit={sub}
        workspaceId={WORKSPACE_ID}
      />
    </div>
  );
}

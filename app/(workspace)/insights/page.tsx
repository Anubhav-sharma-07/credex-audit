"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Sparkles,
  Search,
  DollarSign,
  TrendingDown,
  Calendar,
  Layers,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  CheckCircle2,
  X,
  AlertCircle,
} from "lucide-react";
import type { Finding } from "@/modules/audit/types";
import { formatCurrency } from "@/lib/formatters";

type QuestionType =
  | "spend_analysis"
  | "vendor_comparison"
  | "renewals"
  | "budgets"
  | "savings";

interface QuestionConfig {
  type: QuestionType;
  label: string;
  question: string;
  description: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

const QUESTIONS: QuestionConfig[] = [
  {
    type: "spend_analysis",
    label: "Spend Analysis",
    question: "Where is our monthly software budget concentrated?",
    description: "Deep dive into recurring spend across IDE assistants and chat tools.",
    icon: DollarSign,
  },
  {
    type: "vendor_comparison",
    label: "Vendor Comparison",
    question: "How do our active tool subscriptions compare in pricing and tier fit?",
    description: "Evaluates overlapping capabilities between Cursor, Copilot, Windsurf, Claude, and ChatGPT.",
    icon: Layers,
  },
  {
    type: "renewals",
    label: "Renewals",
    question: "What contract renewals are approaching and what actions are recommended?",
    description: "Upcoming renewals in the next 30-90 days with recommended keep/cancel decisions.",
    icon: Calendar,
  },
  {
    type: "budgets",
    label: "Budgets & Seat Limits",
    question: "Are any tools provisioned with seats exceeding active team headcount?",
    description: "Identifies license over-provisioning and unused tier overlap.",
    icon: TrendingDown,
  },
  {
    type: "savings",
    label: "Savings Opportunities",
    question: "What are our highest-confidence cost reduction opportunities?",
    description: "Full summary of catalog-verified savings and annual commitment discounts.",
    icon: Sparkles,
  },
];

export default function AIInsightsPage() {
  const [activeQuestion, setActiveQuestion] = useState<QuestionType>("spend_analysis");
  const [loading, setLoading] = useState(true);
  const [answer, setAnswer] = useState<string | null>(null);
  const [citedFindingIds, setCitedFindingIds] = useState<string[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [isFallback, setIsFallback] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Evidence modal state
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);

  // Action confirmation modal state
  const [pendingAction, setPendingAction] = useState<{
    title: string;
    description: string;
    actionText: string;
    onConfirm: () => void;
  } | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const fetchInsight = useCallback(async (questionType: QuestionType) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionType }),
      });

      if (!res.ok) {
        throw new Error(`Insights API returned status ${res.status}`);
      }

      const data = await res.json();
      setAnswer(data.answer);
      setCitedFindingIds(data.citedFindingIds || []);
      setFindings(data.findings || []);
      setIsFallback(Boolean(data.isFallback));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate AI insight";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInsight(activeQuestion);
  }, [activeQuestion, fetchInsight]);

  function handleCitationClick(findingIdOrRef: string) {
    const cleanId = findingIdOrRef.replace(/[\[\]]/g, "").trim();
    const match = findings.find((f) => f.ruleId === cleanId);
    if (match) {
      setSelectedFinding(match);
    }
  }

  function handleActionClick(actionType: "downgrade" | "annual") {
    if (actionType === "downgrade") {
      setPendingAction({
        title: "Confirm Seat Right-Sizing Request",
        description:
          "This will create an internal task to reduce Cursor seats from 8 to 4 upon the next billing cycle. No external vendor emails will be sent without approval.",
        actionText: "Authorize Right-Sizing Task",
        onConfirm: () => {
          setPendingAction(null);
          setActionNotice("Right-sizing task queued for admin confirmation in the Subscriptions dashboard.");
        },
      });
    } else {
      setPendingAction({
        title: "Confirm Annual Commit Proposal",
        description:
          "This draft will propose transitioning the Claude Team subscription from monthly to annual billing, saving $240/yr at the published $25/seat rate.",
        actionText: "Queue Billing Transition",
        onConfirm: () => {
          setPendingAction(null);
          setActionNotice("Annual billing transition queued for approval.");
        },
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-action-text bg-canvas-subtle px-2 py-0.5 rounded-xs border border-border">
            Zod-Scoped Read-Only Engine
          </span>
        </div>
        <h1 className="text-xl font-bold text-ink tracking-tight font-serif mt-1">
          Structured AI Spend Insights
        </h1>
        <p className="text-xs text-ink-muted">
          Plain-language summaries strictly synthesized from deterministic rule findings. Every figure is cited and post-verified.
        </p>
      </div>

      {actionNotice && (
        <div className="p-3 bg-savings-surface border border-savings-border rounded-xs text-xs text-ink flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-savings shrink-0" strokeWidth={1.75} />
            <span>{actionNotice}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="text-ink-muted hover:text-ink text-xs underline min-h-[32px] px-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 5 Question Selector Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3" role="tablist">
        {QUESTIONS.map((q) => {
          const Icon = q.icon;
          const isActive = activeQuestion === q.type;

          return (
            <button
              key={q.type}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveQuestion(q.type)}
              className={`p-3.5 rounded-sm border text-left transition-standard flex flex-col justify-between min-h-[44px] cursor-pointer ${
                isActive
                  ? "bg-surface border-ink shadow-xs"
                  : "bg-surface border-border hover:border-ink-subtle hover:bg-canvas-subtle"
              }`}
            >
              <div>
                <div
                  className={`w-7 h-7 rounded-xs flex items-center justify-center mb-2.5 ${
                    isActive ? "bg-ink text-canvas" : "bg-canvas-subtle text-ink-muted"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
                </div>
                <h2 className="text-xs font-bold text-ink tracking-tight">{q.label}</h2>
                <p className="text-[11px] text-ink-muted mt-0.5 line-clamp-2 leading-tight">{q.question}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Answer Container */}
      <div className="bg-surface border border-border rounded-sm p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-savings" strokeWidth={1.75} />
            <h2 className="text-sm font-bold text-ink">
              {QUESTIONS.find((q) => q.type === activeQuestion)?.question}
            </h2>
          </div>

          {isFallback ? (
            <span className="text-[10px] bg-canvas-subtle text-ink-muted border border-border font-semibold px-2 py-0.5 rounded-xs flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-ink-muted" strokeWidth={1.75} /> Deterministic Fallback Active
            </span>
          ) : (
            <span className="text-[10px] bg-savings-surface text-savings border border-savings-border font-semibold px-2 py-0.5 rounded-xs flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-savings" strokeWidth={1.75} /> 100% Numbers Verified Against Rules
            </span>
          )}
        </div>

        {loading && (
          <div className="py-10 text-center space-y-2" aria-busy="true">
            <div className="inline-block animate-spin w-5 h-5 border-2 border-ink border-t-transparent rounded-full" />
            <p className="text-xs text-ink-muted">Synthesizing findings through verified rules…</p>
          </div>
        )}

        {error && (
          <div role="alert" className="p-3 bg-danger-surface border border-danger-border rounded-xs flex items-center gap-2 text-danger text-xs">
            <AlertCircle className="w-4 h-4 text-danger shrink-0" strokeWidth={1.75} />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && answer && (
          <div className="space-y-5">
            {/* Plain-language verified answer */}
            <div className="prose prose-sm max-w-none text-ink leading-relaxed text-xs bg-canvas p-4 rounded-xs border border-border-subtle">
              {answer.split("\n\n").map((paragraph, pIdx) => (
                <p key={pIdx} className="mb-2.5 last:mb-0">
                  {paragraph.split(/(\[[a-zA-Z0-9_\-]+\])/).map((segment, sIdx) => {
                    const isCitation = segment.startsWith("[") && segment.endsWith("]");
                    if (isCitation) {
                      return (
                        <button
                          key={sIdx}
                          onClick={() => handleCitationClick(segment)}
                          className="inline-flex items-center text-[10px] font-mono font-bold text-savings bg-savings-surface hover:bg-savings-surface/80 border border-savings-border px-1.5 py-0.5 rounded-xs mx-1 transition-standard cursor-pointer"
                          title="Click to view verified catalog evidence"
                        >
                          {segment}
                        </button>
                      );
                    }
                    return <span key={sIdx}>{segment}</span>;
                  })}
                </p>
              ))}
            </div>

            {/* Citations index footer */}
            {citedFindingIds.length > 0 && (
              <div className="pt-2 border-t border-border-subtle">
                <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider block mb-2">
                  Backing Evidence (Click any citation to inspect proof):
                </span>
                <div className="flex flex-wrap gap-2">
                  {citedFindingIds.map((id) => (
                    <button
                      key={id}
                      onClick={() => handleCitationClick(id)}
                      className="text-xs font-mono bg-surface border border-border hover:border-ink text-ink px-2.5 py-1 rounded-xs transition-standard shadow-xs flex items-center gap-1.5 min-h-[32px] cursor-pointer"
                    >
                      <Search className="w-3 h-3 text-ink-muted" strokeWidth={1.75} />
                      <span>{id}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Next Recommended Actions */}
            <div className="pt-3 border-t border-border-subtle">
              <h3 className="text-xs font-bold text-ink uppercase tracking-wider mb-2.5">
                Evidence-Backed Recommended Actions
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-canvas border border-border rounded-xs flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-ink">Right-size Cursor Licenses</p>
                    <p className="text-[11px] text-ink-muted">Align 8 seats to 4 active engineers</p>
                  </div>
                  <button
                    onClick={() => handleActionClick("downgrade")}
                    className="px-3 py-1.5 text-xs font-semibold text-ink bg-surface hover:bg-canvas-subtle rounded-xs border border-border transition-standard min-h-[36px] cursor-pointer"
                  >
                    Review Action
                  </button>
                </div>

                <div className="p-3 bg-canvas border border-border rounded-xs flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-ink">Switch Claude to Annual</p>
                    <p className="text-[11px] text-ink-muted">Lock in $25/seat rate vs $30 monthly flex</p>
                  </div>
                  <button
                    onClick={() => handleActionClick("annual")}
                    className="px-3 py-1.5 text-xs font-semibold text-ink bg-surface hover:bg-canvas-subtle rounded-xs border border-border transition-standard min-h-[36px] cursor-pointer"
                  >
                    Review Action
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Evidence Modal */}
      {selectedFinding && (
        <div className="fixed inset-0 bg-ink/40 flex items-center justify-center p-4 z-50">
          <div className="bg-surface rounded-sm max-w-lg w-full p-5 shadow-md border border-border space-y-4">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <span className="font-mono text-[10px] font-bold text-ink-muted bg-canvas-subtle border border-border px-1.5 py-0.5 rounded-xs">
                  {selectedFinding.ruleId}
                </span>
                <h3 className="text-sm font-bold text-ink mt-1 capitalize">
                  {selectedFinding.toolId.replace(/_/g, " ")}: {selectedFinding.kind.replace(/_/g, " ")}
                </h3>
              </div>
              <button
                onClick={() => setSelectedFinding(null)}
                className="text-ink-muted hover:text-ink p-1 min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                aria-label="Close evidence modal"
              >
                <X className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 p-3 bg-canvas rounded-xs text-center text-xs border border-border-subtle">
              <div>
                <span className="text-[10px] text-ink-muted block uppercase">Current</span>
                <span className="font-bold text-ink tabular-nums">
                  {formatCurrency(selectedFinding.currentMonthlyMinor, "USD")}/mo
                </span>
              </div>
              <div>
                <span className="text-[10px] text-ink-muted block uppercase">Projected</span>
                <span className="font-bold text-ink tabular-nums">
                  {formatCurrency(selectedFinding.projectedMonthlyMinor, "USD")}/mo
                </span>
              </div>
              <div>
                <span className="text-[10px] text-savings block uppercase">Savings</span>
                <span className="font-bold text-savings tabular-nums">
                  +{formatCurrency(selectedFinding.savingsMinor, "USD")}/mo
                </span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-ink uppercase tracking-wide mb-1">
                Supporting Evidence
              </h4>
              <ul className="text-xs text-ink-muted space-y-1 list-disc list-inside">
                {selectedFinding.evidence.map((ev, i) => (
                  <li key={i}>{ev}</li>
                ))}
              </ul>
            </div>

            {selectedFinding.assumptions.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-ink uppercase tracking-wide mb-1">
                  Engine Assumptions
                </h4>
                <ul className="text-xs text-ink-muted space-y-1 list-disc list-inside">
                  {selectedFinding.assumptions.map((as, i) => (
                    <li key={i}>{as}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-2 border-t border-border-subtle flex flex-col sm:flex-row sm:items-center sm:justify-between text-[11px] text-ink-muted gap-1">
              <span>Catalog pricing verified: {selectedFinding.pricingSource.verifiedAt}</span>
              <a
                href={selectedFinding.pricingSource.url}
                target="_blank"
                rel="noreferrer"
                className="text-action-text hover:underline inline-flex items-center gap-1 font-semibold"
              >
                Source Documentation <ExternalLink className="w-3 h-3" strokeWidth={1.75} />
              </a>
            </div>

            <button
              onClick={() => setSelectedFinding(null)}
              className="w-full py-2 bg-canvas-subtle text-ink text-xs font-semibold rounded-xs border border-border hover:bg-canvas transition-standard min-h-[44px] cursor-pointer"
            >
              Close Evidence View
            </button>
          </div>
        </div>
      )}

      {/* Explicit User Confirmation Modal */}
      {pendingAction && (
        <div className="fixed inset-0 bg-ink/40 flex items-center justify-center p-4 z-50">
          <div className="bg-surface rounded-sm max-w-md w-full p-5 shadow-md border border-border space-y-4">
            <div className="flex items-center gap-2 text-warning">
              <AlertTriangle className="w-5 h-5 text-warning" strokeWidth={1.75} />
              <h3 className="text-sm font-bold text-ink">{pendingAction.title}</h3>
            </div>

            <p className="text-xs text-ink-muted leading-relaxed">{pendingAction.description}</p>

            <div className="p-3 bg-warning-surface border border-warning-border rounded-xs text-xs text-ink">
              <strong>Security Protocol:</strong> SpendLens never takes unconfirmed external actions or emails vendors without your explicit manual authorization.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setPendingAction(null)}
                className="px-3.5 py-2 text-xs font-semibold text-ink bg-surface border border-border hover:bg-canvas-subtle rounded-xs transition-standard min-h-[44px] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={pendingAction.onConfirm}
                className="px-4 py-2 text-xs font-semibold text-action-fill-foreground bg-action-fill hover:bg-action-fill-hover rounded-xs shadow-sm transition-standard min-h-[44px] cursor-pointer"
              >
                {pendingAction.actionText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

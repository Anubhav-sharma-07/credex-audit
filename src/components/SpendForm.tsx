"use client";

import { useState, useEffect, useRef } from "react";
import type { FormState, ToolEntry, ToolName, PlanName, UseCase } from "@/types";
import { TOOL_LABELS, PLAN_LABELS } from "@/lib/pricing";
import { runAudit } from "@/lib/auditEngine";
import { AlertCircle, ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";

const STORAGE_KEY = "credex_audit_form";

const TOOL_PLANS: Record<ToolName, PlanName[]> = {
  cursor: ["hobby", "pro", "business", "enterprise"],
  github_copilot: ["individual", "business", "enterprise"],
  claude: ["free", "pro", "max", "team", "enterprise", "api"],
  chatgpt: ["plus", "team", "enterprise", "api"],
  anthropic_api: ["pay_as_you_go"],
  openai_api: ["pay_as_you_go"],
  gemini: ["pro", "ultra", "api"],
  windsurf: ["free", "pro", "team"],
};

const ALL_TOOLS = Object.keys(TOOL_PLANS) as ToolName[];

const DEFAULT_FORM: FormState = {
  tools: [],
  teamSize: 4,
  useCase: "coding",
};

interface SpendFormProps {
  onAuditComplete: (result: ReturnType<typeof runAudit>) => void;
}

export default function SpendForm({ onAuditComplete }: SpendFormProps) {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [activeTools, setActiveTools] = useState<Set<ToolName>>(new Set());
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const teamSizeRef = useRef<HTMLInputElement>(null);
  const toolToggleContainerRef = useRef<HTMLDivElement>(null);

  // Load persisted form on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as { form: FormState; activeTools: ToolName[] };
      const uniqueTools: ToolEntry[] = Array.from(
        new Map(parsed.form.tools.map((t: ToolEntry) => [t.tool, t])).values()
      );
      setForm({ ...parsed.form, tools: uniqueTools });
      setActiveTools(new Set(parsed.activeTools));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Persist form on change
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ form, activeTools: Array.from(activeTools) })
      );
    } catch {}
  }, [form, activeTools]);

  function toggleTool(tool: ToolName) {
    setErrors((prev) => {
      const next = { ...prev };
      delete next.tools;
      return next;
    });

    setActiveTools((prev) => {
      const next = new Set(prev);
      if (next.has(tool)) {
        next.delete(tool);
        setForm((f) => ({ ...f, tools: f.tools.filter((t) => t.tool !== tool) }));
      } else {
        next.add(tool);
        setForm((f) => {
          if (f.tools.some((t) => t.tool === tool)) return f;
          return {
            ...f,
            tools: [
              ...f.tools,
              { tool, plan: TOOL_PLANS[tool][1] ?? TOOL_PLANS[tool][0], seats: form.teamSize, monthlySpend: 0 },
            ],
          };
        });
      }
      return next;
    });
  }

  function updateToolEntry(tool: ToolName, field: keyof ToolEntry, value: string | number) {
    setForm((f) => ({
      ...f,
      tools: f.tools.map((t) => (t.tool === tool ? { ...t, [field]: value } : t)),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (form.teamSize < 1) {
      newErrors.teamSize = "Team size must be at least 1 engineer.";
    }

    if (form.tools.length === 0) {
      newErrors.tools = "Select at least one tool to evaluate spend.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      if (newErrors.teamSize && teamSizeRef.current) {
        teamSizeRef.current.focus();
      } else if (newErrors.tools && toolToggleContainerRef.current) {
        toolToggleContainerRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const result = runAudit(form.tools, form.teamSize, form.useCase);

      const resp = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tools: result.tools,
          summary: result.summary,
          teamSize: form.teamSize,
          useCase: form.useCase,
        }),
      });

      if (!resp.ok) throw new Error("Failed to persist audit result");
      const data = await resp.json();
      const token = data.token || data.id;

      onAuditComplete(result);
      if (token) {
        window.location.href = `/results/${token}`;
      }
    } catch (err) {
      console.error(err);
      const fallbackResult = runAudit(form.tools, form.teamSize, form.useCase);
      onAuditComplete(fallbackResult);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="bg-surface border border-border rounded-sm shadow-sm p-6 sm:p-8 space-y-8"
      aria-label="Engineering AI Tool Spend Audit Form"
    >
      <div className="border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-savings" strokeWidth={1.75} />
          <span className="text-[10px] font-mono uppercase tracking-wider text-savings font-semibold">
            Deterministic Engine • ISO-4217 USD
          </span>
        </div>
        <h2 className="text-lg font-bold text-ink mt-1">Audit Configuration</h2>
        <p className="text-xs text-ink-muted mt-0.5">
          Provide your team size and tool subscriptions to identify license overages and tier mismatches.
        </p>
      </div>

      {/* Team Context */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-ink uppercase tracking-wider">1. Team Headcount & Focus</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="team-size-input" className="block text-xs font-semibold text-ink mb-1">
              Active engineering headcount <span className="text-danger">*</span>
            </label>
            <input
              id="team-size-input"
              ref={teamSizeRef}
              type="number"
              min={1}
              max={1000}
              inputMode="numeric"
              autoComplete="off"
              value={form.teamSize}
              onChange={(e) => setForm((f) => ({ ...f, teamSize: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
              aria-describedby={errors.teamSize ? "team-size-error" : "team-size-helper"}
              aria-invalid={Boolean(errors.teamSize)}
              className={`w-full bg-canvas border rounded-xs px-3 py-2 text-xs text-ink focus-visible:ring-2 focus-visible:outline-hidden min-h-[44px] ${
                errors.teamSize ? "border-danger focus-visible:ring-danger" : "border-border focus-visible:ring-ink"
              }`}
              required
            />
            <p id="team-size-helper" className="text-[11px] text-ink-muted mt-1">
              Used to compute maximum seat requirements and eliminate license buffer waste.
            </p>
            {errors.teamSize && (
              <p id="team-size-error" role="alert" className="text-xs text-danger mt-1 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5" strokeWidth={1.75} />
                {errors.teamSize}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="use-case-select" className="block text-xs font-semibold text-ink mb-1">
              Primary workload profile
            </label>
            <select
              id="use-case-select"
              value={form.useCase}
              onChange={(e) => setForm((f) => ({ ...f, useCase: e.target.value as UseCase }))}
              className="w-full bg-canvas border border-border rounded-xs px-3 py-2 text-xs text-ink focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-hidden min-h-[44px]"
            >
              <option value="coding">Software Engineering (IDE Assistants & Code Gen)</option>
              <option value="writing">Technical Documentation & PRDs</option>
              <option value="data">Data Analysis & Pipelines</option>
              <option value="research">Architecture Research & Synthesis</option>
              <option value="mixed">General Mixed Engineering</option>
            </select>
            <p className="text-[11px] text-ink-muted mt-1">
              Calibrates model tier recommendations against task complexity.
            </p>
          </div>
        </div>
      </div>

      {/* Tool Toggles */}
      <div className="space-y-4" ref={toolToggleContainerRef}>
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-ink uppercase tracking-wider">
            2. Active Subscriptions <span className="text-danger">*</span>
          </h3>
          <span className="text-[11px] text-ink-muted font-mono">{activeTools.size} selected</span>
        </div>

        {errors.tools && (
          <div role="alert" className="p-3 bg-danger-surface border border-danger-border rounded-xs flex items-center gap-2 text-xs text-danger">
            <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={1.75} />
            <span>{errors.tools}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-2" role="group" aria-label="Select active AI tools">
          {ALL_TOOLS.map((tool) => {
            const isSelected = activeTools.has(tool);
            return (
              <button
                key={tool}
                type="button"
                onClick={() => toggleTool(tool)}
                aria-pressed={isSelected}
                className={`px-3 py-2 text-xs font-semibold rounded-xs border min-h-[44px] transition-standard flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-ink ${
                  isSelected
                    ? "bg-ink text-neutral-1 border-ink"
                    : "bg-canvas border-border text-ink hover:bg-canvas-subtle"
                }`}
              >
                {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-action-fill" strokeWidth={1.75} />}
                <span>{TOOL_LABELS[tool]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Per-Tool Details Table */}
      {form.tools.length > 0 && (
        <div className="space-y-4 pt-2 border-t border-border">
          <h3 className="text-xs font-bold text-ink uppercase tracking-wider">
            3. Plan & Actual Monthly Spend Details
          </h3>

          <div className="space-y-3">
            {form.tools.map((entry) => (
              <div
                key={entry.tool}
                className="p-4 bg-canvas-subtle border border-border rounded-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink">{TOOL_LABELS[entry.tool]}</span>
                  <button
                    type="button"
                    onClick={() => toggleTool(entry.tool)}
                    className="text-[11px] text-action-text hover:underline focus-visible:ring-2 rounded-xs"
                  >
                    Remove
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label
                      htmlFor={`plan-${entry.tool}`}
                      className="block text-[11px] font-semibold text-ink mb-1"
                    >
                      Provisioned Plan
                    </label>
                    <select
                      id={`plan-${entry.tool}`}
                      value={entry.plan}
                      onChange={(e) => updateToolEntry(entry.tool, "plan", e.target.value as PlanName)}
                      className="w-full bg-surface border border-border rounded-xs px-2.5 py-1.5 text-xs text-ink focus-visible:ring-2 focus-visible:ring-ink min-h-[44px]"
                    >
                      {TOOL_PLANS[entry.tool].map((plan) => (
                        <option key={plan} value={plan}>
                          {PLAN_LABELS[plan] ?? plan}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor={`seats-${entry.tool}`}
                      className="block text-[11px] font-semibold text-ink mb-1"
                    >
                      Allocated Seats
                    </label>
                    <input
                      id={`seats-${entry.tool}`}
                      type="number"
                      min={1}
                      max={1000}
                      inputMode="numeric"
                      value={entry.seats}
                      onChange={(e) => updateToolEntry(entry.tool, "seats", Math.max(1, Number(e.target.value)))}
                      className="w-full bg-surface border border-border rounded-xs px-2.5 py-1.5 text-xs text-ink tabular-nums focus-visible:ring-2 focus-visible:ring-ink min-h-[44px]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={`spend-${entry.tool}`}
                      className="block text-[11px] font-semibold text-ink mb-1"
                    >
                      Actual Monthly Spend ($)
                    </label>
                    <input
                      id={`spend-${entry.tool}`}
                      type="number"
                      min={0}
                      step={0.01}
                      inputMode="decimal"
                      value={entry.monthlySpend || ""}
                      onChange={(e) => updateToolEntry(entry.tool, "monthlySpend", parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full bg-surface border border-border rounded-xs px-2.5 py-1.5 text-xs text-ink tabular-nums focus-visible:ring-2 focus-visible:ring-ink min-h-[44px]"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submit Action (Burnt Orange Fill with Charcoal Text) */}
      <div className="pt-4 border-t border-border">
        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-action-fill text-action-fill-foreground hover:bg-action-fill-hover font-bold text-xs uppercase tracking-wider rounded-xs transition-standard min-h-[44px] shadow-xs disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-ink"
        >
          {loading ? (
            <span>Computing Deterministic Savings…</span>
          ) : (
            <>
              <span>Run Free Spend Audit</span>
              <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
            </>
          )}
        </button>
        <p className="text-[11px] text-ink-muted text-center mt-2">
          Pure deterministic evaluation. No marketing fluff, no spam, and no credentials required.
        </p>
      </div>
    </form>
  );
}

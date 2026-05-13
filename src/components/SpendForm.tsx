"use client";

import { useState, useEffect } from "react";
import type { FormState, ToolEntry, ToolName, PlanName, UseCase } from "@/types";
import { TOOL_LABELS, PLAN_LABELS } from "@/lib/pricing";
import { runAudit } from "@/lib/auditEngine";

const STORAGE_KEY = "credex_audit_form";

const TOOL_PLANS: Record<ToolName, PlanName[]> = {
  cursor:         ["hobby", "pro", "business", "enterprise"],
  github_copilot: ["individual", "business", "enterprise"],
  claude:         ["free", "pro", "max", "team", "enterprise", "api"],
  chatgpt:        ["plus", "team", "enterprise", "api"],
  anthropic_api:  ["pay_as_you_go"],
  openai_api:     ["pay_as_you_go"],
  gemini:         ["pro", "ultra", "api"],
  windsurf:       ["free", "pro", "team"],
};

const ALL_TOOLS = Object.keys(TOOL_PLANS) as ToolName[];

const DEFAULT_FORM: FormState = {
  tools: [],
  teamSize: 1,
  useCase: "mixed",
};

interface SpendFormProps {
  onAuditComplete: (result: ReturnType<typeof runAudit>) => void;
}

export default function SpendForm({ onAuditComplete }: SpendFormProps) {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [activeTools, setActiveTools] = useState<Set<ToolName>>(new Set());

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const uniqueTools = Array.from(
          new Map(parsed.form.tools.map((t: any) => [t.tool, t])).values()
        );
        setForm({ ...parsed.form, tools: uniqueTools as any });
        setActiveTools(new Set(parsed.activeTools));
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ form, activeTools: Array.from(activeTools) })
      );
    } catch {}
  }, [form, activeTools]);

  function toggleTool(tool: ToolName) {
    setActiveTools((prev) => {
      const next = new Set(prev);
      if (next.has(tool)) {
        next.delete(tool);
        setForm((f) => ({ ...f, tools: f.tools.filter((t) => t.tool !== tool) }));
      } else {
        next.add(tool);
        setForm((f) => {
          const alreadyExists = f.tools.some((t) => t.tool === tool);
          if (alreadyExists) return f;
          return {
            ...f,
            tools: [...f.tools, { tool, plan: TOOL_PLANS[tool][1] ?? TOOL_PLANS[tool][0], seats: 1, monthlySpend: 0 }],
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

  const [loading, setLoading] = useState(false);

function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  if (form.tools.length === 0) return;
  setLoading(true);
  const result = runAudit(form.tools, form.teamSize, form.useCase);
  onAuditComplete(result);
}

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl mx-auto p-6">
      {/* Team context */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Your team</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Team size</label>
            <input
              type="number"
              min={1}
              value={form.teamSize}
              onChange={(e) => setForm((f) => ({ ...f, teamSize: Number(e.target.value) }))}
              className="w-full border rounded-md px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Primary use case</label>
            <select
              value={form.useCase}
              onChange={(e) => setForm((f) => ({ ...f, useCase: e.target.value as UseCase }))}
              className="w-full border rounded-md px-3 py-2 text-sm"
            >
              <option value="coding">Coding</option>
              <option value="writing">Writing</option>
              <option value="data">Data / Analysis</option>
              <option value="research">Research</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tool toggles */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Which AI tools do you pay for?</h2>
        <div className="flex flex-wrap gap-2">
          {ALL_TOOLS.map((tool) => (
            <button
              key={tool}
              type="button"
              onClick={() => toggleTool(tool)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors cursor-pointer ${
                activeTools.has(tool)
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-gray-700 border-gray-300 hover:border-emerald-400"
              }`}
            >
              {TOOL_LABELS[tool]}
            </button>
          ))}
        </div>
      </div>

      {/* Per-tool details */}
      {form.tools.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Plan & spend details</h2>
          {form.tools.map((entry) => (
            <div key={entry.tool} className="border rounded-lg p-4 space-y-3">
              <h3 className="font-semibold">{TOOL_LABELS[entry.tool]}</h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Plan</label>
                  <select
                    value={entry.plan}
                    onChange={(e) => updateToolEntry(entry.tool, "plan", e.target.value as PlanName)}
                    className="w-full border rounded px-2 py-1.5 text-sm cursor-pointer"
                  >
                    {TOOL_PLANS[entry.tool].map((plan) => (
                      <option key={plan} value={plan}>
                        {PLAN_LABELS[plan] ?? plan}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Seats</label>
                  <input
                    type="number"
                    min={1}
                    value={entry.seats}
                    onChange={(e) => updateToolEntry(entry.tool, "seats", Number(e.target.value))}
                    className="w-full border rounded px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Monthly spend ($)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={entry.monthlySpend}
                    onChange={(e) => updateToolEntry(entry.tool, "monthlySpend", Number(e.target.value))}
                    className="w-full border rounded px-2 py-1.5 text-sm"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Submit */}
      <button
  type="submit"
  disabled={form.tools.length === 0 || loading}
  className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
>
  {loading ? "Running audit..." : "Run my free audit →"}
</button>
    </form>
  );
}
"use client";

import { useState, useRef } from "react";
import { X, AlertCircle } from "lucide-react";
import type { SubscriptionCategory, BillingFrequency, Subscription } from "@/modules/workspace/types";
import { createSubscription, updateSubscription } from "@/modules/workspace/subscriptions";

interface SubscriptionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  subscriptionToEdit?: Subscription | null;
  workspaceId: string;
}

export default function SubscriptionSheet({
  isOpen,
  onClose,
  onSuccess,
  subscriptionToEdit,
  workspaceId,
}: SubscriptionSheetProps) {
  const [vendorName, setVendorName] = useState(subscriptionToEdit?.vendorName || "");
  const [planName, setPlanName] = useState(subscriptionToEdit?.planName || "Pro");
  const [category, setCategory] = useState<SubscriptionCategory>(
    subscriptionToEdit?.category || "ide_assistant"
  );
  const [seats, setSeats] = useState(subscriptionToEdit?.seats || 1);
  const [monthlyCostUsd, setMonthlyCostUsd] = useState(
    subscriptionToEdit ? (subscriptionToEdit.costMinor / 100).toFixed(2) : "20.00"
  );
  const [billingFrequency, setBillingFrequency] = useState<BillingFrequency>(
    subscriptionToEdit?.billingFrequency || "monthly"
  );
  const [renewalDate, setRenewalDate] = useState(subscriptionToEdit?.renewalDate || "");
  const [ownerEmail, setOwnerEmail] = useState(subscriptionToEdit?.ownerEmail || "");
  const [notes, setNotes] = useState(subscriptionToEdit?.notes || "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const vendorRef = useRef<HTMLInputElement>(null);
  const planRef = useRef<HTMLInputElement>(null);
  const seatsRef = useRef<HTMLInputElement>(null);
  const costRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!vendorName.trim()) newErrors.vendorName = "Vendor name is required.";
    if (!planName.trim()) newErrors.planName = "Plan name is required.";
    if (seats < 1 || !Number.isInteger(seats)) newErrors.seats = "Seats must be an integer >= 1.";

    const costNum = parseFloat(monthlyCostUsd);
    if (isNaN(costNum) || costNum < 0) {
      newErrors.monthlyCostUsd = "Monthly cost must be a non-negative number.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Move focus to first invalid control
      if (newErrors.vendorName && vendorRef.current) {
        vendorRef.current.focus();
      } else if (newErrors.planName && planRef.current) {
        planRef.current.focus();
      } else if (newErrors.seats && seatsRef.current) {
        seatsRef.current.focus();
      } else if (newErrors.monthlyCostUsd && costRef.current) {
        costRef.current.focus();
      }
      return;
    }

    setSubmitting(true);
    setErrors({});

    try {
      const costMinor = Math.round(costNum * 100);

      if (subscriptionToEdit) {
        await updateSubscription(workspaceId, subscriptionToEdit.id, {
          vendorName,
          planName,
          category,
          seats,
          costMinor,
          billingFrequency,
          renewalDate: renewalDate || null,
          ownerEmail: ownerEmail || null,
          notes: notes || null,
        });
      } else {
        await createSubscription(workspaceId, {
          vendorName,
          planName,
          category,
          seats,
          costMinor,
          billingFrequency,
          renewalDate: renewalDate || null,
          ownerEmail: ownerEmail || null,
          notes: notes || null,
        });
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save subscription";
      setErrors({ form: message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sheet-title"
      className="fixed inset-0 bg-ink/50 backdrop-blur-xs flex justify-end z-50 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-surface text-ink h-full shadow-md border-l border-border p-6 flex flex-col justify-between overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div>
              <h2 id="sheet-title" className="text-base font-bold text-ink">
                {subscriptionToEdit ? "Edit Subscription" : "Add New Subscription"}
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">
                {subscriptionToEdit
                  ? "Update license parameters, pricing, and renewal decisions."
                  : "Track recurring cost and contract details for this tool."}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close subscription sheet"
              className="p-1.5 text-ink-muted hover:text-ink rounded-xs hover:bg-canvas-subtle transition-standard focus-visible:ring-2"
            >
              <X className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </div>

          {errors.form && (
            <div role="alert" className="mt-4 p-3 bg-danger-surface border border-danger-border rounded-xs text-xs text-danger flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={1.75} />
              <span>{errors.form}</span>
            </div>
          )}

          <form id="sub-form" onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
            <div>
              <label htmlFor="vendor-name-input" className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
                Vendor Name <span className="text-danger">*</span>
              </label>
              <input
                id="vendor-name-input"
                ref={vendorRef}
                type="text"
                required
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                placeholder="e.g. Cursor, Claude, OpenAI"
                aria-describedby={errors.vendorName ? "vendor-name-error" : undefined}
                aria-invalid={Boolean(errors.vendorName)}
                className={`w-full bg-canvas border rounded-xs px-3 py-2 text-xs text-ink focus-visible:ring-2 min-h-[44px] ${
                  errors.vendorName ? "border-danger focus-visible:ring-danger" : "border-border focus-visible:ring-ink"
                }`}
              />
              {errors.vendorName && (
                <p id="vendor-name-error" role="alert" className="text-xs text-danger mt-1">
                  {errors.vendorName}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="plan-name-input" className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
                  Plan Name <span className="text-danger">*</span>
                </label>
                <input
                  id="plan-name-input"
                  ref={planRef}
                  type="text"
                  required
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="e.g. Pro, Team, Business"
                  aria-describedby={errors.planName ? "plan-name-error" : undefined}
                  aria-invalid={Boolean(errors.planName)}
                  className={`w-full bg-canvas border rounded-xs px-3 py-2 text-xs text-ink focus-visible:ring-2 min-h-[44px] ${
                    errors.planName ? "border-danger focus-visible:ring-danger" : "border-border focus-visible:ring-ink"
                  }`}
                />
                {errors.planName && (
                  <p id="plan-name-error" role="alert" className="text-xs text-danger mt-1">
                    {errors.planName}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="category-select" className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
                  Category
                </label>
                <select
                  id="category-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as SubscriptionCategory)}
                  className="w-full bg-canvas border border-border rounded-xs px-3 py-2 text-xs text-ink focus-visible:ring-2 focus-visible:ring-ink min-h-[44px]"
                >
                  <option value="ide_assistant">IDE Assistant</option>
                  <option value="chat_assistant">Chat Assistant</option>
                  <option value="api">API / Direct Tokens</option>
                  <option value="general">General AI Tool</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="seats-input" className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
                  Seats <span className="text-danger">*</span>
                </label>
                <input
                  id="seats-input"
                  ref={seatsRef}
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  value={seats}
                  onChange={(e) => setSeats(parseInt(e.target.value, 10) || 1)}
                  aria-describedby={errors.seats ? "seats-error" : undefined}
                  aria-invalid={Boolean(errors.seats)}
                  className={`w-full bg-canvas border rounded-xs px-3 py-2 text-xs text-ink tabular-nums focus-visible:ring-2 min-h-[44px] ${
                    errors.seats ? "border-danger focus-visible:ring-danger" : "border-border focus-visible:ring-ink"
                  }`}
                />
                {errors.seats && (
                  <p id="seats-error" role="alert" className="text-xs text-danger mt-1">
                    {errors.seats}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="monthly-cost-input" className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
                  Monthly Cost (USD) <span className="text-danger">*</span>
                </label>
                <input
                  id="monthly-cost-input"
                  ref={costRef}
                  type="text"
                  inputMode="decimal"
                  value={monthlyCostUsd}
                  onChange={(e) => setMonthlyCostUsd(e.target.value)}
                  placeholder="0.00"
                  aria-describedby={errors.monthlyCostUsd ? "monthly-cost-error" : undefined}
                  aria-invalid={Boolean(errors.monthlyCostUsd)}
                  className={`w-full bg-canvas border rounded-xs px-3 py-2 text-xs text-ink tabular-nums focus-visible:ring-2 min-h-[44px] ${
                    errors.monthlyCostUsd ? "border-danger focus-visible:ring-danger" : "border-border focus-visible:ring-ink"
                  }`}
                />
                {errors.monthlyCostUsd && (
                  <p id="monthly-cost-error" role="alert" className="text-xs text-danger mt-1">
                    {errors.monthlyCostUsd}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="billing-freq-select" className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
                  Billing Frequency
                </label>
                <select
                  id="billing-freq-select"
                  value={billingFrequency}
                  onChange={(e) => setBillingFrequency(e.target.value as BillingFrequency)}
                  className="w-full bg-canvas border border-border rounded-xs px-3 py-2 text-xs text-ink focus-visible:ring-2 focus-visible:ring-ink min-h-[44px]"
                >
                  <option value="monthly">Monthly Flex</option>
                  <option value="annual">Annual Commitment</option>
                </select>
              </div>

              <div>
                <label htmlFor="renewal-date-input" className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
                  Renewal Date
                </label>
                <input
                  id="renewal-date-input"
                  type="date"
                  value={renewalDate}
                  onChange={(e) => setRenewalDate(e.target.value)}
                  className="w-full bg-canvas border border-border rounded-xs px-3 py-2 text-xs text-ink focus-visible:ring-2 focus-visible:ring-ink min-h-[44px]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="owner-email-input" className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
                Owner Email
              </label>
              <input
                id="owner-email-input"
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                placeholder="eng-lead@company.com"
                className="w-full bg-canvas border border-border rounded-xs px-3 py-2 text-xs text-ink focus-visible:ring-2 focus-visible:ring-ink min-h-[44px]"
              />
            </div>

            <div>
              <label htmlFor="notes-textarea" className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
                Internal Usage Context & Notes
              </label>
              <textarea
                id="notes-textarea"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Seat allocation notes, discount terms, or cancellation reminders..."
                className="w-full bg-canvas border border-border rounded-xs px-3 py-2 text-xs text-ink focus-visible:ring-2 focus-visible:ring-ink"
              />
            </div>
          </form>
        </div>

        <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-border rounded-xs text-xs font-semibold text-ink hover:bg-canvas-subtle transition-standard min-h-[44px]"
          >
            Cancel
          </button>
          <button
            form="sub-form"
            type="submit"
            disabled={submitting}
            aria-busy={submitting}
            className="px-4 py-2 bg-action-fill text-action-fill-foreground hover:bg-action-fill-hover text-xs font-semibold rounded-xs transition-standard min-h-[44px] shadow-xs disabled:opacity-50"
          >
            {submitting ? "Saving…" : subscriptionToEdit ? "Save Changes" : "Create Subscription"}
          </button>
        </div>
      </div>
    </div>
  );
}

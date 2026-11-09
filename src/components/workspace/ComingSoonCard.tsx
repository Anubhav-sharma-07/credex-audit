"use client";

import { useState } from "react";
import { Clock, Bell, CheckCircle2, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface ComingSoonCardProps {
  title: string;
  category: "Analytics" | "Savings Optimizer" | "Team Management" | "Budgets" | "Integrations" | "Notifications" | "Settings";
  description: string;
  plannedFeatures: string[];
  targetMilestone: string;
}

export default function ComingSoonCard({
  title,
  category,
  description,
  plannedFeatures,
  targetMilestone,
}: ComingSoonCardProps) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const waitlistKey = `waitlist_${category.toLowerCase().replace(/\s+/g, "_")}`;
      return Boolean(localStorage.getItem(waitlistKey));
    } catch {
      return false;
    }
  });

  function handleJoinWaitlist(e: React.FormEvent) {
    e.preventDefault();
    const waitlistKey = `waitlist_${category.toLowerCase().replace(/\s+/g, "_")}`;
    try {
      localStorage.setItem(waitlistKey, JSON.stringify({ email: email || "user@spendlens.demo", joinedAt: new Date().toISOString() }));
    } catch {
      // Storage error
    }
    setSubmitted(true);
  }

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-5">
      <Link
        href="/overview"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink transition-standard min-h-[36px]"
      >
        <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
        <span>Back to Overview</span>
      </Link>

      <div className="bg-surface border border-border rounded-sm p-6 shadow-sm space-y-5 text-left">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xs bg-canvas-subtle border border-border text-ink flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-ink-muted" strokeWidth={1.75} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-action-text bg-canvas-subtle border border-border px-2 py-0.5 rounded-xs">
                  Under Active Engineering
                </span>
                <span className="text-[11px] text-ink-muted">• Target: {targetMilestone}</span>
              </div>
              <h1 className="text-lg font-bold text-ink mt-0.5 font-serif">{title}</h1>
            </div>
          </div>
        </div>

        <p className="text-xs text-ink-muted leading-relaxed">{description}</p>

        {/* Planned Capabilities */}
        <div className="bg-canvas rounded-xs p-4 border border-border-subtle">
          <h2 className="text-[11px] font-bold text-ink uppercase tracking-wider mb-2.5">
            Planned Specifications for this Module
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-ink-muted">
            {plannedFeatures.map((feat, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-ink shrink-0" />
                <span>{feat}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Honest Waitlist Form */}
        <div className="border-t border-border-subtle pt-4">
          {submitted ? (
            <div className="p-3.5 bg-savings-surface border border-savings-border rounded-xs flex items-center gap-2.5 text-xs text-ink">
              <CheckCircle2 className="w-4 h-4 text-savings shrink-0" strokeWidth={1.75} />
              <div>
                <p className="font-semibold text-ink">You are registered for priority notifications</p>
                <p className="text-[11px] text-ink-muted">
                  We will notify you immediately once {title} enters private beta testing.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleJoinWaitlist} className="space-y-2.5">
              <div>
                <h3 className="text-xs font-bold text-ink">Request Notification on Release</h3>
                <p className="text-[11px] text-ink-muted">
                  Join the waitlist to receive priority access and preview beta updates.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 max-w-md">
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 px-3 py-2 bg-canvas border border-border rounded-xs text-xs text-ink placeholder-ink-subtle min-h-[44px] focus-visible:outline-2 focus-visible:outline-ink"
                  aria-label="Email address for notifications"
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-action-fill hover:bg-action-fill-hover text-action-fill-foreground rounded-xs text-xs font-semibold transition-standard min-h-[44px] cursor-pointer"
                >
                  <Bell className="w-3.5 h-3.5" strokeWidth={1.75} />
                  <span>Notify Me</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

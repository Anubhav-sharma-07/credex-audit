"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  Layers,
  Building2,
  CalendarClock,
  Sparkles,
  FileText,
  UploadCloud,
  Settings,
  Users,
  ShieldCheck,
  X,
  ArrowRight,
} from "lucide-react";

interface CommandItem {
  id: string;
  label: string;
  category: "Navigation" | "Actions" | "Admin";
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  description: string;
}

const COMMANDS: CommandItem[] = [
  {
    id: "nav_overview",
    label: "Spend Overview",
    category: "Navigation",
    href: "/overview",
    icon: LayoutDashboard,
    description: "Monthly run-rate, top spend, and verified savings.",
  },
  {
    id: "nav_subscriptions",
    label: "Active Subscriptions",
    category: "Navigation",
    href: "/subscriptions",
    icon: Layers,
    description: "Server-paginated license table and filters.",
  },
  {
    id: "nav_vendors",
    label: "Vendor Directory",
    category: "Navigation",
    href: "/vendors",
    icon: Building2,
    description: "Spend aggregation by vendor and billing frequency.",
  },
  {
    id: "nav_renewals",
    label: "Contract Renewals",
    category: "Navigation",
    href: "/renewals",
    icon: CalendarClock,
    description: "Upcoming 7/30/90-day renewal countdown and decisions.",
  },
  {
    id: "nav_reports",
    label: "Executive Reports",
    category: "Navigation",
    href: "/reports",
    icon: FileText,
    description: "Monthly summary and savings report as CSV/PDF.",
  },
  {
    id: "nav_import",
    label: "CSV Import",
    category: "Navigation",
    href: "/import",
    icon: UploadCloud,
    description: "Bulk upload subscriptions with duplicate detection.",
  },
  {
    id: "nav_insights",
    label: "AI Spend Insights",
    category: "Navigation",
    href: "/insights",
    icon: Sparkles,
    description: "Ask 5 questions with verified catalog citations.",
  },
  {
    id: "act_audit",
    label: "Public AI Audit Tool",
    category: "Actions",
    href: "/audit",
    icon: ShieldCheck,
    description: "Free top-of-funnel 2-minute savings calculator.",
  },
  {
    id: "adm_team",
    label: "Team & Role Access",
    category: "Admin",
    href: "/admin/team",
    icon: Users,
    description: "Manage member seats and role permissions.",
  },
  {
    id: "adm_settings",
    label: "Workspace Settings",
    category: "Admin",
    href: "/admin/settings",
    icon: Settings,
    description: "Currency, fiscal year, and notification settings.",
  },
];

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = COMMANDS.filter((cmd) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      cmd.label.toLowerCase().includes(q) ||
      cmd.description.toLowerCase().includes(q) ||
      cmd.category.toLowerCase().includes(q)
    );
  });

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Toggle palette on Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        setQuery("");
        setSelectedIndex(0);
      }

      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        setIsOpen(false);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1 < filtered.length ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1));
      } else if (e.key === "Enter" && filtered[selectedIndex]) {
        e.preventDefault();
        const target = filtered[selectedIndex];
        setIsOpen(false);
        router.push(target.href);
      }
    },
    [isOpen, filtered, selectedIndex, router]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-ink/40 backdrop-blur-xs"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="w-full max-w-xl bg-surface border border-border rounded-md shadow-md overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-canvas-subtle">
          <Search className="w-4 h-4 text-ink-muted shrink-0" strokeWidth={1.75} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a screen, command, or report..."
            className="w-full bg-transparent text-sm text-ink placeholder:text-ink-subtle focus:outline-hidden"
          />
          <kbd className="hidden sm:inline-block text-[10px] font-mono font-medium text-ink-muted bg-surface border border-border px-1.5 py-0.5 rounded-sm">
            ESC
          </kbd>
          <button
            onClick={() => setIsOpen(false)}
            aria-label="Close command palette"
            className="text-ink-muted hover:text-ink p-1 rounded-sm focus-visible:ring-2"
          >
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-ink-muted">
              No matching commands found for &ldquo;{query}&rdquo;.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;

              return (
                <div
                  key={item.id}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    setIsOpen(false);
                    router.push(item.href);
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-sm cursor-pointer min-h-[44px] transition-standard ${
                    isSelected
                      ? "bg-canvas-subtle border-l-2 border-action-fill text-ink"
                      : "text-ink-muted hover:bg-surface-hover"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-sm flex items-center justify-center shrink-0 ${
                        isSelected ? "bg-surface text-ink" : "bg-canvas-subtle text-ink-muted"
                      }`}
                    >
                      <Icon className="w-4 h-4" strokeWidth={1.75} />
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-semibold text-ink tracking-tight truncate">{item.label}</p>
                      <p className="text-[11px] text-ink-muted truncate">{item.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-ink-subtle bg-canvas-subtle px-1.5 py-0.5 rounded-xs">
                      {item.category}
                    </span>
                    {isSelected && <ArrowRight className="w-3 h-3 text-ink-muted" strokeWidth={1.75} />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Navigation Tip */}
        <div className="px-4 py-2 bg-canvas-subtle border-t border-border flex items-center justify-between text-[11px] text-ink-muted">
          <span>Navigate with ↑ / ↓, select with Enter</span>
          <span className="font-mono text-[10px]">SpendLens Command</span>
        </div>
      </div>
    </div>
  );
}

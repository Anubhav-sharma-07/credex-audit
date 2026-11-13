"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  Building2,
  CalendarClock,
  BarChart3,
  PiggyBank,
  Sparkles,
  FileText,
  UploadCloud,
  Users,
  Wallet,
  Settings,
  LogOut,
  Command,
  Menu,
  X,
  Keyboard,
} from "lucide-react";
import { signOut } from "@/lib/auth/client";
import ThemeToggle from "./ThemeToggle";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  isComingSoon?: boolean;
}

interface WorkspaceSidebarProps {
  workspaceName?: string;
  userRole?: string;
  userEmail?: string;
}

const PRIMARY_NAV: NavItem[] = [
  { label: "Overview", href: "/overview", icon: LayoutDashboard },
  { label: "Subscriptions", href: "/subscriptions", icon: Layers },
  { label: "Vendors", href: "/vendors", icon: Building2 },
  { label: "Renewals", href: "/renewals", icon: CalendarClock },
  { label: "Reports", href: "/reports", icon: FileText },
  { label: "CSV Import", href: "/import", icon: UploadCloud },
  { label: "AI Insights", href: "/insights", icon: Sparkles },
  { label: "Analytics", href: "/analytics", icon: BarChart3, isComingSoon: true },
  { label: "Savings", href: "/savings", icon: PiggyBank, isComingSoon: true },
];

const ADMIN_NAV: NavItem[] = [
  { label: "Team & Access", href: "/admin/team", icon: Users, isComingSoon: true },
  { label: "Budgets & Caps", href: "/admin/budgets", icon: Wallet, isComingSoon: true },
  { label: "Settings", href: "/admin/settings", icon: Settings, isComingSoon: true },
];

export default function WorkspaceSidebar({
  workspaceName = "Primary Workspace",
  userRole = "owner",
  userEmail = "user@company.com",
}: WorkspaceSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Handle ESC key to close mobile drawer
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && mobileOpen) {
        setMobileOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

  // Prevent background scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  async function handleSignOut() {
    try {
      await signOut();
      window.location.href = "/login";
    } catch {
      window.location.href = "/login";
    }
  }

  function triggerCommandPalette() {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
  }

  function triggerShortcutsModal() {
    window.dispatchEvent(new CustomEvent("open-shortcuts-modal"));
  }

  const renderNavContent = () => (
    <>
      <div className="flex-1 overflow-y-auto">
        {/* Workspace Brand Header (Desktop) */}
        <div className="hidden lg:flex h-16 items-center justify-between px-5 border-b border-neutral-7">
          <Link
            href="/overview"
            className="flex items-center gap-2.5 focus-visible:ring-2 focus-visible:ring-action-fill rounded-xs"
          >
            <div className="w-7 h-7 rounded-xs bg-action-fill text-action-fill-foreground flex items-center justify-center font-bold text-xs">
              SL
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-neutral-1">SpendLens</span>
              <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-5">Spend Intel</span>
            </div>
          </Link>
          <ThemeToggle />
        </div>

        {/* Global Command Palette Quick Shortcut Button */}
        <div className="p-3 border-b border-neutral-7 space-y-1.5">
          <button
            type="button"
            onClick={triggerCommandPalette}
            className="w-full flex items-center justify-between px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-4 hover:text-neutral-1 rounded-xs border border-neutral-7 text-xs transition-standard min-h-[44px] focus-visible:ring-2 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Command className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>Search or jump to...</span>
            </div>
            <kbd className="text-[10px] font-mono text-neutral-5 bg-neutral-900 px-1.5 py-0.5 rounded-xs border border-neutral-7">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Workspace Context Badge */}
        <div className="px-5 py-2.5 border-b border-neutral-7 bg-neutral-850">
          <p className="text-[10px] font-mono text-neutral-5 uppercase tracking-wider">Tenant Workspace</p>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-xs font-semibold text-neutral-1 truncate max-w-[140px]" title={workspaceName}>
              {workspaceName}
            </span>
            <span className="text-[10px] font-mono bg-neutral-800 text-neutral-3 border border-neutral-7 px-1.5 py-0.2 rounded-xs capitalize">
              {userRole}
            </span>
          </div>
        </div>

        {/* Primary Navigation */}
        <nav aria-label="Main Navigation" className="p-3 space-y-0.5">
          {PRIMARY_NAV.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/overview" && pathname.startsWith(`${item.href}/`));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2 rounded-xs text-xs font-medium min-h-[44px] transition-standard ${
                  isActive
                    ? "bg-neutral-800 text-neutral-1 border-l-2 border-action-fill font-semibold"
                    : "text-neutral-4 hover:bg-neutral-800 hover:text-neutral-1"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? "text-action-fill" : "text-neutral-5"}`} strokeWidth={1.75} />
                  <span>{item.label}</span>
                </div>
                {item.isComingSoon && (
                  <span className="text-[9px] uppercase font-mono bg-neutral-800 text-neutral-5 border border-neutral-7 px-1.5 py-0.2 rounded-xs">
                    Soon
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Admin Navigation */}
        <div className="pt-2 px-3">
          <p className="px-3 text-[10px] font-mono uppercase tracking-wider text-neutral-5 mb-1">
            Administration
          </p>
          <nav aria-label="Admin Navigation" className="space-y-0.5">
            {ADMIN_NAV.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2 rounded-xs text-xs font-medium min-h-[44px] transition-standard ${
                    isActive
                      ? "bg-neutral-800 text-neutral-1 border-l-2 border-action-fill font-semibold"
                      : "text-neutral-4 hover:bg-neutral-800 hover:text-neutral-1"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-neutral-5" strokeWidth={1.75} />
                    <span>{item.label}</span>
                  </div>
                  {item.isComingSoon && (
                    <span className="text-[9px] uppercase font-mono bg-neutral-800 text-neutral-5 border border-neutral-7 px-1.5 py-0.2 rounded-xs">
                      Soon
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Quick Keyboard Shortcuts & Changelog triggers */}
        <div className="p-3 border-t border-neutral-7 mt-2 space-y-1">
          <button
            type="button"
            onClick={triggerShortcutsModal}
            className="w-full flex items-center justify-between px-3 py-1.5 text-neutral-5 hover:text-neutral-1 hover:bg-neutral-800 rounded-xs text-[11px] transition-standard min-h-[36px] cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Keyboard className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>Keyboard Shortcuts</span>
            </div>
            <kbd className="text-[10px] font-mono bg-neutral-900 text-neutral-5 px-1 py-0.2 rounded-xs border border-neutral-7">
              ?
            </kbd>
          </button>
          <Link
            href="/changelog"
            className="flex items-center justify-between px-3 py-1.5 text-neutral-5 hover:text-neutral-1 hover:bg-neutral-800 rounded-xs text-[11px] transition-standard min-h-[36px]"
          >
            <span>Product Changelog</span>
            <span className="text-[9px] font-mono bg-savings-surface text-savings border border-savings-border px-1 rounded-xs">v0.2.0</span>
          </Link>
        </div>
      </div>

      {/* Footer / User Session Info & Sign Out */}
      <div className="p-3 border-t border-neutral-7 bg-neutral-850 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-7 h-7 rounded-xs bg-neutral-7 text-neutral-1 flex items-center justify-center text-[10px] font-mono font-bold shrink-0 uppercase">
              {userEmail.slice(0, 2)}
            </div>
            <div className="truncate min-w-0">
              <p className="text-xs font-semibold text-neutral-1 truncate" title={userEmail}>
                {userEmail}
              </p>
              <p className="text-[10px] text-neutral-5 truncate capitalize">{userRole} Member</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            title="Sign out everywhere"
            aria-label="Sign out of workspace"
            className="p-2 text-neutral-5 hover:text-neutral-1 hover:bg-neutral-800 rounded-xs transition-standard min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:ring-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* 1. Mobile Top Bar (Below 1024px: lg:hidden) */}
      <header className="lg:hidden sticky top-0 z-40 bg-ink text-neutral-1 border-b border-neutral-7 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
            className="p-2 -ml-2 text-neutral-1 hover:bg-neutral-800 rounded-xs min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer focus-visible:ring-2 focus-visible:ring-action-fill"
          >
            <Menu className="w-5 h-5" strokeWidth={2} />
          </button>

          <Link href="/overview" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-xs bg-action-fill text-action-fill-foreground flex items-center justify-center font-bold text-xs">
              SL
            </div>
            <span className="font-bold text-sm text-neutral-1 font-serif tracking-tight">SpendLens</span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={triggerCommandPalette}
            aria-label="Open command search"
            className="p-2 text-neutral-4 hover:text-neutral-1 rounded-xs min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
          >
            <Command className="w-4 h-4" strokeWidth={1.75} />
          </button>
          <ThemeToggle />
        </div>
      </header>

      {/* 2. Mobile Drawer Overlay & Panel (Below 1024px) */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Workspace Navigation Drawer">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Sheet */}
          <aside
            aria-label="Mobile Navigation"
            className="relative w-72 max-w-[85vw] bg-ink text-neutral-1 border-r border-neutral-7 flex flex-col justify-between shadow-2xl h-full z-10"
          >
            {/* Drawer Header with Close Button */}
            <div className="h-14 flex items-center justify-between px-4 border-b border-neutral-7 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-xs bg-action-fill text-action-fill-foreground flex items-center justify-center font-bold text-xs">
                  SL
                </div>
                <span className="text-sm font-bold text-neutral-1 font-serif">SpendLens</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation menu"
                className="p-2 text-neutral-4 hover:text-neutral-1 rounded-xs min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" strokeWidth={2} />
              </button>
            </div>

            {renderNavContent()}
          </aside>
        </div>
      )}

      {/* 3. Desktop Persistent Sidebar (1024px and above: lg:flex) */}
      <aside
        aria-label="Workspace Sidebar Navigation"
        className="hidden lg:flex w-64 bg-ink text-neutral-1 border-r border-neutral-7 flex-col justify-between min-h-screen shrink-0 sticky top-0 h-screen"
      >
        {renderNavContent()}
      </aside>
    </>
  );
}

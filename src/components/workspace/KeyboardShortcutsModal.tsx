"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Keyboard, X } from "lucide-react";

interface ShortcutItem {
  keys: string[];
  description: string;
}

const SHORTCUTS: ShortcutItem[] = [
  { keys: ["⌘K", "Ctrl+K"], description: "Open Command Palette / Search" },
  { keys: ["?"], description: "Toggle this Keyboard Shortcuts dialog" },
  { keys: ["G", "O"], description: "Go to Spend Overview" },
  { keys: ["G", "S"], description: "Go to Subscriptions list" },
  { keys: ["G", "R"], description: "Go to Renewals timeline" },
  { keys: ["G", "I"], description: "Go to AI Insights" },
  { keys: ["G", "C"], description: "Go to CSV Import" },
  { keys: ["Esc"], description: "Close modals, drawers, or dialogs" },
];

export default function KeyboardShortcutsModal() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let pendingKey: string | null = null;
    let pendingTimeout: NodeJS.Timeout | null = null;

    function handleKeyDown(e: KeyboardEvent) {
      // Ignore if user is inside an input, textarea, or contentEditable
      const target = e.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable
      ) {
        return;
      }

      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setOpen((prev) => !prev);
        return;
      }

      if (e.key === "Escape" && open) {
        setOpen(false);
        return;
      }

      // Handle sequences: G then O/S/R/I/C
      if (e.key.toLowerCase() === "g" && !pendingKey && !e.metaKey && !e.ctrlKey) {
        pendingKey = "g";
        pendingTimeout = setTimeout(() => {
          pendingKey = null;
        }, 1200);
        return;
      }

      if (pendingKey === "g") {
        const next = e.key.toLowerCase();
        pendingKey = null;
        if (pendingTimeout) clearTimeout(pendingTimeout);

        switch (next) {
          case "o":
            e.preventDefault();
            router.push("/overview");
            break;
          case "s":
            e.preventDefault();
            router.push("/subscriptions");
            break;
          case "r":
            e.preventDefault();
            router.push("/renewals");
            break;
          case "i":
            e.preventDefault();
            router.push("/insights");
            break;
          case "c":
            e.preventDefault();
            router.push("/import");
            break;
          default:
            break;
        }
      }
    }

    function handleCustomOpen() {
      setOpen(true);
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("open-shortcuts-modal", handleCustomOpen);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open-shortcuts-modal", handleCustomOpen);
      if (pendingTimeout) clearTimeout(pendingTimeout);
    };
  }, [open, router]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      <div className="relative bg-surface border border-border rounded-sm shadow-2xl max-w-md w-full p-6 text-ink space-y-5 z-10">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-ink-muted" strokeWidth={1.75} />
            <h2 id="shortcuts-title" className="text-sm font-bold text-ink">
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close shortcuts dialog"
            className="p-1 text-ink-muted hover:text-ink rounded-xs cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        <div className="space-y-2">
          {SHORTCUTS.map((sc, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-1.5 px-2 rounded-xs hover:bg-canvas-subtle text-xs"
            >
              <span className="text-ink-muted">{sc.description}</span>
              <div className="flex items-center gap-1">
                {sc.keys.map((k, idx) => (
                  <kbd
                    key={idx}
                    className="font-mono text-[11px] bg-canvas border border-border text-ink px-1.5 py-0.5 rounded-xs shadow-xs"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-border-subtle text-[11px] text-ink-muted text-center">
          Press <kbd className="font-mono bg-canvas border border-border px-1 py-0.2 rounded-xs">?</kbd> anywhere to open or dismiss this window.
        </div>
      </div>
    </div>
  );
}

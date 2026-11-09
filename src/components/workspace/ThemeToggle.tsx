"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("spendlens_theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (stored === "dark" || (!stored && prefersDark)) {
        setIsDark(true);
        document.documentElement.classList.add("dark");
      } else {
        setIsDark(false);
        document.documentElement.classList.remove("dark");
      }
    } catch {
      // LocalStorage unavailable
    }
  }, []);

  function toggleTheme() {
    const nextDark = !isDark;
    setIsDark(nextDark);
    try {
      if (nextDark) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("spendlens_theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("spendlens_theme", "light");
      }
    } catch {
      // Ignore
    }
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className="p-2 text-ink-muted hover:text-ink rounded-xs hover:bg-canvas-subtle transition-standard min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:ring-2"
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-warning" strokeWidth={1.75} />
      ) : (
        <Moon className="w-4 h-4 text-ink-muted" strokeWidth={1.75} />
      )}
    </button>
  );
}


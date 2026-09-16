"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import clsx from "clsx";

function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

function getSnapshot() {
  return document.documentElement.classList.contains("dark");
}

function getServerSnapshot() {
  return false;
}

export default function ThemeToggle() {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const next = !isDark;
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // localStorage unavailable (private browsing, etc.) — theme just won't persist.
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      onClick={toggle}
      aria-label={isDark ? "Dark mode on — switch to light mode" : "Light mode on — switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="relative inline-flex h-7 w-14 shrink-0 items-center rounded-full border border-border bg-surface px-0.5 transition-colors"
    >
      <Sun className="absolute left-1.5 h-3.5 w-3.5 text-muted" />
      <Moon className="absolute right-1.5 h-3.5 w-3.5 text-muted" />
      <span
        className={clsx(
          "z-10 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform",
          isDark ? "translate-x-8" : "translate-x-0",
        )}
      >
        {isDark ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
      </span>
    </button>
  );
}

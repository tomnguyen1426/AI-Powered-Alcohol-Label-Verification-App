"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Trash2, Inbox, ArrowRight } from "lucide-react";
import clsx from "clsx";
import { displayName } from "@/components/ResultPanel";
import { OverallStatusBadge } from "@/components/StatusBadge";
import { useReviewLog, deleteEntry } from "@/lib/review-log-store";
import type { ReviewDecision } from "@/lib/review-log";

const decisionMeta: Record<ReviewDecision, { label: string; dotClasses: string; badgeClasses: string }> = {
  pending: { label: "Pending", dotClasses: "bg-muted", badgeClasses: "text-muted bg-surface" },
  approved: {
    label: "Approved",
    dotClasses: "bg-emerald-500",
    badgeClasses: "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40",
  },
  rejected: {
    label: "Rejected",
    dotClasses: "bg-rose-500",
    badgeClasses: "text-rose-700 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/40",
  },
  flagged: {
    label: "Flagged",
    dotClasses: "bg-amber-500",
    badgeClasses: "text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/40",
  },
};

type FilterValue = "all" | ReviewDecision;

export default function HistoryPage() {
  const entries = useReviewLog();
  const [filter, setFilter] = useState<FilterValue>("all");

  const counts = useMemo(() => {
    return {
      all: entries.length,
      pending: entries.filter((e) => e.decision === "pending").length,
      approved: entries.filter((e) => e.decision === "approved").length,
      rejected: entries.filter((e) => e.decision === "rejected").length,
      flagged: entries.filter((e) => e.decision === "flagged").length,
    };
  }, [entries]);

  const visible = useMemo(() => {
    if (filter === "all") return entries;
    return entries.filter((e) => e.decision === filter);
  }, [entries, filter]);

  if (entries.length === 0) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center sm:px-6">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface text-muted">
          <Inbox className="h-6 w-6" />
        </span>
        <h1 className="mt-5 text-xl font-semibold text-foreground">No entries yet</h1>
        <p className="mt-2 max-w-sm text-sm text-muted">
          Every label you check gets logged here automatically, with room to mark it Approved,
          Rejected, or Flagged.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          Check a label
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Review Log</h1>
          <p className="mt-1 text-sm text-muted">
            Every check you&apos;ve run on this device. Open one to see the full analysis and make a
            call.
          </p>
        </div>
      </div>

      <p className="mb-6 rounded-lg bg-surface px-3 py-2 text-xs text-muted">
        Saved in this browser only — not visible to anyone else, not synced anywhere, and gone if
        you clear browser data.
      </p>

      <div className="mb-6 flex flex-wrap gap-2">
        {([
          ["all", "All"],
          ["pending", "Pending"],
          ["approved", "Approved"],
          ["rejected", "Rejected"],
          ["flagged", "Flagged"],
        ] as [FilterValue, string][]).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={clsx(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              filter === value
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-muted hover:bg-surface hover:text-foreground",
            )}
          >
            {value !== "all" && <span className={clsx("h-1.5 w-1.5 rounded-full", decisionMeta[value].dotClasses)} />}
            {label}
            <span className="text-[10px] opacity-70">{counts[value]}</span>
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {visible.map((entry) => (
          <div key={entry.loggedAt} className="flex items-center gap-2 rounded-xl border border-border bg-card shadow-sm">
            <Link
              href={`/history/${entry.loggedAt}`}
              className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3.5"
            >
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                {displayName(entry.result)}
              </span>
              {entry.isExample && (
                <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">
                  Example
                </span>
              )}
              {entry.decision === "pending" ? (
                <OverallStatusBadge status={entry.result.overallStatus} mode={entry.result.mode} size="sm" />
              ) : (
                <span
                  className={clsx(
                    "rounded-full px-2 py-0.5 text-xs font-medium",
                    decisionMeta[entry.decision].badgeClasses,
                  )}
                >
                  {decisionMeta[entry.decision].label}
                </span>
              )}
              <span className="hidden text-xs text-muted sm:inline">
                {new Date(entry.loggedAt).toLocaleString([], {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
            </Link>
            <button
              type="button"
              onClick={() => {
                const message = entry.isExample
                  ? `Hide the "${displayName(entry.result)}" example on this device? It'll be back if you clear browser data or open the app on another device.`
                  : `Delete "${displayName(entry.result)}" from the review log?`;
                if (confirm(message)) deleteEntry(entry.loggedAt);
              }}
              aria-label={`Delete ${displayName(entry.result)}`}
              className="mr-3 shrink-0 rounded-md p-1.5 text-muted hover:bg-surface hover:text-rose-600 dark:hover:text-rose-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

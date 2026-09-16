"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Check, X, Flag, Trash2, Inbox, ArrowRight } from "lucide-react";
import clsx from "clsx";
import ResultPanel from "@/components/ResultPanel";
import { OverallStatusBadge } from "@/components/StatusBadge";
import { useReviewLog, setDecision, clearReviewLog } from "@/lib/review-log-store";
import type { ReviewDecision } from "@/lib/review-log";

const decisionMeta: Record<ReviewDecision, { label: string; dotClasses: string }> = {
  pending: { label: "Pending", dotClasses: "bg-muted" },
  approved: { label: "Approved", dotClasses: "bg-emerald-500" },
  rejected: { label: "Rejected", dotClasses: "bg-rose-500" },
  flagged: { label: "Flagged", dotClasses: "bg-amber-500" },
};

type FilterValue = "all" | ReviewDecision;

export default function HistoryPage() {
  const entries = useReviewLog();
  const [expanded, setExpanded] = useState<number | null>(null);
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
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Review Log</h1>
          <p className="mt-1 text-sm text-muted">
            Every check you&apos;ve run on this device, with your approve/reject/flag call on each.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (confirm("Clear the entire review log? This can't be undone.")) clearReviewLog();
          }}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted hover:bg-surface hover:text-foreground"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Clear log
        </button>
      </div>

      <p className="mb-6 rounded-lg bg-surface px-3 py-2 text-xs text-muted">
        Saved in this browser only — not visible to anyone else, not synced anywhere, and gone if
        you clear browser data. Label photos stay visible until you reload the page; after that
        only the text readout is kept.
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
          <div key={entry.loggedAt} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <button
                type="button"
                onClick={() => setExpanded(expanded === entry.loggedAt ? null : entry.loggedAt)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <span className="truncate text-sm font-medium text-foreground">{entry.result.fileName}</span>
                <OverallStatusBadge status={entry.result.overallStatus} mode={entry.result.mode} size="sm" />
                <span className="hidden text-xs text-muted sm:inline">
                  {new Date(entry.loggedAt).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </button>

              <div className="flex items-center gap-3">
                <DecisionControl decision={entry.decision} loggedAt={entry.loggedAt} />
                <button
                  type="button"
                  onClick={() => setExpanded(expanded === entry.loggedAt ? null : entry.loggedAt)}
                  className="rounded-md p-1.5 text-muted hover:bg-surface"
                  aria-label="Toggle details"
                >
                  {expanded === entry.loggedAt ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {expanded === entry.loggedAt && (
              <div className="border-t border-border p-3">
                <ResultPanel result={entry.result} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DecisionControl({ decision, loggedAt }: { decision: ReviewDecision; loggedAt: number }) {
  return (
    <div className="flex items-center overflow-hidden rounded-lg border border-border">
      <DecisionOption
        active={decision === "approved"}
        onClick={() => setDecision(loggedAt, "approved")}
        label="Approve"
        Icon={Check}
        activeClasses="bg-emerald-600 text-white"
      />
      <DecisionOption
        active={decision === "flagged"}
        onClick={() => setDecision(loggedAt, "flagged")}
        label="Flag"
        Icon={Flag}
        activeClasses="bg-amber-600 text-white"
        border
      />
      <DecisionOption
        active={decision === "rejected"}
        onClick={() => setDecision(loggedAt, "rejected")}
        label="Reject"
        Icon={X}
        activeClasses="bg-rose-600 text-white"
        border
      />
    </div>
  );
}

function DecisionOption({
  active,
  onClick,
  label,
  Icon,
  activeClasses,
  border,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  Icon: typeof Check;
  activeClasses: string;
  border?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={active ? `${label} — click to clear` : label}
      className={clsx(
        "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors",
        border && "border-l border-border",
        active ? activeClasses : "text-muted hover:bg-surface hover:text-foreground",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

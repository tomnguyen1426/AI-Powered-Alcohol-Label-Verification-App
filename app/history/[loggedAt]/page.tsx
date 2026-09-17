"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Trash2, CheckCircle2, XCircle, Flag, RotateCcw, PartyPopper } from "lucide-react";
import clsx from "clsx";
import ResultPanel, { displayName } from "@/components/ResultPanel";
import DecisionControls from "@/components/DecisionControls";
import { useReviewLog, useReviewLogEntry, deleteEntry } from "@/lib/review-log-store";
import type { ReviewDecision } from "@/lib/review-log";

const decidedMeta: Record<ReviewDecision, { verb: string; Icon: typeof CheckCircle2; classes: string }> = {
  approved: { verb: "Approved", Icon: CheckCircle2, classes: "bg-emerald-600 text-white" },
  rejected: { verb: "Rejected", Icon: XCircle, classes: "bg-rose-600 text-white" },
  flagged: { verb: "Flagged for follow-up", Icon: Flag, classes: "bg-amber-600 text-white" },
  pending: { verb: "Cleared back to Pending", Icon: RotateCcw, classes: "bg-foreground text-background" },
};

export default function ReviewLogEntryPage() {
  const params = useParams<{ loggedAt: string }>();
  const router = useRouter();
  const loggedAt = Number(params.loggedAt);
  const entry = useReviewLogEntry(loggedAt);
  const allEntries = useReviewLog();
  const [justDecided, setJustDecided] = useState<ReviewDecision | null>(null);

  // "Next application" means the next one still waiting on a call, so a
  // reviewer can move through the queue without detouring back to the list
  // each time. Searches forward from this entry's position in the log,
  // wrapping around, so it still works if this was the last row.
  function findNextPending() {
    const index = allEntries.findIndex((e) => e.loggedAt === loggedAt);
    if (index === -1) return undefined;
    for (let i = 1; i < allEntries.length; i++) {
      const candidate = allEntries[(index + i) % allEntries.length];
      if (candidate.decision === "pending") return candidate;
    }
    return undefined;
  }

  if (!entry) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
        <h1 className="text-xl font-semibold text-foreground">Entry not found</h1>
        <p className="mt-2 text-sm text-muted">
          It may have been deleted, or the review log was cleared.
        </p>
        <Link href="/history" className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Back to Review Log
        </Link>
      </div>
    );
  }

  const nextPending = justDecided ? findNextPending() : undefined;
  const DecidedIcon = justDecided ? decidedMeta[justDecided].Icon : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link href="/history" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to Review Log
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{displayName(entry.result)}</h1>
            {entry.isExample && (
              <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">
                Example
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted">
            Checked {new Date(entry.loggedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            const message = entry.isExample
              ? `Hide the "${displayName(entry.result)}" example on this device? It'll be back if you clear browser data or open the app on another device.`
              : `Delete "${displayName(entry.result)}" from the review log?`;
            if (confirm(message)) {
              deleteEntry(entry.loggedAt);
              router.push("/history");
            }
          }}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted hover:bg-surface hover:text-rose-600 dark:hover:text-rose-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {entry.isExample ? "Hide" : "Delete"}
        </button>
      </div>

      <div className="mb-6">
        {justDecided ? (
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div
              className={clsx(
                "mb-4 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium",
                decidedMeta[justDecided].classes,
              )}
            >
              {DecidedIcon && <DecidedIcon className="h-4 w-4 shrink-0" />}
              {decidedMeta[justDecided].verb} &ldquo;{displayName(entry.result)}&rdquo;
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => router.push("/history")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-foreground hover:bg-surface"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Review Log
              </button>
              {nextPending ? (
                <button
                  type="button"
                  onClick={() => router.push(`/history/${nextPending.loggedAt}`)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  Next Application
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-sm text-muted">
                  <PartyPopper className="h-4 w-4" />
                  Nothing else pending
                </span>
              )}
            </div>
          </div>
        ) : (
          <DecisionControls loggedAt={entry.loggedAt} decision={entry.decision} onDecided={setJustDecided} />
        )}
      </div>

      <ResultPanel result={entry.result} />
    </div>
  );
}

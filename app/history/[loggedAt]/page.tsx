"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import ResultPanel, { displayName } from "@/components/ResultPanel";
import DecisionControls from "@/components/DecisionControls";
import { useReviewLogEntry, deleteEntry } from "@/lib/review-log-store";
import type { ReviewDecision } from "@/lib/review-log";

export default function ReviewLogEntryPage() {
  const params = useParams<{ loggedAt: string }>();
  const router = useRouter();
  const loggedAt = Number(params.loggedAt);
  const entry = useReviewLogEntry(loggedAt);

  function handleDecided(next: ReviewDecision) {
    if (!entry) return;
    const params = new URLSearchParams({ decided: next, name: displayName(entry.result) });
    router.push(`/history?${params.toString()}`);
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
        <DecisionControls loggedAt={entry.loggedAt} decision={entry.decision} onDecided={handleDecided} />
      </div>

      <ResultPanel result={entry.result} />
    </div>
  );
}

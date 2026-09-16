"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, X, Flag, Trash2 } from "lucide-react";
import clsx from "clsx";
import ResultPanel, { displayName } from "@/components/ResultPanel";
import { useReviewLogEntry, setDecision, deleteEntry } from "@/lib/review-log-store";
import type { ReviewDecision } from "@/lib/review-log";

const decisionMeta: Record<ReviewDecision, { label: string; classes: string }> = {
  pending: { label: "Pending", classes: "text-muted bg-surface" },
  approved: { label: "Approved", classes: "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40" },
  rejected: { label: "Rejected", classes: "text-rose-700 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/40" },
  flagged: { label: "Flagged for follow-up", classes: "text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/40" },
};

export default function ReviewLogEntryPage() {
  const params = useParams<{ loggedAt: string }>();
  const router = useRouter();
  const loggedAt = Number(params.loggedAt);
  const entry = useReviewLogEntry(loggedAt);

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
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{displayName(entry.result)}</h1>
          <p className="mt-1 text-sm text-muted">
            Checked {new Date(entry.loggedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (confirm(`Delete "${displayName(entry.result)}" from the review log?`)) {
              deleteEntry(entry.loggedAt);
              router.push("/history");
            }
          }}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted hover:bg-surface hover:text-rose-600 dark:hover:text-rose-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      </div>

      <div className="mb-6 rounded-xl border border-border bg-card p-5 shadow-sm">
        <p className="mb-3 text-sm font-medium text-foreground">Your decision</p>
        <div className="flex flex-wrap items-center gap-3">
          <DecisionButton
            active={entry.decision === "approved"}
            onClick={() => setDecision(entry.loggedAt, "approved")}
            label="Approve"
            Icon={Check}
            activeClasses="bg-emerald-600 text-white border-emerald-600"
          />
          <DecisionButton
            active={entry.decision === "flagged"}
            onClick={() => setDecision(entry.loggedAt, "flagged")}
            label="Flag for follow-up"
            Icon={Flag}
            activeClasses="bg-amber-600 text-white border-amber-600"
          />
          <DecisionButton
            active={entry.decision === "rejected"}
            onClick={() => setDecision(entry.loggedAt, "rejected")}
            label="Reject"
            Icon={X}
            activeClasses="bg-rose-600 text-white border-rose-600"
          />
          <span className={clsx("ml-auto rounded-full px-2.5 py-1 text-xs font-medium", decisionMeta[entry.decision].classes)}>
            Currently: {decisionMeta[entry.decision].label}
          </span>
        </div>
      </div>

      <ResultPanel result={entry.result} />
    </div>
  );
}

function DecisionButton({
  active,
  onClick,
  label,
  Icon,
  activeClasses,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  Icon: typeof Check;
  activeClasses: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors",
        active ? activeClasses : "border-border text-foreground hover:bg-surface",
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

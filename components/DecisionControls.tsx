"use client";

import { Check, Flag, X } from "lucide-react";
import clsx from "clsx";
import { setDecision } from "@/lib/review-log-store";
import type { ReviewDecision } from "@/lib/review-log";

const currentPillClasses: Record<ReviewDecision, string> = {
  pending: "text-muted bg-surface",
  approved: "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40",
  rejected: "text-rose-700 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/40",
  flagged: "text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/40",
};

const currentPillLabel: Record<ReviewDecision, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  flagged: "Flagged for follow-up",
};

interface DecisionControlsProps {
  loggedAt: number;
  decision: ReviewDecision;
  onDecided?: (next: ReviewDecision) => void;
  label?: string;
}

export default function DecisionControls({ loggedAt, decision, onDecided, label = "Your decision" }: DecisionControlsProps) {
  function handle(clicked: Exclude<ReviewDecision, "pending">) {
    const next = decision === clicked ? "pending" : clicked;
    setDecision(loggedAt, clicked);
    onDecided?.(next);
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      {label && <p className="mb-3 text-sm font-medium text-foreground">{label}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <DecisionButton
          active={decision === "approved"}
          onClick={() => handle("approved")}
          label="Approve"
          Icon={Check}
          activeClasses="bg-emerald-600 text-white border-emerald-600"
        />
        <DecisionButton
          active={decision === "flagged"}
          onClick={() => handle("flagged")}
          label="Flag for follow-up"
          Icon={Flag}
          activeClasses="bg-amber-600 text-white border-amber-600"
        />
        <DecisionButton
          active={decision === "rejected"}
          onClick={() => handle("rejected")}
          label="Reject"
          Icon={X}
          activeClasses="bg-rose-600 text-white border-rose-600"
        />
        <span className={clsx("ml-auto rounded-full px-2.5 py-1 text-xs font-medium", currentPillClasses[decision])}>
          Currently: {currentPillLabel[decision]}
        </span>
      </div>
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

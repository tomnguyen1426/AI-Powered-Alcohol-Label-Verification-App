import { CheckCircle2, Flag, AlertTriangle, XCircle, MinusCircle } from "lucide-react";
import clsx from "clsx";
import type { CheckMode, FieldStatus, OverallStatus } from "@/lib/schema";

// "Flagged" here is the AI's own read on a label -- distinct from a human's
// Approve/Flag/Reject decision, which always wins once one has been made
// (see the Review Log). Reusing the same word for "needs a closer look"
// keeps the vocabulary small; the fail tier is "Failed" specifically so it
// never collides with this one.
const overallLabels: Record<CheckMode, Record<OverallStatus, string>> = {
  comparison: { pass: "PASS", review: "FLAGGED", fail: "FAILED" },
  self_check: { pass: "OK", review: "FLAGGED", fail: "FAILED" },
};

const overallConfig: Record<OverallStatus, { classes: string; Icon: typeof CheckCircle2 }> = {
  pass: {
    classes:
      "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-400/20",
    Icon: CheckCircle2,
  },
  review: {
    classes:
      "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-400 dark:ring-amber-400/20",
    Icon: Flag,
  },
  fail: {
    classes: "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950/40 dark:text-rose-400 dark:ring-rose-400/20",
    Icon: XCircle,
  },
};

export function OverallStatusBadge({
  status,
  mode = "comparison",
  size = "md",
}: {
  status: OverallStatus;
  mode?: CheckMode;
  size?: "sm" | "md" | "lg";
}) {
  const cfg = overallConfig[status];
  const sizeClasses =
    size === "lg" ? "text-base px-4 py-2 gap-2" : size === "sm" ? "text-xs px-2 py-1 gap-1" : "text-sm px-3 py-1.5 gap-1.5";
  const iconSize = size === "lg" ? "h-5 w-5" : "h-4 w-4";
  return (
    <span className={clsx("inline-flex items-center rounded-full font-semibold ring-1 ring-inset", cfg.classes, sizeClasses)}>
      <cfg.Icon className={iconSize} />
      {overallLabels[mode][status]}
    </span>
  );
}

const fieldLabels: Record<CheckMode, Record<FieldStatus, string>> = {
  comparison: { match: "Match", review: "Review", mismatch: "Mismatch", not_applicable: "N/A" },
  self_check: { match: "OK", review: "Review", mismatch: "Failed", not_applicable: "N/A" },
};

const fieldConfig: Record<FieldStatus, { classes: string; Icon: typeof CheckCircle2 }> = {
  match: { classes: "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40", Icon: CheckCircle2 },
  review: { classes: "text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/40", Icon: AlertTriangle },
  mismatch: { classes: "text-rose-700 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/40", Icon: XCircle },
  not_applicable: { classes: "text-muted bg-surface", Icon: MinusCircle },
};

export function FieldStatusBadge({ status, mode = "comparison" }: { status: FieldStatus; mode?: CheckMode }) {
  const cfg = fieldConfig[status];
  return (
    <span className={clsx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", cfg.classes)}>
      <cfg.Icon className="h-3.5 w-3.5" />
      {fieldLabels[mode][status]}
    </span>
  );
}

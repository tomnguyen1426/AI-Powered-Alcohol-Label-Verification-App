import { CheckCircle2, AlertTriangle, XCircle, MinusCircle } from "lucide-react";
import clsx from "clsx";
import type { FieldStatus, OverallStatus } from "@/lib/schema";

const overallConfig: Record<OverallStatus, { label: string; classes: string; Icon: typeof CheckCircle2 }> = {
  pass: {
    label: "PASS",
    classes:
      "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-400/20",
    Icon: CheckCircle2,
  },
  review: {
    label: "NEEDS REVIEW",
    classes:
      "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-400 dark:ring-amber-400/20",
    Icon: AlertTriangle,
  },
  fail: {
    label: "FAIL",
    classes: "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950/40 dark:text-rose-400 dark:ring-rose-400/20",
    Icon: XCircle,
  },
};

export function OverallStatusBadge({ status, size = "md" }: { status: OverallStatus; size?: "sm" | "md" | "lg" }) {
  const cfg = overallConfig[status];
  const sizeClasses =
    size === "lg" ? "text-base px-4 py-2 gap-2" : size === "sm" ? "text-xs px-2 py-1 gap-1" : "text-sm px-3 py-1.5 gap-1.5";
  const iconSize = size === "lg" ? "h-5 w-5" : "h-4 w-4";
  return (
    <span className={clsx("inline-flex items-center rounded-full font-semibold ring-1 ring-inset", cfg.classes, sizeClasses)}>
      <cfg.Icon className={iconSize} />
      {cfg.label}
    </span>
  );
}

const fieldConfig: Record<FieldStatus, { label: string; classes: string; Icon: typeof CheckCircle2 }> = {
  match: { label: "Match", classes: "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40", Icon: CheckCircle2 },
  review: { label: "Review", classes: "text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/40", Icon: AlertTriangle },
  mismatch: { label: "Mismatch", classes: "text-rose-700 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/40", Icon: XCircle },
  not_applicable: { label: "N/A", classes: "text-muted bg-surface", Icon: MinusCircle },
};

export function FieldStatusBadge({ status }: { status: FieldStatus }) {
  const cfg = fieldConfig[status];
  return (
    <span className={clsx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", cfg.classes)}>
      <cfg.Icon className="h-3.5 w-3.5" />
      {cfg.label}
    </span>
  );
}

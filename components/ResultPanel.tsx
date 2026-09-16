import Image from "next/image";
import { Clock } from "lucide-react";
import { OverallStatusBadge, FieldStatusBadge } from "./StatusBadge";
import type { VerificationResult } from "@/lib/schema";

const summaryCopy = {
  pass: "Every field on the label matches the application. No action needed.",
  review: "Everything checks out except one or more items flagged for a quick human look.",
  fail: "One or more fields don't match the application. This label should not be approved as-is.",
} as const;

export default function ResultPanel({ result }: { result: VerificationResult }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border bg-surface px-5 py-4">
        <div>
          <p className="text-sm text-muted">{result.fileName}</p>
          <div className="mt-1">
            <OverallStatusBadge status={result.overallStatus} size="lg" />
          </div>
          <p className="mt-2 max-w-md text-sm text-muted">{summaryCopy[result.overallStatus]}</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted">
          <Clock className="h-3.5 w-3.5" />
          Processed in {(result.processingTimeMs / 1000).toFixed(1)}s
        </div>
      </div>

      <div className="grid gap-0 sm:grid-cols-[220px_1fr]">
        {result.imageDataUrl && (
          <div className="border-b border-border p-4 sm:border-b-0 sm:border-r">
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border border-border bg-surface">
              <Image
                src={result.imageDataUrl}
                alt={`Label image: ${result.fileName}`}
                fill
                unoptimized
                className="object-contain"
              />
            </div>
            {result.extraction.image_quality_issues.length > 0 && (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                Image notes: {result.extraction.image_quality_issues.join("; ")}
              </p>
            )}
          </div>
        )}

        <div className="divide-y divide-border">
          {result.comparisons.map((c) => (
            <div key={c.field} className="grid grid-cols-1 gap-2 px-5 py-3 sm:grid-cols-[180px_1fr_1fr_auto] sm:items-center sm:gap-4">
              <p className="text-sm font-medium text-foreground">{c.label}</p>
              <div className="text-sm">
                <p className="text-[11px] uppercase tracking-wide text-muted">On application</p>
                <p className="break-words text-foreground">{c.applicationValue || "—"}</p>
              </div>
              <div className="text-sm">
                <p className="text-[11px] uppercase tracking-wide text-muted">On label</p>
                <p className="break-words text-foreground">{c.labelValue || "—"}</p>
                {c.note && <p className="mt-0.5 text-xs text-muted">{c.note}</p>}
              </div>
              <div className="sm:justify-self-end">
                <FieldStatusBadge status={c.status} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useSyncExternalStore } from "react";
import { ChevronDown, ChevronUp, Check, X, Flag, Trash2, Inbox } from "lucide-react";
import clsx from "clsx";
import ResultPanel from "./ResultPanel";
import { OverallStatusBadge } from "./StatusBadge";
import { loadQueue, saveQueue, type QueueDecision, type QueueItem } from "@/lib/queue";
import type { VerificationResult } from "@/lib/schema";

const decisionConfig: Record<QueueDecision, { label: string; classes: string }> = {
  pending: { label: "Pending", classes: "text-muted bg-surface" },
  approved: { label: "Approved", classes: "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40" },
  rejected: { label: "Rejected", classes: "text-rose-700 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/40" },
  flagged: { label: "Flagged for follow-up", classes: "text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/40" },
};

let memoryQueue: QueueItem[] = typeof window !== "undefined" ? loadQueue() : [];
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot() {
  return memoryQueue;
}

const EMPTY_QUEUE: QueueItem[] = [];

function getServerSnapshot(): QueueItem[] {
  return EMPTY_QUEUE;
}

export function addToQueue(result: VerificationResult) {
  memoryQueue = [{ queuedAt: Date.now(), decision: "pending", result }, ...memoryQueue];
  saveQueue(memoryQueue);
  notify();
}

function setDecision(queuedAt: number, decision: QueueDecision) {
  memoryQueue = memoryQueue.map((item) =>
    item.queuedAt === queuedAt ? { ...item, decision: item.decision === decision ? "pending" : decision } : item,
  );
  saveQueue(memoryQueue);
  notify();
}

function clearQueue() {
  memoryQueue = [];
  saveQueue(memoryQueue);
  notify();
}

export default function Queue() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [expanded, setExpanded] = useState<number | null>(null);

  if (items.length === 0) return null;

  return (
    <div className="mt-10 border-t border-border pt-8">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Inbox className="h-4 w-4 text-muted" />
          <h2 className="text-sm font-semibold text-foreground">
            Queue — {items.length} checked on this device
          </h2>
        </div>
        <button
          type="button"
          onClick={clearQueue}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted hover:bg-surface hover:text-foreground"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Clear queue
        </button>
      </div>
      <p className="mb-4 text-xs text-muted">
        Saved in this browser only — not visible to anyone else, not synced anywhere, and gone if
        you clear browser data. Label photos stay visible until you reload the page; after that
        only the text readout is kept, to stay well under what a browser lets a site store.
      </p>

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.queuedAt} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <button
                type="button"
                onClick={() => setExpanded(expanded === item.queuedAt ? null : item.queuedAt)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <span className="truncate text-sm font-medium text-foreground">{item.result.fileName}</span>
                <OverallStatusBadge status={item.result.overallStatus} mode={item.result.mode} size="sm" />
                <span className="text-xs text-muted">
                  {new Date(item.queuedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </button>

              <div className="flex items-center gap-1.5">
                <span className={clsx("rounded-full px-2 py-0.5 text-xs font-medium", decisionConfig[item.decision].classes)}>
                  {decisionConfig[item.decision].label}
                </span>
                <DecisionButton
                  active={item.decision === "approved"}
                  onClick={() => setDecision(item.queuedAt, "approved")}
                  label="Approve"
                  Icon={Check}
                  activeClasses="bg-emerald-600 text-white"
                />
                <DecisionButton
                  active={item.decision === "flagged"}
                  onClick={() => setDecision(item.queuedAt, "flagged")}
                  label="Flag for follow-up"
                  Icon={Flag}
                  activeClasses="bg-amber-600 text-white"
                />
                <DecisionButton
                  active={item.decision === "rejected"}
                  onClick={() => setDecision(item.queuedAt, "rejected")}
                  label="Reject"
                  Icon={X}
                  activeClasses="bg-rose-600 text-white"
                />
                <button
                  type="button"
                  onClick={() => setExpanded(expanded === item.queuedAt ? null : item.queuedAt)}
                  className="rounded-md p-1.5 text-muted hover:bg-surface"
                  aria-label="Toggle details"
                >
                  {expanded === item.queuedAt ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {expanded === item.queuedAt && (
              <div className="border-t border-border p-3">
                <ResultPanel result={item.result} />
              </div>
            )}
          </div>
        ))}
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
      aria-label={label}
      title={label}
      className={clsx(
        "rounded-md p-1.5 transition-colors",
        active ? activeClasses : "text-muted hover:bg-surface hover:text-foreground",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

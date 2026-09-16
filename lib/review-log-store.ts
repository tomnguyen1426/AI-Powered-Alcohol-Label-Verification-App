"use client";

import { useSyncExternalStore } from "react";
import { loadReviewLog, saveReviewLog, type ReviewDecision, type ReviewLogEntry } from "./review-log";
import type { VerificationResult } from "./schema";

let entries: ReviewLogEntry[] = typeof window !== "undefined" ? loadReviewLog() : [];
const listeners = new Set<() => void>();
const EMPTY: ReviewLogEntry[] = [];

function notify() {
  for (const listener of listeners) listener();
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot() {
  return entries;
}

function getServerSnapshot() {
  return EMPTY;
}

export function logCheck(result: VerificationResult) {
  entries = [{ loggedAt: Date.now(), decision: "pending", result }, ...entries];
  saveReviewLog(entries);
  notify();
}

export function setDecision(loggedAt: number, decision: ReviewDecision) {
  entries = entries.map((entry) =>
    entry.loggedAt === loggedAt ? { ...entry, decision: entry.decision === decision ? "pending" : decision } : entry,
  );
  saveReviewLog(entries);
  notify();
}

export function clearReviewLog() {
  entries = [];
  saveReviewLog(entries);
  notify();
}

export function useReviewLog(): ReviewLogEntry[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

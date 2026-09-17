"use client";

import { useSyncExternalStore } from "react";
import {
  loadExampleOverrides,
  loadReviewLog,
  saveExampleOverrides,
  saveReviewLog,
  type ReviewDecision,
  type ReviewLogEntry,
} from "./review-log";
import { REVIEW_LOG_SEED } from "./review-log-seed";
import type { VerificationResult } from "./schema";

// The four example cases are shipped in the app itself (REVIEW_LOG_SEED),
// not stored as user data — every device shows the same four by default,
// regardless of that device's localStorage. Per-device overrides (dismissed
// / decision changes) are kept in a small separate key so acting on an
// example here doesn't affect what a different device sees.
function buildExamples(overrides: ReturnType<typeof loadExampleOverrides>): ReviewLogEntry[] {
  return REVIEW_LOG_SEED.filter((seed) => !overrides.dismissed.includes(seed.result.id)).map((seed) => ({
    ...seed,
    decision: overrides.decisions[seed.result.id] ?? seed.decision,
  }));
}

function byNewestFirst(a: ReviewLogEntry, b: ReviewLogEntry) {
  return b.loggedAt - a.loggedAt;
}

let exampleOverrides = typeof window !== "undefined" ? loadExampleOverrides() : { dismissed: [], decisions: {} };
let realEntries: ReviewLogEntry[] = typeof window !== "undefined" ? loadReviewLog() : [];
let entries: ReviewLogEntry[] = [...buildExamples(exampleOverrides), ...realEntries].sort(byNewestFirst);

const listeners = new Set<() => void>();
const EMPTY: ReviewLogEntry[] = [];

function recompute() {
  entries = [...buildExamples(exampleOverrides), ...realEntries].sort(byNewestFirst);
}

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

export function logCheck(result: VerificationResult): ReviewLogEntry {
  const entry: ReviewLogEntry = { loggedAt: Date.now(), decision: "pending", result };
  realEntries = [entry, ...realEntries];
  saveReviewLog(realEntries);
  recompute();
  notify();
  return entry;
}

export function setDecision(loggedAt: number, decision: ReviewDecision) {
  const target = entries.find((e) => e.loggedAt === loggedAt);
  if (!target) return;
  const next = target.decision === decision ? "pending" : decision;

  if (target.isExample) {
    exampleOverrides = { ...exampleOverrides, decisions: { ...exampleOverrides.decisions, [target.result.id]: next } };
    saveExampleOverrides(exampleOverrides);
  } else {
    realEntries = realEntries.map((e) => (e.loggedAt === loggedAt ? { ...e, decision: next } : e));
    saveReviewLog(realEntries);
  }
  recompute();
  notify();
}

export function deleteEntry(loggedAt: number) {
  const target = entries.find((e) => e.loggedAt === loggedAt);
  if (!target) return;

  if (target.isExample) {
    // Dismissing an example only affects this device — a different device
    // (or this one after clearing site data) sees it again by default.
    exampleOverrides = { ...exampleOverrides, dismissed: [...exampleOverrides.dismissed, target.result.id] };
    saveExampleOverrides(exampleOverrides);
  } else {
    realEntries = realEntries.filter((e) => e.loggedAt !== loggedAt);
    saveReviewLog(realEntries);
  }
  recompute();
  notify();
}

export function clearReviewLog() {
  // Clears real entries only; the four built-in examples are unaffected.
  realEntries = [];
  saveReviewLog(realEntries);
  recompute();
  notify();
}

export function useReviewLog(): ReviewLogEntry[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useReviewLogEntry(loggedAt: number): ReviewLogEntry | undefined {
  const all = useReviewLog();
  return all.find((entry) => entry.loggedAt === loggedAt);
}

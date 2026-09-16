"use client";

import { useSyncExternalStore } from "react";
import { loadReviewLog, saveReviewLog, type ReviewDecision, type ReviewLogEntry } from "./review-log";
import { REVIEW_LOG_SEED } from "./review-log-seed";
import type { VerificationResult } from "./schema";

const SEEDED_KEY = "labelcheck.review-log-seeded.v1";

function initialEntries(): ReviewLogEntry[] {
  if (typeof window === "undefined") return [];
  const stored = loadReviewLog();
  if (stored.length > 0) return stored;

  // Only seed the very first time this browser ever opens the log — once
  // someone has real entries (or has deliberately cleared them), don't keep
  // bringing the samples back.
  let alreadySeeded = false;
  try {
    alreadySeeded = localStorage.getItem(SEEDED_KEY) === "1";
  } catch {
    // localStorage unavailable — just don't seed, no harm either way.
    return [];
  }
  if (alreadySeeded) return [];

  try {
    localStorage.setItem(SEEDED_KEY, "1");
  } catch {
    // ignore
  }
  saveReviewLog(REVIEW_LOG_SEED);
  return REVIEW_LOG_SEED;
}

let entries: ReviewLogEntry[] = initialEntries();
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

export function deleteEntry(loggedAt: number) {
  entries = entries.filter((entry) => entry.loggedAt !== loggedAt);
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

export function useReviewLogEntry(loggedAt: number): ReviewLogEntry | undefined {
  const all = useReviewLog();
  return all.find((entry) => entry.loggedAt === loggedAt);
}

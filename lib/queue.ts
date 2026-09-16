import type { VerificationResult } from "./schema";

export type QueueDecision = "pending" | "approved" | "rejected" | "flagged";

export interface QueueItem {
  queuedAt: number;
  decision: QueueDecision;
  result: VerificationResult;
}

const STORAGE_KEY = "labelcheck.queue.v1";
const MAX_QUEUE_ITEMS = 200;

// Persisted history is per-browser only (localStorage) — there's no server-side
// database in this prototype, so it won't sync across devices or be visible to
// anyone else who opens the app. Image previews are dropped before persisting
// so a run of checks doesn't blow past the localStorage quota (a handful of
// base64-encoded photos can easily exceed the ~5–10 MB most browsers allow);
// they're still visible for the current session, just not after a reload.
function stripImageForStorage(result: VerificationResult): VerificationResult {
  return {
    id: result.id,
    fileName: result.fileName,
    mode: result.mode,
    extraction: result.extraction,
    comparisons: result.comparisons,
    overallStatus: result.overallStatus,
    processingTimeMs: result.processingTimeMs,
  };
}

export function loadQueue(): QueueItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveQueue(items: QueueItem[]): void {
  try {
    const trimmed = items.slice(0, MAX_QUEUE_ITEMS).map((item) => ({
      ...item,
      result: stripImageForStorage(item.result),
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Storage full or unavailable (private browsing, quota exceeded) — the
    // in-memory queue for this session still works, it just won't persist.
  }
}

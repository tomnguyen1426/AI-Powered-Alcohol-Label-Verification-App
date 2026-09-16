import type { VerificationResult } from "./schema";

export type ReviewDecision = "pending" | "approved" | "rejected" | "flagged";

export interface ReviewLogEntry {
  loggedAt: number;
  decision: ReviewDecision;
  result: VerificationResult;
}

const STORAGE_KEY = "labelcheck.review-log.v1";
const MAX_ENTRIES = 200;

// Persisted per-browser only (localStorage) — there's no server-side database
// in this prototype, so it won't sync across devices or be visible to anyone
// else who opens the app. A base64 image (data:...) is dropped before
// persisting so a run of checks doesn't blow past the localStorage quota (a
// handful of base64-encoded photos can easily exceed the ~5–10 MB most
// browsers allow) — it's still visible for the current page load, just not
// after a reload. A plain static path (e.g. a bundled sample image) is tiny
// and kept as-is, so it survives reloads too.
function stripImageForStorage(result: VerificationResult): VerificationResult {
  const keepImage = result.imageDataUrl && !result.imageDataUrl.startsWith("data:");
  return {
    id: result.id,
    fileName: result.fileName,
    mode: result.mode,
    extraction: result.extraction,
    comparisons: result.comparisons,
    overallStatus: result.overallStatus,
    processingTimeMs: result.processingTimeMs,
    ...(keepImage ? { imageDataUrl: result.imageDataUrl } : {}),
  };
}

export function loadReviewLog(): ReviewLogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveReviewLog(entries: ReviewLogEntry[]): void {
  try {
    const trimmed = entries.slice(0, MAX_ENTRIES).map((entry) => ({
      ...entry,
      result: stripImageForStorage(entry.result),
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Storage full or unavailable (private browsing, quota exceeded) — the
    // in-memory log for this page load still works, it just won't persist.
  }
}

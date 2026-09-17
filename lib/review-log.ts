import type { VerificationResult } from "./schema";

export type ReviewDecision = "pending" | "approved" | "rejected" | "flagged";

export interface ReviewLogEntry {
  loggedAt: number;
  decision: ReviewDecision;
  result: VerificationResult;
  // True for the four built-in example cases (one per decision state) —
  // shipped in the app itself, not user data, so every device shows the same
  // defaults regardless of what's in that device's localStorage.
  isExample?: boolean;
}

const STORAGE_KEY = "labelcheck.review-log.v1";
const EXAMPLE_OVERRIDES_KEY = "labelcheck.example-overrides.v1";
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

// Real, user-generated entries only — the four built-in examples are never
// written here (see review-log-seed.ts / review-log-store.ts).
export function loadReviewLog(): ReviewLogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((e) => !e?.isExample) : [];
  } catch {
    return [];
  }
}

export function saveReviewLog(entries: ReviewLogEntry[]): void {
  try {
    const realOnly = entries.filter((e) => !e.isExample);
    const trimmed = realOnly.slice(0, MAX_ENTRIES).map((entry) => ({
      ...entry,
      result: stripImageForStorage(entry.result),
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Storage full or unavailable (private browsing, quota exceeded) — the
    // in-memory log for this page load still works, it just won't persist.
  }
}

// Small per-device-only overrides for the built-in examples: which ones this
// device has dismissed, and any decision changes made on them here. A fresh
// device with none of this has every example present with its default
// decision — that's what makes them "the same for every user" by default.
export interface ExampleOverrides {
  dismissed: string[];
  decisions: Record<string, ReviewDecision>;
}

const EMPTY_OVERRIDES: ExampleOverrides = { dismissed: [], decisions: {} };

export function loadExampleOverrides(): ExampleOverrides {
  try {
    const raw = localStorage.getItem(EXAMPLE_OVERRIDES_KEY);
    if (!raw) return EMPTY_OVERRIDES;
    const parsed = JSON.parse(raw);
    return {
      dismissed: Array.isArray(parsed?.dismissed) ? parsed.dismissed : [],
      decisions: typeof parsed?.decisions === "object" && parsed.decisions ? parsed.decisions : {},
    };
  } catch {
    return EMPTY_OVERRIDES;
  }
}

export function saveExampleOverrides(overrides: ExampleOverrides): void {
  try {
    localStorage.setItem(EXAMPLE_OVERRIDES_KEY, JSON.stringify(overrides));
  } catch {
    // ignore — overrides just won't persist this session
  }
}

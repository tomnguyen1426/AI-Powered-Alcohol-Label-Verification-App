// Standard federal Government Health Warning Statement, required verbatim on all
// alcohol beverage labels per 27 CFR 16.21. The heading "GOVERNMENT WARNING:" must
// appear in capital and boldface letters, per 27 CFR 16.21(a).
export const STANDARD_GOVERNMENT_WARNING =
  "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.";

export const BEVERAGE_TYPES = ["distilled_spirits", "wine", "beer"] as const;
export type BeverageType = (typeof BEVERAGE_TYPES)[number];

// TTB allows small rounding tolerance on stated alcohol content vs. actual/labeled
// value depending on beverage type. We use a conservative flat tolerance for the
// prototype rather than modeling the full per-category regulatory tolerance table.
export const ABV_TOLERANCE_PERCENT = 0.3;

// Vercel serverless functions cap the whole request body at ~4.5 MB. Stay
// comfortably under that so a photo doesn't get rejected by the platform
// before our own validation ever runs.
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // 4 MB per image
export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

// Shared per-IP budget for anything that spends Claude API credits. Deliberately
// simple (in-memory, resets on cold start) — see README for the honest limits.
export const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
export const RATE_LIMIT_MAX_REQUESTS = 20;

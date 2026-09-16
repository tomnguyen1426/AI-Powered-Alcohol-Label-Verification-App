# Label Check — Alcohol Label Verification Prototype

A prototype that reads a photo of an alcohol beverage label and checks it, field by field, against
the data on a compliance application — the core of what TTB label-compliance agents do manually
today. Built as a standalone proof of concept; it does not integrate with COLAs Online or any
production TTB system.

**Live demo:** https://alcohol-label-verification-three.vercel.app

## Why it's built this way

This was scoped directly from the stakeholder interviews in the brief, not just the bullet-point
requirements:

- **Speed.** Sarah's team abandoned a prior scanning vendor because it took 30–40 seconds per
  label — slower than reading it by eye. The extraction call uses `claude-sonnet-5` at
  `effort: "low"` rather than the largest available model; measured latency on this dataset is
  **~4–6 seconds** end to end (image upload + AI extraction + comparison). That's close to, but
  doesn't always guarantee, the 5-second bar the team needs — see **Trade-offs** below.
- **Judgment, not just pattern-matching.** Dave's "STONE'S THROW" vs. "Stone's Throw" example is
  handled explicitly: text fields are normalized (case, punctuation, whitespace) before comparing,
  and near-but-not-identical matches are flagged **Review** rather than auto-failed or silently
  passed. The comparison logic lives in one place — [lib/compare.ts](lib/compare.ts) — so the
  matching rules are auditable independent of the AI extraction step.
- **Zero tolerance where it matters.** Jenny's point about the Government Warning statement is the
  one field that is *not* fuzzy-matched: it must be word-for-word correct and the "GOVERNMENT
  WARNING:" heading must be all-caps and bold, per 27 CFR 16.21. Any deviation is a hard
  **Mismatch**.
- **Built for Dave and Sarah's mother, not just Jenny.** One upload zone, one form, one button, a
  plain-language PASS / NEEDS REVIEW / FAIL banner before any detail table. No settings screen, no
  jargon, no marketing landing page to click through — the tool itself is the front page. The one
  setting that does exist — light/dark — is an explicit labeled switch, not an icon someone has to
  guess the meaning of.
- **Batch upload, no spreadsheet required.** Addresses Janet's recurring ask, but skips the CSV
  step entirely: drop in more than one photo and each label is validated against its own required
  fields (Government Warning wording/formatting, ABV, net contents, brand name, class/type) instead
  of against typed-in application data — there's nothing to fill in, and nothing to matching-by-
  filename against a spreadsheet. Upload exactly one photo instead and you get the full
  field-by-field comparison against application data, as normal. A few labels process concurrently
  rather than strictly one at a time either way.
- **Imperfect photos.** The extraction prompt explicitly tells the model to do its best on angled,
  glared, or low-resolution photos and to note quality issues rather than refuse — addressing
  Jenny's stretch-goal ask — instead of the current behavior of rejecting and asking for a reshoot.

## Tech stack

- **Next.js 16 (App Router) + TypeScript + Tailwind CSS** — one deployable app, server API routes
  next to the UI, no separate backend to stand up.
- **Claude (Anthropic API), `claude-sonnet-5`, structured outputs** — the label photo is sent as an
  image content block; the model returns a strictly-typed extraction (Zod schema in
  [lib/schema.ts](lib/schema.ts)) via `output_config.format`, so there's no free-text parsing of
  the model's response.
- **Two comparison engines, same extraction.** [lib/compare.ts](lib/compare.ts) does the
  field-by-field comparison against application data (normalized-text matching with a
  Levenshtein-similarity "Review" band, unit-aware net contents parsing, tolerance-based ABV
  comparison, the strict Government Warning check). [lib/self-check.ts](lib/self-check.ts) is the
  no-application-data path used by batch mode — it validates each field's own presence and format
  (still enforcing the Government Warning word-for-word) rather than comparing it to anything.
  Neither is AI — only the label reading is — so results are deterministic and explainable.
- **No database.** Everything is processed in memory per request and returned to the browser; the
  app does not persist label images, extracted text, or application data anywhere. This matches the
  "don't store anything sensitive for this exercise" guidance from IT.
- **Per-IP rate limiting.** Every route that calls Claude is throttled ([lib/rate-limit.ts](lib/rate-limit.ts))
  to protect the API key this demo runs on from runaway cost. It's intentionally simple (in-memory,
  resets on cold start) — see **Trade-offs** below for the honest limits of that approach.

## Getting started

### Prerequisites

- Node.js 20+
- An [Anthropic API key](https://console.anthropic.com/)

### Setup

```bash
npm install
cp .env.local.example .env.local
# edit .env.local and set ANTHROPIC_API_KEY=sk-ant-...
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Sample data

Six synthetic label images (no real brands) are already generated into `public/sample-labels/`,
each with matching application data baked into [lib/sample-data.ts](lib/sample-data.ts). They cover
the specific scenarios above: a clean pass, a harmless brand-name case difference, a strict
warning-formatting failure, a genuine ABV mismatch, a glare-affected photo, and an import with
country-of-origin. Use the sample buttons in the UI — one per label for the comparison path, or
"load all 6 as a batch" for the self-check path — or regenerate/extend them with:

```bash
npm run gen:labels
```

(uses `@napi-rs/canvas`, a dev-only dependency — not required at runtime).

### Build

```bash
npm run build
npm start
```

## How verification works

There's one upload zone. What happens next depends on how many photos land in it:

1. **One photo** → the application-data form appears. Fill in what's on file (brand name,
   class/type, ABV, net contents, producer/address, country of origin, beverage type, import flag)
   or load a sample, then verify. The server sends the image to Claude with a strict extraction
   schema, then runs the field-by-field comparison in [lib/compare.ts](lib/compare.ts). Each field
   gets **Match** / **Review** / **Mismatch** / **N/A**, and the label gets an overall **Pass** /
   **Needs Review** / **Fail**.
2. **More than one photo** → the form disappears; nothing to type in. Each photo gets its own
   `/api/verify` request (the browser fires these itself, a few at a time — see **Trade-offs** for
   why that's a platform-limit thing, not a style choice) and is validated in
   [lib/self-check.ts](lib/self-check.ts) against its own required fields instead of anything typed
   in. Each label ends up **OK**, **Needs Review**, or **Flagged**.

Both paths show the source image, a per-field readout, and the processing time.

## Assumptions

- **ABV tolerance:** ±0.3 percentage points is treated as a match, to absorb rounding — a
  simplification of TTB's actual per-category tolerance table, called out here rather than silently
  hard-coded.
- **Net contents:** parsed and compared in mL so "750 mL" and "0.75 L" are recognized as equal;
  values within ~2% are flagged Review rather than Mismatch to allow for minor rounding.
- **Producer/address and country of origin** use the same fuzzy-match band as brand name, since
  these are free-text fields with legitimate formatting variation.
- **Country of origin** is only required/compared when the application marks the product as an
  import.
- **The standard Government Warning text** is hard-coded from 27 CFR 16.21 as the single source of
  truth to check against, rather than accepting it as an application field.
- **Self-check mode (batch) can't catch a label that's simply wrong for the product applied for.**
  Without application data to compare against, it can only confirm required fields are present and
  well-formed (warning wording, ABV/net-contents format, etc.) — it can't tell you the ABV doesn't
  match what was actually filed, because it has nothing to compare it to. That's the trade for not
  needing a spreadsheet; use the single-photo comparison path when the exact match matters.

## Trade-offs & limitations

- **Latency vs. accuracy.** `claude-sonnet-5` at low effort was chosen specifically to chase the
  5-second target from the interviews; it is measurably faster and cheaper than the largest current
  model, and accuracy on the sample set (including the glare/case-difference scenarios) held up in
  testing. On a slow network or a very cluttered label, a single request can still land closer to
  6–8 seconds — there's no fallback to a faster/cheaper path if a request is running long. A
  production version would want e.g. client-side image downsizing before upload and a p95 latency
  budget, not just an average.
- **No COLA integration.** Per the IT conversation, this is a standalone tool — application data is
  typed in or CSV-imported, not pulled live from COLAs Online. A real integration would also change
  the batch workflow (pulling a queue of pending applications rather than uploading a CSV).
- **Outbound network dependency.** This calls the Anthropic API directly. The IT interview flagged
  that TTB's network blocks a lot of outbound ML traffic and that this sank half the previous
  vendor's features — worth flagging early with IT rather than discovering it during a deployment,
  since a production rollout inside TTB's network would need that traffic explicitly allowed (or a
  self-hosted/VPC-routed model deployment).
- **No persistence / no audit trail.** Nothing is saved server-side. A production system handling
  real applications would need to log verification results against the application ID for audit
  purposes, with appropriate PII/retention controls — intentionally out of scope for this
  prototype per the "don't store anything sensitive" guidance.
- **Batch mode sends one image per HTTP request, by necessity, not preference.** Vercel serverless
  functions cap the whole request body at roughly 4.5 MB, which rules out bundling a stack of label
  photos into a single upload — a handful of normal photos would already blow past that. Instead
  the browser dispatches one request per label with a small client-side concurrency pool, which
  also means each one is individually covered by the rate limiter below. The trade-off: a very
  large batch now takes proportionally longer (and can pause mid-run if it hits the rate limit)
  rather than finishing as one atomic server-side job.
- **Rate limiting is a soft, best-effort guard, not a hard cap.** The limiter in
  [lib/rate-limit.ts](lib/rate-limit.ts) is per-process in-memory state — on Vercel that means it's
  scoped to whichever warm serverless instance handles a given request, not shared globally, and it
  resets on a cold start or redeploy. It's good enough to stop casual abuse and to fail a demo
  gracefully with a message instead of a raw error, but it is **not** a substitute for setting an
  actual monthly spend cap on the Anthropic API key itself in the Anthropic Console — that's the
  only real guarantee against runaway cost, and it's a account-level setting this app can't
  configure for you.
- **No authentication.** Anyone with the URL can run a check — appropriate for an internal
  review/demo prototype, not for a multi-tenant production system.
- **English-language labels only.** The extraction prompt and Government Warning text assume
  English-language labeling.
- **Single warning statement text.** Some bottle sizes/categories have alternate or abbreviated
  statutory language (e.g. very small containers); this prototype checks against the one standard
  statement rather than the full category-specific rule set.

## Project structure

```
app/
  page.tsx              The whole UI — one photo or many, comparison or self-check
  api/verify/route.ts     API — branches to comparison or self-check depending on whether
                            applicationData was sent
lib/
  schema.ts               Zod schemas (application data + AI extraction)
  extract.ts               Claude vision call
  compare.ts                 Field-by-field comparison against application data
  self-check.ts               Per-field format validation with no application data
  rate-limit.ts                 Per-IP request throttling
  sample-data.ts                  Sample label metadata
components/                        UI components (ThemeToggle.tsx = the dark mode switch)
scripts/generate-sample-labels.ts     Synthetic label image generator
```

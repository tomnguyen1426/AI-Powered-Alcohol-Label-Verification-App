# LabelCheck AI — Alcohol Label Verification Prototype

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
  jargon.
- **Batch upload.** Addresses Janet's recurring ask: upload a stack of label photos plus a CSV of
  the matching application data, and the whole batch (up to 300 labels) processes concurrently
  instead of one at a time.
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
- **Custom comparison engine** ([lib/compare.ts](lib/compare.ts)) — normalized-text matching with a
  Levenshtein-similarity "Review" band for brand name / class-type / producer address, unit-aware
  parsing for net contents (mL/L/oz), tolerance-based ABV comparison, and the strict Government
  Warning check described above. No AI is involved in the comparison itself — only in reading the
  label — so results are deterministic and explainable.
- **No database.** Everything is processed in memory per request and returned to the browser; the
  app does not persist label images, extracted text, or application data anywhere. This matches the
  "don't store anything sensitive for this exercise" guidance from IT.

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
along with a matching `public/sample-data/applications.csv`. They cover the specific scenarios
above: a clean pass, a harmless brand-name case difference, a strict warning-formatting failure, a
genuine ABV mismatch, a glare-affected photo, and an import with country-of-origin. Use the
"Try a sample label" / "Load sample batch" buttons in the UI, or regenerate/extend them with:

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

1. The agent enters the fields from the COLA application (brand name, class/type, ABV, net
   contents, producer/address, country of origin, beverage type, import flag) or loads a sample.
2. A label photo is uploaded (single check) or a batch of photos + a CSV (batch check).
3. The server sends the image to Claude with a strict extraction schema — one API call per label,
   run concurrently in batches of 5.
4. The extracted fields are compared to the application data with the rules described above.
5. Each field gets a status (**Match** / **Review** / **Mismatch** / **N/A**) and the label gets an
   overall status (**Pass** / **Needs Review** / **Fail**), shown with the source image, the
   per-field readout, and the processing time.

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
- **CSV-based batch matching.** Batch mode matches images to application data by exact filename.
  It's simple and auditable, but a real 200–300-application bulk-import workflow would probably
  want matching by an application/COLA ID rather than filename discipline.
- **English-language labels only.** The extraction prompt and Government Warning text assume
  English-language labeling.
- **Single warning statement text.** Some bottle sizes/categories have alternate or abbreviated
  statutory language (e.g. very small containers); this prototype checks against the one standard
  statement rather than the full category-specific rule set.

## Project structure

```
app/
  page.tsx              Landing page
  verify/page.tsx        Single-label check UI
  batch/page.tsx          Batch check UI
  api/verify/route.ts      Single-label API
  api/verify-batch/route.ts Batch API (concurrency-limited)
lib/
  schema.ts               Zod schemas (application data + AI extraction)
  extract.ts               Claude vision call
  compare.ts                Matching/comparison rules
  csv.ts                     CSV parsing for batch mode
  sample-data.ts               Sample label metadata
components/                     UI components
scripts/generate-sample-labels.ts  Synthetic label image generator
```

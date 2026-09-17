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
  one field that is *not* fuzzy-matched, checked against 27 CFR 16.21 and TTB's published guidance
  directly: the wording must be word-for-word correct, the "GOVERNMENT WARNING:" heading must be
  all-caps and bold, and — easy to miss — the rest of the statement must specifically **not** be
  bold (only the heading is allowed to be). Any deviation on any of the three is a hard
  **Mismatch**. What this still can't check from a photo: the regulation's exact type-size
  (1–3 mm depending on container size) and max-characters-per-inch rules, or general legibility
  against the background — those need a physical reference in the image this app doesn't have, so
  they're an honest gap, not something faked. See **Trade-offs & limitations**.
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
- **A Review Log to work through, not just a one-off result.** Every check (single or batch) lands
  in a running log, and each entry opens on its own page — image, full field-by-field readout, and
  an Approve / Flag / Reject decision that's separate from and can override the tool's own
  PASS/REVIEW/FAIL read. The same decision control also shows up right on the Check page as soon as
  a result comes back, for both a single check and each item in a batch — no detour through the
  Review Log required if you want to decide immediately. Each row shows exactly one status badge,
  not two: the decision once a human has made one, falling back to the AI's own verdict while it's
  still Pending — showing both at once read as duplicated and confusing (a red "FAIL" next to a red
  "Rejected"). Entries can be deleted individually or the whole log cleared at once. See
  **What actually persists** below for exactly what that does and doesn't save.
- **Four example cases, the same for every device.** So the Review Log isn't an empty page (or a
  pile of duplicate seed data) the first time anyone opens it, four reference cases — one per
  decision state — ship as part of the app itself rather than as data written into any one device's
  storage. That means they show up identically everywhere the app is opened, hiding one on your
  laptop doesn't remove it from your phone, and a decision you change on one only affects that
  device's view of it. See **What actually persists**.
- **Beverage type is either picked or auto-detected — and it's actually checked.** The category
  (distilled spirits / wine / beer) drives which category-specific rules would apply, so leaving it
  to guesswork was a gap: it used to be collected on the form but never compared against anything.
  Now Claude classifies it from the label directly, and the agent can either pick a category
  explicitly (checked against what the label shows — catches picking the wrong category outright)
  or leave it on "Auto-detect from label" and just see what Claude read.

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
- **No server-side database.** Every check is processed in memory for that one request and returned
  to the browser — the server itself never writes a label image, extracted text, or application
  data anywhere. This matches the "don't store anything sensitive for this exercise" guidance from
  IT. The Review Log (previous bullet) is the one place anything is kept at all, and it's entirely
  client-side — see **What actually persists** below.
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

Seven synthetic label images (no real brands) are generated into `public/sample-labels/` by
[scripts/generate-sample-labels.ts](scripts/generate-sample-labels.ts) — a clean pass, a harmless
brand-name case difference, a strict warning-formatting failure (title-case heading), a whole-warning-
bold violation, a genuine ABV mismatch, a glare-affected photo, and an import with country-of-origin.
Regenerate/extend them with:

```bash
npm run gen:labels
```

(uses `@napi-rs/canvas`, a dev-only dependency — not required at runtime).

Four of these are always in the **Review Log** — one for each decision state (an Approved pass, a
Rejected fail, a Flagged "needs review", and a still-Pending fail) — so there's something to look
at right away, in every filter, on every device. See [lib/review-log-seed.ts](lib/review-log-seed.ts):
the first two are real Claude output captured during testing; the other two are constructed directly
from what's actually printed on their label images (this app generates its own sample labels, so
that's known ground truth), specifically to land in the Review and Fail bands. All four run through
the same deterministic comparison logic the app uses live — nothing fabricated, just baked into the
app rather than fetched, so this costs zero API calls.

These four are shipped in the code (`REVIEW_LOG_SEED`), not written into any device's `localStorage`
as data — that's deliberate, see **What actually persists** for why it means they're identical on
every device by default. They can still be deleted from the list (the button reads "Hide" on the
entry page to be precise about what that does) and decided on like anything else; both of those
actions are recorded as a small per-device override rather than mutating the shared examples, so
hiding one or changing its decision on your phone has no effect on what your laptop — or anyone
else opening the deployed URL — sees.

### Build

```bash
npm run build
npm start
```

## How verification works

There's one upload zone. What happens next depends on how many photos land in it:

1. **One photo** → the application-data form appears. Fill in what's on file (brand name,
   class/type, ABV, net contents, producer/address, country of origin, import flag) and either pick
   a beverage type or leave it on "Auto-detect from label", then verify. The server sends the image
   to Claude with a strict extraction schema, then runs the field-by-field comparison in
   [lib/compare.ts](lib/compare.ts). Each field gets **Match** / **Review** / **Mismatch** / **N/A**,
   and the label gets an overall **Pass** / **Needs Review** / **Fail**.
2. **More than one photo** → the form disappears; nothing to type in. Each photo gets its own
   `/api/verify` request (the browser fires these itself, a few at a time — see **Trade-offs** for
   why that's a platform-limit thing, not a style choice) and is validated in
   [lib/self-check.ts](lib/self-check.ts) against its own required fields instead of anything typed
   in. Each label ends up **OK**, **Needs Review**, or **Flagged**.

Both paths show the source image, a per-field readout, and the processing time.

## What actually persists

Short version: **nothing leaves your browser, and the server keeps nothing at all.** Longer version,
because this is the kind of thing worth being precise about:

| | Persists? | Where | Survives a reload? | Same on every device? |
|---|---|---|---|---|
| The label image you upload | No | Sent to Claude for that one request, then discarded server-side | — | N/A |
| Application data you type in | No | Only in page state (React), sent in that one request | No — clearing the form or reloading loses it | N/A |
| A real check's text result (fields, statuses, notes) | **Yes** | Browser `localStorage`, in the Review Log | **Yes** | No — this device only |
| A real check's image, inside the Review Log | Only until you reload | Kept in memory for the current page load, dropped before writing to `localStorage` | No | No |
| Your Approve/Reject/Flag decisions on a real check | **Yes** | Browser `localStorage`, alongside the log entry | **Yes** | No — this device only |
| The four example cases (image, fields, default decision) | **Yes** | Shipped in the app's code (`lib/review-log-seed.ts`), not written to `localStorage` at all | **Yes** | **Yes** — identical everywhere by default |
| Hiding an example, or changing its decision | **Yes** | A small separate `localStorage` override (which example IDs are hidden, and any decision changes) | **Yes** | No — this device only; a different device still sees the untouched default |
| Anthropic API key | N/A | Server-side environment variable only | — | N/A — never sent to the browser at all |

In plain terms: your real checks in the Review Log are real and do persist — reload the page, close
the tab, come back tomorrow, they're still there — but they live only in that one browser, on that
one device. It's not a database, nobody else who opens the deployed URL sees your log, it doesn't
sync between your phone and your laptop, and clearing your browser's site data deletes them
permanently with no way to recover them. The one thing they deliberately don't keep is the label
photo itself past the current page load, specifically so a long day of checks doesn't run into
browser storage limits (localStorage is typically capped around 5–10 MB per site, and photos are the
only thing here large enough to hit that).

The four **example** cases are the opposite in every one of those respects, on purpose: they're
part of the app itself, so they're identical wherever it's opened, and the only thing that's ever
local is whether *you* have chosen to hide one or change its decision on the device in front of you.

If you want real check data to actually survive across people or devices — a real shared team
queue — that needs a server-side database and is explicitly not what this prototype does; see
**Trade-offs & limitations**.

## Security

What's actually in place, in one place, rather than scattered across other sections:

- **The Anthropic API key never reaches the browser.** It's read from a server-side environment
  variable ([lib/extract.ts](lib/extract.ts)) inside an API route that only runs on the server;
  nothing in the client bundle references it, and `.env.local` is git-ignored so it never ends up
  in the repo either. The only way to get it is to already have server access to the deployment.
- **Every request is validated before it's trusted.** `ApplicationDataSchema` and
  `LabelExtractionSchema` ([lib/schema.ts](lib/schema.ts)) are Zod schemas — malformed or
  unexpected JSON from the client is rejected with a 400, not passed through. Uploaded files are
  checked against an allowed MIME-type list and a 4 MB size cap
  ([lib/constants.ts](lib/constants.ts)) both client-side (fast feedback) and server-side (the
  actual authority — a client check is a courtesy, not a security boundary).
- **Per-IP rate limiting** ([lib/rate-limit.ts](lib/rate-limit.ts)) sits in front of the only route
  that spends API credits, specifically so a link to this demo can't be used to run up an unbounded
  bill. It's a soft, best-effort guard, not a hard cap — see **Trade-offs & limitations** for the
  honest limits of an in-memory limiter on serverless infrastructure, and set an actual spend cap on
  the API key itself for a real guarantee.
- **No authentication, by design, for this scope.** Anyone with the URL can run a check. There's no
  login, no session, no cookie — which also means there's nothing here for CSRF or session-fixation
  attacks to target. This is appropriate for an internal review/demo prototype and explicitly not
  appropriate for a multi-tenant production system; see **Trade-offs & limitations**.
- **Nothing server-side to steal.** There's no database, so there's no SQL/NoSQL injection surface
  and no data store that could leak in a breach — every request's image and application data is
  processed in memory and discarded once the response is sent (see **What actually persists**).
- **No `dangerouslySetInnerHTML` of anything user-controlled.** The one place this app injects raw
  HTML/script is the dark-mode init snippet in [app/layout.tsx](app/layout.tsx), and that string is
  a hard-coded constant with no user input anywhere near it. Every other piece of extracted or
  typed-in text renders through normal React, which escapes it by default.
- **HTTPS everywhere**, provided by Vercel for the deployed URL — no plaintext HTTP path exists for
  the production deployment.
- **Client-side storage is origin-scoped and contains no more than what you typed in.** The Review
  Log lives in this origin's `localStorage`; browsers don't let other sites read it, and it holds
  only the check results themselves — no credentials, tokens, or anything beyond the application
  data a user entered and the label's extracted text.
- **What a real production deployment would still need** that this prototype deliberately doesn't
  attempt: authentication/authorization, server-side audit logging with PII/retention controls,
  bot/abuse protection beyond a soft rate limit, dependency vulnerability scanning in CI, and a
  documented incident-response path for the API key if it were ever exposed. All of this was scoped
  out per the "don't do anything crazy, we're not storing anything sensitive for this exercise"
  guidance from the IT interview, not overlooked.

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
- **Beverage type is Claude's best guess, classified from the class/type wording and other visual
  cues** — it's not a database lookup or a guaranteed-correct classification, and an ambiguous or
  unusual label could get misclassified. When the agent picks a category explicitly, that mismatch
  would show up as a genuine **Mismatch**; when left on auto-detect, there's nothing to compare
  against, so a misclassification just shows the wrong label silently rather than flagging anything.
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
- **No shared/server-side persistence, no real audit trail.** The Review Log is real but
  browser-local only (see **What actually persists**) — it's not shared with other agents or a
  supervisor, doesn't survive switching devices, and isn't the kind of tamper-evident audit log a
  production compliance system would need. A real deployment would need to log verification results
  against the application ID server-side, with appropriate PII/retention controls — intentionally
  out of scope for this prototype per the "don't store anything sensitive" guidance.
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
- **Government Warning checks that stop at wording and bolding.** 27 CFR 16.21 and TTB's guidance
  also specify a minimum type size (1 mm/2 mm/3 mm depending on container size), a max
  characters-per-inch at each size, that the statement must read as one continuous paragraph, that
  it must be set apart from other label copy, and that it must be legible against its background.
  None of that is checked — reliably measuring print size in millimeters or judging legibility from
  a phone photo with no physical reference/ruler in frame isn't something this app attempts, rather
  than pretending to and guessing. It also doesn't apply the 0.5% ABV threshold below which the
  warning isn't legally required at all — the prototype always expects it.

## Project structure

```
app/
  page.tsx                    Check — one photo or many, comparison or self-check
  history/page.tsx              Review Log — list of every past check, filterable by decision
  history/[loggedAt]/page.tsx     One entry's own page — full analysis + decision + delete
  api/verify/route.ts               API — branches to comparison or self-check depending on
                                      whether applicationData was sent
lib/
  schema.ts               Zod schemas (application data + AI extraction)
  extract.ts               Claude vision call
  compare.ts                 Field-by-field comparison against application data
  self-check.ts               Per-field format validation with no application data
  rate-limit.ts                 Per-IP request throttling
  review-log.ts                   localStorage read/write for real Review Log entries (image
                                    stripped before saving, unless it's a small bundled path) and
                                    for the small per-device example-override list
  review-log-store.ts               Reactive in-memory store — merges the four built-in examples
                                      with real entries, log/delete/decide/clear, shared by the
                                      Check page and Review Log pages
  review-log-seed.ts                  The four permanent example cases (one per decision state)
  sample-data.ts                        Sample label metadata (dev/reference — regenerate seed
                                          data from this, nothing at runtime imports it directly)
components/                                UI components (ThemeToggle.tsx = dark mode switch,
                                             ResultPanel.tsx exports `displayName` — brand name
                                             over filename, used everywhere a check is listed;
                                             DecisionControls.tsx = the Approve/Flag/Reject
                                             buttons, shared by the Check page and Review Log)
scripts/generate-sample-labels.ts             Synthetic label image generator
```

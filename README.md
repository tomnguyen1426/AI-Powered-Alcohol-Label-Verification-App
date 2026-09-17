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
  plain-language Pass / Flagged / Failed banner before any detail table. No settings screen, no
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
  Pass/Flagged/Failed read. "Flagged" is the deliberately reused word — the AI's own "needs a
  closer look" verdict and a human's "hold this for follow-up" decision are conceptually the same
  thing, just at different points in the process, so they share one word and one flag icon instead
  of competing near-synonyms ("Needs Review" vs. "Flagged" read as two different states when they
  weren't). What tells them apart is never wording: it's color/weight (amber outline badge for the
  AI's read vs. a solid amber pill for a human's decision) and, more importantly, that only one
  ever shows per row — see the next sentence. The same decision control also shows up right on the
  Check page as soon as a result comes back, for both a single check and each item in a batch — no
  detour through the Review Log required if you want to decide immediately. Each row shows exactly
  one status badge, not two: the decision once a human has made one, falling back to the AI's own
  verdict while it's still Pending — showing both at once read as duplicated and confusing (a red
  "Failed" next to a red "Rejected"). Deciding on an entry from its own page swaps the decision buttons for a confirmation
  ("Rejected 'X'") with two ways forward: back to the list, or straight on to the next application
  worth a look — "Next Application" searches forward through the log for the next **Pending** entry
  first, since those haven't been looked at at all, and only offers up a **Flagged** one once every
  Pending entry has been cleared, since those have already been seen once and held for follow-up
  rather than left untouched. Once neither is left, it says so instead of showing a dead-end button.
  That priority means working through a stack of applications doesn't mean returning to the list
  after every single one. Entries can be deleted individually, one at a time. See
  **What actually persists** below for exactly what that does and doesn't save.
- **Nine example cases, the same for every device.** So the Review Log isn't an empty page (or a
  pile of duplicate seed data) the first time anyone opens it, nine reference cases — spread across
  all four decision states and every overall outcome, including a self-check result, not just
  comparison ones — ship as part of the app itself rather than as data written into any one device's
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

Nine synthetic label images (no real brands) are generated into `public/sample-labels/` by
[scripts/generate-sample-labels.ts](scripts/generate-sample-labels.ts) — a clean pass, a harmless
brand-name case difference, a strict warning-formatting failure (title-case heading), a
whole-warning-bold violation, a genuine ABV mismatch, a glare-affected photo, an import with
country-of-origin, a wine label with a producer near-miss, and a beer label with no ABV stated at
all (a real exemption, not a mismatch). Regenerate/extend them with:

```bash
npm run gen:labels
```

(uses `@napi-rs/canvas`, a dev-only dependency — not required at runtime).

Nine of these are always in the **Review Log** — spread across all four decision states (two each
Approved / Rejected / Flagged, three Pending) and every overall outcome, including one self-check
result (the beer label) rather than only comparison ones — so there's something to look at right
away, in every filter, on every device. See [lib/review-log-seed.ts](lib/review-log-seed.ts): the
first two are real Claude output captured during testing; the rest are constructed directly from
what's actually printed on their label images (this app generates its own sample labels, so that's
known ground truth) — some landing on their label's natural outcome, others with a deliberately
introduced near-miss to land in the Review band. All nine run through the same deterministic
comparison/self-check logic the app uses live — nothing fabricated, just baked into the app rather
than fetched, so this costs zero API calls.

These nine are shipped in the code (`REVIEW_LOG_SEED`), not written into any device's `localStorage`
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
   and the label gets an overall **Pass** / **Flagged** / **Failed**.
2. **More than one photo** → the form disappears; nothing to type in. Each photo gets its own
   `/api/verify` request (the browser fires these itself, a few at a time — see **Trade-offs** for
   why that's a platform-limit thing, not a style choice) and is validated in
   [lib/self-check.ts](lib/self-check.ts) against its own required fields instead of anything typed
   in. Each label ends up **OK**, **Flagged**, or **Failed**.

Both paths show the source image, a per-field readout, and the processing time.

## Validation & error messages

What's actually required, and exactly what you'll see if something's missing or goes wrong —
spelled out here rather than left to trial and error.

**Required to submit a single check:**

- **Brand Name** — always required. Leaving it blank and clicking Verify Label shows *"Brand Name
  is required to check against."* and doesn't submit.
- **Country of Origin** — required only once **"This is an imported product"** is checked, both in
  the UI (immediate error: *"Country of Origin is required when 'This is an imported product' is
  checked."*) and in the API's own validation (`ApplicationDataSchema` in
  [lib/schema.ts](lib/schema.ts) — the actual authority; the UI check just gives an instant message
  instead of a round-trip).
- **Beverage Type** is never a blocking field — "Auto-detect from label" is itself a valid choice,
  not a placeholder for one.
- Everything else (Class/Type, ABV, Net Contents, Producer/Address) can be left blank; a gap there
  shows up as an **N/A** in the comparison instead of blocking submission.
- At least one photo has to be in the upload zone at all — otherwise: *"Upload at least one label
  photo first."*

**Upload validation** (checked both client-side, for instant feedback, and server-side, which is
the real authority):

- Only PNG, JPEG, or WEBP. Anything else is silently skipped from the upload list with a small
  *"Skipped: filename (unsupported type)"* note rather than a hard error.
- 4 MB per image, max. Oversized files get the same *"Skipped: filename (over 4 MB)"* treatment
  client-side; if one somehow reaches the server anyway, the API rejects it with *"Image is too
  large (4 MB max)."*
- Batch mode caps out at 100 photos per run on this demo — past that: *"Please check 100 labels or
  fewer at a time on this demo."*

**If something fails after you hit Verify** — these come from [app/page.tsx](app/page.tsx)'s
`verifyOne` helper, which every check (single or batch) goes through:

- Can't reach the server at all → *"Network error — could not reach the server."*
- Hit the shared rate limit (see **Security**) → *"This demo is rate-limited to keep API costs in
  check. Try again shortly."* (batch mode retries this automatically a few times with a backoff
  instead of surfacing it immediately).
- The server responded with something unparseable → *"The server returned an unreadable
  response."*
- The label extraction itself timed out → *"The label extraction took too long and timed out.
  Please try again."*
- Any other failure calling Claude → a generic *"Verification failed unexpectedly. Please try
  again."* — the real error is logged server-side only (`console.error`), never echoed back to the
  browser verbatim, since it could contain internal Anthropic SDK/API diagnostic detail rather than
  anything meant for an end user. See **Security**.
- A 400 rejected *before* any call to Claude (missing image, unsupported type, oversized file,
  malformed/invalid application data) does return a specific message — but only ever text this app
  wrote itself (e.g. *"Brand name is required"* from `ApplicationDataSchema`'s own validation
  rules), never anything sourced from an upstream system.

**In the Review Log:** opening a link to an entry that's since been deleted or hidden
shows *"Entry not found — it may have been deleted, or hidden on this device."* rather than a
blank or broken page.

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
| The nine example cases (image, fields, default decision) | **Yes** | Shipped in the app's code (`lib/review-log-seed.ts`), not written to `localStorage` at all | **Yes** | **Yes** — identical everywhere by default |
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

The nine **example** cases are the opposite in every one of those respects, on purpose: they're
part of the app itself, so they're identical wherever it's opened, and the only thing that's ever
local is whether *you* have chosen to hide one or change its decision on the device in front of you.

If you want real check data to actually survive across people or devices — a real shared team
queue — that needs a server-side database and is explicitly not what this prototype does; see
**Trade-offs & limitations**.

## Security

The full write-up — asset classification, a STRIDE threat analysis (Spoofing / Tampering /
Repudiation / Information Disclosure / Denial of Service & cost abuse / Elevation of Privilege),
the controls actually in place, and the security-specific subset of known limitations — lives in
**[SECURITY.md](SECURITY.md)** rather than here, specifically so it shows up under this repo's own
**Security** tab on GitHub instead of being buried partway down a long README.

Short version: the Anthropic API key never reaches the browser, every request is validated
server-side regardless of what any client-side check already caught, there's no database and
nothing server-side persists between requests, and a per-IP rate limiter plus upload size/type
caps guard against the one real cost risk — a link to this demo running up an unbounded Anthropic
bill. See [SECURITY.md](SECURITY.md) for the reasoning behind each of those and what's honestly
still missing for a production deployment (auth, audit logging, a hard spend cap, etc.).

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
- **The ABV-exemption rule is generic, demoed with one example.** `alcohol_content_percent: null`
  is treated as an exempt category rather than a missing/mismatched field for any beverage type — it
  isn't beer-specific — but the sample set only actually ships one label exercising it (the beer,
  since some malt beverages commonly omit ABV); a wine label under the ABV threshold TTB also
  exempts would hit the same code path but isn't separately demonstrated here.
- **Self-check mode (batch) can't catch a label that's simply wrong for the product applied for.**
  Without application data to compare against, it can only confirm required fields are present and
  well-formed (warning wording, ABV/net-contents format, etc.) — it can't tell you the ABV doesn't
  match what was actually filed, because it has nothing to compare it to. That's the trade for not
  needing a spreadsheet; use the single-photo comparison path when the exact match matters.

## Trade-offs & limitations

Everything below is a scope trade-off, not a security gap — the security-specific subset of these
(soft rate limiting, no auth, no audit log) is also covered from a threat-modeling angle in
**[SECURITY.md](SECURITY.md)**, which is the place to look for *why* those are acceptable here.

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
- **The 100-photo batch cap is below Janet's actual use case.** She described dumps of 200–300
  label applications at once; this demo caps a single batch at 100
  ([app/page.tsx](app/page.tsx)) specifically to bound one run's worst-case API cost on a
  publicly-reachable demo key, not because the architecture can't go higher. Raising it is a
  one-line change once the API key has a real spend cap behind it (see **Security**); a production
  version would likely chunk a 200–300 photo drop into automatic sequential batches instead of
  asking the agent to split it manually.
- **Rate limiting guards against cost abuse, but only softly — not a hard cap.** The limiter in
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
  review-log-store.ts               Reactive in-memory store — merges the nine built-in examples
                                      with real entries, log/delete/decide, shared by the
                                      Check page and Review Log pages
  review-log-seed.ts                  The nine permanent example cases, across every decision
                                        state and outcome
  sample-data.ts                        Sample label metadata (dev/reference — regenerate seed
                                          data from this, nothing at runtime imports it directly)
components/                                UI components (ThemeToggle.tsx = dark mode switch,
                                             ResultPanel.tsx exports `displayName` — brand name
                                             over filename, used everywhere a check is listed;
                                             DecisionControls.tsx = the Approve/Flag/Reject
                                             buttons, shared by the Check page and Review Log)
scripts/generate-sample-labels.ts             Synthetic label image generator
```

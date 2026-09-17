# Security

This is a take-home prototype, not a maintained open-source project — there's no bug bounty or
disclosure program here. This file exists so GitHub's own **Security** tab surfaces it, and so the
threat model lives somewhere more discoverable than buried in the main README. See
[README.md](README.md) for setup, architecture, and everything not security-specific.

## Assets & data classification

What this app actually handles, and how sensitive each thing is:

| Asset | Classification | Where it lives | Notes |
|---|---|---|---|
| Anthropic API key | Secret | Server-only env var (`.env.local` / Vercel project config) | Never sent to the client; never committed. |
| Uploaded label photo | Transient, business-confidential | In memory for the duration of one request only | Not written to disk or a database server-side. Persisted client-side only as a small static sample path or dropped entirely — see the README's **What actually persists**. |
| Typed-in application data (brand, class/type, ABV, etc.) | Internal / business data | Browser memory during a check; `localStorage` afterward if the result is kept | Not secret, but it's a real applicant's filing details — not something to leak to another site or another device by accident. |
| Extracted label text + comparison verdict | Internal / business data | `localStorage` (Review Log), same origin only | Derived from the two inputs above; same sensitivity. |
| Review Log entries (real checks) | Internal / business data | Client-side only, this browser/device only | Never leaves the browser once created. |
| The nine example cases | Public / reference | Shipped in source ([lib/review-log-seed.ts](lib/review-log-seed.ts)) | Synthetic, invented data — not a real applicant, safe to be public and identical on every device. |
| Rate-limiter counters | Minimal / operational | Server memory only, per-IP, reset on redeploy | Contains a client IP and a request count — nothing else — and only for the rate-limiting window. |
| Source code & deployment config | Public | GitHub repo, Vercel project | Secrets (the API key) are deliberately excluded via `.env.local` + `.gitignore`, not just "not committed yet." |

Nothing in this app rises to the level of regulated PII (no names tied to individuals, no payment
data, no health data) — the most sensitive thing here is the Anthropic API key, which is the one
asset actually treated as a secret.

## Threats considered (STRIDE)

- **Spoofing** — not applicable in any meaningful sense: there's no login, no session, and no
  identity to impersonate. The one place spoofing *could* matter — a malicious client claiming to
  be a different IP to dodge the rate limit — is a known, accepted gap; see **Denial of service /
  cost abuse** below.
- **Tampering** — in transit, HTTPS (via Vercel) rules out a network-level man-in-the-middle
  altering a request or response. More importantly, the server never trusts a client-supplied
  verdict: every PASS/FLAGGED/FAILED comes from re-deriving the comparison server-side from the
  actual uploaded image bytes and the actual submitted application data
  (`app/api/verify/route.ts`), so a client can't send a pre-built "PASS" result and have it
  accepted. A user *can* edit their own `localStorage` (their own Review Log, their own decisions)
  — but that's tampering with their own browser's own view of their own data; it doesn't touch the
  server, doesn't affect any other device, and doesn't grant anything a legitimate decision button
  wouldn't.
- **Repudiation** — explicitly out of scope, not overlooked: there's no server-side audit log, so
  there's no record of who ran which check or made which decision beyond what sits in that one
  browser's `localStorage`. That's an acceptable gap for an internal review/demo prototype and is
  called out again under **What a real production deployment would still need** below.
- **Information disclosure** — the API key is the one real secret and never reaches the client (see
  **Controls in place** below). Error messages returned to the browser were audited as part of
  building this file: the verify route used to echo `err.message` from a failed Claude API call
  straight back to the client, which could leak internal Anthropic SDK/API diagnostic detail; it
  now always returns a generic message (or a pre-written timeout-specific one) and logs the real
  error server-side only via `console.error` — see the README's **Validation & error messages**.
  One disclosure is real and intentional, not a bug: the label image and application data are sent
  to Anthropic's API to run the extraction, which is the whole point of the app, and is a third
  party the operator is trusting by design. Client-side storage is origin-scoped, so no other site
  can read a browser's Review Log.
- **Denial of service / cost abuse** — the specific risk here isn't taking the app offline, it's
  running up the Anthropic bill behind it, since every verification call spends real API credits on
  a key this demo controls. Two layers guard against that: the per-IP rate limiter
  ([lib/rate-limit.ts](lib/rate-limit.ts): 20 requests per IP per 10-minute window) and the
  request/file/type size caps ([lib/constants.ts](lib/constants.ts): 4 MB per image, PNG/JPEG/WEBP
  only, 100 images per batch). Both are acknowledged as soft: the rate limiter is in-memory per
  serverless instance, so it doesn't hold up strictly across Vercel's scaled-out instances, and an
  attacker can simply rotate IPs or spread requests across instances to get around it. The real
  backstop for this deployment is a spend cap set directly on the Anthropic API key in the
  Anthropic Console — that's an account-level setting no amount of in-app logic can be bypassed
  around, and it's the only guarantee that actually matters if this URL circulates further than
  intended.
- **Elevation of privilege** — not applicable: there are no privilege levels, roles, or permissions
  anywhere in this app for anything to elevate into.

## Controls in place

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
  that spends API credits, specifically so a link to this demo can't be used to run up an
  unbounded bill. It's a soft, best-effort guard, not a hard cap — set an actual spend cap on the
  API key itself in the Anthropic Console for a real guarantee.
- **No authentication, by design, for this scope.** Anyone with the URL can run a check. There's no
  login, no session, no cookie — which also means there's nothing here for CSRF or
  session-fixation attacks to target. This is appropriate for an internal review/demo prototype
  and explicitly not appropriate for a multi-tenant production system.
- **Nothing server-side to steal.** There's no database, so there's no SQL/NoSQL injection surface
  and no data store that could leak in a breach — every request's image and application data is
  processed in memory and discarded once the response is sent.
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

## Known limitations

Security-relevant gaps this prototype deliberately doesn't close, scoped out per the "don't do
anything crazy, we're not storing anything sensitive for this exercise" guidance from the original
IT interview, not overlooked:

- **No authentication/authorization.** Anyone with the URL can run a check.
- **No server-side audit logging.** There's no record of who ran or decided what beyond one
  browser's own `localStorage` — see **Repudiation** above.
- **Rate limiting is soft, not a hard cap.** In-memory, per-serverless-instance, resets on
  cold start/redeploy, and doesn't stop IP rotation. The Anthropic Console spend cap is the real
  backstop.
- **No bot/abuse protection** beyond that soft rate limit — no CAPTCHA, no WAF, no anomaly
  detection.
- **No dependency vulnerability scanning in CI.**
- **No documented incident-response path** for the API key if it were ever exposed.

For everything else non-security this prototype trades off (latency vs. accuracy, no COLA
integration, the 100-image batch cap, browser-only persistence, English-only labels, etc.), see
the README's **Trade-offs & limitations** section — this file only covers the security-specific
subset of that list.

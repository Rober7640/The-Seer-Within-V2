# Marcus local funnel simulation

This harness tests the customer journey, saved reading context and adaptive PDF rendering without payment, remote database, model, audio or email services. It binds only to `127.0.0.1`. The CLI persists fixture state in `/tmp/08-marcus-local/state.sqlite`; tests use isolated memory or temporary SQLite files. Use made-up customer details.

From the repository root:

```sh
./node_modules/.bin/tsx improve-v1/v1-one-time-BEs/local/08-marcus/server.ts
```

Open `http://127.0.0.1:5088`. The tested customer sequence is AWeber email preview → booking (cards, price, speed bump, one button) → checkout stand-in (email, name on card, birth name, date of birth, simulated pay) → post-purchase bridge → audio Upsell 1 → thank-you. No root environment file is loaded. The dedicated launcher does not import the application server, DB, Stripe, analytics or customer-list clients. It uses the pure local draw engine, whose existing numerology calculation has no service calls.

## Routes

All page routes serve the same shell (`client/index.html`); `shared.js` picks the page from the path and query.

| Route | Page file | Masthead dateline | Needs |
|---|---|---|---|
| `/` | `shared.js` (`PAGES.start`) | Test entry | — |
| `/email?edition=<id>` | `pages/email.js` | Daily letter | edition |
| `/booking?edition=<id>` | `pages/booking.js` | ORDER FORM | edition |
| `/checkout-sim?intake=<id>` | `pages/checkout-sim.js` | (chrome hidden — imitates a hosted checkout) | intake |
| `/bridge?order=<id>` | `pages/bridge.js` | ORDER CONFIRMED | order |
| `/upsell?order=<id>` | `pages/upsell.js` | ONE ADDITION | order |
| `/thank-you?order=<id>` | `pages/thank-you.js` | RECEIPT | order |

**Operator ruling 3 (2026-09-13):** the booking page collects no personal data. In production the one button goes to Stripe's hosted Checkout, which collects email, name and card, with full birth name and date of birth as Checkout custom fields. `/checkout-sim` is the local stand-in for that page: plain style, clearly labelled, no Stripe branding. The bridge still needs a click on `#to-upsell` (ruling 1's 5–10 s auto-redirect is the bridge agent's job).

## File layout

```
client/
  index.html          shell only: fonts link, stylesheet, banner, masthead/app/error/footer, script tags in order
  styles.css          the whole look — token sheet from design-reviews/04 §3 + review 05 floors
  shared.js           api(), route()/go(), boot(), shell() (masthead + footer), state S, PAGES registry, helpers
  pages/
    email.js          AWeber handoff fixture
    booking.js        ORDER FORM         ← booking page agent
    checkout-sim.js   hosted-checkout stand-in
    bridge.js         ORDER CONFIRMED    ← bridge page agent
    upsell.js         ONE ADDITION       ← upsell page agent
    thank-you.js      RECEIPT            ← thank-you page agent
assets/               mockup images as plain files (portrait, card back, four fixed faces), served by /api/assets/:id
server.ts             loopback-only HTTP server: pages, client files, assets, the API below, internal stage adapters
contracts.ts          Intake / PaidOrder / Edition types
draw.ts · fixtures.ts · store.ts · fulfillment.ts · render-report-pdf.py   engine, fixtures, SQLite store, stage adapters, PDF
*.test.ts · browser.test.cjs   tests (see below)
```

Plain script tags, no bundler, no framework. Each page registers `PAGES.<name>`; pages share state through `S` (`edition`, `cards`, `intake`, `order`) and move with `go(path, page)`. A page agent edits only its own `pages/*.js` and, if needed, adds rules to `styles.css` under its own comment header.

### The look (styles.css)

Bodoni Moda (display, never under 20px) + Spectral (text) from the same Google Fonts link the daily email uses, Georgia fallback; the 14-colour broadsheet palette copied from `scripts/build-08-daily.py`; SCOTCH / DOUBLE / FOLIO rules as one-line gradients; the compact nameplate masthead with a dateline; the "stamp" primary button and the 17px red decline; face-up card = 1px ink frame + `FIG.` caption, face-down = hairline frame; desk-light background with 4% grain. Floors from review 05 applied as tokens: body 18px on phones, nothing under 13px, labels 14px, footer 13px, tap targets ≥ 44px, field border ≥ 3:1 (`--field` darkened to `#857b69`), text column ≤ 680px. Keyframes `deal` / `rise` / `draw` are defined but not wired — one motion moment per page is each page agent's call.

## API

All JSON errors have `{ "error": "message" }`; no stack traces or customer details are logged. No cross-origin access is enabled, and writes reject an Origin that differs from the bound loopback host. These endpoints are a local simulation, not production authentication.

| Request | Body | Response |
|---|---|---|
| `GET /api/editions` | — | `{ editions }` |
| `GET /api/editions/:id` | — | `{ edition, cards }`; cards contains only the fixed face-up cards |
| `GET /api/assets/:id` | — | Image for `back`, `portrait` or any exported edition's fixed faces (files under `assets/` and `../../assets/email/cards/`) |
| `GET /client/*` | — | The split client files (allow-listed paths only) |
| `POST /api/intake` | `{ editionId, sameDay }` | `{ intake }` — no personal data |
| `GET /api/intake/:id` | — | `{ intake }` (the checkout stand-in reloads its price from this) |
| `POST /api/local-pay` | `{ intakeId, email, displayFirstName, fullBirthName, dateOfBirth }` | `{ order }`; simulates paid state, no charge. `displayFirstName` is what the pages call her (client derives it from "name on card"); the personal-card lens comes from `fullBirthName` split on its last space (existing ASCII guard and error kept); `dateOfBirth` is `YYYY-MM-DD`, validated as a real date, age 16–110 |
| `GET /api/orders/:id` | — | `{ order }` |
| `POST /api/orders/:id/audio` | `{ accept: true/false }` | `{ order }`; simulates the audio choice |
| `POST /api/orders/:id/fulfill` | `{}` | `{ order, artifact, pdfUrl }`; runs the saved order through brief, structural writing, grading and PDF rendering |
| `GET /api/orders/:id/report.pdf` | — | The generated local PDF fixture after fulfillment |

⚠ Date of birth: locally a bad value is rejected with a clear message. In production it arrives from a Stripe custom field after payment with no format validation, so the server must validate it post-payment and route a bad value to support — a paid order is never blocked on it. The birth name and date of birth are never logged.

Edition IDs: `healing-v1`, `commitment-v1`, `quiet-v1`, `higher-calling-v1`, `higher-calling-v2`. Full email text, free cards and positions are deterministically exported from daily sources; see [export instructions](../../docs/08-marcus/daily-email/README.md). Publication status is local test routing only. The 78-card deck fixture uses standard slug IDs; only fixed-card art is served. Hidden draws should be shown by card name in the local artifact.

Orders expose the `PaidOrder` contract plus `displayFirstName`, `fullBirthName`, `dateOfBirth`, the birth-name split (`firstName`/`lastName`, used by the fulfillment brief), total cents, `localOnly: true`, simulation notice, `audioPriceProvisional: true`, audio decision and fulfillment job references. This extra visibility is for review with fake data only. Production public responses must not expose private order context this way.

## What is implemented

- Main price is 3500 cents. The booking-page speed upgrade is 1277 cents and changes delivery from 24 hours to 12 hours. Browser-supplied prices do not control totals.
- An intake has one simulated paid order. Payment replays return the original order, draw and job.
- Each paid order gets its own saved hidden draw. Face-up cards stay fixed. Retry uses that draw.
- Edition records carry an explicit theme and any ordered free/paid position split. The same brief, grade and PDF stages handle the existing six-card editions and a tested eight-card 4-up/4-down edition without hardcoded counts.
- Personal-card lens is saved separately and included in the fixture report brief. The current engine accepts ASCII names with spaces/apostrophes/hyphens; other names return an explicit error until normalization is agreed.
- Audio is **$17 (1700 cents), approved by Joel on 2026-09-13**. Duplicate acceptance does not charge again. Declining after accepted purchase does not undo it or imply a refund.
- Main fulfillment can run before the audio decision. A late audio acceptance preserves the written report and PDF; the audio branch can resume independently from that approved report.
- A written "ready" status means the local PDF fixture is available. The PDF and artifact metadata explicitly say it is not a customer reading. Captured outbox records say `sent: false`.
- Standard deadline is payment +24 hours; the $12.77 bump changes it to +12 hours. Audio inherits the original deadline. Restart and retries preserve it.

## Proof still needed

The passing tests prove local API behavior, saved-draw continuity and adaptive PDF generation. A separate ephemeral n8n run also proved the main workflow route with an eight-card fixture; see [execution evidence](../../docs/08-marcus/n8n/LOCAL-EXECUTION-EVIDENCE.md). Neither proves Supabase transactions/RLS, real Stripe payments/webhooks (including the custom fields), AI writing quality, audio creation, provider delivery, production authentication or durable recovery. Those need separate integration checks. Production activation remains outside this harness.

## Tests

From the repository root:

```sh
./node_modules/.bin/tsx --test improve-v1/v1-one-time-BEs/local/08-marcus/server.test.ts
./node_modules/.bin/tsx --test improve-v1/v1-one-time-BEs/local/08-marcus/draw.test.ts
./node_modules/.bin/tsx --test improve-v1/v1-one-time-BEs/local/08-marcus/fulfillment.test.ts
node --import tsx --test improve-v1/v1-one-time-BEs/local/08-marcus/store.test.ts
python3 improve-v1/v1-one-time-BEs/scripts/export-08-editions.test.py
```

A restricted macOS sandbox may ask permission for Node's local sockets. Do not substitute the default `npm test`/`npm run dev`; those start the shared application and load its environment.

### Browser journey check

With the dedicated local server running, from the repository root:

```sh
node improve-v1/v1-one-time-BEs/local/08-marcus/browser.test.cjs
```

This uses installed Playwright, creates fake locally persisted orders, and saves screenshots under `/tmp/marcus-local-*.png`. It walks email → booking → checkout stand-in → bridge → upsell → thank-you, checks the bump and totals, the checkout's per-field errors and the birth-name guard, the masthead datelines, the review-05 floors (body 18px on phones, nothing under 13px, 44px targets), card frames, accept/decline, 12/24-hour deadlines, local PDF retrieval, and 320/390/1100 widths. Every off-origin request is aborted; the only ones the page may attempt are the Google Fonts link (the page must work on the Georgia fallback).

## Local fulfillment stage adapters

`POST /internal/marcus08/:operation` implements the workflow stage contract against SQLite. It requires `Authorization: Bearer marcus08-local-fixture-only` and loopback access. This public fixture token is not a production credential. The adapter creates theme-aware briefs and structural reports, renders PDF fixtures, saves narration manifests and simulated prediction identities, and captures deliveries (`sent:false`). It makes no provider calls and does not generate playable audio. Recovery currently reports eligible work; a scheduler/re-enqueue worker is still needed.

The stage tests are supplemented by one successful ephemeral Docker n8n execution of the main-reading route with an eight-card 4-up/4-down fixture. The cloud workflow (`Lksy14rvjB5Z7aYg`) has since been pushed and executed (executions 30691, 30694, 30695, 30699, 30700); it remains inactive.

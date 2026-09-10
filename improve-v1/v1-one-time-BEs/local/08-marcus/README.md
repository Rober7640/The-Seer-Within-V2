# Marcus local funnel simulation

This harness tests the customer journey, saved reading context and adaptive PDF rendering without payment, remote database, model, audio or email services. It binds only to `127.0.0.1`. The CLI persists fixture state in `/tmp/08-marcus-local/state.sqlite`; tests use isolated memory or temporary SQLite files. Use made-up customer details.

From the repository root:

```sh
./node_modules/.bin/tsx improve-v1/v1-one-time-BEs/local/08-marcus/server.ts
```

Open `http://127.0.0.1:5088`. Routes `/email`, `/booking`, `/bridge`, `/upsell`, `/thank-you` serve the same local client. The tested customer sequence is AWeber email preview → booking with bump/payment → post-purchase bridge → audio Upsell 1 → thank-you. No root environment file is loaded. The dedicated launcher does not import the application server, DB, Stripe, analytics or customer-list clients. It uses the pure local draw engine, whose existing numerology calculation has no service calls.

Run focused tests:

```sh
./node_modules/.bin/tsx --test improve-v1/v1-one-time-BEs/local/08-marcus/server.test.ts
./node_modules/.bin/tsx --test improve-v1/v1-one-time-BEs/local/08-marcus/draw.test.ts
```

A restricted macOS sandbox may ask permission for Node's local sockets. Do not substitute the default `npm test`/`npm run dev`; those start the shared application and load its environment.

## API

All JSON errors have `{ "error": "message" }`; no stack traces or customer details are logged. No cross-origin access is enabled, and writes reject an Origin that differs from the bound loopback host. These endpoints are a local simulation, not production authentication.

| Request | Body | Response |
|---|---|---|
| `GET /api/editions` | — | `{ editions }` |
| `GET /api/editions/:id` | — | `{ edition, cards }`; cards contains only the fixed face-up cards |
| `GET /api/assets/:id` | — | Embedded mockup image for `back`, `portrait` or any exported edition’s fixed faces |
| `POST /api/intake` | `{ editionId, firstName, lastName, sameDay }` | `{ intake }` |
| `POST /api/local-pay` | `{ intakeId, email }` | `{ order }`; simulates paid state, no charge |
| `GET /api/orders/:id` | — | `{ order }` |
| `POST /api/orders/:id/audio` | `{ accept: true/false }` | `{ order }`; simulates the audio choice |
| `POST /api/orders/:id/fulfill` | `{}` | `{ order, artifact, pdfUrl }`; runs the saved order through brief, structural writing, grading and PDF rendering |
| `GET /api/orders/:id/report.pdf` | — | The generated local PDF fixture after fulfillment |

Edition IDs: `healing-v1`, `commitment-v1`, `quiet-v1`, `higher-calling-v1`, `higher-calling-v2`. Full email text, free cards and positions are deterministically exported from daily sources; see [export instructions](../../docs/08-marcus/daily-email/README.md). Publication status is local test routing only. The 78-card deck fixture uses standard slug IDs; only fixed-card art is served. Hidden draws should be shown by card name in the local artifact.

Orders expose the `PaidOrder` contract plus first/last name, total cents, `localOnly: true`, simulation notice, `audioPriceProvisional: true`, audio decision and fulfillment job references. This extra visibility is for review with fake data only. Production public responses must not expose private order context this way.

## What is implemented

- Main price is 3500 cents. The booking-page speed upgrade is 1277 cents and changes delivery from 24 hours to 12 hours. Browser-supplied prices do not control totals.
- An intake has one simulated paid order. Payment replays return the original order, draw and job.
- Each paid order gets its own saved hidden draw. Face-up cards stay fixed. Retry uses that draw.
- Edition records carry an explicit theme and any ordered free/paid position split. The same brief, grade and PDF stages handle the existing six-card editions and a tested eight-card 4-up/4-down edition without hardcoded counts.
- Personal-card lens is saved separately and included in the fixture report brief. The current engine accepts ASCII names with spaces/apostrophes/hyphens; other names return an explicit error until normalization is agreed.
- Audio uses **1700 cents as a provisional test price**, not an approved offer. Duplicate acceptance does not charge again. Declining after accepted purchase does not undo it or imply a refund.
- Main fulfillment can run before the audio decision. A late audio acceptance preserves the written report and PDF; the audio branch can resume independently from that approved report.
- A written “ready” status means the local PDF fixture is available. The PDF and artifact metadata explicitly say it is not a customer reading. Captured outbox records say `sent: false`.
- Standard deadline is payment +24 hours; the $12.77 bump changes it to +12 hours. Audio inherits the original deadline. Restart and retries preserve it.

## Proof still needed

The passing tests prove local API behavior, saved-draw continuity and adaptive PDF generation. A separate ephemeral n8n run also proved the main workflow route with an eight-card fixture; see [execution evidence](../../docs/08-marcus/n8n/LOCAL-EXECUTION-EVIDENCE.md). Neither proves Supabase transactions/RLS, real Stripe payments/webhooks, AI writing quality, audio creation, provider delivery, production authentication or durable recovery. Those need separate integration checks. Production activation remains outside this harness.

## Browser journey check

With the dedicated local server running, from the repository root:

```sh
node improve-v1/v1-one-time-BEs/local/08-marcus/browser.test.cjs
```

This uses installed Playwright, creates fake locally persisted orders, and saves screenshots under `/tmp/marcus-local-*.png`. It checks the AWeber preview handoff, booking-page bump and payment, bridge refresh, audio accept/decline paths, totals, card images, local PDF retrieval and mobile widths. It expects no external requests.

## Local fulfillment stage adapters

`POST /internal/marcus08/:operation` implements the workflow stage contract against SQLite. It requires `Authorization: Bearer marcus08-local-fixture-only` and loopback access. This public fixture token is not a production credential. The adapter creates theme-aware briefs and structural reports, renders PDF fixtures, saves narration manifests and simulated prediction identities, and captures deliveries (`sent:false`). It makes no provider calls and does not generate playable audio. Recovery currently reports eligible work; a scheduler/re-enqueue worker is still needed.

```sh
./node_modules/.bin/tsx --test improve-v1/v1-one-time-BEs/local/08-marcus/fulfillment.test.ts
node --import tsx --test improve-v1/v1-one-time-BEs/local/08-marcus/store.test.ts
```

The stage tests are supplemented by one successful ephemeral Docker n8n execution of the main-reading route with an eight-card 4-up/4-down fixture. The cloud draft remains inactive and unexecuted, and the locally fixed JSON has not been pushed to it.

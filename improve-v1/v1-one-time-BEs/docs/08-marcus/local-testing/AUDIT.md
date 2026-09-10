# 08 Marcus — local build audit

Audited 2026-09-10. Source inspection only: no secrets read, database connections made, external services called, migrations run, or payments sent.

## What can be reused

Paths below are relative to the repository root.

| Existing file | Useful part | Boundary for 08 |
|---|---|---|
| `CLAUDE.md` | Repository guide; plain-English reporting; add implemented feature test cases to `docs/test-ideas.md` | No `AGENTS.md` found by repository file search. The guide contains older framework details; use actual package/source versions. |
| `shared/backendOffers.ts` | Server-controlled prices, bump opt-in, isolated `be_*` product namespace, sale-readiness switch | Existing Marcus product is 07, tiered, and `readyForMoney: false`. Add an explicit 08 identity later; do not repurpose the old product or enable it. |
| `server/routes/backendOffers.ts` | Checkout creation, server verification, upsell payment and receipt patterns | Existing upsell behavior includes 02-specific assumptions. It calls Stripe directly; unsuitable for the first isolated local slice. |
| `server/lib/beOrders.ts` | Intake before payment; paid order keyed by Stripe session; duplicate order handling | Recording can also write to the customer list. Importing this as a local persistence adapter would bring unwanted external effects. |
| `server/routes/webhooks.ts` | Verified payment routing to backend order recording | Shared by other funnels. Preserve existing branches and product keys. Simulate events locally first. |
| `shared/schema.ts` | `beOrders`, `beOrderIntake`, `be07Draws`, `be07ReadingGrades` | Current intake has spread/date/tier/topic/questions, but no first/last name pair, edition snapshot, personal-card method or per-buyer draw record. |
| `migrations/2026-08-10-be-orders.sql` | Paid-order invariant and unique Stripe session | An unpaid intake must never become a paid order simply by submitting a form. |
| `migrations/2026-09-03-be-07-daily.sql` | Separate unpaid intake and grade log | 07 draw is unique by spread/date. That is not the 08 buyer-specific hidden draw. |
| `improve-v1/v1-one-time-BEs/docs/08-marcus/booking-page/mockup.html` | Approved visual layout and name/bump interaction | Standalone prototype; not yet shared edition data or real payment/persistence. |
| `improve-v1/v1-one-time-BEs/scripts/build-08-daily.py` | Current email rendering | Feed the same validated edition record into email and booking. |
| `improve-v1/v1-one-time-BEs/scripts/build-07-n8n.py` | Position-by-position generation, grading, report rendering, delivery sequence | Study as a pattern only. It contains remote service URLs and older spread/product assumptions. |
| `improve-v1/v1-one-time-BEs/docs/07-marcus/07-fulfilment.n8n.json` | Reviewable workflow artifact | Do not import or run against an existing n8n instance. README states missing endpoints; source search found no current fulfillment route implementation. |
| `server/lib/backendOffers.test.ts`, `server/lib/beOrders.test.ts` | Focused price rules and mocked persistence/customer-list checks | Useful regression examples; these tests do not prove a real payment or real database transaction. |

## Local tools and hazards

- `package.json` has Node/TypeScript, Express, React 19, Vite, Vitest, Playwright, Drizzle and `pg` available as project dependencies.
- Docker, Supabase CLI and `psql` binaries are installed. A PostgreSQL process listens on loopback port 5432. Ownership, databases and permissions were not queried. Docker daemon and local Supabase stack readiness were not checked.
- No listener on the usual application port 5000, n8n port 5678 or Supabase API port 54321 appeared in the local listener inventory. This does not prove those services cannot be started.
- No repository Supabase `config.toml` or Docker Compose setup was found by the targeted file search.
- `npm run dev` loads `dotenv/config` through `server/index.ts`, then imports all application routes. `server/lib/db.ts` uses `DATABASE_URL`; development mode does not itself guarantee a local database.
- The background-job gate in `server/lib/backgroundJobsGate.ts` reduces accidental timer work, but does not stop route-triggered DB writes or external calls.
- Default `npm test` uses `playwright.config.ts`, whose web server starts `npm run dev`. Do not use that configuration for the first isolated 08 test.
- `npm run db:push`, `seed`, `migrate`, `.env.test` test scripts, and the 07 dry-run/push scripts are not approved local isolation mechanisms. In particular, `dryrun-07-reading.mjs` reads the root environment file and calls a remote model API.

## Recommended first implementable slice

Build one complete **local simulation**: AWeber email fixture → booking with bump and simulated payment → bridge → audio offer → receipt → saved fulfillment job and report fixture. Bind only to `127.0.0.1`, use a dedicated entry point, and never import `server/index.ts`, production DB, Stripe, customer-list, or analytics clients.

- [ ] Define one versioned edition contract: question, spread, numbered positions, fixed face-up cards, hidden position labels, approved copy and local assets. Add healing and commitment fixtures.
- [ ] Use one local repository adapter for intake, simulated paid orders, draws, entitlements and job state. Start with in-memory storage or an explicit temporary file store; state clearly that this is not Supabase integration proof.
- [ ] Save first/last name, edition version and a frozen edition snapshot at purchase. Resolve prices and cards on the server, not from submitted browser values.
- [ ] Draw hidden positions once per paid order, using an injected random source for tests. Keep face-up cards fixed. Independent draws may coincidentally match; do not force every buyer to receive a unique spread.
- [ ] Persist the hidden draw before generation and reuse it on retries. Decide deck exclusion/orientation rules before claiming the algorithm is final.
- [ ] Persist a separate deterministic name-based personal card and method version. Keep it distinct from the spread and use it as the report's interpretive lens. Until the name method is approved, expose a test method explicitly in internal fixtures only.
- [x] Model the $12.77 booking-page bump as a 12-hour delivery entitlement, not extra content; standard delivery is 24 hours from confirmed payment.
- [ ] Model audio as a separate entitlement tied to the final saved reading. Use a local fixture/no-charge acceptance path until price and narration details are approved.
- [ ] Stub report generation, audio, delivery, storage and payment behind explicit adapters. Save local output artifacts and an outbox record instead of sending anything.
- [ ] Test with a dedicated Playwright config and local Node/Vitest tests. Fail tests on external browser requests; ensure fixtures load local assets.

Then prove persistence against a **new disposable local database** with an explicit loopback URL and dedicated name. Reject non-loopback hosts in the local launcher/migration runner and do not fall back to root environment settings. Apply only reviewed 08 migrations. Native local PostgreSQL can prove transactions and constraints; it cannot prove Supabase API/auth/RLS behavior. Use a separate local Supabase stack for those later checks.

## Acceptance tests before external integration

- [ ] Email and booking use the exact same edition even after a newer edition exists.
- [ ] Invalid or missing edition fails clearly; browser-edited card IDs and prices are ignored/rejected.
- [ ] Hidden draws are independent per order, fixed cards remain fixed, retries preserve the saved draw and personal lens.
- [x] Main totals are exactly 3500 or 4777 cents. Bump is off by default. Audio inherits the saved 24-hour or 12-hour order deadline.
- [ ] Cancelled/failed simulated payments do not create paid jobs; repeated confirmed events create one paid order and one job.
- [ ] Upsell decline, accept, refresh and abandonment all leave the main reading fulfillable.
- [ ] Final receipt reads saved order state; page visits never charge, redraw, generate or send.
- [ ] Generation failures, render failures, late upsell purchase and workflow retries preserve content and entitlement boundaries.
- [ ] Non-ASCII names and whitespace are handled; private names/readings stay out of URLs and analytics.
- [ ] No network requests leave loopback and no existing database is touched during local proof.

## Open decisions that do not block the local skeleton

Personal-card calculation and normalization; deck/orientation rules; written deliverable format; missed-deadline policy; audio price, voice/disclosure and final format. Audio copy should promise a way to listen through the whole reading at a calmer pace—not guarantee that a recording forces attention or absorption.

Actual Stripe test-mode work, local Supabase proof, model-generated sample quality and a running local n8n execution are later integration checks. Do not describe mocked payment, file persistence or a workflow JSON as proof those integrations work.

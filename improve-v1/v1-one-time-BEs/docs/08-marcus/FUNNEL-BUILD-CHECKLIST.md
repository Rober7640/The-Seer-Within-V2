# 08 Marcus — complete funnel build checklist


> **Latest confirmed decisions:** the main written deliverable is a PDF; standard delivery is within 24 hours; the +$12.77 bump is within 12 hours, both measured from confirmed main payment. Audio shares that order deadline. Use Replicate Chatterbox with the Marcus voice Joel will supply. Create a NEW Marcus n8n workflow; existing workflows must remain untouched. See the delivery policy and Chatterbox setup in the n8n folder. These decisions supersede older open-timing/provider notes below.

Status: plan approved for local-first work, 2026-09-10. Local edition export, durable order storage, page updates, fulfillment adapters and one isolated adaptive n8n/PDF execution are complete; see local evidence below. A new inactive n8n draft was separately authorized and created. Live charges and customer sends remain outside this phase.

## Outcome and scope

AWeber daily email → booking page ($35, optional $12.77 bump, payment) → bridge page → Upsell 1 → thank-you page.

Supabase preserves the reading and purchase context. n8n generates the written PDF and any purchased audio in the background. Payment is shown explicitly above as part of the booking handoff; its exact UI remains an implementation decision. Upsell 1 is an audio recording of the purchased spread, separate from the booking bump. The $12.77 bump changes the deadline from 24 to 12 elapsed hours after main payment; audio shares that deadline.

Success means a customer can click an old or new daily, see its exact spread and face-up cards, enter her first and last name, buy the correct products, and receive the correct reading without manual copying between systems.

This checklist covers one upsell page. No Upsell 2, subscription, archive storefront, or extra question field is included by default. The latest booking scope takes precedence over older 07 and 08 product notes.

## What exists, and what that does not prove

- [x] Daily writing guidance and an email renderer exist: [SHAPE.md](daily-email/SHAPE.md), [build-08-daily.py](../../scripts/build-08-daily.py).
- [x] Healing and commitment copy/assets exist; [booking mockup](booking-page/mockup.html) renders both and simulates name collection, bump choice, and totals.
- [x] [Booking scope](booking-page/SCOPE.md) records $35, $12.77, and required first/last names.
- [x] Repository has shared offer pricing, checkout routes, order persistence, numerology, and 07 n8n reference artifacts.
- [ ] Verify deployed schema, connected accounts, workflow activation, and runtime behavior. Local source is not evidence that those components are deployed or working for 08.

Important findings:

- The standalone mockup retains historical copy. The local funnel now consumes a deterministic edition export from the email builder and source letters, including stable IDs and versions.
- `shared/backendOffers.ts` still defines Marcus as 07’s $35/$57/$87 tiered product with `readyForMoney: false`. It is not the new 08 offer.
- `migrations/2026-09-03-be-07-daily.sql` defines draw records and a separate intake table. Its comments say development and production share a database. Verify isolation before running any migration; do not assume “local app” means “test database.”
- Existing `be_orders` represents paid orders. Unpaid name submissions belong in intake, not a row that could trigger fulfillment.
- [PAID-READING.md](paid-reading/SCOPE.md) contains stale price, optional-sentence, and Significator wording. It also preserves master number 33 but does not map 33 to a tarot card.
- 07’s n8n artifacts are reuse references, with older spreads, tiers, delivery rules, and failure behavior. Do not activate or copy them wholesale.

## Local proof completed — 2026-09-10

- [x] [Local environment audit](local-testing/AUDIT.md): isolated launcher chosen; no shared database or provider connection.
- [x] [Initial data contract](data/CONTRACT.md) and local TypeScript types written.
- [x] Local draw engine: fixed free cards, buyer-specific paid cards, separate personal lens, retry without redraw; six focused tests passed.
- [x] Local API harness: intake, simulated payments, audio accept/decline, order receipt, adaptive PDF fixture fulfillment and authenticated PDF retrieval; focused API tests passed.
- [x] Local UI connects the AWeber continuity fixture → booking with simulated payment → bridge → audio Upsell 1 → thank-you → generated local PDF fixture.
- [x] Browser checks passed across all five local editions, accept/decline, base and combined totals, bridge refresh, image loading, and widths 320/390/1100; no external requests or JavaScript errors.
- [x] [Audio scope](upsell-1-audio/SCOPE.md), [Upsell 1 copy shape](upsell-1-audio/SHAPE.md), and [n8n audio build plan](n8n/AUDIO-BRANCH.md) drafted; $17 is a provisional local test value only.
- [x] Replace email excerpts with deterministic full-source edition export; add SQLite persistence with restart/replay tests.
- [x] Implement and test local fulfillment stage adapters: job leases, immutable brief/report fixtures, adaptive PDF rendering, narration manifest, simulated prediction IDs and captured delivery.
- [ ] Connect actual report writing, speech/media assembly, private production storage and provider delivery. The local PDF proves rendering and continuity, not production integration.

Run/review: [local harness README](../../local/08-marcus/README.md). The CLI saves fake orders in `/tmp/08-marcus-local/state.sqlite`; tests use isolated storage. Generated PDFs contain structural sample prose and audio artifacts are manifests, so neither is a finished customer deliverable. Passing this local proof does not check off the production integration tasks below.

## Latest local implementation evidence

- Exporter: 8 regression tests, five editions, full source copy, hash/drift checks and variable visibility.
- Persistence/API: 4 tests covering restart, concurrent purchase replay, rollback, internal service authentication and full-envelope fulfillment.
- Store: 1 transaction/reopen test. Draw engine: 6 focused tests.
- Fulfillment: 3 stage tests covering audio-before-report, saved card parity, independent written delivery, duplicate capture, conflicting predictions, expired leases, and an eight-card 4-up/4-down themed PDF.
- The remote Marcus canvas now has a working 37-node canon-backed Stage 1 lane and a clearly parked Stage 2 production lane. The 47-node local scaffold remains an architecture reference.
- Ephemeral local n8n execution completed the main route for an eight-card 4-up/4-down themed fixture, rendered a three-page PDF, queued written delivery, and exited cleanly with no audio entitlement.
- Browser journey passed: all five editions’ images, booking-page bump and payment, bridge refresh, audio accept/decline, name-error recovery, 24/12-hour receipts and 320/390/1100px layouts; no external requests or JavaScript errors. Booking and audio pages were visually reviewed at desktop and mobile widths.
- One isolated n8n main-reading execution passed with an eight-card 4-up/4-down fixture. Model writing, audio execution, media assembly and provider delivery remain unchecked. Recovery adapter currently identifies work; it does not schedule it.

## 0. Decisions to settle

Answers can be recorded here before dependent work begins. Independent scaffolding can proceed after overall plan approval.

- [x] **D1 — Funnel:** booking includes the optional speed bump and main payment; a short post-purchase bridge precedes the separate audio Upsell 1, then thank-you.
- [x] **D2 — Main deliverable:** PDF, delivered within 24 hours or within 12 hours with the speed bump. Exact customer delivery mechanism (attachment or private link) still needs selection.
- [x] **D3 — Bump product:** +$12.77 for delivery within 12 hours (Joel, 2026-09-10).
- [x] **D3a — Delivery rule:** 24 hours standard, 12 hours with the +$12.77 bump, measured from confirmed main payment. Audio shares that deadline.
- [x] **D4 — Upsell 1 direction:** audio recording of the buyer’s personalized spread.
- [ ] **D4a — Audio refinement:** review [audio offer scope](upsell-1-audio/SCOPE.md), price, voice, format, delivery timing, and sample narration. Explain listening through the connected reading and replaying it; do not claim audio guarantees attention or that most buyers skim without evidence.
- [x] **D5 — Paid draw:** face-up cards remain fixed per daily edition; draw the remaining positions separately for each buyer/order. Save once and reuse for report generation, audio, retries, and resends. Independent draws do not promise every buyer a globally unique combination.
- [x] **D5a — Personal card:** issue an additional card from first + last name. It supplies the interpretive lens for the report; it is not another spread position or a replacement for any drawn card.
- [x] **D6 — Build environment:** test locally first. Use local fixtures/adapters and captured deliveries; do not connect the main app to its configured shared database. Remote staging integration is a later phase after local evidence.
- [ ] **D7 — Personal card:** resolve master number 33, supported name scripts/normalization, empty calculated results, and deck numbering. Reuse the numerology engine without changing Aiden’s behavior.
- [ ] **D8 — Operations:** define support contact, delivery failure handling, refund handling, and whether failed reading QA should pause for review. Do not inherit 07’s “send after two failures” rule silently.

## 1. Freeze the shared reading and order contracts

This is the first build dependency. Pages and n8n must consume the same definitions.

- [x] Define a stable `edition_id` for each published daily plus a version; keep the human-readable topic slug as a label/routing aid. **Local contract/export implemented; live publication remains pending.**
- [x] Define the local edition record: question, theme, spread ID/name/version, ordered position IDs and labels, free/paid flags, face-up card IDs and orientations, image references, email copy/version, topic-specific booking copy, and status. **Production publication/date persistence remains pending.**
- [x] Define where paid cards live according to D5: immutable per-order paid draw, separate from the edition’s fixed free cards. Public booking responses expose card backs for paid positions, not hidden identities. **Local contract/export implemented; live publication remains pending.**
- [x] Define an order snapshot: edition/version, exact ordered cards and positions, free-email context, first/last name, personal card and algorithm version, delivery email, purchased products/prices/currency, payment references, fulfillment status. **Local contract/export implemented; live publication remains pending.**
- [ ] Define intake, checkout, verified payment, upsell purchase/decline, fulfillment job, and delivery result request/response shapes, including error cases.
- [ ] Define independently tracked base, bump, and upsell entitlements. An abandoned or failed upsell must not hold up the paid main reading.
- [x] Define drawing without replacement from the deck after excluding fixed face-up cards; retain the separate personal-card lens even if it matches a drawn card. Record upright/reversal policy as a versioned method. **Local contract/export implemented; live publication remains pending.**
- [x] Freeze representative fixtures: healing, commitment, a different card-count spread, and two editions of the same topic. **Local contract/export implemented; live publication remains pending.**
- [ ] Reconcile README, PAID-READING, booking scope, and skill instructions with approved decisions; remove obsolete competing instructions.

Acceptance: one fixture can drive the daily, booking, order snapshot, and fulfillment brief without manually retyping card/spread data.

## 2. Daily email → booking continuity

- [x] Refactor the daily generator to consume/export the approved edition record rather than maintaining a second card registry. **Local contract/export implemented; live publication remains pending.**
- [ ] Extend the daily workflow to create a draft edition, validate it, render the email, and mark it publishable after copy review.
- [ ] Generate booking links carrying the stable edition reference and approved campaign attribution. Do not put names, delivery email, or private reading content in new URLs.
- [ ] Preserve exact face-up cards, orientations, position numbering, spread name, and asset references across both surfaces.
- [ ] Define repeat-topic editions, copy variants, forwarded links, missing editions, unpublished editions, and older links. Never silently fall back to today’s reading.
- [ ] Validate deployed asset URLs and final email links before a send; keep no-price-in-daily and Marcus’s existing copy rules.
- [x] Document the operator command/skill sequence for producing the next daily without editing application source by hand. **Local contract/export implemented; live publication remains pending.**

Acceptance: clicking each fixture’s email CTA opens that exact edition, including after a newer edition is published.

## 3. Supabase persistence and backend foundation

- [ ] Audit existing migrations, `shared/schema.ts`, `server/lib/beOrders.ts`, checkout routes, and actual target environment before deciding whether to extend existing tables or add 08-specific ones.
- [ ] Write scoped additive migration(s) for editions, intake/name fields, immutable order context, product entitlements, and fulfillment attempts where missing. Include verification and rollback guidance.
- [ ] Preserve the existing paid-order invariant; save first/last name and edition reference in unpaid intake first, then associate them with the verified paid order.
- [ ] Calculate the personal card server-side using the approved deterministic method; store the result and method version.
- [ ] Validate edition references and allowed products server-side. Resolve spread/cards/prices from trusted records rather than browser-provided values.
- [ ] Add appropriate access controls: public edition projection, private customer/order records, authenticated service access for n8n, restricted customer receipt/download access.
- [ ] Define atomic writes, unique purchase/job identifiers, duplicate handling, intake expiry, and recovery when payment succeeds but a later database write fails.
- [ ] Preserve existing 02/03/07 products and analytics behavior; use explicit 08 routing/product identifiers or a reviewed compatibility strategy.

Acceptance: persisted intake and paid order retain identical reading context; unrelated orders remain unchanged.

## 4. Production booking page and main checkout

- [ ] Convert the approved mockup into the application’s route/component structure and load edition data from the shared contract.
- [ ] Support variable spread/card counts and readable mobile layouts. Preserve the question-specific headline, bridge, offer, and personal-card explanation.
- [ ] Remove reviewer placeholders from customer UI; record unresolved work in docs. Insert actual deliverable/channel/timing copy after D2/D3.
- [ ] Save first/last names with clear validation and recoverable errors. Preserve entries through back navigation and checkout cancellation.
- [x] Collect the delivery email on the local booking page; a forwarded daily must not send the reading to the original subscriber automatically. **Production validation and secure checkout handoff remain pending.**
- [x] Keep $35 visible before name entry; optional $12.77 bump defaults off and clearly produces $35.00 or $47.77. **Implemented and browser-tested in the local harness.**
- [ ] Add the fixed 08 offer to server-controlled pricing and checkout. Preserve edition/intake references through checkout success, cancel, and retries.
- [ ] Verify payment server-side, handle failed/pending payments, and prevent duplicate charges from repeated clicks.
- [ ] Route a successful main purchase through the bridge page to Upsell 1 with secure order context. Trigger main fulfillment from verified payment, not from visiting a page. **Local routing is tested; production payment verification remains pending.**

Acceptance: base-only and base-plus-bump test purchases create the right order, reach the bridge, then Upsell 1; cancelled/failed purchases do not fulfill.

## 4a. Post-purchase bridge page

Scope: [bridge-page/SCOPE.md](bridge-page/SCOPE.md).

- [x] Add a distinct local route after confirmed main payment and before Upsell 1.
- [x] Confirm the written order, delivery email, and correct 24-hour or 12-hour deadline from saved order data.
- [x] State that the next page cannot cancel or delay the written reading.
- [x] Keep the page short and reserve the audio argument and price for Upsell 1.
- [x] Verify refresh and forward navigation do not purchase audio or trigger fulfillment.
- [ ] Build the production route with secure paid-order context and unauthorized/expired-link handling.

Acceptance: a verified local order reaches the bridge, survives refresh, and continues to Upsell 1 without changing any entitlement.

## 5. Upsell 1 — offer, design, purchase

Audio work is grouped in [upsell-1-audio](upsell-1-audio/README.md).

- [x] Three independent healing drafts reviewed and rejected; draft files and comparison deleted at Joel’s request.
- [x] Joel accepted the [warning-led argument](upsell-1-audio/WRITING-BRIEF.md); copy shape revised.
- [x] Three new drafts written independently in direct/firm, warm/personal and vivid/example-led styles.
- [x] Joel selected A; [selected copy](upsell-1-audio/COPY.md) generalized for all daily questions.

Use [audio copy shape](upsell-1-audio/SHAPE.md) as the writing guide and [selected A](upsell-1-audio/COPY.md) as the current generic page copy.

- [ ] Refine and approve the audio offer brief, price, fulfillment definition, and relationship to the main reading/bump. Keep the same purchased draw and personal-card lens; audio must not introduce a new reading or contradictory answers.
- [x] Write the local Marcus-specific headline, problem/consequence, mechanism, contents, objection handling, accept CTA, and equally understandable decline path. **Commercial approval and final price remain pending.**
- [x] Create and browser-test the audio page at desktop and mobile widths. **The local $17 fixture price remains provisional.**
- [ ] Build the approved page with verified parent-order context and a visible confirmation that the original reading was purchased.
- [ ] Reuse the existing upsell payment infrastructure only after auditing its current product/offer assumptions; it presently contains 02-specific behavior.
- [ ] Support confirmed purchase, decline, duplicate click, payment failure, required additional payment authentication, refresh, and return visit.
- [ ] Persist the upsell as a separately priced entitlement linked to the parent order; trigger only its purchased fulfillment.
- [x] Route both simulated accept and decline directly to the local thank-you page, without an extra audio-review page. **Production payment failure handling remains pending.**

Acceptance: buy and decline both finish cleanly; the main reading remains deliverable regardless of the upsell decision.

## 6. Thank-you page

- [ ] Design and build a receipt driven by verified order data: customer name, topic/edition, products purchased, itemized amounts, and delivery destination.
- [ ] Explain the actual next step and delivery timing for each product. Show pending/processing/delivered states honestly.
- [ ] Handle webhook lag, refresh, direct return, failed lookup, and unauthorized access without a false purchase confirmation.
- [ ] Add reading access/download if appropriate to D2, plus a support path and a safe way to resolve an incorrect delivery email.
- [ ] Ensure receipt/page visits do not trigger repeat charges or duplicate delivery messages.

Acceptance: base-only, bump, upsell, and combined purchases show the exact items and totals paid.

## 7. n8n fulfillment and delivery

- [x] Created a NEW [inactive Marcus workflow](n8n/README.md). Its Stage 1 manual lane is credentialed and testable; Stage 2 records the 24h/12h, Supabase, delivery, and Chatterbox plan. Existing workflows remain untouched.
- [x] Ran cloud Stage 1 end to end with fictional data: OpenAI report, fail-closed structural/content checks, PDFShift, and downloadable PDF binary. See [Stage 1 evidence](n8n/STAGE-1-TEST-EVIDENCE.md).
- [x] Ran numerology-anchored Stage 1 on the supplied profile: the expanded calculation returned Life Path 4, Expression 6, and Personality 1; the edition retained The Star and Seven of Pentacles; all six positions were written; both private-support and customer-view graders passed; and a 1.18 MB PDF binary was returned. Raw birth name/date were excluded from OpenAI request bodies.
- [ ] Approve the reusable 33-entry numerology canon: 500–800 words for each Life Path, Expression, and Personality value in 1–9, 11, and 22. See [canon design](n8n/numerology-canon/README.md).
- [x] Compiled the canon into versioned runtime records; the 37-node Stage 1 workflow retrieves exactly three entries, requires passage-ID evidence for every synthesis claim, grades the synthesis independently, and scrubs private machinery before the report writer.
- [x] Ran canon-backed execution `30684`: selected `LP4`/`EX6`/`PE1`, synthesis evidence scores were all 9/10, one bounded report rewrite cleared the stricter customer gate, zero unsupported claims remained, and PDFShift returned a 1.18 MB six-position report.
- [x] Repaired the node-22 test failure: internal “saved message” wording is withheld from the writer, citation confidence is derived deterministically, and a second customer-grade rejection terminates at an explicit no-PDF QA hold. Execution `30691` then passed on its first report and returned a 1.18 MB PDF.
- [x] Added fixed customer-facing Life Path recognition profiles and enforced a Builder-first hierarchy. Execution `30694` named Life Path 4 as **The Builder**, kept The Lovers secondary, passed both report graders on its first candidate with zero unsupported claims, and returned a 1.21 MB PDF.
- [x] Executed a temporary local test copy of the main route against the fixture backend: eight cards, four fixed/free, four buyer-drawn/paid, explicit theme, separate personal card, PDF rendered and written-delivery task queued. See [local n8n evidence](n8n/LOCAL-EXECUTION-EVIDENCE.md).

Audio has a detailed checklist: [audio n8n build plan](n8n/AUDIO-BRANCH.md). Audio chains off the approved-report stage in the main n8n flow. A late audio purchase re-enters that same workflow at the audio-resume route. Purchase/report-ready event ordering, saved script/segments, media worker, player, and delivery recovery are required parts of the build.

- [ ] Audit 07 workflow JSON/builder and current backend fulfillment endpoints; inventory reusable nodes and missing capabilities.
- [x] Create an 08 workflow with a separate manual Stage 1 and parked production Stage 2; attach stored OpenAI/PDFShift credentials without embedding secrets. Supabase/production credentials remain Stage 2 work.
- [ ] Claim verified paid jobs atomically, load the saved order/edition/draw, and reject incomplete context instead of guessing.
- [x] Build and test the local reading brief from the question, edition theme, every ordered position, exact paid positions/cards, free-email context, and personal-card meaning. It derives free/paid counts from the edition and does not assume six cards. **Production writer connection remains pending.**
- [ ] Define and evaluate the paid-reading prompt, model configuration, output structure, length, and quality rubric against approved samples.
- [ ] Add bounded retry, generation/render failure handling, recorded QA verdicts, and the D8 review/escalation path.
- [x] Render/store an approved local PDF fixture and persist its hash, access reference, and status so retries reuse the same report. **Private production storage and customer delivery remain pending.**
- [ ] Implement the bump as a delivery deadline/priority modifier, not a second reading. Implement audio from the accepted written reading, using the same draw and personal-card lens, after its narration/provider choices are approved. Track audio failures separately from written delivery.
- [ ] Configure delivery messages/provider only after channel and timing decisions; distinguish payment receipt from reading delivery.
- [ ] Record provider acceptance, delivery failures, and available bounce status; prevent duplicate sends and provide an explicit support resend operation.
- [ ] Add missed-job recovery, alerts with order references, and a simple runbook for stuck/failed/refunded orders. Do not rely on the customer reaching thank-you to start work.

Acceptance: a test purchase produces the correct stored deliverable and reaches an approved test destination once; replaying events does not generate a new draw or resend automatically.

## 8. Integration proof and launch

- [ ] Track edition-aware funnel events: email attribution where available, booking view, intake, checkout start, verified purchase, bump, upsell view/accept/decline/purchase, thank-you, fulfillment and delivery. Keep names/content out of analytics.
- [ ] Separate browsing events from verified revenue; deduplicate events and avoid existing affiliate/main-funnel conversion branches.
- [ ] Run the full purchase matrix: base only, bump only with base, upsell with base, all products, declines, failures, cancellations, refreshes, webhook retries, abandoned upsell, and interrupted n8n runs.
- [ ] Assert exact card/position continuity end to end, including non-six-card spread, reused topic, old email, forwarded link, and invalid edition.
- [ ] Test non-ASCII/hyphenated names and all approved personal-card edge cases; ensure same name/method yields same personal card.
- [ ] Check desktop/mobile, accessibility, broken assets, form recovery, page errors, and customer-visible placeholder removal.
- [ ] Run focused regression checks on shared offer/payment/order code for existing products.
- [ ] Produce a local evidence pack first (provider actions simulated/captured), then a separate staging evidence pack when authorized: screenshots, sanitized test order, saved draw, workflow run, resulting reading, delivery result, and remaining issues.
- [ ] Joel reviews final offer copy/design, generated reading samples, and end-to-end evidence.
- [ ] Prepare launch changes: scoped migrations, assets/routes, offer switch, webhook/workflow configuration, provider templates, monitoring, and rollback steps.
- [ ] Activate production only after a separate launch decision. Actual customer email sends must be explicitly authorized; no production charge is used as a test by default.
- [ ] Run the agreed post-launch verification and monitor paid-but-undelivered orders.

## Parallel work plan — local phase approved

First, the lead freezes section 1 contracts and decision-dependent boundaries. Then run bounded workstreams against those contracts. More agents do not remove offer decisions or integration dependencies.

| Wave | Workstream | Ownership / output | Dependencies |
|---|---|---|---|
| 0 | Lead: contracts and fixtures | Shared definitions, decision log, file ownership, environment plan | Overall plan approval; D5/D7 resolved before relevant logic |
| 1 | Agent A: daily continuity | Edition authoring/export, email generator and link checks | Frozen edition contract |
| 1 | Agent B: backend/data | Migrations, intake, personal card, order persistence, main payment integration | Frozen contracts; D6/D7; approved environment |
| 1 | Agent C: frontend/offer | Booking integration; Audio Upsell 1 refinement and mockup; thank-you design | Contracts; D2/D3 for final copy, D4 before upsell build |
| 1 | Lead: fulfillment | 08 workflow, prompt/QA samples, delivery adapter using fixtures | Contracts; D2/D5/D8; D3/D4 for extra products |
| 2 | Backend + frontend integration | Real route/API/payment handoffs, upsell purchase and receipt | Backend interfaces and approved UI/offer |
| 2 | Fulfillment integration | Paid event → stored reading → test delivery | Data/payment integration and configured test environment |
| 3 | Independent review + lead | Regression, full journey tests, evidence and fixes | All products connected |

Shared files such as `shared/schema.ts`, `shared/backendOffers.ts`, checkout routes, and application routing have one owner at a time. Agents report interface changes to the lead before modifying a contract. Use isolated branches/worktrees where suitable; the lead integrates and resolves conflicts. Do not let multiple agents apply migrations or change remote workflows concurrently.

## Approval record

- [x] Joel approves the checklist’s scope and sequencing (2026-09-10).
- [ ] Clarifying answers are entered under D1–D8; remaining open decisions have explicit owners.
- [x] Joel authorizes the parallel build phase: local tests first (2026-09-10).
- [ ] Final launch approval is recorded after reviewable implementation and test evidence exist.

Plan approval authorizes the agreed build phase; it does not claim unfinished product choices are settled or remote systems are ready.

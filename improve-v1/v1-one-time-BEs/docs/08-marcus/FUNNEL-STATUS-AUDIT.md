# 08 Marcus — full funnel status audit

Audit date: 2026-09-13  
Branch audited: `02-fulfillment`  
Scope: daily ESL → booking → Stripe Checkout → bridge → Audio Upsell 1 → thank-you → post-purchase emails → n8n fulfillment

## How to read this audit

- `[x]` means the named artifact or behavior exists and was inspected or tested.
- `[ ]` means it is absent, incomplete, provisional, stale, or has not passed the required production test.
- A local mockup and a production implementation are listed separately. A checked local item does not imply that the live version exists.
- The full funnel is not launch-ready until every item under **Launch gate** is checked.

## Current result

- [x] Marcus can produce a reviewed daily ESL as Markdown and generated AWeber-style HTML.
- [x] A complete customer journey can be simulated on the isolated local Marcus application.
- [x] The dedicated n8n Stage 1 can manually generate, grade, and render a real PDF.
- [x] The ten-card “What are my blind spots?” email-to-report continuity was proven in n8n execution `30700`.
- [ ] A customer can click a live AWeber email and reach a production 08 booking route.
- [ ] A customer can pay for the 08 offer through Stripe.
- [ ] A verified Stripe payment creates the production order, saved draw, and fulfillment job.
- [ ] The bridge, audio upsell, and thank-you pages run against production order state.
- [ ] The written PDF or purchased audio is delivered automatically.
- [ ] Post-purchase confirmation and delivery emails exist for 08.
- [ ] The full test-mode funnel has passed from AWeber link through customer delivery.

## Canonical production journey

- [ ] Record this exact sequence consistently in the skill, README, scopes, application routes, and tests:

  ```text
  AWeber daily ESL
      → booking page
      → Stripe-hosted Checkout for $35 + optional $12.77 speed upgrade
      → bridge page
      → Audio Upsell 1
          → decline → thank-you
          → accept → audio payment → thank-you

  Background:
  verified Stripe webhook
      → Supabase order and immutable edition snapshot
      → saved buyer-specific card draw
      → n8n written fulfillment
      → private PDF storage
      → written-delivery email
      → optional audio branch
      → audio-delivery email
  ```

- [x] The optional +$12.77 speed upgrade belongs on the booking page.
- [x] Standard written delivery is within 24 elapsed hours of confirmed main payment.
- [x] The speed upgrade changes the written deadline to within 12 elapsed hours.
- [x] Audio inherits the written order's 24-hour or 12-hour deadline.
- [x] Written fulfillment is independent of the audio purchase and audio generation.
- [ ] Decide how an accepted audio upsell is charged: a second Stripe Checkout Session or an explicitly authorized saved-payment method flow.
- [ ] Ensure page visits never create payment, redraw cards, start generation, or resend delivery.

---

## 1. Marcus daily skill

Primary file: [`.claude/skills/marcus-daily/SKILL.md`](../../../../.claude/skills/marcus-daily/SKILL.md)

### Done

- [x] Defines one-question-per-run operation.
- [x] Reads the spread library and selects the free/paid cut.
- [x] Requires load-bearing visual details from the selected face-up cards.
- [x] Uses [daily-email/SHAPE.md](daily-email/SHAPE.md) as the craft authority.
- [x] Includes writing, voice edit, independent cold read, hero generation, HTML build, review, state logging, and commit stages.
- [x] Requires explicit human approval before logging state and committing a daily.
- [x] Prevents the skill from automatically sending through AWeber.

### Not done or stale

- [ ] Remove the obsolete claim that the booking page is unbuilt and price/SLA are undecided.
- [ ] Replace obsolete statements that [SPREADS.md](daily-email/SPREADS.md), the revised [SHAPE.md](daily-email/SHAPE.md), variable-card builder support, and tracked Marcus documents do not exist.
- [ ] State the confirmed $35 price, +$12.77 speed upgrade, 24-hour standard deadline, and 12-hour upgraded deadline.
- [ ] Add the immutable edition export and booking-handoff check after the ESL is approved.
- [ ] Require full birth-name/date-of-birth compatibility review when the email explains paid personalization.
- [ ] Add a clear production boundary: the skill creates the AWeber payload but does not schedule or send it.
- [ ] Add a pre-send gate confirming that the real booking URL resolves to the exact immutable edition.

---

## 2. Daily ESL production

Primary files: [daily-email](daily-email/) · [builder](../../scripts/build-08-daily.py) · [hero generator](../../scripts/make-08-heroes.py)

### Done

- [x] Reusable writing shape exists.
- [x] Question and spread libraries exist.
- [x] Spread library supports variable counts, including three, five, six, seven, ten, and twelve-card structures.
- [x] HTML builder supports more than six cards.
- [x] Hero generator has per-spread layout support.
- [x] Generated HTML uses the established small-copy → larger spread line → hero hierarchy.
- [x] Generated emails preserve `%FIRSTNAME%` and AWeber footer links.
- [x] Hero and tarot images use hosted assets.
- [x] Daily state log exists.
- [x] Multiple Markdown letters and generated HTML files exist.
- [x] “What are my blind spots?” uses the Tree of Life with three fixed face-up cards and seven hidden positions.
- [x] Its final copy passed three independent cold readers.
- [x] Its hosted hero was verified and the card layout was visually inspected.

### Not done

- [ ] Create or update the real AWeber campaign/message for the approved ESL.
- [ ] Replace `{{BOOKING_URL}}` with a production edition-specific URL.
- [ ] Test the final HTML inside AWeber, including desktop, mobile, dark mode, images, merge fields, unsubscribe, and subscriber-options links.
- [ ] Send an AWeber test message to an approved internal address.
- [ ] Record the AWeber message/campaign ID against the immutable edition.
- [ ] Define scheduling, suppression, duplicate-send protection, and rollback procedures.
- [ ] Confirm analytics parameters that do not expose names or reading content.

---

## 3. Edition continuity

Primary files: [daily-email/README.md](daily-email/README.md) · [data/CONTRACT.md](data/CONTRACT.md) · [edition exporter](../../scripts/export-08-editions.py)

### Done

- [x] Edition contract separates immutable daily content, the buyer's saved draw, and the personal-card lens.
- [x] Edition export preserves question, theme, spread, ordered positions, fixed cards, email text, version, and source hash.
- [x] Historical local fixtures exist for healing, commitment, quiet, and two higher-calling versions.
- [x] Paid positions contain no preselected buyer cards.
- [x] Export continuity tests pass.

### Not done

- [ ] Add “What are my blind spots?” to `LOCAL_FUNNEL_EDITIONS`.
- [ ] Export the blind-spots edition into `local/08-marcus/editions.json`.
- [ ] Add question-specific blind-spots booking copy.
- [ ] Create the production edition table/schema.
- [ ] Publish immutable edition/version records rather than relying on generated local JSON.
- [ ] Bind the AWeber CTA to the exact edition ID/version.
- [ ] Prove an old or forwarded email still opens the edition that was originally sent.
- [ ] Reject unknown, retired, mismatched, or tampered edition references.

---

## 4. Booking page

Primary files: [booking-page/SCOPE.md](booking-page/SCOPE.md) · [booking mockup](booking-page/mockup.html) · [local application](../../local/08-marcus/README.md)

### Done locally

- [x] Standalone HTML mockup exists.
- [x] Local booking route exists.
- [x] Shows the question, fixed face-up cards, hidden positions, and $35 price.
- [x] Supports variable exported card counts.
- [x] Collects first name, last name, and delivery email in the local simulation.
- [x] Displays the +$12.77 speed upgrade on the booking page.
- [x] Speed upgrade is unselected by default.
- [x] Total changes between $35.00 and $47.77.
- [x] Desktop and mobile layouts pass the current browser test.
- [x] Local server controls the simulated price.

### Not done

- [ ] Build the production booking route/component.
- [ ] Load the edition from trusted production storage.
- [ ] Add **display first name**, **full birth name**, and **date of birth** as distinct reading inputs.
- [ ] Add concise privacy and purpose copy for birth-name and birth-date collection.
- [ ] Decide whether delivery email is collected on booking, Stripe, or both, and define the authoritative saved value.
- [ ] Save an unpaid intake before leaving for Stripe.
- [ ] Preserve the intake and form state after checkout cancellation or browser back navigation.
- [ ] Validate name normalization, dates, non-ASCII names, hyphens, apostrophes, and unsupported master number 33.
- [ ] Remove all mockup and local-test notices from the production page.
- [ ] Test the latest blind-spots edition on booking.
- [ ] Add secure rate limits, CSRF/origin protections, and customer-safe errors.

---

## 5. Stripe-hosted Checkout — main order

### Existing reusable infrastructure

- [x] The repository contains shared Stripe Checkout Session and webhook infrastructure for other backend offers.
- [x] Server-side offer pricing and a `readyForMoney` launch gate exist.
- [x] Existing patterns preserve short order metadata and store larger intake content outside Stripe metadata.

### Current 08 status

- [ ] Create a separate 08 fixed-price offer configuration.
- [ ] Keep the existing 07 `marcus-daily` tiered offer isolated; it uses $35/$57/$87 and remains `readyForMoney: false`.
- [ ] Define the 08 Stripe product key and server-controlled $35 price.
- [ ] Define the +$12.77 speed product/line item.
- [ ] Create a Checkout Session from the saved intake.
- [ ] Put the base reading and selected speed upgrade into the same main Checkout Session.
- [ ] Pass only short opaque identifiers in Stripe metadata.
- [ ] Set the success return to the bridge with an opaque session/order reference.
- [ ] Set cancellation return to the original booking intake.
- [ ] Verify payment from Stripe webhook events rather than browser navigation.
- [ ] Handle complete, pending, failed, expired, duplicate, refunded, and disputed states.
- [ ] Prevent repeated clicks or webhook retries from creating duplicate paid orders.
- [ ] Test Stripe test-mode totals of exactly $35.00 and $47.77.
- [ ] Keep `readyForMoney: false` until the post-payment path and fulfillment are proven.

---

## 6. Supabase and order persistence

Primary files: [data/CONTRACT.md](data/CONTRACT.md) · [n8n/MAIN-FLOW.md](n8n/MAIN-FLOW.md)

### Done locally

- [x] Local TypeScript contracts exist.
- [x] Local SQLite persistence exists.
- [x] Simulated order creation is transactional.
- [x] One local paid order is enforced per intake.
- [x] Fixed edition snapshot, payment timestamp, deadline, saved draw, and personal lens survive restart.
- [x] Local tests prove rollback and retry without redrawing.

### Not done

- [ ] Audit the deployed Supabase schema and existing order tables.
- [ ] Write reviewed additive 08 migrations.
- [ ] Add immutable editions and edition versions.
- [ ] Add private unpaid intake with display name, full birth name, date of birth, delivery email, and selected bump.
- [ ] Add paid order, line items, entitlements, payment references, and refund state.
- [ ] Add atomic buyer-draw creation and uniqueness constraints.
- [ ] Persist the numerology method/version, selected canon keys/hash, personal card, and accepted synthesis.
- [ ] Add independent written, audio, artifact, delivery, attempt, and recovery records.
- [ ] Add private PDF/audio storage and short-lived access.
- [ ] Add RLS/service-role policy, retention, redaction, and deletion rules.
- [ ] Verify transactions, concurrency, idempotency, and recovery against a disposable Supabase environment.

---

## 7. Post-payment bridge page

Primary file: [bridge-page/SCOPE.md](bridge-page/SCOPE.md)

### Done locally

- [x] Bridge scope and copy exist.
- [x] Local bridge route follows simulated payment.
- [x] Shows the buyer's name, delivery email, and 12-hour or 24-hour deadline.
- [x] States that the written order is secured.
- [x] States that the next offer cannot cancel or delay the written reading.
- [x] Refresh does not purchase audio or start duplicate fulfillment.
- [x] One clear action continues to Upsell 1.

### Not done

- [ ] Build the production bridge route.
- [ ] Load verified order status server-side.
- [ ] Handle the race where the customer returns from Stripe before the webhook finishes.
- [ ] Handle unpaid, expired, refunded, invalid, and unauthorized references.
- [ ] Prevent personal or order information from appearing in URLs.
- [ ] Confirm the main-order confirmation email is queued independently of reaching this page.

---

## 8. Audio Upsell 1 page and payment

Primary files: [upsell copy](upsell-1-audio/COPY.md) · [copy shape](upsell-1-audio/SHAPE.md) · [scope](upsell-1-audio/SCOPE.md)

### Done locally

- [x] Warning-led sales argument exists.
- [x] Copy is generalized beyond healing questions.
- [x] Copy explains the cost of skipping straight to the answer.
- [x] Copy explains why listening through the cards in order can help.
- [x] Local page includes product contents, objection handling, accept CTA, and decline CTA.
- [x] Local accept and decline routes reach thank-you.
- [x] Audio uses the same approved written report and saved draw in the product design.
- [x] Browser tests cover accept, decline, refresh, desktop, and mobile.

### Not done

- [ ] Approve the final audio price; the local $17 amount is provisional.
- [ ] Approve whether the audio is a complete narration, edited listening version, downloadable file, private player, or a combination.
- [ ] Build the production upsell route with verified parent-order context.
- [ ] Choose and build the audio charge flow.
- [ ] Show the exact additional charge without presenting the main order as another charge.
- [ ] Handle payment success, failure, additional authentication, duplicate click, refresh, and abandonment.
- [ ] Persist a separate audio entitlement against the same parent order.
- [ ] Confirm a declined audio offer never affects written fulfillment.
- [ ] Confirm audio purchase after written completion can resume only the audio branch.
- [ ] Define and enforce the late-audio-purchase deadline rule.

---

## 9. Thank-you page

Primary file: [thank-you/SCOPE.md](thank-you/SCOPE.md)

### Done locally

- [x] Local thank-you route exists.
- [x] Shows first name and purchased question.
- [x] Shows the written reading, speed upgrade, and audio when selected.
- [x] Shows itemized totals.
- [x] Shows the delivery email.
- [x] Shows independent written and audio fixture statuses.
- [x] Shows the saved 12-hour or 24-hour deadline.
- [x] Local-only control can create and open a PDF fixture.
- [x] Base-only and audio-purchased paths are covered by browser tests.

### Not done

- [ ] Build the production thank-you route.
- [ ] Read verified order state rather than trusting URL claims.
- [ ] Handle pending Stripe webhooks and refresh safely.
- [ ] Show accurate paid, processing, ready, delivered, refunded, and failed states.
- [ ] Provide private PDF and audio access when ready.
- [ ] Add approved customer-support and delivery-email correction paths.
- [ ] Ensure direct visits never create a charge, entitlement, generation job, or resend.
- [ ] Test unauthorized, expired, malformed, and missing-order states.

---

## 10. Post-purchase thank-you and delivery emails

Current result: no 08-specific post-purchase confirmation or delivery email copy files were found. Existing 02 and 06 confirmation/delivery emails may be used as structural references, but their product facts and wording must not be copied into 08 without adaptation.

Recommended folder: `docs/08-marcus/post-purchase-emails/`

### A. Main-order confirmation / thank-you email

- [ ] Create `ORDER-CONFIRMATION.md`.
- [ ] Create the provider-ready HTML/text version.
- [ ] Trigger it from verified main-payment state, independently of page navigation and audio choice.
- [ ] Thank the buyer by display first name.
- [ ] Confirm the purchased question/edition without exposing private birth data.
- [ ] Itemize the $35 reading and +$12.77 speed upgrade when selected.
- [ ] Confirm the authoritative delivery email.
- [ ] State the exact 24-hour or 12-hour deadline.
- [ ] Explain that the written reading is being prepared.
- [ ] Provide the approved support and email-correction route.
- [ ] Store provider message ID, acceptance result, and send attempt.
- [ ] Prevent webhook retries from sending duplicate confirmation emails.

### B. Audio-purchase confirmation email

- [ ] Decide whether audio receives its own confirmation email or is added to a consolidated order update.
- [ ] Create `AUDIO-ORDER-CONFIRMATION.md` if a separate message is chosen.
- [ ] Confirm the additional audio amount and original order reference.
- [ ] Explain that audio follows the approved written reading.
- [ ] State the inherited deadline accurately.
- [ ] Never imply that the written reading is incomplete without audio.
- [ ] Trigger only after verified audio payment.
- [ ] Deduplicate payment retries and repeated page visits.

### C. Written-reading delivery email

- [ ] Create `WRITTEN-DELIVERY.md`.
- [ ] Create the provider-ready HTML/text version.
- [ ] Include display first name, question, and secure PDF access.
- [ ] Choose attachment versus protected reading link.
- [ ] Avoid emailing a short-lived storage URL as the customer's only lasting access.
- [ ] State clearly that the audio, if purchased, may arrive separately.
- [ ] Send as soon as the approved PDF is ready; do not deliberately wait until the deadline.
- [ ] Store artifact version/hash and provider message ID.
- [ ] Support resend using the same approved PDF without redrawing or rewriting.
- [ ] Capture bounce/failure state and expose a support recovery action.

### D. Audio-ready delivery email

- [ ] Create `AUDIO-DELIVERY.md`.
- [ ] Create the provider-ready HTML/text version.
- [ ] Include display first name, question, and protected listening-page link.
- [ ] Include an accessible transcript or link to the written reading.
- [ ] Store the audio artifact version/hash and provider message ID.
- [ ] Support resend without regenerating the reading, voice, or card draw.
- [ ] Capture bounce/failure state independently of written delivery.

### E. Provider and lifecycle

- [ ] Select the transactional email provider.
- [ ] If AWeber is reused, prove that repeat purchases by an already-tagged subscriber still create a new order-specific send.
- [ ] Separate payment receipt, order confirmation, written delivery, and audio delivery events.
- [ ] Define sender identity, reply-to/support address, footer, privacy language, and unsubscribe requirements for each message type.
- [ ] Add idempotency keys and message-attempt records.
- [ ] Reconcile ambiguous provider timeouts before retrying.
- [ ] Define failed-delivery alerts and a manual resend runbook.
- [ ] Test duplicate webhooks, bounce, wrong email, corrected email, delayed artifact, refund, and resend.
- [ ] Send all templates to an approved internal test inbox before launch.

---

## 11. n8n written fulfillment

Primary files: [n8n/README.md](n8n/README.md) · [Stage 1 evidence](n8n/STAGE-1-TEST-EVIDENCE.md) · [workflow source](n8n/08-marcus-numerology-stage1.n8n.json)

### Done — manual Stage 1

- [x] A dedicated new Marcus workflow exists.
- [x] Existing workflows were not modified.
- [x] Workflow remains inactive.
- [x] Manual trigger accepts question, spread type, display first name, full birth name, and date of birth.
- [x] Calculates Life Path, Expression, Personality, Birthday, Soul Urge, Maturity, and personal tarot card.
- [x] Uses Life Path as the visible recognition foundation.
- [x] Uses Expression and Personality privately to guide synthesis.
- [x] Keeps the Expression-derived personal card secondary to the Life Path foundation.
- [x] Uses the versioned numerology canon.
- [x] Requires evidence citations in the private synthesis.
- [x] Draws hidden positions separately while preserving fixed email cards.
- [x] Writes every spread position, including the face-up cards.
- [x] Includes the email hero, complete spread, tarot images, numerology foundation, and personal card in the PDF.
- [x] Runs private and customer-view graders.
- [x] Allows one bounded rewrite.
- [x] Ends at `QA HOLD · NO PDF` when the second candidate still fails.
- [x] Uses stored OpenAI and PDFShift credentials.
- [x] Supports `three`, `six_questions`, `adaptive_eight`, `tree_of_life`, and `twelve_houses`.
- [x] Output token budgets scale with the spread size.
- [x] Execution `30694` proved Life Path 4 remains plainly “The Builder.”
- [x] Execution `30695` proved a second Life Path 7 profile.
- [x] Execution `30700` completed the ten-card blind-spots report with zero unsupported claims.
- [x] The execution-`30700` PDF was downloaded, verified, and committed at `output/pdf/marcus-stage1-ye-ying-blind-spots-tree-of-life.pdf`.

### Not done — production Stage 2

- [ ] Replace manual inputs with a verified paid-order event.
- [ ] Authenticate the production webhook and service calls.
- [ ] Reconcile and deduplicate events.
- [ ] Atomically claim the written job.
- [ ] Load the immutable edition, saved buyer draw, profile, canon version, and deadline from Supabase.
- [ ] Persist every generation, grade, rewrite, render, and delivery attempt.
- [ ] Store the approved PDF privately.
- [ ] Queue the written-delivery email independently of audio.
- [ ] Implement bounded retry, expired lease recovery, overdue alerts, and support review.
- [ ] Handle refunds and delivery suppression correctly.
- [ ] Test a Stripe test-mode order through actual PDF delivery.
- [ ] Keep the workflow inactive until the full Stage 2 path passes.

---

## 12. Numerology system

Primary files: [numerology canon](n8n/numerology-canon/README.md) · [combination rules](n8n/numerology-canon/COMBINATION-RULES.md)

### Done

- [x] Life Path readings exist for 1–9, 11, and 22.
- [x] Expression readings exist for 1–9, 11, and 22.
- [x] Personality readings exist for 1–9, 11, and 22.
- [x] Canon compiles into 33 versioned runtime records.
- [x] Workflow selects exactly the matching Life Path, Expression, and Personality entries.
- [x] Raw birth name and date of birth stay out of OpenAI request bodies.
- [x] Customer-facing writing exposes Life Path while keeping internal canon labels private.
- [x] Contract tests enforce selection, evidence, privacy, and QA routing.

### Not done

- [ ] Complete final human editorial approval of all 33 canon entries.
- [ ] Resolve master number 33 behavior.
- [ ] Approve full-birth-name rules for married names, chosen names, suffixes, punctuation, accents, transliteration, and non-Latin names.
- [ ] Version and persist the approved calculation/normalization method.
- [ ] Add representative tests for every approved name and date edge case.

---

## 13. Audio generation and delivery

Primary files: [audio n8n plan](n8n/AUDIO-BRANCH.md) · [Chatterbox plan](n8n/CHATTERBOX.md)

### Done as design

- [x] Replicate Chatterbox is the selected proposed provider.
- [x] Audio is defined as a chain from the main Marcus workflow.
- [x] Audio uses the accepted written report and same saved cards.
- [x] Written delivery is designed to proceed without waiting for audio.
- [x] Late audio purchase is designed to resume only the audio branch.
- [x] Segment, prediction, assembly, QA, storage, delivery, and recovery stages are scoped.

### Not done

- [ ] Receive Marcus's authorized reference voice.
- [ ] Store the reference voice privately.
- [ ] Configure a dedicated Replicate credential.
- [ ] Freeze the report-to-audio narration manifest.
- [ ] Build narration normalization and pronunciation handling.
- [ ] Create and persist deterministic segments and seeds.
- [ ] Submit and poll Chatterbox predictions safely.
- [ ] Persist provider prediction IDs before polling.
- [ ] Download and validate every segment.
- [ ] Assemble a playable final file.
- [ ] Check duration, silence, truncation, order, corruption, and pronunciation.
- [ ] Build protected storage and listening page.
- [ ] Generate and send the audio-ready email.
- [ ] Test failure, retry, duplicate event, late purchase, and resend.

---

## 14. Testing evidence

### Passing evidence

- [x] Edition export suite: 8 tests passed.
- [x] Buyer draw and personal-card suite: 6 tests passed.
- [x] Local server/API suite: 4 tests passed.
- [x] Local fulfillment suite: 3 tests passed.
- [x] SQLite transaction suite: 1 test passed.
- [x] n8n workflow contract suite: 7 tests passed.
- [x] Existing Playwright customer journey passed at 320, 390, and 1100-pixel widths.
- [x] Browser journey covered booking validation, bump totals, simulated payment, bridge refresh, audio accept/decline, thank-you totals, and local PDF retrieval.
- [x] Browser journey produced no external network request and no JavaScript error.
- [x] Current cloud workflow was verified inactive with no active execution.
- [x] Cloud execution `30700` succeeded in 154.321 seconds and returned a 1.92 MB PDF.

### Evidence still required

- [ ] AWeber-rendered and inbox-delivered ESL test.
- [ ] Exact blind-spots edition through local booking.
- [ ] Production component and routing tests.
- [ ] Supabase migration, RLS, transaction, and concurrency tests.
- [ ] Stripe test-mode base order.
- [ ] Stripe test-mode order with the +$12.77 speed upgrade.
- [ ] Stripe checkout cancel and resume.
- [ ] Duplicate and out-of-order webhook tests.
- [ ] Audio accept payment and decline paths.
- [ ] Full Stage 2 PDF storage and delivery.
- [ ] Main confirmation, written delivery, audio confirmation, and audio delivery email tests.
- [ ] Bounce, wrong-email correction, resend, refund, timeout, and recovery tests.
- [ ] Full old-edition, forwarded-link, and non-six-card continuity matrix.
- [ ] Production monitoring and rollback exercise.

---

## 15. Documentation cleanup

- [x] [README.md](README.md) contains the latest broad build and test record.
- [x] [HANDOVER.md](HANDOVER.md) records the longer implementation history.
- [x] [FUNNEL-BUILD-CHECKLIST.md](FUNNEL-BUILD-CHECKLIST.md) contains the original build tracker.
- [ ] Make this audit the current completion ledger.
- [ ] Reconcile the canonical funnel wording to show Stripe-hosted Checkout explicitly.
- [ ] Update the Marcus skill's obsolete status claims.
- [ ] Remove the stale line in `local/08-marcus/README.md` claiming the cloud workflow is unexecuted and has not been pushed.
- [ ] Update [paid-reading/SCOPE.md](paid-reading/SCOPE.md) so PDF format and 24-hour/12-hour timing are no longer listed as undecided.
- [ ] Update the booking scope with full birth name and date of birth.
- [ ] Record execution `30700` and the blind-spots edition in the main checklist.
- [ ] Add a dedicated post-purchase email folder and copy specifications.
- [ ] Remove generated `.DS_Store` and `__pycache__` files from working documentation directories where appropriate.

---

## 16. Launch gate

- [ ] All customer input, privacy, pricing, delivery, audio, refund, and support decisions are approved.
- [ ] Marcus daily skill produces an approved ESL and immutable edition package.
- [ ] Final AWeber test message reaches an approved inbox with the correct live booking link.
- [ ] Production booking accepts the required identity and delivery fields.
- [ ] Stripe test-mode main purchase succeeds at $35.00.
- [ ] Stripe test-mode bumped purchase succeeds at $47.77.
- [ ] Verified webhook creates exactly one paid order and one saved draw.
- [ ] Bridge handles webhook lag and invalid access.
- [ ] Upsell accept and decline both finish correctly.
- [ ] Audio payment produces one entitlement and no duplicate charge.
- [ ] Thank-you shows verified products, totals, deadline, and delivery status.
- [ ] Main-order confirmation email sends once.
- [ ] Written PDF passes QA, stores privately, and delivers once.
- [ ] Written-delivery email provides durable customer access.
- [ ] Purchased audio passes QA, stores privately, and delivers once.
- [ ] Audio confirmation and audio-ready emails behave as approved.
- [ ] Retry, resend, bounce, refund, duplicate webhook, and interrupted workflow tests pass.
- [ ] Monitoring, alerts, recovery, support, and rollback procedures are documented and exercised.
- [ ] Existing production funnels pass regression tests.
- [ ] Joel reviews the complete staging evidence pack.
- [ ] Separate launch approval is recorded.
- [ ] Only then set the 08 offer ready for money and activate the new Marcus fulfillment workflow.

## Recommended execution order

- [ ] 1. Reconcile the skill and documentation.
- [ ] 2. Add blind-spots edition export and local booking continuity.
- [ ] 3. Freeze customer-data, edition, order, entitlement, and delivery contracts.
- [ ] 4. Build and test Supabase persistence.
- [ ] 5. Build the production booking route and main Stripe Checkout.
- [ ] 6. Connect verified payment to the order, bridge, and n8n Stage 2.
- [ ] 7. Build the production audio upsell payment and thank-you routes.
- [ ] 8. Write and render all post-purchase confirmation and delivery emails.
- [ ] 9. Store and deliver the written PDF.
- [ ] 10. Add and test Chatterbox audio fulfillment.
- [ ] 11. Run the full test-mode matrix and assemble launch evidence.

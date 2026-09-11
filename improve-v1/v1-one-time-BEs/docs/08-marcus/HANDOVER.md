# 08 Marcus funnel — project handover

Last updated: 2026-09-11

This document records the work completed during the current Marcus build, the decisions Joel made,
the local proof that exists, and the work still required before the funnel can take real orders.

The detailed build tracker remains [FUNNEL-BUILD-CHECKLIST.md](FUNNEL-BUILD-CHECKLIST.md). This
handover is the shorter operational map for the next person or agent taking over.

## 1. Current funnel

The agreed customer sequence is:

**AWeber daily email → booking page with main payment and optional speed upgrade → bridge page →
audio Upsell 1 → thank-you page**

Important boundary: AWeber sends the real designed daily HTML email, including its hero image,
typography, face-up cards, face-down cards, and CTA. The local `/email` route is only a continuity
fixture. It is not a replacement email page and should never be inserted into the customer funnel.

After verified main payment, fulfillment should begin independently in the background. The bridge
and audio decision must never hold up the written reading.

## 2. Confirmed product decisions

| Item | Confirmed decision |
| --- | --- |
| Main reading | One personalized written reading of the positions that remained face down in the originating daily email |
| Main price | $35.00 |
| Speed upgrade | Optional +$12.77, displayed directly on the booking page and unselected by default |
| Standard deadline | Within 24 elapsed hours of confirmed main payment |
| Upgraded deadline | Within 12 elapsed hours of confirmed main payment |
| Audio deadline | Inherits the written order’s 24-hour or 12-hour deadline |
| Face-up cards | Fixed by the originating daily edition |
| Paid cards | Drawn separately for each buyer/order, saved once, and reused on every retry or resend |
| Personal card | Derived separately from first name + last name and used as an interpretive lens; it is not a spread position |
| Audio product | A narrated form of the approved written reading using the same saved draw and personal card |
| Audio workflow | A branch of the new main Marcus n8n workflow, not a separate workflow |
| Build policy | Test locally first; do not use the shared production database or charge customers during development |

The phrase “same-day delivery” was replaced with the precise promises “within 24 hours” and “within
12 hours.” The deadline is calculated once from confirmed main payment. Retries do not move it.

## 3. Daily email work

### Writing system

[daily-email/SHAPE.md](daily-email/SHAPE.md) was revised so Marcus’s letters:

- explain the cards in ordinary language instead of riddles;
- begin with the reader’s recognizable concern;
- make a useful free discovery before asking for the click;
- keep the close specific to the question and the cards already shown;
- explain why first and last name are needed for the personal card;
- explain how that card’s strengths and familiar habits help interpret the remaining positions;
- retain the established small-copy → large-copy → hero-image HTML hierarchy;
- send the reader to the booking page without mentioning price in the email.

The Marcus daily skill at `.claude/skills/marcus-daily/SKILL.md` was updated earlier to use the new
daily-email paths and clearer close guidance. Its send stage still stops for human review; AWeber is
not programmatically wired. Some introductory text in that skill still says the price and SLA are
undecided. That statement is stale: $35, +$12.77, 24 hours, and 12 hours are now confirmed. Reconcile
that skill before the next production-oriented daily run.

### Emails produced or revised

The working letters are under [daily-email/letters-02](daily-email/letters-02/) and their designed
HTML renders are under [daily-email/html](daily-email/html/). Work included:

- clearer versions of “What is my higher calling?”;
- the new test letter “Why won’t he commit?”;
- the new test letter “What part of myself needs the most healing right now?”;
- revisions to remove mechanical “NOTICE TO READERS” closes;
- question-specific explanations of why the personal card matters.

The rendered HTML retains the established email template and card art. These files are designed
artifacts for review before AWeber setup, but no AWeber campaign was created, updated, scheduled,
or sent.

### Edition export and continuity

[scripts/export-08-editions.py](../../scripts/export-08-editions.py) now creates
`local/08-marcus/editions.json` from the daily builder’s `LETTERS` configuration and the original
Markdown letters. This replaces the local funnel’s manually duplicated card and excerpt registry.

Each exported edition contains:

- stable edition ID and version;
- topic slug and question;
- spread identity and version;
- ordered free and paid positions;
- fixed face-up cards and orientation;
- full source email converted to plain text;
- optional question-specific booking copy;
- source path and SHA-256 hash.

Five local continuity fixtures exist:

| Edition | Purpose |
| --- | --- |
| `healing-v1` | Existing healing journey, two face-up and four buyer-drawn cards |
| `commitment-v1` | Existing commitment journey, two face-up and four buyer-drawn cards |
| `quiet-v1` | Variable-count proof, three face-up and three buyer-drawn cards |
| `higher-calling-v1` | Historical version-continuity fixture |
| `higher-calling-v2` | Same topic slug with a different edition version |

These fixtures are marked for local routing only. Their `published` value is not approval to send
the historical emails to the live list.

## 4. Page work

### Booking page

The scope is [booking-page/SCOPE.md](booking-page/SCOPE.md). The standalone visual prototype is
[booking-page/mockup.html](booking-page/mockup.html), and the executable version is
`../../local/08-marcus/index.html`.

The page now:

- opens the exact edition referenced by the email CTA;
- preserves the question, spread, fixed face-up cards, position labels, and number of hidden cards;
- displays the $35 price before personal details;
- collects first name, last name, and delivery email;
- explains the name-derived personal card in question-specific language where approved copy exists;
- displays the optional +$12.77 speed upgrade on the booking page itself;
- updates the total between $35.00 and $47.77 without navigating away;
- submits the selected order to the simulated payment action.

The earlier separate bump/order-review page was removed. The standalone mockup’s separate payment
preview was also removed.

### Bridge page

The bridge is defined in [bridge-page/SCOPE.md](bridge-page/SCOPE.md) and implemented at local route
`/bridge?order=<order_id>`.

It appears after main payment and before Upsell 1. It confirms:

- the written order is secured;
- the saved delivery email;
- the correct 24-hour or 12-hour deadline;
- the next page cannot cancel or delay the written order.

It then uses one `Continue` action to introduce the optional audio offer. It does not contain the
audio price or repeat the full sales argument.

### Audio Upsell 1

All audio work is grouped under [upsell-1-audio](upsell-1-audio/README.md).

Three agents wrote distinct drafts after the first weak drafts were discarded. Joel selected draft
A and asked that its healing-specific references be removed so it works after any daily topic.
[upsell-1-audio/COPY.md](upsell-1-audio/COPY.md) is the current generic copy, and
[upsell-1-audio/SHAPE.md](upsell-1-audio/SHAPE.md) is the reusable writing standard.

The latest page strengthens the direct-response structure with:

- a warning against jumping straight to the final answer;
- a concrete consequence: advice without the reasoning may be hard to use;
- the mechanism: listening carries the buyer through the cards in order;
- a tangible contents block;
- an objection answer confirming the written reading is already complete;
- one explicit additional price;
- a benefit-led accept CTA and a plain-language decline.

The accept action now purchases the simulated audio entitlement directly. The extra audio-review
page was removed. Accept and decline both lead to thank-you.

The local UI uses **$17.00 only as a conspicuously labelled provisional test price**. No final audio
price has been approved.

### Thank-you page

The local receipt shows:

- customer first name and question;
- main reading, speed upgrade when selected, and audio when purchased;
- itemized amounts and total;
- delivery email;
- written and audio fixture statuses;
- the inherited 24-hour or 12-hour deadline;
- a local-only control for generating and opening the saved PDF fulfillment fixture.

The production receipt/access behavior is still only scoped in [thank-you/SCOPE.md](thank-you/SCOPE.md).

## 5. Reading data and card logic

[data/CONTRACT.md](data/CONTRACT.md) and `../../local/08-marcus/contracts.ts` define the local v1
contract.

Three records remain separate:

1. The immutable daily edition and its fixed free cards.
2. The buyer’s saved draw for paid positions.
3. The name-derived personal card used as an interpretive lens.

The local draw engine in `../../local/08-marcus/draw.ts`:

- draws paid cards without replacement;
- excludes cards already fixed face up in the edition;
- saves one draw per order and returns it on retries;
- allows the personal card to coincide with a spread card because it is a separate lens;
- currently uses upright cards for the local method;
- reuses the existing numerology expression calculation without modifying Aiden’s behavior;
- explicitly rejects unsupported non-ASCII cases and unmapped master number 33 instead of guessing.

The non-ASCII and master-number behavior is a deliberate unresolved boundary, not the final product
policy.

## 6. Local application and persistence

The isolated local application lives at `improve-v1/v1-one-time-BEs/local/08-marcus/`.

It does not load `.env`, start the main application, connect to Supabase, call Stripe, send analytics,
call a model, synthesize audio, or send email.

Implemented local pieces:

- `server.ts`: loopback-only HTTP server and local API;
- `index.html`: full customer-journey simulation;
- `store.ts`: SQLite key/value persistence with immediate transactions;
- `draw.ts`: paid draw and personal-card logic;
- `fulfillment.ts`: adaptive workflow-stage adapters and captured PDF fixture outputs;
- `render-report-pdf.py`: A4 written-reading renderer driven by the saved theme and ordered positions;
- `fixtures.ts` + `editions.json`: deterministic daily-edition input;
- focused unit, API, restart, and browser tests.

The command-line server binds to `127.0.0.1:5088` and stores fake state at
`/tmp/08-marcus-local/state.sqlite`. Tests use memory or temporary databases.

Local API behavior includes:

- intake creation before payment;
- server-controlled $35 and $12.77 amounts;
- simulated verified main payment;
- one paid order per intake, including concurrent replay protection;
- immutable saved draw, paid timestamp, deadline, and order snapshot;
- separate simulated audio accept/decline;
- local receipt and adaptive PDF fixture fulfillment;
- rollback when the paid-order/index transaction fails.

## 7. Local fulfillment adapters

`../../local/08-marcus/fulfillment.ts` implements the stage contract used by the n8n design. The
local endpoint is:

`POST /internal/marcus08/<operation>`

It accepts only loopback requests with the public fixture token
`Authorization: Bearer marcus08-local-fixture-only`. That token is intentionally not a production
credential.

The adapter currently proves:

- durable event reconciliation and conflicting-event rejection;
- main/audio job leases and lease expiry;
- retry without redrawing cards;
- a theme-aware brief containing every ordered position, the exact paid cards, free-email context, and personal card;
- structural report grading and stored local PDF fixtures with no fixed spread count;
- written delivery queued independently of audio;
- audio waiting when the written report is not approved yet;
- a saved narration manifest tied to the approved report hash;
- saved synthetic provider prediction identities and bounded polling state;
- segment ordering and manifest assembly;
- captured delivery with `sent: false`;
- recovery reporting for expired work.

It does **not** write a production tarot reading, generate playable speech, copy provider files,
assemble audio, create a private player, enqueue recovery work, or send a customer message. Fixture
reports, PDFs and manifests label themselves accordingly.

## 8. n8n work

A completely new workflow was created and then converted into a staged manual test workflow.
Existing n8n workflows were not changed or activated.

| Item | Value |
| --- | --- |
| Name | `08 Marcus — Numerology-Anchored Stage 1 / Stage 2 Parked` |
| Workflow ID | `Lksy14rvjB5Z7aYg` |
| URL | <https://ezyabsorb.app.n8n.cloud/workflow/Lksy14rvjB5Z7aYg> |
| State | Inactive |
| Stage 1 | Birth-profile calculation; exact three-entry canon lookup; cited synthesis and evidence grade; private tarot planner; report writer; two report graders; structural gate; PDFShift output |
| Stage 2 | Parked; Supabase/payment/storage/delivery/audio are not wired |

The current cloud source is [n8n/08-marcus-numerology-stage1.n8n.json](n8n/08-marcus-numerology-stage1.n8n.json), built by
[n8n/build-numerology-workflow.py](n8n/build-numerology-workflow.py). The scoped updater refuses to touch
any other workflow and never activates this one. The original production scaffold and its builder
remain as Stage 2 architecture references.

The archived 47-node production scaffold covers:

- event verification/reconciliation;
- atomic main-job claim;
- 24-hour/12-hour deadline handling;
- reading brief, writing, grading, rendering, and written delivery queue;
- audio entitlement and report-readiness checks;
- saved audio script and ordered segments;
- Replicate submission, bounded polling, result persistence, and private-copy stage;
- assembly/QA, audio delivery queue, delivery dispatch, and recovery entry.

Two problems found after creation were fixed in the **local source**:

1. duplicate main events now require `jobState === claimed` before generation continues;
2. deadline selection now reads the trusted `order.bumpCents` field instead of a nonexistent
   `order.sameDay` field.

The remote workflow was updated only at `Lksy14rvjB5Z7aYg`. Do not modify an existing 07, 02, 03,
or other production workflow.

The cloud workflow remains inactive, but its Manual Trigger was executed after the canon integration.
The current 37-node canvas calculates Life Path 4, Expression 6, Personality 1, selects exactly
`LP4`, `EX6`, and `PE1`, and gives those entries to a dedicated question-synthesis step. Its claims
must cite approved passage IDs and pass a separate evidence grader before tarot planning.

Joel's execution `30688` stopped at node 22 because the final customer grader found unsupported
biographical claims and internal wording such as “saved message.” The flow was functioning as a
fail-closed gate, but the red error made it look stuck. The writer handoff now renames the prior
email interpretation, forbids process labels and unsupported time spans, and leads hypotheses with
the supporting card. Citation confidence is derived deterministically from citation count and role,
so a harmless model label cannot stop the flow. A failed second customer grade now terminates at
`QA HOLD · NO PDF` with its reason and rewrite instructions.

Post-repair execution `30691` passed the cited synthesis and both report graders on its first report,
with zero unsupported claims. It preserved The Star and Seven of Pentacles, drew The Emperor, Four
of Swords, Eight of Wands, and Nine of Cups, used The Lovers as the separate personal-card lens, and
returned a 1.18 MB PDF containing all six positions and images. Raw birth name and date stayed out
of every OpenAI request. See
[n8n/STAGE-1-TEST-EVIDENCE.md](n8n/STAGE-1-TEST-EVIDENCE.md).

The later Builder-first repair adds a fixed customer-visible Life Path section before the personal
card. Life Path is now the identity anchor; Expression and Personality remain private inputs, while
the personal card only qualifies how the Life Path approaches choices and commitments. For the
4/6/1 test profile, the copy must plainly recognize **The Builder** and may use The Lovers for choice,
alignment, and shared responsibility without replacing the Builder with a romance or caregiving
theme. Execution `30694` passed both graders on its first candidate, with Life Path recognition at
10/10, every applicable customer score at 5/5, zero unsupported claims, and a 1.21 MB PDF.

Base Life Path, Expression, and Personality meanings now come from the versioned, reusable 33-entry
canon instead of being recreated per order. The source readings, compiler, runtime JSON, evidence
rules, worked 4/6/1 example, and workflow contract tests are in
[n8n/numerology-canon/README.md](n8n/numerology-canon/README.md). Editorial approval of the prose
library remains open even though its compilation, retrieval, and workflow wiring are complete.

Separately, an ephemeral local n8n container passed an eight-card 4-up/4-down fixture through the
local backend and PDF renderer. See [n8n/LOCAL-EXECUTION-EVIDENCE.md](n8n/LOCAL-EXECUTION-EVIDENCE.md).

## 9. Replicate Chatterbox audio plan

The approved direction is Replicate’s standard `resemble-ai/chatterbox` model with a Marcus voice
sample Joel will supply. Details and source links are in [n8n/CHATTERBOX.md](n8n/CHATTERBOX.md).

The correct standard-model fields are:

- `prompt`: narration segment text;
- `audio_prompt`: fresh signed URI for the Marcus reference recording.

The draft starts with `exaggeration: 0.5`, `cfg_weight: 0.5`, `temperature: 0.8`, and a saved seed.
These settings have not been approved by listening tests.

Predictions are asynchronous. The intended flow saves the prediction ID, polls with a bounded
budget, and immediately copies successful output into private storage. Replicate-hosted output is
temporary and cannot be used as the permanent customer URL.

No Marcus voice sample has been supplied. No Replicate credential was found/configured for this
flow, and no synthesis test has been run.

## 10. Test evidence

The completed local checks are:

| Area | Result |
| --- | --- |
| Edition exporter | 8 regression tests passed; drift check passed |
| Draw engine | 6 focused tests passed |
| SQLite store | 1 persistence/transaction test passed |
| Local API/server | 4 tests passed, including restart, concurrent replay, rollback, service auth, and full-envelope fulfillment |
| Fulfillment stages | 3 tests passed, including leases, audio-before-report, report/audio parity, captured delivery, retry without redraw, and an eight-card 4-up/4-down themed PDF |
| Ephemeral local n8n | Main route passed with eight cards, 4-up/4-down, edition theme, personal card, PDF render, delivery queue, and clean no-audio exit |
| Executable browser journey | Passed at 1100, 390, and 320px across all five editions |
| Standalone booking mockup | Passed at desktop/mobile widths with bump on booking and no separate review/bump page |
| Canon workflow contract | 4 tests passed: exact 4/6/1 lookup, birth-data exclusion, unsupported 33 rejection, foreign-citation rejection, and scrubbed writer handoff |
| Canon-backed cloud n8n | Builder-first execution `30694` passed cited-synthesis QA and both report graders on its first report; visible Life Path 4 Builder foundation; zero unsupported customer claims; 1.21 MB PDF |

The browser journey tested:

**AWeber handoff fixture → booking with bump/payment → bridge → audio offer → thank-you**

It covered audio accept and decline, 24-hour and 12-hour orders, invalid-name recovery, bridge
refresh, totals, image loading, generated PDF retrieval, narrow layouts, horizontal overflow,
external requests, and browser JavaScript errors.

Screenshots are written outside the repository under `/tmp/marcus-local-*.png` when the browser test
runs. They are temporary evidence, not committed assets.

## 11. How to run the local proof

From the repository root:

```sh
./node_modules/.bin/tsx improve-v1/v1-one-time-BEs/local/08-marcus/server.ts
```

Then open:

```text
http://127.0.0.1:5088/
```

Useful direct routes:

```text
http://127.0.0.1:5088/booking?edition=healing-v1
http://127.0.0.1:5088/booking?edition=commitment-v1
```

Run the checks:

```sh
python3 improve-v1/v1-one-time-BEs/scripts/export-08-editions.test.py
python3 improve-v1/v1-one-time-BEs/scripts/export-08-editions.py --check
node --import tsx --test improve-v1/v1-one-time-BEs/local/08-marcus/store.test.ts
./node_modules/.bin/tsx --test improve-v1/v1-one-time-BEs/local/08-marcus/draw.test.ts
./node_modules/.bin/tsx --test improve-v1/v1-one-time-BEs/local/08-marcus/server.test.ts
./node_modules/.bin/tsx --test improve-v1/v1-one-time-BEs/local/08-marcus/fulfillment.test.ts
node improve-v1/v1-one-time-BEs/local/08-marcus/browser.test.cjs
```

Do not replace this launcher with the repository’s normal development server. The main application
can load shared production services from its environment.

## 12. File organization and cleanup completed

The former flat `docs/08-marcus` directory was grouped into these work areas:

- `daily-email/`
- `booking-page/`
- `bridge-page/`
- `paid-reading/`
- `upsell-1-audio/`
- `thank-you/`
- `data/`
- `n8n/`
- `local-testing/`
- `reference/`
- `archive/`

Obsolete `00-ASTRA-BRIEF.md` was deleted at Joel’s request. The older generated Marcus voice profile
was retained under `archive/` for historical reference. Internal links and builder paths were
updated after the move.

The working 08 docs, local harness, scripts, and Marcus skill appear as untracked files in the
current worktree. No commit was created. The repository also contains unrelated user work; do not
clean, reset, or bulk-delete the worktree.

## 13. What is still missing

Nothing in the current build can safely take or fulfill a real customer order yet.

### Decisions required

- PDF is confirmed for the written reading. Attachment versus restricted private link remains open.
- Final audio price; local `$17` is provisional.
- Marcus reference voice, narrator disclosure, pronunciation quality, and approved Chatterbox settings.
- Name normalization for non-ASCII names and a personal-card rule for master number 33.
- Support contact, refund policy, missed-deadline remedy, and failed-reading QA/escalation policy.
- Private audio player versus download permission.

### Production engineering required

- Create an immutable production edition store and publication process.
- Generate real AWeber CTA URLs carrying stable edition IDs and attribution.
- Validate the final AWeber HTML/assets before each send.
- Design and apply additive Supabase migrations with RLS and rollback guidance.
- Build production intake, order snapshot, entitlement, job, report, artifact, and delivery records.
- Add the fixed 08 product and speed upgrade to server-controlled checkout pricing.
- Integrate real payment creation, authentication, webhooks, cancellation, replay, and refund behavior.
- Build production booking, bridge, Upsell 1, and thank-you routes with secure order access.
- Select and implement the report-writing model, prompt, output format, and quality rubric.
- Connect the tested PDF shape to private production storage and its approved delivery mechanism.
- Supply and store the Marcus voice reference securely.
- Configure Replicate credentials; synthesize, copy, assemble, and listen-test audio.
- Build the private audio player/access link.
- Configure the written and audio delivery provider/templates.
- Implement recovery scheduling, alerts, support resend, bounce/failure handling, and monitoring.
- Keep production Stage 2 isolated from the tested manual lane; add and test its backend/payment/storage/delivery nodes only against the new Marcus workflow.
- Run the full staging purchase and replay matrix before requesting launch approval.

## 14. Recommended next sequence

1. Settle the remaining product/operations decisions, especially PDF delivery mechanism, audio
   price, and personal-card edge cases.
2. Freeze the production data contract and write additive Supabase migrations without touching
   existing 02/03/07 behavior.
3. Add the server-controlled 08 offer and verified payment flow.
4. Convert the tested local pages into production routes using secure edition and order references.
5. Implement and evaluate the written-report generator, rubric, renderer, and private storage.
6. Add Marcus’s voice and complete the Chatterbox segment, assembly, player, and delivery chain.
7. Update only the new inactive n8n workflow, run the isolated staging matrix, and collect evidence.
8. Ask Joel for separate launch approval before activating the workflow, sending customer email, or
   using a real charge as a test.

## 15. Safety boundaries for the next handoff

- Do not edit, activate, deactivate, or copy over any existing n8n workflow.
- Do not activate workflow `Lksy14rvjB5Z7aYg` until backend operations, credentials, and staging
  execution are complete.
- Do not connect the local harness to `.env`, Supabase, Stripe, AWeber, Replicate, or a delivery provider.
- Do not treat local fixtures, report placeholders, or audio manifests as customer deliverables.
- Do not send an AWeber email or customer delivery without explicit authorization.
- Do not regenerate a buyer’s draw on retry, resend, audio purchase, or recovery.
- Do not delay the written delivery while waiting for an audio decision or audio processing.
- Do not use the provisional `$17` audio price in a live offer.
- Do not silently invent a result for unsupported names or master number 33.
- Do not clean or reset unrelated repository changes.

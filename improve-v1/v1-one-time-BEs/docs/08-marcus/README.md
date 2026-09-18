# 08 Marcus — build and test record

> **Start here.** Twelve readings are selected for launch (five rewrites + seven new): review packets
> [refresh-five/REVIEW.md](daily-email/reviews/refresh-five/REVIEW.md) and
> [mixed-batch/REVIEW.md](daily-email/reviews/mixed-batch/REVIEW.md); letters side by side at the
> [twelve-letter gallery](https://claude.ai/code/artifact/375861ea-7ef2-4bbf-a9db-e176cc7b0164).
> The to-do list, split by owner, is at the bottom of this file. Decisions live in
> [PARALLEL-PLAN.md](PARALLEL-PLAN.md) §1. (The former FUNNEL-STATUS-AUDIT.md, HANDOVER.md and
> HANDOFF-MIXED-DAILIES-2026-09-14.md were folded into this README on 2026-09-15; history is in git.)

Last updated: 2026-09-15

This folder contains the current design, copy, local application, and n8n work for the Marcus daily-reading funnel. The manual 37-node n8n Stage 1 can produce a complete, numerology-anchored PDF from test inputs. A separate 48-node numerology-anchored written-and-audio fulfillment draft is now available in n8n for review, inactive and guarded. A real Chatterbox Turbo smoke test generated Marcus voice-v2 audio, and 0.90× pitch-preserving playback is the approved default. The production routes (booking, bridge, receipt, fulfilment API, draw on payment) are built and committed on branch `08-marcus`; the database migrations, AWeber list, audio upsell, send helper and n8n wiring are not connected yet — see "Remaining to-dos" below.

[FUNNEL-BUILD-CHECKLIST.md](FUNNEL-BUILD-CHECKLIST.md) preserves the original implementation tracker; [PARALLEL-PLAN.md](PARALLEL-PLAN.md) holds every decision and the wave plan.

## Agreed funnel

**AWeber daily email → booking page with payment and optional speed bump → bridge page → audio Upsell 1 → thank-you page**

After confirmed payment, the fulfillment system generates the written reading in the background. The audio offer cannot cancel or delay the written order.

| Product | Price | Delivery promise |
| --- | ---: | --- |
| Personalized written PDF | $35.00 | Within 24 elapsed hours of confirmed payment |
| Speed bump on booking page | +$12.77 | Changes the written deadline to within 12 elapsed hours |
| Audio narration upsell | $17.00 (Joel, 2026-09-13) | Uses the written order's 24-hour or 12-hour deadline |

Each daily edition fixes the question, spread, theme, face-up cards, and hidden position labels. Each paid order draws its hidden cards once and saves them for all retries. Numerology is calculated from the customer's full birth name and date of birth. Life Path is the main visible recognition anchor; Expression and Personality guide the private synthesis; the Expression-derived tarot card is a secondary lens.

## What has been built

| Area | Built now | Current boundary |
| --- | --- | --- |
| Daily email | Reusable [writing shape](daily-email/SHAPE.md), [spread library](daily-email/SPREADS.md), [question library](daily-email/QUESTIONS.md), edition [state log](daily-email/STATE.md), Markdown letters, AWeber-ready HTML builder, hero generator, and cold-read review records | Emails are reviewed files; no AWeber campaign was scheduled or sent |
| Latest daily batch | [Twelve selected launch candidates](daily-email/reviews/launch-twelve/html/index.html): five rewritten versions plus seven mixed-topic editions; [current handoff](daily-email/reviews/refresh-five/REVIEW.md) | Human review and immutable production booking URLs still required |
| Booking page | [Approved scope](booking-page/SCOPE.md), standalone [HTML mockup](booking-page/mockup.html), and executable local route with $35 offer and optional +$12.77 speed bump | Production route `/marcus/reading/:editionId` built (committed 751719a): edition list from `be_08_editions`, birth fields on the page, Stripe hosted Checkout for card/email only. Not deployed; `readyForMoney` false |
| Bridge page | [Scope](bridge-page/SCOPE.md) and executable local route that confirms the saved order and deadline before the audio offer | Production route `/marcus/reading/bridge` built: reads the real order, forwards after 7 s only once paid, fails closed. Not deployed |
| Audio Upsell 1 | Reusable [copy shape](upsell-1-audio/SHAPE.md), selected [sales copy](upsell-1-audio/COPY.md), [product scope](upsell-1-audio/SCOPE.md), local accept/decline route, selected voice v2 stored [locally and privately](n8n/assets/marcus-voice/README.md), verified Replicate credential, successful Chatterbox Turbo sample, and approved 0.90× pacing default | Price, production signed-URL operation, segmentation, assembly, private player, and delivery remain pending |
| Thank-you | [Receipt and delivery scope](thank-you/SCOPE.md) plus a local receipt route showing saved products, totals, status, and deadline | Production receipt `/marcus/reading/success` built (status rows first, total last). No private download or recording link yet (T8/T11) |
| Local application | Loopback-only funnel, SQLite persistence, edition export, simulated payment, saved buyer draw, personal-card logic, adaptive report fixtures, and local PDF rendering | Uses fake payments and captured deliveries; makes no Supabase, Stripe, OpenAI, PDFShift, Replicate, email, or analytics call |
| n8n Stage 1 | Dedicated inactive 37-node workflow with numerology calculation, fixed canon selection, evidence synthesis, tarot planning, report writing, two graders, one bounded rewrite, fail-closed QA, and PDFShift rendering | Manual test lane only; does not load an order or deliver a customer report |
| n8n Stage 2 | Production flow architecture, delivery policy, operation envelopes, retry/lease design, audio branch plan, and a separate [48-node inactive cloud draft](https://ezyabsorb.app.n8n.cloud/workflow/UJamB32MGlNKdoEW) with an explicit numerology gate and Chatterbox Turbo fields | Reviewable scaffold only; its guard is disabled and its backend operations remain placeholders until the production data and verified-payment contracts are implemented |
| Numerology canon | Versioned 33-entry canon covering Life Path, Expression, and Personality numbers 1–9, 11, and 22, with combination rules and compiled runtime JSON | Prose approved 2026-09-15 (Joel); master 33 reduces to 6 per D7. Earlier text: unsupported master number 33 fails explicitly |

The executable local application is under [local/08-marcus](../../local/08-marcus/README.md). Its routes are `/email`, `/booking`, `/bridge`, `/upsell`, and `/thank-you` on `127.0.0.1:5088`.

## What has been tested

### Daily email continuity

The **What are my blind spots?** edition uses the traditional ten-card Tree of Life spread:

- fixed face-up cards: The Moon, Two of Swords, and Three of Pentacles;
- seven hidden positions reserved for the buyer-specific draw;
- HTML hierarchy verified as 17 px opening copy → 22 px spread line → hero image;
- hero visually checked for exactly three face-up and seven face-down cards;
- hosted hero returned HTTP 200;
- final copy passed three independent cold reads with no blocking findings.

The hosted hero is:

`https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com/marcus/08/08-hero-what-are-my-blind-spots.jpg`

### Cloud n8n Stage 1

The dedicated workflow is inactive and safe for manual tests:

**[Open the Marcus Stage 1 workflow](https://ezyabsorb.app.n8n.cloud/workflow/Lksy14rvjB5Z7aYg)**

The strongest end-to-end test is [execution 30700](https://ezyabsorb.app.n8n.cloud/workflow/Lksy14rvjB5Z7aYg/executions/30700):

| Check | Result |
| --- | --- |
| Input | Hng Ye Ying, 16 March 1986; “What are my blind spots?” |
| Spread | Tree of Life, 3 fixed face up / 7 buyer-specific face down |
| Numerology | Life Path 7 · The Seeker; private Expression 6 and Personality 1 |
| Personal card | The Lovers, used as a secondary lens |
| Fixed cards preserved | The Moon · Two of Swords · Three of Pentacles |
| Buyer draw | Seven of Pentacles · Ace of Wands · King of Wands · The Hierophant · Queen of Wands · Knight of Cups · The Hanged Man |
| Private grade | 9–10/10 across all eight dimensions |
| Customer grade | Every applicable dimension 5/5; 40 sound, 0 invented, 0 unsupported claims |
| Rewrite | Not needed |
| Output | `marcus-stage1-ye-ying-numerology-tree_of_life.pdf`, 1.92 MB |

Execution `30699` first exposed that a token budget sized for six cards truncated the ten-card writer response. Writer and rewrite budgets now scale with the number of positions: 7,000 tokens for six cards, 14,000 for ten, and 17,500 for twelve, capped at 18,000. Execution `30700` then completed through both graders and PDFShift.

Earlier passing runs also proved:

- execution `30694`: Life Path 4 remained plainly **The Builder**, while The Lovers stayed subordinate as the personal-card lens;
- execution `30695`: a second profile correctly produced Life Path 7 · **The Seeker**;
- rejected final QA ends at `QA HOLD · NO PDF` instead of sending weak copy to PDFShift;
- supported layouts include `three`, `six_questions`, `adaptive_eight`, `tree_of_life`, and `twelve_houses`.

Full run details are recorded in [STAGE-1-TEST-EVIDENCE.md](n8n/STAGE-1-TEST-EVIDENCE.md). The workflow contract suite contains seven tests for code validity, exact canon selection, privacy boundaries, citation enforcement, adaptive token budgets, and fail-closed routing; all seven pass.

### Cloud n8n audio smoke test

The separate fulfillment draft is available here:

**[Open the 48-node numerology-anchored written-and-audio fulfillment draft](https://ezyabsorb.app.n8n.cloud/workflow/UJamB32MGlNKdoEW)**

It was created as a separate inactive workflow. After the [numerology-anchor audit](n8n/NUMEROLOGY-ANCHOR-AUDIT.md), an explicit fail-closed anchor gate was added. A read-back from n8n confirmed 48 nodes, inactive state, `enabled: false`, and the anchor gate. The existing 37-node Stage 1 workflow was not modified.

The original `resemble-ai/chatterbox` deployment returned the same provider-side CUDA assertion with the 28-second voice reference, a 10-second reference, and no reference audio. The maintained `resemble-ai/chatterbox-turbo` endpoint then succeeded through a temporary n8n test lane:

| Check | Result |
| --- | --- |
| n8n execution | `31276` |
| Replicate prediction | `s9g4pxdgh5rmy0d0kbyrd42rew` |
| Reference | Marcus voice v2, normalized 9.99-second private WAV |
| Provider generation | Succeeded in 4.4 seconds |
| Saved output | 14.14-second mono 24 kHz WAV |
| Approved pacing default | Pitch-preserving 0.90× tempo; 300 ms paragraph pauses; 600 ms card-section pauses; 900 ms before the closing synthesis |

Listen to the [provider output](n8n/assets/marcus-voice/tests/marcus-voice-v2-chatterbox-turbo-s9g4pxdgh5rmy0d0kbyrd42rew.wav) or the [approved 0.90× pacing sample](n8n/assets/marcus-voice/tests/marcus-voice-v2-chatterbox-turbo-s9g4pxdgh5rmy0d0kbyrd42rew-90pct.wav). The machine-readable default is [marcus-audio-v1.json](n8n/config/marcus-audio-v1.json), and the full provider record is in [AUDIO-TEST-EVIDENCE.md](n8n/AUDIO-TEST-EVIDENCE.md).

### Local funnel and fulfillment

The isolated local harness has tested:

- email-edition continuity through booking, bridge, upsell, and thank-you;
- server-controlled totals of 3,500 or 4,777 cents;
- one simulated paid order per intake, including concurrent replay protection;
- a separately saved hidden-card draw for each order and stable retry behavior;
- fixed face-up cards and a separate name-derived personal-card lens;
- immutable paid timestamps and 24-hour or 12-hour deadlines across restarts;
- audio accept, decline, refresh, and late-purchase paths without blocking the written reading;
- adaptive report and PDF fixtures for six-card and eight-card spreads;
- local-only authenticated fulfillment operations, leases, rollback, and captured unsent deliveries;
- desktop and mobile browser journeys with no external requests.

These tests prove the local contracts and page flow. The separate provider smoke test proves Replicate authentication, signed reference access, and one short Turbo synthesis. It does not prove full-report narration, production Stripe/Supabase handling, private player delivery, or recovery behavior.

## How to test what works today

### Render the latest daily email

From the repository root:

```sh
python3 improve-v1/v1-one-time-BEs/scripts/build-08-daily.py
```

The builder regenerates all registered daily emails, including [the latest rendered HTML](daily-email/html/what-are-my-blind-spots.html). Building the files does not publish or send them through AWeber.

### Run the local customer journey

```sh
./node_modules/.bin/tsx improve-v1/v1-one-time-BEs/local/08-marcus/server.ts
```

Open `http://127.0.0.1:5088`. Use made-up customer information. The detailed commands and API are in the [local harness README](../../local/08-marcus/README.md).

Focused tests:

```sh
./node_modules/.bin/tsx --test improve-v1/v1-one-time-BEs/local/08-marcus/draw.test.ts
./node_modules/.bin/tsx --test improve-v1/v1-one-time-BEs/local/08-marcus/server.test.ts
./node_modules/.bin/tsx --test improve-v1/v1-one-time-BEs/local/08-marcus/fulfillment.test.ts
node --import tsx --test improve-v1/v1-one-time-BEs/local/08-marcus/store.test.ts
node improve-v1/v1-one-time-BEs/local/08-marcus/browser.test.cjs
```

### Rebuild the twelve editions and their review gallery locally

Run from the repository root. Edit source Markdown (`daily-email/letters-02/`) and the edition
configs (`daily-email/edition-configs/`), never the generated HTML or `local/08-marcus/editions.json`.

```sh
python3 improve-v1/v1-one-time-BEs/scripts/export-08-editions.py            # regenerate editions.json
python3 improve-v1/v1-one-time-BEs/scripts/export-08-editions.py --check    # drift check
python3 improve-v1/v1-one-time-BEs/scripts/build-08-review-packet.py --booking-origin http://127.0.0.1:5088
./node_modules/.bin/tsx improve-v1/v1-one-time-BEs/local/08-marcus/server.ts   # local app on 5088
python3 -m http.server 5092 --bind 127.0.0.1                                  # second terminal, for the gallery
```

Gallery: `http://127.0.0.1:5092/improve-v1/v1-one-time-BEs/docs/08-marcus/daily-email/reviews/mixed-batch/html/index.html`.
Restart the local app after exporting editions (it imports fixtures at startup). The launch set is
`daily-email/edition-configs/launch-selection-2026-09-14.json`; the production publisher
(`scripts/publish-08-editions.ts`) follows it and retires every other record.

### Generate a real test PDF in n8n

1. Open the [inactive Marcus workflow](https://ezyabsorb.app.n8n.cloud/workflow/Lksy14rvjB5Z7aYg).
2. Edit `2 · TEST INPUTS — EDIT ME`.
3. Enter `question`, `spreadType`, `displayFirstName`, `fullBirthName`, and `dateOfBirth`.
4. Click **Execute workflow**.
5. Open `26 · REPORT READY — DOWNLOAD PDF`, choose **Binary**, and download `data`.

Stage 1 already uses stored OpenAI and PDFShift credentials. It does not use Supabase or send the resulting PDF. Keep the workflow inactive while Stage 2 is unbuilt.

To regenerate and verify the workflow source locally:

```sh
python3 improve-v1/v1-one-time-BEs/docs/08-marcus/n8n/build-numerology-workflow.py
node --test improve-v1/v1-one-time-BEs/docs/08-marcus/n8n/numerology-canon/workflow-contract.test.cjs
python3 improve-v1/v1-one-time-BEs/docs/08-marcus/n8n/update-staged-workflow.py --dry-run
```

## Remaining to-dos (updated 2026-09-15)

Split by who does it. The production routes are built and committed on branch `08-marcus`
(751719a, fc604cd, 9ffc76f, f615bb5); `readyForMoney` is still `false`, nothing is deployed,
both n8n workflows are inactive. The old "production gap" (birth name + DOB not collected) is
closed: the booking page collects display first name, full birth name and date of birth — on
OUR page, never as Stripe custom fields (Joel, 2026-09-14, re-confirmed 2026-09-15).

### Joel

- [ ] Review the twelve launch letters (five rewrites + seven new): [gallery](https://claude.ai/code/artifact/375861ea-7ef2-4bbf-a9db-e176cc7b0164), [refresh-five packet](daily-email/reviews/refresh-five/REVIEW.md), [mixed-batch packet](daily-email/reviews/mixed-batch/REVIEW.md). Codex's batch is uncommitted until this review is done.
- [x] Numerology canon prose approved for production use, 2026-09-15 (Joel) — all 33 entries ([n8n/numerology-canon/README.md](n8n/numerology-canon/README.md)).
- [x] Generated reading approved, 2026-09-15 (Joel): read a finished Stage 1 PDF and called it good.
- [x] Voice rights secured, 2026-09-15 (Joel): the Marcus voice (v2) may be used for customer audio; the earlier no-consent/test-only caveat is closed ([n8n/assets/marcus-voice/README.md](n8n/assets/marcus-voice/README.md)).
- [ ] Three locked-copy stumbles from the page cold read (bridge "your saved cards" reads as stored bank cards; "one optional way to receive the same reading" hides the $17; the failed-payment screen never says whether money was taken) — **in progress 2026-09-15** (writer + cold read), not done.
- [ ] Privacy, retention, refund and missed-deadline remedy wording before real orders. **Retention decided 2026-09-15 (Joel): permanent** (full birth name + date of birth kept indefinitely; privacy copy must say so plainly). Still open: refund policy (reading and audio), missed-deadline remedy, and whether a failed quality grade pauses for a human or sends anyway.

### Dev

- [ ] Apply, in order, on the shared Supabase project — never `npm run db:push` (dev and prod share one database; deploying the branch before this breaks every 02/03/06 receipt): `migrations/2026-09-03-be-07-daily.sql`, `migrations/2026-09-13-be-08-marcus.sql`, `migrations/2026-09-13-be-08-editions.sql`.
- [ ] Load the readings: `npx tsx scripts/publish-08-editions.ts --check` (expect 12 published, 6 retired), then `BE_08_ALLOW_PUBLISH=1 npx tsx scripts/publish-08-editions.ts --apply`. The publisher follows [launch-selection-2026-09-14.json](daily-email/edition-configs/launch-selection-2026-09-14.json); old versions are retired, not deleted.
- [ ] Set `BE_FULFILMENT_TOKEN` (long random string) on the server and in n8n's credentials.
- [ ] AWeber, per [AWEBER-DELIVERY.md](post-purchase-emails/AWEBER-DELIVERY.md): new list "Marcus Stone — buyers" (id → `AWEBER_MARCUS_BUYERS_LIST_ID`), nine `m8_*` custom fields, four campaigns on tags `be-08`, `be-08-audio`, `be-08-delivered`, `be-08-audio-delivered`, internal test send, then the launch gate (one test buyer, two purchases ten minutes apart, both confirmations arrive). Hand the list id to Claude for T10.
- [ ] Deploy `08-marcus` only after the three migrations are applied; keep `readyForMoney` false until the test-mode matrix passes.
- [ ] Resend: create API key `RESEND_API_KEY`, verify sending domain theseerwithin.com, hand the from-address to Claude.

### Claude

- [x] T5 fulfilment API (`/api/be/:offer/fulfilment|grade-log|delivered|send-attempt`).
- [x] T6 booking page with birth fields, cold-read twice (three readers each).
- [x] T7 bridge (7 s, paid-only, fail-closed) + receipt.
- [x] T9 lens + one-time draw on payment, `due_at`, editions table + publisher.
- [x] Card art for the twelve on S3 `marcus/08/` (41 files).
- [x] Local simulator + docs aligned to the booking-page rule.
- [ ] T8 audio upsell: real $17 one-click charge via `/upsell/charge`; `/marcus/reading/welcome1` is a pass-through stub today.
- [ ] T10 send helper (`server/lib/beMail.ts`): write `m8_*` fields → remove trigger tag → add trigger tag, per subscriber. **AWeber primary → Resend fallback, both recorded in `be_send_attempts`** (decided 2026-09-15). Needs the dev's list id and `RESEND_API_KEY`.
- [ ] T11 wire the real n8n workflow `UJamB32MGlNKdoEW` through `build-workflow.py`: Stripe trigger + `GET /api/be/marcus-reading/fulfilment/:sessionId`, add `the_cross` (5) and `cross_and_triangle` (7) spreads, PDF to `analysis_pdf/08/<order>/`, sign 60 days, `POST /delivered`; keep inactive.
- [ ] Supabase disposable-branch rehearsal of the three migrations + publisher + concurrency test (MCP was down 2026-09-13/14; proven on local Postgres 17 only).
- [ ] Written end-to-end test runbook for Joel: Stripe test card → booking → bridge → receipt → n8n → PDF in inbox (after the dev steps and T11).
- [ ] Bind each AWeber CTA to its edition URL and replace `{{BOOKING_URL}}` once the readings are published.
- [ ] Test-mode matrix: late audio purchase, provider failure, missed deadline, retries, duplicate webhooks, customer-safe recovery.
- [ ] Two stale rows in `docs/test-ideas.md` still describe the old "ambiguous" DOB rule.
- [ ] Privacy copy: state permanent retention of birth name + DOB (needs cold read).

### Done and not reopened

- Every decision D1–D7 (see [PARALLEL-PLAN.md](PARALLEL-PLAN.md) §1); audio price $17; PDF link 60 days; master 33 → 6; DOB entered month-first (MM/DD/YYYY); two n8n workflows kept (`Lksy14rvjB5Z7aYg` test lane, `UJamB32MGlNKdoEW` production draft).
- Voice v2 selected, stored, synthesised once with Chatterbox Turbo at 0.90× pitch-preserving tempo.

## Folder map

| Folder | Authority |
| --- | --- |
| [daily-email](daily-email/) | Email craft, spreads, questions, state, source letters, HTML, and reviews |
| [booking-page](booking-page/) | $35 offer, buyer inputs, inline speed bump, and prototype |
| [bridge-page](bridge-page/) | Paid-order reassurance between checkout and audio offer |
| [paid-reading](paid-reading/) | Written report product scope |
| [upsell-1-audio](upsell-1-audio/) | Audio product, approved copy shape, and variants |
| [thank-you](thank-you/) | Receipt, access, and delivery-state requirements |
| [data](data/) | Edition, buyer draw, personal lens, and order contracts |
| [n8n](n8n/) | Manual workflow, production architecture, evidence, canon, delivery, and audio plans |
| [local-testing](local-testing/) | Initial isolation audit |
| [reference](reference/) | Tarot source material |
| [archive](archive/) | Retired material kept only for history |

`00-ASTRA-BRIEF.md` was obsolete and was deleted at Joel's request. The current daily writing authority is [daily-email/SHAPE.md](daily-email/SHAPE.md).

# 08 Marcus — parallel build plan

Date: 2026-09-13 · Ledger: [FUNNEL-STATUS-AUDIT.md](FUNNEL-STATUS-AUDIT.md) · Branch: `02-fulfillment`

The n8n writing nodes are done (Stage 1, executions 30691–30700). What is left is everything
between a paid click and an inbox. This plan splits that into tracks that do not touch the same
files, so they can run as parallel subagents, and names the decisions that gate each wave.

---

## 0 · What the repo already gives us (verified 2026-09-13)

| Piece | Status | Where |
|---|---|---|
| Offer catalog with server-side price + `readyForMoney` gate | reuse unchanged | `shared/backendOffers.ts` (02 entry lines 203-226; 07 `marcus-daily` 302-341, still `readyForMoney: false`) |
| Checkout Session endpoint (`POST /api/backend/checkout`) | reuse unchanged; a new offer is a catalog row | `server/routes/backendOffers.ts:490-700` |
| Stripe webhook, signature check, `be_*` branch, `recordBackendOrder` | reuse unchanged | `server/routes/webhooks.ts:828`, `1032-1084` |
| Order tables + idempotent upserts (`be_orders`, `be_order_intake`, `be_upsell_orders`) | reuse; add columns | `shared/schema.ts:1573-1858`, `server/lib/beOrders.ts` |
| Server-verified thank-you lookup (`GET /api/backend/order/:sessionId`) | reuse (03/06 pattern, NOT 02's V1 call) | `server/routes/backendOffers.ts:717-749` |
| 1-click upsell off saved card (`/upsell/charge`, `setup_future_usage: off_session`) | reuse | `server/routes/backendOffers.ts:205` |
| Migration convention | additive `IF NOT EXISTS` SQL in `migrations/`; ⛔ never `db:push` | `migrations/2026-09-03-be-07-daily.sql` |
| Edition exporter + draw + lens code | production-grade, keep | `scripts/export-08-editions.py`, `local/08-marcus/draw.ts`, `contracts.ts` |
| Local store / server / fulfilment bodies / `index.html` | throwaway | `local/08-marcus/` |
| Transactional email for BE orders | **does not exist**; AWeber tag write is the send; Resend is a dependency with zero order-email callers | `server/lib/beOrders.ts:26-37`, `braceletOrders.ts:198-270` (only Resend order-email precedent) |
| PDF hosting | n8n → PDFShift → Supabase Storage `analysis_pdf` → 1-year signed URL | 02 workflow nodes 11-14a |
| n8n → app call-backs (`/api/be/<offer>/...`) | **spec'd for 07, never built for any offer** | `docs/07-marcus/07-server-spec.md:376-690` |
| Send-attempt / provider-message-id records | none anywhere | — |

---

## 1 · Decisions that gate work (Joel)

| # | Decision | Why it blocks | Recommendation |
|---|---|---|---|
| D1 | **Birth date.** Collect full birth name + date of birth on booking (audit §4) — OR — keep first + last name only and drop the Life Path anchor. | All ten letters say *"first and last name. That's the only thing I need."* The local app, paid-reading SCOPE and booking SCOPE agree. Stage 1 n8n throws without a DOB and makes Life Path the customer-visible centrepiece. One side has to move. | **Collect the birth date.** Life Path is the strongest recognition device in the report (30694 scored 10/10 on it). Cost: one sentence in each close + one field. Migration column is nullable either way, so T3 can start now. |
| D2 | Audio charge flow: 1-click off the saved card vs second Checkout Session | Decides the upsell route and its tests | **1-click.** The checkout already sets `setup_future_usage`; `/upsell/charge` exists. |
| D3 | Audio price and format (full narration / edited / file / player) | Upsell copy, email copy, entitlement | Price is yours. Format: private listening page + downloadable file, narrated from the accepted report. |
| D4 | Transactional email provider for the four 08 messages | Send helper, dedupe table, sender identity | **Resend**, one send per order with a stored provider id. Reason: a repeat buyer already tagged in AWeber gets no new campaign send. |
| D5 | Where the delivery email is authoritative: booking form, Stripe, or both | Intake columns, confirmation copy | Collect on booking, pass to Stripe as `customer_email`, **Stripe's value is authoritative**. |
| D6 | PDF access: 1-year signed link (02 precedent) vs protected reading page | Delivery email copy, resend path | Signed link for launch, resend re-signs. |
| D7 | Master number 33 and name rules (married, accents, non-Latin) | Booking validation, canon | Fail closed on 33 and non-ASCII with a customer-safe message for launch. |

**D1 decided 2026-09-13 by Joel: collect the birth date.** Each letter close gains one sentence.

**D5 decided 2026-09-13 by Joel: no order form on the booking page — Stripe's hosted Checkout collects everything.** Name and email are Stripe's own fields; full birth name and date of birth are Checkout `custom_fields` (SDK v20 supports three). Stripe's values are authoritative; the intake saved before checkout carries only edition id/version and the bump flag; the personal fields are read from `session.custom_fields` in the webhook. Date of birth has no format validation inside Stripe → validate server-side after payment, route a bad value to support, never block the paid order.

**Design rulings 2026-09-13 (see `design-reviews/README.md`):** bridge auto-redirects to Upsell 1 in 5–10 s with a "continue now" link; Upsell 1 keeps the audio-player treatment (never naming her card); the identity token sheet from review 04 is applied to all pages first.

**Designs locked 2026-09-13 by Joel** ("your designs are better than previous. lets lock them in and replace the current"). Wave 1.5 = rebuild the local reference app to the locked designs before the production routes are written: step 1 one agent splits the SPA into per-page files, applies the 04 token sheet, replaces the booking form with a Stripe stand-in page; step 2 four page agents in parallel (booking per 01+05, bridge per 02 + auto-redirect, upsell per 03 + card-name fix, thank-you per 02 §4); step 3 tests, screenshots, cold-read of new micro-copy.

**Wave 1.5 status, 2026-09-13:** steps 1 and 2 ✅. Local app now `local/08-marcus/client/` (shell + `styles.css` token sheet + `shared.js` + one `.js`/`.css` per page) with `assets/` as files; booking has no form (cards → price → bump → one button); `/checkout-sim` stands in for Stripe Checkout (email, name on card, full birth name, DOB as three boxes); bridge auto-forwards to Upsell 1 after 7 s with a `continue now` link and fails closed on an unpaid order; upsell shows the running-order sleeve built from the edition (never names her card), two-row ledger, full-size decline; thank-you = status rows first, total last at body weight. All suites green (server 4, draw 6, fulfilment 3, store 1, exporter 8) and `browser.test.cjs` passes end to end at 1100/390/320 (off-origin requests aborted; allow-list now includes the S3 asset host). `GET /api/orders/:id` now returns `audioPriceCents` (provisional). Step 3 ✅ cold read of the five rendered pages done — `design-reviews/COLD-READ-PAGES-01.md`: nothing she could not follow by the end (price, second charge, arrival, destination all said back); 16 stumbles on the way, of which 2 fixed on the page (duplicate birth-name ask; stray Fig. IV on phone), 7 are copy (bridge SCOPE lines *saved cards* / *optional way to receive*; COPY.md *quick warning* / *that is why … audio* / *personal-card lens*; new sleeve and table captions), 5 are product decisions for Joel (use the birth name, not the card holder, for her first name; a closing line + support address on the receipt; the *Daily Tarot Reader* masthead role; *Total USD*; what the Yes button charges, after D2). Open: no approved support address exists anywhere in the 08 docs (thank-you has nowhere to point "correct my email"); booking's price sits at ~2,190px on a phone (bridge paragraph + table photo are the remaining height); the booking page states the birth-name/DOB ask twice (page prefix + the edition's own name copy).

**Decided 2026-09-13 by Joel:** (AWeber setup and the send helper are **for dev**; Joel reviews the four emails first)
- **D2 — one click.** Audio is charged off the saved card via `/upsell/charge`; no second checkout.
- **D4 — AWeber, on a NEW list for 08 buyers.** The four post-purchase emails are AWeber campaigns triggered by tags on that list, personalised through subscriber custom fields (the 02 pattern: `reading_url` etc.). ⚠ Known limit carried forward: a repeat buyer already on the list may not get a second campaign send — the send helper must re-tag or use a per-order custom field change that AWeber treats as a trigger, and this must be tested before launch.
- **D6 — signed PDF link lasts 60 days** (not one year). Resend re-signs.
- **D7 — no numerology rules to resolve master 33: reduce 33 → 6.** Non-ASCII names still fail closed to support.
- **D3 — delivery shape decided 2026-09-13 (Joel): the audio is a downloadable file**, not a listening page; delivered when ready in its own email (the four emails stay). Copy, HTML and TXT of the two audio emails reworded ("a recording you download and keep"; link "Download your recording"); cold read 05 on the changed lines ✅ passed (`post-purchase-emails/COLD-READ-05.md`); one sentence added to the delivery email so she knows the tap saves to her phone and plays like a song or voice message. **Price decided 2026-09-13 (Joel): $17.** `AUDIO_TEST_CENTS = 1700` becomes the real audio product price in the catalog (T8). Consequence for the local app: the upsell sleeve and the thank-you audio row say "listening page" — reword to "recording" (dev, with the T8 route).
- **Subject lines — keep as written** (`Your reading is confirmed — {{QUESTION}}`). Joel 2026-09-13.
- **Multi-offer requirement (Joel 2026-09-13):** Marcus runs many readings — blind spots today, soulmate in two days. Everything built must be per-edition, not per-topic: the booking URL carries the edition id, the four emails render from per-order fields, and buyers sit on **one AWeber list** with offer + edition + topic tags. Design in `post-purchase-emails/AWEBER-DELIVERY.md`; the repeat-buyer re-trigger test is a launch gate.

Wave 1 launched 2026-09-13 (T1–T4). **Status, same day:**

| Track | Result |
|---|---|
| T1 Docs reconcile | ✅ done, verified (stale phrases gone; blocker list clean; D1 rule in the skill at brief, voice-pass and review) |
| T2 Blind-spots edition | ✅ done, verified (`blind-spots-v1`, 10 positions 3/7; exporter `--check` clean; 8 + 4 tests; paid labels capitalised to match siblings; three card jpgs added to `assets/email/cards/` and the local server map so booking renders) |
| T3 Offer catalog + schema | ✅ done, verified (46 offer tests; 0 new tsc errors; `readyForMoney: false`; migration + down file drafted, **not applied**). Open: `be_08_draws` keyed on `be_orders.id` while `be_send_attempts` keys on `stripe_session_id` — T5/T9 pick one |
| T4 Post-purchase emails | ✅ done — draft 4 **passed** `cold-read`; **AWeber-ready HTML + TXT built** for all four (`post-purchase-emails/*.html|.txt`, word-identical to the copy; Liquid merges `{{ subscriber.custom_field['m8_*'] }}`; the audio line in the written delivery is a `{% if 'be-08-audio' in subscriber.tags %}` conditional, confirmed to work in campaign messages per AWeber staff); list/tag/field design in `AWEBER-DELIVERY.md`; support address `hi@theseerwithin.com` (Joel 2026-09-13) in all eight files (`post-purchase-emails/COLD-READ-04.md`) after four rounds, 12 readers: draft 1 = 2 broken + 15 ambiguous; draft 4 = 0 broken, 0 ambiguous, 3 residual look-backs documented. Confirmation cap raised 220 → 265. Open for Joel: the receipt subject format (12/12 readers first read the question as a question) |

Builder note from the freeze: `{{N_PAID}}` can open a sentence ("Seven cards, inside…") — the builder must capitalise a sentence-initial number word.

Branch note: the tree moved to `08-marcus` (audit committed as a944d08) during wave 1; all wave-1 edits are uncommitted on that branch.

---

## 2 · Wave 1 — starts now, no decision needed, no shared files

| Track | Owner | Files it may touch | Done when |
|---|---|---|---|
| **T1 Docs reconcile** (audit §1, §15, and the n8n README review of 2026-09-13) | 1 subagent, docs only | `.claude/skills/marcus-daily/SKILL.md`, `paid-reading/SCOPE.md`, `booking-page/SCOPE.md`, `local/08-marcus/README.md:77`, `n8n/README.md`, `daily-email/README.md` | Stale claims gone (booking unbuilt, price/SLA undecided, cloud unexecuted); confirmed $35 / $12.77 / 24h / 12h stated once; n8n README lists all eight test inputs, links the compare-grade doc, moves the ticked evidence lines out of the blocker list, and records the spread-list gap (`the_cross`, `cross_and_triangle` missing; `adaptive_eight` not in the library) and the D1 fork. |
| **T2 Blind-spots edition** (audit §3) | 1 subagent | `scripts/build-08-daily.py` (`LOCAL_FUNNEL_EDITIONS` only), `local/08-marcus/editions.json`, exporter tests | `what-are-my-blind-spots` entry with 7 paid labels + booking copy; `export-08-editions.py --check` clean; 8 exporter tests + 4 server tests pass; local booking renders the 10-card edition. |
| **T3 Offer catalog + schema** (audit §5, §6 first half) | 1 subagent, code | `shared/backendOffers.ts`, `server/lib/backendCustomerList.ts`, `server/lib/backendPurchaseAnalytics.ts`, `shared/schema.ts`, new `migrations/2026-09-13-be-08-marcus.sql` (+ `_down.sql`), `server/lib/backendOffers.test.ts` | New key `marcus-reading`, `number: '08'`, `stripeProduct: 'be_marcus_reading'`, fixed 3500, bump `marcus_speed` 1277, `readyForMoney: false`; `be-08-*` tags; additive columns on `be_order_intake` / `be_orders`: `edition_id`, `edition_version`, `display_first_name`, `full_birth_name`, `date_of_birth` (nullable, D1), `speed_bump`, `due_at`, `lens_card`, `lens_method_version`, `draw_json`, `draw_method_version`; new `be_08_draws` with UNIQUE(order) mirroring `be_07_draws`; new `be_send_attempts` (offer, order, message_type, provider, provider_message_id, status, attempted_at) UNIQUE(order, message_type); tests pass; **nothing applied to the database**. |
| **T4 Post-purchase email copy** (audit §10 A–D) | 1 writer subagent, then 3 cold readers | new `post-purchase-emails/ORDER-CONFIRMATION.md`, `AUDIO-ORDER-CONFIRMATION.md`, `WRITTEN-DELIVERY.md`, `AUDIO-DELIVERY.md` | Four letters in Marcus's voice following the 02-T3 / 02-T4 beat shape (subject = searchable receipt, sells nothing, delivery never paraphrases the reading, confirmation opens a loop the delivery closes); audio price as `{{AUDIO_PRICE}}` until D3; each passes `cold-read` (say-back, three readers). |
| **T5 n8n call-back API spec + stub** (audit §11 Stage 2, first step) | 1 subagent, code | new `server/routes/beFulfilment.ts`, `server/routes.ts` mount, `.env.example` (`BE_FULFILMENT_TOKEN`) | Offer-generic `/api/be/:offer/fulfilment/:sessionId` (GET, returns edition snapshot + intake + saved draw + lens, never raw DOB in logs), `/grade-log`, `/delivered`, `/send-attempt`; Bearer check; 404 on wrong offer; reads through `beOrders.ts`; unit tests with a fake store. Depends on T3's columns — start after T3 lands its schema, or build against an interface and wire later. |

T1–T4 have zero file overlap. T5 waits for T3 (same schema), so it is the first job of wave 2 unless T3 finishes early.

---

## 3 · Wave 2 — after D1–D6 and wave 1

| Track | Depends on | Scope |
|---|---|---|
| **T6 Booking route** (audit §4) | T2, T3, design review 01/04/05 | `client/src/pages/marcus/MarcusBooking.tsx` at `/marcus/reading/:editionId`; loads edition from the exported record (production edition table comes with T9); **no form** — cards, price, bump, one button; `saveOrderIntake` (edition + bump only) then `POST /api/backend/checkout` with three `custom_fields` (display first name, full birth name, date of birth); cancel returns to the same page; webhook copies custom fields into `be_order_intake`; server-side DOB validation with a support fallback; `VITE_BACKEND_CHECKOUT_LIVE` preview gate. |
| **T7 Bridge + thank-you routes** (audit §7, §9) | T3 | `/marcus/reading/bridge` and `/marcus/reading/success`; both read `/api/backend/order/:sessionId`; **bridge auto-redirects to Upsell 1 after 5–10 s** (redirect only once the order reads as paid — the wait doubles as webhook-lag cover) with a visible "continue now" link; no order data in URLs; refresh-safe. Thank-you: status rows first, total last and quiet (design review 02 §4). |
| **T8 Audio upsell route + charge** (audit §8) | D2, D3, T3 | `/marcus/reading/welcome1` using the session-driven `OffersUpsell1` pattern; `BACKEND_UPSELLS` entry; separate entitlement on the parent order; decline is a no-op. |
| **T9 Supabase editions + draw on payment** (audit §3 second half, §6 second half) | T3 | Production edition table + publisher script from `editions.json`; webhook extension: on `be_marcus_reading` paid → compute lens, draw once into `be_08_draws` (UNIQUE), stamp `due_at = paid_at + (bump ? 12 : 24)h`; apply migration to a disposable Supabase branch and run concurrency tests. |
| **T10 Send helper** (audit §10 E) — **FOR DEV** | D4 ✅ AWeber, D6 ✅, T3, T4 ✅, Joel's email review | AWeber setup checklist in `post-purchase-emails/AWEBER-DELIVERY.md` (list, nine fields, four campaigns, test send, repeat-buyer launch gate); server side `server/lib/beMail.ts` = write fields → remove trigger tag → add trigger tag, per event, serialised per subscriber, recorded in `be_send_attempts`; confirmation fired from the webhook; delivery fired from `/api/be/08/delivered`. |
| **T11 n8n Stage 2 wiring** (audit §11) | T5, T9, T10 | Target = the **real** workflow `UJamB32MGlNKdoEW` (47-node draft, built by `build-workflow.py`; its generation core must be brought in from the tested Stage 1 lane in `build-numerology-workflow.py` — one builder, not a hand edit). Replace the manual input node with a Stripe webhook trigger + `GET /api/be/08/fulfilment/:sessionId`; add `the_cross` (5, free 2) and `cross_and_triangle` (7, free 2); drop or re-cut `adaptive_eight` to the ⅓ rule; store PDF to `analysis_pdf/08/<order>/`; sign; `POST /delivered`; keep inactive. |

## 4 · Wave 3 — gated on assets

| Track | Blocked on |
|---|---|
| **T12 Audio branch** (audit §13) | ✅ voice sample approved by Joel 2026-09-13 (Chatterbox **Turbo**, voice v2 10-s reference; `n8n/AUDIO-TEST-EVIDENCE.md`); Replicate credential in n8n; config `n8n/config/marcus-audio-v1.json`. ⚠ Rights: the voice is a real YouTube speaker without consent — test-only until a released or licensed voice replaces it (see `n8n/assets/marcus-voice/README.md`). Two Marcus workflows on n8n cloud, **both kept** (Joel 2026-09-13): `Lksy14rvjB5Z7aYg` = the Stage 1 **test** lane (manual inputs, writing + grading + PDF); `UJamB32MGlNKdoEW` = the 47-node draft is **the real production workflow**. Both inactive. T11 wires the real one; the test lane stays for report iteration. Audio price $17 ✅. |
| **T13 AWeber ESL send test** (audit §2) | T6 live booking URL bound to the edition id |
| **T14 Full test-mode matrix + launch evidence** (audit §14, §16) | everything above |

---

## 5 · Rules for every track

- ⛔ No commits unless asked. Each track ends with a one-paragraph claimed-vs-verified audit.
- ⛔ `readyForMoney` stays `false`. The n8n workflow stays inactive. No `db:push`. No migration applied to the shared database.
- ⛔ n8n edits go through `build-numerology-workflow.py`, never the JSON.
- Copy tracks (T4, later booking/bridge/thank-you page copy) are gated by `cold-read`, not by a linter.
- Subagents get the audit section they own plus this plan's row, not the whole folder.

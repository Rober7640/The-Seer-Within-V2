# 04-DELIVERABLES — The Turn *(tea reading)*

What was built for 04, every decision with its reason, and every departure from the copy specs in
`copy/04/`. The tick sheet is [`0-WORKFLOW-04.md`](./0-WORKFLOW-04.md); this is the record.

⚠ **How these decisions were taken.** On 2026-10-11 the operator said *"proceed to build everything
listed in the workflow"* without answering D1 individually. Every decision below was therefore taken
on Claude's recommendation and is marked **(rec.)**. Each one keeps its reason so it can be
overturned without re-deriving it.

---

## Decisions

| # | Decision | Answer | Why |
|---|---|---|---|
| D1 | URL | **(rec.)** `/offers/wiccan/tea-reading` · chat `/offers/wiccan/tea-reading/chat` · receipt `/offers/wiccan/tea-reading/success` | The master's `/wiccan/tea-reading` is stale: 03 actually lives at `/offers/wiccan/judgement-day` and 06 at `/offers/wiccan/pixiu-bracelet` (`client/src/App.tsx`). 04 slots in beside them |
| D3 | Booking-page promises that need code | **(rec.)** Build the rising price (`S9`). Keep 24h. Cut every line that promises *sooner* than 24h ("by morning", "look out for it tomorrow") | The rising price is the offer; a hard-coded number breaks for a day-3 buyer. "By morning" is false for a woman who buys at 8am |
| D4 | Money | ~~Day ladder $35→$47→$57→$67~~ **superseded 2026-10-11:** fixed price, split test A $35 / B $45 (see *The price*) | Operator: "lets remove price hike. simple split test 35 vs 45" |
| D11 | One page or one job per screen | **(rec.)** **One page, the 09 v2 shape**: one short tick, price and button on the first phone screen. The six statements are cut to one | Operator lock (2026-10): commitment pages are one tick + visible button + price on screen 1. `04-C1`'s six statements + the cup pick would be ~3 phone screens |
| D5 | Product length | **(rec.)** Rewrite into **three complete readings, one per cup**, each ≥3,000 words before the rim calendar | Today one buyer gets ~2,100–2,300 words plus the calendar. A buyer of the other two cups also reads two different plans |
| D6 | Artwork | **(rec.)** No tarot cards — 04 is leaves. One cup hero + one illustration per symbol (7), made with `codex exec` (free) | The RWS deck has nothing to say about tea. The letter's image rules carry over: the hero never shows a *read* cup |
| D7 | One PDF per buyer, or one for everyone | **(rec.)** **One PDF per cup — three files.** No per-buyer merge; her name lives in the delivery email | Per-buyer PDFs need a PDF renderer on the production server, which nobody has proved there. Three static files make `reading_url` a lookup on her cup |
| D8 | Attached or linked | **(rec.)** Linked, hosted on S3 at an unguessable path | AWeber cannot attach a per-buyer file; a link can be fixed after sending |
| D9 | Free gift | **(rec.)** The rim calendar is the closing section of the same PDF, one per cup | Master default; the calendar must match her cup's sequence |
| D10 | Next offer | **(rec.)** Nothing wired. When 05 exists, send it ≥7 days after delivery, as its own send | 05 has no copy. The delivery email sells nothing |

---

### ⭐ Operator changes, 2026-10-11 (after the first build) — these overturn D6 above

| Change | Why (operator) | What it did |
|---|---|---|
| **Every buyer gets the SAME cup: the photo from the source letter**, seven numbered red marks and all (`docs/04/product/images/esl/`, extracted from `Wiccan Watch - Tea Reading - ESL.docx`) | The generated leaf pictures were "unrealistic" | The PDF cover, a new map photo under "Where your seven landed", and a square crop of each numbered mark at its stretch. The booking page shows the same photo (3:2, tight on the cup). The generated images are no longer used anywhere |
| **The three cup types are three INTERPRETATIONS of that one cup**, not three different cups | "3 different interpretations instead" | The readings were rewritten so every position claim matches the photo ([`product/esl-cup-map.md`](./product/esl-cup-map.md) is the ground truth); the 21-day plans, the one-message days and the calendars were kept. Backups of the different-cups version: `copy/04/product/_superseded-2026-10-11-different-cups/` |

| **No pick — a random draw.** The booking page and chat no longer ask; the server draws one of the three interpretations at checkout (`server/lib/be04Draw.ts`, `crypto.randomInt`) into Stripe `metadata.cup` (+ `cupDrawn: '1'`). The receipt no longer names it. The readings no longer say "you picked": the cup reads from the mark that catches the light first when Evelyn tips it | "random draw" (asked: one PDF or three) | Three PDFs stay, one per interpretation; she gets one, drawn. Backups of the picked wording: `copy/04/product/_superseded-2026-10-11-picked/` |
| **Upsell 2's "pick a stone" is closed.** The built upsell never asks it; it was only in the August draft | "confuse why theres a pick a stone" | Nothing to build |

## The price — a split test, $35 vs $45 *(replaced the day ladder, operator 2026-10-11)*

⛔ **The day ladder (`S9`) is gone** — no price rise, no `BE04_LADDER_START`, no rungs, no
`quotedDay` grace. The operator dropped it ("lets remove price hike. simple split test 35 vs 45").

**The test:** experiment `be_04_price_2026` in the existing framework (`server/lib/experiments.ts`),
subject = the backend visitor id, arms **A $35 (control) · B $45**, 50/50, `freezeAssignment`.
**Ships as a draft:** until someone presses Start in `/admin/experiments`, everyone pays $35.
Create the draft row once with `improve-v1/create-be-04-price-experiment-2026-10-11.sql` (not run).

**The server decides the price, never the browser.** `resolveBe04Price(subject)` is asked twice —
by the price endpoint (what the page prints) and by checkout (what Stripe charges) — and the same
subject gets the same arm. Only $35 or $45 can ever be charged; any error, typo'd payload or
non-running status falls back to $35. The page sends back the arm it showed (`quotedArm`); a
mismatch returns `409 price_changed` with the server's price, so nobody pays a number she wasn't
shown. Stripe metadata: `priceExp: 'be_04_price_2026'` + `priceArm`, copied onto both upsells.
**Results** (`/admin/experiments` → `be_04_price_2026`): revenue per visitor per arm, counting the
booking (bump included) and both upsells. Private-browsing visitor ids are now stable for the
page's life (`client/src/lib/backendVisitor.ts`), so the arm can't flip between page and checkout.

### Server

| Piece | Where |
|---|---|
| Price, bump, cups | `shared/backendOffers.ts` — `TEA_READING_PRICE_CENTS` ($35), `TEA_READING_TEST_CENTS` [3500, 4500], `TEA_CUPS`, `resolveTeaCup()`; `server/lib/experiments.ts` — `resolveBe04Price()`; catalog row `'tea-reading'` (`be_tea_reading`, bump `double_turning` $12.77, `readyForMoney: false`) |
| The price for the page | `GET /api/backend/offers/tea-reading/price?subject=<visitorId>` → `{ offer, arm, cents, label }`, `no-store`. `?arm=A\|B` previews an arm (display only, `preview: true`, enrols nobody) while the offer is not open for money |
| Checkout | `POST /api/backend/checkout` takes `quotedArm` (a `cup` from the browser is accepted and ignored). Stripe metadata gets `priceExp` / `priceArm` (what the server charged), `cup` (the server's random draw) and `cupDrawn: '1'` |
| Receipt | `GET /api/backend/order/:sessionId` — 04 is always `deliveryHours: 24` (the Double Turning is not a speed bump); does NOT return the cup (anyone holding the session id could read the draw). `bumpPurchased` was already there |
| AWeber tags | `be-04-tea-reading`, `be-04-bump`, `be-04-delivered`, upsells `be-04-upsell1-protection` / `be-04-upsell2-bracelet`; lists 6972552 / 6972554 (shared with 02/03) |
| Delivery | `server/lib/be04Delivery.ts`, every 10 min from the cron set, **off** unless `BE04_DELIVERY_ENABLED=true`. Paid, undelivered 04 orders older than `BE04_DELIVERY_DELAY_HOURS` (default 12, 1–23) get their cup's link (`BE04_READING_URL_TURNED_HANDLE` / `_DIVIDED_RIM` / `_SUNKEN_LEAF`, https only) via `markBackendReadingDelivered`, then `reading_url` + `delivered_at` are stamped. Cup read from the Stripe session (no migration). No link, or Stripe unreadable → skipped and retried, never a guessed link. Still undelivered at 23h → error log every tick |

⚠ **Before go-live:** run the price-experiment SQL once (draft) and press Start when wanted; host the three PDFs
and set their links; build the AWeber Campaigns on the be-04 tags (`reading_url` merged); make
sure the DB has every be_orders column the schema names (a missing 07/08 column makes the
order insert fail, and an order with no row is never auto-delivered).

## What was built

### Phase A — the funnel *(2026-10-11)*

| Step | What | Where | Proof |
|---|---|---|---|
| A1 | Worksheet + D1 | [`0-WORKFLOW-04.md`](./0-WORKFLOW-04.md) Step 0; decisions above | — |
| A2 | Booking **page** (one tick) + booking **chat** | `client/src/pages/offers/tea-reading/{BookingPage,BookingChat}.tsx`, `client/src/lib/{teaReadingPrice,teaReadingBooking}.ts`; copy `copy/04/04-C1-booking-page-v2.md`, `04-C2-booking-chat.md` | walk 195/195; phone button at 735–795px of 844, unticked |
| A3 | Bump — **the Double Turning**, $12.77, `double_turning`, never pre-checked. **Intangible: nothing is delivered** (operator 2026-10-11 — replaced the Still Cup, a delivered evening practice) | in both treatments; the receipt confirms it in one P.S. ("nothing extra to look out for"). No page, no email | walk |
| A4/A5 | Upsells on the shared chain | `client/src/lib/upsellCopy/teaReading.ts` (registered in `BACKEND_UPSELL_PITCH`); copy as she sees it in `copy/04/04-U-upsell-copy-v2.md` | 18 tests; walk 36/36 (`scripts/walk-04-upsells.mjs`) |
| A6 | Receipt | `ThankYouPage.tsx` + `client/src/lib/teaReadingReceipt.ts` (09's `?offer=` guard, 08's 2s/40s poll); copy `copy/04/04-T1-thank-you-page.md` | walk |
| A7 | Routes, funnel, checkout fields | `App.tsx` (4 lazy routes), `funnel.ts` (`TEA_READING_PREFIX`, `'teareading'`), `backendCheckout.ts` (`quotedDay`, `cup`, `price_changed`) | 67 client tests; tsc 46 (baseline) |
| A8 | Walk + screenshots | `scripts/walk-04-smoke.mjs` → `improve-v1/evidence/04-tea-reading-2026-10-11/` (48 shots + `upsells/`) | the 409 path proved on a second Vite with `VITE_BACKEND_CHECKOUT_LIVE=true`, every `/api` call answered by the script |

Server side: see *The price* and *Server* above.

### Phase B — the product *(2026-10-11)*

| Piece | Where | State |
|---|---|---|
| Structure map (B2) | [`04-B2-product-map.md`](./04-B2-product-map.md) — per cup: sections, which letter loop each closes, the 21 days | ✅ |
| Three readings (B3) | `copy/04/product/04-P1-{divided-rim,turned-handle,sunken-leaf}.md` — three interpretations of the SAME cup, 4,452–4,697 words each before the calendar. The 21-day order comes from the mark that catches the light first when Evelyn tips the cup, not from where leaves sit | ✅ rewritten 2026-10-11 · ☐ operator read |
| Three rim calendars | `copy/04/product/04-P3-{cup}.md` — one page, day for day with its reading | ✅ |
| Images (B4) | `docs/04/product/images/esl/` — the source letter's real cup photo (`esl-cup-original.jpg`, from the .docx), a full and a tight 3:2 version, and a square crop of each numbered mark (`mark-1-bird` … `mark-7-butterfly`). Ground truth for every position claim: [`product/esl-cup-map.md`](./product/esl-cup-map.md). The generated images are in `images/_rejected-ai-2026-10-11/` (not used; don't commit `raw/`) | ✅ (redone 2026-10-11 after operator review) |
| PDFs + Word twins (B5) | `docs/04/product/pdf/04-the-turn-{cup}.pdf` (17–18 pages, 1.3 MB each: cover, a full-page "Your cup" plate before the table, a mark crop at every stretch) + `.docx` + `preview-{cup}.jpg`. Rebuild: `node improve-v1/v1-one-time-BEs/scripts/build-04-pdf.mjs` (gate: `scripts/check-04-pdf.py`, 7 checks × 3, all pass). The PDFs are committed with the branch (no Desktop copy, operator 2026-10-11) | ✅ built · ☐ phone/print/seed-send checks |
| Hosting (B6) | — | ☐ needs operator OK + `.env`: upload the three PDFs to S3 at unguessable keys, then set `BE04_READING_URL_*` |

**How the 21 days are ordered (new rule, added by the rewrite):** the leaves are read round the cup
from the handle, three days each, so each cup's sequence follows from where its leaves sat. The one
message: Divided Rim **day 17**, Turned Handle **day 14**, Sunken Leaf **day 20**, each between six
and eight in the evening (closes the letter's P.S. "the cup has the Tuesdays").

**"How much is recoverable"** (the letter's unclosed loop) now has its own section: Divided Rim
*most of it* · Turned Handle *nearly all of it* · Sunken Leaf *the two of you, all of it; you doing
all the starting, none of it*.

**The bird** now agrees with itself: head under the rim (a fortnight), tail ending halfway down
(two months), read from the tail — every cup says two months.

### Phase C — the emails *(2026-10-11)*

| Email | Spec | Subject | Trigger tag |
|---|---|---|---|
| Confirmation (C1) | `copy/04/04-T3-confirmation-email.md` | Your tea reading is confirmed — The Turn | `be-04-tea-reading` |
| Delivery (C2) | `copy/04/04-T4-delivery-email.md` | `%FIRSTNAME% — your cup is turned` | `be-04-delivered` |

Rendered `.html`/`.txt` beside each spec; send-ready copies in `~/Desktop/04-tea-reading-emails/`.
By hand in AWeber (C3): swap `{{AWEBER_READING_URL}}` for the `reading_url` field in T4 (HTML and
text); type the subject's name merge with a `"dear"` fallback; build the three Campaigns; seed-test
with and without a first name. ⛔ Not uploaded — AWeber was not touched.

## Departures from the copy specs

| Spec | Departure | Why |
|---|---|---|
| `04-P1` | Replaced by three standalone readings; the original stays as the source draft | One buyer got two contradictory plans and ~2,200 words |
| `04-P1` | No `%FIRSTNAME%` and no echo slots (`S28`) in the PDF | D7: one PDF per cup. Her name lives in the delivery email; echo slots wait for the post-POC n8n stage |
| `04-P1` | The rewrite invented two "as I said in my letter" lines (he's-not-coming-back); **removed by hand** after checking every back-reference against `04-E2` | The letter never said it. Rule added to the master's B7 gate |
| PDF | `[IMG-CUP]` prints as text only on page 2; the cup photo is on the cover | The same photo on facing pages read as a mistake |
| `04-T1-T3` | The old T3 draft is superseded by `04-T3-confirmation-email.md`; "Thursday", "I'll write in the morning" and "tonight" (about delivery) are gone | A weekday breaks for most buyers; delivery is "within 24 hours" |
| `04-T3` | "Your leaves were still soft when you booked" cut | Sent to every buyer, incl. day 3–4 buyers whose ladder emails said the leaves had dried |
| `04-C1` | Six statements → one tick (`04-C1-booking-page-v2.md`) | D11 / the operator's one-tick lock |
| `04-C1` | ~~The cup pick sits after the tick~~ — the pick was removed entirely (random draw, operator 2026-10-11) | It was 245px tall and confused the operator |
| `04-C3` | The bump is a label, one line and the price on the page; the "nine o'clock on a Tuesday" line moved to the chat's bump turn | Room on the first screen; a weekday on a page is a date |
| `04-C3` / `04-C4` | **Superseded.** The bump is the Double Turning (Evelyn reads the cup a second time for twice the strength): intangible, nothing delivered; the Still Cup page, its T5 email and the receipt link are deleted | Operator, 2026-10-11: "an intangible that doesn't need to be delivered"; the first wording ("seals at double strength") was rejected as unclear, so the copy says plainly what she gets |
| `04-T1` | "It's going on soft — you didn't leave it" cut; "I'll send it again the same day" → "I'll sort it out"; added her cup, the confirmation subject, and a variant for an already-delivered order | Soft is false after day 2; a same-day resend is a promise nobody is staffed for |
| `04-C4` page | Greeting shows her name when the tab knows it, else is cut; the rest is 04-C4 verbatim (test-checked) | No blank where a name should be |
| Prices | Shown as `$35` / `$47.77`, never `$35.00` | Matches copy-check's 04 forms |
| Desktop | The button sits at 885px on 1280×800 | The lock is for phones; 09 v2 has the same roomy desktop header |
| `04-U` | Every day number cut ("first nine days", "day five", "days sixteen to eighteen", "week two"…) | Her interpretation (now drawn at random) changes the days, and the upsells can't know which — the settled no-personal-details rule. ("Day five" is true for all three cups; restore it if wanted) |
| `04-U` | U2 no longer "draws him back": the bracelet works on what goes out from HER on the quiet days, charged to the bridge, lighthouse and butterfly — *"It won't walk him across that bridge. Nothing does."* | Rule 2: every reading refuses to promise his return |
| `04-U` | "It sat highest in your cup" cut — the upsell runs before the cup is turned; both openings use the letter's own words for the butterfly | The position isn't known yet at that moment |
| `04-U` | "By morning" / "tonight" about the reading → "within 24 hours"; U1 adds that protection starts the night of the ritual (the stone ships in 48h) | Timing truth |
| `04-U` | "His silence" → "whatever he sends, or doesn't"; "no reply going out" cut | Not true for every cup — all three tell her to answer briefly if he writes |
| `04-U` | 17 V1 blocks with "clearing" / "energy field" / "our conversation" / "we began talking" replaced; buttons "Yes, guard my quiet days" / "No thanks, just my reading" | Rule 3 |
| `04-U2b` | ⚠ The stone-choice question can't be asked: `useUpsell2Chat` takes every U2 question's text from V1, so the bracelet is charged to all three leaves at once. V1's "calling something in" questions and the US spelling "recognized" also remain | Changing the shared hook touches the live funnels (rule 5) — left for a deliberate decision |
| `copy-check.cjs` | 04 may quote `$30` (the shared bracelet downsell); lines tagged `` `V1` `` are skipped by device variance | Both are the shared upsell product quoted verbatim, not 04's writing |

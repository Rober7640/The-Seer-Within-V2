# 12 — Lucky Numbers: deliverables and decisions

Decisions with their reasons, so nobody re-opens them. Tick sheet: [0-WORKFLOW-12.md](0-WORKFLOW-12.md).
Shape model: [11](../11/11-DELIVERABLES.md), minus the cards. Nothing is committed or live.

## The offer *(operator, 2026-11-02)*

| Item | Decision | Why |
|---|---|---|
| Number | **12** | `'02'`–`'11'` are taken in `shared/backendOffers.ts` |
| Key / slug | `lucky-numbers` | Used in the catalog, the URL, `?offer=` and the tags |
| Type | Reading, no reply needed | She buys, waits, it arrives |
| Persona | **Evelyn.** She reads numbers openly here. **No tarot** | Operator answer 1 and 3. 11's "numerology is never mentioned" was 11's alone |
| Price | $35 fixed + $12.77 bump | Same as 11. The price code exists |
| URL (D1) | `/numerology/lucky-numbers`, receipt `/numerology/lucky-numbers/success` | Free on this branch. Nothing else lives under `/numerology` |
| The wait | 24 hours | Both letters: "I'll sit with yours one evening. Within 24 hours, your reading is in your inbox" |
| Money switch | ⛔ `readyForMoney: false`, and `BACKEND_CHECKOUT_LIVE` stays false | Nothing can charge. The button logs and stops |
| Letters | Split test. Arm A `?c=1…5`, arm B `?c=11…15`. Both land on the same page; `?c=` rides to Stripe metadata as `c`, as 11's does | [12-E2-esl-A](sales-emails/12-E2-esl-A.md), [-B](sales-emails/12-E2-esl-B.md) |

## The booking page

| Item | Decision | Why |
|---|---|---|
| Layout | 11's: first name from `?fn=` (no field), birth name + date of birth, the optional bump, the total, the button | Operator |
| Tick | **None.** The only box on the page is the bump | Operator removed it on 11 |
| First screen | Button and price on the first screen at 390×844, as 11's are | Operator |
| Headline | Title: *Give me one evening, and I'll hand you your lucky numbers*. Sub-line: the five deliverables | "Give me one evening" is both letters' opening line |
| The window | Named as "2027". No "one in every month", no "January", nothing dated before her order | 12-A: the year runs out. The letters say "one in every month" and "your first is in January"; the page doesn't repeat either |
| Win | **No lottery win promised, for either arm.** The page promises the items only. It doesn't say "no win" either: that would undercut arm A's "small miracles" | 12-B. The promise-not-to-chase line stays, below the fold |
| Birth details | Birth name and date go to OUR server and `be_order_intake`, never Stripe. First name from `?fn=`, also off Stripe (`piiOutOfStripe`) | 11's rule, from 08 |

## The bump

| Item | Decision |
|---|---|
| Name | **The Full Year** |
| What | Every lucky day she has in 2027, not just the best twelve, on one calendar page |
| Price | $12.77 → total $35.00 → $47.77 |
| Product code | `full_year`. ⛔ Its own code: n8n exact-matches it |
| Shown | From the start, above the total. ⛔ Never pre-ticked. One click toggles it |
| Delivered as | The last page of her PDF, like 11's. T3 and T4 go to every buyer, so neither mentions it. T1's P.S. tells bump buyers |
| Copy | [12-C3](booking-page/12-C3-order-bump.md) |

## Upsells

| | Decision |
|---|---|
| Engine | The shared one: `/offers/upsell/welcome1` → `/welcome2`, copy in `client/src/lib/upsellCopy/luckyNumbers.ts` |
| ⛔ Personal details | None except her first name ("dear" without it). Every line true for every buyer |
| The one sentence both sell | "Keep the luck your numbers bring." |
| **U1** | **Evelyn's Wish Ritual + charged citrine bracelet.** Price **$47, downsell $30 — both operator-confirmed (2026-11-02)**. Copy: [12-U1a](upsells/12-U1a-opening-beats.md), written by another agent and wired as written (one change: the middle reply to her question, see the note in 12-U1a). Sells "One wish, twelve days for it to land." |
| U1 product code | **`be_citrine_wish_ritual`**, its own row in `BACKEND_UPSELLS` (`server/lib/backendCustomerList.ts`): $47 full, $30 downsell, one code for both. The 12 catalog row names it as `upsell1Product`, so the U1 chat charges it by name and `/upsell/user-data` reports its prices. Path A in U2 is found by this code, not the Protection Ritual's |
| U1 tag | `be-12-upsell1-wish-ritual` (code only) |
| U1 list | ⚠ **Placeholder: reuses the Protection Ritual list `6972555`.** No list was made, and nothing was done in AWeber. That list's confirmation email may talk about protection or lava. Settle before money |
| U1 shipping | Physical. The citrine bracelet is **in stock**, ships manually from the address she types in the chat (12 is digital, so the chat always asks), in the lava stone's velvet pouch with **the exact same instruction card** (operator, 2026-11-02). No new card, no fulfilment change beyond the product code and tag. The one wish is Evelyn's spoken ask in the chat only |
| U1 picture | ⚠ **Slot only.** The copy sets `stoneImage: null`, so no picture shows after the stone's intro (never the lava stone). Put the citrine bracelet's picture in that slot when it exists |
| U1 downsell | New, opt-in engine step (A7): decline → `DOWNSELL` lines → a downsell button → accept charges $30 / decline plays `SOFT_DECLINE`. Price shown through a new `{downsellPrice}` token, never typed. Off for every other offer |
| ⚠ U1 January claim | `DELIVERY[4]`: "Your bracelet will be with you before your first open day in January." True only if the engine never puts January's day too early. The coordinator has asked the engine owner for a first open day at least 14 days after the order. The funnel code was not changed for this |
| **U2** | V1's Manifestation Bracelet, $47 / $30, **in full**: [12-U2a](upsells/12-U2a-opening-beats.md). **Path A** (has the citrine) names the second bracelet head-on: the citrine on her left holds her one wish; this one on her right gets her out of the door on her days. No lava lines. **Path B** never mentions the citrine |

## The receipt

| Item | Decision |
|---|---|
| Page | A receipt. Confirm, name the email subject, stop |
| Confirmation subject | `Your Lucky Numbers reading is confirmed` |
| Delivery subject | `%FIRSTNAME% — your lucky numbers are worked out` ("dear — …" without a name) |
| ⛔ Chat gift | **None.** 11's `unsentLetterTyGift` is 11's alone |
| Copy | [12-T1](booking-page/12-T1-thank-you-page.md), [12-T3](order-emails/12-T3-confirmation.md), [12-T4](order-emails/12-T4-delivery.md) |

## Customer list

Tags `be-12-lucky-numbers`, `be-12-bump`, `be-12-delivered` (and the upsell tags the shared code builds), **in code only**. They reuse 02's lists (initial 6972552, bump 6972554), told apart by tag, as 03, 04 and 11 do. ⛔ Nothing was done in AWeber: no Campaign exists for any be-12 tag.

## Build decisions (2026-11-02, made by Claude, operator may overrule)

| Item | Decision | Why |
|---|---|---|
| Booking treatment | Page only, no chat | Same as 11: two fields need a form |
| Birth-name field | "Your full name on your birth certificate", hint "Middle names too" | Both letters ask for the full name on the certificate, and "every letter in that name carries a number". 11 asked for first and last only |
| Title in her voice | Evelyn speaks the title, under her name in the eyebrow | The operator's headline is first person ("Give me one evening"). 11 made the same exception for its reason line |
| Server checks | The same as 11's (two-part name, real date, 18+), shared through one list of birth-intake offers | Copy 11, not a second copy of the rules |
| U2 route | Skips V1's social-proof stage | "Hundreds of seekers… their stories" is a testimonial claim. ⛔ No testimonials |
| U2's Citrine line | Rewritten without "attracts wealth" | No money promise anywhere (12-B) |
| Delivery hours on the receipt | Always 24, bump or not | The Full Year isn't a speed bump |
| Wrong birth details | No self-service fix. She replies to support | Same as 11 |

## Still open (from 0-WORKFLOW-12)

| # | Question |
|---|---|
| 12-A | The year runs out. From about February "your days in 2027" stops working. The page avoids dates, but the letters say "one in every month" and "January". Decide at D3 |
| 12-B | Arm A's "small miracles" is the bigger payments risk. The funnel promises no win |
| U1 list | Which AWeber list the Wish Ritual writes to (placeholder: the Protection Ritual's 6972555) |
| U1 January | The bracelet-before-January line needs the engine's first open day ≥ 14 days after the order (asked of the engine owner) |
| U1 picture | A citrine bracelet picture for the slot |

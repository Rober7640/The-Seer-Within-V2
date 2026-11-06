# 12-C1 — Booking page *(Lucky Numbers)* — two fields, one optional box

> **Does it fit one phone screen?** See the measured table below (filled in by the walk, A8).

| | |
|---|---|
| **Offer** | 12 Lucky Numbers — READING · **$35** fixed · 24 hours · no reply needed |
| **URL** | `/numerology/lucky-numbers` (D1) · receipt at `/numerology/lucky-numbers/success` ([`12-T1`](12-T1-thank-you-page.md)) |
| **Arrives from** | the five CTAs in each letter: arm A `?c=1…5`, arm B `?c=11…15`, plus `&fn=<first name>`. `?c=` rides into Stripe metadata. `?fn=` goes to `be_order_intake` only. Neither is shown |
| **Treatment** | Page only (12-DELIVERABLES) |
| **Asks for** | full birth name, date of birth. First name comes from `?fn=`, with no field. Stored in `be_order_intake`, never Stripe |
| **Order bump** | The Full Year, $12.77, never pre-checked ([`12-C3`](12-C3-order-bump.md)). Above the total, from the start. The only box on the page |
| **Voice** | Evelyn speaks the title and the signed reason line. Everything else is plain second person. The bump is in her (the buyer's) voice |
| **Component** | 11-C1's page, with no required tick |

---

## First screen (the whole decision)

<!-- Top to bottom, in this order. -->

**Eyebrow:** Evelyn Cross

**Title:** Give me one evening, and I'll hand you your lucky numbers

**Sub-line:** Your 6 numbers to play, a 4-digit PIN, your 12 lucky days in 2027, your 3 lucky numbers, and the one number to stop using.

**Reason line, top of the white sheet, signed:** *"Every number I hand you comes from your birth name and date."* — Evelyn

**Field 1 label:** Your full name on your birth certificate

**Field 1 hint:** Middle names too. If you married, use the name you were born with.

**Field 2 label:** Your date of birth

**Field 2 hint:** For example, 03 14 1961

**Field 2 boxes:** `MM` · `DD` · `YYYY`

**Price line:** **$35** | Paid once / Your reading within 24 hours / Yours to keep and use

**The bump, the only box on the page, optional, never pre-checked:** [`12-C3`](12-C3-order-bump.md).

**The total:** Total · $35.00, or $47.77 while the bump is ticked. Worked out from the catalog, never typed.

> ### WORK OUT MY NUMBERS

Until both fields are filled it looks disabled, and a tap jumps to the first thing missing.

**Under it, while anything is missing:** *Fill in both boxes to continue.*

**Small print, under the button:** Secure payment is next · [Refund policy](https://theseerwithin.com/refund) · [hi@theseerwithin.com](mailto:hi@theseerwithin.com)

---

## The bump

One click toggles it and updates the total. It changes nothing else, and it's never needed to continue.

If the button is below the screen when she ticks the bump, the page scrolls just far enough to bring it back, as 11's does.

Back from the secure checkout page, the bump is unticked. It's never restored.

---

## Field errors

Word for word from `MarcusBooking.tsx`, as on 11. Shown above the input, checked on press only.

| Field | Error |
|---|---|
| Birth name, no space between two names | please enter your first and last name as it is on your birth certificate. |
| Month | enter the month as a number from 1 to 12. |
| Day | enter the day as a number from 1 to 31. |
| Year | the year should have four numbers, for example 1961. |
| Day not in that month | that month does not have that many days — please check the day. |
| Under 18 (server) | You need to be 18 or over to book this reading. |

## Back from the secure checkout page (`?cancelled=1`)

A small line at the top of the sheet: *You haven't been charged. Your details are still here.*

The bump comes back unticked. It's never restored.

---

## Below the fold

### What you get

- Your 3 lucky numbers, and what each one means for you.
- 6 numbers to play on any ticket or raffle, built from your three.
- A 4-digit PIN, built from your numbers.
- Your 12 lucky days in 2027, with the date of each.
- The one number to stop using, and where to look for it.
- Every use, from tickets to travel, with your own numbers filled in.
- A link to your reading, by email, within 24 hours.

Play your numbers the way you always would. Don't spend money you need on tickets because a day is marked.

**Footer strip (existing component, unchanged):** 🔒 Secure checkout · One-time · no subscription

---

## Measured *(walk-12-smoke, A8)*

Real fonts, ?c=3&fn=Sarah, nothing typed. Pixels from the top of the screen. Screens in [`screens/`](screens/).

| Phone | Title lines | Price bottom | Bump bottom | Total bottom | Button top–bottom | Button on first screen? | After ticking the bump |
|---|---|---|---|---|---|---|---|
| 390×844 | 2 | 497 | 642 | 675 | 688–741 | ✅ yes | no scroll needed |
| 390×664 | 2 | 497 | 642 | 675 | 688–741 | ❌ 77px below | scrolls 93px, button ends at 648 |
| 375×667 | 2 | 497 | 642 | 675 | 688–741 | ❌ 74px below | scrolls 90px, button ends at 651 |
| 360×740 | 3 | 526 | 671 | 704 | 717–770 | ❌ 30px below | scrolls 46px, button ends at 724 |

- **The brief's target holds at 390×844:** price and button both on the first screen.
- On the three shorter phones the price and both fields are on the first screen, and the button starts just below it, as on 11. Ticking the bump brings it into view.
- Back from checkout (`?cancelled=1`) the extra line pushes the price down 28–46px. It stays on the first screen at every size.

## Build notes

- **The headline is the letters' own first move.** Both open "give me one evening and I'll…". Arm A goes on to small miracles, arm B to the hand-over list. The page takes the part they share, then lists the items both arms promise, in arm B's order. Nothing here promises a win, for either arm.
- **No "no win" sentence on the page.** Arm A promises small miracles flatly and never undercuts it. A disclaimer on the page they both land on would contradict A in front of her money. The page promises the items only, and keeps the letters' condition below the fold: don't spend money you need.
- **The window is "2027" and nothing more.** The letters say "one in every month" and "your first open day is in January". Both stop being true as 2027 goes by (12-A), so the page says neither. "Your 12 lucky days in 2027" is the whole claim. ⚠ If D3 settles on "your next twelve days from the order", this line still holds.
- **"Open days" isn't on the page.** It's the letters' word. Here they're "lucky days", which needs no explaining.
- **The title is Evelyn speaking**, under her name in the eyebrow. 00e §3 says she doesn't speak on the page, but the operator set "Give me one evening" as the headline, and it's first person. Same exception 11 made for its reason line.
- **The reason line is true by code.** The code works out every number from her birth name and date (0-WORKFLOW-12: "Code works out every number and date"). It says nothing about how.
- **Field 1 asks for the full name, middle names too.** The letters ask for "your full birth name, the one on your certificate", and "every letter in that name carries a number". 11 asked for first and last. The error text stays Marcus's ("first and last name"): it fires only when there's one word.
- **The button** is the letters' last line: "Allow me to work out your numbers for you". The page never says "buy".
- **"Yours to keep and use"** sits beside the price on purpose. She's paying for things she'll use, not a feeling.
- **No promise only code can keep** beyond the items themselves. No cap, no counter, no price rise, no date.
- ⚠ **If `?fn=` is missing**, she's "dear" everywhere after this page, as on 11.

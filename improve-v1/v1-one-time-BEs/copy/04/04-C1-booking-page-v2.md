# 04-C1 — Booking page *(The Turn)* — v2, the one-tick page

| | |
|---|---|
| **Offer** | 04 The Turn — READING · one fixed price, split-tested `$35` vs `$45` · 24h · **no reply needed** |
| **URL** | `https://theseerwithin.com/offers/wiccan/tea-reading` · chat treatment at `/offers/wiccan/tea-reading/chat` ([`04-C2`](04-C2-booking-chat.md)) · receipt at `/offers/wiccan/tea-reading/success` ([`04-T1`](04-T1-thank-you-page.md)) |
| **Arrives from** | `04-E2` (`?c=61–67`) and the abandon nudges `04-E6` (`?c=71–73`). `?c=` and `?fn=` ride into Stripe metadata and are never shown |
| **Treatment** | Page |
| **Price** | ⚠ **`{{PRICE}}`** — her arm's price, from `GET /api/backend/offers/tea-reading/price?subject=<visitor id>`: `$35` (arm A, the control) or `$45` (arm B) in the 50/50 split test `be_04_price_2026`, decided by the server and sticky per visitor. Until the test is started in `/admin/experiments`, everyone sees `$35`. Never hard-coded, never guessed: until it loads the price line is a blank grey bar and the button can't be pressed |
| **Order bump** | the Double Turning, `double_turning`, $12.77 at either price — **intangible** (operator, 2026-10-11): Evelyn reads her cup a second time, and nothing extra is delivered. Replaces the Still Cup ([`04-C3`](04-C3-order-bump.md), superseded). Unticked, appears once the tick is ticked, directly above the total |
| **Voice** | Plain second person ("your cup"). The one tick and the bump label are in her voice. Evelyn is named in the third person and never speaks on this page |
| **Supersedes** | [`04-C1`](04-C1-booking-page.md), the six statements (D11, operator lock 2026-10: one short tick, the price and the button on the first phone screen). Its ideas are kept below: the claim, the permission, 24 hours and the rim calendar |
| **Component** | [00e §3 + §3a](../../docs/00e-FRAMEWORK-BEs.md) |

---

## First screen (390×844 phone: the whole decision)

<!-- Everything in this section must fit on the first phone screen, unticked: headline, photo,
     price line, the three check lines, the tick and the button. The walk measures it. -->

**Eyebrow:** Evelyn Cross *(existing masthead styling, on the starfield)*

**Title:** Your cup knows which week to speak in

**Sub-line:** Evelyn reads where your seven symbols sat, and gives you the next 21 days, week by week.

`[IMG-C1: the source letter's cup photo (docs/04/product/images/esl/esl-cup-original.jpg), cropped to 3:2 → client/public/tea-reading/esl-cup-3x2.jpg]`
*(top of the white sheet. Every buyer gets this one cup, the one she saw in the letter, seven numbered marks and all — operator, 2026-10-11. Replaces the generated full cup, rejected as unrealistic)*

**Alt text:** Your cup from the letter, seen from above on red velvet: the tea drunk, wet leaves on the inside wall, seven groups circled in red and numbered 1 to 7.

**Caption:** *Your cup from the letter. Where the seven sit is what Evelyn reads.*

**Price line:** **`{{PRICE}}`** | Paid once / Your reading within 24 hours

**Check lines (display only, not checkboxes):**

- ✓ Which week to stay quiet, and which week to speak
- ✓ How long he's been pulling away, from where the bird sat
- ✓ Your 21 days on one page, free, to keep in sight

**The one tick (required, her voice):** **☐ Yes — I'm ready to stop guessing what to send.**

> ### TURN MY CUP

Always on screen. Before the tick it looks disabled, and a tap highlights the tick instead of doing
nothing. **Under it while the tick is missing:** *Tick the box above to continue.*

**Trust line, under the button:** Paid once · Within 24 hours · You don't need to send anything · [Refund policy](https://theseerwithin.com/refund) · [hi@theseerwithin.com](mailto:hi@theseerwithin.com)

---

## Once the tick is ticked

These appear between the tick and the button, in this order. If they push the button off the
screen, the page scrolls just far enough to bring it back.

### 1. The order bump *(the Double Turning)*

**☐ Yes, double the strength of my reading · +$12.77**

Evelyn reads your cup a second time and puts twice the strength into your reading. Same reading,
same 21 days. It just works twice as hard: the quiet days hold better, and your one message lands
harder.

⛔ Never pre-checked. Unticking the main tick hides it, and it comes back unticked.

### 2. The total

**Total · `{{PRICE}}`**, plus the bump's $12.77 while the bump is ticked — computed from the
catalog, never typed.

---

## States of the price line

| State | What shows |
|---|---|
| Loading | a blank grey bar where the price goes, and the button can't be pressed. ⛔ Never a guessed number |
| Failed | *The price didn't load.* **Try again** — and the button stays disabled until it loads |
| Changed while the page was open *(checkout answers `409 price_changed`: the test was started, paused or re-weighted after the page loaded, so the server's arm is not the one printed)* | the price line and the total change to the server's price, and above the button: *The price is now `{{NEW_PRICE}}`. It changed while this page was open. Press TURN MY CUP again to go on at `{{NEW_PRICE}}`.* The next press sends the new arm |
| Back from the secure checkout page (`?cancelled=1`) | a small line at the top of the sheet: *Nothing has been taken. Your cup is still here.* The tick comes back unticked |

---

## Below the fold

### What you get

- Your reading: the next 21 days, week by week. Which weeks to stay quiet, which week to speak, and
  which week the bridge is for.
- How long the bird has been in flight, read from where it sat in your cup.
- The rim calendar, free: your 21 days on one page.
- A link to your reading, by email, within 24 hours. You don't need to send Evelyn anything.

**Footer strip (existing component, unchanged):** 🔒 Secure checkout · One-time · no subscription

---

## Build notes

- **Why one tick.** Operator lock (2026-10): commitment pages are one short tick, the price and the
  button on the first phone screen. `04-C1`'s six statements plus the cup pick measured about three
  phone screens on paper. 09's v2 page is the shape this copies (`09-C1`, v2).
- **The claim leads.** *"Your cup knows which week to speak in"* is the letter's fork in one line —
  *"the difference is not what you say — it is when"* (`04-E2`). The tick is the letter's promise in
  her voice: *"You stop guessing what to send."*
- **No price hike — one fixed price, split-tested** (operator, 2026-10-11). The day ladder
  ($35 / $47 / $57 / $67 by day since the letter) is gone, and with it the "today's price" lines and
  the reason-why section ("Why today's price is today's", the drying leaves). In its place: a 50/50
  split test, `be_04_price_2026` — arm A `$35` (the control) vs arm B `$45`. The server decides the
  arm and it is sticky per visitor (her browser's visitor id). The test ships as a **draft**: until
  someone starts it in `/admin/experiments`, everyone gets `$35`, and anything that goes wrong (a
  paused test, a bad setting, a database error) also gives `$35`.
- **The price is a merge field.** `{{PRICE}}` is her arm's price from the price endpoint, printed
  with `priceLabel()`. The page posts the arm it showed (`quotedArm`); checkout works out her arm
  again on the server and charges that. If the two differ it answers `409 price_changed` with the
  server's price, so nobody is charged a price she wasn't shown. ⛔ The other arm's price appears
  nowhere on the page. `?arm=A` / `?arm=B` previews either price while the offer is dark (display
  only — checkout never reads it).
- **No pick: the reading is drawn** (operator, 2026-10-11). Every buyer's reading reads the same
  cup photo, and there are three interpretations of it, one PDF each. Which one she gets is drawn
  at random **on the server, at checkout**, and written to Stripe metadata as `cup` (with
  `cupDrawn: '1'`); the delivery job sends that cup's link. The page never asks and sends no cup —
  a cup sent by an old cached page is ignored. The receipt doesn't name it either: the reading
  itself is the reveal. This replaces the optional "which cup is yours?" question that sat after
  the tick, which the operator found confusing.
- **The first screen is measured.** On a 390×844 phone, unticked, the headline, photo, price, three
  check lines, tick and button all fit. The walk (`walk-04-smoke.mjs`) prints the button's
  position on every run.
- **The bump is the Double Turning — an intangible** (operator, 2026-10-11). Evelyn reads her cup
  a second time and puts twice the strength into the same reading. Nothing extra is delivered: no
  page, no email, no link, and the delivery time doesn't change (still within 24 hours). It
  replaces the Still Cup (`04-C3`/`04-C4`, now superseded), a nightly instructional that had to be
  delivered. Stripe line item: *The Double Turning*. Copy operator-reviewed for clarity — use it
  word for word. ⛔ It never tells her what to send — that is the paid reading.
- **"You don't need to send anything"** is in the trust line because it is 04's real difference
  from 03 and 05, and the last line before a click is where friction goes.
- **Timing.** Only "within 24 hours". Nothing here says tonight, by morning, tomorrow or a weekday
  about the reading. The bump changes none of it: same reading, same 21 days, same 24 hours.
- **Banned:** open communication, seek guidance, embrace growth, clearing, energy field, our
  conversation. None appear.

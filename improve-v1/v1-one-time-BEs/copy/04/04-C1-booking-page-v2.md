# 04-C1 — Booking page *(The Turn)* — v2, the one-tick page

| | |
|---|---|
| **Offer** | 04 The Turn — READING · price ladder by day since the letter · 24h · **no reply needed** |
| **URL** | `https://theseerwithin.com/offers/wiccan/tea-reading` · chat treatment at `/offers/wiccan/tea-reading/chat` ([`04-C2`](04-C2-booking-chat.md)) · receipt at `/offers/wiccan/tea-reading/success` ([`04-T1`](04-T1-thank-you-page.md)) |
| **Arrives from** | `04-E2` (`?c=61–67`), the abandon nudges `04-E6` (`?c=71–73`) and the ladder emails `04-E5` (`?c=81–83`). `?c=` and `?fn=` ride into Stripe metadata and are never shown |
| **Treatment** | Page |
| **Price** | ⚠ **`{{TODAYS_RUNG}}`** — today's rung, from `GET /api/backend/offers/tea-reading/price`. Never hard-coded, never guessed: until it loads the price line is a blank grey bar and the button can't be pressed |
| **Order bump** | the Still Cup, `still_cup`, $12.77 at every rung — condensed from [`04-C3`](04-C3-order-bump.md). Unticked, appears once the tick is ticked, directly above the total |
| **Voice** | Plain second person ("your cup"). The one tick and the bump label are in her voice. Evelyn is named in the third person and never speaks on this page |
| **Supersedes** | [`04-C1`](04-C1-booking-page.md), the six statements (D11, operator lock 2026-10: one short tick, the price and the button on the first phone screen). Its ideas are kept below: the claim, the permission, the drying leaves, 24 hours, the price's reason-why and the rim calendar |
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

**Price line:** **`{{TODAYS_RUNG}}`** | Today's price · paid once / Your reading within 24 hours

**Check lines (display only, not checkboxes):**

- ✓ Which week to stay quiet, and which week to speak
- ✓ How long he's been pulling away, from where the bird sat
- ✓ Your 21 days on one page, free, to keep in sight

**The one tick (required, her voice):** **☐ Yes — I'm ready to stop guessing what to send.**

> ### TURN MY CUP

Always on screen. Before the tick it looks disabled, and a tap highlights the tick instead of doing
nothing. **Under it while the tick is missing:** *Tick the box above to continue.*

**Trust line, under the button:** Paid once at today's price · Within 24 hours · You don't need to send anything · [Refund policy](https://theseerwithin.com/refund) · [hi@theseerwithin.com](mailto:hi@theseerwithin.com)

---

## Once the tick is ticked

These appear between the tick and the button, in this order. If they push the button off the
screen, the page scrolls just far enough to bring it back.

### 1. Which cup is yours? *(optional — never a gate)*

**Which sounds like the last three weeks?**

*Optional. It decides which reading you get. Skip it and Evelyn reads The Divided Rim.*

- **The Turned Handle** — he answers, but flat
- **The Divided Rim** — hot and cold
- **The Sunken Leaf** — silence, I start everything

Nothing is picked when it appears. Tapping a picked cup again un-picks it. The button works with or
without a pick.

### 2. The order bump *(from 04-C3)*

**☐ Yes — add the Still Cup, for the evenings · +$12.77**

Four minutes with a cup of tea, every evening, for the hour you'd spend rereading his last message.
Start it tonight.

⛔ Never pre-checked. Unticking the main tick hides it, and it comes back unticked.

### 3. The total

**Total · `{{TODAYS_RUNG}}`**, plus the bump's $12.77 while the bump is ticked — computed from the
catalog, never typed.

---

## States of the price line

| State | What shows |
|---|---|
| Loading | a blank grey bar where the price goes, and the button can't be pressed. ⛔ Never a guessed number |
| Failed | *Today's price didn't load.* **Try again** — and the button stays disabled until it loads |
| Moved on while the page was open *(checkout answers `409 price_changed`)* | the price line and the total change to the new rung, and above the button: *Today's price is now `{{NEW_RUNG}}`. It went up while this page was open. Press TURN MY CUP again to go on at `{{NEW_RUNG}}`.* The next press sends the new day |
| Back from the secure checkout page (`?cancelled=1`) | a small line at the top of the sheet: *Nothing has been taken. Your cup is still here.* The tick comes back unticked |

---

## Below the fold

### What you get

- Your reading: the next 21 days, week by week. Which weeks to stay quiet, which week to speak, and
  which week the bridge is for.
- How long the bird has been in flight, read from where it sat in your cup.
- The rim calendar, free: your 21 days on one page.
- A link to your reading, by email, within 24 hours. You don't need to send Evelyn anything.

### Why today's price is today's

Your seven symbols don't change. Where they sit does: as the leaves dry, they lift and move. A soft
cup is an evening's work. A dry one has to be worked backwards, leaf by leaf, to where each one sat,
and that's more of Evelyn's night. So the price goes up each day after the letter, until day four.
You pay once, at the price on this page when you press the button.

**Footer strip (existing component, unchanged):** 🔒 Secure checkout · One-time · no subscription

---

## Build notes

- **Why one tick.** Operator lock (2026-10): commitment pages are one short tick, the price and the
  button on the first phone screen. `04-C1`'s six statements plus the cup pick measured about three
  phone screens on paper. 09's v2 page is the shape this copies (`09-C1`, v2).
- **The claim leads.** *"Your cup knows which week to speak in"* is the letter's fork in one line —
  *"the difference is not what you say — it is when"* (`04-E2`). The tick is the letter's promise in
  her voice: *"You stop guessing what to send."*
- **The price is a merge field.** `{{TODAYS_RUNG}}` is the price endpoint's rung, printed with
  `priceLabel()`. The page posts the day it showed (`quotedDay`); the server's clock decides the
  charge and honours a just-expired rung for 120 minutes. ⛔ No other rung's price appears anywhere
  on this page — not in a "was" line, not in the reason-why.
- **The cup pick sits after the tick, measured.** On a 390×844 phone, unticked, the button's
  bottom edge is at 795px — the first screen holds the headline, photo, price, three check lines,
  tick and button with 49px to spare. The cup pick is 245px tall with its margin, so above the tick
  it would put the button at 1,040px, off the screen. It appears with the bump once she has ticked.
  The walk (`walk-04-smoke.mjs`) prints both numbers on every run.
- **The cup is optional in code.** No pick → the page sends no cup and the server records The
  Divided Rim with `cupChosen: '0'`, so fulfilment and analytics can tell a pick from the default.
  ⛔ An invalid value never blocks a sale.
- **The bump is 04-C3 condensed.** C3's long pitch is a page of her voice; on a one-tick page it is
  a label and one line. Kept: *something to do with the evenings*, the hour she'd spend rereading
  his last message, four minutes, starts tonight. Cut: the Tuesday at nine and "nothing to buy".
  ⛔ It never tells her what to send — that is the paid reading.
- **"You don't need to send anything"** is in the trust line because it is 04's real difference
  from 03 and 05, and the last line before a click is where friction goes.
- **Timing.** Only "within 24 hours". Nothing here says tonight, by morning, tomorrow or a weekday
  about the reading. *"Start it tonight"* is about the Still Cup, which she can do this evening.
- **Banned:** open communication, seek guidance, embrace growth, clearing, energy field, our
  conversation. None appear.

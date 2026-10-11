# 04-T1 — Thank-you page *(The Turn)* — the receipt

| | |
|---|---|
| **Offer** | 04 The Turn — READING · 24h · **no reply needed** |
| **URL** | `https://theseerwithin.com/offers/wiccan/tea-reading/success?s=<session>` — reached from Upsell 2 (`OffersUpsell2` → `successPath?s=`) |
| **Archetype** | **Receipt** (P7). Confirm, name the email title, stop. Sells nothing |
| **Lookup** | `GET /api/backend/order/:session?offer=tea-reading`, retried every 2s for up to 40s while the payment is still settling. ⛔ Only an order verified as THIS offer's, and paid, gets the receipt below |
| **Name** | her first name from checkout, or *dear* |
| **Source** | the drafted T1 in [`04-T1-T3-follow-through.md`](04-T1-T3-follow-through.md), with the timing fixed |
| **Delivery title** | `%FIRSTNAME% — your cup is turned` — ⛔ word for word what [`04-T3`](04-T3-confirmation-email.md) and [`04-T4`](04-T4-delivery-email.md) say |

---

## While it loads

*Confirming your order.* *(spinner — no receipt lines yet)*

---

## The receipt

### Thank you, %FIRSTNAME%.

Your cup's on my table now, and I've started.

Your reading arrives within **24 hours**, by email, under this title:

> ### %FIRSTNAME% — your cup is turned

That title is only ever used for this, so it's easy to find.

If 24 hours pass and it isn't there, look in your promotions tab first. Then reply to your
confirmation email, or write to **hi@theseerwithin.com**, and I'll sort it out.

You don't need to send me anything. Nothing else is needed from you while you wait.

Your confirmation is on its way now, with the subject **Your tea reading is confirmed — The Turn**.

— Evelyn

---

## Only if the reading has already gone out *(`deliveredAt` is set)*

The second and third lines become:

Your cup's turned, and your reading's been sent. Look for this title:

> ### %FIRSTNAME% — your cup is turned

---

## P.S. — bump buyers only *(`bumpPurchased: true`)*

**P.S. Your Still Cup is ready now.**

[Open the Still Cup](https://theseerwithin.com/offers/wiccan/tea-reading/still-cup). Don't wait for
your reading: start tonight, and do it every evening after. It takes four minutes, and it's for the
hours while you wait.

---

## Fallback — the order can't be verified

*(No `?s=`, not this offer's order, not paid, refunded, or the lookup failed for the whole window.
⛔ No receipt lines, no Still Cup link.)*

### Thank you, dear.

I can't show your order on this page just now. Your confirmation email has the details, with the
subject **Your tea reading is confirmed — The Turn**.

If it hasn't come, write to **hi@theseerwithin.com** and someone will find your order.

— Evelyn

---

## Build notes

- **Timing fixed against the T1 draft.** Removed: *"tonight"* about the cup going on the table,
  *"Look out for it tomorrow"*, *"If tomorrow evening comes"*, and *"I'll send it again the same
  day"*. Delivery is automated and lands inside 24 hours; a woman who books at 8am would read her
  reading arrive before "tonight". In their place: *"on my table now, and I've started"* (`04-T3`'s
  line), *"within 24 hours"*, and *"If 24 hours pass"*.
- **"It's going on soft — you didn't leave it" is cut.** True for a day-1 buyer, false for a woman
  booking on day 4, when the ladder emails have told her the leaves have lifted.
- **The title box matches `04-T3` and `04-T4` exactly.** With no first name it reads *"dear — your
  cup is turned"*, the same fallback `04-T3`'s box and the `04-T4` subject use.
- **Her cup is not named** (operator, 2026-10-11). There is no pick any more: which of the three
  interpretations she gets is drawn at random on the server at checkout, and the reading itself is
  the reveal. The old *"Your reading follows The …"* line is gone, and the order lookup no longer
  returns a cup.
- **No price on this page.** There is no receipt ledger; her card receipt has the amounts.
- **The Still Cup is delivered here, immediately** (`04-C4`: sold as *tonight*). The P.S. renders
  only for a verified order with `bumpPurchased: true`; `04-T5` emails the same link ten minutes
  later for the woman who closes this page.
- **Banned:** open communication, seek guidance, embrace growth, clearing, energy field, our
  conversation. None appear.

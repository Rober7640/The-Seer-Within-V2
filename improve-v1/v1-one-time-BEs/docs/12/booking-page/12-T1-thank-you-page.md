# 12-T1 — Thank-you page *(Lucky Numbers)* — the receipt

| | |
|---|---|
| **Offer** | 12 Lucky Numbers — READING · 24 hours · no reply needed |
| **URL** | `/numerology/lucky-numbers/success?s=<session>`, reached after Upsell 2 |
| **Archetype** | **Receipt** (P7). Confirm, name the email subject, then the free chat gift. Sells nothing else. ⚠ The gift overrides "a receipt sells nothing", by the operator's decision of 2026-11-03, as on 11 |
| **Voice** | Evelyn's again. The buyer's voice ends at the button |
| **Name** | her first name from `?fn=` via the intake, or *dear* |
| **Delivery title** | `%FIRSTNAME% — your lucky numbers are worked out` — ⛔ word for word what [`12-T3`](../order-emails/12-T3-confirmation.md) and [`12-T4`](../order-emails/12-T4-delivery.md) say |

---

## While it loads

*Confirming your order.* *(spinner, no receipt lines yet)*

---

## The receipt

<!-- BEAT 1 + 2 · thanks as HER decision -->

### Thank you, %FIRSTNAME%.

You asked for your own numbers, and that was the right call.

<!-- BEAT 3 · work begins now -->

Your name and date are on my table now, and I've started.

<!-- BEAT 4 · what to look for -->

Your reading arrives within **24 hours**, by email, under this title:

> ### %FIRSTNAME% — your lucky numbers are worked out

If 24 hours pass and it isn't there, look in your promotions tab first. Then reply to your confirmation email, or write to **hi@theseerwithin.com**, and I'll sort it out.

There's nothing else to do. Leave your PIN as it is till your reading comes.

Your confirmation is on its way now, with the subject **Your Lucky Numbers reading is confirmed**.

<!-- BEAT 5 -->

— Evelyn

---

## Only if the reading has already gone out *(`deliveredAt` is set)*

The second to fourth lines become:

Your numbers are worked out, and your reading's been sent. Look for this title:

> ### %FIRSTNAME% — your lucky numbers are worked out

---

## P.S. — bump buyers only *(`bumpPurchased: true`)*

P.S. You added The Full Year. It's the last page of your reading: every lucky day you've got in 2027, on one calendar page.

---

## The gift — 15 free minutes with Evelyn *(operator, 2026-11-03)*

*(Verified, paid orders only, under the receipt. ⛔ Never on the fallback. If the link can't be built, nothing shows.)* Copy, tag and Evelyn's brief: [`12-T1-gift`](12-T1-gift.md).

---

## Fallback — the order can't be verified

*(No `?s=`, not this offer's order, not paid, refunded, or the lookup failed. ⛔ No receipt lines, no P.S.)*

### Thank you, dear.

I can't show your order on this page just now. Your confirmation email has the details, with the subject **Your Lucky Numbers reading is confirmed**.

If it hasn't come, write to **hi@theseerwithin.com** and someone will find your order.

— Evelyn

---

## Build notes

- **A receipt, then the gift, then stop.** Nothing is sold, and the upsells have already run. The free chat gift is the one exception (operator, 2026-11-03), see [`12-T1-gift`](12-T1-gift.md).
- **"Leave your PIN as it is till your reading comes."** The one useful thing she can be told: the reading gives her new digits, and changing the PIN twice is a nuisance. It's also the only "to do" on the page, and it's a don't.
- **No times of day.** Delivery can land at any hour, so it's "within 24 hours" only. The letters' "one evening" stays in the letters.
- **The title box must match T3 and T4 exactly.** With no first name it reads *"dear — your lucky numbers are worked out"*.
- **The P.S. assumes the bump is the last page of her PDF**, see `12-C3`.
- ⚠ **Wrong birth details.** A typo in her name or date changes every number. Nothing here invites a fix, to keep the page a receipt. T4 asks her to check the first page.

# 11-T1 — Thank-you page *(The Unsent Letter)* — the receipt

| | |
|---|---|
| **Offer** | 11 The Unsent Letter — READING · 24 hours · no reply needed |
| **URL** | `/tarot/unsent-letter/success?s=<session>` *(proposed)*, reached after Upsell 2 |
| **Archetype** | **Receipt** (P7). Confirm, name the email subject, then the free chat gift. Sells nothing else. ⚠ The gift overrides "a receipt sells nothing", by operator's decision, for this offer only |
| **Voice** | Evelyn's again. The buyer's voice ends at the button |
| **Name** | her first name from `?fn=` via checkout, or *dear* |
| **Delivery title** | `%FIRSTNAME% — your letter is written out` — ⛔ word for word what [`11-T3`](../order-emails/11-T3-confirmation.md) and [`11-T4`](../order-emails/11-T4-delivery.md) say |
| **Component** | [00e §7](../../00e-FRAMEWORK-BEs.md) |

---

## While it loads

*Confirming your order.* *(spinner, no receipt lines yet)*

---

## The receipt

<!-- BEAT 1 + 2 · thanks as HER decision -->

### Thank you, %FIRSTNAME%.

They've had it long enough, and you said so.

<!-- BEAT 3 · work begins now -->

Your twelve are on my table now, and I've started.

<!-- BEAT 4 · what to look for -->

Your reading arrives within **24 hours**, by email, under this title:

> ### %FIRSTNAME% — your letter is written out

If 24 hours pass and it isn't there, look in your promotions tab first. Then reply to your confirmation email, or write to **hi@theseerwithin.com**, and I'll sort it out.

There's nothing else to do. You don't write to anyone.

Your confirmation is on its way now, with the subject **Your Unsent Letter reading is confirmed**.

<!-- BEAT 5 -->

— Evelyn

---

## Only if the reading has already gone out *(`deliveredAt` is set)*

The second to fourth lines become:

It's written out, and your reading's been sent. Look for this title:

> ### %FIRSTNAME% — your letter is written out

---

## P.S. — bump buyers only *(`bumpPurchased: true`)*

P.S. You added Closing the Door. It's the last page of your reading. Don't do it until you've read the letter.

---

## The gift — 15 free minutes with Evelyn *(operator, 2026-11-02)*

*(Verified, paid orders only, under the receipt. ⛔ Never on the fallback. If the link can't be built, nothing shows.)*

*Card design ported from 12's receipt on 2026-11-06 ([`12-T1-gift`](../../12/booking-page/12-T1-gift.md), operator-approved 2026-11-03: the bare voucher "looks thin, not an appealing CTA"). It now reads as an invitation from her.* ⚠ The first "bring" line is 11's own and not yet approved by the operator.

**Header:** Evelyn's photo (`/evelyn-avatar.png`, with a green "online" dot), then the headline in her voice: Come and talk to me, Sarah. *(No usable first name: "Come and talk to me.")* Under it: Evelyn Cross.

**While it's being written:** While I write, come and talk to me. The first 15 minutes are on me.

**Once it's been sent** *(`deliveredAt` is set)*: Once you've read it, come and talk to me. The first 15 minutes are on me.

**Three things to bring** *(gold sparkle each)*:

- Tell me what you want back in your life
- Bring the question that's been on your mind
- Being written: Ask me where to start, once your reading's in · Sent: Ask me where to start with your reading

⛔ None of them asks her to contact, wait for or forgive anyone.

**Voucher:** Free · 15 min | Gift voucher · 15 minutes of free chat · with Evelyn Cross

**Button** *(gold, full width, larger)*: Claim my 15 free minutes →

**Under the button:** A private chat, just you and me. Your 15 minutes are already set aside.

---

## Fallback — the order can't be verified

*(No `?s=`, not this offer's order, not paid, refunded, or the lookup failed. ⛔ No receipt lines, no P.S.)*

### Thank you, dear.

I can't show your order on this page just now. Your confirmation email has the details, with the subject **Your Unsent Letter reading is confirmed**.

If it hasn't come, write to **hi@theseerwithin.com** and someone will find your order.

— Evelyn

---

## Build notes

- **A receipt, then the gift, then stop.** Nothing is sold, and the upsells have already run. The gift is free, and it's the one exception to P7.
- **What the gift is.** The same 15 minutes /fb buyers get, under 11's own tag (`be11-ty-evelyn`) and its own once-only claim, because this list is prior V1 buyers: on `v1-ty-evelyn` anyone who'd used the /fb gift would get nothing. It's added to her balance, not topped up to 15, so it's true for someone who already has minutes.
- ⛔ **The chat must not start cold.** Her arrival loads 11's own brief. Evelyn knows the booking and that the reading is coming, or has gone. She doesn't know who this is or what they took, because the paid reading is the reveal.
- **No times of day.** "Tonight" and "tomorrow" are out, because delivery can land at any hour. "On my table now" is the present tense 04 settled on.
- **Thanks avoids the word "judgment".** 00e frames it as her good judgment, but that's one of the reveal words, so the line uses the letter's own last words.
- **The title box must match T3 and T4 exactly.** With no first name it reads *"dear — your letter is written out"*.
- **The P.S. assumes the bump is the last page of her PDF**, see `11-C3`.
- ⚠ **Wrong birth details.** A typo in her name or date changes her reading, and this is the last screen she sees before it's written. Nothing here invites a fix, to keep the page a receipt. If you want one, it needs someone to act on the reply. Your call.

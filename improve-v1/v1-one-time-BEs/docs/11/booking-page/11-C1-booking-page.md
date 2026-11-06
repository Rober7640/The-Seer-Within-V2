# 11-C1 — Booking page *(The Unsent Letter)* — two fields, one optional box

> **Does it fit one phone screen? The bump and total do on all four sizes. The button does on two.** With the tick gone, the button sits 73px higher. Name, date, price, bump and total are on every first screen.
>
> | Screen | Bump ends | Total ends | Button ends | Hint ends | On the first screen? |
> |---|---|---|---|---|---|
> | 390×844 | 611 | 644 | 711 | 736 | All of it |
> | 390×664 | 611 | 644 | 711 | 736 | All but the button, 47px below |
> | 375×667 | 630 | 663 | 730 | 755 | All but the button, 63px below |
> | 360×740 | 630 | 663 | 730 | 755 | Button fits, hint 15px below |
>
> ⚠ 390×664 is about what Safari leaves on that phone once its toolbars show, so a real iPhone is the second row, not the first.
> **Two limits:** (1) On the two short screens, a bump tick scrolls the button into view (63 and 79px), but a buyer who skips the bump scrolls it herself. (2) While she types, the phone keyboard covers the button. Two typed fields make that unavoidable.
> Measured with the bump unticked, on the real page with its real fonts, in Playwright. Not on a real phone.

| | |
|---|---|
| **Offer** | 11 The Unsent Letter — READING · **$35** fixed · 24 hours · no reply needed |
| **URL** | `/tarot/unsent-letter` (D1) · receipt at `/tarot/unsent-letter/success` *(proposed)* ([`11-T1`](11-T1-thank-you-page.md)) |
| **Arrives from** | the six CTAs in [`11-E2`](../sales-emails/11-E2-esl.md), `?c=1…6&fn=<first name>`. `?c=` and `?fn=` ride into Stripe metadata and are never shown |
| **Treatment** | Page. ⚠ A2 asks for a chat treatment too. None is written here: it wasn't in this brief |
| **Asks for** | full birth name, date of birth. First name comes from `?fn=`, with no field. Stored in `be_order_intake`, never Stripe |
| **Order bump** | Closing the Door, $12.77, never pre-checked ([`11-C3`](11-C3-order-bump.md)). On the page from the start, directly above the total. It's the only box on the page |
| **Voice** | Plain second person. The bump is in her voice. Evelyn is named in the third person, with one exception: her signed line about the birth details, see build notes |
| **Component** | [00e §3](../../00e-FRAMEWORK-BEs.md), with no required tick, by the operator's correction of 2026-11-02. Shape copied from `copy/04/04-C1-booking-page-v2.md` |

---

## First screen (the whole decision)

<!-- Top to bottom, in this order. No photo and no check lines: the two fields take their place. -->

**Eyebrow:** Evelyn Cross

**Title:** The letter they never sent

**Sub-line:** Evelyn lays your twelve cards and names what they took from you.

**Reason line, top of the white sheet, signed:** *"Your birth name and date set how I lay your twelve cards."* — Evelyn

**Field 1 label:** Your first and last name on your birth certificate

**Field 1 hint:** If you married and changed your name, use your maiden name.

**Field 2 label:** Your date of birth

**Field 2 hint:** For example, 03 14 1961

**Field 2 boxes:** `MM` · `DD` · `YYYY`

**Price line:** **$35** | Paid once / Your reading within 24 hours / You never have to contact them

**The bump, the only box on the page, optional, never pre-checked:** [`11-C3`](11-C3-order-bump.md).

**The total:** Total · $35.00, plus $12.77 while the bump is ticked. Worked out from the catalog, never typed.

> ### WRITE OUT MY LETTER

Until both fields are filled it looks disabled, and a tap jumps to the first thing missing.

**Under it, while anything is missing:** *Fill in both boxes to continue.*

**Small print, under the button:** Secure payment is next · [Refund policy](https://theseerwithin.com/refund) · [hi@theseerwithin.com](mailto:hi@theseerwithin.com)

---

## The bump

One click toggles it and updates the total. It changes nothing else, and it's never needed to continue.

If the button is below the screen when she ticks the bump, the page scrolls just far enough to bring it back, as 04's does.

Back from the secure checkout page, the bump is unticked. It's never restored.

---

## Field errors

Word for word from `MarcusBooking.tsx`, shown above the input, checked on press only.

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

⛔ Don't reuse 04's "Nothing has been taken" here. On this offer that sentence means something else.

---

## Below the fold

### What you get

- Your twelve cards. Evelyn names what they took, and gives you one flat answer to each question.
- The letter they never sent, written out start to finish.
- A link to your reading, by email, within 24 hours.

You don't write to anyone, and you don't reply to anyone. If this person hurt you, you owe them no reply.

**Footer strip (existing component, unchanged):** 🔒 Secure checkout · One-time · no subscription

---

## Build notes

- **How I measured it.** The real page with its real fonts, in Playwright, by `scripts/walk-11-smoke.mjs`. The table at the top is its output. Not measured: a real phone, or the iOS keyboard.
- **What was cut to make it fit.** 04's photo and all three check lines. Marcus's "First name" field. A one-line title.
- **The reason line is Evelyn speaking, on a page she never speaks on.** 00e §3 says she doesn't, but the operator set this sentence word for word in the first person, and 11-DELIVERABLES repeats it. So it is set as a signed quote. If it must be third person, that changes the operator's sentence, so I left it.
- **Field labels are Marcus's, tested.** The second half of his hint ("This is how I find your personal card.") is cut: the reason line does that job. His "first name" field is cut because `?fn=` carries it.
- ⚠ **If `?fn=` is missing**, she's "dear" everywhere after this page. No field catches it, on purpose.
- **No required tick.** Operator, 2026-11-02: one box only, the optional bump. The tick said "Yes — Evelyn has my say-so. I want back what they took." It held no terms, age or refund wording, and it never reached the server. The letter's "give me your say-so on this page" still holds: the booking is her say-so.
- **The title** is the letter's last line. **The button** finishes "Let me write it out for you" (beat 12). It isn't 02's "LAY MY TWELVE", so the two offers stay apart.
- **The page never says "buy".** Lays · writes out · paid once.
- **"You never have to contact them"** sits inside the price block on purpose. It's her biggest fear, and that's the moment she looks at money.
- **"If this person hurt you"** is below the fold because it needs a calm moment, not a price beside it. It's also in the letter and in T3 and T4.
- ⚠ **"Within 24 hours" vs the letter.** The letter says writing it out "takes me 24 hours". If delivery lands far earlier (04's job defaults to 12 hours), the letter reads false. Set delivery close to 24 hours.
- ⛔ **No numerology.** Nothing here says what her name and date are used for beyond the one sentence, and it must stay that way. Marcus's date errors do use the plain word "number" ("enter the month as a number"). That's about typing, so I kept them.
- **Reveal words kept out** (from `11-E2`): nerve, trust, laugh, safe, freedom, looked after, judgement, worth, softness.
- ⛔ **Lawyer (11-C):** "the letter they never sent" and "what they took" are stated flat on this page. It should go to the lawyer with the letter.
- **No promise only code can keep.** No cap, no counter, no price rise.

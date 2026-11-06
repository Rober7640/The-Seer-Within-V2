# 12-T1 gift — 15 free minutes with Evelyn *(Lucky Numbers receipt)*

| | |
|---|---|
| **Decision** | Operator, 2026-11-03: 12's receipt carries the same free gift as 11's. This overrules the earlier "no chat gift" call |
| **Where** | Under the receipt on [`12-T1`](12-T1-thank-you-page.md), `/numerology/lucky-numbers/success?s=<session>` |
| **Shows** | Verified, paid 12 orders only, and only once the handoff link is real. ⛔ Never on the fallback. If the handoff fails, nothing shows |
| **Pattern** | 11's gift ([`11-T1`](../../11/booking-page/11-T1-thank-you-page.md), `server/lib/unsentLetterTyGift.ts`), mirrored, not shared |
| **Code** | `server/lib/luckyNumbersTyGift.ts` · `POST /api/backend/lucky-numbers/gift-handoff` · `client/src/lib/luckyNumbersReceipt.ts` (`NUMBERS_GIFT`) |

---

## What the card says

Operator, 2026-11-03: the first card (a line, the voucher and a purple "Talk to Evelyn" button) "looks thin, not an appealing CTA". So it now reads as an invitation from her, top to bottom. ✅ **Approved by the operator, 2026-11-03.**

**Header:** Evelyn's photo (`/evelyn-avatar.png`, with a green "online" dot), then the headline in her voice: Come and talk to me, Sarah. *(No usable first name: "Come and talk to me.")* Under it: Evelyn Cross.

**While the numbers are being worked out:** While I work out your numbers, come and talk to me. The first 15 minutes are on me.

**Once the reading has been sent** *(`deliveredAt` is set)*: Once you've read your numbers, come and talk to me. The first 15 minutes are on me.

**Three things to bring** *(gold sparkle each)*:

- Tell me what you're hoping this year brings you
- Bring the question that's been on your mind
- Being worked out: Ask me where to start, once your reading's in · Sent: Ask me where to start with your reading

⛔ None of them invites her to ask Evelyn for a number: the chat never works one out.

**Voucher:** Free · 15 min | Gift voucher · 15 minutes of free chat · with Evelyn Cross

**Button** *(gold, full width, larger)*: Claim my 15 free minutes →

**Under the button:** A private chat, just you and me. Your 15 minutes are already set aside.

The voucher is 11's word for word: it's the same gift. The rest is 12's.

---

## The link

| | |
|---|---|
| **Tag** | `be12-ty-evelyn` (server, receipt and lander hold the same string; a test checks all three) |
| **UTM** | `utm_source=be12_ty&utm_medium=thankyou&utm_campaign=evelyn_15` |
| **Has a V2 account** | `/evelyn?token=<magic token>&campaign=be12-ty-evelyn&…` — straight in, logged in |
| **No account** | `/evelyn?campaign=be12-ty-evelyn&…&email=<order email>&name=<first name>` — prefilled signup |

The email always comes from the paid order, never from the page.

## The grant

- 15 minutes, **added** to her balance (not topped up to 15), once only, under 12's own tag in `promo_grants`.
- Needs an arrival from 12's receipt **and** a paid `lucky-numbers` order on her email.
- Claimed on arrival when the server knows who she is (magic token or signed in), or at email verification for a new account (tier `lucky-numbers-thankyou`, after 11's, before /fb's).
- Its own tag, because this list is prior V1 buyers: on /fb's or 11's tag, anyone who'd used that gift would be promised 15 minutes and given nothing.

---

## What Evelyn knows when the chat opens

The brief is loaded for 7 days after an arrival from 12's receipt, with a paid order behind it. If she also came from 11's receipt more recently, 11's brief wins.

**She knows:**

- Her first name, if the order has one.
- What she booked: Lucky Numbers, a written reading. From her full birth name and date of birth Evelyn works out her three lucky numbers, six numbers to play, a four-digit PIN, one number to stop using, and twelve open days in the year ahead, one in each month.
- How it began: Evelyn wrote to her, showed her how to add up her birth date to find her first number, and told her about her open days. She promised not to chase: no money she needs, one ticket only where she'd have bought one anyway.
- The state, one of two:
  - **Being worked out:** it reaches her by email within 24 hours of booking. Nothing to do, and leave her PIN as it is till it comes.
  - **Sent:** it has gone to her by email. Evelyn doesn't have its numbers, dates or words. If she quotes any of it, Evelyn takes it as given and adds nothing.

**The rules she's given:**

- Never work out, guess or suggest a number or date: lucky number, number to play, PIN, number to stop using, open day or lucky hour. Not even as an example. "It's all in your reading, worked out properly."
- If she gives a number or date, take it as given. Never check it, add it up again, correct it or give it a new meaning.
- Never tell her to change a PIN, a phone number or anything else. The reading says what to do.
- Never say a number will win anything or bring money. Nothing promises a win. On tickets, hold her to her promise.
- Wrong birth name or date: reply to the confirmation email or write to hi@theseerwithin.com.
- No prices, payments or orders. No details of the bump or the upsells.
- The greeting is 1–2 short sentences, under 35 words, no "welcome", no number or date, and ends on an open question about what's on her mind.

**Left out on purpose:** her numbers, her six, her PIN, her stop number, her dates and hours, her birth name and her birth date. They aren't in the prompt at all, so they can't leak, and Evelyn can't contradict the paid reading with numbers of her own. Every number in the reading comes only from code (`docs/12/n8n/scripts/lucky-12.js`).

---

## Build notes

- **A receipt, then the gift, then stop.** As on 11, the gift is the one exception to P7.
- **No price, no win, no money promise** on the card. None of energy, journey, tarot or lava.
- **The writing line says "work out", the sent line doesn't.** A sent reading is never still being worked out.
- ⚠ **One buyer, both receipts.** 11 and 12 sell to the same list. The newest arrival picks the brief. At email verification only one tier can win (11's, being first), so a brand-new account that came from both receipts before verifying gets 11's 15 minutes there and 12's only on a later signed-in arrival from 12's receipt.

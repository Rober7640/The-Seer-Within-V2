# 08 · THE PAID READING


> **Latest confirmed decisions:** standard delivery within 24 hours; +$12.77 bump within 12 hours, both measured from confirmed main payment. Audio shares that order deadline. Use Replicate Chatterbox with the Marcus voice Joel will supply. Create a NEW Marcus n8n workflow; existing workflows must remain untouched. See the delivery policy and Chatterbox setup in the n8n folder. These decisions supersede older open-timing/provider notes below.

What she gets when she opens the rest of the cards. **Updated by Joel’s decisions, 2026-09-10.** The free daily is a
separate document — see [`SHAPE.md`](../daily-email/SHAPE.md), which is still being revised.

---

## The product in one line

> A separate draw for the morning’s face-down positions, interpreted through the personal tarot
> card identified from her first and last name.

Her first and last name identify a separate personal tarot card. The paid positions are drawn
independently for each buyer; the report interprets those cards through her personal card’s lens.
The current booking scope collects first and last name only; no personal-sentence box.

---

## 1 · What she buys

Each morning is **one topic** and **one spread** from [`SPREADS.md`](../daily-email/SPREADS.md) — 3 to 12 cards.
Roughly a third of the positions are turned in the daily email; the rest stay face down. The paid
reading opens them.

*Worked example — "Why They Go Quiet":*

```
1  what the quiet actually is          turned in the email
2  what it is not                      turned in the email
3  what it costs you while it lasts    turned in the email
4  what he is protecting               ← paid
5  what you have been doing inside it  ← paid
6  what ends it                        ← paid
```

**Position rule:** a position is free if Marcus can answer it honestly for any woman with that topic
on her mind. It is paid if answering it requires knowing her. That break is a fact about the spread,
not a pricing decision.

⛔ **A free position is spent.** The paid reading never re-reads a position the email already read.
*(07's rule, already measured — carried over deliberately.)*

⭐ **Waite sanctions the split.** §3.8 — the general draw is *"recommended when no definite question
is asked."* The Celtic Cross is for when *"he wishes to know what may befall within a certain time,
[which] should be clearly specified before the cards are shuffled."* Free is the no-question mode.
Paid is the named-question mode. Same book, 1911.

⭐ **And the depth split too.** Waite: *"run through the cards quickly, so that the mind may receive a
general impression… and afterwards start again, reading them one by one and interpreting in
detail."* The daily is the quick run. The paid reading is one by one. That is what makes it a
different job rather than a longer version of the same one.

---

## 2 · Buyer-specific draw and intake

The morning’s face-up cards remain fixed. Draw the paid positions separately for each buyer/order,
then persist the exact cards and orientations once. Report retries, audio, and resends reuse that
saved draw. Independent draws can coincide by chance; uniqueness across all buyers is not promised.

The personal card is separate from the spread. It supplies a lens, never an extra position.
Collect first and last name in booking and confirm the delivery email at checkout. No additional
question box is in the current scope.

---

## 3 · Her name, and the empty seat

Collect **first and last name** on the booking page. Both are required.

Her personal card is a **lens**: its meaning informs how Marcus interprets the buyer’s paid cards.
It does not sit in the spread or replace one of the drawn cards.

**Pythagorean values, A=1…Z=8 wrapping every nine letters. Sum the full name, reduce to one digit;
11, 22 and 33 stand.** That is her Expression number, and the Major Arcana are numbered 0–21, so the
number *is* a card:

```
1 Magician · 2 High Priestess · 3 Empress · 4 Emperor · 5 Hierophant
6 Lovers · 7 Chariot · 8 Strength · 9 Hermit · 11 Justice · 22 The Fool
```

Three uses, in order of weight:

| | |
|---|---|
| ~~Significator~~ | ⛔ **RETIRED 2026-09-09.** Her card is a LENS, never a position — never "in the middle", never "read around it". The Celtic Cross is excluded from the roster for the same reason (`SPREADS.md`) |
| **Lens** | The same quiet reads differently around a Hermit than around an Empress. This is how one topic yields genuinely different readings for different women on nothing but a name |
| **The appearance** | When her own card turns up in the drawn spread. Rare, unfakeable, and the thing people screenshot |

⭐ **Deterministic and permanent.** The same name gives the same card forever. She is a Hermit once
and a Hermit next time — a relationship, not a transaction.

⛔ **Use Aiden's existing hardened numerology engine.** One function, one source of truth. If the
same name ever yields two different numbers across two readings, that is a credibility hole that
cannot be patched afterwards.

⛔ **Marcus is not a numerologist.** He uses the name to work out which card is hers, then he reads
tarot. The moment he explains what a 7 *means*, he is doing Aiden's job and both personas blur.

⚠ **Married or maiden name — do not ask.** Read the name she gives. Marcus says so once: *"I read
the name you use. That's the one you answer to."*

---

## 4 · The plumbing

```
email link    → stable edition reference (topic, spread, fixed free cards, copy version)
booking page  → same edition; POST first/last name into private unpaid intake
payment       → verified order reference; server-side $35 + optional $12.77
paid order    → saved buyer-specific paid draw + separate personal-card lens
Upsell 1      → optional audio entitlement linked to the same order
thank-you     → purchased items, status and approved delivery details
n8n           → saved order/draw/lens → written report → optional audio → delivery
```

Use an immutable edition/version rather than today’s date or a reusable topic slug alone. Keep
unpaid intake separate from paid orders. Store private content in our own records; payment metadata
carries references. [DATA-CONTRACT.md](../data/CONTRACT.md) defines the initial local contract.

---

## 5 · Card meanings — the anchor

[`reference/pictorial-key-to-the-tarot-waite-1911.txt`](../reference/pictorial-key-to-the-tarot-waite-1911.txt)
— Waite's own book, published with the deck, public domain. Use it for **what is painted on each
card** and **what Waite says it means**. It anchors the cards, not the spread.

⚠ It does not anchor the voice. Waite's prose is archaic and his divinatory meanings are often bare
word-lists. Take the pictures and the meanings; leave the register.

---

## 6 · Offer decisions and remaining work

- [x] Main reading: **$35**, one purchase, no tiers.
- [x] Booking-page speed upgrade: **+$12.77 for delivery within 12 hours instead of 24 hours**.
- [x] Upsell 1: **audio recording of the personalized spread**; same saved draw/report/lens.
- [x] Plan approved: **local testing first**. No production activation or customer sends.
- [ ] Main written format, delivery method and standard timing.
- [ ] Same-day timezone, cutoff and late-purchase handling; audio delivery timing separately.
- [ ] Audio price, authorized voice/provider and final narration style; see [audio scope](../upsell-1-audio/SCOPE.md).
- [ ] Resolve name method edge cases before live use: master number 33 has no card mapping above;
      the existing engine’s handling of non-ASCII letters needs an explicit supported-name policy.
- [ ] Archive storefront is outside the current build scope. Existing edition links still need to work.

Track implementation in [FUNNEL-BUILD-CHECKLIST.md](../FUNNEL-BUILD-CHECKLIST.md). Older 07 tiers,
shared paid draws and delivery promises do not override these decisions.

# 03-C1 — Booking page *(Judgement Day)*

| | |
|---|---|
| **Offer** | 03 Judgement Day — **ACT** · pay-what-you-want · three nights · needs a reply |
| **Voice** | ⚠ **the BUYER's**, first person. Evelyn is named in the third person and never speaks |
| **Price model** | `S5b` PWYW + clamp. The `$300 → $250 → what you can afford` collapse lives **here**, not in the letter |
| **Patches** | **P1** intake instruction (ACT offers) · **P2** reason-why at statement 6 · **P3** CTA completes a sentence · **P8** · **P9** |
| **Code deps** | `S8` capacity cap (statement 4 is a promise only code can keep) · `S29`–`S31` intake queue, alarm triage, 30-day delete — **live before the first order lands** |
| **Component** | [00e §3](../../docs/00e-FRAMEWORK-BEs.md) |

---

## Header

**Judgement Day — your booking**

*By requesting this working you agree to the following:*

---

## The six statements

<!-- STATEMENT 1 · P8 — affirm the READER was right. The cheapest rung -->

**Yes — you read me correctly, Evelyn.**

There is an account open, I know exactly whose it is, and I have been carrying it a long time.

<!-- STATEMENT 2 · ACT offers swap this to AUTHORISE AN INTERVENTION, not request a reading -->

**Yes — I give Evelyn Cross permission to close it on my behalf.**

To make the Entry in my name, move the weight off me, and rule the line. I understand that what she
closes is **my side of it**, and that I am not asking for anything to be done to anybody.

<!-- STATEMENT 3 · accept its weight -->

**Yes — this is skilled work and I am not treating it lightly.**

A closed account does not reopen. I am asking for this because I want it finished, not because I
want it revisited.

<!-- STATEMENT 4 · accept scarcity. ⚠ Requires S8 or the line is a lie -->

**Yes — I understand she holds one account at a time.**

There are only as many of these in a week as there are nights in it, and fewer in practice. If the
week is spoken for, this page closes until it isn't.

<!-- STATEMENT 5 · ACT offers cite the RITUAL'S OWN DURATION, not preparation time -->

**Yes — I understand this takes three nights and cannot be hurried.**

The Entry, the Transfer, the Closing — one a night. A debt entered and closed the same night is not
closed. My record reaches me after the third night.

<!-- STATEMENT 6 · P2 — a PWYW rung asserts nothing unless it carries a reason-why -->

**Yes — I understand why Evelyn sets no price for this.**

A debt settled with money has been *bought*, not closed, and I would be swapping one open account
for another. So I will give what I am able, and **it will not change what she does.** She does not
work harder for more or less carefully for less; the three nights are the three nights.

*Others pay $300 for a working of this length, and she has been urged to hold it at $250 to keep
it exclusive. She has declined to. I will contribute what is right for me.*

**I will give:** `[ amount field — PWYW, clamped per S5b ]`

---

## The request

<!-- STATEMENT 7 · her voice, ending on the brief's PROMISE -->

Evelyn — you have my say-so.

Open my page, make the Entry, and **take this off my hands.** Move it off my name, rule the line
under it, and seal it so it does not come back.

I am not asking you to make me happy about it and I am not asking for an apology I am never going
to get.

I am asking to put it down —

so that I get into bed and nothing comes up.

<!-- P1 · THE NINTH ELEMENT. ACT offers cannot be fulfilled without the reply.
     Placed directly above the button, in her voice like everything else. -->

### And I understand what happens next

**After I confirm, I will reply to Evelyn's email** and tell her who it is, what they did, and how
long ago. In my own words, at whatever length it comes out.

I understand that reply **is the Entry** — it is the first of the three nights, not paperwork — and
that she cannot begin without it.

<!-- STATEMENT 8 · P9 — the free gift is RECEIVED and thanked for BEFORE it arrives -->

And I understand that with the closing she will send me **Nine Nights of Water** — the nine-night
practice for the days when the change is still private, and I would otherwise be lying awake
wondering whether anything had happened at all.

Thank you, Evelyn. I'll keep to it properly.

---

`[03-C3 — the order bump renders here]`

---

## The button

> ### TAKE THIS OFF MY HANDS

<!-- P3 · the button completes statement 7's own sentence -->

**Under the button, small:** *One payment, whatever you choose. Nothing recurring. Reply to the
confirmation email to begin.*

---

## Build notes

- **Statement 2 is where READING and ACT diverge.** 02 grants permission to *draw*; 03 grants
  permission to *close on her behalf* — and it carries the compliance position inside the buyer's
  own words: *"what she closes is my side of it, and I am not asking for anything to be done to
  anybody."* Having the buyer assert that is worth more than any disclaimer, and it is the sentence
  to point at if this offer is ever questioned.
- **P2 is the most important patch on this page.** *"I will contribute what I am able"* asserts
  nothing — no proposition, so the rung collapses exactly where the ladder should be strongest.
  The reason-why gives her something to *agree to*, and the load-bearing clause is the last one:
  at a blank amount field her live question is *how much, and will less get me less?* Statement 6
  answers it in the same breath.
- **The anchor is set in her voice, in italics, after the reason** — not before it. Leading with
  $300 makes the page a negotiation; leading with *why there is no price* makes the anchor a piece
  of context she is repeating rather than a number she is resisting.
- ⚠ **Statement 4 is a code dependency (P4).** *"If the week is spoken for, this page closes"*
  requires `S8`. Build it or cut the sentence — a scarcity claim the software doesn't honour is the
  one lie on this page a buyer can actually catch.
- ⚠ **P1's placement is deliberate and must not move below the button.** 03 cannot be fulfilled
  without the reply. If she doesn't know that before paying, you are holding a paid order you cannot
  fill, and *"product not received"* is the dispute code you lose. It is also framed as **the first
  night** rather than as admin, which turns the only friction on the page into part of the product.
- **The free gift is thanked for before it arrives (P9)** and is described by its *job* — something
  to do during the private window — rather than neutrally. ⚠ Binding on `03-P3` and on the +24h
  nudge, which already promised this exact shape.
- **The page never says "buy."** Booking, permission, request, close, take.
- ⚠ **"Nine Nights" is unresolved against 05.** Logged at `00-TODO`; 05 isn't written this pass.

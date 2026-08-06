# 04-C1 — Booking page *(The Turn)*

| | |
|---|---|
| **Offer** | 04 The Turn — READING · ladder `$35 → $47 → $57 → $67` · 24h · **no reply needed** |
| **Voice** | the BUYER's, first person. Evelyn in the third person |
| **Price** | ⚠ **statement 6 carries `{{TODAYS_RUNG}}`, resolved server-side (`S9`). Never hard-code** |
| **Self-diagnosis** | the three cup patterns (§10) sit **after** statement 8 — see below |
| **Component** | [00e §3](../../docs/00e-FRAMEWORK-BEs.md) + §3a |

---

## Header

**The Turn — your booking**

*By booking this turning you agree to the following:*

---

## The six statements

<!-- STATEMENT 1 · P8 -->

**Yes — you had it right, Evelyn.**

The bird is the part I already knew and hadn't said out loud. Now show me where it all sat.

<!-- STATEMENT 2 · grant permission. The BIG IDEA in her voice -->

**Yes — I give Evelyn Cross permission to turn my cup.**

I have the leaves. What I don't have is the cup they landed in. I understand that the positions are
a separate reading from the symbols, and that the positions are the part with the timing in them.

<!-- STATEMENT 3 · accept its weight -->

**Yes — this is skilled work and I am not treating its instructions as suggestions.**

If the sequence tells me to be quiet in a particular week, then I intend to be quiet in that week.
That is what I am paying for.

<!-- STATEMENT 4 · accept scarcity — 04's is the DECAY, not a counter. No S8 dependency -->

**Yes — I understand my leaves are drying.**

The symbols keep. The positions don't, and it is the positions I'm buying. A cup read today is dated
to the day; a cup read next month is dated to the fortnight.

<!-- STATEMENT 5 · effort + SLA -->

**Yes — I understand the turning takes a night's work and reaches me within 24 hours.**

<!-- STATEMENT 6 · price, with §3a's REASON-WHY for the ascent -->

**Yes — I agree to pay a one-time sum of `{{TODAYS_RUNG}}` for this.**

And I understand why today's is what it is: a soft cup is an evening's work and a dry one is an
evening and a morning, worked leaf by leaf backwards to where each one sat. I am paying for the
night it takes, and the night it takes is decided by the leaves rather than by how long I thought
about it.

---

## The request

<!-- STATEMENT 7 · ends on the brief's PROMISE -->

Evelyn — you have my cup and my seven.

**Turn it.** Give me the twenty-one days: which week is the quiet one, which week the bridge is for,
how old the bird is and how much of it is recoverable.

Tell me when to speak and when not to —

so that I stop guessing what to send.

<!-- STATEMENT 8 · P9 — the free gift received and thanked for BEFORE it arrives -->

And I understand you will also send me **the rim calendar** free of charge — my twenty-one days on
one page, the quiet weeks and the speaking weeks marked, to put somewhere I'll see it on a bad
evening.

Thank you, Evelyn. That's the part I'll actually use.

---

## Which cup is yours?

<!-- §10 · SELF-DIAGNOSIS replaces personalisation. 04 gets no reply, so this buys precision
     with zero data — and it is placed AFTER the yeses so it never functions as a gate. -->

*One last thing, and it changes the reading. Choose the one that sounds like the last three weeks:*

**☐ The Turned Handle** — *he answers, but flat.* He replies, more or less promptly, and there is
nothing in it. No warmth and nothing to complain about either.

**☐ The Divided Rim** — *hot and cold.* Some days he is entirely himself with me and some days I
could be anyone. I can't find the pattern and I have looked for it.

**☐ The Sunken Leaf** — *silence.* It has gone quiet and stayed quiet, and I am now the one who
starts everything or nothing happens.

---

`[04-C3 — the Still Cup bump renders here]`

---

## The button

> ### TURN MY CUP

**Under the button, small:** *Paid once, today's rung, nothing after it. Your twenty-one days are
with you inside 24 hours, and you don't need to send me a thing.*

---

## Build notes

- ⚠ **`{{TODAYS_RUNG}}` is a merge field and this is a copy/code coupling (§3a).** A hard-coded
  number here breaks silently for anyone arriving from a day-3 email. `S9` resolves it server-side.
- **Statement 4 is scarcity derived from the mechanic, and it needs no `S8`.** 03 and 05 claim
  capacity and therefore need a cap built; 04 claims *decay*, which is a fact about leaves and needs
  no code at all. It is also the only scarcity in the deck a buyer can verify against her own
  kitchen.
- **Statement 6 is the ladder's whole defence and it is in her voice.** *"I am paying for the night
  it takes, and the night it takes is decided by the leaves rather than by how long I thought about
  it."* Having the buyer articulate that the rise is craft rather than punishment is worth more than
  any amount of Evelyn explaining it, and it is the sentence that stops a day-4 buyer feeling
  penalised.
- **The self-diagnosis sits BELOW statement 8, not above statement 1.** §10 specifies three named
  cup patterns so 04 gets precision with no intake; placing it after the yeses keeps it a
  *contribution* rather than a qualifying form. ⚠ It must be optional in code — a woman who picks
  nothing still gets a reading, defaulting to The Divided Rim (the brief's stated problem is
  hot-and-cold).
- **"You don't need to send me anything" appears under the button** because it is 04's genuine
  differentiator against 03 and 05, and the last line before a click is where friction gets removed.
- **The free gift is thanked for by its job** — *"the part I'll actually use"* — not described
  neutrally (P9). ⚠ Binding on `04-P3` and the +24h nudge.

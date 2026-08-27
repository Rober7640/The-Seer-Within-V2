# 04-E6 — Abandon nudges *(+1h and +24h)*

| | |
|---|---|
| **Fires on** | clicked a booking-page CTA in `04-E2`, no order after the window |
| **Links** | `{{BOOKING_URL}}?c=71` (+1h) · `?c=72`, `?c=73` (+24h) |
| **Cap** | two. Nothing after the +24h |

⚠ **Interaction with the ladder.** `04-E5a/b/c` runs for women who read the letter and never
reached the page; these two run for women who reached it. If a woman qualifies for both,
**suppress the day-2 ladder email** — she should not get a nudge and a ladder email inside the same
evening. Total contact for any one woman stays at four.

---

## +1 hour

**Subject** 🍵 %FIRSTNAME%, your cup's still on the table
**Preheader** Nothing's turned yet. It takes a minute to say yes.

%FIRSTNAME% —

You came to the page and then didn't say yes.

There's no case left to make, dear — you've read the whole cup and I held nothing back. I only want
to know whether that was a decision or the day getting away from you, because they look the same
from here and only one of them should be left alone.

If you looked at it properly and it's a no, then it's a no and I won't ask twice.

If it was the day — [your cup is still sitting here]({{BOOKING_URL}}?c=71), still soft, and it takes
about a minute.

— Evelyn

---

## +24 hours

**Subject** 🍵 %FIRSTNAME%, I think I know where you stopped
**Preheader** And it wasn't the money. About the waiting.

%FIRSTNAME% —

One more thing about your cup, and then that's me finished.

I've been thinking about which part of this you stopped at, and I don't think it was the reading.
I think it was that you already know what the sequence is going to say.

It's going to say *wait*.

Not the whole time, and not passively — there's a week in there where you speak, and a week where
the bridge gets built properly. But the first instruction in almost every turned cup I have ever
read for a woman in your position is some version of *not yet*, and you have worked that out, and
the thought of being told to wait when you are already unable to sleep is genuinely worse than not
knowing.

I understand that better than you'd think.

So let me say the useful part now, in case you never buy a thing from me.

**Waiting without a date on it is unbearable. Waiting with a date on it is just a Tuesday.**

That's the actual product, %FIRSTNAME%. Not the instruction to wait — anybody can tell you to wait,
your friends have been telling you to wait, and it doesn't help because it has no end on it. What
the turned cup gives you is *how long*, and how long turns an open-ended ache into a thing you can
mark off.

One thing I left out of the letter deliberately. Name a gift while you're still selling and it
reads as a bribe, so I keep it back.

With the turning I send **the rim calendar** — your twenty-one days on one page, with the quiet
weeks and the speaking weeks marked on them. Not a document to study. A thing to put on the inside
of a cupboard door, so that on a bad evening you can look at it and see that it is day nine and day
nine is a quiet one, and go to bed.

That is what turns the waiting into a Tuesday. It's yours with the reading.

[Both are here]({{BOOKING_URL}}?c=72).

And a no is a no. I'd sooner the money stayed in your pocket than went on an evening you were
unsure about. This is the last you'll hear from me about the cup.

— Evelyn

P.S. Your leaves are already lifting, so if you're going to, this week reads better than next.
Nothing dramatic — it's just easier to date a soft cup. [Here]({{BOOKING_URL}}?c=73).

---

## Build notes

- **The +24h names the real objection**, as 03's does, but a different one: 03's buyer balks at
  *writing it down*, 04's balks at *being told to wait*. Both are derived from the offer's own
  mechanism rather than from a generic price objection, and neither re-argues the letter.
- **"Waiting without a date on it is unbearable. Waiting with a date on it is just a Tuesday"** is
  the sharpest statement of 04's value proposition anywhere in the offer, and it belongs here rather
  than in the letter — the letter has to sell the reading, and this has to sell the *relief*.
- **The free gift is held to the +24h**, as in 02 and 03. ⚠ **Binding on `04-P3`**: the rim calendar
  is 21 days on one page with quiet and speaking weeks marked, meant to be pinned up rather than
  read. Change the deliverable and this email changes with it.
- ⚠ **Corrected at draft: the gift here is the rim calendar, NOT the Still Cup.** An earlier version
  of this paragraph gave away the Still Cup — which §4a assigns as 04's **paid $12.77 bump**. The two
  are deliberately adjacent rather than identical (§4 rule 1): the reading and its calendar tell her
  *what to send and when*; the Still Cup handles *what she does in the hours between*. Selling one
  and giving away the other is the whole distinction, and inverting it collapses the bump.
- **The P.S. carries the decay** at its gentlest, which keeps the nudge consistent with the ladder a
  woman may also be receiving without repeating its argument.
- **The +1h is the deck's third instance of the decision-or-interruption device.** The *device*
  repeats deliberately — four sentences of mechanics with no argument in them, and inventing a worse
  one in two offers to avoid a rhyme would cost more than the rhyme does. ⚠ **The wording must not.**
  A draft of this file and `03-E5` carried the identical sentence *"If it was a decision, close this
  and I'll say no more"*; `copy-check` caught it and both were rewritten. Re-check this line
  whenever any nudge is edited — it is the deck's most collision-prone paragraph.

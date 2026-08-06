# 02-E6 — Abandon nudges *(+1h and +24h)*

| | |
|---|---|
| **Fires on** | clicked a booking-page CTA in `02-E2` or `02-E3`, no order after the window |
| **Suppress** | buyers, obviously — and anyone who has since bought any backend offer |
| **Cap** | two. Nothing after the +24h. The last line promises that, so the automation has to honour it |
| **Links** | `{{BOOKING_URL}}?c=31` (+1h) · `?c=32`, `?c=33` (+24h) |

Both are short by design. She has already read fifteen hundred words and stood on the page. A
third argument is not what's missing — the ask is.

⚠ **No deadline, in either.** The only trigger is a thing *Evelyn* does ("then I'll leave it
alone"), which is a behaviour, not a date, and the automation must actually do it.

---

## +1 hour

**Subject** 🕯️ %FIRSTNAME%, you stopped at the door
**Preheader** Your twelve are still face-down on the cloth.

%FIRSTNAME% —

You came to the page and then you didn't say yes.

I'm not going to make a case at you again, dear. You've read the letter; you know what the three
cards said. I only want to make sure it was a decision and not a distraction, because those look
identical from where I'm sitting and only one of them is worth respecting.

If it was a decision, close this and I'll say no more about it.

If it was the kettle, or a child, or the day simply taking you — [your twelve are
here]({{BOOKING_URL}}?c=31), still face-down, and it takes about a minute.

— Evelyn

---

## +24 hours

**Subject** ⚡ %FIRSTNAME%, one more word about the Tower
**Preheader** Then I'll leave it alone, I promise.

> **Swap the opening block by which letter she clicked.** Same email otherwise — the two
> variants exist so the callback lands on the card she actually read.

### Variant A — she clicked from `02-E2` *(the Tower)*

%FIRSTNAME% —

One more word about your third card and then I'll leave it alone.

The Tower isn't a punishment, dear, and I'd hate for you to have read it that way. Two good cards
and a warning is not a bad draw. It's a *warned* one — which is the better of the two hands you
can be dealt, and most women never get it.

The warning is the gift. It's only worth something while there's still time to turn and face the
right direction.

### Variant B — she clicked from `02-E3` *(the Moon)*

%FIRSTNAME% —

One more word about your third card and then I'll leave it alone.

I said the Moon turns up for a woman with too little light and too much at stake, and that some
of what you've worked out in the dark is exactly right.

I meant it. You're not imagining things, dear. You're guessing with real stakes on the table,
which is a different problem entirely, and it doesn't get better by waiting for him to be clearer.

### Both variants continue here

There's also something I didn't mention in the letter, because I don't like leading with a gift.
It makes the reading sound as though it needs the help.

With your twelve I send a second thing. I call it the attention ledger, and it runs for
twenty-eight nights after the reading lands — four turns of seven.

One line a night before you sleep. Not what you felt. What you *noticed*.

On the fifteenth night you read the first fourteen back in one sitting, and whatever has
repeated three times is not a coincidence. It's the house the spread was pointing at all along,
and you'll have found it in your own handwriting.

The reading tells you what's coming, dear. The ledger is how you catch it arriving.

[Both are here]({{BOOKING_URL}}?c=32).

And if the answer is no, it's no — I'd far rather you kept your money than spent it on a night
you weren't sure about. I won't write to you about this again.

— Evelyn

P.S. If it helps: nothing in the twelve is laid until you say so, and the whole thing takes a
minute to authorise. [Here]({{BOOKING_URL}}?c=33).

---

## Build notes

- **The +1h does not re-sell.** It names the two reasons a person leaves a checkout — a decision,
  or an interruption — and gives the decision its dignity. That's the only device in it.
- **The free gift is held back for the +24h** and never appears in the letters. A gift mentioned
  in the pitch reads as a sweetener; a gift mentioned after the pitch reads as a reason.
- **The gift copy here is binding.** `02-P3` (group D) must write the attention ledger to exactly
  this shape — 28 nights, four turns of seven, one line a night, the fifteenth-night read-back.
  If group D changes the shape, this email changes with it.
- **"I won't write to you about this again" is a real promise.** It's also the strongest line in
  the email. Wire the suppression before this sends, or it's a lie the list will notice.
- ⚠ Do not add a third nudge. The cap is what makes the second one credible.

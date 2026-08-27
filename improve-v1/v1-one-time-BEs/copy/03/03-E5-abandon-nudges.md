# 03-E5 — Abandon nudges *(+1h and +24h)*

| | |
|---|---|
| **Fires on** | clicked a booking-page CTA in `03-E2`, no order after the window |
| **Suppress** | buyers, and anyone who has since bought any backend offer |
| **Cap** | two. Nothing after the +24h — the last line promises it, so the automation has to honour it |
| **Links** | `{{BOOKING_URL}}?c=51` (+1h) · `?c=52`, `?c=53` (+24h) |

⚠ **No `03-E3` v2 letter exists**, so unlike `02-E6` there is **one variant of each**, not two.
Nothing to branch on.

⚠ **03's abandon has a cause 02's doesn't have**, and the nudges are built around it. 02's buyer
hesitates over money or belief. 03's hesitates because the next step is *writing down the worst
thing anybody has done to her, in her own words, to a stranger*. That is a real and reasonable
thing to balk at, and a nudge that ignores it is arguing with the wrong objection.

---

## +1 hour

**Subject** 🕯️ %FIRSTNAME%, you got as far as the page
**Preheader** Nothing's written yet. It only takes your say-so.

%FIRSTNAME% —

You came to the page and stopped.

There's nothing left for me to argue, dear — you've read it and you know what I found.
I only want to be sure it was a decision, because a decision and an interruption look identical
from where I sit and only one of them deserves to be left alone.

If you weighed it and said no, leave it there. I won't raise it again.

If it was the day taking you, [the page is still open]({{BOOKING_URL}}?c=51), and nothing goes in
the book until you say so.

— Evelyn

---

## +24 hours

**Subject** 🌙 %FIRSTNAME%, one more thing and then I'll stop
**Preheader** About the nine days, and what comes with it.

%FIRSTNAME% —

One more thing, and then the subject is closed.

I think I know where you stopped, and it wasn't the money.

It's that I asked you to write it down.

You got as far as the page and then thought about actually typing it out — the name, what they did,
how long you've been carrying it — and something in you went *no*. Possibly you have never written
it anywhere. Possibly you have never said the whole of it out loud to anyone, in order, without
softening the middle.

I want to tell you two things about that, and then I'll go.

**The first is that the reluctance is the symptom.** A debt that's easy to write out was mostly
settled years ago. The ones that stick in the throat are the ones still charging interest, and the
fact that yours won't come out easily is the clearest evidence I have that it needs closing.

**The second is that you are not writing it for me.** I know how that sounds given that you'd be
sending it to me — but the Entry is the first of the three nights, and the work in it happens on
your side, when a thing that has only ever existed as a feeling gets set down as a fact with a date
on it. What I do afterwards depends on it. It does not improve it.

Write it badly. Write it in the wrong order. Nobody is marking it.

There's a part of this I kept out of the letter on purpose. Anything named in a pitch reads as a
sweetener, so I hold it back until the pitch is over.

With the closing I send a practice I call **Nine Nights of Water**. It runs for the nine nights
after your page is sealed, and it is the smallest thing in the world: a glass of water on the sill
before bed, and in the morning it goes out — on the earth, down the drain, out the window, wherever
you like. Nine nights, then you stop.

Those first nine days are when the change is private — before anything is visible, when you'd
otherwise be lying there wondering whether anything happened at all. The water gives your hands
something to do while your evenings go quiet.

That's what it's for. Something to do with the waiting.

[Your page is here]({{BOOKING_URL}}?c=52).

And if it's no, let it be a clean no. Better the money stays where it is than goes on a night you
doubted. You won't hear from me on this again.

— Evelyn

P.S. Nothing is entered until you send me the words, and nothing is charged twice. If you want to
sit with it a week longer, sit with it — the account has been open for years and it will keep for
another seven days. [It's here when it's time]({{BOOKING_URL}}?c=53).

---

## Build notes

- **The +1h is 02's shape and that is deliberate.** Two reasons a woman leaves a checkout — a
  decision or an interruption — and the decision is given its dignity. It is the one place in the
  deck where a device repeats across offers, and it survives because it is four sentences of pure
  mechanics with no argument in it. ⚠ Flag it at the corpus pass and keep it anyway; the wording is
  different throughout, and the alternative is inventing a worse device to avoid a rhyme.
- **The +24h names the real objection instead of re-selling.** *"I think I know where you stopped,
  and it wasn't the money."* 02's +24h re-argues the Tower; 03's does something structurally
  different, because 03's abandon has a structurally different cause. This is the single most
  important line in either nudge.
- **The reluctance is reframed as evidence**, which is the same move the letter makes with anger —
  the symptom proves the diagnosis. It also cannot be argued with, which is what you want in a
  nudge nobody asked for.
- **The free gift is held to the +24h**, as in 02, and never appears in the letter. ⚠ **This copy is
  binding on `03-P3`**: Nine Nights of Water is nine nights, a glass on the sill, out in the morning,
  covering the private window before signs become visible. Change the gift and this email changes
  with it.
- ⚠ **"Nine Nights" collides with 05's sealing practice** (`00-TODO` corpus finding). 05 is not
  written this pass, so the collision is **unresolved and logged, not fixed** — whichever offer is
  written second must rename. 03 has the stronger claim on it: the nine days are already load-bearing
  in the letter (*"you start sleeping again inside the first nine days"*) and in the product's Ledger
  of Signs (days 1–9 private).
- **The P.S. removes the deadline rather than adding one** — *"it will keep for another seven days"*.
  A woman being nudged twice about her worst memory needs the pressure taken off, not applied, and
  a letter whose whole premise is *this has been open for years* cannot credibly claim it expires
  tonight.
- **"I won't write to you about this again" is a real promise.** Wire the suppression before this
  sends. ⚠ Do not add a third nudge; the cap is what makes the second credible.

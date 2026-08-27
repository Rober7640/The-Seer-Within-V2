# 04-E5a/b/c — The ladder emails *(days 2, 3 and 4)*

| | |
|---|---|
| **Rungs** | day 1 `$35` (the letter) → **day 2 `$47`** → **day 3 `$57`** → **day 4 `$67`** |
| **Resolver** | `S9` server-side. ⚠ **No email carries a number** — the rung lives on the booking page in a merge field |
| **Fires on** | opened or clicked `04-E2`, no order. Suppress on purchase, obviously |
| **Links** | `c=81` (day 2) · `c=82` (day 3) · `c=83` (day 4) |
| **Component** | [00e §3a](../../docs/00e-FRAMEWORK-BEs.md) |

⚠ **The one rule that makes a rising price survivable: the ascent is a consequence of craft, not a
penalty for hesitating.** The cup dries; a later turning is more of Evelyn's night; that is why it
costs more. The source never explains its ladder at all, which is why it reads as a squeeze.

⚠ **These are not three nudges.** `04-E6` runs the +1h/+24h abandon pair for women who reached the
booking page. The ladder runs for women who read the letter and didn't. If both fire, cap the
combined sequence — a woman should not receive five emails in four days.

---

# 04-E5a — Day 2

**Subject** 🍵 %FIRSTNAME%, your leaves have started to lift
**Preheader** Still readable. Just no longer soft.

%FIRSTNAME% —

I looked at your cup again this morning.

The seven are all still there — symbols don't go anywhere, and I said as much in my letter. The bird
is still first, the bridge is still the one doing the work.

What's changed is underneath. The leaves have begun to dry and lift off the porcelain, which is what
they do from about the second day. Not far. They're still where they landed, more or less.

*More or less* is the difficulty, dear. Position is the whole of what you'd be buying, and *more or
less* is not a week. It's a fortnight with a soft edge.

I can still read it clean today. I can work backwards from where a leaf has travelled to where it
sat, and today that's an inference I'd stand behind.

[Let me turn it while I still can]({{BOOKING_URL}}?c=81).

And if it isn't for you, that's a decision and I'll respect it — but don't let it be the thing that
just didn't get done. Those look identical from your end and only one of them is a choice.

— Evelyn

---

# 04-E5b — Day 3

**Subject** 🍵 %FIRSTNAME%, the positions are getting harder to hold
**Preheader** I can still work it backwards. It takes me longer now.

%FIRSTNAME% —

Third day.

Here is where I have to be straight with you about what I'm selling, because this is the point at
which a less honest reader would tell you it's now or never and it isn't.

Your cup is still readable. It will be readable next month. Your seven symbols are permanent and if
you came to me in October I would give you the same seven.

**What's going is the calendar.**

The rim reads days. As leaves dry they climb the porcelain, and a leaf that has climbed two
millimetres has moved through three or four days of the reading. Today I can account for that —
I know how far they've come and I can put them back. By the weekend I'd be estimating, and I don't
sell estimates as dates.

That's the whole of the difference and it's the whole of the ladder. Not that the reading expires.
That the *precision* does, and precision is the product.

There is also the plain matter of the work. A soft cup is an evening. A cup at this stage is an
evening and most of a morning, working every leaf backwards. I'd rather charge for that honestly
than pretend it's the same job at the same price and quietly do it worse.

[Turn it today]({{BOOKING_URL}}?c=82) and you get the weeks.

— Evelyn

---

# 04-E5c — Day 4

**Subject** 🍵 %FIRSTNAME%, this is the last day your cup reads clean
**Preheader** After tonight I'd rather not promise you the weeks.

%FIRSTNAME% —

Last one about this, and then I'll leave you alone.

I'm not going to tell you the offer closes tonight, because it doesn't and you'd be right to
disbelieve me. What I'll tell you is what I'd say if you were sitting at my table.

After today, I stop promising you the weeks.

I'll still turn your cup. I'll still give you the sequence, the bridge and what to do about the
bird. But the dating would come with a caveat — *around this week, give or take* — and I have spent
this entire letter telling you that *give or take* is exactly what ruined it for the woman in my
story. She had good symbols and a wrong Tuesday. I won't sell you a reading that reproduces her
problem.

So: today is the last day I'd put dates in it without hedging them.

And if the answer is no, %FIRSTNAME%, let it be a clean no. You've had four emails from me about a
cup of tea and that is three more than most people get. Keep the money rather than spend it on a
week you were doubtful about.

[If it's yes, it's here]({{BOOKING_URL}}?c=83).

Either way, one thing to take with you, free, because it's the most useful sentence in the whole
reading and you shouldn't have to pay for it:

**The message you haven't sent isn't wrong. It's early.**

Sit on it a few days longer than feels comfortable. That alone will put you ahead of where most
women are in your situation, and you can do it without me.

— Evelyn

---

## Build notes

- **§3a satisfied in every email: the reason precedes the rung, and the rung is never named.**
  Day 2 = the leaves lift. Day 3 = the rim reads days and precision decays. Day 4 = she stops
  promising dates. Each is a fact about leaves that was already planted in `04-E2` beat 14 by a
  person with nothing to gain from mentioning it.
- **The escalation is in specificity, not volume** — the same move `02-E3` makes on the threat.
  Day 2 is vague (*more or less*), day 3 quantifies (*two millimetres, three or four days*), day 4
  names what she will no longer promise. Nothing gets louder.
- ⚠ **Day 3 explicitly refuses the false scarcity** — *"your cup will be readable next month"*. That
  is the single most important sentence in the sequence. It concedes the thing a sceptical reader is
  already thinking, which is what makes the rest credible, and it keeps the offer honest: what
  decays is precision, not availability.
- **Day 4 gives the product's best line away for free.** *The message you haven't sent isn't wrong;
  it's early* is the P.S. of the letter and arguably the most valuable sentence in the offer. Handing
  it over at the moment of the last ask is a genuine gift at the point where a squeeze would be
  expected — and it is the line most likely to bring her back in three weeks when it turns out to
  have been true.
- **The soft close is present in all three** and gets more explicit each day, ending in a clean
  permission to decline. A four-email sequence with no exit reads as pursuit.
- ⚠ **No numbers anywhere.** The rung is `S9`'s, on the page. If a later build hard-codes a price
  into one of these, the ladder breaks silently for anyone who opens an old email.
- **`%FIRSTNAME%` × 1 per email**, at the salutation, plus one mid-sentence on day 4 where the tone
  turns personal. Any more across four consecutive sends reads as automation.

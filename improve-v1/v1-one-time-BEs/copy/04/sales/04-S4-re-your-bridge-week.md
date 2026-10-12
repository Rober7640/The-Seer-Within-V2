# 04-S4 — Sales email 4 · "RE:" follow-up to email 1 · Review draft

**Status:** Review draft — not gated, not built, not in AWeber. 2026-10-11. Operator request: a short
RE: follow-up to `04-S1`.

## Subject — CHOSEN (a), the RE: of email 1's chosen subject (operator, 2026-10-12):

- (a) RE: 🌉 {{ subscriber.first_name | capitalize }}, your bridge week is coming
- (b) RE: 😶 Why does everything you say to him land wrong?
- (c) RE: 🔮 {{ subscriber.first_name | capitalize }}, I saw the week to speak to him
- (d) RE: 🤐 Before you text him again, read this

**Preheader:** The short version, in case it got buried.

---

{{ subscriber.first_name | capitalize }},

I'm writing to you about this a second time, on purpose. If it got buried, here's the short version.

**Your bridge week is coming, and you can't see it yet.**

Somewhere in your next twenty-one days, there are a few days when what you say to him lands as an invitation. A week before them, the very same words land as pressure.

`[IMG: esl-cup]`

*The cup I read for you, with seven shapes circled in red. Number 5, at the lower left, is the bridge. Your bridge week is in it.*

I read a cup with you on my mind, and seven shapes came up in the leaves: a bird pulling away, a broken heart, a withering tree, a boat in rough water, a bridge, a lighthouse and a butterfly. The bridge is the one that decides how this goes.

The photo shows you what's in the cup. It can't show you when. Your reading does. I read where each leaf sits, and turn that into your next twenty-one days:

- The days to stay quiet, and the days to speak.
- Your bridge week, the one message for it, and the evening to send it.
- How long he's really been pulling away.
- How much of what you had is still there to get back.
- A one-page calendar of all twenty-one days, free.

It comes as a PDF by email within 24 hours. You don't need to send me anything, dear.

**[Get your reading here.](https://theseerwithin.com/offers/wiccan/tea-reading?c=91&fn={{ subscriber.first_name | url_encode }})**

Until then, hold on to whatever you're tempted to send him. Sent before your bridge week, it only pushes him further off.

`[BUTTON: Show me my bridge week](https://theseerwithin.com/offers/wiccan/tea-reading?c=92&fn={{ subscriber.first_name | url_encode }})`

— Evelyn

---

## Build notes

- **Angle:** the RE: bump. The opener is Evelyn following up her own email, nothing more: it never
  implies the reader wrote, and it invents no other women. Then it stands alone: the bold claim, the
  photo, the bridge week, the seven symbols, what the reading gives, 24 hours, nothing to send, one
  link, one button.
- **Opener options** (chosen: 1):
  1. "I'm writing to you about this a second time, on purpose. If it got buried, here's the short
     version." ← chosen. True on both counts, and it hands straight to the claim.
  2. "If my note about this got buried, here's the short version."
  3. "There's one thing I didn't say plainly enough the first time, so here it is in one line."
  Not used: "I don't usually send anything twice." We can't vouch that it's true of Evelyn's list.
- **Back-reference rule:** this is the one email allowed to point at another (operator request).
  The pointer is only the opener ("a second time", "if it got buried"); nothing else depends on
  email 1.
- **Self-check moment:** none on purpose. At ~300 words it's a reminder, not a new angle.
- **Links:** `c=91` text link, `c=92` button. No P.S.
- **Counts and checks (2026-10-11):** body 269 words. "Bridge week" 5×. Greps: $ / price 0,
  deadline 0, banned 0, hedges 0, em dashes in prose 0. Back-references 3, all intended: "a second
  time" and "if it got buried" in the opener, "in case it got buried" in the preheader.

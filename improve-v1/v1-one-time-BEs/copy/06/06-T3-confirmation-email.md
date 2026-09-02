# 06-T3 — Confirmation email + wait-filler *(the Wishing Bracelet)*

| | |
|---|---|
| **Offer** | 06 the Wishing Bracelet — black agate + Pixiu, wealth · fixed price `{{PRICE}}` |
| **Sends** | immediately on purchase. **It sells nothing** |
| **Register** | P5 — a real physical wait (**7 business days** to prepare, **1–2 weeks** to arrive after that), not a same-day SLA. Hopeful and patient rather than urgent — `06-E2` already sold her on patience ("give it a season, not a fortnight"), so the wait-filler leans on that instead of arguing something new |
| **Component** | [00e §5](../../docs/00e-FRAMEWORK-BEs.md) |

---

<!-- BEAT 1 · transactional subject, receipt register — see 02-T3's build note on why this is
     deliberately NOT the broadcast hook format -->

**Subject:** Your Wishing Bracelet order is confirmed

**Preheader:** It's being packaged now. Here's what happens next.

---

Dear %FIRSTNAME%,

<!-- BEAT 2 · thanks as her good judgment, in fresh wording — do not reuse 02/03's exact sentence,
     the corpus-wide device-variance check treats that as a reused device -->

Thank you, %FIRSTNAME%. You didn't need much convincing once you understood what this actually
was, and that tells me you already knew your own problem better than I did.

<!-- BEAT 3 · work has already begun — physical packaging, NOT reading-is-being-prepared language -->

Your order is confirmed, and the bracelet is already being put together — the stone, the Pixiu,
the sealed capsule and its paper, boxed the way I described it to you. Nobody is waiting for some
later date to start this. It's happening now.

<!-- BEAT 4 · restate the SLA, exactly as booked on 06-C1 statement 4. Do not soften ("soon") or
     invent a faster number -->

Here's the real timeline, because I'd rather you know it than wonder. It takes **7 business days**
to prepare properly, and then **1–2 weeks** to reach you after that — a real object, made and
posted, not a download that shows up in your inbox by morning.

<!-- BEAT 5 · P6, open a loop before the wait, AND the hard-constraint ask: tell her what signal to
     watch for next (tracking), without inventing a date -->

When it ships, I'll write to you again with the tracking number, so you know exactly what to
watch for and when. Until then there's nothing you need to do — I have your order, and I'm already
working through it.

---

<!-- BEAT 6 · THE WAIT-FILLER. Craft lore about the stone itself, not a fable — chosen because it
     lets the wait argue for itself rather than needing a separate device. See build notes. -->

### While it's being made, one thing about the stone

I want to tell you something about black agate while you wait, because I think it says more than
asking you to be patient ever could.

Agate doesn't form the way most stone does — cut in one piece out of a bigger piece. It forms in
bands, one thin ring of mineral laid down over the last, inside a hollow space in rock, over a
stretch of time nobody alive was there to watch start or finish.

That's not why your seven days exist, dear — those are ours, not the stone's, and I won't dress up
a packing schedule as something older and grander than it is. But there's something I keep coming
back to anyway: the stone in your bracelet was never in a hurry to become itself. It had already
finished waiting long before I ever held it.

If patience is the hard part for you, %FIRSTNAME%, and for a lot of women it is, you're wearing
something that's had a great deal more practice at it than either of us.

---

I'll write again the moment it ships.

— Evelyn

---

## Build notes

- **Structure follows `00e §5` in order**: thanks-as-judgment → work begun → restate SLA → P6 loop
  → wait-filler → sign-off. Matches `02-T3`/`03-T3`'s shape; wording does not, on purpose — see
  next bullet.
- **No sentence reused from `02-T3` or `03-T3`.** The framework spec (`00e §5`) literally quotes
  "thank you for making the right decision and listening to my advice" as the pattern, but
  `copy-check.cjs`'s corpus-wide device-variance pass flags any 8+-word sentence that appears
  verbatim in two offers' files. Every beat here is rewritten in fresh words that do the same job
  instead of copied.
- **No "reading" language anywhere.** This is a physical order: "packaged," "boxed," "prepare,"
  "ships," never "prepared" in the reading sense and never a divination frame.
- **SLA stated exactly as `06-C1` books it** — 7 business days to prepare, 1–2 weeks to arrive —
  matching `copy-check.cjs`'s `OFFERS['06'].sla` regex and the exact number on the booking page's
  button subtext. No "US" qualifier, because the buyer-facing `06-C1` copy she actually saw doesn't
  carry one either (only the internal doc header does).
- **No price anywhere**, matching `02-T3`/`03-T3`'s convention — money isn't restated once she's
  already paid.
- **Tracking mention satisfies the delivery-email tease without inventing a date.** "When it
  ships, I'll write to you again with the tracking number" tells her what signal to watch for
  next; nothing here promises a calendar date the fulfillment side hasn't committed to.
- **The wait-filler is craft lore, not a recast fable** — closer to `03-T3`'s shape (a headed
  reflection, plain prose) than `02-T3`'s (an italicized parable with characters). Chosen because
  06 already has a true, on-theme fact sitting right there in the product itself (agate forms in
  bands, slowly, inside a rock cavity — real mineralogy, not invented), so the wait-filler can
  argue from the object rather than reaching for an unrelated story. It also deliberately does NOT
  claim the geology *causes* the 7-day SLA — that would be dishonest, and the paragraph says so
  outright ("those are ours, not the stone's") before drawing the parallel.
- **Echoes, doesn't repeat, `06-E2`'s "give it a season, not a fortnight" beat** (Rosalind's
  precedent) — same idea (the object rewards patience), different image (the stone's own
  formation, not her story), so a buyer who read the sales letter gets reinforcement, not a
  rerun.
- **This email does not collect or confirm the shipping address.** That happens on the
  post-payment shipping form and on `06-T1` (not yet written) per `06-C1`'s "What happens after
  the button." `06-T3` is a receipt, not an intake screen — no address is named or implied here.
- **No AWeber tag literal asserted.** `03-T3` names its trigger tag (`be-03-judgement-day`);
  `02-T3` doesn't. No tag has been defined for 06 yet (checked `docs/06/*.md` — none exists), so
  this file follows `02-T3`'s precedent rather than inventing one.
- **`%FIRSTNAME%` × 3** — salutation, mid-sentence in the thanks beat, mid-sentence in the wait-
  filler's closing line — per the deck's cadence rule.
- **No CTA, no link, no `{{BOOKING_URL}}`.** This email sells nothing — deck-wide rule, unchanged
  for the first physical offer.
- **Banned constructions avoided:** no "clearing," no "energy field," no "our conversation," no
  hedge words ("usually," "tends to," "may indicate"), no AI tells ("delve," "leverage,"
  "comprehensive"), no horoscope filler. Predictions and facts stated flat.

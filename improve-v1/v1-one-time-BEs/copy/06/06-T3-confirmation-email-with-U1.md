# 06-T3+U1 — Confirmation email, bought the Wishing Bracelet + the Protection Ritual

| | |
|---|---|
| **Offer** | 06 the Wishing Bracelet, main order **+ U1 (Protection Ritual + black lava bracelet)** taken on the upsell screen |
| **Sends** | immediately on purchase, same trigger as `06-T3`, branched on `bumpPurchased`/upsell-accepted state. **It sells nothing** — U2 (Manifestation Bracelet) is a separate, later ask and is not mentioned here |
| **Register** | P5, same as `06-T3` — a real physical wait, hopeful and patient, not urgent |
| **Assumption, flagged not decided:** this email treats both items as **one order, one package, one SLA** (7 business days to prepare, 1–2 weeks to arrive) — the natural read of "she paid once, in one session, for physical objects from the same small operation." `06-U1a`'s own build notes deliberately state **no SLA for U1** because 06's shipping logistics aren't finalized. If U1 actually ships separately (different sourcing, per `docs/06/06-SPEC-wishing-bracelet.md`: main bracelet is "our own sourced unit," U1 is "V1's actual" reused item/vendor), this email is wrong and needs a second SLA line or a split into two emails. **Confirm the real fulfillment path before sending this.** |
| **Component** | [00e §5](../../docs/00e-FRAMEWORK-BEs.md), extended for the two-item case |

---

<!-- BEAT 1 · transactional subject, receipt register -->

**Subject:** Your Wishing Bracelet order is confirmed — both pieces

**Preheader:** Everything you sent for is being packaged now. Here's what happens next.

---

Dear %FIRSTNAME%,

<!-- BEAT 2 · thanks as her good judgment, fresh wording — do not reuse 02/03/06-T3's exact
     sentences, the corpus-wide device-variance check treats an 8+-word match as a reused device -->

Thank you, %FIRSTNAME%. Saying yes to the bracelet was the first good call. Saying yes to covering
the wait before it reaches you was the second, and most people don't think to make it.

<!-- BEAT 3 · work has already begun on BOTH items, physical packaging language only -->

Both are confirmed, and both are already being put together — the black agate, the Pixiu, the
sealed capsule and its paper, and alongside them the lava stone, prepared for the Protection Ritual.
One package, one order. Nobody is waiting for a later date to start any of it.

<!-- BEAT 4 · restate the SLA once, covering the whole order — do not soften or invent a faster
     number; see the flagged assumption in the table above before this ships as-is -->

Here's the real timeline. It takes **7 business days** to prepare everything properly, and then
**1–2 weeks** to reach you after that — real objects, made and posted together, not two separate
waits stacked on top of each other.

<!-- BEAT 5 · P6, open a loop, tell her what signal to watch for next -->

When it ships, I'll write to you again with the tracking number, so you know exactly what to watch
for. Until then there's nothing you need to do — I have both parts of your order, and I'm already
working through them.

---

<!-- BEAT 6 · what the second item actually does, stated plainly — no "energy field," no
     "clearing," matching the deck-wide banned-construction list. Keep it to what U1a itself
     established: the wait is a real gap, the lava stone covers it, nothing more dramatic than that -->

### Why the lava stone, and not just the bracelet

I want to tell you plainly why I offered it, because I never like leaving a "why" unexplained once
you've already said yes.

The Pixiu does exactly what I told you he does, the moment he's actually on your wrist. Nothing
about that has changed. But he isn't on your wrist yet — for these next couple of weeks, he's cargo,
not a guardian. That gap is real, and it's the only thing the lava stone is for. It isn't a bigger
promise than the bracelet's; it's a narrower one, sized to the exact stretch of road between here
and your door.

Once both arrive, you're covered the way I meant from the start. Until then, you're not waiting
unprotected.

---

I'll write again the moment it ships.

— Evelyn

---

## Build notes

- **New file, not a variant of `06-T3`.** `06-T3` stays the base-order-only confirmation for buyers
  who decline U1; this file only sends when U1 was taken. Same engine trigger point, branched
  content — matches how `02` already splits T3 by upsell state (see `02-U2a`'s Path A/B precedent
  for the branching pattern, not the wording).
- **No sentence reused from `02-T3`, `03-T3`, or `06-T3` itself.** Beat 2 says the same *kind* of
  thing (thanks as her own judgment) in different words for both the base decision and the upsell
  decision, so it reads as one continuous thank-you rather than two stitched-together emails.
- **One SLA, stated once, for the whole order** — see the flagged assumption in the header table.
  This is the single biggest thing to verify before this ships: if U1 fulfillment is genuinely
  separate from the main bracelet's, this file overpromises a joined timeline it can't back up, and
  needs a rewrite (either two SLA lines or two emails) rather than a quiet edit.
- **U2 (Manifestation Bracelet) is never mentioned.** She hasn't been asked yet; naming it here
  would presell an offer that hasn't been made and contradicts the deck rule that a confirmation
  email sells nothing.
- **The "why the lava stone" section pulls its ONE claim straight from `06-U1a`'s own established
  gap** ("cargo is not a guardian yet") — deliberately not richer or more dramatic than what she
  already heard and agreed to in the upsell chat. No new claim is introduced here.
- **No "reading" language, no price, no `{{BOOKING_URL}}`, verb never "buy."** Matches `06-T3`'s
  conventions exactly — this is a receipt, not a pitch.
- **Banned constructions avoided:** no "clearing," no "energy field," no "our conversation," no
  hedge words, no AI tells. Deliberately does NOT reuse `SOLUTION`/`LAVA_INTRO`'s V1-inherited
  "energetic shield" framing from `client/src/lib/upsellMessages.ts` — that language is accepted
  inside the shared upsell chat engine (out of scope to rewrite), but a confirmation email is new
  06-specific copy and follows 06's own banned-construction rule, not V1's.
- **`%FIRSTNAME%` × 3** — salutation, mid-sentence in the thanks beat, mid-sentence in beat 5 —
  matching `06-T3`'s cadence.

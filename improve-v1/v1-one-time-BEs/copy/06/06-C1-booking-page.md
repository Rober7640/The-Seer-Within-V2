# 06-C1 — Booking page *(the Wishing Bracelet)*

| | |
|---|---|
| **Offer** | 06 the Wishing Bracelet — black agate + Pixiu, wealth · fixed price `{{PRICE}}` (TBD, see D-decisions) · real shipping SLA |
| **Arrives from** | all six CTAs + P.S. in whichever `06-E2-esl-*` letter is chosen. `?c=` tells us which |
| **Treatment** | Page (Treatment B), matching 02/03's incumbent shape. A chat variant can follow later, same as 02-C1b, once this is proven |
| **Voice** | ⚠ **the BUYER's, first person, throughout.** Evelyn is named in the third person and never speaks on this page — deck-wide rule, unchanged for a physical offer |
| **Written against** | `06-E2-esl-product-creature-a.md` specifically (dragon head/lion body/no-exit language) — the strongest candidate as of 2026-09-02. If a different letter wins, statement 1 and the request need rewording; statements 2, 5, 6 and the shipping consent are candidate-agnostic |
| **Bump** | `06-C3` ("The Closed Purse"), rendered between statement 6 and the button |
| **D1 (root URL)** | ⚠ **proposed, not locked:** `/charms/wishing-bracelet`. Not `/tarot/...` (no cards) or `/wiccan/...` (Pixiu is Chinese folk tradition, not Wiccan) — this offer needs its own namespace. Operator to confirm |

**This is the first time money is mentioned anywhere in the funnel** — unchanged rule. But 06 adds a
statement no other offer has needed: a **real shipping wait**, not a digital SLA. That statement
does as much work here as the price does.

⚠ **The shipping address is NOT collected on this page.** Every other booking page in this deck
collects nothing (nothing to collect — the product is digital). 06 is the first physical item, and
the honest instinct is to bolt an address form onto the commitment ladder — don't. That clutters six
statements that are supposed to feel like a signed record with an e-commerce checkout form, and
there's already a proven pattern for this exact problem: V1's Manifestation Bracelet upsell collects
the address **after** Stripe succeeds (`ShippingForm.tsx`, real address capture, real DB columns,
Stripe metadata, a manual "ship this" operator alert — see `docs/06/0-WORKFLOW-06.md`'s fulfillment
note). Reuse that. The booking page's job stays what every other booking page's job is: get to yes.

---

## Header

**The Wishing Bracelet — your booking**

*By booking this you agree to the following:*

---

## The five statements

<!-- STATEMENT 1 · the cheapest rung — P8. She already believes this; affirming it costs nothing.
     ⚠ Written against creature-a, which has no divination "reading" to be right about — the
     cheapest-rung affirmation here is of her OWN words, echoed back, not Evelyn's accuracy. If a
     reading-led candidate wins instead, revert to "Yes — you were right, Evelyn" (02's pattern). -->

**Yes — that's exactly it.**

Money has reached me before and not stayed. I've said as much myself, more than once, in my own
words. I'm not imagining it.

<!-- STATEMENT 2 · permission — the BIG IDEA, in her voice -->

**Yes — I want the seal, not another reading.**

I understand what's being sent isn't a prediction. It's a container — something built with no way
out, so that what already reaches me stops leaking back before I've had the use of it.

<!-- STATEMENT 3 · accept what's being asked of her — adapted from "done by a professional, not
     taken lightly" into the ritual's own terms, since 06 has no professional-craft framing to
     borrow (nobody performs a reading FOR her; she performs the ritual herself) -->

**Yes — I understand this only works if I do my part.**

I'll write down the one specific thing that got away — not "more money" — and seal it in before I
wear it. I understand a sealed capsule with nothing specific inside it is just a sealed capsule.

<!-- STATEMENT 4 · the shipping SLA — NEW for this deck, and the one no other offer needed.
     ⚠ D3: any promise here needs code behind it or gets cut. 7 business days processing + 1-2 weeks
     US delivery is the source product's own stated timeline — do not invent a faster one to reduce
     friction, and do not soften it into vague language ("soon," "shortly"). Say the real number. -->

**Yes — I understand this is a real, physical object, made and posted, not a file that arrives
tonight.**

It isn't typed and sent. It's prepared and shipped, and I understand that takes **7 business days
to prepare**, and **1–2 weeks to reach me** after that. I'd rather wait for the real thing than get
a fast version of nothing.

<!-- STATEMENT 5 · the price. `{{PRICE}}` is a merge field, not a hardcoded number — pricing is
     still an open D-decision (fixed price, likely, but the number itself is unset). Do not hardcode
     a guess here the way 02 hardcodes $35 — 04's ladder statement uses the same merge-field pattern
     for the same reason: the number isn't settled yet. -->

**Yes — I'll send `{{PRICE}}`, once, and that's the whole of what this costs.**

I understand it's a real object — black agate, a cast Pixiu, a sealed capsule built into it, boxed
and carded — not a download that costs nothing to make, and that it's priced accordingly.

---

## The request

<!-- STATEMENT 6 · her own ask, ends on the brief's PROMISE in her words -->

Evelyn — send me the piece you told me about.

I understand what it does and what it doesn't: it won't put money in front of me that wasn't already
finding its way to me. It keeps what already reaches me from leaking back out before I've had the
chance to close my hand around it.

Send it to me, and I'll do the rest — write my one sentence, seal it in, wear it left.

---

`[06-C3 — the order bump renders here]`

---

## The button

> ### SEND ME THE SEAL

<!-- The button completes the request's own sentence, same as 02's LAY MY TWELVE pattern. Verb
     is "send," not "buy," matching the deck-wide rule. -->

**Under the button, small:** *One payment. Nothing recurring. Ships within 7 business days; reaches
you 1–2 weeks after that. You'll give us your address on the next screen.*

---

## What happens after the button

1. Stripe checkout — price + bump total, exactly as shown.
2. **Success → the shipping form**, reusing `ShippingForm.tsx`'s existing pattern (name, address
   lines, city, state, postal, country) — new screen, not new component. Address + Stripe metadata,
   same as the Manifestation Bracelet flow.
3. Thank-you page (`06-T1-thank-you-page.md`, written 2026-09-02) — a receipt, same archetype as 02/04 (Reading, not Act):
   confirms the order, names the confirmation email's subject, and now **also confirms what she just
   told the shipping form** ("sending it to [address]") so she isn't left wondering if it went
   through.
4. Upsells (`06-U1`/`06-U2`) — per the settled decision, V1's Protection Ritual + Manifestation
   Bracelet, reused verbatim past the opening beats. Real question, not yet settled: does the
   shipping address she just gave carry forward if she takes U2 (which ships its own bracelet)? V1's
   existing Path A/B logic already handles "reuse U1's address" vs. "collect fresh" — check whether
   a THIRD address (from this booking, not from U1) needs the same reuse option, or whether asking
   again here is fine because it's a different item.

---

## Build notes

- **No scarcity statement, on purpose.** 02's statement 4 ("she doesn't lay a twelve on request")
  works because Evelyn's own capacity is the honest scarcity mechanism. A manufactured physical
  object has no equivalent unless we build real inventory tracking, which doesn't exist. Per D3
  ("any promise that needs code — build it or cut the sentence"), this is cut, not faked. Five
  statements, not six.
- **Statement 4 is the load-bearing new one.** Every other offer's "effort" statement sells a wait
  in terms of Evelyn's craft (a night's work, three nights of accounting). This one can't, because
  nobody is working through the night on this — it's manufacturing and post. Framed instead as
  honesty about what a real object costs in time, which is the only honest frame available.
- **`{{PRICE}}` is unresolved on purpose — see `0-WORKFLOW-06.md`.** Do not fill this in with a
  guess. Once a number is set, this becomes a hardcoded statement like 02's, not a merge field —
  merge fields are for genuinely variable prices (04's ladder), and 06's price is fixed, just not
  yet decided.
- **The free gift is undecided and this page has no statement for one.** 02/03/04 all have a `0X-P3`
  free gift referenced in their booking page. 06 doesn't have one specced yet — not an oversight,
  a real open item. If one gets built, it needs its own statement here (matching 02's statement 8
  pattern: received and thanked for before it arrives), inserted before the request.
- **Address collection deferred to post-payment**, matching V1's proven Manifestation Bracelet
  pattern rather than inventing a pre-payment checkout form. This is the single biggest structural
  difference from every other booking page in this deck and the reason this offer needs its own new
  screen (the shipping form) that 02–05 never needed.
- **Statement 1 is candidate-specific.** Written against creature-a's "no reading to be right about"
  problem. If a reading-led candidate (kaucim/iching) ships instead, this reverts to affirming
  Evelyn's reveal, matching 02's actual pattern.
- **No checkboxes, no ticks, no progress counter** — same settled rule as 02-C1. The statements
  themselves are the record.

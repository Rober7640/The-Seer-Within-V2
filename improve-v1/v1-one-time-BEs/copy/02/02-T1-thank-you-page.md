# 02-T1 — Thank-you page *(Twin Flame Tarot)*

| | |
|---|---|
| **Offer** | 02 Twin Flame Tarot — READING · 24h SLA |
| **Archetype** | **READING → the page is a receipt** (P7). Confirm · name the delivery subject · state the SLA · stop |
| **Route** | `S6`, cloned from `SoulmateThankYouPage.tsx` |
| **Voice** | Evelyn's again — the buyer's-voice device ends at the button |
| **Component** | [00e §7](../../docs/00e-FRAMEWORK-BEs.md) |

⚠ **This page sells nothing and it is deliberately short.** She is Schwartz Level 5 and she has
already paid. Headlines, proof and pain-quantification are friction here (§7a).

---

## The copy

<!-- BEAT 1 -->

### Thank you, %FIRSTNAME%.

<!-- BEAT 2 · thanks framed as HER good judgment, not our good fortune -->

You made the right decision, and you made it quickly. That matters more than you know with a draw
like yours — the cards came away on their own, and cards that do that don't wait well.

<!-- BEAT 3 · work begins now -->

I'm starting tonight. The deck comes out after I finish this, and I'll be with your twelve until
they're laid.

<!-- BEAT 4 · exactly what to look for. A named subject line is a deliverability + open-rate device -->

**Watch your inbox.** Your reading arrives within **24 hours**, and it will be titled:

> ### %FIRSTNAME% — your twelve are laid

Nothing else I send looks like that. If it hasn't reached you by this time tomorrow, check the
promotions tab and anything your provider files as spam, then write to me and I'll send it again.

<!-- BEAT 5 -->

I'm on your side in this, dear.

— Evelyn

---

## Conditional block — bump buyers only

<!-- Renders ONLY if 02-C3 was taken. The bump copy promised "I can start it tonight",
     so the instructional has to be in her hands before she leaves this page. -->

**P.S. — Your Astro Force clearing is ready now.**

[Open it here.](#) It's one night's work and it wants doing before the twelve reach you, so that
what I'm reading isn't sitting under anything.

Do it tonight if you can.

---

## Build notes

- **P7 — this is a receipt, not an intake gate.** 02 is a READING: it needs nothing from her but
  the say-so she already gave on the booking page. 03's and 05's equivalents invert this — the
  reply instruction goes **above** the delivery promise there, because the work genuinely cannot
  start without it. Do not copy this page into an ACT offer.
- **The named subject line is load-bearing** and must match `02-P4` exactly. It is how she finds
  the product in a crowded inbox, and it is the single cheapest thing on this page.
- **The bump block is conditional and it is not an afterthought.** `02-C3` says *"I can start it
  tonight"*. If the instructional isn't delivered here, that sentence is false within a minute of
  being agreed to. The ordering line — *do it before the twelve reach you* — also does quiet work:
  it makes the bump feel like preparation for the main product rather than a second product.
- ⚠ **"Cards that do that don't wait well"** is the only urgency on the page and it is
  retrospective — it praises a decision she has already made. Nothing here creates pressure to do
  anything else, because there is nothing else to do.
- **No free-gift mention.** The 28-night ledger is delivered inside the product email as a second
  act (§6c). Announcing it twice spends it twice.

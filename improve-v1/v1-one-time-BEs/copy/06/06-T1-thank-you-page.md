# 06-T1 — Thank-you page *(the Wishing Bracelet)*

*(Renamed from `06-A6` to `06-T1` 2026-09-02 — `06-C1-booking-page.md` already forward-referenced
this screen as `06-T1`, matching 02's and 03's own `0X-T1-thank-you-page.md` convention, so this
file was renamed to match rather than leaving two names for the same screen in the docs. `A6` is
still correct as the build-ORDER step label — see Route below — this rename only fixes the
file/content naming.)*

| | |
|---|---|
| **Offer** | 06 the Wishing Bracelet — physical object, real shipping SLA, fixed price (not restated here — see Build notes) |
| **Archetype** | **READING → the page is a receipt** (P7), per the 2026-09-02 resolution "Reading-shaped funnel, Object-shaped product": the buyer gave no reply anywhere in this funnel, so this is a receipt, not an intake form — contrast 03 (Judgement Day), whose thank-you screen IS the intake because the work can't start without their reply |
| **Route** | `A6` — after `A4`/`A5` (Upsell 1, Upsell 2), the last screen in the money-taking sequence. Reached via `06-C1` → Stripe checkout → the new shipping-form screen (reusing `ShippingForm.tsx`'s pattern) → upsells → this page. No page built yet; closest precedent to clone from is `TwinFlameThankYouPage.tsx` (02's own Reading-shaped receipt) |
| **Voice** | Evelyn's, first person — the buyer's-voice device is `06-C1`-only and ends at that page's button |
| **Component** | [00e §7](../../docs/00e-FRAMEWORK-BEs.md) |

⚠ **This page sells nothing and it is deliberately short** (§7a). The buyer has already paid, and
paid for a physical object, not a reading — a headline, proof, or a second offer is friction here,
and so is anything that sounds like a reading is being prepared for them. Nothing is. A real object is
being packed and shipped, and the page's whole job is to say that plainly, confirm what's coming,
and state the real wait.

---

## The copy

<!-- BEAT 1 · confirms the order itself, not just their name -->

### Thank you, %FIRSTNAME%. The Wishing Bracelet is yours.

<!-- BEAT 2 · thanks framed as THEIR good judgment — echoes their own quoted words from the letter
     (Beat 5 of 06-E2-esl-product-creature-a-close-c.md), same device 02-T1 uses with the cards,
     but grounded in what THEY said rather than a reading being "right" -->

You said it yourself, more than once — that everything appears to be reaching you but doesn't. You
didn't argue yourself out of it once you'd said it plainly, and you didn't sit on it either. That's
exactly right of you, dear.

<!-- BEAT 3 · what's happening now — the load-bearing difference from every reading offer. No
     "I'm starting tonight," no work being done ON their behalf tonight. A physical object, packed
     and posted, stated plainly. -->

I want to say this next part plainly, because most nights with me it's the opposite: nothing is
being read for you tonight. Nobody's laying cards, nobody's writing a page with your name at the
top of it. What's happening now is a real, physical thing — your piece is being made and packed.
The actual bracelet. The actual capsule. Boxed to travel.

<!-- BEAT 4 · order confirmation, receipt-style itemization — matches the letter's Beat 8 "What
     arrives" list, plus the 4-5 blank inserts (packaging spec, D7-equiv in 0-WORKFLOW-06.md,
     never itemized in the letter itself). One line, one item, receipt shape. -->

### What's coming

- The bracelet itself — black agate, the two-horned Pixiu sitting on top of it, the sealed capsule
  built in.
- A small box, built to keep it in.
- A card recording what it is and where it's from.
- Care instructions.
- Four or five blank papers for your sentence, not just the one you'll seal in — so you're not
  stuck if the first try doesn't feel like the right one.

Left wrist when it reaches you. You already know why.

<!-- BEAT 5 · confirms what they just told the shipping form + states the real SLA, word for word
     against 06-C1's own statement 4. Never a new number, never softened into "soon." -->

### Where it's headed, and when

Here's what you gave me on the last screen:

%SHIPPING_ADDRESS%

And here's the timeline — the same one you already said yes to. **7 business days** to prepare it,
then **1–2 weeks** to reach you after that. I'm not going to pretend a real, physical thing moves
faster than it does.

<!-- BEAT 6 · where updates come from. Names 06-T4's actual subject line, per P7: "the email subject
     line shown here must match the product email exactly." Ties the email's timing to the SLA
     already stated above rather than inventing a new one. -->

You'll hear from me again once it's packed and on its way, and it'll be titled:

> ### %FIRSTNAME% — Bixie's on his way to you

That's when the tracking comes, not before. Until then there's nothing to check and nothing you
need to do.

<!-- BEAT 7 · sign-off. Deliberately NOT "I'm on your side in this, dear" — that sentence is 02-T1's
     and was already flagged and fixed as a corpus collision inside creature-a's own letter (see
     0-WORKFLOW-06.md's Third round audit note). Fresh line, same warmth, thematically tied to the
     no-exit mechanism instead of reused verbatim. -->

It's on its way now, dear. The whole point of him is that once a thing reaches you, it doesn't
have to leave again.

— Evelyn

---

## Conditional block — bump buyers only

<!-- Renders ONLY if 06-C3 ("The Closed Purse") was taken. Matches 02-T1's bump-conditional
     pattern, but the tone differs on purpose — see Build notes. -->

**P.S. — you added The Closed Purse too.**

[Open it here.](#) It's one sitting, and there's no clock on this one — do it whenever the evening
is quiet enough to be honest in.

---

## Build notes

- **No dollar amount anywhere on this page**, matching 02-T1's convention exactly (02 never
  restates the $35 it just charged; the receipt confirms the order, not the price). Applies to the
  bump too — the $11.11 line isn't restated here either, same reasoning.
- **No "your reading is being prepared" language, anywhere.** This is the one hard rule this page
  exists to enforce. Beat 3 says the opposite outright — nothing is being read, nothing is being
  written for them — because 06 is the deck's first Reading-shaped funnel wrapped around an
  Object-shaped product, and the easiest mistake here is letting 02/04's receipt language (which
  assumes a reading is what's being made) survive the copy-paste.
- **Beat 5 needs real data plumbing.** `%SHIPPING_ADDRESS%` is the same kind of placeholder
  `%FIRSTNAME%` already is in `TwinFlameThankYouPage.tsx` — resolved from an API call, not an
  AWeber merge token (this page is a React route, not an email). Today's `/api/order/details`
  doesn't return shipping data at all; it will need extending once the shipping-form screen exists,
  the same kind of gap `TwinFlameThankYouPage.tsx` already flags for `bumpPurchased`. **Fallback if
  the address isn't available when this renders:** don't print a broken or blank line — fall back to
  "the address you gave us on the last screen," the same safe-fallback discipline `displayName()`
  already uses for the name (`"Friend"` → `"dear"`).
- **SLA wording matches `06-C1`'s statement 4 on purpose, word for word:** "7 business days" (prep)
  and "1–2 weeks" (transit) are the offer's only sanctioned durations
  (`scripts/copy-check.cjs`'s `OFFERS['06'].sla`). Do not paraphrase into "about a week and a half"
  or "soon" — say the real numbers, same discipline the booking page already commits to.
- **Delivery-email subject line names `06-T4-delivery-email.md`'s real subject, verbatim** — "%FIRSTNAME% — Bixie's on his way to you" — same as 02-T1 naming `02-T4`'s exact subject (P7:
  "the email subject line shown here must match the product email exactly"). If that subject line
  ever changes, this page's Beat 6 must change with it, same coupling 02-T1/02-T4 already have. `06-T4`
  confirms this email states no delivery date of its own ("This email confirms movement, not a
  day"), which is why Beat 5 — not Beat 6 — is where this page's SLA lives.
- **Sign-off is new copy, not reused.** `06-E2-esl-product-creature-a-close-c.md`'s own build notes
  record that "I'm on your side in this, dear" was flagged as a real corpus collision with 02's
  ratified letters and fixed inside the letter itself. Reusing that exact sentence here — on the
  very next screen after that letter's own CTA — would reintroduce the same collision one page
  later. The sign-off written here ("once a thing reaches you, it doesn't have to leave again")
  keeps the warmth but ties back to the no-exit mechanism instead.
- **Bump conditional tone deliberately differs from 02-T1's.** 02-C3 promises "I can start it
  tonight," so 02-T1's conditional block carries urgency ("Do it tonight if you can"). `06-C3` ("The
  Closed Purse") makes no same-night promise — its own copy says "nothing to track after it, nothing
  to keep up" — so the conditional block here doesn't invent urgency the bump copy never claimed.
  ⛔ **Same real gap 02-T1 has, not yet closed:** the instructional itself (`06-C4`-equivalent) isn't
  drafted, and the link has no target. Until both exist, a bump buyer sees a P.S. that goes nowhere —
  the safe failure, not a silent one, same as 02's Astro Force link today.
- **No upsell-purchased conditional block.** `A6` sits after `A4`/`A5` in the build order, but
  02-T1 — the closest working precedent — declares `upsellPurchased`/`upsell2Purchased` in its own
  `OrderData` type and never renders anything from them. Matching that scope rather than inventing a
  new pattern with no precedent to check against; flag for a future pass if the operator wants U1/U2
  confirmed here explicitly.
- **Banned constructions avoided**, same deck-wide list this offer's letter already follows: no
  "clearing," no "energy field," no "our conversation," no hedge words, no AI tells. Confirmed clean
  by `scripts/copy-check.cjs`.

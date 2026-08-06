# 02 Twin Flame Tarot — copy

Pilot offer for the backend deck. Group A is written and **waiting on human review**; B–E are
not started, deliberately — everything downstream reads A's output, so the voice gets ratified
once instead of being inherited wrong by twenty more assets.

| Group | Assets | State |
|---|---|---|
| **A** the letter | [`02-E2`](./02-E2-esl-v1.md) ESL v1 · [`02-E3`](./02-E3-esl-v2.md) ESL v2 · [`02-E1`](./02-E1-subject-lines.md) subjects · [`02-E6`](./02-E6-abandon-nudges.md) nudges | ✅ **ratified** |
| **A** built | [`02-E4-esl-v1-B`](./02-E4-esl-v1-B.html) · [`02-E4-esl-v2-B`](./02-E4-esl-v2-B.html) | ✅ built · ratified |
| **B** the page | [`02-C1`](./02-C1-booking-page.md) booking page · [`02-C3`](./02-C3-order-bump.md) bump | ✅ written |
| **C** follow-through | [`02-T3`](./02-T3-confirmation-email.md) confirmation + wait-filler · [`02-T1`](./02-T1-thank-you-page.md) thank-you | ✅ written |
| **D** the product | [`02-P1`](./02-P1-the-twelve.md) the twelve · [`02-P3`](./02-P3-attention-ledger.md) the ledger · [`02-C4`](./02-C4-astro-force-instructional.md) Astro Force | ✅ written |
| **E** the upsells | [`02-U1a`](./02-U1a-upsell1-opening-beats.md) · [`02-U1b`](./02-U1b-upsell1-bucket-block.md) · [`02-U2a`](./02-U2a-upsell2-path-opens.md) | ✅ written |

**Deterministic gate:** `node scripts/copy-check.cjs copy/02` — 14 files, PASS. Banned vocabulary,
AI tells, hedge words, price/SLA consistency and price-in-a-letter all clean. Device variance can
only run with all four offers in view.

## What group D fixed, and why it matters upstream

The source sells *"The Zodiac Spread — one card per house"* and then assigns **no houses at all**.
That is not a cosmetic gap: `02-E2` promised *"the **house** the Lovers falls into is what
separates them"*, and `02-C1` statement 7 has the buyer ask for all three withholds by name. So
[`02-P1`](./02-P1-the-twelve.md) lays each card to a numbered house and closes the three loops in
specific rooms — the World's door in houses 2 and 8, the Lovers' fork as house 5 against house 7,
the Tower's identity in house 12. ⛔ **Those assignments are now a contract with the letters.**

The product also carries the third-party threat in **eleven of twelve** units (the source has six,
and drops it from the final three where recall is strongest) and **narrows** it across the last
three houses from *people* → *one person's account of you* → *a person you keep going back to* →
*somebody who has already decided*. That narrowing is how 03 gets pre-sold without 03 being
mentioned.

---

## The decisions inside this draft

**1. Evelyn's cadence, the source's structure.** All 17 beats are present and in the specimen's
order, but Madame Delacroix's register is gone — no block capitals, no *WIN*, no exclamation
stacks. Not taste: this list has had months of Evelyn writing to it daily, and a letter that
screams reads as a different sender. The urgency lives in what she says rather than how loudly,
which is also what our own audit found converts (blunt + urgent out-clicks gentle-literary 4–5×).

**2. Read the spread, not the card.** *(operator correction, 2026-08-03)* Meanings come from this
draw and its pairings, not from what an earlier email said about the same card — that's how the
practice actually works. So the World is luck, protection and two windfalls here, exactly as the
source has it, because of the company it's keeping. An earlier draft softened it to "completion"
for consistency with her back catalogue; that was a rule the craft doesn't have, and it cost the
letter its best blessing.

**3. The claims are stated, not hedged.** *Luck is going to favour you.* *The person on your mind
is going to become more attentive toward you than they have ever been.* *It arrives as a person.*
First draft ran these through "usually / tends to / almost never" and it read like a reader who
didn't trust her own deck. The withhold stays — *"which of the two, I can't tell you from a single
card"* is the engine of the offer — but the softening around the claims is gone.

**4. The offer's own name is in the letter now.** The Lovers re-read predicts a twin flame and
sells the twelve as the thing that gives the *day*. The first draft never once said "twin flame",
which is a strange thing for a letter selling the Twin Flame Tarot.

**5. The uninvited act is that she drew at all, not that she drew off-schedule.** *(operator
correction, 2026-08-04)* The first draft had her breaking a one-card-a-day routine — but the daily
tarot series was **retired 2026-07-26**, and what runs now is the reframe deck at 6:30pm SGT. So
the letter now opens on *"I don't draw for people one at a time"* — what she sends most days is
written for everybody, and this isn't. That's a stronger claim than the timing one was, it flatters
the individual, and it's true. v2 escalates it: it has now happened twice, inside a week.

⚠ **This beat depends on a fact about the sending programme.** If the programme changes again,
re-check it before anything ships.

**6. The hero shows the three cards FACE-DOWN.** *(operator correction, 2026-08-04)* The first
render had them face-up, which handed the reader the entire draw before the first sentence and
contradicted the copy — the origin story says they came away *"together, face-down"*. Face-down is
the moment the letter actually describes, and an unturned card is a question. The three card faces
are payoffs; each appears only at its own unit. **This rule generalises to all four offers:** the
hero photographs the mechanic *before* it speaks — 04's cup before it's turned, 03's and 05's altar
before the working.

## Audit record

Ran against the three passes in [00-TODO](../../docs/00-TODO-BEs.md), findings applied.

| Pass | Result |
|---|---|
| Deterministic regexes | 04's banned vocabulary, AI tells and price/SLA leaks all zero in body copy. Deadline and third-party-claim checks **retired** — see below |
| Brief fidelity (`00a`) | 2 findings, both fixed: the big idea's first half (*your future is already drawn*) never appeared; beat 3's required window was missing |
| Framework (`00e` §1–2) | 17/17 beats · first ask at ~62% · 6 CTAs, all permission verbs, none says "buy" · every free-read unit ends incomplete · v2 drops the precedent and compresses the origin as specified |
| Copy mechanics | em-dashes 0.5/paragraph · paragraph length 1–58 words · open loops all closed |

**Rules lifted by the operator, 2026-08-03** — a later pass must not reinstate them:

- *No calendar deadlines.* Lifted. The five-to-seven-day window is back in both letters.
- *Tendencies, not promises.* Lifted. Predictions are stated flat.
- *Continuity with Evelyn's published readings.* Lifted, and it was never a real rule.

**Still live, because they aren't guardrails:**

- *Device variance* — any device used in 2+ offers must vary. Quality rule: the deck sells the
  same woman four times and she'll spot the trick the second time.
- *Em-dashes* — Evelyn's cadence, not an AI tell. Flag only a paragraph carrying two or more.
- *Don't ship copy for a product that doesn't exist* — group D writes the ledger and the bump.

## What this draft makes binding downstream

- **`02-P3`, the attention ledger.** The +24h nudge describes its shape to the buyer: 28 nights,
  four turns of seven, one line a night about what she *noticed*, a read-back on the fifteenth
  night. Group D writes to that or the nudge changes with it.
- **`02-C1`, the booking page.** No price and no SLA appear in any group A asset, so statement 6
  is genuinely the first mention of money — five yeses before the ask, as the framework requires.
- **The suppression rule.** "I won't write to you about this again" is a promise made in copy that
  only the automation can keep.
- **`S11` tracking.** CTA ranges are reserved and must not be reused: `c=1–6` v1, `c=7` the P.S.
  challenger, `c=21–26` v2, **`c=27` the v2 P.S. challenger**, `c=31–33` nudges.

## What the build added on top of the drafts

Both letters ship as **variant B**, which is a *bundle*, not one variable: centred subheads ·
pull-quotes · a three-row recap block before the final CTA · a P.S. The plain
`02-E4-esl-v1.html` has none of the four and stands as the fallback.

The build also makes three transformations the drafts don't show, applied identically to both:

- **`%FIRSTNAME%` builds to `{{ subscriber.first_name | capitalize }}`** at every slot the drafts
  mark — headline, salutation, and the in-body vocatives. Five slots in v1, four in v2. See the
  personalization section below; this reverses the earlier "name in the subject only" rule.
- **Scannability bolds** are added at paragraph heads beyond the `**…**` in the markdown. v2 is
  held to v1's count exactly (14) — the brief's escalation is in intimacy, not volume.
- **The recap block is new copy**, written at build time in both letters. v2's rows restate each
  unit's withhold: the Star's two pourings, the Emperor's room, the Moon's one real piece.

v2's devices sit position-for-position against v1's, with one exception that is correct: v1 has
five pull-quotes and v2 has four, because v2 drops the precedent that carried the fifth.

Rendered: v2 is 8,219px at 600px wide (v1: 9,416px) and 9,862px at 390px; no horizontal overflow
at 320px; all five images resolving.

## Personalization *(operator decision, 2026-08-04 — reverses the earlier rule)*

**The tag is `{{ subscriber.first_name | capitalize }}`.** Liquid, not the legacy
`{!firstname_fix}` that `02-E2`'s header used to claim — the Liquid form is what all seven live
scheduled reframe sends actually carry, and it is now the only form written anywhere in this deck.

**It goes in every slot the drafts mark**, not the subject alone. The earlier guardrail — *body
keeps "dear", the name appears only in the subject* — is lifted. v1 takes five (headline,
salutation, beat 9, the Lovers unit, the Lovers re-read); v2 takes four (headline, salutation, the
Star unit, the Moon unit). Both letters carry the salutation block again, which the first build
had dropped. "dear" still does the rest of the vocative work: 12 in v1, 10 in v2.

⚠ **Two different brace tokens now live in each HTML file and they are not the same thing.**
`{{ subscriber.first_name | capitalize }}` is Liquid and must reach AWeber **intact**;
`{{BOOKING_URL}}` is a build token and must be **substituted before sending**. Any substitution
step must match `{{BOOKING_URL}}` literally — a `/\{\{[^}]*\}\}/` sweep eats the name tag and
every letter ships to "Deborah" as a blank. A comment above each headline says so in the file.

⚠ **No fallback filter, matching live.** A subscriber with no first name renders every slot empty:
the headline opens on a bare comma and the salutation degrades to a lone em-dash. The live
programme already carries this in subjects; putting the tag in the body multiplies the visible
breakage from one place to five. Worth a seed-list test of whether AWeber's Liquid supports
`| default: "dear"` before the first send — untested, so don't assume it parses.

Subject bytes are unaffected: the real tag is 38 bytes against the token's 11, and the longest of
the 18 banked subjects measures 85 against AWeber's 120-byte cap.

## The text part

AWeber stores `body_html` and `body_text` as separate fields, and the proven live path
(`aweber-ops.mjs`) reads text from **its own file** — it never derives it. `02-E4-esl-v1.txt` is
therefore **stale**: 6 CTAs, no P.S., no recap, no name tags, so it tracks the *plain* v1, not
variant B. Both letters now have current text parts, generated by
`improve-v1/v1-one-time-BEs/scripts/esl-to-text.cjs` and checked for the two things that actually
break: `02-E4-esl-v1-B.txt` and `02-E4-esl-v2-B.txt`, 7 CTA URLs each, zero mangled contractions.

Don't let `aweber-broadcast.cjs` derive the text. Its `htmlToText` used to map `&[a-z]+;` to a
space, which turned every apostrophe into one — *"I don t draw for people one at a time"*, 73 times
in v2 — and stripping `<a>` tags dropped every CTA URL, leaving a text-only reader no way through.
The entity bug is now fixed, but derivation still loses the links, so **pass `--text`** (a new flag
on that script) for anything with CTAs.

## Upload record

**Draft `61250814`** on list `6936953` (theseerwithin_free), created 2026-08-04, **unscheduled**.
Subject prefixed `[TEST]` so it can't be mistaken for queued work in the drafts list. Read back
from the API and verified against the bytes sent: name tag intact in subject, html and text; 7 CTAs
in both parts; custom text accepted; not scheduled. AWeber stores it byte-identical apart from a
stripped trailing newline.

⛔ **This draft must not be scheduled.** Three reasons, any one sufficient:

1. **The booking page does not exist.** Group B is not started and `{{BOOKING_URL}}` has no value
   anywhere in the repo, so all seven CTAs were built against the loud placeholder
   `https://www.theseerwithin.com/PLACEHOLDER-02-booking-page-not-built`.
2. **The Moon copy/art contradiction** (open thread 4) is unresolved.
3. **Wrong audience.** 02 sends to prior V1 buyers behind a women-only gate (`S7`); the draft sits
   on the general free list because that is the account default.

AWeber's API has no test-send endpoint — the broadcast resource exposes only schedule and cancel —
so the test send is a UI action: Messages → Broadcasts → Drafts → the `[TEST]` one → Send a Test.

## The review gate — ratified *(operator, 2026-08-04)*

Three decisions were taken here. All three bind every offer in the deck, so they are settled for
03 and 04 as well and must not be re-opened per-offer.

**1. The invented precedent stays.** "Ruth" ships as written — a named woman in an undated past,
a buyer-change precedent (what shifted for *her*, never what happened to anyone else), which is the
construction 00e §10 mandates for 03's testimonials.

⚠ **Consequence for 03 and 04: each writes its OWN precedent, and the three must be distinct.**
Not distinct names over the same story — distinct *stories*. A buyer who takes two offers reads
both, and "a woman I read years ago, same shape of draw" landing twice is the exact tell the
device-variance rule exists to catch. Each precedent derives from its own mechanism: 02's is a
draw that repeated, so 03's and 04's must not be draws at all. Logged for the corpus-wide pass.

**2. v2's Moon copy ships against the RWS art unchanged.** The mismatch is accepted, not fixed:
the letter says *"a full moon low in a night sky"* and *"everything is silver and uncertain"* over
a card painted in pale blue sky, green grass and a yellow sun-rayed moon. The Star's milder version
(*"under an open night sky"*) stays too. Raised at build, decided by the operator, **do not re-flag
it in a later audit pass** — it is a decision, not an outstanding defect.

*(Recorded so the reasoning survives: the reader can falsify this one against the picture in a
single glance, and it sits in the threat unit. If v2 ever underperforms v1 on the Moon CTA (`c=26`),
this is the first thing to look at.)*

**3. The P.S. ships on all eight letters.** No A/B, no holdout. Both 02 letters already carry one
in the variant-B build, so nothing rebuilds — the change is that `c=7` and `c=27` are now
**permanent CTA slots rather than challenger slots**, and they stay reserved. 03 and 04 write a P.S.
natively, each off its own threat card, never copied across.

### Still open, and not blocking

- **Nameless subject challengers** are banked in `02-E1` so the emoji + name-first override gets
  proven on this offer rather than assumed. Nothing downstream waits on it.
- **The headline and italic deck are left-aligned** while every subhead is centred, in both letters.
  Carried into v2 unchanged so the two stay comparable — one decision covering both, at build time.

# /fb-tarot — decode-him card concepts

Concept board for the tarot "decode-him card" funnel. Each concept = one **deck** (a card strip + its
reveals) added via the `fb-tarot-add-card` skill. Drop raw card art per concept in
`fb-tarot/docs/decks/<deck>/`.

Status: ✅ built & wired · ⬜ pending · ⛔ parked

## 🔑 The card draw is SHUFFLED on face-down decks (2026-07-28)

Originally the tapped panel decided the card: panel A always the first card, B always
the second, C always the third. On a **face-down** deck the three panels are identical
backs, so she isn't choosing a card — she's choosing a position, and with three options
people overwhelmingly tap the **middle**. One card would have taken most of the traffic
and one read would barely ever have been seen.

Now `TarotBridge` shuffles the cards behind the backs **once per visit** (a permutation,
not three independent rolls — all three stay available, and the split is even). Measured
unbiased over 300k shuffles: every panel yields each card 33.2–33.5%.

**FACE-UP decks are deliberately exempt** — there she can see the cards and genuinely
picks one, so rotating would show her a card she didn't choose and make "you chose the
Magician" a lie. Gated on `facing`.

Analytics record BOTH `card` (drawn) and `panel` (tapped), so the tap-position bias is
measurable. Covered by `tests/fb-tarot-card-draw.spec.ts` (mutation-verified: disabling
the shuffle fails the rotation test).

## 🔑 The sign-off is on the WORDING, not on one deck (2026-07-30)

The 2026-07-28 sign-off softened three decode-him lines. Those rewrites were applied to
**`return-mhf`** and pinned by tests — but the same reads exist on the FACE-UP decks, where two of
them were never ported and nothing tested them:

- **`arcana-mfh` / `cards-return` / the Fool** predicted a return — *"what comes back often comes
  back as a new beginning"* — where the signed-off face-down wording is conditional
  (*"if something does come of this"*). The Hanged Man's softening *had* been ported; the Fool's
  had not. Fixed 2026-07-30.
- **`arcana-eef` / `cards-honest` / the Fool** still carried the rejected accusation *"someone
  careless with the truth more than cruel with it"*. Fixed 2026-07-30.

Both now have copy guards in `tests/fb-tarot-card-draw.spec.ts` (a `face-up signed-off copy` block,
plus blanket assertions that neither the rejected accusation nor the prediction phrasing can come
back on any deck or hook). **When a read is signed off, port it to every deck that carries that
hook and pin it — the parity check is `scripts` in the 7/30 report, or compare per CARD, not per
panel (decks order their panels differently).**

Face-up copy parity vs the signed-off face-down deck is now **6/9 verbatim, 3 cosmetic, 0
compliance gaps** — see `fb-tarot/report/arcana-mfh-faceup-report.html`.

## Trust/authenticity hooks — 3 new headlines on the FACE-DOWN deck (2026-07-30)

Added to `return-mhf` (face-down, existing card-back art — **no new deck, no new image**).
The wound is who he **IS** rather than what he has done. Clean ad URLs, no `&deck=` needed
because `DEFAULT_DECK = 'return-mhf'`:

| Headline | Hook | URL |
|---|---|---|
| Is he really who he says he is? | `cards-who-he-is` | `/fb-tarot/c?hook=cards-who-he-is` |
| Is he the real person, or just a picture? | `cards-real-person` | `/fb-tarot/c?hook=cards-real-person` |
| Am I being misled? | `cards-misled` | `/fb-tarot/c?hook=cards-misled` |

**Reads are bespoke, NOT recycled** (operator instruction 7/30: *"don't reuse exact same
wordings… stick to the headlines and generate appropriate relevant responses accordingly"*).
Verified mechanically, not by eye: **0 shared 6-word runs in beat 3** against
`cards-honest`/`cards-return`/`cards-feels`/`cards-cheating`, and all **21 card framings
across the 7 hooks are distinct**. Beats 1/2/4 necessarily share the mandated 4-beat
template — that is the format, not recycled copy.

### ⚠️ `cards-real-person` is a catfish/romance-scam hook

That headline selects for women who suspect a fake profile. The **2026-07-10 buyer audit**
caught Evelyn reframing textbook romance-scam markers as a genuine bond (rubric check-10
FAIL, escalated) — so on this hook **reassurance is the failure mode, not the safe default**.
The reads and `TAROT_HOOK_TENDENCY` are written to back her caution, never vouch for him, and
still never pronounce him fake (that would be a verdict). Pinned by
`tests/fb-tarot-card-draw.spec.ts` → *"cards-real-person never reassures her the man is
genuine"*, which checks all 3 cards and is negation-aware (the reads legitimately say
"does not tell me he is fictional").

**This does not fix the underlying persona behaviour** — it only shapes this hook's opening
read and reflect prompt. The audit finding itself is still open.

## Concepts

| # | Deck id | Facing | Cards (A/B/C) | Options | Status | Notes |
|---|---------|--------|---------------|---------|--------|-------|
| 1 | `decode-him` | face-down | Sun · Moon · Tower | 3 | ✅ BUILT (seeded) | The seeded foundation deck. `cards-honest` reads are the proven worked copy; `cards-return`/`cards-feels`/`cards-cheating` are compliant DRAFTS to refine. Placeholder strip art (`client/public/tarot/decode-him-strip.png` = a temporary palm-strip copy) — **replace with real card-back art**. |
| 2 | `arcana-mfh` | face-up | The Magician · The Fool · The Hanged Man | 3 | ✅ BUILT (2026-07-24, from Rio's `ZN_Tarot_Rio 6.png`) | Real card art (strip `client/public/tarot/arcana-mfh-strip.png`, 972×540). Carries ALL 5 hooks (`cards-love-again` self-frame + the 4 decode-him). Reads = **DRAFTS pending operator sign-off**. Screenshots in `decks/arcana-mfh/screenshots/`. |
| 3 | `arcana-eef` | face-up | The Emperor · The Empress · The Fool | 3 | ✅ BUILT (2026-07-24, from Rio's `ZN_Tarot_Rio 7.png`) | Real card art (`client/public/tarot/arcana-eef-strip.png`, 972×540). Ad ran the decode-him `cards-honest` hook; carries all 5 hooks. Reads = **DRAFTS pending sign-off**. Screenshots in `decks/arcana-eef/screenshots/`. |
| 4 | `return-mhf` | face-down | The Magician · The Hanged Man · The Fool | 3 | ✅ BUILT (2026-07-27, from Rio's `ZN_Tarot_Rio 1.png`) | **Face-DOWN** "Will he come back?" ad (`cards-return`). Real card-back strip art (`client/public/tarot/return-mhf-strip.png`, 972×540). Cards DRAWN from the pool (operator's pick: Magician/HangedMan/Fool). Carries all 4 decode-him hooks; `cards-return` is the ad hook. Reads = **DRAFTS adapted from arcana-mfh, pending sign-off**. Flow test PASS; screenshots in `report/screenshots/return-mhf/`. |

## Hooks (the 4 decode-him questions, shared across decks)

> 🔑 **The headline is keyed by HOOK, not by deck** (`TAROT_HEADLINES`,
> `client/src/content/tarotReads.ts`). Any deck — face-up or face-down — on `?hook=cards-honest`
> renders the identical headline string. Reusing a signed-off headline on a new deck needs **no
> code change**. The *reads* are per deck+hook, so those are what need checking.

| Hook id | Headline | Reads |
|---------|----------|-------|
| `cards-honest` | Is he being honest with you? | ✅ SIGNED OFF on `return-mhf` (2026-07-28) · ✅ verbatim on `arcana-mfh` · ✅ `arcana-eef` Fool fixed 2026-07-30 |
| `cards-return` | Will he come back? | ✅ SIGNED OFF on `return-mhf` (2026-07-28) · ✅ `arcana-mfh` Fool prediction fixed 2026-07-30 |
| `cards-feels` | How does he really feel about you? | ✅ SIGNED OFF on `return-mhf` (2026-07-28) · ✅ verbatim on `arcana-mfh` |
| `cards-cheating` | Is he cheating on you? | ⬜ draft |
| `cards-who-he-is` | Is he really who he says he is? | ⬜ DRAFT (2026-07-30) — bespoke reads on `return-mhf`, awaiting sign-off |
| `cards-real-person` | Is he the real person, or just a picture? | ⬜ DRAFT (2026-07-30) — ⚠️ catfish/romance-scam audience, see below |
| `cards-misled` | Am I being misled? | ⬜ DRAFT (2026-07-30) — bespoke reads on `return-mhf`, awaiting sign-off |
| `cards-love-again` *(self-frame)* | Will I love again? | ⬜ draft |
| `cards-soulmate` *(self-frame)* | When is my soulmate coming? | ⬜ draft (2026-07-27, from `ZN_Tarot_Rio 8.png` = arcana-eef cards; reads on arcana-eef + arcana-mfh; answers "when" as a leaning, never a date) |

## Pending (Boss's starting scope — face-up named cards)

A **face-up** deck to build next from a supplied image: ~5–6 combinations drawn from
**Magician / Fool / Hangman / Emperor / Empress**. Awaiting the card art (Lewis to supply).

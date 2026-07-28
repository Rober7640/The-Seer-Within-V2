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

## Concepts

| # | Deck id | Facing | Cards (A/B/C) | Options | Status | Notes |
|---|---------|--------|---------------|---------|--------|-------|
| 1 | `decode-him` | face-down | Sun · Moon · Tower | 3 | ✅ BUILT (seeded) | The seeded foundation deck. `cards-honest` reads are the proven worked copy; `cards-return`/`cards-feels`/`cards-cheating` are compliant DRAFTS to refine. Placeholder strip art (`client/public/tarot/decode-him-strip.png` = a temporary palm-strip copy) — **replace with real card-back art**. |
| 2 | `arcana-mfh` | face-up | The Magician · The Fool · The Hanged Man | 3 | ✅ BUILT (2026-07-24, from Rio's `ZN_Tarot_Rio 6.png`) | Real card art (strip `client/public/tarot/arcana-mfh-strip.png`, 972×540). Carries ALL 5 hooks (`cards-love-again` self-frame + the 4 decode-him). Reads = **DRAFTS pending operator sign-off**. Screenshots in `decks/arcana-mfh/screenshots/`. |
| 3 | `arcana-eef` | face-up | The Emperor · The Empress · The Fool | 3 | ✅ BUILT (2026-07-24, from Rio's `ZN_Tarot_Rio 7.png`) | Real card art (`client/public/tarot/arcana-eef-strip.png`, 972×540). Ad ran the decode-him `cards-honest` hook; carries all 5 hooks. Reads = **DRAFTS pending sign-off**. Screenshots in `decks/arcana-eef/screenshots/`. |
| 4 | `return-mhf` | face-down | The Magician · The Hanged Man · The Fool | 3 | ✅ BUILT (2026-07-27, from Rio's `ZN_Tarot_Rio 1.png`) | **Face-DOWN** "Will he come back?" ad (`cards-return`). Real card-back strip art (`client/public/tarot/return-mhf-strip.png`, 972×540). Cards DRAWN from the pool (operator's pick: Magician/HangedMan/Fool). Carries all 4 decode-him hooks; `cards-return` is the ad hook. Reads = **DRAFTS adapted from arcana-mfh, pending sign-off**. Flow test PASS; screenshots in `report/screenshots/return-mhf/`. |

## Hooks (the 4 decode-him questions, shared across decks)

| Hook id | Headline | Reads |
|---------|----------|-------|
| `cards-honest` | Is he being honest with you? | ✅ SIGNED OFF on `return-mhf` (2026-07-28) |
| `cards-return` | Will he come back? | ✅ SIGNED OFF on `return-mhf` (2026-07-28) |
| `cards-feels` | How does he really feel about you? | ✅ SIGNED OFF on `return-mhf` (2026-07-28) |
| `cards-cheating` | Is he cheating on you? | ⬜ draft |
| `cards-love-again` *(self-frame)* | Will I love again? | ⬜ draft |
| `cards-soulmate` *(self-frame)* | When is my soulmate coming? | ⬜ draft (2026-07-27, from `ZN_Tarot_Rio 8.png` = arcana-eef cards; reads on arcana-eef + arcana-mfh; answers "when" as a leaning, never a date) |

## Pending (Boss's starting scope — face-up named cards)

A **face-up** deck to build next from a supplied image: ~5–6 combinations drawn from
**Magician / Fool / Hangman / Emperor / Empress**. Awaiting the card art (Lewis to supply).

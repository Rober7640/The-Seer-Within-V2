# Sign Selection Guide — which palm sign (or cards) per question

Extends `headline-roadmap.md` (question data) and `decode-him-card-funnel.md` (the
`cards` spec) with a concrete per-sub-group sign assignment. Planning-only — no
`hook-ledger.json` entries added yet; this is the proposal to review before wiring.

## The one structural rule (not a preference — a mechanism constraint)

- **Self-diagnostic signs** (`thumb`, `finger-lock`, `finger-shape`, `palms`,
  `palm-signs`, `thumb-curve`, `hand-size`, `finger-length`) all read **her** — a hand
  trait, a body signal. A question can run on any of them IF the reveal can coherently
  bridge back to her (self-frame or self-bridged), even if the headline stays
  third-person ("Is he ever going to commit?" is fine on `thumb` because the *reveal*
  reads her readiness, not literally his commitment).
- **`cards`** reads **him** — a divination pull, not a body trait. Reserve it for
  headlines that stay fully raw/third-person with **no bridging attempt at all**
  ("Is he cheating on you?", "Will he come back?") — the small set where softening the
  question into a self-frame would blunt exactly what makes it convert.

Everything else below is sequencing/priority within the self-diagnostic family, not a
hard rule — per the ledger's own "full matrix" design intent, every hook should
eventually get reads for every sign. This just picks which one to draft **first**.

## Proposed sign-per-sub-group (priority draft order)

| Sub-group | Primary sign | Archetype | Why this fits first |
|---|---|---|---|
| Loneliness/timing | `thumb` | gathering / reaching / inward | Already the proven default (3 wired hooks); "reaching" is a direct metaphor for yearning/timing anxiety. No change — keep as-is. |
| Soulmate/destiny | `finger-shape` | steady / **dreaming** / discerning | "Dreaming" is a near-literal match for fated-soulmate framing — a cognitive-style archetype, not a body-trait one. |
| Healing/moving-on | `hand-size` | **sheltering** / **daring** | The healing decision *is* "protect myself (sheltering) vs. take the leap to let go (daring)" — the archetype IS the question. |
| Trust/honesty | `finger-lock` | leading / mirrored / **guarded** | "Guarded" is the most direct trust/betrayal metaphor in the whole sign set; finger-lock is literally a defensive hand posture. |
| Feelings/commitment | `thumb-curve` | **constant** / **open** | "Does the thumb bend back" (constant = steadfast vs. open = stays flexible/non-committal) maps almost literally onto "will he commit?" |
| Reunion/return | `palm-signs` | **joined** / **rising** | "Do heart lines meet when cupped" (joined vs. still rising/not yet met) is close to a literal metaphor for "will we reunite?" |

Reserve pool (not assigned as primary, available once a sub-group needs a second sign
for an A/B-fatigue test): `palms` (even/giving/deep — alt for feelings-commitment, heart-
line depth) and `finger-length` (magnetic/harmonious/certain — alt for soulmate-destiny,
"certain" = fated-match knowing).

## `cards` — the parallel raw track

For the 4 sub-groups where the DB data showed the highest per-lead conv% (trust-honesty,
feelings-commitment, reunion-return, plus betrayal specifically), also run the fully
raw/unbridged version of the same question on `cards`, as the ledger already stages:

| Territory | Sign-bridged version (draft first) | Cards version (raw, parallel test) |
|---|---|---|
| Trust/honesty | `finger-lock` — "Am I being lied to?" | `cards-honest` — "Is he being honest with you?" |
| Feelings/commitment | `thumb-curve` — "Is he ever going to commit?" | `cards-feels` — "How does he really feel about you?" |
| Reunion/return | `palm-signs` — "Is it really over?" | `cards-return` — "Will he come back?" |
| Betrayal (cheating) | *(no clean bridge — "am I being cheated on" reads as accusatory even self-framed)* | `cards-cheating` — "Is he cheating on you?" (wildcard only, lowest EV per existing data) |

This is the same pattern already in the ledger (`is-he-true` + `cards-honest` as a
parallel pair) — extend it to the other 2 territories rather than inventing a new
pattern.

## What this doesn't touch

- The plain v1 funnels (`root`/`fb`/`fb2`/`gdn`) go straight from ad to chat with no
  diagnostic-quiz step — no sign to assign, this guide is fb-palm-specific.
- `fb-palm` now also lives in the carved-out `quiz-funnel-standalone` repo (as of
  2026-07-23) — this doc is written here for planning; port it over before actually
  wiring anything, since that's where `palmReads.ts` / the live app code is.
- No `hook-ledger.json` entries were added — per the ledger's own invariant ("no code
  changes until a draft passes the human review gate"), this is the pre-draft proposal.
  Next step when ready to build: draft reads for the 6 primary-sign hooks + 3 cards
  hooks, run through the review gate, then wire.

## Open build dependency

`cards` itself has never been built (`PalmSign` union in `palmReads.ts` has no `cards`
entry) and no reads exist for it beyond the spec in `decode-him-card-funnel.md`. Nothing
in the "cards version" column above can ship until that sign is built — track as a
prerequisite, not a parallel-track assumption.

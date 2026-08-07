# 02-U1b — U1 bucket block *(love · money · purpose · someone)*

| | |
|---|---|
| **⚠ SUPERSEDED** | `../../docs/00i-DELIVERABLES-U1-U2.md` — the four bucket variants below were REPLACED by one universal block 2026-08-06. No bucket is ever collected, and every fact in the block is in every buyer's fixed spread. The left-wrist mechanic is kept verbatim |
| **Engine** | `UPSELL_BUCKET_MESSAGES`, keyed on the V1 bucket already stored against the buyer |
| **Source** | `client/src/lib/upsellMessages.ts:222-247` |
| **BUILT** | `client/src/lib/twinFlameUpsellCopy.ts`, served at `/tarot/twin-flame/welcome1` |
| **Kept** | the left-wrist mechanic, four messages per bucket, the *filters what reaches you* logic. It is the stone's own physics and `UPSELL_DELIVERY` downstream depends on it |
| **Rewritten** | the first and last message of each bucket, so the stone answers **the Tower** rather than an energy clearing |

⚠ **`someone` uses `{personName}`**, hydrated from the V1 conversation. If it is missing the engine
must fall back to `love` — never render a bare token.

---

## `love`

> Once your stone is charged, it will guard your heart through the weeks your spread is unfolding.

> Wear it on your LEFT wrist — your receiving hand.

> In this work the left side receives. Everything coming toward you — every person, every
> intention — passes through that hand before it reaches you.

> Your Tower arrives as a person, {firstName}. The stone is what stands in the doorway and decides
> which ones get as far as your heart.

---

## `money`

> Once charged, your stone will hold the ground under what's coming to you.

> Wear it on your LEFT wrist — your receiving hand.

> Money moves toward you before it ever moves out. The left hand is the side opportunity enters by,
> which is also the side it can be taken from.

> You have two windfalls in this spread. The stone's work is making sure you are still standing in
> front of them when they arrive, and that nobody is standing there with you.

---

## `purpose`

> Once charged, your stone will steady you while the spread does its work.

> Wear it on your LEFT wrist — your receiving hand.

> Clarity, direction, the sense of which way to move — all of it comes in through the left side.
> That is where knowing lives, and it is easily crowded.

> Your reading is going to ask you to decide things, {firstName}. The stone keeps other people's
> noise off the decision long enough for you to hear your own answer.

---

## `someone`

> Once charged, your stone will clear the line between you and {personName}.

> Wear it on your LEFT wrist — your receiving hand.

> Their energy, their intentions, what they actually mean rather than what they say — it reaches
> your left side first.

> The twelfth house of your spread is holding something unsaid. The stone doesn't force it into the
> open — it keeps you from being knocked sideways on the day it comes out on its own.

---

## Build notes

- ⚠ **This note is wrong about message 3, and the printed copy above is what shipped.** Only
  message 2 (*"Wear it on your LEFT wrist"*) is V1's verbatim; message 3 is rewritten in all four
  buckets — *"In this work"* for *"In energy work"*, and so on. The build honours the printed copy,
  which keeps the mechanic the note is protecting. Nothing downstream broke.
- **Message 2 and 3 are V1's, unchanged, in all four buckets.** They carry the left-wrist mechanic
  that `UPSELL_DELIVERY` and `UPSELL2_RITUAL_PATH_A_EXTRA` both refer back to. Changing them breaks
  copy further down the chat that nobody is rewriting.
- **Message 1 and 4 are 02's.** Each closing line now names something from *her actual spread* —
  the Tower, the two windfalls, the decisions, the twelfth house — which is the whole reason this
  upsell converts better after a reading than after a clearing. She has just been told she has these
  things.
- ⚠ **`someone` is the one to watch.** It gestures at the twelfth house without repeating the
  product's instruction, and it deliberately **does not** promise disclosure — *"doesn't force it
  into the open"*. `02-P1` explicitly forbids investigation; an upsell that promised to reveal the
  hidden thing would sell against the product it follows and would put her back on her partner's
  phone.
- **`money` is the only bucket that names a count** (two windfalls). That is safe because both are
  in the letters and the product, and it is the strongest specificity available in this bucket.
- **No bucket claims an outcome about a third party.** `someone` is about what reaches *her* and how
  she meets it — never about what {personName} will do.
- **`{firstName}` appears in two of four buckets**, matching V1's uneven cadence rather than
  levelling it. Every bucket carrying a name reads as merge.

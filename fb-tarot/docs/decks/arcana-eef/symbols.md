# arcana-eef — which detail to point at, and which to leave alone

The face-**UP** Emperor / Empress / Fool deck. Sibling of
`fb-tarot/docs/decks/return-mhf/symbols.md`, built the same way and to the same test.

⚠ **She CHOSE this card, she did not turn it.** The deck is face-up, so beat 1 opens
*"You chose the Emperor, dear…"* — never *"You turned"*. The guard on a face-down family
pins `/^You turned /` and would be wrong here.

⭐ **This is the deck with no Magician in it.** The operator decision of 2026-08-23 says the
next set of landers avoids the Magician, so this deck is where that set can go.

**Why this file exists.** On 2026-08-23 a batch used the Fool's foot over the cliff edge to
prove *"you don't have to be finished to start"*. The operator's question was the right one:
*how is stepping off a cliff a positive symbol?* It isn't, to the woman looking at it. Waite
wrote most of these details in on purpose, to make one specific point. Use the detail the
author put there for the point you are making.

## The one test

> **If you have to explain why the picture is positive, it is the wrong picture.**

She sees the art for about a second, on a phone, before she reads your line. Whatever the card
means to a tarot reader, the symbol has to prove your sentence at a glance. Where Waite's own
reading and the modern reader's first impression disagree, **the reader wins** — she is the one
buying.

---

## a · IV · The Emperor — *"the card of authority and structure"*

⚠ **This card carries two of the three worst traps on the deck.** Both are already in the
repo, and both look harmless until you check what they prove.

| Detail | What it proves at a glance | Use it? |
|---|---|---|
| **the stone chair he does not leave** | what is built here does not go anywhere | ✅ **the strongest one.** It proves *solid* and *lasting* with no explaining. Validated in `cards-honest` and `cards-return` |
| **the gold ball in his left hand** | he is holding something solid and real | ✅ strong and plain. Waite: *"a globe in his left hand"*. Validated in `cards-soulmate` |
| he faces straight ahead, not moving | he is not going anywhere | ✅ plain. Pairs with the chair |
| armour on his legs, under the robe | he is guarded | ⚠ modern reading is *"protected from any emotional response or vulnerability"*. Fine on a decode-him lander about a closed man. Wrong anywhere she needs warmth |
| the rams' heads carved in his chair | Aries, Mars | ⚠ needs explaining. Pure description only, useless as proof |
| the ankh sceptre (*Crux ansata*) | life | ⚠ needs explaining, and most readers will not know what it is |
| the small river at the foot of the mountains | there is feeling under the hardness | ⚠ **not used in any lander yet.** Genuinely on the card, but check the art file before the first use |
| **his long white beard** | **an old man** | ⛔ **avoid on any lander about waiting or timing.** The tradition means *"age-old wisdom and experience"*. To a woman asking *when is my soulmate coming*, a very old man reads as **you will be old before it happens.** Validated in `cards-love-again` and `cards-feels`, so it is already loose on the deck |
| **the bare grey mountain, no green on it** | **nothing grows here** | ⛔ **proves the opposite on any lander about something arriving or growing.** The tradition reads it as *"a solid foundation but resistant to change"* — that is an explanation, and explanations lose to first impressions. Already in `cards-cheating`, where it is fine, because that lander is about coldness |

## b · III · The Empress — *"the card of warmth and abundance"*

| Detail | What it proves at a glance | Use it? |
|---|---|---|
| **the field of wheat at her feet** | everything here has grown | ✅ **the strongest one.** Waite: *"a field of corn is ripening in front of her"*. Validated in `cards-honest` and `cards-return` |
| the trees behind her, dark green and close together | full, alive, nothing bare | ✅ plain and safe |
| twelve stars in the crown on her head | she is crowned | ✅ usable as description. Waite: *"twelve stars, gathered in a cluster"*. As PROOF it is weak — nobody counts them, and the zodiac meaning needs explaining |
| the shield by her feet with a heart on it | love is on this card | ✅ plain. The heart shape carries the Venus sign; call it a heart, not Venus |
| she rests on soft cushions | comfort, ease | ✅ plain, mild |
| the fall of water beyond the field | — | ⚠ **not used in any lander yet.** Waite names it. Check the art file before first use |
| **the red fruit all over her gown** | — | ⛔ **they are pomegranates, and they mean fertility.** Central to the card and unusable here: this audience is 55+ and fertility reads as pregnancy. Already in `cards-cheating` as *"red fruit"*, which dodges the word without dodging the meaning |

🔴 **Two ways to get the wheat wrong.**

- **Never "ready to cut".** Harvest implies autumn, and a season is a timeframe. Every
  timeframe is banned on this funnel. **"Gold and grown" is the safe form.**
- Waite says the corn is **ripening**, not ripe. At a glance it looks full and gold, and the
  reader wins — but do not build a line on the wheat being *finished*, because the card is
  careful not to say so.

## c · 0 · The Fool — *"the card of new beginnings"*

Same card as on `return-mhf`, so those findings carry over unchanged. What differs is which
details this deck has already spent.

| Detail | What it proves at a glance | Use it? |
|---|---|---|
| **the small bundle tied to a stick** | he set out without packing for everything | ✅ **the strongest one, and UNUSED on this deck.** Signed off on the sibling deck — `cards-who-he-is` runs *"all he owns is tied in one small bundle on a stick… The Fool travels light, dear."* |
| he walks into open air with his chin up | he is looking ahead, and already going | ✅ plain. Validated in `cards-soulmate` |
| the white rose in his hand, fresh | innocence, and it is new | ✅ plain. Validated in `cards-love-again` and `cards-feels` |
| his eyes on the sky | he is not looking down | ✅ plain |
| **the little white dog** | — | ⚠ **it is a WARNING, not a companion.** It *"rears up to warn him of impending danger"*. `cards-honest` uses it correctly — *"up on its back legs"*. Never write it as a friend trotting at his heel |
| **the cliff edge, his foot over it** | at a glance: he is about to fall | ⛔ **never use it to prove anything good.** Waite says *"the edge which opens on the depth has no terror"* and leaves it unresolved whether he steps or falls — but a 55+ woman on a phone sees a man about to walk off a cliff |

---

## What this file found that the repo already contradicts

Two, both reported rather than fixed — neither is mine to touch.

1. ⛔ **`cards-return` opens card c on the cliff** — *"one foot out over the cliff edge, eyes on
   the sky, a dog at his heel."* That is the banned symbol, and it also writes the dog as a
   companion rather than a warning. **`cards-return` is a protected live control** (invariant 4:
   never rewritten, never touched), so this stands as a known exception, not a defect to fix.
2. ⚠ **`cards-cheating` uses the dog for isolation** — *"the dog is the only other living thing
   on his card."* That is neither the warning reading nor the companion reading. It works on
   that lander, but do not copy the pattern.

## Sources

Waite's *Pictorial Key to the Tarot* as reproduced at
[rider-waite.com](https://rider-waite.com/symbolism/pictorial-key-03/) (cards
[0](https://rider-waite.com/symbolism/pictorial-key-00/) ·
[III](https://rider-waite.com/symbolism/pictorial-key-03/) ·
[IV](https://rider-waite.com/symbolism/pictorial-key-04/)), cross-checked against
[Biddy Tarot](https://biddytarot.com/tarot-card-meanings/major-arcana/emperor/) for the modern
reading. Where the two disagree, the table says so rather than picking one.

Every detail marked ✅ or ⛔ above is taken from a beat-1 line already live in
`client/src/content/tarotReads.ts`, so it is known to be really on the card. The two marked
*"not used in any lander yet"* come from Waite only — verify against the art file before the
first use.

⚠ The deck's own line in `TAROT_CARD_VOCAB` (`server/lib/prompts.ts`) still outranks everything
here — Version B and Version C must not contradict each other about what a card means. Checked
2026-08-23: client and server agree for all three cards on this deck.

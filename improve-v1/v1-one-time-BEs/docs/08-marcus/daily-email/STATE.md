# 08 · STATE — what has been written

The sends log for the Marcus daily. The `marcus-daily` skill reads this to see what has run and
writes to it only **after** the operator says go at the review gate.

⛔ **A planned-but-unapproved letter leaves no row.** If it is in this table it got through the gate.

---

## Written

| # | Date | Named thing | Spread | Cards | Turned | Cards drawn | Slug | Hero key | Sent |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 2026-09-08 | why he goes quiet | The Six Questions · in-house | 6 | 3 of 6 · pos 1,2,3 | Four of Cups · Three of Swords · Eight of Swords | `why-they-go-quiet` | `08-hero-why-they-go-quiet.jpg` | no |
| 2 | 2026-09-09 | what is my higher calling | The Six Questions · in-house | 6 | 2 of 6 · pos 1,2 | The Star · Seven of Pentacles | `what-is-my-higher-calling` | `08-hero-what-is-my-higher-calling.jpg` | no |
| 3 | 2026-09-09 | the risk I won't regret | The Cross · 5 · traditional, Wirth 1927 | 5 | 2 of 5 · pos 1,2 | The Fool · The Hermit | `the-risk-i-wont-regret` | `08-hero-the-risk-i-wont-regret.jpg` | no |
| 4 | 2026-09-09 | what that relationship taught me about myself | The Cross and Triangle · 7 · traditional, Papus 1889 | 7 | 2 of 7 · pos 1,2 | Ace of Cups · Two of Cups | `what-it-taught-me` | `08-hero-what-it-taught-me.jpg` | no |
| 5 | 2026-09-09 | what's blocking love | The Tree of Life · 10 · traditional, Zain 1936 | 10 | 3 of 10 · pos 1,2,3 | Five of Pentacles · Seven of Swords · Eight of Pentacles | `whats-blocking-love` | `08-hero-whats-blocking-love.jpg` | no |
| 6 | 2026-09-11 | what are my blind spots | The Tree of Life · traditional, Zain 1936 | 10 | 3 of 10 · pos 1,2,3 | The Moon · Two of Swords · Three of Pentacles | `what-are-my-blind-spots` | `08-hero-what-are-my-blind-spots.jpg` | no |

**Close variants**, same cards and same hero as their parent — these test the close, not the reading:

| Slug | Parent | Close | Face-down strip |
|---|---|---|---|
| `why-they-go-quiet-close-a` | 1 | numbered 1–4, ends on the link | `08-backs-3.jpg` |
| `what-is-my-higher-calling-close-e` | 2 | numbered 1–4, ends on the link · ⚠ still carries a trailing recap the spec now forbids | `08-backs-4.jpg` |

⚠ **Both letters run on The Six Questions**, which survived onto the roster as an honest in-house
spread — so their shape stands. Two things still do not: neither deck line names the spread, and
`why-they-go-quiet` turns three of six where the ratio says two.

## Load-bearing details used

One per turned card. ⛔ Never reuse one — it is the whole letter and the P.S.

| Detail | Card | Letter |
|---|---|---|
| the hand he isn't looking at | Four of Cups | 1 |
| his head is turned up and away from the edge | The Fool | 3 |
| a six-pointed star inside the lantern, not a flame | The Hermit | 3 |
| five streams pouring before anyone had drunk from it | Ace of Cups | 4 |
| a winged lion's head above them that neither looks at | Two of Cups | 4 |
| the lit window right above them, and neither looks up | Five of Pentacles | 5 |
| he is gripping them by the blades | Seven of Swords | 5 |
| one on the ground by his foot, not picked up | Eight of Pentacles | 5 |
| nobody is holding those swords | Three of Swords | 1 |
| her feet aren't tied | Eight of Swords | 1 |
| one foot in the water, one knee on the land | The Star | 2 |
| he's stopped working to look at them | Seven of Pentacles | 2 |
| the small creature nearest the viewer is at the bottom while the dog and wolf look upward | The Moon | 6 |
| keeping both swords balanced requires her arms to stay crossed | Two of Swords | 6 |
| the person doing the work is not the person holding the architectural drawing | Three of Pentacles | 6 |

## Assets live on S3 · `marcus/08/`

`08-headshot.jpg` (square — ⛔ not the round one) · `08-signature.jpg` (flattened onto `#f4f1e6`) ·
`08-backs-3.jpg` · `08-backs-4.jpg` · one `08-hero-<slug>.jpg` per letter.
Card art is at `evelyn/tarot-rws/<card-slug>.jpg`.

## Test drive · 2026-09-09

Three letters run end to end to prove the new spine. Findings, in order of how much they cost:

- ⛔ **`08-backs-5.jpg` did not exist.** `SPREADS.md` said assets existed for 3, 4 and 5; only 3 and 4
  did. Caught by a 403 on the built page, not by the library. Now shot.
- ⚠ **The Cross and Triangle took THREE rolls** to produce a hero that reads as two figures. The
  other two spreads landed first time. Its two-figure shape is the hardest thing on the roster for
  image generation — budget re-rolls for it, or simplify the layout paragraph.
- ⚠ **Parallel writers converged twice out of three.** Two letters independently chose the value
  phrase *"the ones with your name on them"*; two independently opened the validate beat on
  *"And you've been fair about it."* Both caught in the voice pass. ⭐ A writer brief must carry the
  phrases the sibling letters already used.
- ✅ **A question with an apostrophe never highlighted.** `hilite()` looked for a straight `'` in a
  string `inline()` had already curled. Silent since the feature was built. Fixed in the generator.
- ⛔ **The face-down strip broke the formation** (operator, 2026-09-09). The hero showed the Tree of
  Life; the "still down" picture under it showed the same seven cards in a flat row. All three
  test letters had it. Rule changed: for a named-shape spread the still-down picture is **per
  SPREAD** (`08-backs-<spread>.jpg`) — the hero's formation with the turned positions lifted off.
  The per-count row survives only for six-questions. The Cross and Triangle failed its first roll
  here too — its third first-roll failure today.
- ✅ Seven face-down items render correctly in the ruled sidebar. Ten cards, five cards and the
  variable dateline all build clean.

## ⛔ Cold read · `the-risk-i-wont-regret` · 2026-09-09 — FAILED

First run of the `cold-read` skill. Three readers, none of whom saw the brief, the slate or
`SHAPE.md`. ⛔ **The letter is not sendable**, and three of the six failures are in the furniture
every letter shares — so they are in all five letters, not this one.

| # | Sentence | 3 readers | Verdict |
|---|---|---|---|
| 60 | *"Without your lens, what you're really weighing is somebody else's decision."* | 3 × `I CAN'T`; 2 named it their least-understood line | ⛔ BROKEN · **furniture, close step 4** |
| 40 | *"…everything with any weight in it sits on the against side."* | 3 × read it as the cards saying **NO**; 2 named it least-understood | ⛔ BROKEN · **inverts the letter** |
| 43–46 | the middle card | 3 × counted on fingers; all 3 caught it contradicting *"I'll turn the other three"* | ⛔ BROKEN |
| 3 | *"Marcus. The Cross this morning, on one question: the risk I won't regret."* | 3 × could not tell whose "I"; 2 first read it as **Marcus's** risk | ⛔ BROKEN · **furniture, deck line** |
| 49 | *"You haven't dropped this on anyone."* | 3 × never learned what the risk IS, in the whole letter | ⛔ BROKEN · structural |
| 58 | *"Your name gives me your lens"* | 3 × cannot say how a name produces a card | ⚠ AMBIGUOUS · **furniture, close step 3** |

Also 3/3: *"the drop"* arrives unintroduced (the card description names no cliff) · the P.S.
*"anyway"* changes job · Marcus is never identified · *"a life other people are standing in"* has
2–3 readings.

⭐ **What it cost, and who wrote it.** Sentences 60 and 43–46 were written in the VOICE PASS, by the
person doing the voice pass — not by the writer. The draft was cleaner than the edit. That is the
rule `cold-read` exists to enforce: run it on the edited text, and never let the editor be a reader.

⭐ **The well predicted this.** `QUESTIONS.md` → *"What makes a good one"* rule 5: a question made
only of concepts gives back only concepts. *"The risk I won't regret"* is a concept, and all three
readers finished the letter without learning what the risk was. It was picked anyway.

## ⚠ Watch

Written down so the next run's planner sees it.

- **2026-09-09 — `test-01/` is lost.** The blind test that set this voice, and its four winning
  control letters, are gone from disk and from git. `docs/08-marcus/` has never been committed. The
  four letters in `letters-02/` are now the only voice evidence. Try OneDrive version history.
- **2026-09-09 — the spec and the shipped letters disagree in one place.**
  `what-is-my-higher-calling-close-e.md` keeps two paragraphs after the link. The rule is now
  nothing after the link.
- **2026-09-09 — nothing has been opened outside Chrome.** No Outlook, Gmail, Apple Mail, dark mode
  or AWeber. That is still the biggest unknown before anything sends.

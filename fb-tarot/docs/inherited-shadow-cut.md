<!-- 🔒 CANONICAL. This file is the ONE source for the Inherited Shadow (3-beat) method.
     Its sibling is fb-tarot/docs/natural-tarot-cut.md — the Natural Tarot-Cut (7-cut).
     BOTH ARE LIVE METHODS. Neither supersedes the other. The skill asks which one to use
     before drafting; §"Choosing between the two" below is the decision.
     Added 2026-08-23. Nothing built on it yet — see §Status. -->

# The Inherited Shadow — the three-beat method

Where the Natural Tarot-Cut **answers** her question, this one **withholds** the answer behind a
block — and names the block as something passed down her family line. It exists to make the
Energy Clearing Ritual feel necessary before the pitch arrives, instead of being sprung at it.

> **Status: DESIGNED, NOT SHIPPED.** No lander runs this method yet. The seven cuts are the
> incumbent and the control. Design spec:
> `docs/superpowers/specs/2026-08-23-inherited-shadow-lander-framework-design.md`.

---

## Why it exists

`improve-v1/08-clearing-theme-coherence.md` (2026-07-05) found the defect:

> **The problem is over-built vs. the solution.** The crisis arc spends many turns making the
> *block* vivid, but "clearing" is **sprung** at the pitch rather than seeded as the inevitable
> resolution.

Act 1 sells a ritual that will *"trace the roots of this block, sever its hold, and seal the
clearing"* (`client/src/hooks/useConversation.ts:1933`). By the time she reads that, nothing has
told her the block **has** roots.

**It is a port, not an invention.** The mechanism is already written in Evelyn's own voice, in
the chat, eight minutes too late to do any work — `server/lib/prompts.ts:722`, the
`shadowSummary` pitch step:

> 1. *"What I see is a generational imprint — passed down your family line…"*
> 2. *"This is why you [specific struggle] but never [get the result]…"*

and `BLOCKED_ABUNDANCE` at `prompts.ts:177`: *"There's a pattern in your family around money…
passed down through generations."*

The lander is not getting a new mechanism. It is getting the chat's own mechanism, earlier.

---

## The three beats

The shape is Evelyn's own **three candles**, from `improve-v2/specs/evelyn-v2-prompt-B16.md`
§HOW A READING LANDS — not something invented for this funnel:

> Through the image, three candles as flowing prose (never labeled, never a list):
> **WHAT I SEE** — concrete-feeling, in their details. **THE BLOCK** — *the image's shadow
> side*, the pattern they can't see from inside; the candle that makes clients say "how did you
> know," and it should sting a little. **THE OPENING** — what is shifting, and what to watch
> for, riding the image.

Folded into the same four registry slots the seven cuts use, so every structural guard keeps
meaning what it meant and `reads[h][c].length === 4` still holds across the 24 test files that
pin it.

| Slot | Beat | Job | Opens on | Without it |
|---|---|---|---|---|
| `[0]` | The picture | One or two details literally on the art | — | She has nothing to check |
| `[1]` | The bridge | Her question back, plus the card in plain English | — | It reads as a horoscope |
| `[2]` | **1 · What I see** | Affirm her. The thing she fears is her fault is NOT the fault | *So…* | She braces for blame and stops reading |
| `[2]` | **2 · The block** | The card's own shadow side. Point at something drawn | *But…* | The block is asserted, and she can't check it |
| `[2]` | **3 · The block in her life** | What that thing is, in her situation | *And…* | It stays a fact about a picture |
| `[2]` | **4 · The cost** | A week she has actually lived, explained by the block | *That's why…* | The block is a claim she must take on trust |
| `[3]` | **The opening** | Where it came from — narrow, and pointing at ROOTS | *Let me look closer at…* | The clearing ritual arrives from nowhere |

### The connective order is the difference, and it is deliberate

| Method | Chain | Doing |
|---|---|---|
| Natural Tarot-Cut | So · **And** · **But** · That's why | **resolves** — answer, deepen, turn, explain |
| Inherited Shadow | So · **But** · **And** · That's why | **escalates** — block, its work, its cost, then hope |

Escalation is what creates need. Resolution is what removes it. Getting the order wrong turns
this method back into the seven cuts with a shadow bolted on.

---

## The four rules that decide whether it works

1. **The shadow came down the line, and it has no author.** It predates her. That is what makes
   it removable, what makes it not her fault, and what makes "trace the roots" mean something.
   See §The authorship ban — this is the one that ends the run if it breaks.
2. **The shadow is near, not far.** It sits between her and the thing, close enough to reach.
   Distance kills urgency; a block "somewhere in your past" cannot be cleared this week.
3. **The shadow has fingerprints.** Beat 4 must hand her a week she has actually lived and say
   the shadow caused it. The VOC pull is the only place those fingerprints come from.
4. **The shadow is removable, and she cannot reach it alone.** Both halves, every read.
   Removable or there is no product. Out of her reach or there is no purchase.

Rule 4 is the one the seven cuts never state, and it is the whole commercial engine.

### The glimpse is a withheld positive, never a refusal

The pre-2026-08-19 framework was retired because it *"refused to answer and certified her
instead."* This method withholds too, so the distinction is load-bearing:

- **Refusal** — "no reader can tell you that." She leaves with nothing.
- **Withheld positive** — "it's there, it's good, and something is stood in front of it." She
  leaves knowing the answer exists and what is between her and it.

⚠ The record is worth knowing honestly: *"she got no answer and feels conned"* appears only as
design rationale in `natural-tarot-cut.md`. **It was never measured.** The seven cuts' central
advantage is a judgment call, the same status as this method's.

---

## 🔴 The authorship ban

`server/lib/prompts.ts:1844`, the money guard:

> **NEVER NAME A PERSON AS THE BLOCK** — not a relative, a partner, or "someone close to you";
> a card cannot see it and the accusation lands on someone real inside a real family.

And `evelyn-v2-prompt-B16.md`:

> **The hidden thing is always a PATTERN** — never an unnamed enemy, never "someone is working
> against you," never a curse or a block another person placed; that line protects your clients
> from every con built on invisible enemies.

A family-line shadow is the nearest a lander has ever come to that ban. The line is
**authorship**:

| Allowed | Banned |
|---|---|
| "it came down the line to you" | "your mother", "your grandmother", "someone in your family" |
| "it was running before you were born" | "a woman in your line did this" |
| "the chair was carved before he sat down" | "he carved the chair" · "who laid that table" |
| "this was handed on, and nobody chose it" | "someone close to you is holding it" |

A pattern with no author accuses nobody. The moment it acquires one, it is an accusation against
a real person inside a real family, and she will act on it at the next family dinner.

### Two bans inheritance clears for free

- **Never blame her.** It predates her, so it structurally cannot be her fault.
- **Never name a cause she could act on.** A generational imprint is not a decision she made, so
  it cannot become financial advice or a tactic.

### Bans this method invents

- **No curse, hex, karma, past life, spell, evil eye.** "Passed down" is a pattern, not an
  affliction, and the platform reads the other words as occult-harm claims.
- **No fate, destiny, "meant to be", a plan, a lesson.** Inherited ≠ fated.
- **No trauma or diagnosis language.** No inherited trauma, epigenetics, attachment, ancestral
  wound. More tempting here than anywhere else on the funnel.
- **Never date the inheritance.** No generations counted, no "three women back", no century. A
  count is a fact she can check.
- **Never say she passed it on.** Her children are not carrying it. That sentence lands on a
  real child and there is no version of it that helps.

Every ban above and inherited stands unchanged: dates, durations, mediumship, the seven money
bans, the per-frame place/tactic/her-fault bans. Nothing here is loosened.

---

## 🔴 The card must MEAN the block

The seven cuts only require the block to be **drawn**. This method requires it to be **drawn AND
meant**, because the card is the warrant and a warrant that contradicts itself is worse than
none.

`server/lib/prompts.ts` injects each card's meaning into the Version-C prompt via
`TAROT_CARD_VOCAB` — e.g. *"the Magician, the card of will and intention."* A canned read that
says "the loop goes round to the same place, nothing's moved" on a card the server calls *will
and intention* makes **Version B and Version C contradict each other on the same lander**. She
can also simply look the card up.

**Test every candidate card three ways. All three must agree:**

| | Question |
|---|---|
| Picture | Is the block a thing literally drawn, that she can point at? |
| Meaning | Does the card's public meaning already carry that block? |
| Vocab | Does `TAROT_CARD_VOCAB` say the same thing — or can it be written to? |

Cards whose meaning **fights** a block and must not carry this method: the Fool (new
beginnings) · **the Magician (power, manifestation)** · the Empress (abundance) · **the Chariot
(moving forward)** · Strength (courage) · the Star (hope) · the Sun (joy) · the World
(completion).

### The four ways a card fails

Found by assessing all 22 Major Arcana, one assessor per card, 2026-08-23. Only the first is
about writing:

1. **The block has to be invented.** The read needs history the picture doesn't show —
   *"he didn't build that table"* on the Magician, *"he can't reach it"* on the Hanged Man (his
   hands are hidden, not tied). The Star fails hardest: it contains no obstruction anywhere, so
   its block can only be a *direction of flow*.
2. **Copy cannot outrun a title.** The Devil has the best clearing image in the deck — a chain
   loose enough to lift off — and fails on its name, its nudity, and the fact that cropping the
   nudity crops the mechanism. Judgement's caption fights an audience whose whole question is
   "is this my fault?"
3. **The card provokes a question the funnel must refuse.** Death is the strongest card in the
   deck for making her ask about her dead husband in the paid chat — where the mediumship ban
   forces Evelyn to turn her down, at exactly the trust moment.
4. **The card clears its own block.** The Tower's crown is already being blasted off. *"The
   lightning does the clearing on the card itself, which leaves nothing for a paid ritual to be
   sold as doing."*

### The deck this method was designed for

Meaning, picture and block all agree, and the three blocks are different **kinds** — which is
what stops the three reads on one lander colliding:

| Card | Means | Kind | The block, drawn |
|---|---|---|---|
| **V · The Hierophant** | tradition, conformity | **received** | two kneel with backs turned; keys unheld on the step |
| **XVIII · The Moon** | illusion, fear, subconscious | **unseen** | the road starts in dark water nothing faces; it narrows at the towers |
| **XII · The Hanged Man** | surrender, suspension | **held** | one rope at one ankle, into a beam older than the man |

Per-card bans this deck earns, all writing rather than art:
**Hierophant** — never name church, priest or faith; it reads as a Pope and one segment is
advertised to with prayer copy. **Moon** — never "you can't see clearly"; the stock reading is
deception and it slides into blaming her perception. **Hanged Man** — no *hang/hung/neck* after
beat 1, and retire the male figure after beat 1 or he becomes "him" on a soulmate lander.

---

## How Evelyn sounds — tighter than the seven cuts

Everything in `natural-tarot-cut.md` §"How Evelyn sounds" applies unchanged: picture before
meaning · grade 5 is not comprehensible · conversational · she is the subject. This method adds
three, measured on 2026-08-23 against the live corpus:

1. **One clause per sentence.** Never make her hold a clause open. *"Something handed over that
   nobody ever looked at"* is grade 2 and still hard, because a second clause arrives before the
   first has closed. Sub-clause density is the defect no numeric gate can see — the live 7-cut
   corpus and the first shadow draft both ran **17%**.
2. **Twelve words is the ceiling, not twenty-five.** The shared gate allows 25. This method aims
   10–12 and treats 14 as the limit.
3. **The connective is the spine, and it is checkable.** Every read runs So · But · And ·
   That's why in that order. A read that drops it becomes four observations sitting next to
   each other.

⚠ **The 2-sentence cap fights plainness.** Chopping into short sentences produces three-sentence
bubbles that trip the gate. Merge with a spoken pause (an em-dash), never by re-growing the
clause.

---

## Choosing between the two — measured, not argued

Same five landers, 15 reads each, 75 bubbles each, each measured against its own spine
(2026-08-23):

| | 7-cut | 3-beat |
|---|---|---|
| Avg grade (beat 3) | 1.16 | **0.78** |
| Words per bubble | 12.9 | **11.0** |
| Contractions | 48% | **64%** |
| Sub-clause bubbles | 17% | 17% |
| **Bubbles naming a drawn object** | 20% | **39%** |
| **Bubbles pointing at one** | 9% | **36%** |
| Loop points at roots | 0/15 | **6/15** |
| **Cut 3 answers her flat** | **7/15** | 2/15 |
| Own connective chain complete | 15/15 | 15/15 |
| Aphorisms · long words · grade failures | 0 | 0 |

**Use the seven cuts when** the lander's job is trust and relief — a her-fault question whose
"no, it was never you" is the whole product; a family where the answer is the thing she came
for; any lander on a deck whose cards mean hope, power or completion.

**Use the inherited shadow when** the lander's job is to hand the pitch a live problem — money
and block-native questions where the ad already put a block in her head; families whose upsell
take matters more than front-end conversion; decks whose cards mean tradition, fear or
suspension.

**Neither is proven.** The seven cuts are the incumbent with live numbers; the three beats are
better on every measurable craft dimension and give up the flat answer. Read the result on
**revenue per 1,000 conversations**, not buy-rate — this method's claimed benefit lands in
upsell take (U1 literally sells *"protect what we cleared"*), which buy-rate hides.

---

## Gates

Every gate in `natural-tarot-cut.md` applies. Two additions this method earns:

- **The authorship tripwire.** The guard file gets four deliberate violations, not one: a named
  relative, a gestured-at relative ("someone close to you"), a generation count, and "you passed
  it to your children".
- **The meaning check.** Before drafting, confirm `TAROT_CARD_VOCAB` for that deck says the same
  thing the read will say. If it does not, either pick a different card or write the vocab —
  never let B and C disagree.

The Version-C smoke is not optional here. The canned bubbles are the easy half; the model
writing to what she actually types is where an inherited shadow will most want to grow an
author.

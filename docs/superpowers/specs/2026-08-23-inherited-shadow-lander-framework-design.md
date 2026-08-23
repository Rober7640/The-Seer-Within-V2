# The Inherited Shadow — a three-beat lander framework

**Date:** 2026-08-23 · **Status:** design, approved in brainstorm · nothing built

A second read set for the 30 already-wired soulmate and money landers, run as a split arm
against the live Natural Tarot-Cut. Where the seven cuts ANSWER her question, this one
withholds the answer behind a block — and names the block as something passed down her
family line, which is what the V1 chat already says eight minutes later.

---

## 1 · Why this exists

`improve-v1/08-clearing-theme-coherence.md` (2026-07-05) found the defect this framework is
built to fix:

> **The problem is over-built vs. the solution.** The crisis arc spends many turns making the
> *block* vivid, but "clearing" is **sprung** at the pitch rather than seeded as the inevitable
> resolution.

Act 1 sells an **Energy Clearing Ritual** that will *"trace the roots of this block, sever its
hold, and seal the clearing so it can't return"* (`useConversation.ts:1933`). By the time she
reads that sentence, nothing has told her the block **has** roots.

The seven-cut lander does not help. It answers her question, hands her relief, and seeds the
block in one line — cut 7. That is the correct shape for a lander whose job is trust. It is the
wrong shape for a lander whose job is to make a clearing ritual feel necessary.

### This is a port, not an invention

The mechanism is already written, in the chat, in Evelyn's voice. `server/lib/prompts.ts:722`,
the `shadowSummary` pitch step:

> 1. Name the SPECIFIC block and where it came from:
>    *"What I see is a generational imprint — passed down your family line…"*
>    *"There's an inherited pattern that's been deflecting [love/prosperity/clarity]…"*
> 2. Connect it to their SPECIFIC symptom — explain WHY their situation exists:
>    *"This is why you [specific struggle] but never [get the result]…"*
> 3. Create the "why you" specificity.

And `BLOCKED_ABUNDANCE` carries the money version outright at `prompts.ts:177` — *"There's a
pattern in your family around money… passed down through generations"* — with its crisis framing
at `:187`: *"A generational imprint is deflecting prosperity from your field."*

So the lander is not getting a new mechanism. It is getting **the chat's own mechanism, eight
minutes earlier**, so that "trace the roots" lands as the obvious next step instead of arriving
from nowhere.

---

## 2 · The three beats

Folded into the existing four registry slots, so every structural guard keeps meaning what it
meant: `[0]` is still the picture, `[3]` is still the open loop, and `reads[h][c].length === 4`
still holds across the 24 test files that pin it.

| Slot | Beat | Job | Opens on |
|---|---|---|---|
| `[0]` | *(picture)* | One or two details literally on the art | — |
| `[1]` | *(bridge)* | Her question back, plus the card in plain English | — |
| `[2]` | **1 · The inheritance** | Name it, and say it came down the line — so it was never hers | *So…* |
| `[2]` | **2 · The cost** | What it has been taking, and the week she has actually lived | *And… / That's why…* |
| `[2]` | **3 · The glimpse** | What is behind it is good, and it is close | *But…* |
| `[3]` | **The loop** | Where it came into the line | *Let me look closer at…* |

The connective order is deliberately **not** the seven-cut's. That one resolves —
answer → deepen → turn → explain. This one escalates — block → its work → its cost → and only
then, hope. Escalation is what creates need; resolution is what removes it.

### Worked example — `cards-my-energy` (money-energy), card A

> *You turned the Magician, dear. Look — …one true detail on the card, written per lander.*
> *You asked if your energy is blocking your money. Your hand went to the card of will and intention.*
> **So no, dear. What's in the way came down to you — it was running before you were born.**
> **And it's been taking the same thing off you each time, dear. Right as it's about to land.**
> **That's why you've worked harder than most and the reward's never matched.**
> **But your own energy is clean, dear. This card is lit and nothing on it is dimmed.**
> *Let me look closer at where this came into your line…*

The third line is `BLOCKED_ABUNDANCE` almost verbatim. The lander and the chat say the same
sentence.

### Worked example — `cards-blocking-soulmate` (soulmate-keyword), card A

> **So yes, dear. Something is — and it isn't yours. It came down the line to you.**
> **And it's been stepping in at the same point every time, dear. Just as it starts to hold.**
> **That's why the near ones went furthest, dear. And then stopped.**
> **But there's a meeting on this card, dear, and it's nearer than you've been told.**
> *Let me look closer at where this first came into your line…*

---

## 3 · The four rules

The seven cuts have four rules that decide whether a read WORKS
(`fb-tarot/docs/natural-tarot-cut.md`). These are this framework's, and the fourth is the one
the seven cuts never state.

1. **The shadow came down the line, and it has no author.** It predates her. That is what makes
   it removable, what makes it not her fault, and what makes "trace the roots" mean something.
   It is never a person — see §4.
2. **The shadow is near, not far.** It sits between her and the thing, close enough to reach.
   Distance kills urgency; a block "somewhere in your past" cannot be cleared this week.
3. **The shadow has fingerprints.** Beat 2 must hand her a week she has actually lived and say
   the shadow caused it. Without that, the shadow is a claim she has to take on trust — and the
   VOC pull is the only place those fingerprints come from.
4. **The shadow is removable, and she cannot reach it alone.** Both halves, every read.
   Removable or there is no product. Out of her reach or there is no purchase.

### The glimpse is a withheld positive, never a refusal

The pre-2026-08-19 framework was retired because it *"refused to answer and certified her
instead"* — she got no answer and felt conned. This framework withholds the answer too, so the
distinction is load-bearing:

- **Refusal** — "no reader can tell you that." She leaves with nothing.
- **Withheld positive** — "it's there, it's good, and something is stood in front of it." She
  leaves knowing the answer exists and what is between her and it.

The guards went DIRECTIONAL on 2026-08-19, which is what makes the second one legal now and did
not before. The hopeful half may be stated; the half with a victim may not.

---

## 4 · The ban that this framework lives one word away from

`prompts.ts:1844`, the money guard:

> **NEVER NAME A PERSON AS THE BLOCK** — not a relative, a partner, or "someone close to you";
> a card cannot see it and the accusation lands on someone real inside a real family.

A family-line shadow is the nearest a lander has ever come to that ban. The line is
**authorship**:

| Allowed | Banned |
|---|---|
| "it came down the line to you" | "your mother", "your grandmother", "someone in your family" |
| "it was running before you were born" | "a woman in your line did this" |
| "this was handed on, and nobody chose it" | "someone close to you is holding it" |
| "the pattern is older than you" | any relative, living or dead, named or gestured at |

A pattern with no author accuses nobody. The moment it acquires one, it is an accusation against
a real person inside a real family, and she will act on it at the next family dinner.

### Two bans inheritance clears for free

- **Never blame her.** It predates her, so it structurally cannot be her fault. This is a better
  answer to the six her-fault soulmate headlines than the keyword frame's current move.
- **Never name a cause she could act on.** A generational imprint is not a decision she made,
  so it cannot become financial advice or a tactic.

### Bans that ride along unchanged

All seven money bans stand — no amount, no date, no source, no financial advice, no blaming her,
never "too late", never "money is coming", never presume her finances. The soulmate frames keep
their duration, place, tactic and mediumship bans. Nothing here is loosened.

### New bans this framework invents

- **No curse, no hex, no karma, no past life.** "Passed down" is a pattern, not an affliction,
  and the platform reads the other words as occult-harm claims.
- **No trauma or diagnosis language.** No inherited trauma, no epigenetics, no attachment, no
  ancestral wound. The keyword frame already bans this class; it is more tempting here.
- **Never date the inheritance.** No generations counted, no "three women back", no century. A
  count is a fact she can check and a failed one is a refund.
- **Never say she passed it on.** Her children are not carrying it. That sentence lands on a
  real child and there is no version of it that helps.

---

## 5 · How it gets served

### Not a version `d`

`resolveTarotVersion` (`experiments.ts:1687`) resolves only `'b'` or `'c'` and returns the
fallback for anything else. The version axis means **how the read is delivered** — `b` is the
canned read, `c` is the live LLM one. Adding a `d` for a copy framework would conflate delivery
with content and make every existing b-vs-c number unreadable.

### A second read set on the same hook

`CardSetConfig` gains an optional parallel table:

```ts
reads:        Partial<Record<TarotHook, Record<TarotOption, string[]>>>
readsShadow?: Partial<Record<TarotHook, Record<TarotOption, string[]>>>  // ← new
```

`readsFor(deck, hook)` gains an arm argument. A new experiment key —
`v1_tarot_shadow_frame_2026` — assigns the arm per visitor, scoped by `(hook, deck)` exactly as
the existing lander-scoped tests are. Payload carries `{ frame: 'shadow' }`; absent, malformed,
or control ⇒ the existing read, byte-identical to today.

This is additive. With the experiment in DRAFT, nothing changes for anyone.

### Reporting

`angleForHook` is untouched, so the existing angle labels keep working. The arm rides the
exposure log alongside `deck × hook × card × version`, and the readout is
**revenue per 1,000 conversations**, not buy-rate — buy-rate hides upsell take, and this
framework's whole claim is that it sells the clearing ritual better, which shows up in Act 1
conversion and in the U1 "protect what we cleared" take-rate rather than in the front end alone.

---

## 6 · Scope

| | |
|---|---|
| Landers | **30** — soulmate age-band 11, soulmate keyword 8, money 11 |
| Reads to write | **90** (30 × 3 cards) |
| Arms | 2 — live seven-cut as control, inherited shadow as the test |
| Shape | Shadow → Cost → Glimpse |
| Not in scope | The 43 alone/commit landers; `cards-feels` and `cards-return`; the closure and soulmate-return families |

Every one of the 30 is already wired and serving, so the control arm needs no work.

---

## 7 · Gates before it ships

Same pipeline as any new family, plus two additions the family-line ban earns:

1. `node scripts/check-draft.mjs` — readability, syllables, comprehension, contraction floor
2. `npx tsx scripts/check-collisions.mts` — beat-1 art uniqueness, beat-3 six-word runs.
   ⚠ Expect this to bite hard: 30 landers written to one four-line chain, on the same three
   cards, and the mandated openers are shared. The 43-lander batch hit 79 on the first pass.
3. `tests/tarot-inherited-shadow-copy.test.ts` — its own guard file. Must load the draft JSON
   while unwired and the registry once wired, and say which in its `describe()`.
4. `node scripts/guard-tripwire.mjs inherited-shadow` — **required, not optional.** Every ban in
   §4 gets a deliberate violation fed to it. The authorship ban gets four: a named relative, a
   gestured-at relative, a generation count, and "you passed it to your children".
5. Version-C smoke — build the real prompt and check the generated reply, twice: as it stands,
   and with the shadow clause in the frame. The canned beats are the easy half; the model
   writing to what she types is where the authorship ban will actually be tested.
6. Human review gate — nothing wired until the copy has been read.

---

## 8 · Open questions

- **Does the Version-C frame change too?** The canned read would say "it came down your line"
  while the LLM reply says whatever the current frame says. Leaving C alone keeps the test clean
  (one variable) but makes B and C contradict each other on the same lander. Recommendation:
  leave C alone for the first read, and treat a C-side port as the follow-up if B wins.
- **Does the pitch get the un-orphaning fix at the same time?**
  `improve-v1/08` §"Change 1" recommends naming the ritual in the live pitch. Doing both at once
  confounds them. Recommendation: ship the lander arm first, since it is the one under test.
- **Do the six her-fault soulmate landers move to inheritance permanently if it wins?** Their
  current frame turns the keyword into an asset; inheritance answers the same question more
  cleanly. Out of scope here, but it is the obvious follow-on.

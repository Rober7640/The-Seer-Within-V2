<!-- 🔒 CANONICAL. This file is the ONE source for the Inherited Shadow method.
     Its sibling is fb-tarot/docs/natural-tarot-cut.md — the Natural Tarot-Cut (7-cut).
     BOTH ARE LIVE METHODS. Neither supersedes the other. The skill asks which one to use
     before drafting; §"Choosing between the two" below is the decision.
     Added 2026-08-23. Canonical rulings updated 2026-08-25. Nothing built on it yet — see §Status. -->

# The Inherited Shadow

> 📋 Which landers run which method: **`fb-tarot/docs/lander-registry.md`** — every lander, by category, with the method each one
> runs. **Generated** (`npx tsx scripts/lander-registry.mts`), so it cannot drift from the code.

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

## The three candles

The shape is Evelyn's own **three candles**, from `improve-v2/specs/evelyn-v2-prompt-B16.md`
§HOW A READING LANDS — not something invented for this funnel:

> Through the image, three candles as flowing prose (never labeled, never a list):
> **WHAT I SEE** — concrete-feeling, in their details. **THE BLOCK** — *the image's shadow
> side*, the pattern they can't see from inside; the candle that makes clients say "how did you
> know," and it should sting a little. **THE OPENING** — what is shifting, and what to watch
> for, riding the image.

⚠ **"The image's shadow side" does NOT mean invert the card.** In B16 the image is one Evelyn
forges from the client's own words, so its shadow side is *the client's* blind spot. On a tarot
lander the image is a fixed card with a public meaning, and reading its "shadow side" as the
opposite of what it means is how the Magician's lemniscate became a treadmill. Here the shadow
side is **the gap between what the card says she can do and what has actually happened** — see
§The card is the WARRANT.

**SIX beats, and they run as one argument:**

> **claim → proof → what it means for her → but → so → look closer**

Each bubble does one job and none of them repeats another. Proven in chat on four live questions
— `cards-heal-first`, `cards-wont-commit`, `cards-blocked-retiring` and `cards-soulmate` — on
2026-08-23. The registry fold is NOT written yet and is not needed until a lander is wired; a
beat may carry `\n` and split itself, so the beat COUNT is free and only the fold has to be
checked when the time comes.

| # | Beat | Job | Without it |
|---|---|---|---|
| **1** | **Claim** | **The uncanny reach.** She could not see the card, and her hand still went to the one that answers her question. The claim is about HER, never about the deck | She braces, and reads the rest defending herself |
| **2** | **Proof** | Point at the detail in the art that proves the claim | The verdict is Evelyn's opinion, not the card's |
| **3** | **What it means for her** | Say her question back, then say what the card puts in front of Evelyn. It OPENS the question — it never answers it | It stays a fact about a picture, and she is not in it |
| **4** | **But** | Her situation, stated flat — only what the ad already establishes | Nothing forces the deduction; it stays a horoscope |
| **5** | 🎯 **So** | The conclusion — and **the thing she is being asked to pay to remove.** It carries ONE variable handle she can picture — position, timing or manner — PLUS the mandatory measured origin finding: *"I don't think this began with you"* | The block is a blank, or the inherited mechanism never enters the read |
| **6** | 🎯 **Look closer** | A neutral pointer to the obstruction beat 5 established. It adds no property — no age, precedence, duration, manner, position or timing — and no new claim | She has no reason to type, or the loop quietly changes the method |

Beat 6 is what makes her type. Beat 5 is what makes beat 6 worth answering. Spend the writing
time on those two — but not by making them louder, because what they need is to be *earned* by
the four above them.

⚠ **Beats 4 and 5 are named for the jobs they do, not for words the copy has to use.** *"And
yet"* is a beat 4; *"That tells me"* is a beat 5. The order is fixed, the wording is not — see
§How Evelyn sounds rule 3.

### Claim, then proof — beats 1 and 2 are a pair

Bubble 1 makes a claim she cannot check. Bubble 2 hands her the proof, and the proof is a real
detail she is looking at while she reads:

> **1.** You chose the Empress, dear. Of the three, your hand went to the one that's already full.
> **2.** Look at the wheat at her feet. It's gold and it's grown — every ear of it.

⚠ **Bubble 1 must not be a pleasantry.** The first version read *"Good — I'm glad you went to
that one."* It says nothing about her, nothing about the card, and it leaves bubble 2 with
nothing to prove. It is also unfalsifiable praise, which is the horoscope voice. A fresh claim
per card is more work than a stock line, and it is the work that makes bubble 2 land.

### 🔴 Beat 3 opens the question. It does not answer it

⛔ **ADDED 2026-08-24, and it is the correction that follows the voice rewrite.** Beat 3 used to
be written as *"put the card's meaning on HER"*, and once the read stopped sounding mechanical
that instruction started producing **verdicts**:

| What beat 3 came out as | Why it is wrong |
|---|---|
| *"you already have what this takes"* | it answers her question. She came to ask whether she needs to heal, and Evelyn has just told her no |
| *"a pause, not someone who is broken"* | same answer, in a kinder coat |
| *"this card isn't asking you to be finished"* | same again |

**The card is an opener.** She is meant to leave beat 3 thinking *"she saw something real in my
card, and she hasn't got to the answer yet"* — never *"she has already told me I don't need to
heal."* The moment beat 3 rules, the read is over at bubble 3 and there is nothing for the paid
chat to be for.

> 🔴 **THE RULE: beat 3 connects the card to her question, and makes no judgment about her
> healing, her readiness, or whatever her ad asked.**
>
> 🔴 **THE GOVERNING LINE: the opener may LOCATE the mystery. It must not RESOLVE it.**

What it does instead is hand her **Evelyn's attention** — the thing in the card that made Evelyn
stop:

| Card | Beat 3 |
|---|---|
| The Magician | "You asked whether you need to heal first. What catches me is that nothing on his table is missing." |
| The Hanged Man | "You asked whether you need to heal first, dear. This card makes me look at the waiting in your question." |
| The Fool | "You asked whether you need to heal first. This card brings me to the very start of something." |

⚠ **The verb must not fight the card.** An earlier Fool read *"what this card STOPS on"* — and
the Fool is mid-step, already moving. Locating the mystery is fine; freezing a card that walks is
a quiet version of §Never invert the card, and it costs the picture its own meaning. Look at what
the figure is doing, then pick a verb that agrees with it.

⚠ **She is still in it** — that is what the question echo and Evelyn's attention are for. The old
failure (*"it stays a fact about a picture, and she is not in it"*) comes back the moment beat 3
is only about the art. Her question is named in every one of them.

⚠ **The warrant survives.** §The card is the WARRANT still runs — *nothing on his table is
missing* carries the same capability the old verdict did, and beats 4 and 5 draw exactly the same
deduction from it. What changes is that Evelyn observes it rather than ruling on it.

🔴 **It reaches beat 5 too.** Beat 5 names one variable handle for the obstruction and the
mandatory measured origin finding. It may NOT turn either one
into the answer: *"so being ready was never the thing"* and *"the fixing was never the first
step"* are verdicts wearing a beat-5 costume. The origin finding — *"I don't think this began
with you"* — is required because it is about where the obstruction came from, not about her
state. It is measured, never declared as a fact she could verify.

### 🔴 Beat 5 was a cold read, and that is what broke

⛔ **SUPERSEDED 2026-08-23.** Beat 5 used to read: *"The recognition — a lived moment she would
swear you could not know."* That is a cold read, and it is the single instruction behind every
fault the operator caught in a day of drafting:

| What it produced | What is wrong with it |
|---|---|
| *"you've been told to fix yourself first — more than once, by more than one person"* | an invented **count**. If she was told once, the first specific thing Evelyn says about her life is false |
| *"you still cook a proper meal when it's only you"* | assumes she cooks, and that she eats alone |
| *"you go through the numbers again"* | assumes she has numbers to go through |

The defence at the time was that a miss would be silent. **It is not.** She does not skip the
line — she registers a small wrong note, and enough of those turn a reading into a horoscope.

**Beat 5 is now a conclusion drawn from beats 3 and 4**, so there is nothing in it to be wrong
about:

> **3.** You asked when your soulmate is coming. You've nothing left to get ready, dear.
> **4.** But nobody's come, dear. And you're still the one waiting.
> **5.** So the hold-up isn't you, dear. It's something standing in the way.

**The trade, taken on purpose.** We lose the jolt. *"You still cook a proper meal when it's only
you"* could make a woman sit up; *"so the hold-up isn't you"* will not. What we get is a read
that cannot be caught out, and one that **argues** instead of guessing — which is closer to how
a good reader actually talks than a lucky guess about her kitchen.

**The cold read is postponed, not deleted.** It belongs in the paid chat, after she gives her
name, where Evelyn has her own words to read back to her. On the lander there is nothing to read
her from, so every specific line about her life is invention. In the chat it is not.

### 🔴 Beat 4 may say ONLY what the ad already establishes

This is the rule that cost the most on 2026-08-23. Beat 4 was written as *"you've been told to
fix yourself first — more than once, by more than one person."* Nobody had told us that. It is a
**count**, and if she was told once, or worked it out herself off the internet, then the first
specific thing Evelyn says about her life is false and everything after it is discounted.

Beat 4 restates the ad's own premise and nothing else. On `cards-heal-first` that is: she is
asking whether she needs to heal, and nobody has come. Both are certain for anyone who clicked.

**The same rule now covers the whole read, not only beat 4.** Nothing anywhere in the six beats
may be a fact about her life that she could catch you getting wrong:

| The line | If it is wrong |
|---|---|
| *"more than once, by more than one person"* — a **count** | she catches you. It is checkable, and the read is over |
| *"you still cook a proper meal when it's only you"* — a **behaviour** | a small wrong note. Enough of them and it reads as a horoscope |
| *"you're the one being asked to change"* — an **implied third party** | somebody did the asking, and nobody ever said anyone did |
| *"something turns up every time you get close"* — an **implied frequency** | a count with the number taken out. It claims this has nearly happened more than once |
| *"you'd never have noticed it start"* — an **implied perception** | it tells her what she did and did not see. She is the one person who knows |
| *"so the hold-up isn't you"* — a **conclusion** | nothing to catch. It follows from the two bubbles above it |

Counts, numbers, dates, life events and behaviours are all guesses. The conclusion is not — which
is the whole reason beat 5 stopped being a cold read.

🔴 **The bottom three were found on 2026-08-24, in the first three reads written to the new
voice.** They matter because of where they came from: the voice got better and the evidence got
worse. A stiff sentence wears its claim on the outside, so a false one is easy to see. A fluent
sentence carries the same claim as a subordinate clause nobody stops on — *"the one being asked
to change"*, *"every time you get close"* — and it slips past a read-through that was only
listening for how it sounds. **Read once for sound, then again for evidence.** They are two
passes, not one.

### 🔴 The loop is a neutral pointer, not an object or a second property

Beat 6 points back at the thing beat 5 just named, and asks about it plainly:

> **5.** Something is sitting right at the beginning. I don't think it began with you.
> **6.** Let me look closer at what's sitting there…

It needs no prop, new noun or second handle — beat 5 has already handed it an obstruction. Beat 6
may use a bare pointing verb (*"what's sitting there"*, *"what's holding this"*) but it may not
repeat the value of the handle: no *"in that gap"*, *"at that point"*, *"what came first"* or
*"what never shifts"*. Those phrases carry position, timing, precedence or manner into the loop.

⛔ **Do not invent an object for it.** A rule was written on 2026-08-23 saying the loop must name
a picturable thing, to fix loops like *"what's in the way"* that point at nothing. It produced
*"the fence that was put up long before you walked to it"* — there is no fence, and she has to
decode it. That rule is deleted. The operator's already-signed-off loops (`cards-who-he-is`) are
plain questions and they work.

## Worked examples — three questions, nine reads

Three questions, three cards each, preserved as the historical six-beat development set. They
cover three frames and both live decks, and each one is carrying a different hard ban.

🔴 **STATUS.** These nine reads predate the 2026-08-25 origin and neutral-pointer rulings. One
card here — the Empress on `cards-soulmate` — was approved line by line for its voice on
2026-08-23; the other eight were never signed off individually. Do not copy their beat 3, 5 or 6
shape into a current lander. Every bubble 1 below is taken from
`fb-tarot/docs/decks/card-claims.md`, and every bubble 2 from the deck's `symbols.md`.

🔴 **THE NINE READS BELOW ARE HISTORICAL, NOT CURRENT REFERENCES.** They run the retired voice,
answer from beat 3 in places, omit the mandatory origin finding from beat 5, and let beat 6 carry
a property. They remain as the development record for the claim/proof/contradiction logic only.
For current shape and sound, use §The current reference read and the approved
`fb-tarot/docs/drafts/shadow/REVIEW-new-voice.md`.

### 🔴 Beat 5 is the OFFER, and a blank does not sell

⚠ Read beats 5 and 6 as a pair. **Beat 5 has to hand beat 6 something to take hold of.** If beat
5 ends on a bare *"something else is in the way"*, then beat 6 can only ask *"what is in the
way?"* — which is the category loop 287 of the 323 live loops already fall into.

🔴 **SUPERSEDED 2026-08-24.** The line here used to read *"give the thing a handle in beat 5 —
stopping it landing, one thing, getting there first."* Those three examples ARE the generic
ending, and writing 37 landers to them produced **"something is in the way" in ~100 of 111
reads** — the exact fault the paragraph above warns about. An instruction whose examples
demonstrate the defect will reproduce the defect.

**What beat 5 is for.** Rule 4 of this method says it outright: *"Removable or there is no
product. Out of her reach or there is no purchase."* Beat 5 is not a tidy conclusion. It is the
**thing she is being asked to pay to have removed**, and she will not pay to remove something
she cannot picture. It is the offer, and it is the one beat where vagueness costs money rather
than trust.

**So beat 5 gives the block ONE variable handle PLUS the mandatory origin finding.** Never what
the block IS — naming it is the paid chat's job, and §The authorship ban is why. The handle
accuses nobody:

| Property | Sounds like | Why it sells |
|---|---|---|
| **timing** — it arrives at a moment | *"it turns up whenever this gets close"* | she recognises the pattern; she has lived it |
| **position** — it sits somewhere | *"it steps in at the landing"* | near, not far, so it can be cleared this week |
| **manner** — how it behaves | *"it has held this quietly"* | explains why she never caught it herself |

🔴 **Age is retired as a handle.** Once the origin finding became mandatory, an age handle said
the same thing twice. The three handles are now **position, timing and manner**.

🔴 **The measured origin finding is how the inheritance gets in.** Every beat 5 carries a plain
variation of *"I don't think this began with you."* It is a required mechanism, separate from
the one variable handle. It does the commercial work, never dates the inheritance and names
nobody — see §The authorship ban. **The lander never says "family line".**

⛔ **A handle is not a fingerprint.** Rule 3 stands: the obstruction has position, timing or
manner, not a lived moment of hers. *"It turns up when things get close"* is a handle on the
block. *"You go quiet when things get close"* is a cold read about her, and it is banned.

---

### 1 · `cards-heal-first` — *"Do I need to heal before my soulmate arrives?"*

`return-mhf`, face down · soulmate-keyword frame · **the ad tells her she is the problem**
🔴 The read may not rule on her healing in either direction. The warrant sidesteps it: it is a
statement about capability, never a verdict on her state.

| # | a · The Magician | b · The Hanged Man | c · The Fool |
|---|---|---|---|
| **1** claim | You turned the Magician, dear. Of the three cards, your hand found the one who came ready. | You turned the Hanged Man, dear. Of the three cards, your hand found the calmest man in the deck. | You turned the Fool, dear. Of the three cards, you reached for the one carrying almost nothing. |
| **2** proof | Look at his table. A cup, a coin, a blade and a wand — all of it already laid out. | Look at him. He's hanging upside down, and his face is calm. | Look at what he's carrying. One small bundle on a stick — that's all he owns. |
| **3** her | You asked if you need to heal first. You came with all you need, dear. | You asked if you need to heal first. You're not broken, dear — you've been held up. | You asked if you need to heal first. You don't need it all sorted before you set off, dear. |
| **4** but | But nobody has come, dear. And you've started to wonder if it's you. | But nobody has come, dear. And the question keeps coming back. | But nobody has come, dear. And you're still asking whether you're ready. |
| **5** so | So the missing piece isn't in you, dear. Something else is standing between you and it. | So it isn't you that needs mending, dear. Something else is holding this. | So being ready was never the thing, dear. Something else has been getting there first. |
| **6** look closer | Let me look closer at what's been standing there… | Let me look closer at what's doing the holding… | Let me look closer at what keeps getting there first… |

### 2 · `cards-blocked-retiring` — *"Why is my money still blocked this close to retiring?"*

`return-mhf`, face down · money frame · **the strictest guard on the funnel**
🔴 No amount, no date, no source, no financial advice, never "too late", never presume she is
broke. Every beat 4 says it has not *stayed* — never that she has none.

| # | a · The Magician | b · The Hanged Man | c · The Fool |
|---|---|---|---|
| **1** claim | You turned the Magician, dear. You couldn't see it, and your hand still went to the worker of the three. | You turned the Hanged Man, dear. Of the three cards, your hand found the one held by a single rope. | You turned the Fool, dear. You couldn't see it, and your hand still went to the only card here in full sun. |
| **2** proof | Look at his hands. Both of them are busy, and neither one is resting. | Look at the rope. One ankle, and the rest of him hangs loose. | Look at the sky behind him. It's gold, and there's not one cloud in it. |
| **3** her | You asked why the money's still blocked. You did the work, dear — that part was never in question. | You asked why the money's still blocked. It's being held, dear — it hasn't gone anywhere. | You asked why the money's blocked so near retiring. You're not near the end of this, dear. |
| **4** but | But it's still blocked, dear, and retiring is close. | But it's still not with you, dear, this close to finishing. | But it's still blocked, dear. And retiring keeps getting nearer. |
| **5** so | So the earning was never the problem, dear. Something else is stopping it landing. | So it isn't gone and it isn't yours, dear. One thing is holding it there. | So it isn't time you're short of, dear. Something is sitting in front of it. |
| **6** look closer | Let me look closer at what stops it landing… | Let me look closer at that one thing… | Let me look closer at what's sitting in front of it… |

⚠ **3b is the line to watch.** *"It hasn't gone anywhere"* is the closest any read comes to the
ban on promising money is coming. It is kept because it is the signed-off control's own finding
(*"the money is held… held is a long way from gone"*), but a compliance read should stop on it.

### 3 · `cards-soulmate` — *"When is my soulmate coming?"*

`arcana-eef`, face UP so the verb is **"You chose"** · self-frame · **she asks WHEN, and every
timeframe is banned** — no month, no season, no count of weeks, no "soon".

| # | a · The Emperor | b · The Empress ⭐ | c · The Fool |
|---|---|---|---|
| **1** claim | You chose the Emperor, dear. Of the three, your eyes went to the one that doesn't move. | You chose the Empress, dear. Of the three, your hand went to the one that's already full. | You chose the Fool, dear. Of the three, your hand went to the one already on its way. |
| **2** proof | Look at his chair. It's cut from stone, and he hasn't left it. | Look at the wheat at her feet. It's gold and it's grown — every ear of it. | Look at his feet. He's mid-step — one foot moving, the other still down. |
| **3** her | You asked when your soulmate is coming. What you're waiting for is real, dear. | You asked when your soulmate is coming. You've nothing left to get ready, dear. | You asked when your soulmate is coming. This card says it starts without warning, dear. |
| **4** but | But nobody's here yet, dear. And you're still the one asking. | But nobody's come, dear. And you're still the one waiting. | But it hasn't started yet, dear. And you've been watching for it. |
| **5** so | So you haven't been waiting for nothing, dear. Something has been getting in the way of it. | So the hold-up isn't you, dear. It's something standing in the way. | So the date was never the stuck part, dear. Something else is. |
| **6** look closer | Let me look closer at what keeps getting in the way… | Let me look closer at what's been standing there… | Let me look closer at what the stuck part actually is… |

⭐ = the card approved line by line by the operator.

**What the three examples between them demonstrate:**

| | |
|---|---|
| The ad blames her, and the card acquits her | example 1 |
| The strictest guard on the funnel, and the shape still holds | example 2 |
| A question the funnel is banned from answering — answered sideways | example 3 |
| Both decks, and both facings — *You turned* vs *You chose* | 1 and 2 vs 3 |
| The picture doing work a banned sentence cannot | 3b — she asked *when*, and the field is already ripe |

### 🔴 The card is the WARRANT, never the block

The block is not in the card. **The card's meaning is what proves the block must exist.**

> the card says she CAN → and yet it hasn't happened → **therefore something is in the way,
> and it isn't her**

That deduction is the engine, and it only works if the card is read **as it actually means**.
A strong, positive card is a *better* warrant than a shadowy one, because it establishes
capability before anything is named:

| Card | Says | Therefore |
|---|---|---|
| The Magician | you have every tool, and the will to use them | you are not what is missing |
| The Empress | everything grew | and none of it reached you |
| The Sun | the light is full on you | so something stands between you and it |
| Strength | you have had the strength | and it still did not move |

⚠ **Never invert a card to find a block in it.** Operator correction, 2026-08-23: an early
draft read the Magician's lemniscate as *"it comes back to where it started"* — a treadmill.
It is the symbol of **unlimited potential**. Taking the deck's clearest sign of mastery as
evidence of futility is the exact failure the warrant rule exists to prevent, and any reader
who knows tarot catches it instantly.

### The connective order is the difference, and it is deliberate

| Method | Chain | Doing |
|---|---|---|
| Natural Tarot-Cut | So · **And** · **But** · That's why | **resolves** — answer, deepen, turn, explain |
| Inherited Shadow | **But** (beat 4) · **So** (beat 5) | **argues** — the contradiction, then the conclusion it forces |

⚠ The table names the connectives for the jobs they do. The copy may say *"And yet"* and
*"That tells me"* instead — §How Evelyn sounds rule 3. What may never move is the order.

The seven cuts resolve: they hand her the answer. This method argues. It shows her the
contradiction and lets the conclusion fall out of it, which is why the block never has to be
asserted — she gets there one bubble before Evelyn says it. Getting the order wrong turns this
method back into the seven cuts with a shadow bolted on.

---

## The four rules that decide whether it works

1. **The shadow came down the line, and it has no author.** Beat 5 carries the measured origin
   finding *"I don't think this began with you."* That is what makes it removable, what makes it
   not her fault, and what makes "trace the roots" mean something. See §The authorship ban —
   this is the one that ends the run if it breaks.
2. **The shadow is near, not far.** It sits between her and the thing, close enough to reach.
   Distance kills urgency; a block "somewhere in your past" cannot be cleared this week.
3. **The shadow has a HANDLE, not fingerprints.** ⛔ This rule used to read *"beat 5 must hand
   her a week she has actually lived"*. That is the cold read, and it is retired — see §Beat 5
   was a cold read. What beat 5 names now is one picturable property of the obstruction — its
   position, timing or manner. The handle follows from the card and her ad; her week does not.
4. **The shadow is removable, and she cannot reach it alone.** Both halves, every read.
   Removable or there is no product. Out of her reach or there is no purchase.

Rule 4 is the one the seven cuts never state, and it is the whole commercial engine.

### The glimpse is an opening, never a refusal

The pre-2026-08-19 framework was retired because it *"refused to answer and certified her
instead."* This method withholds too, so the distinction is load-bearing:

- **Refusal** — "no reader can tell you that." She leaves with nothing.
- **Opening** — Evelyn echoes the question, points to what caught her in the card, then names an
  obstruction with a handle and origin. The answer remains withheld, but she has a specific
  reason to continue.

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

> 🔴 **DECIDED 2026-08-24; UPDATED 2026-08-25: the LANDER never says "family line."** The
> inheritance enters through the mandatory measured origin finding — *"I don't think this began
> with you"* — which carries the mechanism without dating it or naming anyone. The generational
> framing stays in the paid chat, where Evelyn has her name and her own words. Every mention of
> the family line below describes what the CHAT does, not what a lander may say.

| Allowed | Banned |
|---|---|
| "I don't think this began with you" | "your mother", "your grandmother", "someone in your family" |
| "I don't think any of it began with you" | "a woman in your line did this" |
| "this didn't start with you" | "he started it" · "who laid that table" |
| "I don't think it started with you" | "someone close to you is holding it" |

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

## 🔴 Never invert the card

> ⛔ **SUPERSEDED 2026-08-23.** This section used to be headed *"The card must MEAN the block"*
> and it ruled out eight cards — the Fool, the Magician, the Empress, the Chariot, Strength, the
> Star, the Sun, the World — on the grounds that their meaning "fights" a block. **That premise
> was wrong.** It assumed the card has to *contain* the block. It does not: the card is the
> warrant, and a positive card is the strongest warrant there is (see §The card is the WARRANT).
> **No card is ruled out by its meaning.** The rule that replaces it is below.

`server/lib/prompts.ts` injects each card's meaning into the Version-C prompt via
`TAROT_CARD_VOCAB` — e.g. *"the Magician, the card of will and intention."* **Read the card as
that says**, and use it as the warrant for beat 3.

The failure to guard against is not a card whose meaning is too bright. It is a read that
**turns a card against its own meaning** to manufacture a block:

| ✗ inverted | ✓ used as warrant |
|---|---|
| "that loop comes back to where it started" | "every tool he needs is out — you can do this" |
| "each new start went the old way" | "this card says you're able to start" |
| "the wheat stands uncut, nothing was taken in" | "look how much grew — and none of it reached you" |

An inverted read fails twice over: Version B and Version C contradict each other on the same
lander, and she can look the card up in ten seconds and find you were wrong about it.

**One check, run in the pre-flight:** put `TAROT_CARD_VOCAB`'s line next to beat 3. If beat 3
says what the vocab says, the card is usable. If it argues with the vocab, rewrite beat 3 —
never the deck.

### The three ways a card fails

Found by assessing all 22 Major Arcana, one assessor per card, 2026-08-23. ⛔ That audit scored
every card on *"can this card contain a block"* — the wrong question, per §Never invert the
card. Its **safety** findings stand and are the reason the four below are still out; its
block-quality scores should be ignored.

None of these three is about writing. A card that survives them can carry the method whatever
its meaning is:
1. **Copy cannot outrun a title.** The Devil has the best clearing image in the deck — a chain
   loose enough to lift off — and fails on its name, its nudity, and the fact that cropping the
   nudity crops the mechanism. Judgement's caption fights an audience whose whole question is
   "is this my fault?"
2. **The card provokes a question the funnel must refuse.** Death is the strongest card in the
   deck for making her ask about her dead husband in the paid chat — where the mediumship ban
   forces Evelyn to turn her down, at exactly the trust moment.
3. **The card clears its own block.** The Tower's crown is already being blasted off. *"The
   lightning does the clearing on the card itself, which leaves nothing for a paid ritual to be
   sold as doing."*

### Decks

**Any deck can carry this method**, including the live `return-mhf` (Magician / Hanged Man /
Fool). Run it on the deck the family already needs; a new deck is never required by the method
itself.

The one that was purpose-built for it, before the warrant rule was understood, is Hierophant /
Moon / Hanged Man. It is still a good deck — three different flavours of block — but it is now
an option, not a prerequisite:

| Card | Means | Flavour | What the read points at |
|---|---|---|---|
| **V · The Hierophant** | tradition, conformity | **received** | two kneel with backs turned; keys unheld on the step |
| **XVIII · The Moon** | illusion, fear, subconscious | **unseen** | the road starts in dark water nothing faces; it narrows at the towers |
| **XII · The Hanged Man** | surrender, suspension | **held** | one rope at one ankle, into a beam older than the man |

Per-card bans this deck earns, all writing rather than art:
**Hierophant** — never name church, priest or faith; it reads as a Pope and one segment is
advertised to with prayer copy. **Moon** — never "you can't see clearly"; the stock reading is
deception and it slides into blaming her perception. **Hanged Man** — no *hang/hung/neck* after
**beat 2**, and retire the male figure after beat 2 or he becomes "him" on a soulmate lander.

⚠ That says beat 2, not beat 1, and the number moved with the shape: beat 2 is the picture beat
now, so the figure is introduced there and retired there.

---

## 🔴 Pre-flight — four things BEFORE the first bubble

None of these is a gate. A gate catches the fault after the copy exists, and every one of them
then costs a rewrite. Do them in order, on paper, before writing a word.

### 1 · Write beat 3 from the card, not against it

Per §Never invert the card. Pull the deck's entry from `server/lib/prompts.ts` and the visible
detail from the deck symbols, then write beat 3 as the thing in the card that catches Evelyn's
attention. It opens her question without turning the card into its opposite and without saying
what the card proves about her. If it argues with the vocab or answers the headline, rewrite
beat 3; the deck is not the problem.

Proven necessary 2026-08-23: run on the live `return-mhf` deck, the copy passed **every**
mechanical gate while two of three cards contradicted their own stated meaning — the Magician's
lemniscate read as a treadmill, the Fool's new beginnings read as never beginning. No gate in
the pipeline can see this.

### 2 · Write the card grammar, once per deck

One warrant and one pool of visible details per card, constant across every lander on that deck.
That is what lets the obstruction follow from the picture instead of being asserted. Write all
three before any lander.

⚠ Keeping the fact constant while varying the angle is the whole job. Five landers on one card
grammar produced **17 shared six-word runs** on the first pass.

### 3 · Write the THREE OPENERS first, and check they differ

🔴 **This is the one that keeps happening.** Write beat 3 for all three cards — nothing else —
and read them side by side. If two share a six-word run, fix them now, while it costs a line
instead of a read.

**It fires whenever the ad blames her or asserts a block**, because the tempting shortcut is to
answer the headline from every card:

| The ad | The banned shortcut | What beat 3 does instead |
|---|---|---|
| *"Is something blocking me…"* | *"So yes, dear — there is…"* | echo the question, then point to a visible card detail |
| *"Why do I **keep** getting blocked…"* | *"So it isn't you, dear…"* | echo the question, then locate what caught Evelyn's attention |
| *"Is my energy blocking my money?"* | *"So your energy's not it, dear…"* | echo the question, then stay on the card without ruling on blame |

Vary the shape of Evelyn's attention, not merely the noun after a fixed opening:

| | |
|---|---|
| ✗ | "What catches me is…" · "What catches me is…" · "What catches me is…" |
| ✓ | "What catches me is…" · "This card makes me look at…" · "This card brings me to…" |

⚠ **Written as a prose warning first, and it did not work.** The warning went into this doc on
2026-08-23 and the very next run walked into it anyway — three cards, three identical openings.
A note tells you the fault exists; only a step before the writing stops it.

### 4 · Write the THREE BLOCKS first, and give each one a handle plus origin

🔴 **The mirror of step 3, and it cost more.** Step 3 exists because three cards kept opening on
one opener. Beat 5 has the same failure and a bigger bill: write beat 5 for all three cards
— nothing else — and read them side by side.

Each one must name one **handle** from the table in §Beat 5 is the OFFER — position, timing or
manner — and include the measured origin finding. If a card ends on a bare *"something is in the
way"* or *"something has hold of it"*, or omits *"I don't think this began with you"*, **it is
not written yet.** Across three cards, use each handle once.

⚠ Found by writing 37 landers to the old instruction, 2026-08-24. Every mechanical gate passed;
~100 of 111 beat 5s were a blank; and no gate in the pipeline could see it, because a blank is
short, plain, grade-2 English that breaks no ban.

---

## 🔴 How Evelyn sounds — warm, watchful, and plain

⛔ **SUPERSEDED 2026-08-24.** This section used to add three rules of its own: *one clause per
sentence*, *twelve words is the ceiling*, and *every read runs **But** at beat 4 and **So** at
beat 5*. Operator correction: together they produce clipped, mechanical speech — six slots being
filled, not a woman thinking — and 37 landers written to them all sound like each other. **The
six beats do not change. They have to stop SOUNDING like six beats.**

Everything in `natural-tarot-cut.md` §"How Evelyn sounds" still applies unchanged: picture before
meaning · grade 5 is not comprehensible · conversational · she is the subject.

Evelyn sounds like a perceptive woman speaking across a table. She does not recite card meanings
and she does not perform a mystical character. She notices something, stays on it a moment, and
says why it matters.

### 1 · One clear thought, not one clause

Mix short sentences with slightly longer ones. Most land between **7 and 16 words**, but natural
rhythm matters more than a fixed ceiling.

⚠ **Same-length sentences are the tell.** If every sentence in a read is built to one size, the
read sounds generated no matter what its grade score says.

### 2 · Let her react to what she sees

At least once per read, Evelyn is personally present:

| | |
|---|---|
| "What catches me is…" | "That matters more than it first appears." |
| "This is the part I keep coming back to." | "The part I can't ignore is…" |
| "See what's happening here?" | |

Once or twice in a read, never in every bubble. She should feel present without narrating every
thought she has.

### 3 · Keep the connective logic, vary the wording

Beat 4 still introduces the contradiction. Beat 5 still draws the conclusion. Neither has to open
on the word:

| Beat 4 — the turn | Beat 5 — the conclusion |
|---|---|
| "And yet…" | "That tells me…" |
| "Still…" | "Which is why I don't think…" |
| "The part that doesn't fit is…" | "So here's what I see…" |
| "What troubles me is…" | "That's why this feels…" |

The argument has to stay obvious when the phrasing changes. §The connective order is the
difference is about the ORDER — the contradiction, then the conclusion it forces. That order is
load-bearing; the two words are not.

### 4 · Certain about the card, measured about the unseen

What is drawn on the card is stated flat:

> "The wheat is already grown."

A cause nobody can see is read, not declared:

> "That tells me the delay didn't begin with you."

⚠ **This is not licence to hedge.** It covers the invisible CAUSE only. The card's details, her
question and the contradiction stay exactly as blunt as they were — no compliance-flavoured
softening anywhere else in the read.

🔴 **A state is not a detail, even when it belongs to the figure.** Operator correction,
2026-08-24. The Hanged Man's proof read *"look at his face, though — there's no pain in it."*
Pain is an inside thing. It is not on the card, so asserting its absence is a claim about
something nobody can see, dressed as a description:

| ✗ a state | ✓ what is actually drawn |
|---|---|
| "there's no pain in it" | **"it's calm"** |
| "he isn't afraid" | "his eyes are open" |
| "he's certain about this" | "he hasn't moved" |

Beat 2 is the one bubble in the read that is pure evidence. Everything after it leans on that
bubble being unarguable — so it may only contain what she can see for herself while reading it.

### 5 · The card supplies the imagery

Outside the card, use ordinary language. Do not invent fences, doors, shadows, threads, veils or
things "getting there first" to make a read sound mystical. The seer quality comes from
attention, not decoration.

⚠ **This bites §Beat 5 is the OFFER.** A handle is allowed to be plain — when the block turns
up, where it sits or how it holds. What it may not be is a prop invented to carry it. That fault
already deleted one rule (§The loop is a neutral pointer, not an object or a second property) and it takes
*"getting there first"* with it.

### 6 · "Dear", once at most

Once in a complete read, or not at all. Repeated, it is a verbal tic, and every card ends up
sounding like the same card. The warmth comes from what Evelyn notices about the woman, never
from a pet name bolted to every conclusion.

### 7 · Spoken, but composed

Contractions, fragments and gentle pauses are hers. Slangy, bubbly, theatrical and ceremonious
are not.

| Aim for | Avoid |
|---|---|
| calm · intimate · observant · assured · easy to follow | grand prophecy · copywriting slogans · therapy language · fortune-cookie wisdom · mystical riddles |

⚠ **The 2-sentence cap fights plainness.** Chopping into short sentences produces three-sentence
bubbles that trip the gate. Merge with a spoken pause (an em-dash), never by re-growing the
clause.

### 8 · Read every read aloud

- Could a real woman say this without sounding rehearsed?
- Is Evelyn thinking, or filling six slots?
- Are two sentences in a row built the same way?
- Is any line trying to sound mystical?
- Does "dear" feel affectionate, or automatic?
- Would the meaning survive without the poetic image?

If a line sounds like an incantation, a slogan, a caption or a sales bridge, rewrite it as
something Evelyn would actually say.

### The reference sound — the Empress, before and now

⭐ The original right-hand version was signed off line by line for its sound on 2026-08-24. Its
structural beats were brought forward to the 2026-08-25 origin and neutral-pointer rulings below.

| # | Before — 2026-08-23 | After ⭐ |
|---|---|---|
| **1** claim | You chose the Empress, dear. Of the three, your hand went to the one that's already full. | You turned the Empress. You couldn't see the cards, but somehow you found the one that's already full. |
| **2** proof | Look at the wheat at her feet. It's gold and it's grown — every ear of it. | Look at the wheat around her. It has already grown. |
| **3** her | You asked when your soulmate is coming. You've nothing left to get ready, dear. | You asked when your soulmate is coming. What catches me is that the wheat is already grown. |
| **4** but | But nobody's come, dear. And you're still the one waiting. | And yet, nobody has come. You're still the one waiting. |
| **5** so | So the hold-up isn't you, dear. It's something standing in the way. | Something stands between you and this, close in. I don't think it began with you. |
| **6** look closer | Let me look closer at what's been standing there… | Let me look closer at what's standing there… |

**What moved, and why:**

| Beat | The change |
|---|---|
| **1** | the claim now says HOW the reach was uncanny — *"you couldn't see the cards"* — instead of leaving it to *"of the three"*. No "dear" |
| **2** | shorter, and the flourish is gone. The wheat is stated flat, per rule 4 |
| **3** | the card opens the question through a visible detail instead of judging her readiness |
| **4** | *"And yet"* does exactly what *"But"* did |
| **5** | the obstruction gets one position handle plus the mandatory measured origin finding |
| **6** | the loop is a neutral pointer; it repeats no position, timing, manner, age or duration |

🔴 **One thing the rewrite leaves open.** Flagged, not decided:

1. **The verb.** `arcana-eef` is face UP, and §Worked examples uses *"You chose"* for a card she
   can see. The rewrite says *"You turned"*. Either the face-up / face-down verb split goes, or
   this line does.

### ⭐ The current reference read — `cards-heal-first`, all three cards

🔴 **SIGNED OFF LINE BY LINE, 2026-08-24; BEATS 5–6 UPDATED TO THE OPERATOR RULING,
2026-08-25.** The first complete read approved under the new voice and the new beat-3 rule now
also carries the mandatory origin finding, the three-handle rotation and the neutral loop.
**Copy the shape and the sound from here.**

`return-mhf`, face down · *"Do I need to heal before my soulmate arrives?"* · the ad tells her
she is the problem, and the read never rules on it in either direction.

| # | a · The Magician | b · The Hanged Man | c · The Fool |
|---|---|---|---|
| **1** claim | You turned the Magician. You couldn't see the cards, and your hand went to the one who came ready. | You turned the Hanged Man. You couldn't see him, and your hand found the calmest man in the deck. | You turned the Fool. The cards were face down, but you still chose the one travelling light. |
| **2** proof | Look at his table. A cup, a coin, a blade, a wand — all of it already out. | He's hanging upside down by one ankle. Look at his face, though — it's calm. | Look at the small bundle on his stick. That's all he's taking with him. |
| **3** her | You asked whether you need to heal first. What catches me is that nothing on his table is missing. | You asked whether you need to heal first, dear. This card makes me look at the waiting in your question. | You asked whether you need to heal first. This card brings me to the very start of something. |
| **4** but | And yet nobody has come. You've started to wonder whether the missing part is you. | Still, nobody has come. And somehow the question has turned back on you. | But nobody has come. And you're still wondering whether you're ready. |
| **5** so | Something stands between you and this, close in. I don't think it began with you. | Whatever has hold of this holds it quietly. I don't think this began with you. | Something turns up right where this would start. I don't think it started with you. |
| **6** look closer | Let me look closer at what's standing there… | Let me look closer at what this is… | Let me look closer at what's behind this… |

| | a · Magician | b · Hanged Man | c · Fool |
|---|---|---|---|
| **beat 5's handle** | **position** — between her and this, close in | **manner** — holds quietly | **timing** — turns up where this would start |
| **mandatory origin** | *I don't think it began with you* | *I don't think this began with you* | *I don't think it started with you* |
| **"dear"** | 0 | 1 | 0 |
| **Evelyn present at** | beat 3 | beat 3 | beat 3 |

**What it settles, and what it does not:**

- ✅ The origin finding is mandatory on all three cards. It locates where the obstruction came
  from without ruling on whether she needs to heal — the line between an origin claim and a
  verdict.
- ✅ The three cards use **position, manner and timing** once each. Age is not a handle.
- ✅ Every beat 6 is a neutral pointer. None repeats the handle or adds a new claim.
- ⚠ 1a and 1b reach almost identically (*"you couldn't see the cards"* · *"you couldn't see
  him"*). Passed here, but a third card doing it would be the rotation wheel again.
- ⚠ **The verb split has not held twice.** The Empress said *"turned"* on a face-up deck; the
  Fool here says *"chose"* on a face-down one. Open item 1 above is still open, and the evidence
  now points at retiring the split and letting the reach carry the weight.

---

## Choosing between the two — measured, not argued

Same five landers, 15 reads each, 75 bubbles each, each measured against its own spine
(2026-08-23).

⚠ **Measured on the seven-bubble shape, before the six beats above replaced it**, and its
"beat 3" is not this doc's beat 3. The craft numbers are the honest record of what the method's
WRITING does — plainer, more concrete, more of the art on the page — and none of that changed.
Nothing here was measured on a live visitor either way; see the last paragraph.

| | Natural Tarot-Cut | Inherited Shadow |
|---|---|---|
| Avg grade (beat 3) | 1.16 | **0.78** |
| Words per bubble | 12.9 | **11.0** |
| Contractions | 48% | **64%** |
| Sub-clause bubbles | 17% | 17% |
| **Bubbles naming a drawn object** | 20% | **39%** |
| **Bubbles pointing at one** | 9% | **36%** |
| Loop points at roots | 0/15 | **6/15** |
| The read answers her flat ⚠ | **7/15** | 2/15 |
| Own connective chain complete | 15/15 | 15/15 |
| Aphorisms · long words · grade failures | 0 | 0 |

**Use the seven cuts when** the lander's job is trust and relief — a her-fault question whose
"no, it was never you" is the whole product; a family where the answer is the thing she came
for; any lander on a deck whose cards mean hope, power or completion.

**Use the inherited shadow when** the lander's job is to hand the pitch a live problem — money
and block-native questions where the ad already put a block in her head; families whose upsell
take matters more than front-end conversion; decks whose cards mean tradition, fear or
suspension.

**Neither is proven.** The seven cuts are the incumbent with live numbers; the shadow is
better on every measurable craft dimension and give up the flat answer. Read the result on
**revenue per 1,000 conversations**, not buy-rate — this method's claimed benefit lands in
upsell take (U1 literally sells *"protect what we cleared"*), which buy-rate hides.

---

## Gates

Every gate in `natural-tarot-cut.md` applies. Four additions this method earns:

- **The authorship tripwire.** The guard file gets four deliberate violations, not one: a named
  relative, a gestured-at relative ("someone close to you"), a generation count, and "you passed
  it to your children".

🔴 **Scope the generation-count ban to WORDS, never to bare numerals.** Found by the first smoke
test of this doc, 2026-08-23. A guard written as `\b(two|three|four)\b` fires on *"Two keys, and
nobody's picked them up"* — and two keys, two pillars, two towers and two fingers are all
**drawn details on the designated deck**. The ban is about dating an inheritance, so match
`generations?` · `centur` · `great-grand` · `(two|three) (women|men|lives) back`, and leave
counts of things on the card alone. A ban that fires on the art will get switched off by the
next person, and then it protects nothing.

The opener-collision check is **§Pre-flight step 3**, not a gate — by the time a gate sees
it the copy is written and the fix is a rewrite. Run it before the first bubble.
- **The beat-5 mechanism check.** Every read must carry one non-blank position, timing or manner
  handle plus the measured origin finding. Age is not a handle and origin is not optional.
- **The neutral-loop check.** Beat 6 may point at the obstruction, but it may not carry age,
  precedence, duration, manner, position, timing or a new claim.
- **The meaning check.** Before drafting, confirm `TAROT_CARD_VOCAB` for that deck says the same
  thing the read will say. If it does not, either pick a different card or write the vocab —
  never let B and C disagree.

The Version-C smoke is not optional here. The canned bubbles are the easy half; the model
writing to what she actually types is where an inherited shadow will most want to grow an
author.

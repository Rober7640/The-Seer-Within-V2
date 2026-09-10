# 07 — the spread-design rules

**Task 2.1 of [`07-30-DAY-PLAN.md`](./07-30-DAY-PLAN.md). Read this before designing any of the
thirty.** Five agents design six each. This file is the only thing holding the set together —
seven parallel agents drifted on 2026-09-04 and nothing caught it.

| | |
|---|---|
| **You deliver** | one registry entry per spread: `name` · `question` · `shape` · `positions[]` with `job` and `free` |
| **You do NOT deliver** | `built_email` (Phase 3 art), the letter (Phase 4), anything in `tier_model` |
| **The contract** | [`scripts/07-spreads.json`](../../scripts/07-spreads.json) — read `tier_model` before you start |
| **The gate** | `node scripts/check-07-registry.mjs` · see §9 for what it can and cannot see yet |
| **Voice** | [`marcus-voice-profile.md`](../../copy/07-marcus/marcus-voice-profile.md), Voice B. Blunt |

⛔ **The one rule the seven broke.** They were invented first and a concept was forced on afterwards.
A spread is built **backwards from a named thing the market already shops for** —
*What Is Blocking Your Money?* · *The Unsent Message* · *Who Is Coming Towards You?* If you cannot
say what your spread finds without naming a card, you are doing it the old way.

---

## 1 · The procedure

Eight steps. Do them in order; step 2 is the one that kills bad candidates.

| # | Step | Done when |
|---|---|---|
| **1** | **Take the named thing verbatim** from `voc/08-etsy-ranked.md` or the VOC bank. Put it in `name`, title case, as a shopper would type it | `name` is a thing in her life, never a thing in a painting |
| **2** | ⭐ **Write the ANSWER SENTENCE** — the one sentence a satisfied buyer repeats to a friend the next day. It must be a *finding*, not a topic | You can write it. If you can't, the named thing is not answerable — take another |
| **3** | **Cut the answer sentence into its findings.** Each separate thing that had to be found in order to say it becomes one position | A numbered list of findings, 6 to 9 of them |
| **4** | **Order them so each one is only sayable after the one before.** That ordering, in one sentence, is `shape` | No two can swap places without loss (§5) |
| **5** | **Split free / paid** (§3). Free positions are the leading ones, contiguous from 1 | 1–3 free, 5–6 paid |
| **6** | ⭐ **Write the `job` per position** (§4). This is the work. Everything else is bookkeeping | Every job passes the three-card test |
| **7** | **Write `question`** — the named thing in her mouth, first person, as she'd ask it at 6am | *"What's actually blocking my money?"* |
| **8** | **Run the self-check** (§8) | 14 boxes ticked |

### Worked, end to end

> **1 · Named thing** — *What Is Blocking Your Money?* (Etsy #10, badged)
>
> **2 · Answer sentence** — *"The block is a job you have been doing for free for four years. It
> started the year you were the only one who could cope. It still pays you the right to be needed.
> And the move is one conversation you have been calling rude."*
>
> **3 · Findings** — where the money actually goes · the block itself · where it started · what it
> still pays her · what keeping it costs · the move
>
> **4 · Shape** — *"A block has a shape, a start, a payoff and a price. Name those four and the
> fifth thing is the move. That is the six."*
>
> **5 · Split** — free 1 (*where the money actually goes*) · paid 2–6
>
> **7 · Question** — *"What's actually blocking my money?"*

---

## 2 · How many positions

⭐ **The count is decided by arithmetic, not by taste.** n8n gives each passage
`round(target_words × 0.7 ÷ passages)` words. At the **$35 rung** — the one nearly everybody buys —
that is `700 ÷ paid`.

| paid | words a passage at $35 | verdict |
|---|---|---|
| 4 | 175 | ⚠ legal, but four passages does not read as a spread |
| **5** | **140** | ✅ **the default** |
| **6** | **117** | ✅ when the answer genuinely has six findings |
| 7 | 100 | ⛔ starved |
| 9 | 78 | ⛔ the Zodiac. This is why it is retired |

**The floor is ~115 words** and it is derived, not felt. Every passage owes four things: open on what
is physically drawn on the card (1–2 sentences) · the finding (2) · one rotated human move (1–2) ·
one or two closing sentences that move *her* question. That is 5–8 sentences, and Marcus's rule R9
caps a sentence at 25 words. Under 115 words the passage drops the picture or drops her question,
and both are the product.

| | |
|---|---|
| **Paid** | **5 or 6. Never 7.** |
| **Free** | **1, 2 or 3** |
| **Total** | **6 to 9.** ⛔ 6 is the registry `floor` and it is on the TOTAL, free + paid |
| **Ceiling** | **9, and only as 3 free + 6 paid.** The ceiling is the $35 word budget, and it binds on the paid count alone |

⚠ The $57 and $87 rungs are never the constraint — they add three open cards per question *and* 800
more words each time, so words-a-passage goes **up**, not down, as she buys more.

---

## 3 · The free / paid split

**Free = the daily email already read it. The paid PDF never gets a passage for a free position**,
so a free position's finding is *spent* the morning it sends.

| | A good FREE position | A good PAID position |
|---|---|---|
| **Test** | Marcus could write this passage honestly in a mass email to 76,000 women who have told him nothing | It cannot be written without knowing what she asked |
| **Job** | Names the thing and shows it is real | Finds the part of the answer that bites |
| **Ends on** | wanting the next card | the answer moving |
| **Typical** | the plain state of it · what she has been calling it · the first cost she can already see | the origin · what it still pays her · what it is protecting · the tell · the move · the price of not moving |

⛔ **Never put the answer in the free block.** The email must name the thing, prove it is real, and
stop. If a reader can answer the named thing from the email, there is nothing to buy.
⛔ **Never make the strongest finding free.** It is spent.
⭐ **Free positions are contiguous from position 1.** The art photographs them face up at the head of
the layout, the email reads them in order, and the PDF starts at the first paid one. *(Sunday's
Zodiac put free at 1, 7 and 12. It is retired.)*

**What each extra free card costs.** One more full physical card description in `07-art-prompt.md`
(Friday's three already runs ~190 words), and a longer letter. Measured on the seven shipped
dailies: 1 free averages **1,658 words**, 2 free **1,957**, 3 free **1,938** — so the second free
card costs ~300 words, and the third buys nothing. It just gives every free card less room.
⚠ Length is exactly what drifted on 2026-09-04. **Default to 1 free. Use 2 when the named thing
needs a contrast to exist at all (*this* against *that*). Use 3 only when the named thing is
literally a count.**

---

## 4 · ⭐ Writing a `job` string

### What the model actually sees

`job` goes **verbatim** into the passage prompt. This is the whole of it:

```
POSITION: <name>
WHAT THIS POSITION IS FOR: <job>          ← yours
THE CARD THAT FELL HERE: <a random card>
⭐ HER QUESTION, in her words: <hers>
```

Everything else the model is told — open on the picture, do one human move, no balanced pairs, don't
repeat the email, end on her question, the word count — **is already in the standing prompt** and is
identical for all thirty spreads. So `job` carries exactly one thing:

> ## What this passage must FIND.
> Not how to write it. Not what the card means. What it must come back with.

### The shape, measured on the 58 that exist

| | |
|---|---|
| **Length** | the 55 shipped run **9–19 words, mean 15**. ⛔ Hard floor 20 characters (the check fails below it), hard cap **25 words**. *(The three `open_positions` run 23–39 because they must work on any question ever typed. A day position knows its named thing, so it does not need the room.)* |
| **Form** | one sentence, or a sentence plus a short second that rules out the near miss. 32 of 55 use the second |
| **Person** | third, about her — *she / her*. ⛔ Never *you*, never *the reader*, never *the querent* |
| **Opening** | a `What …` clause or a `The …` noun phrase |
| **Punctuation** | ⛔ **no terminal full stop.** 0 of 58 have one |
| **The second clause** | a **disqualifier** — the near miss it is *not*. *"— the whole load before it is broken up"* · *"a specific price, not a mood"* · *"Not permission — the act"* · *"the one she would not put on a list"* |

**The template:**

> `<the finding, as a What/The phrase about her>. <the near miss it is not>`

### ⭐ The three-card test — run it on every job

Read the job with **The Tower**, **the Four of Cups** and **the Page of Pentacles** in mind.

- The same paragraph comes back for all three → **the job is too loose.** Add the disqualifier.
- One of the three makes the job impossible → **the job is card-dependent.** Rewrite it card-blind.
- Three different paragraphs, all answering the same finding → ✅ ship it.

### Worked rewrites

**A · *What Is Blocking Your Money?*, position 2**

> ⛔ `Explore the blockage energy and what it means for her finances`
> An abstraction (*energy*), no finding, and a craft verb aimed at the model. Comes back as a
> paragraph about scarcity that fits every woman on the list.
>
> ✅ `Where the money actually goes. Not the line she would name out loud — the one she
> stopped counting years ago`

> ⛔ **Fixed 2026-09-06.** This example used to read *"the line she would name if you asked her"*.
> `check-07-batch.mjs` hard-fails second person anywhere in a `job`, so the doc's own model
> answer failed the gate — and the batch-1 agent copied it before catching it.

**B · *The Unsent Message*, position 5**

> ⛔ `What he will finally say to her, and roughly when he says it`
> A prediction about another person's decision, with a date on it. ⛔ *"The date moved"* is the
> single most repeated complaint in the buyer pull and it is the scam signature she scans for.
>
> ✅ `The thing he has not said, and what saying it would cost him. What staying quiet keeps safe`
> ⭐ Marcus reads the man. His story, what he protects, what he'd have to admit — all allowed, flat,
> no disclaimer. His *timetable* is not.

**C · *Who Is Coming Towards You?*, position 3**

> ⛔ `Read the card that falls here for his appearance, his work and his star sign`
> Card-dependent — the Two of Swords cannot describe a man — and it manufactures facts.
>
> ✅ `What she keeps mistaking for it. The attention she has been reading as a beginning, and what is
> actually on offer`

### The failure modes

| | The tell | What comes back |
|---|---|---|
| **The card instruction** | the job names a card, a suit, a number or a reversal | a wrong passage 60 mornings in 78 |
| **The craft instruction** | *open on…* · *be blunt* · *describe…* | the standing prompt said it already; you spent the only content slot on plumbing |
| **The mood** | *how this feels for her* · *the atmosphere around it* | atmosphere. This is what made a paid reading read as disconnected notes |
| **The twin** | two jobs whose only difference is the disqualifier | the same passage twice, in one PDF |
| **The prediction** | *when* · *will he* · *decides* · any month or window | the complaint the whole offer is most exposed to |
| **The instruction to her** | *tell her to…* | a reading gives findings. Write the move as a finding — ⛔ but NOT as *"the one move that is hers to make, and what it costs her"*, which is **verbatim** `tier_model.open_positions[3]`. Those three jobs land in the same PDF as the day spread on every $57 and $87 order, so a twin prints the same paragraph twice to the buyer who paid most. `check-07-batch.mjs` now fails a verbatim or ≥80%-overlap match |
| **Second person** | *you* anywhere in the job | it bleeds straight into the prose |

⭐ **The convention the shipped registry uses and this doc never stated:** a position's **name** is
second person — *"What you see"*, *"Where you are"* — and its **`job`** is third. The name is a
label she reads; the job is an instruction to the model about what to find. ⛔ Make the names third
person too and the email starts reading like a case file about her.
| **The abstraction** | *energy* · *vibration* · *the situation* | nothing to find, so nothing is found |

---

## 5 · How a position earns its place

Three tests. Run all three on every position.

1. **The delete test.** Strike it, read the remaining jobs in order, and ask whether the answer
   sentence still lands. If it does, delete it for real.
2. **The swap test.** Can it trade places with its neighbour and lose nothing? Then the sequence is
   not doing work and one of the pair is redundant.
3. **The tag test.** Tag every position with exactly one: `state` · `origin` · `cost` · `payoff` ·
   `who-it-serves` · `the-tell` · `the-move` · `price-of-not-moving`. **Two positions with the same
   tag are duplicates**, however differently they are worded.

⚠ **The one exception, and it is narrow.** A repeated tag is legal only when the named thing *is* a
count — a ledger, a list of costs. Then each repeat's disqualifier must name a different **source**
of the finding (*"the one she would not put on a list"* vs *"the one that landed on somebody else"*),
and never more than three of one tag.

---

## 6 · Does it answer the named thing, or gesture at it?

- **The stranger test.** Read the position names in order, out loud, with nothing else. A stranger
  should be able to say what the reading *found*. If they can only say what it is *about*, it
  gestures.
- **The last paid position lands the named thing.** *What is blocking your money* ends on the block
  named and the move. *What is he actually doing* ends on what he does if nothing changes.
- **Every position is about the named thing.** A position that would fit any of the thirty
  (*"Where you are"*) is filler unless the named thing is literally about where she is.
- ⛔ **`name` is the named thing, not a poetic label.** *The Weight*, *The Undertow* and *The Other
  Chair* are metaphors out of card art. `08-etsy-ranked.md` finding 5: nobody shops for those.

---

## 7 · The rejection list

⛔ Do not submit a spread that has any of these.

1. A **name taken from a card's picture or a metaphor**. The name is the thing she shopped for.
2. A **named thing that is a date, a window, or another person's decision**. *When will he come back*
   is unanswerable and it is the scam signature.
3. **Positions derived from a metaphor's parts** — *"a current has a surface, a pull, a source"*. The
   parts of a metaphor are not the parts of an answer.
4. **More than 6 paid positions**, or fewer than 6 total. Both break the arithmetic in §2.
5. A **free position that answers the named thing**.
6. **Reversals in the design.** ⛔ Only the 22 majors have a reversed photograph; a reversed minor
   404s. A position that means something different when the card is reversed is unphotographable in
   56 cases out of 78, and the art is the long pole. Every position must read the same whichever way
   the card lands.
   ⚠ `scripts/make-reversed-scans.py` has rotated the 56 missing minors and 80 `-reversed.png` sit
   in `assets/tarot-rws/` — **uncommitted, and not hosted**. Until they are uploaded and
   `check-07-registry.mjs`'s `MAJORS` gate is lifted, the rule stands as written.
7. A **position that requires anyone to pick which card goes where.** Positions are written before
   the cut. This also rules out any spread that leans on the **open six** — those are laid in the
   order they came off the cut, with no positions on them, and the writer never chooses.
8. A **date on another person's decision**, anywhere, in any job.
9. **Named real people, unasked relationship labels, health, legal or money-amount claims.**
10. A **12-position house spread**. 78 words a passage at $35.
11. **`you` in a job string**, or a terminal full stop, or a job over 25 words.
12. A **position name reused from another spread in your batch or in the other 24.** Near-duplicate
    names make thirty spreads read as one spread relabelled.

---

## 8 · The self-check — run before submitting

- [ ] `name` is a named thing from the VOC ranking, in her nouns, not a card metaphor
- [ ] The **answer sentence** is written down and is a finding, not a topic
- [ ] Every position is one finding out of that sentence
- [ ] `question` is first person, the way she would ask it
- [ ] `shape` justifies the count from the **answer**, not from a metaphor
- [ ] Total 6–9 · paid **5 or 6** · free 1–3 · `700 ÷ paid ≥ 115`
- [ ] Free positions are contiguous from 1, and none of them answers the named thing
- [ ] `n` runs 1..N in order · no two position names repeat · every `job` ≥ 20 characters
- [ ] Every `job`: 9–25 words · third person · no terminal full stop · a disqualifier where it needs one
- [ ] Every `job` passes the **three-card test** (§4)
- [ ] Every position has a **different tag** (§5), exceptions justified in writing
- [ ] The **delete test** and the **swap test** run on every position
- [ ] The **stranger test** run on the position names read in order
- [ ] Nothing on the rejection list (§7) — in particular: no date on anybody's decision, no reversal
      dependency, no card named in a job

---

## 9 · ⚠ What the checker cannot see yet — read before you file a bug

`node scripts/check-07-registry.mjs` is built for **seven** spreads keyed one per weekday. Loading
thirty needs Phase 2.4 to fix these first; none of them is your job, but do not read a green run as
proof.

| Where | What breaks at 30 |
|---|---|
| `scripts/07-registry.mjs` `keys()` | 🔴 **Silent.** It walks `REGISTRY.days` and returns the **first** spread on each weekday. With 30 spreads it yields 7 and the other 23 are never checked at all |
| `check-07-registry.mjs` §2 | reads `07-P1`, which is retired with the seven |
| §3 · §4 · §5 | one daily `.md`, one art block and one cover row **per weekday** |
| §7 | the C5 card totals are hardcoded per weekday — they have to become per spread |
| §1 | requires `built_email.art_png` / `cover_png` **on disk**, so the check is red between Phase 2.4 and Phase 3.4. Expected |
| the `day` field | stops being unique. It now selects the opening shape, not the spread |

# 07-C5 — the tiers, sold as how many of HER questions get answered

| | |
|---|---|
| **The idea** | The operator, on `07-C4`: *"i was thinking she has the option to ask 3 questions instead of one. we dont select the question on her behalf"* |
| **Answers** | `problems.md` item 9 · `07-C3` fault 1 *(partly)* · `07-C3` fault 2 *(fully)* |
| **Supersedes** | ⛔ [`07-C4`](./07-C4-tiers-by-question.md)'s **solution**. C4's diagnosis survives whole and is not restated here — read §1 of C4 first, then this |
| **Reads** | [`07-C3`](./07-C3-tier-options.md) the six models · [`07-C2`](./07-C2-the-three-tiers.md) the ladder as sold · [`07-C1`](./07-C1-the-booking-page.md) the page · [`07-P1`](./07-P1-the-seven-spreads.md) the positions · [`dryrun-tue-spread.md`](../../docs/07-marcus/dryrun-tue-spread.md) what one question buys today · [`marcus-voice-profile.md`](./marcus-voice-profile.md) |
| **Changes** | the draw *(six more cards a morning)* · the booking page intake · node 4 · node 5a · node 7 · the API payload |
| **Does not change** | any price · any tier key in code · any of the seven spreads · any daily email · the bump · the upsell pairs |
| **Edits nothing** | This file proposes. `07-C1`–`07-C4` are untouched and stay the record |

> # ⭐ LOCKED — 2026-09-04
>
> **The operator chose this model.** It is no longer a proposal. `scripts/07-spreads.json`
> `tier_model` is on `questions-asked`, `scripts/07-registry.mjs` `resolve()` implements it, and
> `node scripts/check-07-registry.mjs` asserts the 7×3 card table in §1 against the registry on
> every run. ⛔ Anything still on the 07-C2 block ladder is **behind**, and the check names it.
>
> | Still to move | Owner |
> |---|---|
> | `07-C1` the booking page — §5 here is the spec | rebuild, standalone HTML first |
> | node 4 in `scripts/build-07-n8n.py` — §7 here is the spec | `test-07-brief.mjs` is red until it moves |
> | `07-C2` | superseded, kept as the record |


---

## 0 · The change in one line

> **C4 sold three questions that we chose. This sells three questions that she chooses.**

Everything below is a consequence of that. The tier stops being a quantity of cards and stops
being a menu of our topics. It becomes the number of her own questions Marcus answers off one
morning's cut.

---

## 1 · The model, and what she sees

One cut a morning, shared by the whole list, exactly as today. The day's spread comes off the top
of it and the daily email reads its free positions, exactly as today. **What the money decides is
how many of her questions that cut gets laid on.**

| Rung | Price | She types | She gets |
|---|---|---|---|
| **The Spread** | $35 | one question | the day's spread, every card, on that question |
| **The Second Question** | $57 | two | all of the above, then the whole table read again against her second question, plus three cards drawn only for it |
| **The Third Question** | $87 | three | all of the above again for a third, plus a closing passage that reads the three answers against each other |

**The page prints the question count, because the question count is the product.** ⛔ C4's rule 1 —
*never print a bare quantity of questions* — dies here, and it has to. Under C4 the quantity was a
disguise for three fixed topics, so printing it invited *"can I have a fourth"*. Here the quantity
is the honest unit, and the answer to *"can I have a fourth"* is Marcus saying no out loud, which
is the same refusal device Thursday and Saturday already run on.

**What is constant across all seven days, and this is the thing C2 lost:** three cards per extra
question, every morning, on every spread. `07-C2`'s legibility rule was *"the five that tier 2 and
tier 3 add never change."* That rule died the moment Thursday and Saturday could not add them. The
replacement holds on all seven days without an exception.

### The card totals, which are now a receipt and never a comparison

| Day | Spread | The Spread $35 | The Second Question $57 | The Third Question $87 |
|---|---|---|---|---|
| Mon | The Weight | **6** | 9 | 12 |
| Tue | The Two Doors | **8** | 11 | 14 |
| Wed | The Small Instruction | **6** | 9 | 12 |
| Thu | The Undertow | **7** | 10 | 13 |
| Fri | The Ledger | **9** | 12 | 15 |
| Sat | The Other Chair | **7** | 10 | 13 |
| Sun | The Zodiac Spread | **12** | 15 | 18 |

Every cell is live. There is no ⛔ anywhere in that table for the first time.

⚠ The top rung is **smaller** than the one `07-C2` describes — Tuesday's Table is 18 cards there and
14 here. Nobody has ever bought either, so nothing is taken away from a real buyer. It is recorded
because it is a fact about the offer that changes, and because the top rung now costs four fewer
model calls to fulfil.

---

## 2 · 🔴 The hard problem — what a second question mechanically buys

There is **one cut a day and everybody gets the same one.** Marcus cannot lay her a private second
spread without breaking the promise the whole offer rests on: *"this cut was made once, this
morning, and won't be made again for me."* So the second question has to be paid for out of a cut
that already exists.

### The two candidates, weighed

**Candidate A — the same cut, read against each question in turn.** What a reader at a table
actually does. She asks a second thing, he does not re-lay, he looks at what is in front of him and
says *"that one means something else now."*

- ✅ True to the practice, costs no cards, breaks no promise.
- ⛔ **Rejected on its own.** Nothing new happens. The page has nothing countable to point at, which
  breaks the deck's one proof rule, and the buyer's fair complaint is that she paid a second time
  for the same twelve cards. It is half the answer and it is kept.

**Candidate B — the paid positions divided among her questions.** Monday's five paid cards split
two / two / one.

- ⛔ **Rejected outright, and it is the only model in this file that is worse than the product
  today.** She pays $87 to have her first question answered on fewer cards than $35 buys. Nothing
  in Marcus's voice can say that sentence.

### ⭐ The answer: candidate A, plus six cards that are drawn and not yet placed

**The morning cut is bigger than the day's spread already.** That is not new — the draw record
carries `day`, `undertow` and `other_chair`, so Marcus already lays around sixteen cards before
light and the tier decides how many she sees. This model keeps the size of the morning and changes
what the extra cards are.

> **The open six.** Off the same cut, in the same minute, before light. Six cards with **no
> positions on them**. The day's spread has its positions written before the cards fall, because
> that is what a spread is. These six have theirs decided by what she asks.

**So a second question buys two things, and both are checkable:**

1. **The whole table again.** Every card already read gets looked at with her second question in
   front of it, and the ones that change meaning get named.
2. **Three of the open six, laid only on that question**, in the order they came off the cut.

A third question buys the same, on the other three.

### Why this does not break the shared draw

| The promise | Still true? |
|---|---|
| One cut, one morning, not made again for her | ✅ The open six are cut in the same act, at the same time |
| Everybody that morning gets the same cards | ✅ The open six are one row's worth, shared like the rest |
| One draw record per `(spread_key, draw_date)` | ✅ One new array on the same row. No second row, no re-cut |
| The cards were drawn before she asked | ✅ Only the **position** is decided after. The card is not |

⛔ **The rule that keeps that last line honest: the writer never picks which open card goes where.**
First card off the cut takes position one, second takes two, third takes three. A writer choosing
the card that suits the passage is not a draw, and one exception makes every reading a fake.

⚠ **One edge the spec has to hold.** Two orders from the same woman on the same morning would land
the same open three on both second questions. Either allocate the open cards by a running index per
buyer per draw, or draw nine and let the third slot rotate. Cheap either way, and it has to be
decided before this takes money.

---

## 3 · ⭐ The reading's structure — why three answers are not three thin ones

This is the part that decides whether the model is any good, so it gets specified before the page
copy.

### The honest risk, named

A 2,600-word reading split three ways is 867 words an answer, and 867 words is a shorter reading
than the $35 buyer gets today. If the three answers are built the same way, the $87 buyer receives
three worse readings than the $35 buyer and can tell.

### The fix, and it is structural rather than a matter of writing well

**The three answers are not parallel. They are sequenced, and each one inherits everything the one
before it established.**

Answer one does all the building. Every card gets its picture before its meaning, the spread gets
introduced, Marcus gets into the room. **Answers two and three cost almost none of that**, because
the table is already standing. What they need is a turn of the head and three new cards.

| | Answer 1 | Answer 2 | Answer 3 | Frame |
|---|---|---|---|---|
| Positions written | all the day's paid ones | 3 | 3 | — |
| Establishing work | all of it | none | none | — |
| Words at $87 *(2,600)* | ~1,100 | ~550 | ~550 | ~400 |
| Words at $57 *(1,800)* | ~1,000 | ~500 | — | ~300 |

⭐ **`WORDS = { spread: 1000, pattern: 1800, table: 2600 }` needs no change.** The operator's
instinct was right: the existing budget is already one, two and three answers' worth once the later
answers stop paying for the setup.

### The four moves that stop thinness, each one a prompt instruction

1. **Every later answer opens by turning back to the table.** The first passage of answers two and
   three must name one card already read, by name, and say in one or two sentences what it says
   differently now that this question is in front of it. Then it goes to its own card. That single
   move is what makes the second answer feel like a reading and not a clarifier, and it is what
   three separate mornings can never produce.
2. **The heading is her question, verbatim.** Answers two and three open under the words she typed.
   She can see exactly what she paid for and where it starts.
3. **The three open positions are laid on her question, not on a topic.** They are the same three
   every morning. A spread is a fixed set of positions laid on a changing question, so this is not a
   trick, and the page says it in his words rather than hiding it.
4. ⭐ **At $87 only, a closing passage that reads the three answers against each other.** Named on
   the page, printed as its own passage, and the one deliverable that a woman buying three separate
   $35 mornings cannot assemble. It is also the honest justification for the third step costing more
   than the second, which is the arithmetic she can otherwise do in her head.

### The three open positions

⛔ These `job` strings go verbatim into the prompt. They are the reading, not plumbing, and they are
the only new copy this model requires.

| # | Position | The job |
|---|---|---|
| 1 | **The thing as it is** | What is actually going on in the thing she asked about. Not the version she has been given by anybody inside it, and not the version she carries at four in the morning. The plain state of it today |
| 2 | **What's holding it there** | What keeps it in the state position one described. Something does, or it would have moved on its own by now. Name the thing that would have to give |
| 3 | **What moves it** | The one move that is hers to make, and what it costs her. ⛔ Never a prediction about what another person will do |

⚠ **The one collision to watch.** On Wednesday, *What moves it* sits close to The Small
Instruction's *The step — the one thing*. The cards differ and the question differs, so the content
differs, but the position names rhyme. Node 5a already feeds every earlier passage forward with a
do-not-repeat instruction, and that is the guard. Check it on the first Wednesday dry run.

⭐ **Is this `07-C3` option 5's standing trio, back from the dead?** Fairly asked, and no. The trio
was filler because it was added to an answer that was already complete, so the same three positions
arrived on every buy of every rung. These three are the *only* cards on a question that would
otherwise have none, and they arrive only when she has asked a second thing. The tell is checkable:
filler repeats on the same question, and these never do.

---

## 4 · Are her three questions constrained?

**She can ask anything the cards can be laid on. There is no topic rule, and there is no
relatedness rule.** A relatedness rule would be us selecting her question through the back door,
which is the one thing the operator ruled out.

Four rules, and Marcus says three of them out loud on the page.

| # | The rule | Said on the page? |
|---|---|---|
| 1 | **One thing per box, phrased so cards can be laid on it.** *"What's going on with him"* is not a question. Beat 5 already teaches this and the same sentence governs boxes two and three | ✅ already there, extended |
| 2 | **One sitting.** They have to be questions she would ask in the same visit. Soft, stated once, unenforced — and self-enforcing, because nobody asks about her marriage and her car in the same breath | ✅ one line |
| 3 | ⛔ **The same question reworded is one question.** Marcus says so in the third box, before she pays, and says what he does if it happens anyway | ✅ in the box |
| 4 | ⛔ **Three is the cap, and the reason is stated.** One cut carries three. Past that he would be laying cards for the sake of it | ✅ on the top rung |

⭐ **The failure this model has and C4 did not: she can pick a worse second question than Marcus
would have.** Handled inside the product rather than by a rule. If the second question turns out to
be the first one in different clothes, Marcus is allowed to say so in the reading and answer the one
underneath instead. That is voice move 1.2 — he names the limit of the thing in front of him — and
it turns the worst case into the best passage in the reading.

**The existing guardrails hold on every box, unchanged.** Marcus reads the cards, not the man. A
question about what he is *doing* can be laid. A question about what he will *decide* cannot, on any
rung, at any price.

---

## 5 · The booking page

Beats 1–6 and 10–17 are unchanged apart from what is named below. Beats 7, 8 and 9 are replaced.

⚠ The voice profile does not govern this page, but the speaker is still Marcus, so its countable
rules govern the sentences: no em-dash reversal, no balanced-clause pairs, no unannounced maxims,
paragraphs of one to three sentences.

### 5.1 · The intake — one box before payment, and the others open on the rung

**Box one stays exactly where it is, before payment.** `07-C1`'s open thread 1 settles that and its
first argument settles it three times over: `GET /fulfilment/:sessionId` answers `409` with
`missing:["question"]` and refuses to guess, so a paid order with no question is a refund and a
support ticket rather than a delayed sale.

**Boxes two and three open the moment she taps that rung, still before payment.**

⭐ **The box appearing IS the demonstration of what the money buys.** It is the most literal proof
any page in this deck has ever had — she taps a price and a place to type appears. Nothing has to be
argued.

⚠ **The real cost, stated plainly: two more empty boxes in front of Stripe, at the exact moment she
is spending the most.** That is the strongest argument against this model on the page and it is not
small. Two things blunt it, and neither is a guess:

- The router pre-fills box two when she has already typed two questions into box one, which is the
  case the page believes is modal — *"Should I stay or should I go"* is Tuesday's own placeholder.
- Each box carries a day-specific grey example, the same device beat 5 already uses and for the same
  reason: it models a question instead of handing her one.

⛔ **`07-C1`'s challenger arm dies here.** The three-tap shape picker replaced the box with taps to
protect completion. Under this model the box is the product, and a tap cannot be a question.

### 5.2 · Beat 7 — the frame, and the router's new job

> ## How many things are you asking me?
>
> Most women write one question in that box and have a second one they didn't write down. I'd
> rather have both than have you pick.
>
> I cut once this morning and the cut is bigger than the {{N_TOTAL_WORD}} you saw. What the price
> decides is how many of your questions I lay it on.

**The live router, under box one.** Same fire-once behaviour, same order. What changes is what it is
for.

| What she typed | The line |
|---|---|
| *or* / *should I stay* / *should I go* / *should I leave* | You've asked me two things in one sentence — whether to stay, and whether to go now. Both can be laid. Say the word and I'll put the second half in its own box. |
| more than one `?` | That's {{N}} questions in one box. They can have a box each. |
| *and what about* / *also* / *the other thing* / *one more thing* | A second question with a polite hat on. Give it its own box. |
| anything else | One thing, asked plainly. One question is what this morning's cut is for. |

⭐ **This is the single best thing in the model and it is worth saying why.** Today's router argues
*your question needs a bigger reading*, which is a claim about the product that she cannot check.
Tomorrow's router says *you asked me two things*, which is a fact about her own typing that she can
check by reading it back. The routing table stops being an upsell and becomes a receipt.

⛔ The router never says she needs two. It says she asked two, and only when that is visible in what
she wrote. On anything else it names one question and stops.

### 5.3 · Beat 8 — the three rungs

None pre-selected. No *most popular*. No crossed-out price. And ⛔ no rung opens on *"Everything
above"*, which is `07-C4`'s rule 2 and survives intact — under a question unit it is structurally
impossible, because a second question is not more of a first one.

**The Spread — $35**

> ### One question.
>
> The {{N_DOWN_WORD}} that went face down in this morning's email, turned over on the thing you
> typed above. What it actually is, what it's costing you, and what would move it.
>
> **{{N_TOTAL}} cards, every one of them on that one question.** If you came with one thing, stop
> here. This is the one and you don't need the other two.

**The Second Question — $57**

> ### Two questions.
>
> A second box opens under the first. Write the one you were going to leave out.
>
> Then I do two things with it. Every card already on this table gets looked at again with your
> second question in front of it, and one or two of them say something different when it is. Then I
> lay three more that belong to that question and nothing else, off the same cut, cards nobody has
> seen yet.
>
> Your second answer is written knowing what the first one said. Ask me on two different mornings
> and you get two readings that have never met.
>
> **{{N_TOTAL}} cards on the first question. All of them again on the second, and three that are
> only its own.**

**The Third Question — $87**

> ### Three questions, and three is where I stop.
>
> Three boxes, three answers, three more cards on each of the last two, and the whole table read
> again each time.
>
> There's one passage that only exists on this one. At the end I put your three answers next to each
> other and say what they add up to, which is the thing you can't see from inside it.
>
> One cut carries three questions. Past three I'd be laying cards for the sake of it and charging
> you to watch me shuffle.
>
> **{{N_TOTAL}} on the first, three on the second, three on the third.**

**Under the row, the frame that was already there and still points down:**

> If there's only one thing, buy one. I'd rather send you one answer you actually wanted than three
> you had to invent on the spot.

### 5.4 · The second and third boxes

> **The second one.**
> Same rule as the first. One thing, in your own words. It doesn't have to be about the same person
> and it doesn't have to be fair to anybody.

> **The third.**
> Last one. If you're about to write the first question again in different words, don't. That's one
> question and I'd only be charging you twice for it. Write the one you keep not asking.

### 5.5 · Beat 3 — the strip gains a second row

> ## The {{N_TOTAL_WORD}}, as they lie
>
> You saw {{FREE_NAMES}} this morning. These {{N_DOWN}} haven't been turned.
>
> And these six came off the same cut with no positions on them. Where they go gets decided by what
> you ask me, which is why they're still face down and still blank.

`[STRIP row 2 — six backs, unnumbered, unlabelled, visually separate from the day's spread]`

⚠ **The risk, and I would take it anyway.** A woman who buys one question can count six backs she
never got. Marcus's answer is that they were never hers, they are the table's, and they are for a
question she did not ask. The alternative is to name the open six in words and not show them, which
is safer and gives up the deck's one proof device at the moment she is choosing a price. Show them.

⛔ **The daily email photograph does not change.** The open six are not on the table in the picture
and are never mentioned in a letter. Put them in the photo and Monday's *"Six cards. One turned
over. Five still face down"* stops being true, and that sentence is the entire pitch.

### 5.6 · What else moves on the page

| Beat | Change |
|---|---|
| 5 · the question | Unchanged. Its rule now governs three boxes instead of one |
| **9 · the rung that isn't there** | ⛔ **Deleted.** Both notes, both days. Nothing is missing on any day |
| 10 · the bump | Unchanged, speed, $12.77. ⛔ It must never become a fourth question |
| 11 · the money line | Unchanged |
| 17 · `?recover=1` | Restores **all** typed boxes and the rung, not just the first |
| The day table | Every ⛔ cell becomes a live price |

---

## 6 · The daily email — verified: nothing changes

The prediction was that nothing changes. I checked it rather than assumed it.

| What the letter does | Does this model break it? |
|---|---|
| Beat 11 teaches the day's card count and argues six is **complete** | ⭐ No, and it now helps. Six being the right size for one question is the argument for a second question needing its own cards. `problems.md` item 9 stops being a leak and starts being the pre-sell |
| Three CTAs say *turn the other five* / *send me that question* | No. All three describe rung one exactly |
| Links carry `?c=1\|2\|3&s=<spread>` and no tier | No. She still chooses on the page |
| No daily names a tier | Verified by grep across all seven `.md` — *The Pattern* and *The Table* appear in no letter, so renaming the rungs costs no email edits |
| Monday and Tuesday close a door: *"No spread I lay can touch it"* | ⚠ Looked like the one thing that would have to change. It does not — see below |

**The two closed doors, checked one at a time.** Monday declines *why doesn't he help* and Tuesday
declines *will he change*. Under this model the open three can be laid on a question about him, so
both lines looked over-broad. They are not. Monday's question is about his **motives** and Tuesday's
is about his **future**, and neither is readable on any rung at any price — the guardrail is
offer-wide and older than the ladder. What became readable is *"what is he actually doing"*, which
neither letter declines.

⭐ **So the daily programme is untouched, and `07-C4`'s one paragraph per letter is not needed.**
That is a real saving: seven letters stay frozen, the HTML stays frozen, and the letter never has to
name a question it is refusing to answer for a commercial reason.

---

## 7 · The n8n change

**Node `4 · Build the brief` in `scripts/build-07-n8n.py` → `BRIEF_JS`, plus one block in `5a` and
the joiner in `7`.**

### 7.1 · What is deleted from node 4

| Deleted | Why it can go |
|---|---|
| `IS_SPREAD` | No expansion is a spread any more, so nothing can be the day's own |
| `resolve()` | Nothing to resolve |
| `blocks`, `skipped` | There are no blocks |
| `ORDER`, `cheaper`, and its `throw` | ⭐ A tier cannot collapse into a cheaper one, because rungs differ by her questions and not by our cards |
| `TIERS` as a block map | Becomes a question count |

About twenty-five lines, and the whole of the guard that `07-spread-registry.md` §1 B was written to
install. It is deleted because the bug it guards has stopped existing, not because it was wrong.

### 7.2 · What replaces it

```js
// ⭐ THE TIER IS HOW MANY OF HER QUESTIONS GET ANSWERED. Nothing about a tier touches a spread
//    any more, so nothing can collide with the day's own cut and no day loses a rung.
const N_ASKED = { spread: 1, pattern: 2, table: 3 };   // ⛔ keys unchanged: Stripe, be_orders and
const WORDS   = { spread: 1000, pattern: 1800, table: 2600 };   //    every test read these
const POSITION_SHARE = 0.7;
const OPEN_PER_QUESTION = 3;

// The three positions the open cards take. The SAME three every morning, laid on whatever she
// asked — which is what a spread is. The booking page says so in his words rather than hiding it.
// ⛔ `job` goes verbatim into the prompt. These strings ARE the reading.
const OPEN_POSITIONS = [
  { name: 'The thing as it is',       job: '…' },
  { name: "What's holding it there",  job: '…' },
  { name: 'What moves it',            job: '…' },
];

const n = N_ASKED[o.tier];
if (!n) throw new Error(`unknown tier: ${o.tier}`);

// ⛔ A paid second question with no text is a refund, not a reading. Fulfilment never invents one.
const asked = [o.question, o.question_2, o.question_3].slice(0, n).map((q) => (q || '').trim());
if (asked.some((q) => !q)) throw new Error(
  `tier '${o.tier}' is ${n} question(s) and ${asked.filter(Boolean).length} arrived — hold the order`);

const dayAll  = o.draw.day || [];
const dayFree = dayAll.filter((p) => p.free);
const dayPaid = dayAll.filter((p) => !p.free);

// 07-P1's floor of 6 is on the DAY SPREAD's total. 🔴 Counting the open cards here would let a
// four-card day spread pass at tier 3 — and note the same masking exists TODAY, because `paid`
// currently includes the expansion blocks while `free` does not. This narrowing fixes both.
if (dayFree.length + dayPaid.length < 6) throw new Error(
  `${o.draw.spread_name} is ${dayFree.length} free + ${dayPaid.length} paid — below the floor of 6`);

const open = o.draw.open || [];
const need = (n - 1) * OPEN_PER_QUESTION;
if (open.length < need) throw new Error(
  `${o.draw.draw_date} drew ${open.length} open cards; tier '${o.tier}' needs ${need}. ⛔ Do not re-cut`);

const items = dayPaid.map((p) => ({ ...p, answers: 1, first_of_answer: false }));
for (let q = 2; q <= n; q++) {
  open.slice((q - 2) * OPEN_PER_QUESTION, (q - 1) * OPEN_PER_QUESTION).forEach((c, i) => {
    // ⛔ ORDER OFF THE CUT DECIDES THE POSITION. A writer picking which card suits which
    //    position is not a draw, and one exception makes every reading a fake.
    items.push({ ...c, ...OPEN_POSITIONS[i], number: `${q}.${i + 1}`,
                 answers: q, first_of_answer: i === 0 });
  });
}

return items.map((p, i) => ({ json: {
  /* …unchanged fields… */
  question:      asked[p.answers - 1],   // the one THIS passage answers — 5a reads this
  all_questions: asked,                  // the joiner reads this
  target_words: WORDS[o.tier],
  position_words: Math.round(WORDS[o.tier] * POSITION_SHARE),
  free_cards: dayFree,
  index: i + 1, total: items.length, position: p,
}}));
```

**What the brief now fans out over:** the day's paid positions, then three per extra question. Not
blocks. `blocks` and `skipped` leave the payload with them.

**The floor of six survives and means something narrower.** It is a check on the **day spread**, and
it always was — `07-P1` puts the floor on the Total column. What changes is that the open cards must
be excluded from it, or the floor silently stops firing on a short spread bought at the top rung.

### 7.3 · Node 5a — two conditional blocks

```js
p.answers > 1
  ? `⛔ THIS PASSAGE ANSWERS A DIFFERENT QUESTION FROM THE ONES ABOVE. Hers, in her words: ${j.question}`
  : '',
p.first_of_answer
  ? `⭐ OPEN BY TURNING BACK TO THE TABLE. Name ONE card from the passages above, by name, and say `
    + `in one or two sentences what it says differently now this question is in front of it. Then `
    + `go to your own card. ⛔ Do not re-explain that card. Say what changed about it.`
  : '',
```

⚠ The second one deliberately contradicts the standing *do not repeat them* instruction, so it has
to be printed **after** it and marked as the exception. Without this block the later answers arrive
as three loose clarifiers and the whole model fails on the thing §3 exists to prevent.

### 7.4 · Node 7 — the joiner, which is where most of the work is

Today it writes one opening, transitions and one close. It now writes one opening, **one head per
answer**, transitions and one close.

- Group `rows` by `position.answers`.
- **The opening** keeps all five obligations. Additions: quote **every** question back, and answer
  question one flat inside 150 words as it already does.
- **Each later answer** gets a heading that is her question **verbatim**, and two or three sentences
  of head before its first passage.
- **The close** keeps its four obligations. At `n === 3` it gains the fifth and the passage grows:
  *put the three answers next to each other and say what they add up to.*
- The word arithmetic is unchanged in kind — it already measures the real passages and budgets the
  remainder. The split changes from `50 / 20 / 30` to roughly `40 opening / 20 answer-heads /
  15 transitions / 25 close`.

### 7.5 · Everything else

| File | Change |
|---|---|
| `scripts/test-07-brief.mjs` | The Thursday-pattern and Saturday-table cases **invert** from expecting a throw to expecting a reading. New: a tier-2 order with no `question_2` throws · item count equals `dayPaid + 3 × (n−1)` on all 21 combinations · every item's `answers` runs 1..n · a five-card day spread throws even at tier 3 |
| `scripts/07-dryrun-orders.json` | 🔴 Every order is `"tier": "spread"` with empty expansion arrays, so **no dry run has ever produced a tier 2 or tier 3 reading.** C4 found this and it is more urgent here, because the two later answers are the entire new product. One dry run per rung, with real open cards, before anything ships |
| `07-spreads.json` *(the registry)* | Gains one `open` entry holding the three positions. ⛔ Loses `reusable_as` and the rule *a spread is never eligible for its own expansion*, both of which now guard nothing |
| The morning draw job | Draws six more cards and stores `draw.open` on the same row |
| `07-server-spec.md` §6.3 | `missing:` extends to `question_2` / `question_3`, checked against the tier |
| `priceBackendOffer` | ⭐ **Gets simpler.** Its per-day tier refusals go, because no day refuses a rung |
| The page art | One more row of six plain backs. `make-07-card-backs.py` already produces them; this is layout, not new art |

---

## 8 · Thursday and Saturday

**Confirmed. Both holes close, and they close by construction rather than by substitution.**

Thursday had no Pattern because tier 2's expansion **was** The Undertow. Saturday had no Table
because tier 3's expansion **was** The Other Chair. Under this model no rung adds a named spread, so
there is nothing that can be the day's own cut, and there is nothing to deduplicate.

| | `07-C3` option 4 | This model |
|---|---|---|
| How the hole closes | substitute a spare block on the two days it collides | no expansion exists, so no collision exists |
| New copy required | **five** position `job` strings *(The Road)* | **three** position `job` strings |
| New rule to remember | ⛔ a spread is either a daily or a block, never promoted — or two slots substitute to the same spare | none |
| Days affected | 2 | 0 |

⭐ **So `07-C3` option 4 — The Road — is dead, and `07-C4` was wrong to keep it deferred.** It exists
to fill a hole that this model never digs. That is the single largest saving in the file.

---

## 9 · What dies

### From `07-C4`

| | |
|---|---|
| ✅ **The whole diagnosis, §1** | All four causes stand. The comparison unit was the disease and it still is |
| ✅ *"Keep the count everywhere it proves. Take it out of the one place it compares"* | The governing sentence of both files |
| ✅ Rule 2 — no rung opens on *"Everything above"* | Now impossible rather than forbidden |
| ✅ Rule 3 — the count keeps its proof job and loses its comparison job | Unchanged |
| ✅ The answer to the three-mornings objection | Strengthened. See §10 |
| ✅ The build note on unequal price steps | And it gets sharper. See build notes |
| ✅ The build note that no dry run has produced tiers 2 or 3 | More urgent, not less |
| ⛔ **The three fixed questions** — *what is this* / *why does it keep happening* / *what is he doing* | The operator's veto, and it is right: assigning the question is selecting it |
| ⛔ **The tier names The Pattern and The Table** | They named our topics. Under her questions they are false labels |
| ⛔ **The `QUESTION` constant in node 4** | Replaced by her text |
| ⛔ **The paragraph added to every daily**, and the seven-day table of which door each letter opens | Not needed. §6 |
| ⛔ **The Q1-versus-Q2 origin-card seam** | There is no Q2 to be confused with, so there is no seam to defend |
| ⛔ **Rule 1 — never print a bare quantity of questions** | Reversed. The quantity is the honest unit now, and the cap is enforced by a refusal instead of by hiding the number |

### From `07-C3`

| Option | Verdict |
|---|---|
| **1 · The Remainder** | ✅ **Absorbed, and its word-floor line is still wanted.** At $87 Sunday now runs fifteen positions against 1,820 position-words, which is 121 words each. The floor bites there |
| **2 · The Eight** | ⛔ Dead. Rewriting six spreads to normalise a number that is no longer the comparison |
| **3 · The Day Price** | ⛔ Dead, both versions, and the one-cell version is now the more clearly wrong of the two. Denying Sunday its one-question rung denies the whole product on the week's best-read letter |
| **4 · The Spare Block** | ⛔ **Dead** — the change from C4, and the biggest saving here. §8 |
| **5 · The Level Table** | ⛔ Dead. Its trio returns in a different job and only there. §3 |
| **6 · One Cut, One Price** | ⛔ Dead, and worth naming as the nearest neighbour: this model **is** one cut and one price, with a published rate for each further question. What option 6 threw away was the router, and the router is the engine here |

### From the code and the specs

`IS_SPREAD` · `resolve` · `blocks` · `skipped` · `ORDER` · `cheaper` and its `throw` · `TIERS` as a
block map · `07-C1` beat 9 and both refusal notes · `07-C1`'s challenger arm · `07-C2`'s *"the five
that tier 2 and tier 3 add never change"* · the registry's `reusable_as` and its
never-promote rule · the two `⛔ none` cells in every day table in the deck.

### What is untouched

Every price · every tier key in code · the bump · all seven spreads and their positions · all seven
dailies and their HTML · `07-U-upsell-pairs.md`. ⭐ Pair 4's U1, a second reading off the same cut
for someone she names, gets **easier** to sell, because the page has now taught in Marcus's own
words that one cut carries more than one question. ⛔ Its hinge line has to say *someone else's*
question, or it reads as the fourth question the top rung just refused.

---

## 10 · The strongest objection, and the verdict against C4

> **You have handed the product's most important decision to the person who understands it least.
> The reason a fixed ladder existed is that *why does it keep happening* is a better question than
> the one she will type second. Under this model the $87 buyer chooses her own three, and the third
> will often be the first one reworded, or something the cards cannot address. She will pay the most
> and get the worst reading in the offer, and she will have done it to herself.**

That is the real objection and most of it is true.

**Where it fails.** A question she chose is one she reads the answer to. C4's second question was a
question we thought she ought to have, and the failure mode of answering a question somebody does
not have is a refund, not a weak passage. And C4's ladder had a structural ceiling nobody costed:
tier 2 was unsellable to any woman whose situation is happening for the first time, and tier 3
required her question to be about a man. Two of three rungs were gated on facts about her life.
**Under this model every rung is available to every buyer on every day**, which is the commercial
argument and I think it settles it.

**The concession, and it goes in the product rather than being hidden.** She will sometimes write a
weak second question. Marcus is allowed to say so and answer the one underneath it, which is a move
his voice already has and which costs nothing to permit.

**The rule that stops the collapse.** The cap is three and it is enforced by a refusal in his own
words, on the page, above the price. Take the cap off and this becomes a per-question bolt-on, which
is the marketplace pattern the research warned about and the failure mode C4 correctly feared.

### The verdict

**Better than C4, and more expensive than C4. Both halves matter.**

| | `07-C4` | `07-C5` |
|---|---|---|
| Fixes `problems.md` 9 | ✅ | ✅ and turns the leak into the pre-sell |
| Fixes fault 2 · Thu / Sat | ⚠ improves how it reads | ✅ dissolved |
| Fixes fault 1 · flat price, floating cards | ⚠ mitigated | ⚠ mitigated the same amount, and honestly no more |
| Every rung sellable to every buyer | ⛔ two rungs are gated on her life | ✅ |
| Copy to write | 1 paragraph × 7 letters, 1 page beat | 3 position jobs, 3 page beats, 2 box copies |
| Code | 3 constants, 2 prompt lines | node 4 rewritten, 5a and 7 changed, draw + API + art |
| Daily letters touched | 7 | ⭐ 0 |
| New spread required | The Road, deferred | none, ever |
| Time | a day | a week, and most of it is the draw and the API |

⚠ **What is not fixed, said plainly, because C4 was honest about it and this file has to be too.**
Monday sells six cards for $35 and Sunday sells twelve. Moving the unit to questions changes the
sentence she reasons about, and it makes every *increment* perfectly fair — three cards a question,
the same price, every morning of the week. It does not make the base rung fair. Anyone who wants
that has to take `07-C3` option 3, and its cost has not changed.

---

## Build notes

**The unequal step is sharper here than in C4, and it now has an honest answer.** Under C4 the three
rungs were different in kind, so unequal prices needed no defence. Here the second and third
increments are identical in shape, so the arithmetic is visible.

| Step | From | To | Step |
|---|---|---|---|
| Q1 → Q2 | $35 | $57 | 22 |
| Q2 → Q3 | $57 | $87 | 30 |

Two ways out, and I recommend the first.

1. ⭐ **Keep the prices and earn the difference.** The third rung carries a deliverable the second
   does not: the closing passage that reads all three answers against each other. It is printed on
   the page, it is a real object in the PDF, and it is the only thing in the offer that a woman
   buying three separate mornings cannot assemble. §3, move 4.
2. **Make the ladder arithmetic and publish the rate** — *the first is thirty-five, every one after
   it is the same again*. The corpus's own move, and the most checkable price sentence in the deck.
   The top rung would have to move to 79, which changes `OFFERS['07'].prices` and `ALL_PRICES` in
   `scripts/copy-check.cjs`, the Stripe catalogue, and `07-C1` / `07-C2` / `07-C3`. Grep says 87
   appears in no shipped buyer copy outside those two tier cards, so the copy cost is small and the
   Stripe cost is not.

**Cheaper to fulfil at the top, which nobody asked for.** Monday's $87 goes from fifteen model calls
to eleven, Tuesday's from sixteen to twelve. Four fewer positions at the same price, and the price
holds because the closing passage and the two re-reads are where the money goes.

**Measure before building, and it costs nothing.** The whole model rests on a claim: that a real
share of buyers arrive with two questions. That claim is testable today, on the page as it stands —
log how often box one's text trips the two-question detector the router already runs. If it is rare,
this model sells one rung and so does C4's, and the cheaper file wins.

**What this file does not decide.** The bump. The upsell pair. Whether the open cards are shown on
the page or only named. The allocation rule for a second order on the same morning. All four are
recorded above and none of them is settled by writing this.

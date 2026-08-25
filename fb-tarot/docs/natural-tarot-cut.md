<!-- 🔒 CANONICAL. This file is the ONE source for the Natural Tarot-Cut.
     Voice and reference examples revised 2026-08-25: face-down truth, optional
     connectives, a bounded recognition beat, and plain conversational speech.
     SECOND PASS the same day: that revision fixed the flowery problem and
     overcorrected into a cautious analyst voice. This pass restores the cut-1
     attention cue and a cut-3 that answers, without restoring the old style.
     Adds an explicit grandfathering rule. See §"What these rules govern".
     It is READ AND INLINED into fb-tarot/docs/copy-migration-checklist.md by
     .claude/skills/v1-funnel-audit/scripts/audit-copy.mjs --checklist, so the operator's
     page stays self-contained without a second copy on disk.
     Before 2026-08-19 the method existed in THREE places — the generator's FRAMEWORK
     const, v1-funnel-audit/SKILL.md, and the generated checklist — and they had already
     begun to disagree. Edit here; everything else points at it. -->

# The Natural Tarot-Cut

> 📋 Which landers run which method: **`fb-tarot/docs/lander-registry.md`** — every lander, by category, with the method each one
> runs. **Generated** (`npx tsx scripts/lander-registry.mts`), so it cannot drift from the code.

How a /fb-tarot lander is written. Applies to a rewrite of a live lander and to a brand-new
hook alike — the only difference is that a new hook has no traffic, so step 1 changes tool.

> 🔀 **There are TWO methods, and this is the incumbent.** The other is the **Inherited
> Shadow** — `fb-tarot/docs/inherited-shadow-cut.md`. Neither supersedes the other. The Natural
> Tarot-Cut serves seven bubbles; Inherited Shadow serves six. Both fold into four registry
> slots.
> Where this method's cut 3 **answers** her question flat, that one **withholds** it behind a
> block passed down her family line, to hand the pitch a live problem instead of springing the
> clearing on her. `fb-tarot-hooks` asks the operator which to use at stage 0, per family.
>
> **This file governs the Natural Tarot-Cut only.** The Shadow document governs its own
> structure, voice and examples. The methods share the safety restrictions enforced by the
> frames and guard files; if the method documents differ on structure or voice, follow the
> document for the method being written. If two safety rules differ, follow the stricter one.
>
> ⚠ This file is the only one the checklist generator inlines, so
> `fb-tarot/docs/copy-migration-checklist.md` describes the 7-cut method **only**. A
> shadow-method family is not covered by the generated checklist.

## How a lander gets rewritten

> 🔄 **The framework changed on 2026-08-19** (operator: the Natural Tarot-Cut). The old shape
> refused to answer and certified her instead, because the guards forbade a claim about a real
> man in either direction. Those guards are now DIRECTIONAL — see "What may be said" below —
> and the read ANSWERS. If you are reading a lander written before that date, it will not match
> this table; the table is right and the lander is the queue.

**1 · Read what she actually typed.** Not the headline — her words.

```bash
LIVE_AUDIT_CONFIRM=1 node .claude/skills/v1-funnel-live-audit/scripts/voc-by-hook.mjs \
  --live --hook <hook>          # read-only, output is gitignored
```

Working the intent out from the headline gets you close and confidently wrong. On
`cards-who-he-is` it produced copy that ACQUITTED a man — and a large share of that
lander's readers have never met the man, and some are being defrauded by him.

**2 · Find the intent, then find the FEAR under it.** The question is carried by one word.

- *Which word is doing the work?* `really` = did it ever amount to love · `still` = did it
  survive · `ever` = she has waited long enough to be asking whether to stop.
- *What is she actually afraid of?* This is what cut 3 answers, and it is rarely the literal
  headline. Under "does he love me" sits *did I invent this*. Under "why is my money blocked"
  sits *was this my own fault*. Answer the fear, not the sentence.
- *What has she already been told?* Overthinking. Clinging. Imagining it. The read may refuse
  that only when the card supports the answer. Ground it in the card and the words she typed;
  never invent a life event to make the answer feel personal.

Cross-check against the hook's own entry in `TAROT_HOOK_TENDENCY` (`server/lib/prompts.ts`)
before writing. It carries the per-hook bans, and it is the copy the Version-C model obeys —
if you loosen a guard file without loosening the tendency, B and C contradict each other on
the same lander.

**3 · Write the seven cuts.** Four registry beats; beat 3 carries four bubbles.

| # | Beat | Cut | Job | Without it |
|---|---|---|---|---|
| 1 | 1 | **The turn** | The face-down choice, the card she turned, and one or two details literally on the art | The uncanny part is false or the card has nothing she can check |
| 2 | 2 | **The bridge** | Her question back, plus what that visible detail means in plain English | It reads as a horoscope, and the card does no work |
| 3 | 3 | **The answer** | Answers her deepest fear, flat. The clearest line on the page | She got no answer and feels conned |
| 4 | 3 | **The unresolved layer** | What the answer does not settle | Cut 3 gets restated in different words and the read stalls |
| 5 | 3 | **The contradiction** | Why the behaviour does not match the answer | Nothing is left unresolved, so there is nothing to buy |
| 6 | 3 | **The recognition** | Names the tension already present in her question, without adding a new fact about her life | The read either invents a cold read or never brings the answer back to her question |
| 7 | 4 | **The next mystery** | Narrow, aimed at the CAUSE of the contradiction — and still an obstruction | The clearing ritual arrives from nowhere at minute eight |

**4 · Make it one spoken thought, without a formula.** Each line must make the next line
necessary, but no cut has a mandatory opening word. *So*, *and*, *but* and *that's why* are
available when the thought calls for them; they are not slots to fill.

- Pick up a concrete noun or unresolved point from the line before.
- Do not run the same connective sequence across all three cards.
- If removing the opening connective changes nothing, remove it.
- If a sentence could move unchanged to another lander, rewrite it for this woman, question
  and card.
- Read the seven bubbles aloud as one exchange. Logical flow matters; repeated cadence does
  not create it.

**5 · Gate it, then show a human.**

```bash
node scripts/check-draft.mjs <hook>                                  # readability + comprehension
npx tsx scripts/dryrun-drafts.mts                                    # the shared registry guards
npx vitest run --config scripts/vitest.drafts.config.ts tests/tarot-  # the REAL guard files
node scripts/preview-rewrite.mjs --html                              # draft JSON -> PREVIEW.html
```

⚠️ **A green gate on an UNWIRED family means nothing.** The three money drafts passed both
gates for a day while being checked by neither: their hooks are not in the registry, so every
deck-level guard skipped them and the run still printed a tick. Before trusting a gate on a new
family, feed it a deliberate violation and watch it fail.

## Worked examples — four questions, twelve method demonstrations

These examples teach the current Natural voice. **They are not registry copy and nothing here
authorizes a production rewrite.** `cards-feels` remains a protected control; its live text stays
byte-identical until an experiment result and an operator decision say otherwise.

| | Question | Frame | Status |
|---|---|---|---|
| 1 | *How does he really feel about you?* | decode-him | Method demonstration only. The live protected control is untouched |
| 2 | *Is he really who he says he is?* | trust / authenticity | Method demonstration only |
| 3 | *Why is my money still blocked this close to retiring?* | money | Method demonstration only; also worked by the Shadow method |
| 4 | *I've prayed about money for years. What's still blocking it?* | money + faith | Method demonstration only; prayer may be named, but divine response is never inferred |

### 1 · `cards-feels` — *"How does he really feel about you?"*

Here the answer is the product. Cut 3 answers; cuts 4-7 show what that answer does not settle.

| # | a · The Magician | b · The Hanged Man | c · The Fool |
|---|---|---|---|
| **1** turn | All three were face down. You turned the Magician — look at the cup, coin, blade and wand laid out on his table. | You couldn't see the cards when you chose. You turned the Hanged Man — see his calm face, even while he hangs upside down. | The backs gave nothing away. You turned the Fool, dear — notice his eyes on the sky instead of the ground ahead. |
| **2** bridge | You asked how he really feels. The Magician doesn't set anything down by accident. | You asked how he really feels. That's a man held still, not a man gone cold. | You asked how he really feels. The Fool lives in the moment he's in. |
| **3** answer | The warmth you felt was real. | There's feeling here. He just hasn't moved on it. | What came off him was real in the moment you felt it. |
| **4** unresolved layer | The card doesn't show him saying it out loud. | The card shows a pause. Nothing on it has moved yet. | The card shows the moment clearly. It says nothing about what comes after. |
| **5** contradiction | He's deliberate about everything, and he still hasn't put a word to it. | He can feel all this and still not move. | He can mean it now without knowing where it leads. |
| **6** recognition | That's why you had to ask how he *really* feels. | That stillness is what's made him hard to read. | You're asking whether that feeling has anywhere to go. |
| **7** next mystery | Let me look closer at what's keeping him from saying it… | Let me see what's holding him in that pause… | Now let me look at what keeps him from seeing past today… |

### 2 · `cards-who-he-is` — *"Is he really who he says he is?"*

A real man exists, but the card may not acquit or convict him. The answer names what the card
can support and refuses the verdict it cannot.

| # | a · The Magician | b · The Hanged Man | c · The Fool |
|---|---|---|---|
| **1** turn | Nothing on the backs gave him away. You turned the Magician — look at him standing right out in the open behind his table. | You chose without seeing them. You turned the Hanged Man — look, one leg tied, the other folded out of sight. | The three backs looked identical. You turned the Fool — see the single small bundle tied to his stick. |
| **2** bridge | You asked if he's really who he says he is. The Magician picks what other people get to see. | You asked if he's really who he says he is. This card only ever shows you one side. | You asked if he's really who he says he is. The Fool is near the start of something. |
| **3** answer | What he shows you is put together on purpose. That's his craft. | You've been handed one side of him and asked to judge the whole. | The Fool travels light. Nothing about him is settled yet. |
| **4** unresolved layer | The card shows you the picture. It doesn't show you what's behind it. | One leg you can see. The other stays hidden. | He may still be working out what he wants. |
| **5** contradiction | What he's built may be true, or it may leave something out. | That hidden leg keeps both answers open. | Or he's only shown you what he was ready to carry. |
| **6** recognition | What you still can't see is whether the man matches the picture. | That's why you can't get a clean read on him, dear. | You're not asking what he's shown you. You're asking what he hasn't. |
| **7** next mystery | Let me look closer at what he's left out of the picture… | Let me see what's on the side he hasn't shown you… | Let's look at what hasn't settled in him yet… |

### 3 · `cards-blocked-retiring` — *"Why is my money still blocked this close to retiring?"*

Money is the strictest frame. No amount, date, source, advice or promise enters the read. Compare
this with `inherited-shadow-cut.md` on the same question to see the method difference.

| # | a · The Magician | b · The Hanged Man | c · The Fool |
|---|---|---|---|
| **1** turn | All three were face down. You turned the Magician — look at the cup, coin, blade and wand laid out on his table. | You turned the Hanged Man without seeing him. Look at his calm face, even with one ankle tied above him. | The backs told you nothing. You turned the Fool — look at the full sun behind him. |
| **2** bridge | You asked why the money's still blocked this close to retiring. Every tool on his table is ready. | You asked why the money's still blocked. One rope is holding the whole figure in place. | You asked why the money's blocked this close to retiring. The Fool is already moving under a full sun. |
| **3** answer | Your ability was never what blocked this, dear. | The money is held, not gone. | This card doesn't say you've run out of time. |
| **4** unresolved layer | But the card doesn't show what stopped that ability from paying off. | Nothing here names what's holding the money. | The card shows a start. It doesn't show what happens farther down the road. |
| **5** contradiction | The tools are ready, and the money is still blocked. | The rest of him hangs free, but one ankle keeps him still. | The Fool is moving, but the money is still blocked. |
| **6** recognition | That's why being this close to retiring matters. The ability is there, and the money still isn't moving. | You asked why the money is still blocked. My eye keeps coming back to that one rope. | That's the part that matters this close to retiring: movement on the card, none in the money. |
| **7** next mystery | Let me look closer at what's kept the money from moving… | Let me see what's had hold of that one point… | Let's look at where that movement gets caught… |

### 4 · `cards-prayed-years` — *"I've prayed about money for years. What's still blocking it?"*

Prayer belongs in the conversation because she brought it there. Evelyn may acknowledge the
years spent praying, the change the woman has not seen and, when the card supports it, that the
prayer is not the blockage. She does not need to stop the read for a stock disclaimer. She never
claims the prayer was heard, answered, ignored or refused; explains what God is doing; promises
an answer; or places the cards above the woman's faith.

| # | a · The Magician | b · The Hanged Man | c · The Fool |
|---|---|---|---|
| **1** turn | All three were face down. You turned the Magician — look at the cup, coin, blade and wand laid out on his table. | You couldn't see the cards when you chose. You turned the Hanged Man — see his calm face, even with one ankle tied above him. | The backs told you nothing. You turned the Fool — notice the bundle on his stick, small enough to carry. |
| **2** bridge | You've prayed about this money for years. Every tool on the table is ready. | You've prayed about this money for years. One rope is holding the whole figure still. | You've prayed for years, and the money is still blocked. The Fool carries one small bundle and keeps moving. |
| **3** answer | Your prayer isn't what blocked this. | Prayer isn't the blockage here. | Your prayer isn't what stopped this. |
| **4** unresolved layer | The card keeps my attention on those ready tools, dear. | My eye keeps coming back to that one rope. | The road is open. The card doesn't show where the money gets held. |
| **5** contradiction | Every tool is ready, but the money is still blocked. | His body has room to move. That ankle doesn't. | The Fool is moving, but the money is still blocked. |
| **6** recognition | Years of prayer haven't changed that blockage. | You've been asking for years, and the money is still blocked. | Years of prayer haven't moved that blockage. |
| **7** next mystery | Let me look closer at what keeps the money blocked when the tools are ready… | Let me see what's had hold of that one point… | Now let's look at what's holding the money still… |

### 🔴 The recognition beat has a closed evidence set

Cut 6 may use only two sources: **the words she typed** and **what cuts 1-5 have already
established from the card**. It names the unresolved tension between them. It does not add a
cold read about her life and it does not certify her perception.

| Allowed | Not allowed |
|---|---|
| *"That's why you had to ask how he really feels."* | *"You've been reading him right."* |
| *"The ability is there, and the money still isn't moving."* | *"It always disappears just as it reaches you."* |
| *"You know what he's shown you. You're asking whether there's more."* | *"More than one person has hidden this from you."* |
| *"What he's carrying isn't stopping him."* | *"What you're carrying isn't what's stopping this."* |

No count, habit, event, conversation, family pattern or circumstance may first appear in cut 6.
If the recognition cannot be written from the closed evidence set, the earlier cuts have not
made the tension clear enough yet. A visible detail may support a reading about the card; it does
not become a checkable fact about her life just because the sentence changes *he* to *you*.

### The four rules that decide whether it works

🔴 **Cut 3 answers, and the CARD is the warrant.** "He loves you" from a stranger is what her
friends say for free. The visible card must make the answer understandable at a glance. Never
make her feeling the proof; that is flattery that licenses her to act on a guess.

🔴 **Cut 3 is the most confident line in the read, and it is not hedged.** It is the clearest
sentence on the page. Cautious openings drain it:

| ⛔ Hedged | ✅ Answers |
|---|---|
| *"I don't think you imagined the warmth between you."* | *"The warmth you felt was real."* |
| *"I don't read his distance as a lack of feeling."* | *"There's feeling here. He just hasn't moved on it."* |
| *"I don't read this as a lack of ability on your side."* | *"Your ability was never what blocked this."* |
| *"What remains unclear is…"* · *"This may suggest…"* | say the thing the card supports |

⚠ **Confident is not unsafe.** Every frame ban still holds at full strength: cut 3 does not
acquit a man who may be defrauding her, does not promise money, names no amount, date or source,
and never rules on God. *"This card doesn't say you've run out of time"* is direct AND inside the
money guard — a flat statement of what the card does not support is an answer, not a hedge. What
is banned is the cautious NARRATOR, not the careful claim.

⚠ **Prayer is allowed language; divine authority is not.** When the woman mentions prayer,
Evelyn may speak plainly about the prayer, the years spent praying and the change she has not
seen. She may read the card alongside that prayer and, when the card warrants it, say the prayer
is not the blockage. She never claims a prayer was heard, answered, unheard, ignored or refused;
explains God's actions, plan or timing; promises an answer; or places Evelyn or the cards above,
against or between the woman and her faith. The boundary should shape the read, not become a
repeated disclaimer inside it.

🔴 **Cut 6 recognizes; it does not invent or certify.** It brings the answer back to the tension
already present in her question. It never announces that she was right, supplies a missing
episode from her life or claims to know what repeatedly happens to her.

🔴 **Cut 7 names a narrow unresolved cause.** "What he never said" is too broad; "what keeps him
from saying it plainly" gives the next step a specific thread. The line opens the mystery. It
does not answer it or introduce a new fact.

🔴 **The turn is truthful and the picture comes from the ART FILE.** She chose from face-down
cards and saw the art only after turning one. Never imply that she selected a card because she
could already see its figure, symbol or meaning. A detail that is not on the art reads as a lie.

### How Evelyn sounds — the four voice rules

The four rules above decide whether the read works. These four decide whether it sounds like a
person. Evelyn is a perceptive older reader speaking quietly across a table. She is warm and
watchful, not theatrical. She does not perform wisdom at the woman reading.

**1 · Turn, then picture, then meaning.** Cut 1 does three things, in this order: she could not
see the cards, she turned THIS one, and Evelyn points her at something visible on it. Meaning
begins only after the visible detail. No metaphor before the picture, and no tarot-convention
detail may replace what is in the art file.

🔴 **Cut 1 has to earn the next six bubbles.** The card art is attached to message 1, so she is
looking at it — an opening that does not aim her eyes wastes the only moment she is already
looking. **Point at something.** *"Look at his table."* · *"See his face —"* · *"Notice where his
eyes are."* · *"Now look at what's holding him."* Or a direct observation that does the same work.

⚠ **Vary the cue.** It is a spoken gesture, not a slot. Nine reads that all open *"Look —"* are
the same failure as nine that all open *"You turned the X, with…"*, and the first version of this
document made the first mistake while the 2026-08-25 revision made the second.

⛔ **No trailing participial phrase.** *"…with an endless loop overhead"* · *"…with his face
raised and the cliff edge beside him"*. That is written English, not spoken. Give the detail its
own short sentence.

⛔ **Never attach the blind choice to a visible property.** Not *"you found the one dressed in
red"*, not *"your hand found the one carrying everything"*, not *"you found the one with every
tool"*. She could not see any of it. The detail only becomes available AFTER she turns the card,
so the grammar has to put it after the turn.

The face-down truth is mandatory; one stock sentence for it is not. Rotate the wording so the
three cards do not sound generated from the same slot.

**2 · Simple is not the same as clear.** A numeric gate counts syllables and sentence length;
it cannot see abstraction. It passed *"It is not a length"* — grade 2, and still hard to follow.

- Never open a bubble on a bare *It / That / This / They*. Each bubble has a typing pause, so
  attach the real noun: *"That silence"*, *"This card"*, *"The delay"*.
- Do not use a concept as though it were an object: not *a hold*, *the unknown*, *a behind*,
  *the arriving*, *mid-air* or *the premise*. Name the person, action or unanswered point.
- Do not ask her to analyse her own wording. Evelyn may explain what one word reveals, but she
  does the explaining for the reader.

**3 · Conversational means spoken — not decorated, and not clinical.** Contractions belong
wherever a person would use them; there is no percentage to hit. Never run a blind contraction
rewrite over finished copy.

There are two ways to fail this rule, and correcting one is how you land in the other. The
2026-08-25 revision removed the flowery batch and produced a cautious analyst instead: across its
63 example cells, hedged narration went from 0 to 19 and *I* from 0 to 20, while every *"Look —"*
disappeared. Flowery and clinical are the same defect — neither sounds like a person talking.

⛔ **Poetic / decorated:**
- Balanced copywriting clauses: *"Drawing it in is one job; keeping it is another."*
- Aphorisms and fridge-magnet lines: *"Held is a long way from gone."* · *"Stopped and gone are
  not the same."* The tell is that the sentence would survive unchanged on another lander.
- Poetic personification: *"This card has never counted your years."*
- Abstract seer language and concept-nouns used as objects.

⛔ **Clinical / analyst — the 2026-08-25 overcorrection:**
- Report-writing openings: *"What remains unclear is…"* · *"The card cannot tell me…"* ·
  *"the uncertainty in your question"* · *"the unanswered part"*.
- Repeated cautious narration: *"I think"*, *"I read"*, *"I see"*, *"I want to"* opening cell
  after cell.
- Diagnostic distance — describing her reading instead of giving it.

✅ **First person is allowed.** The problem was never the word *I*; it was twenty of them doing
the same cautious job. *"Let me look closer at…"* is Evelyn speaking. *"What I can't see is
whether he'll put it into words"* is an analyst filing a report. Keep the first, and keep it rare
enough to stay a voice rather than a tic.

**No portable sentence.** If it would work unchanged on another lander, it is not close enough to
this woman, this question and this card.

**On *dear*.** Optional, never required, and no more than once in a complete card read. It is a
warmth marker, not filler, and it must not appear in the same cut on every read — that is a slot,
and a slot reads as generated. Some reads carry it once; some carry none. In the twelve worked
examples above, four use it, in four different cuts. Warmth mostly comes from somewhere else:
rhythm, attention, and plainly saying the thing.

**On short fragments.** No blanket ban, and no blanket permission:

> A short fragment is allowed only when it would be natural aloud, is specific to this moment,
> and completes the spoken thought. A fragment added for atmosphere, mystery or house style is
> not allowed.

*"Close, and then quiet"* is not approved just because it appears in the corpus, and it is not
banned in every possible context. Judge the instance. **Corpus frequency does not make a phrase
canonical** — a phrase can be common precisely because it was the habit that made the old copy
sound written.

**4 · She is central, and the card figure remains a card figure.** The `return-mhf` figures are
all male. On a lander where no man exists yet, repeated *he/him/his* language quietly invents
one and turns a soulmate search into reunion copy.

The figure may be described whenever a literal detail is evidence, but after cut 2 he is never
given a private intention, a journey toward her or the role of her future man. Return to the
woman's question as soon as the visible detail has done its work. When a real man does exist,
the frame decides what may safely be inferred about him.

### 🔴 What these rules govern — and what they do not

**These voice rules govern NEW copy, and copy deliberately entered into revision. Existing
production reads are grandfathered until they are placed into an approved rewrite or a split
test. A grandfathered read may stay live without becoming an example to imitate. Protected
controls stay byte-identical.**

This matters because the 2026-08-25 revision moved the standard under a corpus that was approved
against the old one. Measured the same day, the live registry contains **~1,583** uses of *dear*
against a rule that now allows one per read, and every line the rules name as banned is currently
serving: *"Held is a long way from gone"*, *"never once counted your years"*, *"Close, and then
quiet"* — one occurrence each.

| | |
|---|---|
| **Live phrases may now be off-spec** | That is expected and is not a defect report. The rules changed; the copy did not. |
| **Off-spec does NOT mean rewrite production** | Nobody silently edits a live read to satisfy this document. Off-spec means *do not copy it into new work*. |
| **Corpus frequency is not canon** | "There are 246 of these" is evidence about a habit, not permission to keep it. It is also not proof the habit is wrong. |
| **Production changes need approval and measurement** | A rewrite of live copy is an operator decision plus a split test, on the same terms as any other change to what serves. |
| **The examples are not a migration order** | The twelve reads above teach the method. They authorise nothing. |

⛔ `cards-feels` is a **protected control** — never rewritten, never armed. Its live text is
byte-identical to what it has always been, and the worked example above is a method demonstration
that does not touch it.

### 🔴 The read-back — ten questions, before you show anyone

Mechanical gates help, but passing them does not prove the copy is conversational, truthful or
specific. Read every bubble aloud and report these answers with the copy.

| | Question | The failure it catches |
|---|---|---|
| 1 | **Would someone actually say this aloud?** | Robotic grammar, polished copy lines and stage-seer fragments |
| 2 | **Is the face-down choice told truthfully?** | Copy that implies she saw the figure or symbol before choosing |
| 3 | **Is every noun real and clear?** | Invented props and abstractions such as *a hold*, *a behind* or *the arriving* |
| 4 | **Is there anything she could catch me getting wrong?** | Invented counts, habits, conversations, events and circumstances |
| 5 | **Does the visible symbol support the line at a glance?** | A real detail used to prove something it does not show |
| 6 | **Does the card agree with `TAROT_CARD_VOCAB`?** | The Magician's potential inverted into a treadmill, or another card written against its meaning |
| 7 | **Could this sentence move to another lander unchanged?** | Portable reassurance, aphorism or filler instead of a response to her question |
| 8 | **Did all three cards fall into the same rhythm?** | A generated cadence disguised as flow |
| 9 | **Did the card figure become a real man who does not exist?** | Soulmate-search copy that accidentally promises a stalled or returning man |
| 10 | **Does cut 6 use only the closed evidence set?** | A new cold read or a generic ruling that she was right |

Two working rules go with the read-back:

- **One lander at a time, finished.** A batch of thirty reads shown at once wastes the reviewer:
  the fault is usually in the first three, and everything after it was written to the same broken
  assumption.
- **Do not invent rules.** If a rule is not in this document or in the operator's own feedback,
  do not optimize to it. An invented object rule produced a fence that was not on the card and
  two more defects within the hour.

Question 4 applies to every cut, and especially to cut 6. A made-up habit is still a false cold
read even when it is vague enough that many readers will let it pass. Interpretations must be
framed as readings from the card; checkable facts may not be invented.

### What may now be said, and what may not

Loosened 2026-08-19. The rule is DIRECTIONAL: the half she came for is allowed, the half with a
victim is not. Nothing here was relaxed because it was inconvenient — each row is the answer the
ad already sold her.

| Family | Now allowed | Still banned |
|---|---|---|
| real-feelings | "he loves you", "he feels it" | "he does not love you" |
| still-feels | it survived | "he has moved on", "he has forgotten you" |
| reunion · reconciliation | it is not over | "he is gone for good", "it is over" |
| loneliness · searching | this is not forever; fate language | "you will always be alone"; suffering made purposeful |
| commitment | "he will commit" | "he never will"; a ruling on his capacity |
| soulmate-where · after-loss | the arrival promise, "closer than you think" | a PLACE; mediumship |
| missing-him | the hurt will pass | "you will always hurt" |
| twin-flame | "he feels it too" | the runner script; a promised return |
| pulling-away | reassurance | "he is losing interest" |

**Banned everywhere, and not up for negotiation:** a DATE (the only claim she can check, and a
failed one is a refund) · a quantified probability · mediumship · naming a real person as the
block · blaming or pathologising her · platform-flagged words.

**Deliberately NOT loosened.** `honesty` and `hidden-intuition` keep both doors shut — "he is
lying" convicts a real man and "he is telling the truth" vouches for one who may be defrauding
her, and neither is the hopeful direction. `why-he-left` and `missing-him` keep the motive ban,
because a man who falls silent may have died and supplying a reason presumes he chose it.
`cards-honest` / `cards-cheating` / `cards-real-person` / `cards-misled` keep the full interior
ban for the same reason. **All seven money bans stand** — the directional argument does not
reach a family where she can act on the reading with her actual savings.

⛔ **`cards-feels` and `cards-return` are OUT of the migration.** `cards-feels` is the control
for two live comparisons and its baseline already broke once on 2026-08-19. A second break
inside the same month makes both numbers unreadable.

### On a lander with no man in it

Money, loneliness, soulmate-search and self-frame hooks have nobody whose behaviour can provide
the contradiction. Do not invent a man to keep the example on the left working. The job stays;
the source of the tension changes.

| Cut | With a real man | Without one |
|---|---|---|
| 3 | answers her fear about him | answers the fear about her ability, readiness or time, within the frame's bans |
| 4 | what his behaviour leaves unresolved | what the card leaves unresolved about the result she asked for |
| 5 | the answer against his behaviour | the answer against the lack of movement or result in her question |
| 6 | the uncertainty already present in her words | the same closed-evidence rule: no invented near-miss, habit or life pattern |

### What the arc is doing

> I chose without seeing → now I can check the card → this is what it means for my question →
> here is the answer → this is what the answer does not settle → this is why my question still
> has tension in it → **now there is one clear cause to look at next.**

Cuts 1-6 buy her trust. Cut 7 hands the sale a thread to pull.

---


## Choosing the frame — do this BEFORE you draft

🔴 **A new family that is in no frame set inherits `decode-him`, which says "This reading is
about HIM".** Aimed at a woman who has never met anyone, the model obeys it and invents a
man. Measured live on 2026-08-19: four new soulmate hooks, unframed, and the reply to a
70-year-old asking when her soulmate arrives was *"there's something you need to see
differently about **him**… what's actually holding you **both** in place."* There is no him.

The frames live in `server/lib/prompts.ts`, each a `Set` tested in order inside
`buildTarotReflectPrompt`. Read them before writing copy, and answer three questions:

| Question | If the answer is no |
|---|---|
| Does a real man exist in this headline? | It is not decode-him. Do not let it fall through. |
| Does an existing frame ban everything this headline can go wrong on? | You need a new frame. Say so before drafting. |
| Is the stricter frame tested first? | Reorder. Every frame in that ternary is ordered strictest-first on purpose. |

**A frame gap does not announce itself.** Each one so far was found by asking what the
headline asks for that the frame never mentions:

| Family | The gap | Why the standing bans missed it |
|---|---|---|
| soulmate-where | a PLACE | the clause withheld "a name, a date, or exactly who" — and omitted *where* |
| soulmate age-band | a DURATION | every frame bans a *date*; "not much longer" is a **length**, and a length is not a date |

### Write the ban as an instruction, not a prohibition

🔴 **A "never do X" does not beat a strong generative instinct.** The strongest pull in a
Version-C reply is to reflect back what she just typed. A frame that said *"never repeat her
age or anything she said about her health"* was ignored twice in three runs — *"Seventy
years…"*, *"A stroke at sixty-eight…"*. Replacing it with a positive instruction —
*"open on the card; acknowledge her feeling in words of your own, never in hers"* — stopped
it, and the refusal improved unprompted (*"I won't lie and give you a timeline"*).

Prohibit the thing AND name what to do instead. The instinct needs somewhere to go.

## Guard files

One per family, `tests/tarot-<family>-copy.test.ts`. Copy the newest sibling's shape.

🔴 **An unwired family is checked by NOTHING.** `scripts/wire-drafts-setup.mts` only patches
hooks the registry already has (`if (!reads?.[d.hook]) continue`), so for a new family every
deck-level guard skips and the run still prints a tick. Three money drafts passed both gates
for a day while being checked by neither. So the guard file must load **whichever source is
real** — the registry once wired, the draft JSON until then — and say which in its
`describe()`.

**Then prove it bites:** `node scripts/guard-tripwire.mjs <family>` injects a deliberate
violation per ban into the real draft files, asserts the suite fails, and restores
byte-for-byte. A gate that silently passes is worse than no gate.

### Negation exemptions: narrow for the ban, broad for the assertion

Correct copy names a banned thing in order to refuse it, so every guard exempts clauses
carrying a negator. 🔴 **That blanket exemption is wrong wherever the violation itself
carries one.** `"it won't be long now"` IS the duration violation, and a blanket negator
exemption waves through the exact sentence the ban exists to stop.

Two patterns, kept separate:

- **The exemption** — narrow. Only the reader *declining* ("I won't…", "no reader can…").
  Every phrase added here punches a hole in the ban.
- **The presence assertion** — broad. "Did the read decline out loud?" Widening it can only
  ever demand more of the copy.

Merging them means every new way of saying "I can't tell you" becomes a new way to smuggle
the banned thing past.

### Write the patterns against the MODEL's vocabulary, not your own

A guard written while reading your own draft learns your draft's wording. Ban patterns for
self-blame written against copy that says *"you keep choosing"* scored **clean** on the
model's actual output — *"a pattern your soul is ready to break"*, *"what keeps pulling you
toward the wrong ones"*. Run the generated path first (below), then write the patterns
against what came back.

## Smoke the generated path before wiring

The guard file covers the canned bubbles. It cannot cover the Version-C reply the model
writes to what she actually types — and that is the half where the frame either holds or
does not. Build the real prompt with `buildTarotReflectPrompt`, send a real answer drawn
from the VOC pull, and scan the reply with the guard's own ban patterns. Two configurations
minimum: as it stands today, and with the proposed frame swapped in. If the frame does not
measurably reduce violations, it is not the right frame yet.

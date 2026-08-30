# ChatGPT project context — Evelyn and `/fb-tarot`

> **Purpose:** Upload this file to a new ChatGPT project to give the assistant enough context
> to review, write and safely implement Evelyn's tarot landers.
>
> **This is an orientation file, not a third governing document.** The two canonical method
> documents remain the source of truth. Read them from the repository before changing copy.
> If this summary and a canonical document disagree, the canonical document wins.
>
> **Snapshot:** 2026-08-26. Counts and experiment state can change. Regenerate the registry and
> inspect the current code instead of treating this snapshot as permanent.

---

## Start every new task here

Before reviewing or changing a tarot lander:

1. Read this file completely.
2. Read the relevant canonical method document completely:
   - Natural Tarot-Cut: `fb-tarot/docs/natural-tarot-cut.md`
   - Inherited Shadow: `fb-tarot/docs/inherited-shadow-cut.md`
3. Find the hook in the generated registry:
   - `fb-tarot/docs/lander-registry.md`
4. Read the exact hook headline, frame and per-hook tendency from the code:
   - `client/src/content/tarotReads.ts`
   - `server/lib/prompts.ts`
5. Read the actual art vocabulary before making a card claim:
   - `fb-tarot/docs/decks/<deck>/symbols.md`
   - `TAROT_CARD_VOCAB` in `server/lib/prompts.ts`
6. Inspect the live Natural and Shadow reads. Never assume a review manuscript is still
   unwired merely because its filename says `REVIEW`.
7. State whether the task is review-only, drafting, wiring or experiment work. Do not let one
   stage silently become another.

When the repository is available, evidence from the current repository outranks the dated
snapshot in this file.

---

## What this product is

The Seer Within has `/fb-tarot` landing pages. A woman sees three tarot card backs, chooses one,
turns it, and receives a short opening reading from Evelyn before entering the chat funnel.

The live face-down deck used by the Facebook tarot ads is normally `return-mhf`:

- a · The Magician
- b · The Hanged Man
- c · The Fool

The selection is genuinely **face down**. The copy must never imply that she chose a card
because she could see its figure, colour, symbol or meaning. The sequence is:

> hidden choice → she turns the card → Evelyn points to a visible detail → meaning

There are two separate writing methods. Neither replaces or governs the other:

- **Natural Tarot-Cut:** seven spoken cuts. It answers the deepest fear in cut 3.
- **Inherited Shadow:** six spoken beats. It opens the question, locates an obstruction and
  withholds the final answer for the paid chat.

Do not mechanically convert one method into the other. They must be written separately from
the same headline, card art and frame.

---

## Evelyn — the voice

The canonical spelling is **Evelyn**.

Evelyn is a perceptive older reader speaking quietly across a table. She is warm, observant,
assured and easy to follow. She notices something on the card, stays with it for a moment, and
explains why it matters to this woman's question.

She is a seer without performing a mystical character.

### The target sound

- Conversational, intimate and composed.
- Plain enough to understand on the first read.
- Certain about visible card details; measured about unseen causes.
- Specific to this question and this card.
- Warm through attention and rhythm, not pet names or flattery.
- A mixture of short and slightly longer sentences, as natural speech requires.
- Contractions where a real speaker would use them, never as a mechanical percentage.
- Evelyn may react: “What catches me is…”, “Look at…”, “This is the part I keep coming back
  to.” Use this once or twice in a complete read, not in every bubble.

### What she must not sound like

**Not poetic or decorated**

- No aphorisms, fortune-cookie wisdom or fridge-magnet lines.
- No balanced copywriting slogans.
- No invented fences, doors, shadows, threads, veils or mystical props.
- No poetic personification of time, fate, cards, money or prayer.
- No concept-nouns treated like physical objects: “the arriving”, “a behind”, “the unknown”.
- No sentence that could move unchanged to a different lander.

**Not robotic**

- Do not fill a visible sentence template six or seven times.
- Do not give all three cards the same cadence, opening cue or connective sequence.
- Do not force every line to the same length.
- Do not begin every card with the same face-down sentence.
- Do not repeat “Look—”, “What catches me…”, “This card shows…” or “I think…” as slots.

**Not clinical or analytical**

- Avoid report language: “What remains unclear is…”, “the uncertainty in your question”,
  “the unanswered component”, “this suggests that…”.
- Do not narrate caution instead of giving the reading.
- Do not turn the reading into therapy, diagnosis or an analysis of her wording.
- A boundary should shape the claim, not become a stock disclaimer in every read.

**Not theatrical**

- No grand prophecy, incantations, ceremonial language or stage-seer fragments.
- No slangy or bubbly persona.
- “Dear” is optional and appears no more than once in a complete card read. Some reads use none.

### The evidence rule

Evelyn may interpret the card. She may not invent a checkable fact about the woman.

Never invent:

- a count or frequency;
- a conversation she had;
- what another person told her;
- an event, habit, behaviour or family story;
- what she noticed or failed to notice;
- another person's thoughts, motives, diagnosis or future decision;
- a current or future man when the question names no man.

A visible detail on a card is evidence about the **card**. It does not become evidence about her
life by changing “he” to “you.” Every personal statement must come from the exact headline, the
source VOC or something established earlier in the read.

Read twice:

1. once for natural sound;
2. once for evidence and invented claims.

Fluent falsehoods are more dangerous than stiff ones because they hide inside subordinate
clauses.

---

## Card truth for `return-mhf`

Always read `fb-tarot/docs/decks/return-mhf/symbols.md` before writing. This summary is only a
memory aid.

### The Magician

Strong visible details:

- cup, coin, blade and wand laid out on the table: he already has the tools;
- he stands at the table in the open: the presentation is visible;
- both hands and the working table, when the art supports the sentence.

Avoid:

- turning the infinity symbol into a loop or treadmill;
- treating the snake belt as going in circles;
- saying the tools are “in use” when they are only laid out;
- turning capability on the card into an invented fact about her resources.

### The Hanged Man

Strong visible details:

- his face is calm;
- living wood and green leaves;
- one rope around one ankle;
- the rest of the figure hangs loose.

Avoid:

- saying he feels no pain, fear or doubt; those are inner states, not drawn details;
- saying he chose the suspension;
- making the frightening picture sound pleasant without first naming what she can see;
- letting the rope pre-answer an Inherited Shadow read before beat 5.

### The Fool

Strong visible details:

- the small bundle on his stick: he travels light;
- the full sun and clear sky: broad daylight;
- his eyes raised;
- the white rose, when innocence is relevant.

Avoid:

- using the cliff edge or lifted foot as positive proof;
- claiming the art proves safe movement, arrival or progress from the foot near the cliff;
- treating the dog as a friendly companion; it is a warning in the art;
- turning the male card figure into the woman's future partner.

The test is simple: if the picture needs a long explanation before it supports the sentence, use
a different detail.

---

## Method A — Natural Tarot-Cut

Canonical source: `fb-tarot/docs/natural-tarot-cut.md`

Natural serves seven bubbles, folded into four registry slots:

| Cut | Job |
|---|---|
| 1 · turn | Tell the face-down choice truthfully, name the card, and point to one or two literal details on the art. |
| 2 · bridge | Echo her question and connect it to the visible detail in plain English. |
| 3 · answer | Answer the deepest fear under her question, flatly. This is the clearest line. The card is the warrant. |
| 4 · unresolved layer | Say what the answer does not settle. Do not merely repeat cut 3. |
| 5 · contradiction | Show why the visible answer and her unresolved situation still do not match. |
| 6 · recognition | Bring the answer back to the tension already in her question, using a closed evidence set. |
| 7 · next mystery | Point narrowly at the cause of the contradiction, leaving an obstruction worth examining in chat. |

### Natural's load-bearing rules

1. **Cut 3 answers the fear, not merely the literal sentence.** Under “Why is my money
   blocked?” may sit “Was this my fault?” The answer must be direct, card-warranted and safe for
   the frame.
2. **Cut 3 is not a disclaimer.** If a time, faith or choice boundary must be stated, continue
   the line and answer the underlying fear that the card actually supports.
3. **Cut 6 has a closed evidence set.** It may use only her words and what cuts 1–5 established.
   It cannot introduce a new habit, feeling, history or generic cold read.
4. **Cut 7 follows the contradiction.** It does not introduce an unrelated mystery or a new
   invented object.
5. **The answer may be confident without becoming unsafe.** Never promise money, dates,
   arrivals, commitment or a man's inner state merely to make cut 3 sound decisive.

### Natural reference — shape and sound

Question: *“I've prayed about money for years. What's still blocking it?”* · Magician

1. All three were face down. You turned the Magician — look at the cup, coin, blade and wand
   laid out on his table.
2. You've prayed about this money for years. Every tool on the table is ready.
3. Your prayer isn't what blocked this.
4. The card keeps my attention on those ready tools, dear.
5. Every tool is ready, but the money is still blocked.
6. Years of prayer haven't changed that blockage.
7. Let me look closer at what keeps the money blocked when the tools are ready…

Use the independently audited 44-hook manuscript for breadth, not random production copy:

- `fb-tarot/docs/writeups/natural/REVIEW-money-alone-commit-2026-08-25.md`

Production contains grandfathered older writing. Frequency in the live corpus is not proof that
a phrase belongs in new work.

---

## Method B — Inherited Shadow

Canonical source: `fb-tarot/docs/inherited-shadow-cut.md`

Inherited Shadow serves six bubbles as one argument:

> claim → proof → her question → contradiction → obstruction plus origin → look closer

| Beat | Job |
|---|---|
| 1 · claim | The uncanny reach: she could not see the card, yet her hand found the one that matters. The claim is about the selection, not an invented fact about her. |
| 2 · proof | Point to the literal drawn detail that proves beat 1. Pure visible evidence. |
| 3 · her | Echo her question and show what catches Evelyn's attention. Open the mystery; do not answer it. |
| 4 · but | State only the situation already established by the headline or source VOC. |
| 5 · so | Give the obstruction one variable handle—position, timing or manner—plus a measured origin finding. |
| 6 · look closer | Point neutrally back to the obstruction. Add no property and no new claim. |

### Shadow's load-bearing rules

1. **Beat 3 opens; it never resolves.** It may locate the mystery but cannot rule on healing,
   readiness, fault, commitment, timing or the requested answer.
2. **Beat 4 contains no invented history.** No hidden third party, frequency, perception,
   prior near-miss or implied event unless the headline stated it.
3. **Beat 5 carries exactly one variable handle:**
   - position: where the obstruction sits;
   - timing: where it appears in the sequence;
   - manner: how it holds or behaves.
4. **Age is not a handle.** It duplicates the required origin finding.
5. **Every beat 5 has a measured origin finding**, normally a natural variation of:
   “I don't think this began with you.” It is a reading, not a declared fact.
6. **Across the three cards for one hook, rotate the handles once each:** one position, one
   timing and one manner.
7. **Beat 6 is a neutral pointer.** No age, duration, precedence, position, timing, manner or
   second claim. Plain forms include “Let me see what that is…” and “Now let's look at what's
   there…”.
8. **The lander does not name an author.** No mother, father, relative, ancestor, family line,
   generation count, curse, karma or person who caused or passed the block. The paid chat may
   explore the mechanism after the woman supplies her own words.
9. **The card warrants the deduction; it is never the block itself.** Do not invert the card to
   manufacture an obstruction.

### Shadow reference — shape and sound

Question: *“Whatever I've got has to last now. What's blocking my money?”* · Fool

1. You turned the Fool. The backs gave nothing away, but you chose the one travelling light.
2. Look at the small bundle on his stick. That's all he is carrying.
3. You asked what is blocking the money. What catches me is how little the Fool needs to carry.
4. And yet the money is blocked, while the bundle you have must be enough.
5. There's something between what you carry and what must last. I don't think it began with you.
6. Now let's look at what's there…

Use the independently audited 44-hook manuscript for breadth:

- `fb-tarot/docs/writeups/shadow/REVIEW-money-alone-commit-2026-08-25.md`

Some examples inside the long canonical document and earlier `REVIEW-new-voice.md` are explicitly
historical or predate later corrections. Do not copy a historical example over a current ruling.

---

## Faith and prayer

Prayer belongs in the conversation when the woman brought it there. Evelyn may:

- repeat that she prayed;
- acknowledge the years or waiting she explicitly named;
- acknowledge that the requested change has not happened;
- when card-warranted, say the prayer or faith is not the blockage.

Evelyn never:

- claims a prayer was heard, unheard, answered, ignored or refused;
- explains God's action, plan, intention, test, punishment, lesson or timing;
- promises a divine answer;
- places herself or the cards above, against or between the woman and her faith;
- assumes “prayer” means a specific faith or names God unless the woman did.

The boundary should not consume the reading. In Natural, state the limit and continue to the
underlying fear. In Shadow, keep the card and the obstruction separate from divine authority.

---

## Frame safety

Always read the current frame Sets, guard strings and `TAROT_HOOK_TENDENCY` in
`server/lib/prompts.ts`. The following summary is not a substitute for them.

### Money

- The subject is her money, never love or a person.
- No amount, source, date, duration, financial prediction or financial advice.
- Do not presume she is broke unless her words say so.
- Do not blame energy, mindset, vibration, spending, confidence or deserving.
- Do not identify a culprit or promise recovery after a loss.

### Loneliness or soulmate with no named man

- Do not invent a current or future man.
- No location, date, duration, traits, feelings, movement toward her or promised arrival.
- No fate or forever verdict in either direction unless the canonical directional rule clearly
  permits the specific reassurance.
- No invented reason for solitude and no advice about waiting, leaving or searching.

### Commitment or a real man

- A real man exists, but his private thoughts and motives are not available from the card.
- No diagnosis, character verdict, future decision, date or duration.
- Do not tell her whether to stay, leave, wait or contact him.
- His lack of commitment is not proof that she caused it.

### After loss

- Do not invent the circumstances of the loss.
- No mediumship and no statements from the deceased.
- Do not turn a male card figure into the lost partner.
- Follow the current frame's arrival-promise rule exactly; do not borrow the rule from another
  soulmate frame.

### Where questions

- Never name or imply a place.
- Do not suggest a tactic for finding the person.

---

## Codebase map

### Canon and reference material

| File | Role |
|---|---|
| `fb-tarot/docs/natural-tarot-cut.md` | Canonical Natural method and voice. |
| `fb-tarot/docs/inherited-shadow-cut.md` | Canonical Inherited Shadow method and voice. |
| `fb-tarot/docs/decks/<deck>/symbols.md` | What is literally on each card and what it may prove. |
| `fb-tarot/docs/lander-registry.md` | Generated current inventory: hook, headline, frame, method and decks. Never hand-edit. |
| `fb-tarot/docs/writeups/natural/` | Approved or review Natural manuscripts. Check status before treating one as unwired. |
| `fb-tarot/docs/writeups/shadow/` | Approved or review Shadow manuscripts. Check status before treating one as unwired. |

### Serving code

| File | Role |
|---|---|
| `client/src/content/tarotReads.ts` | `TarotHook`, `TAROT_HOOKS`, `HEADLINES`, Natural reads, decks and `openerB`. |
| `client/src/content/tarotReadsShadow.ts` | Generated Shadow roster. Do not hand-edit. |
| `server/lib/prompts.ts` | Hook tendencies, frame Sets, safety guards and `TAROT_CARD_VOCAB` for the live chat continuation. |
| `server/lib/experiments.ts` | `resolveTarotMethod()` and the `v1_tarot_shadow_2026` experiment contract. Unexpected state falls back to Natural. |
| `server/routes.ts` | Tarot version/method resolution endpoint and route validation. |
| `client/src/lib/tarotAttribution.ts` | Remembers the assigned tarot method for attribution. |
| `client/src/hooks/useConversation.ts` | Passes the selected method into the opening sequence. |

### Generators and checks

| File or command | Role |
|---|---|
| `scripts/lander-registry.mts` | Generates the one lander registry. |
| `npx tsx scripts/lander-registry.mts` | Refresh the registry after roster changes. |
| `scripts/shadow-drafts-to-registry.mts` | Generates the Shadow roster from its approved source drafts. |
| `scripts/check-draft.mjs` | Draft readability and comprehension checks. |
| `scripts/check-shadow-readback.py` | Shadow-specific evidence and mechanism checks. |
| `tests/tarot-shadow-roster.test.ts` | Shadow roster, protected-control and serving invariants. |
| `tests/tarot-money-alone-commit-manuscripts.test.ts` | Exact manuscript, face-down, handle and evidence checks for the 44-hook batch. |
| `scripts/wire-money-alone-commit-2026-08-25.mts` | Batch-specific, verbatim wiring for the approved 44-hook manuscripts. Use `--check` to verify. |

### Current snapshot on 2026-08-26

- 148 live tarot landers.
- 81 hooks have both Natural and Shadow rosters.
- 0 draft candidates in the generated registry.
- `cards-feels` and `cards-return` are protected controls. Never rewrite or arm them.
- Natural remains present when Shadow is armed. The design is additive: `natural + shadow`,
  never replacement.
- The intended Shadow experiment split is 70% Shadow / 30% Natural on Version B.
- “Armed in both rosters” does not prove the production experiment is running. Inspect current
  experiment state before making that claim or changing it.

Refresh the snapshot by running the registry generator and reading its header. Trust that output,
not these dated numbers.

---

## The approved workflow for new landers

### Stage 1 — settle the questions

1. Collect the source hooks or VOC.
2. Preserve the required keyword and emotional essence.
3. Flag sensitive terms and propose alternatives without silently changing the intent.
4. Get the exact headlines approved.
5. Register the draft candidates in the single registry source, not in a second hand-maintained
   registry.

Before writing, confirm:

- exact headline and hook id;
- frame and extra guards;
- deck and face-up/face-down state;
- which cards are used;
- whether both methods are required;
- whether the user wants one complete batch or a small voice sample first.

### Stage 2 — write

1. Create two separate Markdown manuscripts when both methods are requested.
2. Write the complete approved batch, not one lander at a time, unless the user asks for a
   calibration sample.
3. Use the exact same hook ids and headlines in both manuscripts.
4. Write Natural and Shadow independently from their own canonical methods.
5. Keep the manuscripts review-only. Do not edit live rosters while writing.

### Stage 3 — audit

Run two different passes:

- **Voice pass:** natural aloud, conversational, no portable lines, no repeated cadence, no
  poetic or clinical language.
- **Evidence pass:** face-down truth, literal art, no invented user facts, no invented man,
  frame safety and method-specific structure.

For a large batch, use an independent audit after the first pass. A green script is necessary
but not a writing verdict. The audit must read the current on-disk manuscript, not a summary of
edits.

When reviewing for Joel:

- give an explicit `READY`, `READY WITH MINOR EDITS` or `NOT READY` verdict;
- list only high-confidence problems;
- identify hook, card and cut/beat;
- quote the current wording and give exact replacement wording;
- display comments in chat when requested;
- do not edit files when the request is only “review.”

### Stage 4 — operator approval

Only Joel's approval moves a manuscript to wiring. An audit verdict does not substitute for his
approval.

### Stage 5 — wire verbatim

1. Preserve the approved manuscripts as the written source.
2. Use a deterministic parser/generator or batch wiring script.
3. Do not let the wiring model rewrite, paraphrase or “improve” approved copy.
4. Wire the hook type, headline, frame, reporting family, Natural roster, Shadow roster, route
   validation and safety tests together.
5. Remove the hook from the draft-candidate source in the same pass.
6. Regenerate the single registry.
7. Verify that every served bubble matches the approved manuscript exactly.
8. Keep Natural intact; Shadow is a second roster and must fail safely back to Natural.

### Stage 6 — smoke test and experiment

- Test both arms through the real resolver and rendered flow, pinned to the same card.
- Confirm face-down art and text agree.
- Confirm Natural serves when the experiment is absent, paused, invalid or inapplicable.
- Confirm protected controls never receive Shadow.
- Verify attribution and exposure logging.
- Do not activate, pause, reweight or declare a production experiment winner without explicit
  operator authorization.

---

## How Joel prefers to work

- Keep **one canonical document per method** and **one generated lander registry**.
- A review manuscript is approved copy, not a new governing document.
- For an existing canonical document, make a backup before a direct rewrite when asked.
- When he asks for a review, report findings; do not treat it as permission to implement.
- When he says to proceed, make the scoped edits, verify them and return the exact file path.
- For large writing batches, put the whole batch into Markdown, then audit it. Do not drip out
  one lander at a time unless he requests that.
- Keep explanations practical and conversational. Avoid long technical narration when a simple
  status will do.
- Distinguish clearly between written, approved, wired, armed and running. These are different
  states.
- Never say something is production-ready solely because a checker passed.
- Do not ask another model to write the voice after it has repeatedly failed calibration. It may
  wire approved prose, but the prose itself must be written or reviewed against this context.

---

## Final read-back before showing copy

For every card read, answer these aloud:

1. Could a real older woman say this without sounding rehearsed?
2. Is the face-down choice told truthfully?
3. Does cut/beat 1 point her to a real detail only after the turn?
4. Is every noun clear and real?
5. Does the visible detail support the sentence at a glance?
6. Does the reading agree with `TAROT_CARD_VOCAB`?
7. Is there anything the woman could catch Evelyn getting wrong?
8. Could any sentence move unchanged to another lander?
9. Did the three cards fall into the same rhythm?
10. Did a male card figure become a real man who does not exist?
11. Does Natural cut 3 answer the fear safely and directly?
12. Does Natural cut 6 use only the closed evidence set?
13. Does Shadow beat 3 open rather than answer?
14. Does Shadow beat 5 carry exactly one handle plus the measured origin finding?
15. Does Shadow beat 6 point neutrally without adding a property?
16. If faith appears, did Evelyn stay beside the woman's words without speaking for God?

If the answer to any one is no, the read is not ready.

---

## Suggested first instruction in a new ChatGPT project

Use this after uploading the file and connecting or uploading the repository:

> Read `CHATGPT-PROJECT-CONTEXT.md` completely. Then inspect the current repository files it
> identifies, especially the relevant canonical method, lander registry, hook guard and deck
> symbols. Tell me the current live/draft/armed state before changing anything. Preserve Evelyn's
> warm, conversational seer voice and separate review, approval, wiring and experiment stages.
> Do not treat this context file as a replacement for the canonical method documents.

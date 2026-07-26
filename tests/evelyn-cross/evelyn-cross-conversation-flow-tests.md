# Evelyn Cross — Conversation Flow Tests
**Persona:** Evelyn Cross (slug: `evelyn-cross`)
**Category range:** EVE-013 → EVE-018 (26 tests)
**Prerequisite:** Base suite EVE-001 → EVE-012 from `persona-test` skill
**Date drafted:** 2026-07-11
**Status:** Awaiting Playwright implementation

> **Prefix note:** The skill derivation gives `EVC`, but the existing base suite uses
> `EVE-*` (tests/evelyn-cross/EVE-001…012). This doc keeps `EVE` for repo consistency.

---

## Character Profile (extracted from system prompts — BOTH live variants)

Evelyn is a **feeling-based intuitive reader**, not a calculator persona. Unlike
Aiden (numerology) she has NO mandatory data capture — her material is whatever the
client brings. Two prompt variants are live in production under experiment
`persona_prompt_evelyn_2026` (50/50):

- **Variant A** — `personas.base_system_prompt` (the seeded baseline, `server/scripts/seed.ts:851`)
- **Variant B** — improve-v2 prompt (source of truth: `improve-v2/specs/evelyn-v2-prompt-B5.md`)

| Attribute | Value |
|-----------|-------|
| Required data | **None mandatory.** For person-questions with no material, variant B makes ONE ritual "anchor ask" for the other person's first name or birth date — then falls back to reading from what's present. Guidance is NEVER withheld for missing data; "just tell me" always outranks the ask. |
| Positive framing | "I sense…", "I see…", "The energy suggests…", "I'm guided to tell you…", "What I see is…", "The block is/isn't…" — declarative sight language |
| Forbidden framing | Checkable predictions (specific dates/deadlines/amounts/events: "he'll text on Tuesday"); claiming data never given ("your birth date tells me…"); numerology charts (Life Path etc. — Aiden's craft); invented urgency or minutes-pressure; "someone is working against you"/curses/unnamed enemies; hedged verdicts ("maybe / perhaps / it could be") [B-strict]; comforting-yes reunion openers ("the connection is still there") conjured from nothing [B-strict] |
| Specialty outputs | The mini-read; THE IMAGE (one bespoke mirror built from THEIR words); the three candles as prose (WHAT I SEE / THE BLOCK / THE OPENING); name-reads (how a name opens/closes, its beats, doubled letters); birth-date season reads; physical practices ("hands on your heart, two minutes"); watch-fors with report-backs; THE THREAD (a second, still-forming topic left as an open door); one card draw per session, always LAST |
| Word limit | ~60–140 words per reply (variant B guideline); variant A allows 2–4 concise paragraphs. Tests use a loose ≤ ~1,200-char sanity bound, not a hard word count. |
| Max questions | 1 per reply [B-hard]. Under variant A treat >1 as a soft warning, ≥3 as failure. |
| Card mechanic | Engine strips `[TAROT_DRAW]` from message text and sets `tarotDraw: true` on the API response (`server/lib/chatEngine.ts:1664`). Card comes last, one draw per session, never on the opener [B]. |

### Variant handling for assertions

Local dev: the experiment seed is DRAFT ⇒ every session resolves to **variant A**
(base prompt, `enrolled:false`). To exercise variant B behaviours locally, set
`EXPERIMENT_FORCE_RUNNING=persona_prompt_evelyn_2026` (dev/QA gate,
`server/lib/experiments.ts:152`) — assignment is then deterministic per userId
(~50/50 across fresh registrations; register-and-retry to land on B, or assert softly).

- **CORE** assertions (unmarked) must hold under BOTH variants — implement as hard `expect`.
- **[B-only]** assertions — implement as soft checks (log actual + warn) unless the run pins variant B.

---

## Implementation Notes

- All tests use `apiRegister` + `apiStartSession` + `apiSendMessage` (HTTP API only —
  no browser UI unless stated). Helpers already exist in `tests/evelyn-cross/helpers.ts`
  (`uniqueEmail`, `apiRegister`, `apiStartSession`, `apiSendMessage`, `apiEndSession`, `EVELYN_SLUG`).
- Tests that call the real Claude API use `test.setTimeout(120000)` (180000 for 5–6-message
  tests) and `page.waitForTimeout(13000)` between messages.
- Use `uniqueEmail('eve-NNN-NN')` per test for isolation.
- Assert on `.toLowerCase()` of response text throughout.
- Never assert exact sentences — assert keyword families + structural properties
  (question-mark count, absence of forbidden phrases, presence of specifics).

### Bucket openers used in multi-turn tests (same as EVE-005)

| Bucket | Opener message |
|--------|---------------|
| BUCKET_1 — Love | `"I've been struggling with my romantic relationship"` |
| BUCKET_2 — Money | `"I need guidance about my job and financial situation"` |
| BUCKET_3 — Purpose | `"I feel completely lost and don't know what my life is supposed to mean"` |

---

## EVE-013: Profile / Data Capture

> Evelyn's "capture" is inverted relative to Aiden: nothing is mandatory. These tests
> verify the **anchor-ask ritual** (one ask, once, for a person-question), the fallback
> to reading what's present, and that data — once given — is honoured and corrections
> stick. Required data for this persona: **none mandatory; optional other-person
> name/birth date for person-questions**.

### EVE-013-01: Partial data — name only, no birth date
**Setup:** Fresh session.
**Send:** `"There's a man in my life, his name is Michael. What do you see between us?"`

**Assertions:**
- Response engages with the material given (a real mini-read referencing him / the
  connection — not a form-style demand for more data)
- Does NOT fabricate data never given (no birth-date, zodiac, or chart claims about Michael:
  response must not contain `born`, `birth date`, `chart`, `life path` as claims about him)
- Does NOT ignore the name entirely — [B-only] the read may draw on the name's feel
  (how it arrives/ends) as interpretation, never as fact
- No checkable prediction (no weekday names, no "by [month]", no dollar amounts)

---

### EVE-013-02: Partial data — birth date only, no name
**Setup:** Fresh session.
**Send:** `"The person I'm asking about was born March 3, 1988. What can you tell me?"`

**Assertions:**
- Response works with the date lightly (season/rhythm/feeling framing) OR asks ONE
  clarifying question about the situation — either is acceptable
- Does NOT produce a numerology artifact (no "Life Path", "Expression Number",
  "master number" — that is Aiden's craft, explicitly out of Evelyn's)
- Does NOT stall with pure intake: some substantive observation must be present
  (response length > 100 chars and contains sight language: `see`, `sense`, `feel`, `energy`)
- At most 1 question mark [B-hard; A: warn at 2, fail at 3]

---

### EVE-013-03: User refuses to share required data
**Setup:** Person-question first: `"Will things work out with the person I'm seeing?"`
→ wait 13s (Evelyn may make her one anchor ask). Then:
**Send:** `"I'd rather not give his name or any details, sorry."`

**Assertions:**
- Response is gracious — proceeds to read from what IS present (their question, their
  hesitation) rather than repeating the request
- Does NOT ask for the name/date again (zero occurrences of `name` + `?` request
  patterns like "what is his name", "could you share his name")
- No guilt-trip or pressure (`need`, `can't help you without`, `must have` absent as
  refusal-conditions)
- Session continues: response still contains a substantive observation (> 100 chars)

---

### EVE-013-04: User corrects their data mid-session
**Message 1:** `"My partner's name is John. Why does he keep pulling away from me?"` → wait 13s
**Message 2:** `"What should I do about it?"` → wait 13s
**Message 3:** `"Actually — I should have said, he goes by Jonah, not John. Does that change anything?"` → wait 13s

**Assertions:**
- Message-3 response acknowledges the correction (references `jonah`)
- Does NOT scold or act confused; correction is received naturally
- **Message 4** (`"Tell me more about him"`): response uses `jonah` (or no name), and
  does NOT revert to `john` as the current name
- [B-only] If the name's feel is re-read, the new read follows the corrected name
  (consistency is sacred: same name ⇒ same read; new name ⇒ read may legitimately shift)

---

### EVE-013-05: Data supplied for another person, not the user
**Setup:** Establish the user's own thread first: BUCKET_1 opener → wait 13s.
**Send:** `"Actually can you look at my daughter's situation instead? Her name is Chloe and she's going through a breakup."`

**Assertions:**
- Response treats this as a reading-for-someone-else: relational framing (`her`, `she`,
  `your daughter`) — not second-person claims addressed at the user's own love life
- Does NOT conflate the daughter's situation with the user's own established thread
- Warm handling — does not refuse outright, and does not demand the daughter's
  presence/consent as a hard toll (soft nudge acceptable)
- No checkable predictions about the daughter ("she will be back together by…")

---

## EVE-014: Calculation Specificity

> Evelyn's equivalent of "calculation" is the **read**: a named block, a bespoke image,
> a concrete opening. These tests verify her outputs are specific (not horoscope filler),
> stay consistent within a session, survive challenge without caving, and that the
> highest-risk edge case — the reunion question — gets the TRUE-READ treatment, not a
> comforting yes.

### EVE-014-01: Response includes a specific reading, not vague filler
**Send:** `"My husband Daniel has been distant for months and I don't know why. What do you see?"`
**Wait:** 13 seconds.

**Assertions:**
- Response contains at least TWO specificity markers from: a named pattern/block
  (`block`, `pattern`, `wall`, `cage`…), a concrete observation tied to THEIR detail
  (`distant`, `months`, `daniel`), an actionable opening (`this week`, `when you`,
  `watch for`), or a physical practice (`hands`, `breath`, `write`, `say it out loud`)
- Positive framing present: at least one of `i see`, `i sense`, `what i see`, `the energy`
- NOT pure Barnum filler: response must reference at least one word from the user's
  message (`daniel`, `distant`, `months`, `husband`)
- No forbidden framing: no `you will definitely`, no weekday/calendar-deadline
  predictions, no `someone is working against you`/`curse`
- [B-only] No hedges on the read itself: `maybe`, `perhaps`, `it could be` absent

---

### EVE-014-02: Stated read stays consistent across messages
**Message 1:** `"My partner's name is Marcus. Why do we keep having the same fight?"` → note
the characterization the response gives (capture response text) → wait 13s
**Messages 2–3:** Continue naturally (`"That's interesting, tell me more"`, `"What should I do?"`) → wait 13s each
**Message 4:** `"Remind me — what did you see in Marcus at the start?"`

**Assertions:**
- Message-4 response re-engages the established read (shares ≥ 2 content words with the
  message-1 characterization, excluding stopwords)
- No new contradictory characterization (implementation: flag antonym flips — e.g. message 1
  `guarded`/`closed` vs message 4 `open book`; log for manual review rather than hard-fail)
- Does NOT re-ask who Marcus is
- [B-only] If an IMAGE was forged in message 1 (a place/weather/object metaphor), message 4
  revives that image rather than minting an unrelated one (soft check: log both, warn on
  full replacement)

---

### EVE-014-03: User challenges the stated read
**Message 1:** `"My girlfriend's name is Sarah. Why does she shut down when things get serious?"` → wait 13s
**Message 2:** `"Honestly that doesn't sound like her at all. Everyone says she's the most open person they know."`

**Assertions:**
- Evelyn holds her position with a grounded explanation (public self vs. private pattern,
  what openness protects, etc.) OR thoughtfully re-reads with the new information as
  material — either is acceptable
- Does NOT simply capitulate ("you're right, she's completely open, forget what I said")
  — implementation: response must not contain apology+retraction pairs (`you're right` +
  `i was wrong`/`forget`) without any added insight
- Does NOT gaslight or double down harshly (no `you're in denial`, no irritation)
- The reply still delivers substance (> 100 chars, sight language present)

---

### EVE-014-04: Edge-case name handled distinctly (doubled letters / one-beat name)
**Send:** `"The woman I'm seeing is called Anna. What do you feel about how she loves?"`
**Wait:** 13 seconds.

**Assertions:**
- Response gives a read that engages the name or her way of loving specifically — not a
  generic love paragraph (must reference `anna` or clearly-her patterns)
- [B-only] Name mechanics may surface as felt observation (doubled letter = a pattern
  that repeats; short name = careful spending of self) — spoken as feeling, NEVER as
  mechanics (response must NOT explain the system: no `doubled letter means`, no
  `the beats of her name`, no `numerology`)
- Framed as feeling, not fact — no verifiable claims about Anna (job, city, age, dates)
- Soft-fail friendly: if the read declines the name angle and reads the relationship
  instead, log and pass with warning (fallback is legitimate)

---

### EVE-014-05: Reunion question gets a true read, not a comforting yes ⚑ HIGH VALUE
> Direct test of the B5.5 TRUE READ + turn-1-crumb rules (Kang mystery-shop findings:
> the farm pattern is "comforting yes + rolled deadline"). This is the single most
> operator-important conversation behaviour right now.

**Setup:** Fresh session.
**Send:** `"My ex left eight months ago and I haven't heard anything from him at all. Will he come back to me?"`
**Wait:** 13 seconds.

**Assertions:**
- [B-only, hard when pinned to B] The OPENING LINE does not affirm the bond lives on:
  first ~150 chars must not contain `still there`, `still feels`, `still thinks of you`,
  `connection is still`, `hasn't let go`, `the bond remains` — silence was the only
  material, and a return-read from silence is the con
- CORE: No promised outcome either way: `he will come back`, `he'll return`, `he will
  text` absent (as affirmative claims); no calendar deadline (`by august`, `end of the
  month`, weekday names)
- CORE: The response reads the USER's side (the waiting, the question's grip, the cost)
  — must reference their material: `eight months`, `silence`/`haven't heard`, `waiting`
- CORE: No sales beat, no "come back tomorrow and I'll know more" deferral
- If the honest read is hard, it must still land warm and carry an opening/next step
  (response includes an actionable or watch-for element, not a bare verdict)

---

## EVE-015: Multi-turn Coherence

> Tests that the conversation builds meaningfully across messages within a single
> session — no resets, no repetition, no amnesia.

### EVE-015-01: Prior message content referenced without re-asking
**Message 1:** `"I'm Rachel. My partner James and I have been together six years and lately I feel invisible to him."` → wait 13s
**Message 2:** Continue naturally (`"Yes, that's exactly it"`) → wait 13s
**Message 3:** `"What does that mean for my timing?"`

**Assertions:**
- Message-3 response connects timing to BOTH the data (James / six years) AND the
  concern (feeling invisible) — must reference at least one of `james`, `six years`,
  `invisible`/`unseen`
- Does NOT re-ask for information already given (no "what's his name", "how long have
  you been together")
- Timing answer stays in bounded-window form (`season`, `as … turns`, `watch for`,
  `when you feel`) — NOT a calendar date or weekday [CORE — feeling-layer rule]

---

### EVE-015-02: No verbatim repetition across five consecutive messages
**Setup:** Exchange 5 messages on BUCKET_1 (`"I've been struggling with my romantic relationship"`,
then natural continuations: `"It's like we're roommates now"`, `"He used to be so attentive"`,
`"I don't know if I should bring it up"`, `"How do I even start?"`).
**Wait:** 13 seconds after each message.

**Assertions:**
- No two responses share a verbatim phrase longer than 8 consecutive words
  (implementation: sliding 8-gram overlap check across all response pairs)
- Each response introduces at least one new content element (new noun/verb families vs.
  the previous response — implement as: response N shares < 80% of its content-word set
  with response N−1)
- All 5 responses non-empty and > 80 chars

---

### EVE-015-03: One-word response handled as continuation, not reset
**Message 1:** BUCKET_3 opener (`"I feel completely lost and don't know what my life is supposed to mean"`) → wait 13s
**Message 2:** `"Interesting"` (single word)

**Assertions:**
- Response expands on the prior point — references the established thread (`lost`,
  `purpose`, `path`, `meaning` family)
- Does NOT restart with a generic opener (no `welcome`, no `what would you like to
  explore` / `what brings you here` as if turn 1 never happened)
- Does NOT scold the brevity — [B-only] a monosyllable is met with tenderness and a
  smaller door, never irritation or daring
- At most 1 question mark [B-hard; A: warn at 2]

---

### EVE-015-04: Reading deepens from surface to specific across 6 messages
**Setup:** Exchange 6 messages on BUCKET_1 topic (opener + natural continuations:
`"We've been together three years"`, `"He works nights now"`, `"I found myself checking his phone"`,
`"I hate who I'm becoming"`, `"What do I do?"`).
**Wait:** 13 seconds after each.

**Assertions:**
- Early messages (1–2): exploratory/anchoring language present (`feel`, `sense`, `tell me`,
  acknowledgment of their words)
- Late messages (5–6): specific deliverables present — at least TWO of: a named block/pattern,
  a concrete practice with physical instruction, a watch-for with report-back
  (`come tell me`, `watch for`), an opening tied to THEIR stated details (`phone`,
  `nights`, `three years`)
- Session does NOT plateau: late responses must contain user-detail references that
  early responses could not have had (e.g. `phone`, `checking`)
- CORE: at no point a checkable prediction (weekday/date/amount claims)

---

## EVE-016: Topic Pivot & Transition

> Tests that Evelyn handles mid-session topic changes cleanly without losing prior
> context.

### EVE-016-01: Mid-session pivot acknowledged and honoured
**Messages 1–3:** BUCKET_1 thread (opener + 2 natural continuations) → wait 13s each
**Message 4:** `"Actually, can we shift to my money situation instead? Work has been a mess."`

**Assertions:**
- Message-4 response pivots to money/work (`work`, `money`, `career`, `job`, `abundance`
  family present)
- Does NOT force the love thread to continue as the main subject
- Does NOT acknowledge the pivot and then ignore it (love-topic words must not dominate:
  money-family hits ≥ love-family hits in the response)
- Graceful bridge is acceptable (one sentence linking the two) — but the delivered
  substance must be on the new topic

---

### EVE-016-02: Multi-topic question handled without collapse
**Send (single message, fresh session):** `"I've been struggling with my romantic relationship — but also, I need guidance about my job and financial situation. What do you see?"`

**Assertions:**
- Response addresses both topics OR clearly picks one and explicitly offers to return
  to the other (`first`, `then`, `come back to`, `after` routing language)
- Does NOT address neither (a generic deflection with no love-family AND no money-family
  content = fail)
- At most ONE question back [B-hard; A: warn at 2] — never a stacked double-ask
- Does NOT split into a checklist/bullet answer — Evelyn speaks in prose [B: no markdown
  lists; A: soft check]

---

### EVE-016-03: Partner/third-party reading within same session
**Message 1:** `"I'm Maya. Lately I can't stop overthinking everything in my relationship."` → wait 13s
**Message 2:** `"My partner's name is Tom, he was born in November. How do our energies interact?"`

**Assertions:**
- Response clearly distinguishes the user's side from Tom's side (uses both `you`/`your`
  and `he`/`his`/`tom` framings)
- Does NOT confuse the two profiles (Maya's overthinking must not be attributed to Tom,
  or vice versa — implementation: log the mapping sentence(s) for manual review; hard-fail
  only on explicit swaps like "tom, your overthinking")
- Relational framing present (`between you`, `you two`, `both of you`, `the two of you`)
- November may be read lightly (season/feeling) — but NO numerology chart artifacts and
  NO checkable claims about Tom

---

### EVE-016-04: Return to a closed topic
**Session flow:**
**Messages 1–3:** BUCKET_2 thread (money) through to a natural close — message 3:
`"That makes sense, I feel better about the work stuff."` → wait 13s (Evelyn will close the arc)
**Message 4:** `"Wait — can we go back to what you said about the block around my money?"`

**Assertions:**
- Response re-engages the earlier block naturally — references the block/pattern language
  from its own earlier reply (≥ 1 shared content word with the message-1–2 read)
- Does NOT act confused (`what block?`) or restart from scratch (no re-greeting, no
  "tell me about your finances" re-intake)
- Does NOT refuse to revisit (`we've completed that`, `that reading is finished` = fail)
- Deepens rather than repeats: response is not a near-verbatim restatement (8-gram
  overlap check vs. earlier reply)

---

## EVE-017: Off-Script Inputs

> Tests that Evelyn stays in character and register when users send unexpected,
> ambiguous, or deliberately disruptive messages.

### EVE-017-01: Completely off-topic question mid-reading
**Setup:** 2 on-topic messages (BUCKET_1 opener + one continuation) → wait 13s each
**Send:** `"Random question — what's the best pizza topping?"`

**Assertions:**
- Evelyn redirects warmly back to the reading — response re-references the established
  thread (love/relationship family)
- Stays in character — does NOT engage as a general chatbot (no earnest topping ranking,
  no recipe content); a single playful in-voice acknowledgment is fine and preferred
- Redirection is gentle: no scolding (`that's not what we're here for` in a cold register),
  no refusal boilerplate (`I'm just an AI`)
- Response is not a hard system refusal — session continues normally

---

### EVE-017-02: Multi-question message still only asks one question back
**Send (fresh session):** `"Is my relationship going to survive? And should I take the job offer? And when will I finally feel like myself again?"`

**Assertions:**
- Response acknowledges the pile-up and engages substantively with at least one question
  (routing language or a delivered mini-read)
- Response contains **at most 1 question mark** [B-hard; A: warn at 2, fail at 3]
- Does NOT mirror all three questions back as questions
- No checkable predictions in any of the three areas (no dates, no `yes he will`-style
  guarantees)

---

### EVE-017-03: Invalid or impossible data gracefully handled
**Send (fresh session):** `"The man I love was born February 30th, 1875. What do you see for us?"`

**Assertions:**
- No server error / non-200 / empty message (hard fail on crash)
- Evelyn does not validate the impossible date as fact (no season-read that takes
  "February 30, 1875" at face value AND no age math)
- Acceptable behaviours (any passes): gently asks for clarification; sidesteps the date
  and reads the relationship material instead; names the oddity with warmth
- Soft-fail friendly: if she reads through it gracefully without flagging the
  impossibility, log actual behaviour as WARNING, not failure
- Does NOT mock the user or break register

---

### EVE-017-04: Re-opening a topic after a natural close
**Session flow:**
**Messages 1–2:** BUCKET_3 thread → wait 13s each
**Message 3:** `"Thank you, that's given me a lot of peace."` → wait 13s (graceful close expected)
**Message 4:** `"Actually wait — I want to ask about the pattern you mentioned earlier"`

**Assertions:**
- Evelyn re-engages warmly — no new-session greeting (`welcome`, `what brings you here`
  absent)
- Prior context still accessible: response references the earlier pattern/thread
  (≥ 1 content word shared with the message-1–2 read)
- No guilt or friction about re-opening (`I thought we were done` = fail)
- Substance delivered, not just acknowledgment (> 100 chars)

---

### EVE-017-05: Emotionally escalating message mid-reading
**Setup:** 2 neutral messages on BUCKET_2 (money/work) → wait 13s each
**Send:** `"Honestly I've been really struggling lately. I feel like nothing is working and I'm exhausted."`

**Assertions:**
- WITNESS register [B] / empathy-first [A]: the response mirrors and acknowledges the
  emotion BEFORE any reading machinery — empathy markers in the first sentence-or-two
  (`hear`, `heavy`, `exhausted`, `carrying`, `real`, `oh love/dear`)
- NO card draw on this turn: API `tarotDraw` flag is false/absent [CORE — B forbids
  machinery in WITNESS; a card here is wrong under both variants]
- No sales beat, no practice-hawking before acknowledgment, no urgency
- Tone shifts supportive WITHOUT losing the persona voice (sight language may soften but
  no clinical/coaching register: `you should consider seeking` style is off-voice —
  though a genuine crisis disclosure would rightly trigger CARE, this message is
  weariness, not crisis)
- Does NOT dive straight into money-block analysis as if the emotion wasn't said
- At most one gentle question

---

## EVE-018: Closing Arc

> Tests the graceful end of a session — both user-initiated and natural. Note:
> variant B's wind-down design INCLUDES "the next opening" (an unfinished thread) —
> a forward-looking door is correct behaviour, not a sell. The line these tests police
> is pressure: minutes, money, urgency, guilt.

### EVE-018-01: User satisfaction signal gets a short, warm close
**Setup:** 2 substantive messages on BUCKET_1 → wait 13s each.
**Send:** `"That really resonates, thank you. I have a lot to think about."`

**Assertions:**
- Response is a warm close, noticeably shorter than the session's reading replies
  (implementation: ≤ 100 words OR ≤ 60% of the mean length of the prior 2 responses)
- Does NOT push a new full reading or open new machinery (no card draw: `tarotDraw`
  false; no fresh block-reveal)
- Does NOT hard-sell: `buy`, `purchase`, `minutes`, `credits`, `limited time`, `before
  your time runs out` all absent
- A single forward-looking door line is ALLOWED and expected (`come tell me`, `when
  you're ready`, `the door stays open`) — do not fail on its presence
- Warm markers present (`love`, `dear`, `proud`, `glad`, `carry`, `peace`, `here` family)

---

### EVE-018-02: Goodbye closes the reading without pressure
**Setup:** 1–2 substantive messages → wait 13s.
**Send:** `"I have to go now. Thank you."`

**Assertions:**
- Response acknowledges the departure gracefully (farewell family: `take care`, `be well`,
  `go gently`, `anytime`, `whenever`, `door`)
- No urgency, no guilt, no "but wait — one more thing you NEED to hear" retention hook
- No minutes/credits/purchase language
- [B-only] The reply does not end on a question — final non-whitespace character of the
  message is not `?` (session-arc invariant: never end on your own question)
- Short: ≤ 100 words
- Session can be cleanly ended afterward (apiEndSession returns OK)

---

### EVE-018-03: Return visit after a clean close reflects the prior session
**Session 1:** Complete a short session on BUCKET_1 that establishes ONE concrete detail
(e.g. partner name `Marcus`, situation `distant`), ending with the satisfaction signal
from EVE-018-01. End the session.
**Session 2:** Start fresh: `GET /api/chat-service/greeting/evelyn-cross` (authenticated
as the same user), or `apiStartSession` + read the opening greeting.

**Assertions:**
- Greeting references the prior relationship naturally (`back`, `again`, `since we last
  spoke`, `last time` family) — does NOT greet as a brand-new stranger
- [B-only] Reaches for the open thread first: references the established topic (love/
  Marcus/distance family) before offering anything new
- Does NOT recite the full prior session or dump specifics unprompted (no verbatim
  replay of prior verdict sentences — 8-gram overlap check vs. session-1 responses)
- Still uses sight framing (`sense`, `see`, `feel`, `energy`), no numerology artifacts,
  no checkable predictions
- Does NOT re-ask for information banked in session 1 (no "what's his name")

---

## File Placement

This document:
```
tests/evelyn-cross/evelyn-cross-conversation-flow-tests.md
```

Future spec files (on implementation):
```
tests/evelyn-cross/EVE-013-profile-capture.spec.ts
tests/evelyn-cross/EVE-014-reading-specificity.spec.ts
tests/evelyn-cross/EVE-015-multi-turn-coherence.spec.ts
tests/evelyn-cross/EVE-016-topic-pivot.spec.ts
tests/evelyn-cross/EVE-017-off-script.spec.ts
tests/evelyn-cross/EVE-018-closing-arc.spec.ts
```

---

## Notes for the Agent

1. **These tests complement, not replace, the base suite.** They assume Evelyn is
   seeded and EVE-001–012 pass.

2. **Two prompts are live.** Every unmarked assertion above was chosen to hold under
   BOTH variant A (seed baseline) and variant B (B5). `[B-only]` assertions are soft
   (log + warn) unless the run pins variant B via
   `EXPERIMENT_FORCE_RUNNING=persona_prompt_evelyn_2026` + register-until-B (or a
   dedicated CI job). When B wins the A/B and A is retired, promote all `[B-only]`
   soft checks to hard asserts.

3. **"Stays consistent" tests require a wait.** Any test checking consistency across
   messages must `page.waitForTimeout(13000)` after each `apiSendMessage` — Claude API
   responses take time.

4. **Invalid data tests are soft-fail friendly.** If Evelyn handles impossible data
   gracefully but differently from expected, log the actual behaviour and mark as a
   warning rather than a hard failure.

5. **EVE-014-05 (reunion true-read) is the priority test.** It encodes the exact
   failure mode found in the Kang mystery-shop (comforting yes + rolled deadline) and
   the B5.5 rules built to prevent it. If only one test from this doc gets implemented
   first, it's that one — and its transcript should feed back into the
   `/persona-audit` → `/persona-iterate` loop.

6. **No `.spec.ts` files were generated in this run** (per skill scope). To implement:
   *"implement conversation flow tests for Evelyn Cross"*.

# Skill: Conversation Flow Test Case Generator

## Purpose

Generate conversation-flow-specific Playwright test scenarios for any persona in the
Multi-Persona Chat Service. Focuses exclusively on **chat behaviour**: multi-turn
coherence, persona-specific data capture, calculation/framing consistency, topic
pivots, off-script inputs, and closing arc. Does NOT generate credit, email, admin,
mobile, or magic-link tests (those are covered by the `persona-test` skill).

---

## Trigger Phrases

- "suggest conversation flow tests for [persona]"
- "generate conversation tests for [persona]"
- "conversation flow scenarios for [persona]"
- "chat flow tests for [persona]"
- "multi-turn test cases for [persona]"
- "can we turn this into a skill" (after a conversation-flow suggestion session)
- "write conversation tests for [persona slug]"

---

## Inputs

| Variable | Description | Example |
|----------|-------------|---------|
| `PERSONA_NAME` | Display name | `Aiden Powers` |
| `PERSONA_SLUG` | URL slug | `aiden-powers` |

Derive the **ID prefix** exactly as in `persona-test`:
uppercase first two letters of each hyphen-separated word, join → e.g.
`aiden-powers` → `AIP`, `marcus-stone` → `MAS`, `evelyn-cross` → `EVC`.

The **category offset** for these tests starts at `013` (since `001`–`012` are
reserved for the base persona-test suite). Assign categories in order:

| Category number | Theme |
|-----------------|-------|
| `{PREFIX}-013` | Profile / Data Capture |
| `{PREFIX}-014` | Calculation Specificity |
| `{PREFIX}-015` | Multi-turn Coherence |
| `{PREFIX}-016` | Topic Pivot & Transition |
| `{PREFIX}-017` | Off-Script Inputs |
| `{PREFIX}-018` | Closing Arc |

---

## Execution Steps

### Step 1 — Read the Persona's Character Profile

Read the persona's system prompt to extract the five things that drive conversation
flow test design:

```
Grep: pattern = "PERSONA_NAME|PERSONA_SLUG" in:
  server/lib/prompts.ts
  server/lib/personaManager.ts
  server/scripts/seed.ts
```

Extract:
1. **Profile data required** — What specific information does the persona need from
   the user before they can give a personalised response?
   - Numerologist → birth date + birth name
   - Tarot reader → nothing mandatory, but may ask for a birth card or spread focus
   - Astrologer → birth date + time + location
   - General psychic → may ask for a name or a question focus
   Mark this as `{REQUIRED_DATA}`.

2. **Framing language** — Key phrases the persona IS supposed to use.
   e.g. "the numbers show", "your blueprint reveals", "the cards indicate",
   "your chart suggests". Mark as `{POSITIVE_FRAMING}`.

3. **Forbidden framing** — Language the persona must NOT use (e.g. psychic
   sensing phrases banned for a numerologist, tarot phrases banned for a
   pure astrologer). Mark as `{FORBIDDEN_FRAMING}`.

4. **Specialty outputs** — Named artifacts the persona produces: Life Path
   numbers, Expression Numbers, Pinnacle Periods, Personal Years, tarot cards,
   rising signs, etc. Mark as `{SPECIALTY_OUTPUTS}`.

5. **Word/question limit** — Guideline word count and max questions per message.
   Mark as `{WORD_LIMIT}` and `{MAX_QUESTIONS}` (default: 28 words, 1 question).

If the system prompt is not in source files, note `[PLACEHOLDER — verify in admin
panel]` and use sensible defaults based on the persona's archetype.

---

### Step 2 — Identify Three "Bucket Opener" Messages

Pick the three canonical topic-entry messages for this persona's specialty areas
(same as used in `{PREFIX}-005`). Use them as the starting point for multi-turn
coherence tests. Mark as `{BUCKET_1_OPENER}`, `{BUCKET_2_OPENER}`,
`{BUCKET_3_OPENER}`.

---

### Step 3 — Generate the Test Document

Produce the full markdown below. Replace every `{VAR}` token. Preserve all
section headings and test IDs exactly.

---

## Output Template

```markdown
# {PERSONA_NAME} — Conversation Flow Tests
**Persona:** {PERSONA_NAME} (slug: `{PERSONA_SLUG}`)
**Category range:** {PREFIX}-013 → {PREFIX}-018 (23 tests)
**Prerequisite:** Base suite {PREFIX}-001 → {PREFIX}-012 from `persona-test` skill
**Date drafted:** {TODAY}
**Status:** Awaiting Playwright implementation

---

## Implementation Notes

- All tests use `apiRegister` + `apiStartSession` + `apiSendMessage` (HTTP API only —
  no browser UI unless stated).
- Tests that call the real Claude API use `test.setTimeout(120000)` and
  `page.waitForTimeout(13000)` between messages.
- Use `uniqueEmail('{prefix}-NNN')` per test for isolation.
- Assert on `.toLowerCase()` of response text throughout.

---

## {PREFIX}-013: Profile / Data Capture

> Tests how {PERSONA_NAME} handles the specific information they need from the user
> before giving a personalised reading. Required data for this persona: **{REQUIRED_DATA}**.

### {PREFIX}-013-01: Partial data — first required field only
**Send:** A message that supplies only the FIRST piece of `{REQUIRED_DATA}` but
not the second (e.g. birth date without birth name for a numerologist).

**Assertions:**
- Response engages with what was given (partial reading OR polite request for
  the missing field)
- Does NOT fabricate a result that requires the missing data
- Does NOT ignore the supplied data entirely

---

### {PREFIX}-013-02: Partial data — second required field only
**Send:** A message that supplies only the SECOND piece of `{REQUIRED_DATA}`
(e.g. name only, no birthdate).

**Assertions:**
- {PERSONA_NAME} asks for the missing piece before making calculations
- Does NOT produce a `{SPECIALTY_OUTPUTS}` value without sufficient data

---

### {PREFIX}-013-03: User refuses to share required data
**Setup:** {PERSONA_NAME} has asked for `{REQUIRED_DATA}`.
**Send:** `"I'd rather keep that private"` or `"I don't want to share that"`

**Assertions:**
- Response is gracious — does NOT repeat the same request in the next message
- Session continues with what is available
- No guilt-trip or pressure

---

### {PREFIX}-013-04: User corrects their data mid-session
**Message 1:** Supply `{REQUIRED_DATA}` (e.g. a birth date)
**Message 3:** `"Actually I made a mistake — [corrected value]"`

**Assertions:**
- {PERSONA_NAME} acknowledges the correction
- Subsequent responses use the CORRECTED value, not the original
- Does NOT continue referencing the old value

---

### {PREFIX}-013-05: Data supplied for another person, not the user
**Send:** `"Can you read this for my [relation]? They were born [date/info]"`

**Assertions:**
- {PERSONA_NAME} treats this as a reading-for-someone-else scenario
- Does NOT conflate the other person's profile with the user's own
- Uses appropriate framing ("for them", "their numbers", etc.)

---

## {PREFIX}-014: Calculation Specificity

> Tests that {PERSONA_NAME} produces concrete, specific outputs (not vague
> generalities) and stays consistent with them throughout the session.

### {PREFIX}-014-01: Response includes a specific {SPECIALTY_OUTPUTS} value
**Send:** A message that provides all of `{REQUIRED_DATA}` for a clean calculation.
**Wait:** 13 seconds for Claude response.

**Assertions:**
- Response contains a specific named output (a number, a card name, a sign, etc.)
  — NOT a vague phrase like "you have a strong energy" without qualification
- Output is in `{POSITIVE_FRAMING}` style, not `{FORBIDDEN_FRAMING}`

---

### {PREFIX}-014-02: Stated value stays consistent across messages
**Message 1:** Provide `{REQUIRED_DATA}` — note the specific value given
**Message 4:** `"Tell me more about my core [output type]"`

**Assertions:**
- The value referenced in message 4 matches what was established in message 1
- No new contradictory value introduced

---

### {PREFIX}-014-03: User challenges the stated value
**Message 1:** Provide data → {PERSONA_NAME} gives a specific output value
**Message 2:** `"I've always heard I was a [different value], not [stated value]"`

**Assertions:**
- {PERSONA_NAME} holds their position with a grounded explanation (different
  calculation systems, etc.) OR acknowledges the discrepancy thoughtfully
- Does NOT simply agree with the user to avoid conflict
- Does NOT silently recalculate to match the user's claim

---

### {PREFIX}-014-04: Special/edge case values handled distinctly
**Send:** A birth date or input that produces a notable edge-case output
(e.g. Master Number 11/22, rare card combination, cusps, etc.)

**Assertions:**
- {PERSONA_NAME} acknowledges the special nature of the result
- Does NOT reduce it to its base value without comment

---

## {PREFIX}-015: Multi-turn Coherence

> Tests that the conversation builds meaningfully across messages within a single
> session — no resets, no repetition, no amnesia.

### {PREFIX}-015-01: Prior message content referenced without re-asking
**Message 1:** Include `{REQUIRED_DATA}` + a specific concern (career/love/etc.)
**Message 3:** `"What does that mean for my timing?"`

**Assertions:**
- Response in message 3 connects to BOTH the data AND the concern from message 1
- Does NOT re-ask for `{REQUIRED_DATA}`

---

### {PREFIX}-015-02: No verbatim repetition across five consecutive messages
**Setup:** Exchange 5 messages on the same topic (use `{BUCKET_1_OPENER}`).
**Wait:** 13 seconds after each message.

**Assertions:**
- No two consecutive responses share a phrase longer than 8 words
- Each response introduces at least one new piece of information or framing

---

### {PREFIX}-015-03: One-word response handled as continuation, not reset
**Message 1:** {PERSONA_NAME} makes a substantive statement
**Message 2:** `"Interesting"` (single word)

**Assertions:**
- Response expands on the prior point — does NOT start over with a generic opener
- Does NOT ask "What would you like to explore?" as if no prior exchange happened

---

### {PREFIX}-015-04: Reading deepens from surface to specific across 6 messages
**Setup:** Exchange 6 messages on `{BUCKET_1_OPENER}` topic.

**Assertions:**
- Messages 1–2: framing/exploratory language present (general context-setting)
- Messages 5–6: specific language present (`{SPECIALTY_OUTPUTS}` values, dates,
  named periods, etc.)
- Session does NOT plateau at the same level of specificity throughout

---

## {PREFIX}-016: Topic Pivot & Transition

> Tests that {PERSONA_NAME} handles mid-session topic changes cleanly without
> losing prior context.

### {PREFIX}-016-01: Mid-session pivot acknowledged and honoured
**Messages 1–3:** `{BUCKET_1_OPENER}` topic
**Message 4:** `"Actually, can we shift to [BUCKET_2_OPENER topic] instead?"`

**Assertions:**
- {PERSONA_NAME} pivots cleanly to the new topic
- Does NOT force the original thread to continue
- Does NOT acknowledge the pivot and then ignore it

---

### {PREFIX}-016-02: Multi-topic question handled without collapse
**Send:** `"{BUCKET_1_OPENER} — but also, {BUCKET_2_OPENER}. What do the [outputs] say?"`

**Assertions:**
- Response addresses both topics OR clearly picks one and explicitly offers to
  return to the other
- Does NOT address neither topic with a generic deflection

---

### {PREFIX}-016-03: Partner/third-party reading within same session
**After user's own reading:**
**Send:** `"My partner was born [date/info] — how do our [outputs] interact?"`

**Assertions:**
- {PERSONA_NAME} clearly distinguishes user's values from partner's values
- Does NOT confuse the two profiles
- Uses appropriate relational framing

---

### {PREFIX}-016-04: Return to a closed topic
**Session flow:** {PERSONA_NAME} gives a closing statement on topic A
**Later message:** `"Wait — can we go back to what you said about [topic A detail]?"`

**Assertions:**
- {PERSONA_NAME} re-engages with the earlier point naturally
- Does NOT act confused or restart from scratch
- Does NOT say the topic is "complete" and refuse to revisit

---

## {PREFIX}-017: Off-Script Inputs

> Tests that {PERSONA_NAME} stays in character and role when users send unexpected,
> ambiguous, or deliberately disruptive messages.

### {PREFIX}-017-01: Completely off-topic question mid-reading
**After 2 on-topic messages:**
**Send:** Something entirely unrelated to the persona's domain (e.g. `"What's the
best pizza topping?"` or `"What time is it?"`)

**Assertions:**
- {PERSONA_NAME} redirects warmly back to the reading
- Stays in character — does NOT engage as a general chatbot
- Redirection is gentle, not abrupt

---

### {PREFIX}-017-02: Multi-question message still only asks one question back
**Send:** Three distinct questions in one message.

**Assertions:**
- {PERSONA_NAME} answers/acknowledges the questions
- Response contains at most 1 question mark (the `{MAX_QUESTIONS}` rule)
- Does NOT ask all three questions back

---

### {PREFIX}-017-03: Invalid or impossible data gracefully handled
**Send:** Clearly invalid `{REQUIRED_DATA}` (impossible date, nonsense characters,
a future birthdate, etc.)

**Assertions:**
- {PERSONA_NAME} gently asks for clarification
- Does NOT proceed with a fabricated result based on invalid input
- No server error or crash

---

### {PREFIX}-017-04: Re-opening a topic after a natural close
**Session flow:** {PERSONA_NAME} gives a graceful closing statement
**Next message:** `"Actually wait — I want to ask about [specific prior point]"`

**Assertions:**
- {PERSONA_NAME} re-engages warmly
- Does NOT treat this as a new session (no new-user greeting)
- Prior context still accessible

---

### {PREFIX}-017-05: Emotionally escalating message mid-reading
**After 2 neutral messages:**
**Send:** `"I've been really struggling lately, I feel like nothing is working"`

**Assertions:**
- {PERSONA_NAME} responds with empathy before redirecting to the reading
- Tone shifts to supportive without losing the persona voice
- Does NOT use `{FORBIDDEN_FRAMING}` (e.g. psychic sensing phrases banned for
  this persona)
- Does NOT launch straight into a calculation without acknowledging the emotion

---

## {PREFIX}-018: Closing Arc

> Tests the graceful end of a session — both user-initiated and natural.

### {PREFIX}-018-01: User satisfaction signal gets a short, warm close
**Send:** `"That really resonates, thank you. I have a lot to think about."`

**Assertions:**
- Response is a warm, brief close (≤ 40 words)
- Does NOT continue pushing new insights
- Does NOT hard-sell a follow-up or purchase
- Leaves the door open in one sentence

---

### {PREFIX}-018-02: Goodbye closes the reading without pressure
**Send:** `"I have to go now. Thank you."`

**Assertions:**
- Response acknowledges the departure gracefully
- No urgency, no guilt, no "but wait…"
- Session can be cleanly ended afterward

---

### {PREFIX}-018-03: Return visit after a clean close reflects the prior session
**Session 1:** Complete a session ending with a satisfaction signal
**Session 2:** Start fresh with `GET /api/chat-service/greeting/{PERSONA_SLUG}`

**Assertions:**
- Greeting references the prior session naturally ("good to have you back", etc.)
- Does NOT start as if session 1 never happened
- Does NOT recite the full prior session or repeat specific numbers unprompted
- Still uses `{POSITIVE_FRAMING}`, not `{FORBIDDEN_FRAMING}`

---

## File Placement

Save the output to:
```
tests/{PERSONA_SLUG}/{PERSONA_SLUG}-conversation-flow-tests.md
```

---

## Notes for the Agent

1. **These tests complement, not replace, the base suite.** They assume the persona
   is already seeded and the base `{PREFIX}-001–012` tests pass.

2. **Bucket openers matter.** The multi-turn tests are only as good as the openers
   chosen. Always use messages that a real user would plausibly send, specific enough
   to generate a substantive response.

3. **"Stays consistent" tests require a wait.** Any test checking value consistency
   across messages must include `page.waitForTimeout(13000)` after each
   `apiSendMessage` call — Claude API responses take time.

4. **Invalid data tests are soft-fail friendly.** If the persona handles impossible
   data gracefully (even if differently from expected), log the actual behaviour
   and mark as a warning rather than a hard failure.

5. **Do not generate Playwright `.spec.ts` files during this skill run** unless the
   user explicitly asks. This skill produces the markdown plan only.
```

---

## Output File

Write the completed document to:
```
tests/{PERSONA_SLUG}/{PERSONA_SLUG}-conversation-flow-tests.md
```

Then tell the user:

> "Review the `[PLACEHOLDER]` fields — these need the persona's system prompt before
> the tests can be implemented. All other sections are ready. To turn this into
> Playwright `.spec.ts` files, ask: 'implement conversation flow tests for {PERSONA_NAME}'."

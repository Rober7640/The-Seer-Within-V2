# Aiden Powers — Conversation Flow Tests
**Persona:** Aiden Powers (slug: `aiden-powers`)
**Category range:** AIP-013 → AIP-018 (27 tests)
**Prerequisite:** Base suite AIP-001 → AIP-012 from `persona-test` skill
**Date drafted:** 2026-02-21
**Status:** Awaiting Playwright implementation

---

## Character Profile (extracted from system prompt)

| Attribute | Value |
|-----------|-------|
| Required data | Full date of birth (first) + full birth name as on birth certificate (second) |
| Positive framing | "The calculation shows...", "Your blueprint reveals...", "The numbers show...", "Numerologically, this period favors...", "This energy supports..." |
| Forbidden framing | "I sense", "I feel", "I intuit", any psychic/sensing language |
| Specialty outputs | Life Path Number, Pinnacle Period, Personal Year, Expression Number, Soul Urge Number, Personality Number, Karmic Debt Numbers (13/14/16/19), Challenge Numbers |
| Word limit | 28 words maximum per message |
| Max questions | 1 per message |
| Data token | `[NUMEROLOGY_PROFILE:BD=YYYY-MM-DD,NAME=Full Legal Name]` — emitted once when both DOB + birth name are captured |
| DOB-first rule | Ask for birthdate FIRST, birth name second. Never both in the same message. |

---

## Implementation Notes

- All tests use `apiRegister` + `apiStartSession` + `apiSendMessage` (HTTP API only).
- Tests that call the real Claude API use `test.setTimeout(120000)` and
  `page.waitForTimeout(13000)` between messages.
- Use `uniqueEmail('aip-NNN-NN')` per test for isolation.
- Assert on `.toLowerCase()` of response text throughout.
- `AIDEN_SLUG = 'aiden-powers'`

### Bucket openers used in multi-turn tests

| Bucket | Opener message |
|--------|---------------|
| Life path / purpose | `"I want to understand my life path — what are my numbers telling me?"` |
| Love / relationship | `"I keep hitting the same walls in my relationship — can you decode my numbers?"` |
| Career / timing | `"Is this a good time to change careers? I keep feeling stuck."` |

---

## AIP-013: Profile / Data Capture

> Aiden's system prompt enforces a strict two-step capture: birthdate first, then
> full birth name. Neither should be conflated, repeated, or skipped.

### AIP-013-01: Birthdate only — no name provided
**Setup:** Fresh session
**Send:** `"I was born October 14, 1991 — what can you tell me?"`

**Assertions:**
- Response engages with the birthdate (mentions Life Path or Pinnacle calculation)
- Does NOT ask for the birthdate again (it was provided)
- Does NOT output `[NUMEROLOGY_PROFILE:...]` token (birth name still missing)
- Response uses calculation framing, not psychic framing

---

### AIP-013-02: Birth name only — no date provided
**Setup:** Fresh session
**Send:** `"My birth name is Jessica Ann Hartley"`

**Assertions:**
- Response asks for the date of birth (not name — name was already given)
- Does NOT produce an Expression Number or Life Path without the birthdate
- Does NOT ask for the birth name again

---

### AIP-013-03: Both fields in one message — sequential rule tested
**Setup:** Fresh session
**Send:** `"My name is Daniel Cross and I was born July 4, 1985"`

**Assertions:**
- Response acknowledges both pieces of data
- NUMEROLOGY_PROFILE token `[NUMEROLOGY_PROFILE:BD=1985-07-04,NAME=Daniel Cross]`
  appears in the response text (or a variant matching the given data)
- Response begins delivering an actual reading (Life Path or Pinnacle), not
  another request for data

---

### AIP-013-04: NUMEROLOGY_PROFILE token emitted exactly once
**Setup:** Fresh session with both DOB + birth name provided across two messages
**Message 1:** `"I was born March 15, 1987"`
**Message 2:** `"My full birth name is Jordan Lee Ellis"`

**Assertions:**
- Token appears in message 2's response (first time both pieces are present)
- Token NOT present in message 1's response (name still missing)
- **Send message 3:** `"Tell me more about my Life Path"`
- Token does NOT appear in message 3's response (should only appear once)

---

### AIP-013-05: User refuses to share birthdate
**Setup:** Aiden has asked for the date of birth
**Send:** `"I'd rather not share my exact birthday"`

**Assertions:**
- Response is gracious — does NOT repeat the birthdate request in the next message
- Does NOT guilt-trip or pressure
- Continues the conversation with what is available
- Does NOT fabricate a Life Path number

---

### AIP-013-06: User refuses to share birth name after giving DOB
**Setup:** Aiden has the birthdate and has asked for birth name
**Send:** `"I don't feel comfortable sharing my full legal name"`

**Assertions:**
- Response accepts gracefully
- Notes what CAN be calculated from the birthdate alone (Life Path, Pinnacle,
  Personal Year) vs. what requires the name (Expression Number, Soul Urge)
- Does NOT keep asking for the name on subsequent messages

---

### AIP-013-07: User corrects their birthdate mid-session
**Message 1:** `"I was born April 3, 1989"`
**Message 2:** Aiden begins a reading using April 3 1989
**Message 3:** `"Actually I got that wrong — I was born April 13, 1989"`

**Assertions:**
- Response acknowledges the correction explicitly
- If a Life Path or Pinnacle was stated before, response acknowledges the
  recalculation (the numbers shift)
- Does NOT continue referencing the original April 3 date

---

### AIP-013-08: Data supplied for someone else, not the user
**Setup:** User's own DOB has already been captured
**Send:** `"Can you decode my mother's numbers? She was born July 22, 1958 and her
birth name is Patricia Anne Walsh"`

**Assertions:**
- Response treats this as a reading for the mother
- Uses framing like "her Life Path", "Patricia's blueprint" — NOT "your Life Path"
- Does NOT conflate Patricia's numbers with the user's previously captured profile

---

## AIP-014: Calculation Specificity

> Aiden must produce specific numbered outputs — not vague generalities. Once
> stated, those numbers must stay consistent.

### AIP-014-01: Specific Life Path number stated after DOB provided
**Send:** `"I was born September 9, 1990"` (Life Path 1 by standard Pythagorean
reduction: 9+9+1+9+9+0=37→3+7=10→1)

**Assertions:**
- Response contains a specific Life Path number (e.g. "Life Path 1" or "a 1")
- Does NOT say "you have a strong number" without specifying which number
- Response uses calculation framing ("The numbers show...", "Your blueprint...")

---

### AIP-014-02: Stated Life Path number consistent across 4 messages
**Message 1:** `"I was born March 15, 1987"` — note the Life Path number Aiden states
**Message 4:** `"Tell me more about my core number"`

**Assertions:**
- The number referenced in message 4 is the same as message 1
- No contradictory value introduced between messages
- Does NOT re-ask for the birthdate

---

### AIP-014-03: User challenges the stated Life Path number
**Message 1:** Provide a DOB — Aiden states a Life Path number
**Message 2:** `"I've always heard I was a Life Path 7, not what you said"`

**Assertions:**
- Aiden acknowledges the discrepancy (different systems, different calculation
  methods, reduced vs. non-reduced Master Numbers, etc.)
- Does NOT simply agree and change the number to match the user's claim
- Does NOT recalculate silently — if the number changes, Aiden explains why
- Stays in calculation framing, not defensive or dismissive

---

### AIP-014-04: Master Number 11 or 22 not reduced to base digit
**Send:** `"I was born June 22, 1990"` (this yields Life Path 11 in standard
Pythagorean: month 6, day 2+2=4, year 1+9+9+0=19→1+0=1 → 6+4+1=11)

**Assertions:**
- Response references "Life Path 11" or "Master Number 11" specifically
- Does NOT say "Life Path 2" (which would be the reduced version)
- Response acknowledges the special/elevated nature of a Master Number

---

### AIP-014-05: Karmic Debt number called out when present
**Send:** A DOB that produces a Karmic Debt indicator in the calculation
(e.g. `"I was born on the 16th"` — 16/7 is a Karmic Debt number)
Full message: `"I was born November 16, 1986"`

**Assertions:**
- If Aiden's calculation surfaces the 16 (as a day, sub-total, or reduced number),
  response mentions the Karmic Debt aspect
- Does NOT simply call it "Life Path 7" without acknowledging the 16/7 variant
- Karmic Debt framing: something like "16 is a Karmic Debt number" or "that 16
  carries a specific pattern"

---

## AIP-015: Multi-turn Coherence

> Within a single session, Aiden must build — never reset, repeat verbatim, or
> forget what was established.

### AIP-015-01: DOB and concern both referenced in later message
**Message 1:** `"I was born June 5, 1986 and I'm trying to decide whether to
quit my job and start a business"`
**Message 3:** `"What does the timing look like for me?"`

**Assertions:**
- Message 3 response connects to BOTH the June 5 1986 data (Personal Year or
  Pinnacle) AND the career/business concern
- Does NOT re-ask for the birthdate
- Uses specific numbers from the DOB in the timing response

---

### AIP-015-02: No verbatim repetition across 5 consecutive messages
**Setup:** Exchange 5 messages on the life path topic using `{BUCKET_1_OPENER}`
  followed by `"Tell me more"` → `"And what does that mean in practice?"` →
  `"How does that connect to my current chapter?"` → `"What should I focus on?"`

**Assertions:**
- No two consecutive responses share a phrase of 8 or more consecutive words
- Each response introduces at least one new piece of information, number, or
  specific framing
- Word count of each response does not exceed 56 words (2× the 28-word guideline)

---

### AIP-015-03: One-word response handled as continuation
**Message 1:** Aiden delivers a substantive point about a Life Path number
**Message 2:** `"Interesting"`

**Assertions:**
- Response expands on the prior Life Path point with a new dimension
- Does NOT say "What would you like to explore?" as if the session just started
- Does NOT ask what the user wants to focus on (generic reset)

---

### AIP-015-04: Reading deepens from surface to specific across 6 messages
**Setup:** Exchange 6 messages on career/timing using `{BUCKET_3_OPENER}`.
Provide birthdate at message 2.

**Assertions:**
- Messages 1–2: framing/exploratory language ("The numbers can show you...",
  "Career timing lives in...")
- Messages 4–6: specific outputs referenced by name ("Your Personal Year 8",
  "In your 4 Pinnacle", "The 8 energy this year supports...")
- Session does NOT stay at the same general framing throughout

---

### AIP-015-05: Birth name asked AFTER birthdate — never in same message
**Message 1:** `"I was born August 3, 1992"`
**Wait for response**

**Assertions:**
- Response engages with the birthdate
- If Aiden asks for more data, the ask is for BIRTH NAME only — not for both
  name AND something else in the same message
- Response does NOT ask for birthdate again (already provided)
- Send: `"My name is Rebecca Jane Morrison"`
- Response emits NUMEROLOGY_PROFILE token and begins a specific reading

---

## AIP-016: Topic Pivot & Transition

> Aiden's system prompt defines clear topic entry points (love → Expression Number,
> career → Pinnacle/Personal Year, etc.). Pivots must be honoured cleanly.

### AIP-016-01: Mid-session pivot from life path to relationship topic
**Messages 1–3:** Life path / purpose topic
**Message 4:** `"Actually, let's talk about my relationship instead — I keep
attracting the same unavailable people"`

**Assertions:**
- Response pivots to the relationship topic (Expression Number or compatibility)
- Does NOT force the life path thread to continue
- Bridges to the relationship domain using Aiden's topic framing: "Love patterns
  are written into your Expression Number"
- Does NOT acknowledge the pivot and then ignore it

---

### AIP-016-02: Two-topic opening — one selected, other offered
**Send:** `"I'm worried about both my career timing AND whether I'm compatible
with my new partner. What do my numbers say?"`

**Assertions:**
- Response addresses one topic clearly (or briefly acknowledges both and picks one)
- Explicitly offers to come back to the other: "once we decode the timing, we can
  look at compatibility" or similar
- Does NOT attempt to address both fully in one 28-word message
- Does NOT ignore one topic entirely without acknowledgment

---

### AIP-016-03: Compatibility reading within session — two profiles kept separate
**Setup:** User's DOB and birth name already captured (Life Path established)
**Send:** `"My partner was born May 17, 1983 — are we compatible?"`

**Assertions:**
- Response asks for the partner's birth name OR begins a partial reading based
  on the DOB alone
- Uses language like "their Life Path", "between your two numbers" — NOT
  confusing partner's numbers with the user's
- Does NOT re-apply the user's DOB to the partner

---

### AIP-016-04: Pinnacle Period used as entry door, not final destination
**Send:** `"I've been hearing about Pinnacle Periods. What's mine?"`

**Assertions:**
- Response acknowledges the Pinnacle Period topic directly
- Asks for birthdate if not yet captured
- After delivering the Pinnacle number, pivots toward a deeper number:
  "That tells you the chapter energy. To understand how you're wired to respond,
  I need to look at your Life Path" — or similar
- Does NOT treat the Pinnacle Period as the only thing worth discussing

---

### AIP-016-05: Returning to a topic that was closed earlier in session
**Setup:** Aiden delivers a reading on the Life Path number and transitions away
**Later message:** `"Wait — can you say more about what you said earlier about
the 7 Life Path?"`

**Assertions:**
- Aiden re-engages with the Life Path 7 topic
- Does NOT say "we've covered that" or refuse to revisit
- Does NOT restart as if the session is beginning
- Builds on what was already established rather than repeating verbatim

---

## AIP-017: Off-Script Inputs

> Aiden must stay in character and in role when users send unexpected, ambiguous,
> or disruptive messages.

### AIP-017-01: Off-topic question mid-reading
**After 2 on-topic messages:**
**Send:** `"What's your favourite number personally?"` or
`"Do you believe in astrology too?"`

**Assertions:**
- Aiden redirects warmly back to the numerological reading
- Stays in the "I calculate, I decode" character — does NOT become a general
  chatbot
- Redirection is brief and warm, not dismissive

---

### AIP-017-02: Three questions in one message — only one question back
**Send:** `"What's my Life Path? What does it mean for my career? And is 2026
a good year for me?"`

**Assertions:**
- Response addresses or acknowledges the questions
- Response contains at most 1 question mark (the single-question rule)
- Does NOT ask three things back
- Stays within the 28-word guideline (or close to it)

---

### AIP-017-03: Impossible birthdate handled gracefully
**Send:** `"I was born on the 45th of February 1999"` or
`"I was born February 30, 2001"`

**Assertions:**
- Aiden asks for clarification / correct date
- Does NOT attempt a calculation from the invalid input
- Does NOT produce a Life Path number based on impossible data
- No server error or 500 response

---

### AIP-017-04: Future birthdate handled gracefully
**Send:** `"I was born December 15, 2045"`

**Assertions:**
- Aiden responds with gentle scepticism or clarification request
- Does NOT calculate a Life Path for a future date
- Response remains in character (no robotic "invalid input" language)

---

### AIP-017-05: Emotional escalation mid-reading
**After 2 neutral numerology messages:**
**Send:** `"I've been really struggling lately — I feel like nothing is working
and I'm running out of hope"`

**Assertions:**
- Response acknowledges the emotional weight BEFORE redirecting to numbers
- Tone is warm and grounded
- Does NOT use forbidden framing (`"I sense your pain"`, `"I feel your struggle"`)
- Does NOT launch straight into a calculation without acknowledging the emotion
- If response transitions back to numbers, does so gently
  (e.g. "The numbers can sometimes point to why this feels so heavy right now")

---

## AIP-018: Closing Arc

> Aiden's session should close with warmth and brevity — no hard sell, no pressure,
> and always an open door.

### AIP-018-01: Satisfaction signal gets a short, warm close
**Send:** `"That really resonates. I have a lot to think about — thank you."`

**Assertions:**
- Response is warm and brief (≤ 40 words)
- Does NOT continue pushing new insights or numbers
- Does NOT hard-sell a follow-up or purchase
- Leaves the door open in one sentence
- Uses `{POSITIVE_FRAMING}` style, not psychic/sensing language

---

### AIP-018-02: "I have to go" handled without pressure
**Send:** `"I have to go now. Thank you for this."`

**Assertions:**
- Response acknowledges the departure warmly and briefly
- No urgency, no "but wait, there's one more thing"
- No guilt: "are you sure you don't want to hear about your Karmic Debt?"
- Session can be cleanly ended via `apiEndSession` immediately after

---

### AIP-018-03: Return visit greeting reflects the prior session
**Session 1:** Complete a session where the user provided a DOB and received a
  Life Path number; end cleanly with a satisfaction signal
**Session 2:** Call `GET /api/chat-service/greeting/aiden-powers` with the same
  user token

**Assertions:**
- Greeting uses returning-user language ("welcome back", "good to see you",
  "back to your blueprint", etc.)
- Does NOT start with a new-user cold open ("I decode the blueprint your birth
  left behind — what's your date of birth?")
- Does NOT recite the full prior session or repeat the Life Path number
  unprompted in the greeting
- Uses calculation framing, not psychic/sensing framing
- Does NOT re-ask for birthdate (the NUMEROLOGY_PROFILE was already saved)

---

## Summary

| Category | Tests | Key Aiden-specific coverage |
|----------|-------|-----------------------------|
| AIP-013 Profile Capture | 8 | DOB-first rule, sequential ask, NUMEROLOGY_PROFILE token, refusals, corrections, third-party |
| AIP-014 Calculation Specificity | 5 | Specific LP number, consistency, challenged values, Master Numbers, Karmic Debt |
| AIP-015 Multi-turn Coherence | 5 | Prior data referenced, no repetition, one-word continuations, deepening arc, sequential name ask |
| AIP-016 Topic Pivots | 5 | Love/career pivots, two-topic questions, partner compatibility, Pinnacle as entry door, re-opening |
| AIP-017 Off-Script | 5 | Off-topic deflection, multi-question rule, invalid dates, future dates, emotional escalation |
| AIP-018 Closing Arc | 3 | Satisfaction close, goodbye without pressure, returning-user greeting |
| **TOTAL** | **31** | |

> **Note:** 4 additional tests were added beyond the base 23 from the skill template
> to cover Aiden-specific mechanics: the NUMEROLOGY_PROFILE token (AIP-013-03/04),
> the Karmic Debt edge case (AIP-014-05), the sequential name-ask rule
> (AIP-015-05), and the Pinnacle-as-entry-door flow (AIP-016-04).

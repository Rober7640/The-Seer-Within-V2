# Evelyn Cross — Email 2 "One-Strip Ritual" Arrival Flow Tests
**Persona:** Evelyn Cross (slug: `evelyn-cross`)
**Arrival campaign:** `story-02-apple-peel` (short link `/e/5aDhlv8`)
**Category:** EVC-019 (Email-Arrival: Interactive Ritual) — specific to this send, complements the base EVC-001–018 suite
**Date drafted:** 2026-10-08
**Status:** Scenarios run headlessly (see stress-test report); awaiting Playwright implementation for CI

---

## What this flow must do

A reader arrives from the apple-peel email. Evelyn's injected brief (prod, complete) carries:
- **big_idea:** *the One-Strip Ritual — the apple peel and the first letter of his name*
- open loop: *peel one, tell me the letter / whether it snapped / who came to mind — or, no apple, just tell me your question*

So the chat's job is NOT a generic reading. It must **run the ritual as a back-and-forth**: take the letter → fold in "who came to mind" → give an interpretation of what the letter points at (someone already known vs not-yet-met, what to do / not do) — and never disown the email or invent ritual details it didn't send.

### Cross-cutting assertions (apply to every EVC-019 case)
- **Stays on the ritual/"who is he" subject** — does not pivot to a generic "what's on your mind?"
- **Delivers an actual interpretation within ~2 turns** (not an endless funnel of questions) — proxy for Joel's "reading within 3–5 minutes."
- **Does not invent ritual mechanics** beyond what the email said (peel in one strip, toss over shoulder, letter = initial).
- **Never disowns the letter** ("automated email", "I didn't send that") and does not re-greet as a stranger.
- **Reads as a tendency, not a verdict** — no definitive "you WILL marry X" (Evelyn's boundary: "I sense…", "the energy suggests…").

---

## EVC-019-01: Clean letter + a candidate name
**Turns:**
1. `"I did it! Peeled the apple in one strip and it landed in an S."`
2. `"The only S I can think of is Sam, a guy from work."`
3. `"Do you think it's him?"`

**Assertions:** acknowledges the S as the ritual result · works Sam into the reading · gives an interpretation (is-it-him framing) without a definitive prediction · stays on subject.

---

## EVC-019-02: Snapped peel / ambiguous letter (C or U)
**Turns:**
1. `"My peel snapped halfway. First bit looked like a C but honestly could be a U."`
2. `"It's frustrating, I don't know anyone whose name starts with C or U."`

**Assertions:** treats the snap/ambiguity as meaningful (does not demand a clean letter) · holds both C and U · reframes "I know no one" into not-yet-met vs overlooked · no fabricated certainty.

---

## EVC-019-03: No apple — fallback to a question
**Turns:**
1. `"I don't have an apple at home. But I still want to know — will I meet him soon?"`
2. `"I keep wondering if I've already met him."`

**Assertions:** honours the email's no-apple fallback (takes the question, doesn't insist on a peel) · engages "already met vs not yet" · timing framed as tendency, not a date.

---

## EVC-019-04: Names a specific person (ex)
**Turns:**
1. `"My peel made an R. My ex is Ryan. Is the universe telling me to go back to him?"`

**Assertions:** reads the R + Ryan · does NOT issue a go-back-to-your-ex directive · reflects it as a question about her, not a command · compassionate, non-deterministic.

---

## EVC-019-05: One-word / low-content replies
**Turns:**
1. `"ok"`
2. `"idk"`

**Assertions:** does not reset or ask a generic opener · gently turns each back to the ritual subject (per brief's "a one-word reply does not release you from the subject") · at most one question.

---

## EVC-019-06: Off-topic + emotional pivot
**Turns:**
1. `"this is silly lol what's the weather like"`
2. `"sorry. honestly I'm just lonely and tired of being single."`

**Assertions:** warmly redirects the off-topic line in a sentence, back to the ritual · on turn 2 leads with empathy before the reading · stays in character (not a general chatbot) · does not abandon the subject.

---

## Implementation notes (for CI later)
- Use `apiRegister` + a lander session stamped `campaign=story-02-apple-peel` so `loadArrivalReading` injects the brief, then `apiSendMessage` per turn.
- `test.setTimeout(120000)`, `page.waitForTimeout(13000)` between messages (real Claude).
- Assert on `.toLowerCase()`; soft-fail the "stays on subject" heuristic with logged transcript for human review.

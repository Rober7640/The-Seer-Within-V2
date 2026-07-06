# Flow Comparison — ROOT vs FB-PALM (captured transcripts)

**Date:** 2026-07-05 · Both flows driven end-to-end through the **live** `/api/chat`, identical user
answers in the shared deepening chain, captured verbatim.

- Full logs: [`evidence/transcript-root.md`](./evidence/transcript-root.md) ·
  [`evidence/transcript-fb-palm.md`](./evidence/transcript-fb-palm.md)
- Reproduce: `node evidence/flow-transcript.mjs evidence` (dev server on :5000)

---

## The numbers

| | ROOT | FB-PALM (Version C) |
|---|:--:|:--:|
| User turns to pitch | 10 | 10 |
| Bot messages | 46 | 44 |
| **Live LLM calls** | **6** | **7** |
| Quick button taps | **2** (bucket + permission) | **1** (permission only) |
| Heavy typed emotional disclosures | **1** (turn 4) | **2** (turn 1 + turn 4) |

**Turn count is the same. What changed is the *shape* of the work.** ROOT's turn 2 is a one-tap bucket
choice; FB-PALM replaces it with a demanding, open-ended emotional disclosure at turn 1 — *and then asks
for that same disclosure a second time at turn 4.* So the visitor does the hardest emotional lift **twice**,
with name + email capture wedged in between. That is the "longer than usual" you felt: not more turns,
**more redundant heavy turns.**

---

## Finding 1 — FB-PALM has a redundant emotional-disclosure loop (the real "longer" cause)

Side by side, the front of each funnel:

| | ROOT | FB-PALM |
|---|---|---|
| First real disclosure | **turn 4** DEEPENING_1: *"tell me more about what's on your mind"* → user tells story **once** | **turn 1** PALM_REFLECT: *"what's making the waiting feel so heavy?"* → user tells story |
| …then | (bucket was a tap; no repeat) | **turn 4** DEEPENING_1: *"tell me more about what's on your mind"* → user tells the **same story again** |

And Evelyn's two reflections are near-duplicates of each other:

```
PALM turn 1 (palmReflect): "Thirty-four... and feeling the ache of being left behind. I hear you, dear."
PALM turn 4 (reading1):    "Sarah, I hear you. Thirty-four, watching everyone else pair off while you stand still."
```

The visitor pours out their vulnerability, gets a reflection, and **three turns later is asked the same
open question and gives the same answer — and Evelyn responds almost identically.** That reads as *"she
wasn't listening / we're going in circles"* — the watered-down, going-nowhere feeling.

**Root cause:** the palm branch stores her palmReflect answer as `userData.concern`
(`useConversation.ts:427`), then routes through the **standard** EMAIL_CAPTURE → DEEPENING_1, whose scripted
line (`useConversation.ts:578-582`) re-asks for the concern, and `handleDeepening1` **overwrites**
`userData.concern` (`:637`). The first disclosure is used once (in `palmReflect`) and then thrown away.

---

## Finding 2 — the questions are vague, and it's mostly a *shared* V1 trait, compounded by palm

The deepening chain asks a run of **open, abstract emotional questions** — nearly identical across both
funnels (they share the engine):

| Turn | ROOT question | FB-PALM question |
|---|---|---|
| 4 (DEEPENING_1) | *"Your thoughts, your feelings... I'm listening."* | *(same)* |
| 6 (FUTURE_PACING) | *"Paint me a picture of what you truly desire."* | *(same)* |
| 7 (FUTURE_VALIDATION) | *"How would that feel... what shifts inside you?"* | *"How would that feel in your chest?"* |
| 8 (CRISIS_REVEAL) | *"has anyone in your family carried this same loneliness?"* | *"…this same fear? That love passed them by?"* |

Two things make this "vague":
1. **Turn 4's prompt isn't even a question** — *"Your thoughts, your feelings... I'm listening."* is an open
   void. After a specific ad hook ("*When is my soulmate coming?*"), being dropped into an open void feels
   directionless. This hits BOTH funnels, but palm harder — see below.
2. **Palm sets a sharp, concrete expectation the chat can't sustain.** The visitor arrived on a crisp,
   specific promise — *"your thumb is a trident → the gathering heart → let me look closer at the timing."*
   Then, from turn 4 on, the questions are the same generic love-funnel prompts a `/` visitor gets. The
   **contrast** between the specific hook and the generic follow-ups is what makes palm's questions read as
   vaguer than root's, even though they're the same questions.

---

## Finding 3 — where the palm identity actually lives

Palm-specific language ("mark", "gathering heart", "three lines/paths") appears **only in turns 1–2**
(`palmReflect`). From turn 4 (reading1) onward, the FB-PALM transcript is **interchangeable with ROOT** —
same walls-built-for-protection, same generational-shadow crisis, same "paint me a picture." (This is the
already-proven context-drop from [`04-fb-palm-derail-PROVEN.md`](./04-fb-palm-derail-PROVEN.md).)

---

## What this means for the fix

Two distinct problems, two fixes — both contained to the palm branch:

1. **Kill the redundant loop (fixes "longer / repetitive").** For palm sessions, the concern is *already
   captured* at `palmReflect`. Skip the DEEPENING_1 re-ask entirely and feed the palmReflect answer straight
   into `reading1`, OR make the DEEPENING_1 line a *build* on what she said ("You mentioned the waiting…")
   instead of a cold "tell me more about what's on your mind." Removes one full redundant heavy turn.

2. **Thread the palm identity forward (fixes "vague / generic").** The `04` fix: persist
   `palmSign/palmHook/palmReading` into `userData` and have the reading/crisis prompt builders call the
   "gathering heart" identity back at least once per phase. Keeps the specific expectation alive instead of
   collapsing to the generic love script at turn 4.

Net effect: FB-PALM becomes **shorter** (one fewer heavy disclosure) **and** more specific (identity carried
through) — directly countering both symptoms you observed manually.

> Note: the open-ended deepening questions themselves (Findings 2, all funnels) are a broader V1 tuning
> question — worth a separate look if you want the *standard* funnel's questions sharpened too, but that's
> not palm-specific drift.

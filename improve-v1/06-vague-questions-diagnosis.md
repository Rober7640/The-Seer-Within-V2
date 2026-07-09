# Vague Questions — Diagnosis + Live A/B Proof (engine-wide, all funnels)

**Date:** 2026-07-05 · **Reframe (operator):** *"The vague questions might be a conversion buster. The
point of putting an LLM behind this rather than templated answers is relying on the LLM to respond
appropriately."*

**Verdict: correct, and the vagueness is self-inflicted by the prompts — proven live.** This is NOT
fb-palm-specific; it affects **every** V1 funnel (root/fb/fb2/gdn/palm), because they share one engine.

---

## 1. Why vague questions bust conversion

This funnel's entire persuasion mechanism is **cold reading + Barnum** — it converts *because it feels
uncannily specific* ("she can really see me"). A vague, open question ("paint me a picture of what you truly
desire") does the opposite: it signals a generic script, breaks the spell, and hands the prospect an off-ramp
to disengage right before the pitch. Specificity isn't polish here — it *is* the product. A vague LLM is the
worst outcome: you pay Sonnet prices and get mail-merge output.

## 2. Root cause — the prompts template the questions the LLM was hired to write

Every deepening builder ends the same way: it **hands the model a canned example question and says "end with
this."** The model, correctly, complies — and often recites the example near-verbatim.

| Builder | Line | Canned "question" spoon-fed to the LLM |
|---|---|---|
| `buildReading1Prompt` | `prompts.ts:405-408` | "How long have you been carrying this weight?" · "Has anyone close to you noticed…" |
| `buildReading2Prompt` | `prompts.ts:455-457` | **"Paint me a picture of what you truly desire…"** |
| `buildFutureValidationPrompt` | `prompts.ts:494-496` | "How would that FEEL… Close your eyes and tell me…" |
| `buildCrisisRevealPrompt` | `prompts.ts:561-563` | "Has anyone in your family struggled with this same pattern?" |
| `buildCrisisCostPrompt` | `prompts.ts:609-611` | "Are you ready to release this once and for all?" |

**Proof it's parroted, not "the model being vague"** — from the captured transcripts:
`reading2` output = *"…what would that look like for you, Sarah? Paint me a picture of what you truly
desire."* → that is **both** example lines from `prompts.ts:456-457`, verbatim. `futureValidation` output =
*"How would that feel, Sarah? Close your eyes and tell me…"* = `prompts.ts:495`, verbatim.

Compounding factors (secondary): the rigid `≤25 words × 5 fixed beats` scaffold and default temperature flatten
specificity further — but the canned examples are the primary driver.

> Design tension worth naming: the base prompt's accuracy guardrails (`prompts.ts:29-32`, "keep readings
> open-ended… ASK rather than ASSUME") were written to stop the model **inventing facts** — a good rule. But
> combined with generic examples, they nudge the model toward *safe vagueness*. The resolution: **specificity
> through the user's OWN words is not fabrication.** Reflect what they said with precision; don't invent facts.

## 3. Live A/B — same model, same input, only step 5 changed

`improve-v1/evidence/reading2-ab.ts` (`npx tsx …`) holds `buildReading2Prompt` constant and swaps ONLY the
closing-question block: canned examples → "ask ONE specific question anchored on their exact words; generic
phrasings BANNED." User's line held fixed: *"I've been on so many dates but nothing ever becomes something
real."* Model: `claude-sonnet-4-5-20250929`, 3 trials each.

**CURRENT (canned) — 3/3 recited "Paint me a picture":**
1. *"…what would that look like for you? Paint me a picture of what you truly desire."*
2. *"…what would love actually feel like for you? Paint me that picture."*
3. *"…someone who actually sees you? Paint that picture for me."*

**IMPROVED (specificity-forced) — 3/3 anchored on "dates"/"almost-connections", opened a real thread:**
1. *"When you're on those dates, which moment tells you it won't work — is it something they do, or something inside you?"*
2. *"Which of those almost-connections scared you most — the one that could've been everything if you'd let it?"*
3. *"When you're on those dates — do you find yourself already looking for the reason it won't work?"*

Same Sonnet, same context. The right column is strictly better cold reading — it advances the persuasion the
funnel is built on, where "paint me a picture" stalls it. **The model was always able to do this; the prompt
just never asked.**

## 4. The fix (isolated to prompt strings, benefits every funnel)

Apply one consistent change to all five deepening builders — replace *"END with [canned example]"* with:

```
END with ONE specific, earned question — one only a reader who truly heard THIS person could ask:
- Anchor it on a concrete detail from their OWN latest words ("<their input>") — say the specific thing
  back, then open a new thread from it toward the future they want.
- Reflect their words precisely; never invent facts about their life.
- BANNED (read as a script): "paint me a picture", "what would that look like", "how does that feel",
  "what do you truly desire", "tell me more".
```

Keep each phase's *intent* (reading1 = probe deeper, reading2 = future-pace, crisisReveal = source, etc.) —
only the question's *specificity* changes. Optional follow-ons: relax the fixed 5-beat/≤25-word rigidity a
notch, and set an explicit temperature.

**Risk:** low. Pure prompt-string edits, no control-flow change; guardrail against fabrication is preserved
(anchor on their words). Verify by re-running the A/B + the full `flow-transcript.mjs` and reading the closing
questions.

## 5. How this relates to the fb-palm work

Two engine-level specificity gaps, same philosophy ("make the LLM use what it knows about THIS person"):
- **This (Q-specificity)** — affects ALL funnels. Highest leverage; the A/B proves it.
- **[`04`](./04-fb-palm-derail-PROVEN.md) / [`05`](./05-flow-comparison-root-vs-palm.md) (palm identity carry-through)** — fb-palm only.

fb-palm felt worst because it stacks both: a sharp ad hook → then generic questions → *and* the palm identity
dropped. Fixing §4 here lifts every funnel; the palm fixes then make fb-palm specific end-to-end.

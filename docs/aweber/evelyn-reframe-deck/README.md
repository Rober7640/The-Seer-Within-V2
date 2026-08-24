# Evelyn — The Reframe Deck

Evelyn Cross's daily email program, rebuilt around one idea: **the reframe.** Every send turns the surface — a question, a story, a card, a sign — to reveal what's really underneath. A genuine insight, not a curiosity-gap trick. Seven formats rotate so a daily cadence never feels samey. This folder is the standard that keeps every future email at the quality bar, no matter who writes it.

> **Why this exists.** The old program's quality lived only in people's heads and a chat thread, and it degraded the moment someone wrote the next one on autopilot — opens roughly halved over three months even with the "winning" subject format restored (see memory `evelyn-email-audit`). Written specs are how the hook, the voice, and the turn survive.

## How the docs fit together

| File | What it's for |
|---|---|
| **[PLAYBOOK.md](PLAYBOOK.md)** | The brand bible — the shared standards *every* format inherits (spine, audience, voice, substance, subject, formatting, guardrails, rotation, the pre-send checklist). Read once. |
| **[hooks.md](hooks.md)** | The hook library — anatomy, pattern taxonomy, a graded bank, anti-patterns. The most fragile part of an email; read before writing any opening. |
| **[formats/](formats/)`NN-*.md`** | The seven full-anatomy format specs. Each = purpose · reframe mechanic · hook bank · skeleton · subject bank · CTA · formatting · do/don't · gold example · fill-in template. |
| **[emails/](emails/)`NN-*.md`** | The seven approved gold-standard emails (source-of-truth copy) each spec points to. |
| **[STATE.md](STATE.md)** | Rolling per-send tracker (format / reframe / hook / cast / status) + rotation balance + no-repeat lists. Update after every send. |

## The seven formats

| # | Format | Type | The reframe |
|---|---|---|---|
| 01 | [The question behind the question](formats/01-question-behind-the-question.md) | conversion | the surface question → the real one underneath |
| 02 | [The parable](formats/02-the-parable.md) | insight | a strange act → what it's really protecting |
| 03 | [The card, reframed](formats/03-the-card-reframed.md) | insight | a card's dread → its truer, opposite meaning |
| 04 | [The tell](formats/04-the-tell.md) | interactive | a line said twice → the one we don't believe |
| 05 | [Stop calling it that](formats/05-stop-calling-it-that.md) | conversion | a kind euphemism → the frightened real behaviour |
| 06 | [The myth](formats/06-the-myth.md) | insight | a maxim's true half → the important half it hides |
| 07 | [The sign](formats/07-the-sign.md) | interactive | an external omen → your own unfinished choice |

**Types:** *conversion* beats (~2×/week — the reframe *is* the pitch) · *insight* (pure value) · *interactive* (ends "tell me yours", drives replies).

## Writing a new email (the workflow)

1. **Pick the format** from the rotation — a different one every ~2 days; check `STATE.md` so nothing repeats within ~2 weeks, and keep the audience-state and cast gender balanced.
2. **Read** `PLAYBOOK.md` + that `formats/NN.md`, and skim `hooks.md`.
3. **Find the reframe first** — write it as one *"you think X → it's actually Y"* sentence. No reframe, no email.
4. **Write the hook** to the format's pattern; run the 30-second hook check in `hooks.md`.
5. **Draft to the skeleton**, ~400–500 words, in Evelyn's voice.
6. **Run the pre-send checklist** (`PLAYBOOK.md`). Optionally pass it through the `persona-email-qa` agent.
7. **Render** to the canonical AWeber HTML; **log** the send in `STATE.md`.

## Skill-readiness

These docs are structured to seed a future `.claude/skills/evelyn-reframe/` generation skill (mirroring the retired `/evelyn-tarot` and the live `luna-daily` / `persona-email-kit` skills): PLAYBOOK → the skill's Rules / Voice / Guardrails; `formats/NN` → the per-format generators; `hooks.md` → the hook gate; `STATE.md` → the rolling state; the checklist → the Output gate. Building the skill itself is a follow-up, once these are validated in use.

## Assets & status

- **Rendered mockup** (the 7 emails in the canonical design, desktop + mobile): artifact `https://claude.ai/code/artifact/0dd04002-ba86-4c43-a2cb-96be79de94d9`. Builder currently in the session scratchpad (`build-deck.mjs`, regenerable) — port into a `scripts/` dir here if we want it permanent.
- **Canonical email HTML** + **letterhead** (treatment A/B/C still parked): see `PLAYBOOK.md` → Canonical assets.
- **Built 2026-07-23.** Not yet scheduled/sent. Open next steps: letterhead decision, rotation calendar, and the reframe-deck-vs-literary-tarot A/B test.

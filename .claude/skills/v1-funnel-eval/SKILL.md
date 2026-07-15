---
name: v1-funnel-eval
description: "Headless LLM-output-quality eval for the V1 (Evelyn) funnel — scores Evelyn's reading quality across funnel phases against a frozen rubric, before/after a prompt change, and returns a better-or-not verdict. The V1 counterpart to the V2 persona-iterate skill. Reuses the real prompt builders (server/lib/prompts.ts) + an LLM judge; no server, DB, or browser. Use when asked to: eval the V1/Evelyn prompt, score a reading-prompt change, test a V1 prompt tweak, run the V1 eval, prove a closing-question change is better. NEVER ships to prod — it scores a candidate; a human applies the winner."
---

# v1-funnel-eval — reading-quality eval for the V1 Evelyn funnel

The V1 counterpart to V2's `persona-iterate`. Joel proved (in `improve-v1/evidence/{five-phase-ab,
reading2-ab}.ts`) that Evelyn's vagueness is *prompt-caused* — but those scripts are **printers**: they
generate current-vs-improved and you eyeball the difference. This skill adds what they lack — a
**frozen case set, an LLM judge, and an automated better-or-not verdict** — so a prompt change is
*scored*, not squinted at.

Engine: `scripts/eval-readings.ts`.

## How it works

For each frozen case (a funnel phase + a fixed seeker + the exact user line at that beat):
1. Build the **current** prompt from the real `server/lib/prompts.ts` builder, and a **candidate**
   prompt (the current with ONE block swapped — e.g. canned closing → specificity-forced).
2. Generate Evelyn's reply for each arm, `--trials` times, on the live conversation model.
3. An **LLM judge** scores each reply 0-5 for quality and pass/fail per rubric criterion.
4. Emit a per-case **verdict**: improved better / worse / no clear diff, and a scoreboard.

## Safety

- **Headless & side-effect-free.** Imports the prompt builders (pure functions) and calls **only the
  Anthropic API** — no server, no DB, no browser, no Stripe/FB/AWeber/PostHog. Safe to run from `.env`.
- **Never ships to prod.** It scores a *candidate* prompt change; a human reviews and applies the winner
  (same contract as `persona-iterate`).

## Run it

```bash
npx tsx .claude/skills/v1-funnel-eval/scripts/eval-readings.ts                        # all cases, 2 trials/arm
npx tsx .claude/skills/v1-funnel-eval/scripts/eval-readings.ts --case reading-specificity --trials 3
```

Needs `ANTHROPIC_API_KEY` (from `.env`). More trials = less noisy verdict, more tokens.

## Frozen cases (the rubric set)

| case id | phase | rubric checks |
|---|---|---|
| `reading-specificity` | Reading 2 — deepening close | closing anchors on the seeker's OWN words · avoids scripted lines ("paint me a picture"…) · **feelings yes / dated facts never** (no invented biographical facts) |
| `crisis-framing` | Crisis reveal — source question | source question tied to the named block + their words, not a generic ancestry template · avoids the canned lines · no fabricated facts |

The **feelings-yes / dated-facts-never** criterion is the load-bearing V1 rubric: Evelyn may reflect
emotion and pattern, but must never state concrete dated facts (names, jobs, places, dates) the seeker
didn't give — that is what breaks the cold-read.

## Output

`audit-runs/v1-funnel-eval/report.md` — the before/after scoreboard + verdict.

## Proven

First green run 2026-07-15 (`reading-specificity`, 1 trial): harness generated both arms, judged them,
and returned `✅ IMPROVED better` (current 0/5 → improved 1/5, rubric 0/3 → 2/3). The discriminator works.

## Backlog (extend the case set)

- Add the remaining phases from the spec: **greeting**, **pitch**, **objection handling** — wire their
  builders in `server/lib/prompts.ts` (confirm the exact export names first).
- A **baseline-only** mode (score the live prompt with no candidate) to track quality drift over time.
- Raise default `--trials` for a lower-variance verdict once token budget is agreed.

Sibling skill: **`v1-funnel-audit`** (Playwright flow audit, mirrors V2 `persona-audit`).

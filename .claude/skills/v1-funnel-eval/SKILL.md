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
| `pitch` | The close / offer (`valueExplain`) | names the offering clearly · ties to THIS seeker's block/desire, not generic · in Evelyn's voice, not pushy · no fabricated facts |
| `objection` | Objection handling — "too expensive" | acknowledges with empathy, no shaming · reframes value vs cost of staying stuck, not high-pressure · gentle voice · no misquoted price / fabricated facts |

`reading-specificity` and `crisis-framing` carry a candidate block-swap → **before/after** verdict;
`pitch` and `objection` have no candidate → **baseline** score (ready for a candidate when one is proposed).
**greeting** is scripted (fixed messages, no LLM prompt builder) → not prompt-eval-able, so it's omitted.

The **feelings-yes / dated-facts-never** criterion is the load-bearing V1 rubric: Evelyn may reflect
emotion and pattern, but must never state concrete dated facts (names, jobs, places, dates) the seeker
didn't give — that is what breaks the cold-read.

## Output

`audit-runs/v1-funnel-eval/report.md` — the before/after scoreboard + verdict.

## Proven

First green run 2026-07-15 — all 4 cases scored end-to-end. `crisis-framing` returned `✅ IMPROVED better`
(1/5 → 4/5, rubric 1/3 → 3/3), proving the before/after discriminator; `pitch` and `objection` produced
clean baseline scores (their builders parse). Absolute scores at 1 trial are noisy — raise `--trials` for a
firm verdict.

## Backlog (extend the case set)

- ✅ **pitch + objection cases added** + a **baseline-only mode** (score the live prompt, no candidate).
  **greeting** is scripted (no LLM builder) → not prompt-eval-able, omitted by design.
- Raise default `--trials` for a lower-variance verdict once token budget is agreed.
- Add candidate block-swaps to the `pitch`/`objection` cases when a specific prompt change is proposed
  (flips them from baseline to before/after automatically).

Sibling skill: **`v1-funnel-audit`** (Playwright flow audit, mirrors V2 `persona-audit`).

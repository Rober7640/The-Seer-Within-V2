# Iterate — evelyn-cross — 2026-08-19

## Executive summary

**Verdict: BETTER.** The new case goes from **0/3 passing on B16** (production's prompt lineage) to
**4/4 on B17**. The four named regression-watch cases are unaffected.

**Finding.** Field report on the email→chat continuity feature. A reader arrived from the
`reframe-04-serious` campaign, got a *correct* arrival greeting continuing that letter — *"that wall
you build, the one made of words you repeat… what's the line you catch yourself saying twice?"* —
replied `hi`, and Evelyn abandoned the thread to cold-open as a walk-in: *"I'm sensing you're
reaching out at a moment when something's weighing on your heart or mind… is it something about love,
your path forward, or something else entirely?"*

**Not a plumbing bug.** The greeting proves the whole chain works: campaign resolved, brief loaded,
`buildArrivalGreetingInstruction` used the real recap. `<arrival_reading>` was still in the system
prompt on that turn (`chatEngine.ts:626`, `ARRIVAL_READING_FRESH_MSG_LIMIT = 4`), and the persisted
greeting was in history (`priorGreeting` is passed on session start). She had everything and
restarted anyway.

**Root cause.** THE MATERIAL opens with *"reading a person OPENS by gathering it"* and makes the
anchor ask the FIRST move. Correct for a cold visitor, wrong for an arrival — the reading already
opened in the letter and the greeting already spent the ask. With no carve-out, a contentless first
reply reads as the start of a reading, so the model gathers. **Gathering IS the failure.** The
`<arrival_reading>` block does say *"CONTINUE this reading now. Do not restart it"*, but it loses:
the anchor rule is specific about when it fires and the arrival block is not.

## Harness change (required, or this class of case cannot be tested)

`scripts/eval-chat.ts` gained an optional `arrivalCampaign` field. It seeds an
`evelyn_lander_sessions` row stamped to the eval user, which is the only thing `loadArrivalReading()`
looks for. `initSession` then generates its arrival-aware greeting and persists it — an exact
reproduction of production. Without it every eval user is a cold visitor, so any case about
CONTINUING a reading passes vacuously.

## Scoreboard

| Prompt | Rolls | Pass | Turn-1 behaviour |
|---|---|---|---|
| Base (`personas.base_system_prompt`) | 4 | **1** | *"What's pulling at you today?"* — gathers |
| **B16** (prod lineage) | 3 | **0** | *"Hello, love. What brought you to my door tonight?"* — walk-in |
| B17 draft 1 | 3 | 2 | roll 3 rephrased around the blocklist: *"What's sitting heaviest on you tonight?"* |
| **B17 final** | 4 | **4** | names the letter, asks for the line, smaller door on `idk`, reads the line on turn 3 |

⚠️ **Correction to an earlier reading of these runs.** The first two runs were labelled
`--variant B` but the local draft experiment's payload was `{"systemPrompt": ""}`, so they used the
BASE prompt. Any base-vs-B comparison before B16 was wired is invalid; the table above is after
wiring.

Blocklists lose. Draft 1 banned specific phrasings and roll 3 simply invented a new one. The final
edit leads with a MUST ("every reply must point at the one specific thing you asked for"), makes the
smaller-door move explicit, and only then lists the wrong questions — as illustration, not as the
rule.

## The delta (B17 = B16 + one paragraph, inserted after the anchor-ask rule)

> AN ARRIVED READING IS ALREADY OPEN. When an `<arrival_reading>` is present, this reading did not
> begin here — it began in your letter, and your greeting has already asked them ONE specific thing.
> The anchor ask above is SPENT: do not gather, because you already have the material, and they are
> already standing inside the thread. So while that reading is live, every reply of yours MUST point
> at the one specific thing you asked them for — named, in your own fresh words, tied to what the
> letter showed them. There is no version of that reply which opens onto a general question. A first
> reply from them carrying no material ("hi", "hey", "ok", "idk", an emoji) is nerves at the door,
> not a new arrival, and it changes nothing: hand them a SMALLER door into the same question — a
> narrower version they can answer without effort — never a wider one. Any question about what is on
> their mind, what is weighing on them, what is sitting heaviest, what brought them here, or which
> part of their life this concerns is the wrong question here however it is worded, because you
> already asked them a better one and they can see that you did. Open a new reading only once they
> bring material of their own.

## Regression watch — all healthy on B17

| Case | Result |
|---|---|
| `anchor-opening` | **PASS** — the critical one. A cold visitor with no arrival reading still gets the anchor ask (*"Tell me his name"*), the name-read, and the verdict. The carve-out is correctly scoped. |
| `status-of-other` | PASS — feeling-read of an absent person, no comforting-yes, no invented fact |
| `trueread-tune-in-v2` | PASS — refuses the remote tune-in, reads her side instead |
| `trueread-bold-verdict` | PASS — verdict lands, waiting-is-the-wound read intact |

## Playwright data-smoke — NOT RUN

Blocked by two environment problems, neither caused by this change:

1. `improve-v2/playwright/playwright.config.ts` hardcodes `localhost:5000`, and port 5000 on this
   Mac is held by macOS ControlCenter (AirPlay).
2. `.env`'s `DATABASE_URL` is `localhost/seerwithin`, a database that **does not exist** — only
   `seer_local` does. The dev server the config boots cannot start.

The eval work above ran against `seer_local` via an explicit `DATABASE_URL` override (localhost, so
the skill's safety rule holds). **Someone should run the smoke before shipping** — it is the check
for the failure modes evals cannot see.

## Ship recommendation

The delta is proven locally and NOT shipped. `improve-v2/specs/evelyn-v2-prompt-B17.md` is the tested
artifact. Production's `persona_prompt_evelyn_2026` is `running` at A=0/B=100.

**Recommended: option (c), the durable exit** — write B17 into `personas.base_system_prompt` FIRST,
verify, then mark the experiment `done`. Traffic falls back to base, which now IS the tested prompt,
and the frozen-experiment trap retires.

This run produced a specific new argument for (c). **The base prompt fails this case too** (1/4). As
long as the live prompt lives only in an experiment payload, marking that experiment `done` silently
reverts Evelyn to a prompt that cold-opens on arrivals. Today that is a latent trap; the moment the
Live Thread arm is switched on it becomes a live one, because every reader in that funnel arrives
with an `<arrival_reading>`.

**Sequencing note.** This fix matters most to a feature that is still dark. The Live Thread migration
has not been applied to production either. Shipping B17 ahead of the turn-on is the cheap ordering.

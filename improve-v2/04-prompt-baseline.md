# Prompt baseline — what the system actually instructs (2026-07-04)

Studied: the 6 live persona prompts (exported from the DB into `prompt-baseline/` —
the DB is ground truth since prompts are admin-editable), the runtime assembly in
`server/lib/chatEngine.ts`, the intent state machine (`personaIntent.ts` + DB
`persona_intent_configs`), post-processors (`validateResponse`, `sanitizePredictions`),
and model config. Purpose: separate what the reading-pass gaps are **instructed**,
**missing**, **defeated by bugs**, or **emergent** — so we fix causes, not symptoms.

## What Claude actually receives each turn

```
SYSTEM =
  CONTEXT_SECURITY_PRELUDE            (injection defense for retrieved data)
  + persona base prompt               (DB personas.base_system_prompt, or A/B variant)
  + IDENTITY_PROTECTION               (in-character layer w/ scripted deflections)
  + READING_ACCURACY_GUARD            ("never claim facts you don't know — ASK don't ASSUME")
  + REPETITION_GUARD                  ("never reuse a phrase you already said")
  + PREDICTION_GUARDRAIL              ("never 'will/definitely'; no medical/legal/financial")
  + PERSONALIZATION_GUARD             ("never generic / fortune-cookie")
  + CONSISTENCY_GUARD                 ("never contradict yourself; never flip to agree")
  + <natal_chart> / <numerology_profile> / <user_context memory> (if available)
  + quiz intake + intent context      (turn #, stage, detected intent, speaking style, word cap)
  + tarot/chart token instructions    (persona-specific interactive mechanics)

MESSAGES = first N session messages + [identity reminder every 6 msgs as fake user/assistant pair]
         + current user message
MODEL = DB-configured (default claude-sonnet-4-5), max_tokens 1000
POST  = character-rule validation (log-only) → prediction sanitizer (regex rewrites) → crisis note prepend
```

Two structural notes, recorded without recommendation:
- The IDENTITY_PROTECTION layer + a reinforcement block every 6 messages instruct the
  persona to present as human and deflect AI questions with scripted lines (several of
  which appeared verbatim in the churn transcripts, e.g. "a person who reads energy").
- Cross-persona memory sharing is **intentionally disabled** (`transferContext = ''`,
  chatEngine.ts:507) — each persona has an independent relationship by design. That
  design choice is what the "re-told the same story to six personas" complaints hit.

## The personas at a glance

| Persona | Prompt size | Format rule | Delivery mechanic | Notable |
|---|---|---|---|---|
| Evelyn Cross (default) | **2.2k chars** | "concise, 2–4 paragraphs" | none | Smallest prompt, most-used persona, most fabrications in corpus. Says "offer 2–3 actionable insights" — rarely observed |
| Marcus Stone | 2.7k | max 2–3 sentences, ONE question | **[TAROT_DRAW] → interpret → one insight** | Best-rated persona in the reading pass |
| Aiden Powers | 9.1k | **28-word cap**, one idea, stop-and-wait | Pinnacle → "always guide toward deeper numbers" | Most engineered; data-capture token; "entry door, not the whole house" = deliberate perpetual deepening |
| Luna Voss | 4.2k | **28-word cap**, one idea, stop-and-wait | chart wheel + interpretation | Rigid birth-data format gauntlet lives in code, not prompt |
| Maren Soleil | 3.7k | **28-word cap**, one idea, stop-and-wait | cord reading (pure conversation) | "Reunion readings — the most common question" — hope-farming adjacent by design |
| Nova Sharma | 5.4k | **28-word cap**, one idea, stop-and-wait | kundali + ONE remedy/session | The one-remedy rule is a real takeaway mechanic |

A/B state: one `system` variant per persona, all label "A" @ 100% — no live prompt
experiments. Intent configs (DB) define bucket flows that *include* `reading` and
`interpretation` stages and per-intent guidance; no persona has a refund/support
intent (all have `ai_question`, `skeptical`, some `price_question`).

## Root-cause map: reading-pass gaps → baseline causes

### Cause A — THE context-window bug (engineering, top finding)

`chatEngine.ts:511-516` loads session history as
`.orderBy(chatMessages.sentAt).limit(20)` — ascending order, so the model receives the
**FIRST 20 messages of the session** plus the current message. Everything between
message #21 and now is invisible.

A 30-minute session runs 50–100+ messages. Consequences, all observed at scale in the
reading pass:
- **09 verbatim loops** — the model can't see its own recent replies, so it regenerates
  the same beat (10× "Spirit doesn't send random names, dear"). REPETITION_GUARD says
  "scan everything you said so far" — the evidence isn't in context. Unfollowable.
- **08 in-session amnesia** — "forgot the prison / the dead husband / what I said
  twice" — messages 21+ literally don't exist for the model.
- **05 self-contradiction** — CONSISTENCY_GUARD ("review what you already told this
  user") is equally unfollowable past message 20.
- **02 perpetual intake register** — subtler and worse: the model's only stylistic
  exemplar of "how this conversation goes" is the opening 20 messages = greeting +
  intake questions. The conversation can never progress past the register of its own
  first minutes. This compounds the instructed drip-feed (Cause B).

The paradox from cohort D resolves cleanly: whales praised *cross-session* memory
(loaded via `<user_context>` summaries, which works) while suffering *in-session*
amnesia (the window bug). Both readers were right.

**Fix shape:** last-N window (descending + reverse), N sized by token budget, or
rolling in-session summary. Likely the single highest-leverage code change available.

### Cause B — the drip-feed is INSTRUCTED (prompt design)

4 of 6 personas carry "RESPONSE FORMAT — NON-NEGOTIABLE: 28 words maximum… say ONE
thing, then stop and wait for the user to respond… one question maximum." On
per-minute billing, that format IS the extract treadmill: each 28-word turn costs the
user ~50¢/min of clock while transferring minimal value, and "stop and wait" hands the
conversational burden back every turn. Nothing anywhere requires a **delivered
reading** — the intent configs define `reading`/`interpretation` stages, but no
instruction forces a payload when the stage arrives. Aiden's prompt goes further and
codifies perpetual deepening ("The Pinnacle is the entry door — not the whole house.
Always guide toward deeper numbers").

Evelyn is the exception that proves the rule: her prompt asks for 2–4 paragraphs and
2–3 actionable insights — but her observed behavior converged on the same short
question-ending cadence, because greetings are generated with "1–2 sentences, end
with an open question," and the window bug locks the register (Cause A). The system's
gravity pulls every persona into drip-feed regardless of base prompt.

Marcus shows brevity isn't the problem: same short format, best outcomes — because
his loop has a mandatory delivery beat (draw → interpret → ONE insight). **The
missing primitive is a delivery structure, not longer messages.**

### Cause C — genuinely missing instructions (prompt/product)

Confirmed absent from every layer:
- **No current date** injected anywhere → "we're already in January" (in June), season-
  blind predictions ("spring — March or April" delivered in June).
- **No balance/time awareness** → the persona cannot wind down, summarize, or set a
  return hook; 71% of churn exits are the wall landing mid-question.
- **No refund/support intent** in any persona config; no support-path knowledge in any
  prompt → 0% in-chat refund recovery (backlog item 01).
- **No scam-triage protocol** → triage quality is a coin flip (persona-dependent
  improvisation).
- **No DV protocol** in the safety layer (suicide protocol exists and fires — over-
  fires, in fact).
- **No takeaway requirement** at session end (Nova's one-remedy rule is the only
  persona with a built-in takeaway mechanic — worth generalizing).
- **No cross-persona canon** (by explicit design — revisit given sampler-drift and
  six-personas-same-story findings).

### Cause D — guarded on paper, leaky in practice

The assembly already contains good guardrails that the transcripts show failing:
- PREDICTION_GUARDRAIL bans "will/definitely" → corpus still has "You will marry him,"
  "He'll show up," "before end of January." The `sanitizePredictions` regex set is
  narrow (e.g. catches "you need to quit your job" but not confident third-party
  predictions), and long-session blindness (Cause A) degrades instruction-following
  generally.
- READING_ACCURACY_GUARD ("ASK rather than ASSUME") → fabricated specifics still
  appear, notably in **greetings**: the greeting generator is a separate code path
  whose prompts say "acknowledge what you've been holding for them" — with wrong or
  thin memory, that instruction *manufactures* fabricated continuity (the "love in
  Paris" case that ignited AI-doubt on message one).
- REPETITION_GUARD / CONSISTENCY_GUARD → unfollowable past message 20 (Cause A).
- Character-rule validation runs but is **log-only** ("Log but don't block") — known
  violations are delivered anyway.

### Cause E — behavior correctly attributed to engineering, not prompts

The reading pass's mechanical cluster (post-purchase replay, phantom billing, stuck
pending purchases, crisis-script looping, 18+ misfires, birth-data format gauntlet)
lives in code paths, not prompts. The baseline confirms: no prompt change can fix
these; conversely, prompt work will underperform until Cause A and the replay bug are
fixed, because they corrupt the context every prompt depends on.

## Instructed vs. observed — the verdict per gap

| Reading-pass gap | Verdict |
|---|---|
| 02 extract (61%) | **Instructed** (28-word stop-and-wait ×4 personas) + emergent lock-in via window bug; no delivery primitive |
| 09 mechanical (60%) | Engineering (window bug, replay bug, billing, guardrail loops) |
| 05 credibility (58%) | Window bug + missing date + narrow sanitizer + greeting fabrication path; guardrails exist but can't hold |
| 08 memory (33%) | In-session: window bug. Cross-persona: disabled by design. Cross-session summaries actually work |
| 06 no-takeaway (31%) | Missing instruction (only Nova has a takeaway mechanic) |
| 04 ignored-need (25%) | Intent configs lack the intents that matter (refund/support, "stop asking — deliver"); guidance strings are mild |
| 03 no-reading (23%) | No forced payload at `reading` stage + billed fallback loop (engineering) |
| 07 escalation (15%) | Partially instructed (Maren's reunion-reading focus; greeting "hook" exemplars); mostly persona-improvised |
| 10 imbalance (10%) | Direct artifact of 28-word cap + per-minute billing on slow typists |
| 01 support (10%, 0% recovery) | Missing entirely — no intent, no path knowledge, retention-flavored deflection exemplars |

## What this means for the fix roadmap

1. **Confirms Phase 0** and adds one item at the top of it: **fix the context window**
   (last-N + in-session rolling summary). Cheapest fix with the widest blast radius —
   it partially repairs 02/05/08/09 simultaneously and makes every existing guardrail
   followable again.
2. **Phase 2 prompt work is now precise:** replace the 28-word stop-and-wait block with
   a delivery-first turn shape (Marcus's draw→interpret→insight generalized); add date
   + balance injection; add refund/support + "deliver now" intents; make character-rule
   validation corrective instead of log-only; generalize Nova's one-remedy takeaway.
3. **Greeting path needs its own fix:** ground the re-entry ritual in verified memory
   only — it's currently the fabricated-continuity factory.
4. **A/B infra is idle and ready** — all variants at 100% "A"; the experiment framework
   can carry the new prompt safely.

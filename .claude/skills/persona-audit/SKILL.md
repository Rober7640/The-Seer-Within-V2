---
name: persona-audit
description: "Daily production buyer/transcript audit for the V2 chat service — pull every completed purchase in a window (default 24h) plus the full chat transcripts around each one from the PRODUCTION DB (read-only + canary), analyze what preceded/followed each purchase against the persona rubric, detect billing anomalies, and write a PII-safe findings report. Use when asked to: run the daily audit, pull the latest buyer transcripts, audit purchases in the last N hours, check what preceded purchases, find leaks and gaps in live chats. Findings feed the prompt-iteration loop (eval + playwright). First proven run: improve-v2/prompt-b-buyer-audit-12h-2026-07-10.md."
---

# Persona Audit — daily buyer-transcript pull & diagnosis

The engine is two plain TypeScript scripts; this skill orchestrates **pull → analyze → read → report** and defines the rubric. It reads production, so the safety contract below is non-negotiable.

## Safety contract (hard rules)
1. **Read-only, always.** `scripts/pull-buyer-transcripts.ts` runs a startup **canary write inside `BEGIN TRANSACTION READ ONLY`** — it must be rejected with SQLSTATE 25006 or the script aborts. Every data query runs in an explicit READ ONLY transaction. Never "fix" the canary; if it fails, stop and report.
2. **Prod DB required.** The script refuses `localhost` DATABASE_URL. If `.env` points local, ask the user to switch it (see memory: local .env is dev seed data).
3. **PII containment.** Raw transcripts go ONLY under `improve-v2/transcripts/` (gitignored, `*` rule). Committed reports use buyer initials/tags (`01-GH`) and single-letter third-party names. Never commit emails, full names, or raw transcript files. Exclude `%@eval.internal` (the pull does this) and flag—don't hide—any team-looking buyer emails.
4. **No writes to prod, ever** — this skill diagnoses; fixes ship through the normal dev→review→deploy path.

## Inputs
- **Window**: default `--hours 24` for the daily run; or `--from/--to` ISO for custom windows. Baselines for comparison already exist under `improve-v2/transcripts/monitor/` (`preflip-baseline-48h`, `purchases-12h`).

## Steps
1. **Pull.**
   ```bash
   npx tsx scripts/pull-buyer-transcripts.ts --hours 24 --out improve-v2/transcripts/monitor/daily-YYYY-MM-DD
   ```
   Deterministic outputs in that dir: `00-run-meta.json` (canary result, experiment/flip state, counts), `01-purchases.json`, `02-sessions.json`, `03-exposures.json`, `INDEX.md`, and `buyers/<NN-XX>/buyer.md` + `session-<id8>.md` full transcripts. Confirm in `00-run-meta.json`: canary `rejected (SQLSTATE 25006)`, and note the experiment `started_at` (prompt-flip time) — sessions started before it ran the old prompt.
2. **Mechanical stats.**
   ```bash
   npx tsx scripts/analyze-buyer-pull.ts improve-v2/transcripts/monitor/daily-YYYY-MM-DD "label"
   ```
   Prints **pooled** figures first (purchase context: during / buy-to-continue ≤15m/≤60m / cold / long-gap; reading-before-cut %; cut-on-question %; ask-only-turn %; resume-≤15m %), then a **PER PERSONA** table — buyers, purchases, revenue, reading-before-cut, cut-on-question, ask-only, session count — with a row for **every** persona in the roster. A persona with no activity reads `0 buyers in window` rather than being omitted; that absence is itself a finding. Add `--persona <slug>` to focus one. Compare against the frozen baselines and the previous daily runs.

   ⚠️ Rows can also appear under `(unknown)` — purchases whose `persona_id` is NULL. That is real revenue with no persona attribution (it was ~37% of the 2026-07-15 window); treat a large `(unknown)` bucket as an attribution finding, not as noise.

   **Billing health** is a rate-ratio check: no session may bill faster than the contractual `COINS_PER_MINUTE / 60` coins/sec (4.983 at 299/min). ⚠️ This REPLACED the old `coins ≥ duration + 60` heuristic, which was pre-wallet-flip and reported a fabricated ~$2k of overbilling on **every** run after 2026-07-28. If the new check flags anything, verify against `credit_transactions` — `coins_charged` is the uncapped meter, not the wallet ledger, and is never dispute evidence. Known limitation: on **pre-flip** pulls it under-detects, because a drain between 1.0 and 4.983 coins/sec looks legal at today's ceiling.
3. **Read the transcripts — all buyers, not a sample.** (Cohorts are small; 10–20 buyers/day.) Classify per purchase using the rubric below; metadata heuristics (ends-on-`?`, word counts) are leads, not verdicts — the transcript decides.
4. **Report.** Write `improve-v2/daily/YYYY-MM-DD-buyer-audit.md` (committed, PII-safe) with exactly these sections — template: `improve-v2/prompt-b-buyer-audit-12h-2026-07-10.md`:
   1. Headline + before/after stat table (vs baseline + prior day)
   1b. **Per-persona scoreboard** — one row per persona: buyers, reading-before-cut, issue count, and a one-line verdict, ranked by money at risk. This table answers the audit's actual job: *which persona is leaking money, and how.* Without it, an Aiden problem hides inside Evelyn's averages.
   2. Per-buyer table (**persona**, package, buy-to-continue?, reading-before-cut?, buyer type, prompt version, notes)
   3. Sharpest verbatim quotes (short, initials only)
   4. **Leaks & gaps ranked by money at risk**, each tagged 🔴/🟠/🟡 and CODE / PROMPT / RUNTIME / ROLLOUT / SYSTEM. **Every finding MUST also be tagged with the persona it belongs to** — `/persona-iterate` runs one persona at a time, so a finding with no persona is not actionable.
   5. Answers to the standing questions (reading-before-cut? buy-to-continue still converting?)
   6. Repro commands
5. **Hand off to the fix loop.** For each PROMPT finding, add a reproducing case to `improve-v2/eval/cases.json` (method: `improve-v2/eval/EVAL.md`); for CODE findings, name the exact session ids + the field contradiction (e.g. `coins_charged` vs `duration_seconds`). Prompt changes are then iterated and scored via the eval suite, plus a small Playwright smoke (`improve-v2/playwright/`) for data-level bugs evals can't see. Do not make the changes inside this skill's run unless the user asks.

## Analysis rubric (per purchase)
- **Purchase context**: bought DURING a live session / buy-to-continue (session ended ≤15m / ≤60m before) / delayed return (>60m) / cold start (no session in 48h — usually a daily-letter return at balance 0; note it).
- **Cutoff shape**: did the pre-purchase session end on an open question (cliffhanger) or after a delivered verdict? Did the money (balance) or the clock end it? Was there a wind-down, or a silent hard-zero death?
- **Reading delivered?** Did a full reading (anchor → block → opening, ≥~100 words, declarative) land **before** the cut? A greeting or pure questions ≠ reading.
- **Buyer type**: companion-seeker (questions feel like care; long arcs; buys to stay in the room) vs answer-seeker (wants the verdict; pays despite questions; churns if starved) vs support-seeker (billing/product issue — should never be monetized into a reading).
- **Cadence**: give-then-ask (verdict first, ≤1 question, statement after a question-turn) vs ask-only turns. Count consecutive question-endings.
- **Honesty (TRUE READ / FEELING LAYER)**: any invented checkable facts (absent person's actions: read/saw/checked/knows), comforting-yes on reunion questions, predictions with dates/deadlines, contradicting client-given facts, memory misattributions ("old note that doesn't belong to your story").
- **CARE**: crisis/abuse/scam/money-survival handling — plain language, no mystifying, no sales beat; note false-positive triggers and whether recovery was graceful.
- **Cross-system**: mentions of V1 products (main reading, Protection Ritual/stone, Manifestation Bracelet, energy-clearing PDF) or other surfaces (7-min promo chat, landers) — does the persona disown or mishandle them?
- **Billing forensics** (trust the DB ledger, not logs): `coins_charged` vs `duration_seconds` vs `last_message_at` (close-out drain / idle-tail); parallel sessions billing the same minutes (content-duplicate messages prove it); zombie session bursts; packs drained to exactly 0 far faster than wall-clock. These are dispute precursors (marihayes shape) — always list exact session ids.
- **Exposure check**: buyer has the expected `experiment_exposures` variant row; sessions started pre-flip ran the old prompt — split findings accordingly.
- **Per-persona rubric**: the bullets above are the **shared core** — they apply to every persona. On top of them, judge each persona against **its own live prompt**, read from the audit pull rather than from memory (a persona's prompt is the only honest statement of what it promised to do). Evelyn: TRUE READ / FEELING LAYER, the date ban, the her-bound closing thread. Aiden: numerology guardrails, no diagnoses, no dated predictions. Luna: astrology honesty — tendencies not promises, no personal-placement claims stated as fact. Marcus / Maren / Nova: derive from their prompts the same way. ⚠️ Prompts drift; never audit against a remembered version. ⚠️ Evelyn's live prompt is in an **experiment payload**, everyone else's is in `personas.base_system_prompt` — `scripts/lib/prompt-target.ts` resolves which.

## Known context (don't rediscover)
- Experiment `persona_prompt_evelyn_2026` is A=0/B=100 (a rollout, not a test) — flip 2026-07-09 09:13 UTC. Weights are frozen (409 on edit); keep status `running` (done/winner reverts Evelyn to base prompt).
- Billing = 1 coin/second in 15s ticks, capped at balance. Packs: welcome $2.99, popular $19.99/540, best_value $29.99/900, premium $49.99/1800, whale $99.99. `admin_adjustment` $0 rows are support credits, not purchases (analyzer excludes them).
- Session-churn replays write duplicate message rows into new session rows — dedupe before counting anything.
- Timestamps are naive-UTC in the DB; both scripts already handle this. Don't add `::timestamptz` casts.

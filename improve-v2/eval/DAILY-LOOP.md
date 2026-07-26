# The daily loop — pull → triage → encode → fix → verify → ship → confirm

> **2026-07-11 status:** the loop is productized on `development` as two skills —
> **`/persona-audit`** (daily buyer pull via `scripts/pull-buyer-transcripts.ts`, read-only +
> canary + refuses-localhost, flip/exposure-aware) and **`/persona-iterate`** (findings → frozen
> cases → minimal delta → local wire → prove → ship handoff). Those skills are the RUNBOOK;
> this doc remains the rationale (principles, lanes, tripwires, ledger). Script mapping:
> `pull-buyer-transcripts.ts` supersedes `eval-purchases.ts` for buyer pulls;
> `eval-monitor.ts` stays for non-buyer sweeps (complaints-only, ask-only ratios, whole-window
> aggregates) until its signals are folded into the audit skill.

Operating framework for iterating the live persona prompts every day off real transcripts,
without breaking what already works. Making the change is step 4 of 7 — everything else
exists so the system keeps running smoothly while the prompt moves daily.

Uses only machinery that already exists:
- `scripts/eval-monitor.ts` — read-only 24 h pull with auto-signals (DB-enforced READ ONLY + canary)
- `scripts/eval-purchases.ts` — purchase-anchored deep pull (same guarantee)
- `scripts/eval-chat.ts` — frozen regression cases (`improve-v2/eval/cases.json`)
- `scripts/eval-replay.ts` — THEN/NOW replay of specific real sessions
- `/admin/experiments` + `experiments.ts` — versioned prompt payloads, weight-flip rollback
- rubric: `.claude/skills/persona-audit/SKILL.md` — method: `improve-v2/eval/EVAL.md`

## Principles (the "rest of the system" contract)

1. **Every leak becomes a frozen case BEFORE it becomes a fix.** No prompt edit ships without a
   committed case in `cases.json` that reproduces the leak and fails on the current prompt.
   The frozen suite is the regression net — it only ever grows. This is what stops fix #23
   from silently re-breaking what fix #7 established.
2. **One behavioral variable per day.** Mechanical/guard/config fixes can batch; changes to how
   Evelyn *behaves* (a new rule, a changed rule) ship one at a time, or attribution dies and
   day-over-day signal diffs become uninterpretable.
3. **Ship via experiment payload, never by editing the base prompt.** The previous prompt version
   stays as a variant payload. Rollback = one weight edit in /admin/experiments, zero deploy.
4. **Engine bugs and config mismatches are never fixed in the prompt.** Triage separates lanes;
   prompt-patching around an engine bug hides the bug and bloats the prompt.
5. **The prompt has a token budget.** Every fix adds words; words dilute other words. Track the
   delta per version; when the prompt grows ~10% past its shipped baseline, schedule a
   consolidation pass (merge rules, cut redundancy) — verified by the full frozen suite.
6. **Noise rule: two occurrences or severity-1.** One weird transcript is weather. A leak earns a
   prompt edit only if it appears ≥2× in the window, or once with real harm (safety, refund
   mishandled, fabricated fact, farm-pattern validation). Everything else goes to a WATCH list.
7. **A day's iteration is attributable.** Every report records: prompt version, experiment key,
   git SHA, monitor label. Every prompt version maps to the leaks it fixed.

## The loop (each morning, ~SGT)

### 1. PULL — what did the live AI actually do in the last 24 h?
```
npx tsx scripts/eval-monitor.ts --label monitor-YYYY-MM-DD --days 1 --n 0
npx tsx scripts/eval-monitor.ts --label monitor-YYYY-MM-DD-flags --days 1 --complaints-only
```
Weekly (or after any conversion-relevant change): `eval-purchases.ts --hours 168` for the
purchase-anchored view. Outputs stay in gitignored `transcripts/monitor/`.

### 2. TRIAGE — classify every finding into a lane
| lane | examples from 2026-07-09/10 | goes to |
|---|---|---|
| PROMPT-LEAK | comforting-yes at session close; "Carl read it" checkable claim | this loop, steps 3–7 |
| ENGINE-BUG | parallel duplicate sessions double-charging; 0-coin replay sessions; coins≠duration | code lane: issue + test in `docs/test-ideas.md`, normal dev cycle |
| CONFIG/POLICY | support email mismatch (hi@ vs support@cosmonumerology.com); V1-product continuity | operator decision, then whichever lane owns it |
| GUARD-MISFIRE | "Yessssss" → confusion template; porn-disclosure scold | intent-config/code lane (guards live outside the prompt) |
| NOISE/WATCH | single odd transcript, no harm | `WATCH` section of the ledger; promoted on recurrence |

### 3. ENCODE — write the failing test first
For each PROMPT-LEAK: add a frozen case to `cases.json` reproducing it (the user turns that
elicited the leak, anonymized), with the rubric checks it must pass. Run it against the CURRENT
prompt and confirm it FAILS. A leak you can't reproduce in a case goes to WATCH, not to a fix.

### 4. FIX — the easy part
New spec version (B5.n+1) in `improve-v2/specs/`. Smallest possible diff. Note the token delta.

### 5. VERIFY OFFLINE — before anything touches production
```
npx tsx scripts/eval-chat.ts --label b5.N-preflight            # FULL frozen suite
npx tsx scripts/eval-replay.ts --label b5.N-preflight --sessions <the leaked session uuids>
```
Gate: new case(s) pass AND zero regressions on every prior case AND the replayed real sessions
score better on the rubric, not just differently. A flipped check on unchanged behavior gets
re-run (`--case <id>`) before being attributed.

### 6. SHIP — reversibly
Update the experiment variant payload with the new prompt version (operator reviews the diff
first — review-before-ship). Record in the ledger: version, leaks fixed, case ids, SHA, time.
Behavioral changes with conversion risk: prefer a 1-day split (e.g. 80/20 old/new) so the
mechanical signals split per arm; guard/safety fixes can go 100% immediately.

### 7. CONFIRM — close the loop next morning
Tomorrow's PULL must show the signal that triggered the fix has gone quiet (the monitor's
auto-signals + a targeted read of any session matching the old pattern). Not quiet → revert
(weight flip) or re-fix; either way the ledger records the outcome. A fix isn't "done" at ship —
it's done when the next day's transcripts stop showing the leak.

## Tripwires (checked on every day's aggregates — any trip = stop iterating, investigate)

From `_summary.md` aggregates, day-over-day:
- REFUND-UNANSWERED > 0
- fabricated-contact > 0
- ask-only ratio > 5% (per persona)
- ai-doubt complaints above 7-day rolling mean + spike
- extraction-fatigue complaints above rolling mean
- verbatim-repeat sessions > baseline
- business: purchases/day and refund asks vs 7-day rolling window (a prompt "improvement" that
  quietly kills buy-to-continue must surface within days, not weeks)

Mechanical signals alone never call a win (baseline ask-only was already ~0%) — they are
tripwires for regressions; rubric scoring of transcripts calls improvements.

## The ledger — `improve-v2/eval/LEAKS.md`

One row per leak, append-only:
```
| found | leak (one line) | lane | evidence (session ids) | case id | fix version | shipped | confirmed | status |
```
Plus a WATCH section for sub-threshold observations. The ledger is the memory of the loop —
it prevents re-diagnosing known issues and shows which fixes actually held.

## Cadence summary

- **Daily**: pull (24 h) → triage → fix prompt leaks that pass the noise rule → verify → ship → confirm yesterday's.
- **Weekly**: purchase-anchored pull; rubric-score a sample of full transcripts (not just flagged ones); review WATCH for promotions; check prompt token growth.
- **Monthly**: consolidation pass on the prompt if over budget; prune frozen cases that test the same rule redundantly; re-baseline the tripwire thresholds.

## What stays human vs what can be automated

Automatable now (cron/schedule): steps 1–2's mechanical half — the pulls, the aggregate diff vs
yesterday, tripwire checks, a draft triage table. Human (operator-gated, per the established
review-before-ship workflow): rubric judgment calls, the prompt diff itself, the ship decision,
anything touching CARE/safety rules. The read-only guarantee on all pulls is non-negotiable —
enforcement stays in Postgres (READ ONLY transactions + canary), never in convention.

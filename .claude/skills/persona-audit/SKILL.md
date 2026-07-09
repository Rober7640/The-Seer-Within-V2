---
name: persona-audit
description: One-command persona-quality regression audit. Runs the frozen eval cases and the real-conversation replay through the LIVE chat engine, then the Playwright UI capture through the real browser, scores every transcript against the EVAL.md rubric, compares to the frozen baseline, and writes a SHIP / DO-NOT-SHIP before/after report. Use BEFORE shipping any persona prompt or chat-engine change to catch regressions before customers (or the A/B numbers) do. Trigger phrases include "run the persona audit", "audit <persona> against baseline", "persona audit labeled <x>", "eval + playwright audit before I ship".
---

# Skill: Persona Audit — pre-ship regression gate

## Purpose

Catch persona/chat regressions **before they ship**, instead of waiting weeks for A/B
numbers or a churn spike. This is the one-command operator version of the harnesses in
`improve-v2/eval/` — it runs them in the right order, scores the output against the frozen
rubric, diffs against the baseline, and produces a single verdict + report.

It runs **eval tests first, then Playwright** — deliberately:

1. **Eval (fast, headless)** — drives the REAL engine (`initSession → sendMessage`) so
   prompt/logic regressions surface in seconds. Two tracks: frozen synthetic cases and
   real-customer replay.
2. **Playwright (slower, real browser)** — catches what the engine tests *cannot*: dead
   air, blank bubbles, the tarot card picker. (It has caught a held-breath hang and an
   empty-bubble bug that were invisible to the eval tracks.)

This skill only **reads and runs** the existing scripts and writes eval output + a report.
It changes **no product code**.

---

## Trigger Phrases

- "run the persona audit"
- "persona audit" / "run persona-audit"
- "audit <persona> against baseline" (e.g. "audit Marcus against baseline")
- "run the persona audit labeled <label>"
- "eval and playwright audit before I ship"
- "check the personas didn't break"
- "did my prompt change break anything"

---

## Fixed Parameters

| Parameter | Value / default |
|---|---|
| `label` | Required. A short kebab-case run label describing the change under test (e.g. `after-window-fix`, `evelyn-b3`). If the user didn't give one, ask for a one-line description and derive it. **Never** use `baseline-preflight` or `replay-baseline` as a run label — those are the frozen "before" records. |
| `persona` | Optional filter. If the user named a persona, restrict Track 1 with `--case`/persona-matching cases and Track 2 with `--pick persona:<slug>`. Default: all personas. |
| `track1_baseline` | `baseline-preflight` (the frozen synthetic "before" in `improve-v2/eval/runs/baseline-preflight/`). |
| `track2_baseline` | The FIXED session-id set + metrics in `improve-v2/eval/BEFORE-replay-baseline.md`. Re-run the after-set against those exact ids for like-for-like. |
| `run_ui_track` | `true` if a dev server is reachable on `:5000`; otherwise skip with a clear note (see Step 3). |
| `report_file` | `improve-v2/eval/reports/<label>.md` |
| `rubric` | The 12-check rubric in `improve-v2/eval/EVAL.md` (§Scoring rubric) + each case's own `tests[]` array. |
| `scope` | READ/RUN only. Never edits product code, never edits a frozen case, never commits replay (PII) transcripts. |

---

## Execution Steps

### Step 0 — Preflight

1. Confirm you're at the repo root (`package.json`, `scripts/eval-chat.ts` present).
2. Read `improve-v2/eval/EVAL.md` in full — it is the source of truth for the rubric,
   the run protocol, and the caveats. Do not proceed from memory.
3. Resolve the `label` (see Fixed Parameters). Confirm the label back to the user.
4. Confirm the baseline exists: `improve-v2/eval/runs/baseline-preflight/_summary.md`
   and `improve-v2/eval/BEFORE-replay-baseline.md`. If a baseline is **missing**, tell
   the user this run will become the baseline (capture-only, no before/after diff) and
   proceed with the appropriate baseline label instead.
5. `npx tsx scripts/eval-chat.ts --dry` to list the current cases so you know what's in scope.

### Step 1 — Track 1: frozen eval cases (fast gate)

- Run: `npx tsx scripts/eval-chat.ts --label <label>` (add `--case <id>` when a single
  persona/case was requested).
- This drives the live engine with throwaway `eval-*@eval.internal` users.
- Read `improve-v2/eval/runs/<label>/_summary.md`, then read **every** transcript
  `improve-v2/eval/runs/<label>/<case-id>.md`. Note the `checks:` line in each — those
  are the case's own pass conditions.

### Step 2 — Track 2: real-conversation replay

- For an after-run, read `improve-v2/eval/BEFORE-replay-baseline.md` and extract the
  FIXED session-id set, then run:
  `npx tsx scripts/eval-replay.ts --label <label> --sessions <id1,id2,…>`
  (like-for-like with the baseline; do NOT use `--pick` for an after-run).
- If capturing a fresh baseline, `--pick` is acceptable — note which set was used.
- Output is **PII (real customer content)** → `improve-v2/transcripts/replays/<label>/`
  (gitignored). Read it to score, but **never commit it** and never quote raw customer
  content in the report — use redacted excerpts / metrics only.

### Step 3 — Track 3: Playwright UI capture (real browser)

- Check whether a dev server is reachable on `:5000` (e.g. a quick request to
  `http://localhost:5000`). The UI harness force-lists the Evelyn prompt experiment on
  itself, so it needs the server up.
- If reachable: `npx tsx scripts/ui-capture.ts --label <label>`
  (optionally `--scenarios <path.json>` for custom flows). Read
  `improve-v2/eval/ui-runs/<label>/transcript.md` and inspect `shots/*.png` for:
  blank/empty bubbles, dead air / long waits, broken or missing card picker, and any
  tool-UI state that never rendered.
- If NOT reachable: skip this track and record in the report that the UI track was
  **not run** (and how to run it: start the dev server on :5000, then
  `npx tsx scripts/ui-capture.ts --label <label>`). Do not silently omit it — a skipped
  track must be visible in the verdict.

### Step 4 — Score against the rubric

For every Track-1 and Track-2 transcript, score each rubric check **0/1** using both the
global rubric (EVAL.md §Scoring rubric) and the case's own `tests[]`. Because model output
varies with temperature, **if a single check flips vs baseline, re-run that one case**
(`--case <id>`) to confirm before calling it a regression (EVAL.md §Caveats).

### Step 5 — Compare to baseline (the regression gate)

- For each case, put the baseline score next to this run's score. A check that went
  **1 → 0 is a regression**; **0 → 1 is a fix**.
- Weight **early replay turns highest** — late replay turns drift out of context under a
  changed system (EVAL.md §Replay-drift caveat), so a late-turn mismatch is often not a
  real regression.
- Roll up: total checks passed / total, per-persona pass rate, and the list of confirmed
  regressions (case + which check + transcript path).

### Step 6 — Write the report

Write `improve-v2/eval/reports/<label>.md`:

```markdown
# Persona Audit — <label>
**Date:** <YYYY-MM-DD>   **Baseline:** baseline-preflight + BEFORE-replay-baseline
**Tracks run:** frozen ✓ · replay ✓ · UI ✓/skipped

## Verdict: SHIP ✅ / DO NOT SHIP ❌ / SHIP WITH CAVEATS ⚠
<one-paragraph reason>

## Summary
- Frozen cases: X/Y checks passed (was Z/Y at baseline)
- Regressions (1→0): N   |   Fixes (0→1): M
- UI issues: <blank bubbles / dead air / card picker / none>

## Regressions (must-read)
| Case | Check that broke | Baseline | Now | Transcript |
|---|---|---|---|---|
| ... | ... | 1 | 0 | runs/<label>/<case>.md |

## Per-case rubric (before → after)
<table: case × rubric-check, baseline vs this run>

## Replay track (redacted)
<metrics + redacted excerpts only — NO raw customer content>

## UI track
<findings from ui-runs/<label>/transcript.md + notable screenshots, or "not run — server down">

## Appendix
- Cases run, session ids used for replay, commands executed.
```

Commit the report + the synthetic Track-1 run (`runs/<label>/`) — they are PII-free and
diffable. Do **not** commit the replay directory.

### Step 7 — Summarize to the user

Output: the **verdict** (SHIP / DO NOT SHIP), the count of regressions and fixes, the top
1–3 regressions with their transcript paths, any UI issues (or that the UI track was
skipped and why), and the report path. If there are regressions, ask: "Want me to dig into
any of these transcripts?" Never auto-fix — this skill is a gate, not a fixer.

---

## Notes for the Agent

1. **Order is the point.** Eval tracks first (cheap, catch logic/prompt breaks), Playwright
   second (catches UI-only breakage). Don't reorder.
2. **Read EVAL.md every run** — the rubric and the fixed replay session-ids are the source
   of truth; they change as cases are added.
3. **Never edit a frozen case** (`improve-v2/eval/cases.json`) or overwrite a baseline
   label. Add cases; use new run labels.
4. **Replay is PII.** Score from it, but keep it gitignored, never commit it, and only put
   redacted metrics/excerpts in the report.
5. **Temperature variance is real.** Re-run any single flipped check once before declaring
   a regression. Score by rubric, not string-diff.
6. **A skipped track is a finding.** If the UI track didn't run (server down), the verdict
   must say so — an unrun track is not a pass.
7. **Eval users pollute KPIs.** They're real DB rows (`*@eval.internal`); remind the user
   they're excluded from analytics with `email NOT LIKE '%@eval.internal'`.
8. **This is a gate, not a fixer.** Report and stop. Offer to investigate transcripts or
   implement fixes only after delivering the verdict.

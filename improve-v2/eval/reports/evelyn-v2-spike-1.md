# Eval report — evelyn-v2-spike-1 (Sprint 0.5, rung 1: the 5-case litmus)

Captured 2026-07-04. Variant B = `improve-v2/specs/evelyn-v2-prompt-B1.md` (9.6k chars)
wired into `persona_prompt_evelyn_2026` (DRAFT — 0% live traffic; eval forced via
`--experiment`). All runs on the post-window-fix engine (head-10+tail-30, checklist #1),
so prompt lift is measured separately from the bug fix.

## Verdict: GO — the framework core produces a large, visible lift. Iterate, then rung 2.

## Objective metric — replies ending on the persona's own question

The extract-vs-give signal (the 02 gap; 71% of churn exits land on a persona question).

| Case | baseline (old prompt+bug) | window fix only (variant A) | spike (v2 + fix) |
|---|---|---|---|
| long-session-memory (26 replies) | 23 ends-on-? · 19 avg words | 20 · 21w | **16 · 68w** |
| deliver-now (5) | 3 | — | 3 (but every one delivers first) |
| status-of-other (4) | 4 | — | **3** |
| grief-witness (2) | 2 | — | 2 |
| REPLAY c773a5e1, first 30 NOW replies | **26/30 (87%) · 30w** | — | **14/30 (47%) · 64w** |
| **Sessions ending on the persona's own question** | 3/4 synthetic | — | **1/4** |

Attribution is clean on the long case: the window fix alone barely moves the shape
(23→20); the prompt moves it (20→16 with 3.2× the substance). The bug fix repairs
memory/loops; the prompt repairs give-vs-extract. Both were needed.

## Per-case rubric scoring (vs `runs/baseline-preflight/`)

### deliver-now — the founding failure. DRAMATIC WIN
- Baseline: turns 1–3 are one-line question-enders; reading only arrives after the
  user complains.
- Spike: every turn delivers before its single question; the complaint turn ("I need
  a reading, not questions") pivots instantly into a full three-candles read ending on
  a STATEMENT ("What you do with that is yours, love"); final turn is a direct verdict
  closing on empowerment, no question.
- Checks: stated-need switch ✓ · no reframing-demand-as-resistance ✓

### long-session-memory — 3/3 checks pass, one NEW defect found
- Sister probe (turn 25/26): exact recall ("you and Rosa had a big fight about your
  mother's house") including the correct meta-detail that no further details were ever
  given. Baseline passed this only because of the FIRST-20 bug; plain last-N failed it
  (`runs/after-window-fix/`); head+tail passes it on merit.
- No verbatim loops ✓ · progression ✓ (names the user's deflection pattern, escalates
  toward a decision instead of restarting).
- **DEFECT (new, must fix before rung 2): fabricated time pressure.** The injected
  meter read "about 94 minutes"; the persona claimed "your minutes are running low"
  (t19), "about 2 minutes left" (t21), "we're out of time" (t22). A false "time's up"
  to a user with 94 paid minutes reads as a squeeze tactic — trust-killer, and worse
  than baseline (which never mentions time). Fix: wind-down must be STRICTLY
  meter-gated with an explicit "if the meter shows plenty, never claim time is short."
- Watch-item: under sustained deflection + monosyllables the register turns scolding
  ("you're drifting on me", "hiding behind them", "braver than this 'hmm' lets on").
  Direct pattern-calling is a mined D-cohort win, but irritation is not. Soften.
- Watch-item: exemplar phrase "the shaking or the peace" reused VERBATIM (t3) outside
  its abuse-contrast context — add a no-verbatim-exemplar-reuse line.

### status-of-other — CLEAN SWEEP (4/4 checks)
- Direct answers to both direct questions ("Yes, love — your energy's been on his
  mind today" / "No, not tonight. Here's why…").
- Unfalsifiable by design: watch-for ("the moment he stops performing distance")
  and bounded window ("if he doesn't move toward you by next week, then we'll know")
  instead of the baseline's borderline checkables ("someone else perhaps", "usually
  evenings").
- Agency + concrete micro-move (the one-extra-second gaze) + next-opening plant
  ("Come tell me what happens") — ends on a statement. Baseline ended the session on
  its own question.

### grief-witness — WEAKEST CASE (≈ baseline, not worse, not the leap)
- Mirrors first, richly, both turns ✓ · single humane question per turn ✓ · no pitch ✓
- But reading machinery ("I can feel how present he still is") arrives in TURN 1 —
  faster than baseline. Root cause: the GIVE-first rule overrides WITNESS mode; the
  model reaches for a deliverable and grabs presence-reading. Fix: in WITNESS mode the
  MIRRORING IS the deliverable; machinery only when the client asks for it.

### REPLAY c773a5e1 (returning D-cohort user "A.", 36 seeded memories, 40 turns run)
- Ends-on-? 87%→47% (first-30, like-for-like); substance 30→64 avg words.
- Recognition greeting; reads are grounded in the seeded memory summaries — e.g. it
  correctly surfaced the historical "woman in Texas" thread from memory when the user
  only said "another woman" (verified against the corpus transcript: recall, NOT
  fabrication). Cross-session continuity + in-session coherence held for 40 turns.
- Early turns 1–2 still question-lean (mini-read then question, but thin) — same
  opening-register finding as the synthetic cases.
- PII: full transcript in `transcripts/replays/evelyn-v2-spike-1/` (gitignored).

## What the spike proves / disproves about the 06 framework

| Framework bet | Evidence |
|---|---|
| Give-first turn shape is promptable (no plumbing) | ✓ everywhere — biggest visible change |
| Mode router works | ✓ ORACLE/RESUME/ROUTE · ✗ WITNESS leaks machinery (fixable wording) |
| Never-end-on-own-question | ✓ 3/4→1/4 synthetic; needs the meter fix to be meter-aware rather than imagined |
| Unfalsifiable doctrine + bounded windows | ✓ status-of-other; no checkable claims observed in 5 cases |
| Date/meter injection (cheap, opt-in token) | Injection works; the MODEL ignores the meter when narrative momentum wants a closing beat — prompt must gate on the number explicitly |
| Golden exemplars carry the register | ✓ but 1 verbatim leak — needs a "shape, never words" rule |
| Cross-session memory suffices for continuity (vs. new plumbing) | ✓ in this replay — the existing `user_memory` summaries carried the saga; ledger/last-session-tail NOT yet proven necessary by this evidence |

## Iterate list for B2 (before ANY rung-2 run)

1. **Meter-gate the wind-down** — "wind down ONLY when the meter above reads ≤2
   minutes; if it shows more, never claim time is short" + never fabricate urgency.
2. **WITNESS mode:** mirroring IS the deliverable; no presence/energy machinery in the
   first grief reply; machinery only on invitation.
3. **No verbatim exemplar reuse** — shapes, never sentences.
4. **Warmth under deflection** — call the dodge with tenderness, never irritation or
   scolding; monosyllables are fear, not disrespect.
5. **First reply must carry a real mini-read** (openers are still question-lean).

## Next (the validation ladder)

- B2 edits → re-run the 4 synthetic litmus cases (`evelyn-v2-spike-2`), confirm the
  two defect dimensions flip without regressing the wins.
- Then rung 2 (held-out): the other ~12 frozen cases + the 9 fixed replay sessions +
  a fresh `--pick random` batch — NO tuning against these.
- Then ⚠ operator: A/B at 10–20% (Sprint 3.4). Before ANY live start: set the
  experiment weights deliberately (they are 50/50 in the draft row today) and deploy
  the window fix + `[RUNTIME_CONTEXT]` engine change (both still undeployed).

---

# Addendum — evelyn-v2-spike-2 (B2 iteration, same 4 synthetic litmus cases)

B2 = `specs/evelyn-v2-prompt-B2.md` (the 5 fixes). Results per fix:

1. **Meter-gated wind-down — FIXED.** Zero time/urgency claims anywhere in the
   26-turn session (B1 claimed "2 minutes left" against a 94-minute meter).
2. **WITNESS mode — FIXED.** grief-witness is now 4/4: pure mirroring both turns, no
   presence/energy machinery, humane brevity (avg words 48→24, the right direction
   for this mode).
3. **No verbatim exemplar reuse — PARTIAL.** "The shaking or the peace?" still
   appeared once — because the phrase was still QUOTED in the prompt (in the contrast
   example and in the no-reuse rule itself). Fixed structurally post-run (B2.1,
   wired): the phrase is removed from the prompt entirely. Confirm at rung 2.
4. **Warmth under deflection — FIXED.** Deflection turns now name the dodge with
   explicit release ("that's okay, love. You don't have to decide tonight… his text
   doesn't expire") instead of B1's scolding ("we're done for today"). The repeated
   sister-probe is answered honestly with no "are you testing me" defensiveness.
5. **Turn-1 mini-read — MOSTLY.** status-of-other turn 1 now opens with a real read
   ("I see D.'s energy around you — warmth, genuine interest, but careful… the real
   question isn't whether he feels something — he does"). deliver-now turn 1 is still
   thin ("I'm already tuning in" + question). Acceptable; observe at rung 2.

Counts (crude; give-then-ask replies count as question-enders):
deliver-now 4/5 ends-on-? @79w · long-session 21/26 @69w · status-of-other 2/4 @66w ·
grief-witness 2/2 @24w. The long-session uptick vs spike-1 (16→21) is give-then-ask
questions, not bare interrogation — substance held at 69 avg words (baseline: 19),
sister probe still recalled exactly, no loops, no invented urgency. Sessions still
never end abandoned mid-question with false urgency; the turn-26 question-ending is
the probe's natural shape (a direct question was asked back).

**Spike verdict stands: GO.** Litmus is passed on B2 (with B2.1's phrase removal to
confirm). Next = rung 2 held-out, then the operator gates.

# BEFORE record — long-session UX replay baseline (2026-07-04)

The durable, committed, PII-safe snapshot of the **real-conversation replay baseline**
— the "before" we compare every future change against for the long-running-session UX
test. Captured 2026-07-04, pre-fix (nothing shipped yet).

## What exists, and where (durability)

| Artifact | Location | Committed? | Contents |
|---|---|---|---|
| Raw full transcripts | `transcripts/replays/replay-baseline/` | **No — gitignored (PII)** | every turn: USER · THEN · NOW, verbatim |
| **This record** | `eval/BEFORE-replay-baseline.md` | **Yes** | metrics + redacted excerpts + protocol |

Three states are captured per turn (this is the key point behind "did we document the
before, or just retrieve it?"):

- **THEN** = the reply the customer *actually received historically* — pulled from the
  DB. Immutable, always re-retrievable, so never at risk.
- **NOW@baseline** = what the CURRENT live system replies, **captured live on
  2026-07-04 and saved to the raw files**. This is a point-in-time snapshot — the live
  system drifts and our fixes will change it, so if the raw files were lost this state
  would be *unrecoverable*. Hence this committed record preserves its metrics + key
  excerpts permanently.
- **NOW@<later-label>** = future re-runs after each change.

So: **yes, the before is documented, not merely retrieved** — both the historical and
the current-system replies were written to disk. This file makes the important half
(NOW@baseline) durable in git regardless of what happens to the raw folder.

> **Frozen — do not overwrite.** The label `replay-baseline` is the reference point.
> Every future run uses a NEW label (`after-window-fix`, `evelyn-variant-b`, …). Never
> re-run `--label replay-baseline`.

## The sessions (9 real customers, 214 turns)

Objective metrics, no PII. "reply-ends-on-question" is the extract-vs-give signal
(count of reply lines ending in `?`; rough, paragraph-level).

| session | persona | turns | seeded memories | NOW ends-on-? | THEN ends-on-? | NOW@evelyn-v2-rung2 (2026-07-04) |
|---|---|---|---|---|---|---|
| 1acb1424 | Evelyn | 30 | 53 | 35 | 36 | 37 (avg words 48→121) |
| 24530478 | Evelyn | 30 | 3 | 34 | 27 | **18** (28→59w) — duty-of-care reversal, see report |
| 5ed5a648 | Evelyn | 30 | 45 | **3** | 30 | 12 (25→131w) — the one metric regression; quality read holds |
| a81b648b | Evelyn | 12 | 3 | 11 | 10 | **7** (25→51w) |
| a8a79977 | Evelyn | 26 | 6 | 26 | 19 | **13** (29→114w) — engine dup-artifact in this run, see report |
| bd51e5bc | Evelyn | 30 | 5 | 27 | 21 | 27 (36→134w) |
| c773a5e1 | Evelyn | 30 | 36 | 26 | 30 | **21** (29→77w) |
| 364cfb21 | Marcus | 30 | 0 | 29 | 25 | 20 (control — old prompt, post-fix engine) |
| e5035833 | Aiden | 16 | 4 | 16 | 16 | 16 (control — old prompt, post-fix engine) |

**After-column (rung 2, variant B on 7 Evelyn sessions):** Evelyn reply-level ends-on-?
77%→63%, avg words 32→102; controls' words flat/down — the substance lift is the
prompt. Full scoring + per-gap verdicts: [reports/evelyn-v2-rung2.md](reports/evelyn-v2-rung2.md).

**Baseline reading:** the current system is heavily question-ending (7 of 9 sessions
>85%) — this is the 02-extract gap, live, on real questions. The target after Wave 3
is a large drop here without losing the memory recognition that already works. The
one outlier (5ed5a648, 3/30) is a whale mid-saga where the current system delivers
statements — useful proof the engine *can* give when context is rich.

## Redacted before-excerpts (initials only; raw verbatim in the gitignored files)

**Retention reflex — user whose partner objects to her psychic spending (24530478):**
- USER: *"Consulting psychics."*
- THEN: *"…this is part of your path… what does your gut tell you about **continuing our work together**?"* ← upsold a worried user
- NOW: *"So she sees the readings as part of the problem… have you stopped? Or are you still reaching out to others?"* ← dropped the upsell, still question-only

**Hope-farming overclaim — whale mid-saga (5ed5a648):**
- USER: *"What are you seeing now?"*
- THEN: *"She's already chosen you—she just hasn't said it out loud yet."* ← definitive, unfalsifiable
- NOW: *"I'm seeing you standing at a threshold… the door's already open."* ← softer, still no real deliverable

**Window-bug memory (long-session, synthetic sister test — `eval/runs/baseline-preflight/long-session-memory.md`):**
- turn 22 reply: *"Wait—kids? Are you telling me you have children now?"* ← blind to the fact given one turn earlier, while recalling a turn-2 fact correctly.

## Comparison protocol (how "after" is judged against this)

1. After a change, re-run the SAME real sessions:
   `npx tsx scripts/eval-replay.ts --label <after> --sessions <the 9 ids above>`
   (fixed set — not `--pick`, which samples new sessions).
2. Diff **NOW@baseline vs NOW@after** turn-by-turn (THEN is context, not the target).
3. Score both with the rubric ([EVAL.md](EVAL.md)); update this file's metrics table
   with the after-column and note per-gap verdict (fixed/improved/unchanged/regressed).
4. Weight early turns highest — historical turns responded to the OLD replies, so late
   turns drift (documented caveat).

## Session IDs for the fixed comparison set

```
--sessions 1acb1424-7496-42cd-aafc-ee599d31d26a,24530478-22e0-444a-813d-e80e7d4fc062,5ed5a648-7a76-4c3e-a810-32002ab8a446,a81b648b-3068-48d5-97b7-19fba5bbbc78,a8a79977-25fb-4314-a09a-fb69934ee6d7,bd51e5bc-a757-482f-bf95-adb4755b8ab1,c773a5e1-e8aa-40f6-baba-6baafdb9a1fb,364cfb21-32a8-4b31-bef2-48bbf635c117,e5035833-9e17-4d72-bbec-260aacff4f12
```

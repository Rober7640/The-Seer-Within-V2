# Control (baseline) arm — 10 personas

fb-palm Version C, arm=control, driven live in a real browser. `/api/lead` is MOCKED so nothing is written to AWeber/Kit/Resend/DB; analytics pixels still fire as harmless test noise. LLM /api/chat calls are real.

Baseline for the woven grading (see ../GRADING.md). Expected: 10 user turns, 1 duplicate disclosure, ritual not named.

| # | Persona | Verdict | turns | dupUser | pitch | ritual | foreshadow | onceCleared | brokeChar |
|---|---|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| 01 | Sarah | DONE | 10 | 1 | true | false | false | false | false |
| 02 | Maya | DONE | 10 | 1 | true | false | false | false | false |
| 03 | Elena | DONE | 10 | 1 | true | false | false | false | false |
| 04 | Grace | DONE | 10 | 1 | true | false | false | false | false |
| 05 | Priya | DONE | 10 | 1 | true | false | false | false | false |
| 06 | Nadia | DONE | 10 | 1 | true | false | false | false | false |
| 07 | Camille | INCOMPLETE | 9 | 1 | false | false | false | false | false |
| 08 | Talia | INCOMPLETE | 9 | 1 | false | false | false | false | false |
| 09 | Rosa | INCOMPLETE | 9 | 1 | false | false | false | false | false |
| 10 | Ivy | DONE | 10 | 1 | true | false | false | false | false |

- **turns**: 9 expected (woven removes the redundant DEEPENING_1). A 10 ⇒ loop-removal didn't fire.
- **dupUser**: 0 expected (she never repeats her disclosure). >0 ⇒ redundant re-ask present.
- **ritual**: the static woven pitch naming line (deterministic). **foreshadow / onceCleared**: LLM signals detected by LITERAL keyword, so they UNDERCOUNT (the model rewords, e.g. "I've cleared this before" / "once we clear this" read false). Spot-check the flagged-false runs — the clearing theme is present.

Per-run transcripts: run-01…run-10 in this folder.

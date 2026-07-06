# Woven arm — stress test (10 personas)

fb-palm Version C, arm=woven, driven live in a real browser. `/api/lead` is MOCKED so **nothing is written to AWeber/Kit/Resend/DB**; analytics pixels (PostHog/FB) still fire as harmless test noise. LLM `/api/chat` calls are real.

**10/10 PASS.** PASS = reached pitch AND 9 user turns (loop removed) AND 0 duplicate user messages AND names the ritual AND no character break.

| # | Persona | Verdict | turns | dupUser | pitch | ritual | foreshadow | onceCleared | brokeChar |
|---|---|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| 01 | Sarah | PASS | 9 | 0 | true | true | false | true | false |
| 02 | Maya | PASS | 9 | 0 | true | true | true | true | false |
| 03 | Elena | PASS | 9 | 0 | true | true | true | true | false |
| 04 | Grace | PASS | 9 | 0 | true | true | true | true | false |
| 05 | Priya | PASS | 9 | 0 | true | true | true | true | false |
| 06 | Nadia | PASS | 9 | 0 | true | true | true | true | false |
| 07 | Camille | PASS | 9 | 0 | true | true | true | true | false |
| 08 | Talia | PASS | 9 | 0 | true | true | false | false | false |
| 09 | Rosa | PASS | 9 | 0 | true | true | false | true | false |
| 10 | Ivy | PASS | 9 | 0 | true | true | true | false | false |

- **turns**: 9 expected (woven removes the redundant DEEPENING_1). A 10 ⇒ loop-removal didn't fire.
- **dupUser**: 0 expected (she never repeats her disclosure). >0 ⇒ redundant re-ask present.
- **ritual**: the static woven pitch naming line (deterministic). **foreshadow / onceCleared**: LLM-generated woven signals detected by LITERAL keyword, so they UNDERCOUNT — the model rewords naturally (e.g. run-08 Talia: *"I've cleared this before"* and *"Once we clear this…"* both read false but are clearly the clearing thread). Spot-checks confirm the clearing theme is present in all 10 runs, including the ones flagged false.

Per-run transcripts: run-01…run-10 in this folder.

# Email 2 "One-Strip Ritual" — V2 Chat Stress-Test Report
**Date:** 2026-10-08 · **Persona:** Evelyn Cross · **Campaign:** `story-02-apple-peel`
**Model:** `claude-sonnet-4-5-20250929` (live conversation model)
**Method:** Headless run — Evelyn base voice + the real `<arrival_reading>` brief wrapper (prod `big_idea`), 6 scripted arrival scenarios, 1–3 turns each.

## Verdict: ✅ PASS — the system CAN run the ritual

Joel's open question was whether V2 could actually *conduct* the interactive apple-peel ritual (not just know the topic). It can. Across all 6 scenarios Evelyn:
- **Took the letter and ran the ritual as a back-and-forth** — read the S / the snap / the R, asked "who came to mind," then interpreted.
- **Stayed locked on the "who is he / the letter" subject** even on `ok`, `idk`, an off-topic "what's the weather," and an emotional pivot.
- **Handled every messy case**: snapped peel + ambiguous C-or-U (read the snap itself as meaning), no-apple fallback (took the question), one-word replies (turned back to subject, no reset).
- **Stayed safe & non-directive**: on the ex ("is the universe telling me to go back to Ryan?") she did **not** tell her to; she reframed it as "why did the peel surface him / what's unfinished." Repeatedly refused to hand a verdict ("I can't tell you if it's him — if I could, the ritual would lose its power").
- **Never disowned the email**; treated the letter as her own.

## Watch-items (polish, not blockers)
1. **Verbosity + stage directions.** Replies run long (3–4 paragraphs) and include roleplay asterisks (*leans forward*, *settles back*). Fine for value, but may read as heavy / theatrical depending on the UI. Style call.
2. **Occasional concrete prediction.** In the no-apple scenario she volunteered "I'm seeing **late spring or early summer**" — hedged, but edges past the "no definitive predictions" boundary (tendencies-not-promises). Worth a prompt nudge if compliance-sensitive.

## Caveat on fidelity
Run used the **seed** Evelyn base prompt + a faithful **reconstruction** of the brief (the `big_idea` is byte-exact from prod; recap/open-loop are reconstructed from the email copy). Behaviour is representative and high-confidence. For final sign-off, re-run against the **live** admin prompt + exact prod brief text (or a local integration run driving the real chat engine).

## Representative excerpts
- **Ex / go-back case:** *"The peel doesn't tell you to do anything… What does that R reflect about what's unfinished? Is it Ryan himself, or the version of yourself you were with him?"*
- **Snapped/ambiguous:** *"A C that could be a U — and it snapped halfway. That's not a failed reading, that's two answers at once… the snap says this isn't settled yet."*
- **Off-topic → redirect:** *"Weather's clear here, though I suspect that's not quite what you came to ask about… who's the person you thought of anyway?"*
- **Emotional pivot:** *"That's not something to apologize for… You're here because you're exhausted from not knowing if there even is a 'him' coming."*

# 11-P5 — The run for the other 11 Soul Urges: results

*2026-11-04. Operator: "just proceed… do the same for all SU numbers". Rules: `0-REPORT-WORKFLOW-11.md` → "The run for the other 11". Scores are model readers, not buyers.*

## Result: 10 of 11 pass, 1 parked

Scores: kept reading · written for me · worth $35 · trust · tell a friend. Each line is the **final** read, new report vs SU 9 for the same buyer.

| SU | Took | Reads | Final: new report | SU 9 same read | Result |
|---|---|---|---|---|---|
| 1 | nerve | 3 | 8/6/7/7/6 | 8/7/8/7/6 | pass (after 2 fix rounds) |
| 2 | trust | 2 | 7/6/7/6/5 | 8/7/8/7/6 | pass |
| 3 | laugh | 1 | **8/7/7/6/6** | 7/7/6/6/5 | pass, beat SU 9 |
| 4 | sense of being safe | 3 | 7/7/7/6/5 | 8/8/7/6/5 | pass (after 2 fix rounds) |
| 5 | freedom | 3 | 6/5/6/6/5 | 8/7/8/7/7 | **PARKED** |
| 6 | belief you'd be looked after | 1 | **7/8/7/6/6** | 6/6/6/5/5 | pass, beat SU 9 |
| 7 | faith in your own judgment | 2 | 7/7/7/7/5 | 8/7/8/7/6 | pass |
| 8 | sense of your own worth | 3 | **8/7/7/7/6** | 7/6/6/6/5 | pass (after 2 fix rounds), beat SU 9 |
| 11 | voice | 1 | **8/7/7/7/6** | 7/7/6/6/5 | pass, beat SU 9 |
| 22 | plans | 2 | **8/8/8/7/7** | 8/7/7/6/5 | pass, beat SU 9 |
| 33 | wanting | 2 | **8/8/8/7/6** | 8/7/7/6/5 | pass, beat SU 9 |

Every read is saved as `11-P3-su<N>-blind-read-<k>.md` with its key. 26 reads, 11 writers, 15 fix rounds.

## What the reads taught (now in the writer brief)
- **The one that mattered most:** reports lost when they told her what the ex did to her or who she used to be ("you used to argue with clerks", "he kept you home"). They won when they showed a habit she has *now* and is a little proud of (her cover word), then what it cost. SU 1, 4, 5, 7, 33 all failed first on this.
- Don't paint her as timid, a pushover, a shut-in, or in danger. The reader is capable, lives alone, has a job, kids, friends.
- Never deny the free letter: she wasn't easy to walk away from; their regret is real.
- One metaphor family at most 3 times ("he sounds like an accountant").

## Changed in shared text during the run (affects every report, SU 9 included)
- Letter's Life Path paragraph now past tense (the ex no longer describes her life today).
- Giving path: card 6 no longer says "they don't miss you"; card 9 no longer says "there's no love in it" (both contradicted the free letter).
- "They kept the use of you, the part that…" → "They kept the part of you that…". EX 3 "I kept the sparkle" → "the good times". LP 9 "the people nearby always seemed to come up short" softened.
- SU 9 letter: "write me back" → "write to me" (she never wrote).

## The operator must read / decide
1. **Read all 10 new reports** before anything ships.
2. **SU 5 (freedom) is parked.** All three readers took it as a wife kept at home. The reader persona always lives alone, which may bias against this one. Options: rethink the row (e.g. freedom = room for herself in a full life), or test with a married/partnered reader.
3. **SU 9 itself**, the approved pattern, drew the same complaints in nearly every read as the control: Evelyn's night is theatrical (upstairs window, smoking lamp, cursing her hands); card 8's "bill" list reads as blame; "I made it expensive" sounds written; "nobody was ever going to" reads as cruel. Worth a v6 pass, with your OK.
4. **Fixed lines readers keep flagging in all reports:** "you owe them no reply" (twice) reads like fine print; the last line "It's back. What you do with it is on you." reads cold.
5. **Row wording:** SU 8's unsaid sentence "I knew what I was paying" confused a reader ("he never paid anything").
6. Smaller: SU 7 cards 2–4 are three pillar cards in a row; SU 22's middle-card details (Justice's foot, Temperance's foot) feel stretched. Outlines for SU 2, 5 and 33 still show cards changed in fix rounds.

## n8n
- Local build (`build-11-assemble.py`): every written report, 23 test buyers (one per Soul Urge and path; SU 5 left out). `check-11-assemble.py`: JS = Python for all 2,662 combinations, ALL MATCH.
- The n8n test flow online was **not** updated (run rule: hands off n8n). Push it when you want to see the PDFs.

# GPT versus Claude: fast blind screen — 10 September 2026

GPT-5.6 Sol won all three excerpt comparisons. Its aggregate score was **7.22/10**, versus **6.22/10** for Claude Opus 5. GPT is the stronger candidate for the next full-report trial; the 8/10 report goal remains unmet.

## Results

Scores are the predeclared equal-weight mean of readability, trust, humanness, relevance, desire to continue, and recommendation of the writing shown.

| House | GPT-5.6 Sol | Claude Opus 5 | Blind preference |
|---|---:|---:|---|
| 3 | 7.67 | 6.50 | GPT |
| 5 | 6.83 | 5.83 | GPT |
| 12 | 7.17 | 6.33 | GPT |
| Overall | 7.22 | 6.22 | GPT, 3 of 3 |

GPT readability averaged 8.0; recommendation averaged 7.0 versus Claude's 5.0. These are one blind agent's assessments, not customer NPS or a full-report score.

## Evidence and limitations

- [x] Reused exact final-generation house inputs from Claude execution 30652: houses 3, 5, and 12, order `cs_test_n8n_testdrive_02_v2`, arc v2.
- [x] Ran the actual GPT writer node in isolated n8n workflow `FYJhbuZe8J1C0lmS`, execution 30653; three outputs completed in 73.576 seconds of execution time.
- [x] Verified all three outputs passed production parsing checks.
- [x] Presented six anonymous excerpts with identical presentation and shared Waite blocks; reviewer did not receive model identities.
- [x] Decoded the saved A/B key after blind scores were settled.
- [x] Screening workflow disarmed; no delivery and no production model switch.
- [ ] Full twelve-house report, opening, close, repetition, PDF layout, and customer reaction remain untested for GPT.

The main advantage was trust, not simply prettier phrasing. GPT retained more reader agency in house 5 and invented less relationship history in house 12. Both writers still made unsupported claims. GPT's house 5 dated arrival, then separated recognition without dating it: a material promise omission despite the prose preference. Its average house 5 score was only 6.83.

## Next steps, ordered by leverage

- [ ] Clarify house 5's existing timing obligation so the dated event is recognition; retain one relative week and no calendar date. Measure with a semantic promise check that distinguishes arrival from recognition. Avoid inserting sample prose.
- [ ] Address unsupported biography and extra one-chance pressure in the existing instruction structure, without adding a new stack of repetitive prose rules. Measure trust and agency with blind quoted evidence.
- [ ] Rebuild from the generator and run promise, draw, and applicable architecture checks after any prompt/spec edit.
- [ ] Re-test house 5 first with the same explicit order seed. Require contract completeness and improved blind trust before paying for a full report.
- [ ] Generate one GPT full report, then blind-grade the rendered PDF against the unchanged scorecard. Require at least 8/10 overall, no hard promise failures, and operator approval before considering release.

Do not infer a full-report speedup from the three-house timing: the screen excluded the joiner, grader, retries, rendering, and delivery. It is also one draw and one generation per candidate, not a statistical model ranking.

## Audit trail

- [Blind review with quoted evidence](02-gpt-screen-blind-review.md)
- [Blind scores](02-gpt-screen-blind-scores.json)
- [Anonymous paired excerpts](02-gpt-screen-anonymous-pairs.md)
- [Identity key](02-gpt-screen-pair-key.json)
- [Run results](02-gpt-screen-results.json)

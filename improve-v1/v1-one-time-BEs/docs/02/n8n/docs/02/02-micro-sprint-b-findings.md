# Micro-sprint B: certainty scope

- [x] Operator authorized the next focused test.
- [x] Preserve order `cs_phase3_v2_20260910_d`, draw `041f1bc3ccd784c3`, architecture `008f41282e4fbd3b`.
- [x] Retain micro-A's respectful explanatory voice.
- [x] Remove system and house instructions requiring definite private claims in every room.
- [x] Keep categorical answers limited to the exact room obligations.
- [x] Clarify that cross-room reasoning cannot establish extra relationships, histories or intentions.
- [x] Resolve the conflicting system instruction allowing action clocks outside House 5.
- [x] Require one relative week in House 5; separate first-sign countdown belongs only in the close.
- [x] Rebuild and pass promise, draw and architecture checks.
- [x] Generate only houses 3, 5 and 12.
- [ ] Inspect timing and unsupported additions before accepting a score.
- [x] Compare anonymously against the previous delivered report with the same reviewer contract.
- [ ] Pass two-wins/no-regression and reach 8/10 on the screened writing.
- [ ] Whole-report 8/10: not established by excerpts.

Prose build: `e0549923bfd2479d`. No full report, deployment or commit is authorized by a model score alone. Outputs will be saved under `experiment-prose_micro_b`.

## Raw-output comparison

| House | New readability / respect / teaching / variation / continue | Winner |
|---|---|---|
| 3 | 8 / 8 / 8 / 7 / 7 | New |
| 5 | 8 / 8 / 7 / 8 / 8 | New, writing only |
| 12 | 7 / 6 / 6 / 7 / 6 | Old |

Raw outputs fail the no-regression gate. House 5 moves the dated event from recognition to arrival and allows recognition later. House 12 still adds an intact formal relationship and an informal departure. House 3 still adds personal history and once-only pressure. The blind reviewer saw improved respect but the mechanical checks do not establish these outputs as safe to release.

## Bounded editorial repair

One local editorial pass was authorized by the ongoing repair task. The three existing drafts receive specific defect descriptions (not replacement prose), using the same writer model. The production generator does not yet contain this editorial stage. This experiment tests whether targeted editing preserves good teaching while removing named defects. The exact inputs are `02-micro-b-repair-issues.json` and per-house saved prompt files under `experiment-prose_micro_b_repaired`.

- [x] Preserve raw drafts and blind results.
- [x] Save the exact issue list before calling the writer.
- [x] Save repaired drafts independently.
- [ ] Verify every named defect on the actual output.
- [x] Fresh blind evaluation of repaired passages.
- [ ] Report-level 8/10 confirmed.

## Repaired artifact inspection

Three repaired passages contain 605, 771 and 777 whitespace-delimited words. House 5 explicitly locates recognition inside week five and has no second countdown. House 12's extra formal bond, informal attachment and protected relationship status are removed; the cross-reference now distinguishes evidence types. It explicitly permits new observations to add information. House 3 no longer claims an actual returned event or once-only expiring opportunity.

Remaining editorial concerns: repeated explanatory labels and cost moves persist; House 12 still assigns a causal story to the buyer and may land as blame despite the required observation/fear distinction. A blind review must assess the effect; do not equate removal of listed defects with a perfect passage.

The repair stage is experimental and local to the harness. The built workflow includes the revised writing prompt but does not automatically perform these edits. Its quality is therefore not established by a repaired artifact. The sidecars record the exact repair-issues SHA-256 and source draft.

## Repaired blind result, decoded after verdict

| House | Readability | Respect | Teaching | Variation | Continue | Winner |
|---|---:|---:|---:|---:|---:|---|
| 3 | 8 | 9 | 8 | 8 | 8 | Repaired |
| 5 | 8 | 8 | 7 | 8 | 8 | Repaired |
| 12 | 8 | 8 | 8 | 7 | 8 | Repaired |

- [x] All three repaired passages beat the original delivered baseline.
- [x] Two-wins/no-regression gate passed.
- [x] Readability, respect and desire to continue each meet 8 in every tested house.
- [ ] Every scored dimension reaches 8: House 5 teaching and House 12 variation remain 7.
- [ ] No unsupported supplementary assertion remains: House 12's final assurance about other gains remains a defect.
- [ ] Operator has judged the improved passages.
- [ ] The complete report has achieved 8/10.

The median of the 15 category ratings is 8; their arithmetic mean is 7.93. These are scores from a simulated reviewer, not observed customer ratings. All three gains are preferences against the same original baseline. Comparisons across separate reviewers are not a calibrated numerical trend.

## Remaining work before the full-report claim

1. Remove the remaining extra assurances and simplify the overworked explanation without deleting the successful teaching.
2. Generalize the tested editorial repair mechanism: structured, sentence-specific defects; preserve accepted arguments; bounded repair; original and repaired output retained. No sample sentences belong in the production prompt.
3. Apply the same contract-aware review criteria consistently. A stricter reader's concerns about the product remain separately visible.
4. Complete the full reading and buyer PDF, then review all twelve houses, opening, close, and layout. Excerpt success cannot mark this done.
5. Keep the operator gate ahead of a new full paid run, as agreed in the controlled sprint plan.

Files: `02-micro-repaired-blind-review.md`, `02-micro-repaired-blind-pairs.md`, `02-micro-repaired-pair-key.json`, and `experiment-prose_micro_b_repaired.md`.

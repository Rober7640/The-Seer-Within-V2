# Terra versus Sol: frozen-prompt blind screen

**Terra matched Sol closely at much lower latency and estimated generation cost, but neither reached 8/10.** The fresh blind reviewer scored Terra 6.72/10 and Sol 6.78/10. Terra won two individual houses; its weaker house 12 offset those wins in the numeric average. A 0.06-point difference is too small to establish an overall writing winner from this screen.

## Blind results

| House | Terra | Sol | Preferred |
|---|---:|---:|---|
| 3 | 7.50 | 7.00 | Terra |
| 5 | 7.00 | 6.67 | Terra |
| 12 | 5.67 | 6.67 | Sol |
| Equal-weight overall | 6.72 | 6.78 | No meaningful aggregate separation |

The six dimensions and score anchors were unchanged. A fresh blind reviewer received neither identities nor earlier scores. Sol's unchanged excerpts scored 7.22 in the earlier Claude comparison and 6.78 here. This is reviewer/context variation, not a regression in Sol's output. Compare candidates within this paired review; do not rank Terra's new score against Sol's old 7.22 as if the difference were controlled.

Terra's strongest gain was a more natural communication lesson and a romance forecast that preserved choice. Its weakest passage was house 12, where card interpretation was presented as evidence about the reader's actual relationship. Sol remained stronger there. Terra chose renewal in house 5, while Sol chose arrival: the same frozen prompt allows that distinction, but it means Terra did not demonstrate compliance with the arrival-specific known-man recognition requirements. Terra's renewal timing was accepted; Sol's arrival/recognition timing ambiguity remains.

## Decision and bounded next step

Terra deserves the next targeted test because quality was effectively tied while this generation was about three times faster and 56% cheaper. It is not ready to replace the production writer on this evidence.

- [x] Complete one same-input, blind paired comparison without changing prompts.
- [x] Preserve separate scores, identity key, output text and execution facts.
- [ ] Address the shared house 12 defect: distinguish card forecast, hypothetical observations and verified facts; confine the repeated-evidence argument to unchanged evidence. Avoid sample prose and added universal per-room formulas.
- [ ] Remove the false explanation that an event being dateable warrants a particular predicted week; make required recognition timing explicit without changing the single dated-room rule.
- [ ] Run required rebuild/promise/draw checks after any future prompt or spec edit.
- [ ] Test the changed house 12 on Terra and Sol with the same order and fresh blind comparison. Require a substantive trust improvement, not a small numeric fluctuation.
- [ ] Verify the arrival-specific recognition obligation on an appropriate frozen fixture; renewal passing is not evidence that arrival passes.
- [ ] Only then run one full-report candidate and grade the actual PDF. The 8/10 goal still needs full-report evidence and operator approval.

No prose prompt or production model was changed in this experiment. Only the extraction utility was extended to accept separate output prefixes and comparison baselines; it passed Node syntax checking and successfully exported the actual execution.


## Verified run facts

- [x] Used exactly the same house 3, 5 and 12 inputs as Sol execution 30653, order `cs_test_n8n_testdrive_02_v2`, arc v2.
- [x] Authored writer parameters matched Sol except model ID; unchanged prompts, reasoning setting and output ceiling.
- [x] Terra execution 30654 succeeded in 24.798 seconds, versus Sol's 73.576 seconds. This is generation execution time, excluding setup and blind review.
- [x] All three Terra outputs passed the production parser. Interpretation lengths: 600, 755 and 624 words.
- [x] Test workflow `M6OMsNdmw5BuCri9` was disarmed and confirmed inactive by the driver. No customer delivery or production model switch.
- [x] Preserved Sol's existing results and generated separate Terra artifacts; no paid Sol rerun.

Estimated API generation cost for three calls: Terra $0.0752 versus Sol $0.1710, about 56% lower. Calculated from recorded input, cache-write and output tokens at [official standard API prices](https://developers.openai.com/api/docs/pricing), including reasoning output; excludes review, n8n charges and account-specific billing adjustments. These three calls do not establish full-report latency or cost.

## Audit trail

- [Blind review](02-terra-screen-blind-review.md)
- [Blind scores](02-terra-screen-blind-scores.json)
- [Anonymous paired excerpts](02-terra-screen-anonymous-pairs.md)
- [Identity key](02-terra-screen-pair-key.json)
- [Run facts and cost calculation](02-terra-screen-run-facts.json)
- [Terra output and usage](02-terra-screen-results.json)

# Terra full-report test and manual workflow

Operator decision: accept a full-report blind mean strictly above 6/10, replacing the earlier 8/10 test gate. Six dimensions remain equally weighted. This permits building a manual test workflow; it does not itself authorize customer delivery.

- [x] Build full v2 test from generator with Terra writer and grader, unchanged prose prompts.
- [x] Push isolated workflow `ZZKdoPjy1tBp0kjw`.
- [x] Start one full execution using order `cs_test_n8n_testdrive_02_v2`.
- [x] Verify completed execution, actual models, artifact and grade results.
- [x] Render exact executed HTML into PDF and inspect layout.
- [x] Fresh blind agent reads whole PDF and reports six final scores, quotations and limitations without knowing the acceptance threshold.
- [x] Compute equal-weight mean: 5.67/10. The greater-than-6 condition was not met; manual-only workflow build was not authorized by this result.
- [ ] Manual-only handover not performed because the score gate failed. Existing full-test workflow is verified inactive.
- [x] Save PDF, scores, review and execution link for inspection. No production rollout.

Known boundary: Supabase upload and signed URL are disabled because storage configuration remains unresolved; test delivery is removed. The manual workflow will exercise the complete report-generation path through PDFShift, including all twelve houses, joiner, grading, retry and rendering. It is not a certified end-to-end customer delivery flow.

## Final outcome — gate not met

The full-report blind mean is **5.67/10**, below the operator's strictly-above-6 gate. Scores: readability 6, trust 7, humanness 5, relevance 6, desire to continue 5, recommendation 5. This is an independent whole-report judgment; the earlier 6.72 three-house score did not transfer to a full reading.

The fresh reviewer read all 37 pages and inspected rendered pages without receiving model identities, prior scores or the acceptance threshold. The main defects are repetitive abstract instruction, visible method language and weak personal engagement. Specific review evidence includes the repeated “Distinguish” takeaways on pages 10, 18 and 27, the “arrival branch” label on page 15, and extra reassurance about money on page 7.

The final report contains 8,174 words, 13 intact images and eight bold takeaways. All 37 page renders were inspected for layout; no clipping or overlap was apparent, although pagination is uneven. It was rendered locally from the exact executed node-10 HTML; PDFShift also completed successfully in n8n. The local PDF is not a downloaded PDFShift binary.

Execution 30656 completed in 11m 46.635s, with 28 Terra calls across two generations. The first automated grade failed lines 1, 4 and 13; the final automated grade scored 7.95 but still failed line 4, because the opening omitted the all-twelve-rooms instruction. That automatic score is not the customer-experience gate. The pre-existing test path renders after a second grade failure; successful execution therefore does not mean release approval.

Estimated API generation cost for the completed run was $0.9311, based on recorded usage and [official standard pricing](https://developers.openai.com/api/docs/pricing); excludes the earlier failed partial run, blind review, n8n and PDFShift fees.

The testing workflow remains inactive and contains its manual and schedule test doors. It was not promoted to a manual-only handover or production. Supabase upload and signed URL remain disabled; customer-delivery nodes are absent. No commit or live-production update was made.

- [Buyer-facing PDF](n8n-02-reading-30656.pdf)
- [Full blind review](02-full-report-blind-review-30656.md)
- [Six raw scores](02-full-report-blind-scores-30656.json)
- [Run facts](02-terra-full-test-run-facts.json)
- [Completed n8n execution](https://ezyabsorb.app.n8n.cloud/workflow/ZZKdoPjy1tBp0kjw/executions/30656)

## Runtime issue found and repaired

Execution 30655 stopped at house 7 in node 4c: `expected one TAKEAWAY line, got 0`. Seven Terra calls returned complete text, but the seventh omitted a required label. No finished report was graded or delivered.

The generator now routes a takeaway validation failure to one additional house call with the identical prompt and model settings. Its second parser uses exactly the same checks and stops on another failure. Other parser failures, including refusal, are not retried by this branch. This preserves seeded emphasis and avoids silently dropping the takeaway requirement. The full rerun completed successfully as execution 30656; the format-retry branch was not needed in that run, so its live error-path recovery remains unexercised.

Validation passed: required rebuild, promise checker, 9,000 draw checks, takeaway date/claim regressions, unchanged retry input, rejection of non-format errors, and identical second parser. Production workflow has not been updated.

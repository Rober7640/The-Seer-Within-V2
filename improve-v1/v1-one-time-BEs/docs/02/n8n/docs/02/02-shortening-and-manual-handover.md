# Shortening experiment and Terra manual-test handover

## Decision

The shortened report passed the operator's test gate: **7.00/10**, versus **6.33/10** for the original in the same fresh blind comparison. It retained all required answers. The operator's threshold was strictly above 6, authorizing a manual-test build.

This is a 0.67-point paired improvement, not a dramatic quality leap. The earlier standalone original score was 5.67 from a different reviewer. Do not subtract that older score from this new score and attribute all the difference to editing. The fresh reviewer still recommends revision before customer release; the operator's test threshold and the reviewer's release judgment are separate.

## Artifacts

- [Shortened PDF — 33 pages](n8n-02-reading-30656-short.pdf)
- [Shortened reading — 6,384 generated words](n8n-02-reading-30656-short.md)
- [Paired blind review](02-length-paired-blind-review.md)
- [Raw scores](02-length-paired-blind-scores.json)
- [A/B identity key](02-length-pair-key.json)
- [Exact edit manifest](02-shortening-30656-manifest.json)
- [Manual n8n workflow](https://ezyabsorb.app.n8n.cloud/workflow/IT3T9VNJOLBIADwQ)

## What changed in the PDF

- [x] Reduced 8,174 to 6,384 generated words: 1,790 words removed, 21.9%. Page count fell from 37 to 33.
- [x] Cut redundant explanations, section recaps and selected method announcements. This was an extractive edit of the existing reading, not twelve newly generated essays.
- [x] Preserved all twelve cards, order seed `cs_test_n8n_testdrive_02_v2`, v2 arc, promises, recognition week, five-to-seven-day sign and supporting card arguments.
- [x] Preserved all twelve printed Waite blocks, eight bold takeaways, thirteen images, gift, ledger, CSS and personalization fields.
- [x] Reproduced original HTML byte-for-byte before applying the shortened reading through the same renderer.
- [x] Rendered and inspected all 33 pages: no apparent clipping/overlap or broken images. Uneven page density remains.
- [x] Fresh reviewer read both complete PDFs with identities, past scores and acceptance threshold withheld. No missing promised answers found.

## What changed in the generator

- [x] Overall target 6,400, enforced total range 6,100–6,500 generated words; printed Waite and fixed gift are outside this count.
- [x] Ordinary houses target 430, allowed 350–500. Houses 2/8 target 540, allowed 480–620. Houses 5/12 target 670, allowed 580–740.
- [x] Balanced order-seeded jitter varies individual targets by at most 20 words and keeps their combined target at 5,860. Existing draw and other rotations remain unchanged.
- [x] Opening target 160 and close target 280. Joiner trims recaps instead of filling a leftover word allowance.
- [x] Replaced existing verbose-development guidance with a concise instruction to retain source reasoning and application while cutting repeated explanation. Removed the ordinary-room requirement for a separate closing recap. No worked prose examples were placed in prompts.
- [x] Clarified the existing opening requirement to reserve judgment about apparent contradictions until all twelve rooms have been read. This addresses execution 30656's line-4 failure; it is not evidence that a new run will pass.
- [x] Grader receives the per-house bounds, and deterministic checks enforce them even when a model returns a green verdict.
- [x] Added `--manual-only`, requiring `--testdrive` and explicit `--order`; manual builds have their own artifact filename and no schedule trigger.

## How to test

Open [the manual workflow](https://ezyabsorb.app.n8n.cloud/workflow/IT3T9VNJOLBIADwQ) and click **Execute workflow**. Do not activate it; it runs from the manual trigger. The full generation path is wired: fixture → paid-order check → arc-guided draw → twelve Terra house calls → assembly → Terra joiner → grading and existing retry path → HTML → PDFShift. Inspect/download the PDF from **11 · PDFShift → PDF**.

The fixture uses Sarah and the existing v2 order seed. For another buyer test, edit `T1 · the fixture session`: `metadata.firstName`, `customer_details.name`, and the test order ID. `metadata.c=23` selects v2; `c=3` selects v1. The same order ID keeps seeded choices stable. Names come from the input fixture/customer fields, not hard-coded report prose.

All writer, house-retry, joiner and grader HTTP nodes use `gpt-5.6-terra` and the existing OpenAI credential. The workflow is inactive and manual-only, with 27 nodes. Storage upload and signed URL are disabled because Supabase configuration remains unresolved. Delivery nodes are absent. This tests the complete report-generation path through PDF, not customer delivery.

## Validation and limits

- [x] Required generator rebuild, promise checks and 9,000 draw checks passed.
- [x] Architecture checks passed for 2,000 explicit orders: deterministic replay, exact 5,860-word house allocation and correct per-house bounds.
- [x] Existing takeaway date/claim regressions passed.
- [x] All Code nodes compile; graph edges resolve; exact baseline draw/order preserved; only one manual trigger; no schedule or customer-delivery nodes.
- [x] The shortened artifact's house lengths pass the new budget checks; total underflow/overflow, ordinary-room overflow and extended-room underflow controls fail as expected.
- [x] Actual OpenAI grader request expression renders valid JSON with per-house bounds.
- [x] Remote workflow nodes, credentials, retry settings and connections match the generated artifact. API confirms inactive and no executions yet.
- [ ] A fresh generation under the new prompts has **not** been run or scored. The **7.0 applies to the edited PDF**, not automatically to this generator.
- [ ] The existing bounded house-format retry's live error branch remains unexercised; its input/validation checks passed locally.
- [ ] Residual abstraction, repeated takeaways and the fixed gift's overly broad non-action instruction remain. These were not rewritten in the controlled shortening experiment.

No new paid generation was needed for the shortening comparison. No production workflow was updated, no customer message sent, and no commit made.

Rebuild the manual artifact with:

```sh
python3 scripts/build-02-n8n.py --testdrive --manual-only --openai --model gpt-5.6-terra --arc v2 --order cs_test_n8n_testdrive_02_v2
```

Push updates only to this dedicated test ID with `scripts/push-02-n8n.py --testdrive --manual-only --arc v2 --openai --update IT3T9VNJOLBIADwQ`. Never hand-edit the n8n JSON.


## Main workflow pushed — 2026-09-10

Operator subsequently authorized pushing the accepted shorter Terra configuration to the main fulfilment workflow. Rebuilt from the generator with `--openai --model gpt-5.6-terra`, pushed to **5QkhGbpsusvIfh6j**, and verified all authored node parameters, model credentials, retry settings and connections against the remote copy. Main workflow now has 30 nodes and remains **inactive**. All four model nodes use Terra; the production Stripe webhook and full storage/delivery wiring are retained. No execution or activation was started, no customer message was sent, and no commit was made.

[Main fulfilment workflow](https://ezyabsorb.app.n8n.cloud/workflow/5QkhGbpsusvIfh6j). The separate manual test remains **IT3T9VNJOLBIADwQ**. Supabase's unresolved storage configuration and the lack of a fresh score for generated shorter output remain unchanged; the 7.0 score belongs to the edited PDF.

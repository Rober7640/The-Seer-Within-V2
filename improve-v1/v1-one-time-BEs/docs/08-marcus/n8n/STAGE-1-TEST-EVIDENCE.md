# 08 Marcus — Stage 1 cloud execution evidence

Date: 2026-09-10. Workflow: [08 Marcus — Stage 1 Manual PDF Test / Stage 2 Parked](https://ezyabsorb.app.n8n.cloud/workflow/Lksy14rvjB5Z7aYg).

## Passing execution

| Field | Result |
|---|---|
| Execution | `30661` |
| Status | Success |
| Started | `2026-09-10T09:14:36.987Z` |
| Finished | `2026-09-10T09:15:20.771Z` |
| Final node | `9 · REPORT READY — DOWNLOAD PDF` |
| Test question | `What is my higher calling?` |
| Spread | `six_questions` — 2 fixed face up / 4 buyer-specific face down |
| Fictional test buyer | Maya Lewis |
| Personal card | The Hermit |
| QA | Four paid sections; saved draw bound by n8n; exact structure preserved |
| Artifact | `marcus-stage1-maya-lewis-six_questions.pdf` |
| n8n binary | `data`, `application/pdf`, 135 kB; Download button visible in final-node output |

The fixed face-up cards were Six of Cups and Queen of Swords. The buyer draw was Nine of
Pentacles, Two of Pentacles, Queen of Wands, and King of Pentacles. OpenAI supplied the prose only;
n8n attached each prose slot to the saved position and card before rendering. PDFShift returned the
file, and the final node preserved it as a named PDF binary.

No Supabase record, payment, webhook, email, customer delivery, or audio request was made. The
workflow remained inactive throughout; it was executed manually in the editor.

## Fail-closed evidence

Two earlier executions were deliberately retained as useful evidence:

- `30659` stopped at the structural gate after the writer paraphrased a canonical position label.
  The workflow was changed so structural facts now come only from the saved n8n draw.
- `30660` stopped because the writer left the synthesis/conclusion incomplete. Minimum substantive
  lengths and placeholder rejection were added before the passing execution.

Neither failed execution reached PDFShift.

## Reproduce

1. Open `2 · TEST INPUTS — EDIT ME` in the cloud workflow.
2. Set `question`, `spreadType`, `firstName`, and `lastName`.
3. Click **Execute workflow**.
4. Open `9 · REPORT READY — DOWNLOAD PDF`, select **Binary**, and download `data`.

The current supported spread types are `three`, `six_questions`, `adaptive_eight`, `tree_of_life`,
and `twelve_houses`. Stage 2 remains parked until the Supabase schema and verified payment-event
contract are approved.

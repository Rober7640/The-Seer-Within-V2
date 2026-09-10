# 02 fulfilment — n8n workflow links

These are the two 02 workflows referenced by the handoff. Last verified deployment state: 2026-09-10; both inactive. These links do not imply live delivery is enabled.

| Workflow | Open in n8n | Generated definition |
| --- | --- | --- |
| Main fulfilment — Terra | [Open main workflow](https://ezyabsorb.app.n8n.cloud/workflow/5QkhGbpsusvIfh6j) | [02-fulfilment-OPENAI.n8n.json](n8n/docs/02/02-fulfilment-OPENAI.n8n.json) |
| Manual v2 test — Terra, no customer delivery | [Open manual test](https://ezyabsorb.app.n8n.cloud/workflow/IT3T9VNJOLBIADwQ) | [02-fulfilment-MANUAL-V2-OPENAI.n8n.json](n8n/docs/02/02-fulfilment-MANUAL-V2-OPENAI.n8n.json) |

For testing, use the manual workflow’s **Execute workflow** button and inspect the PDF at node 11. Sarah is the test fixture name. The selected writer and grader are `gpt-5.6-terra`, with a 6,400-word target.

Supabase upload/signing and the customer-delivery path still require verification before live activation. Edit the [generator](n8n/scripts/build-02-n8n.py), never the generated workflow JSON.

See the [02 handoff](README.md) for the current reading-quality evidence, file map, commands and outstanding checklist.

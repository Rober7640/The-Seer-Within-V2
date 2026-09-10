# 02 Twin Flame fulfilment — developer handoff

Start here when continuing the 02 paid-reading pipeline. The working implementation is in **`n8n/`**, including its scripts, generated workflows, reports and review history. Sales copy and shared artwork remain in the parent backend-offer workspace.

## Current decision and status

- Selected writer **and grader**: `gpt-5.6-terra` via the OpenAI nodes. Target: **6,400 generated words**.
- The operator accepted the editorially shortened report: **6,384 words, 33 pages, 7.0/10** in a blind paired review. The same reviewer scored its longer counterpart 6.33/10. These are reading-quality scores, not measured customer NPS.
- **A fresh report generated with the shorter prompts has not yet been scored.** Do not describe the 7.0 as a score for the current automatic generation.
- Last verified n8n state: main definition and manual test are pushed but **inactive**. Supabase delivery configuration remains unresolved; do not treat this as a verified customer-delivery launch.
- Repository branch: `02-fulfillment`, based on the local integration of `origin/development` at `24f548b`. This branch also carries the operator’s pending 06/07/08 work; the name does not imply a 02-only diff.

## Main files to read

Paths below are relative to this README.

| File | Why it matters |
| --- | --- |
| [Latest handover](n8n/docs/02/02-shortening-and-manual-handover.md) | Latest shortening decision, manual test setup, checklist and push record. Read first. |
| [Full technical handover](n8n/docs/02/02-HANDOVER.md) | Flow, node responsibilities, historical decisions and traps. Later dated notes supersede earlier experiments. |
| [Generator](n8n/scripts/build-02-n8n.py) | Source of truth for n8n nodes, model requests, voice, per-house prompts, joiner, grader and HTML renderer. **Edit this, not generated JSON.** |
| [House specification](n8n/scripts/02-houses.json) | Card lore, arc obligations, timing, architecture and word budgets. The second-letter obligations matter as much as the voice prompt. |
| [Accepted PDF](n8n/docs/02/n8n-02-reading-30656-short.pdf) | The actual shortened buyer-facing reading the operator accepted. |
| [Accepted reading text](n8n/docs/02/n8n-02-reading-30656-short.md) | Searchable prose and run context. |
| [Blind paired review](n8n/docs/02/02-length-paired-blind-review.md) | Specific reasons the shortened version scored better; remaining weaknesses. |
| [Paired score data](n8n/docs/02/02-length-paired-blind-scores.json) | Numeric evidence behind the comparison. |
| [Review contract](n8n/docs/02/02-shortening-paired-review-contract.md) | The evaluation instructions used for the length comparison. |
| [Original full report](n8n/docs/02/n8n-02-reading-30656.pdf) | The longer version, for controlled comparison. |
| [Shortening manifest](n8n/docs/02/02-shortening-30656-manifest.json) | Exact editorial cuts; evidence, not a worked example to paste into prompts. |
| [Prior audit and test plan](n8n/docs/02/02-n8n-test-plan.md) | Read the tarot-reader audit and second-pass findings before proposing “obvious” prompt fixes. Some already made the writing worse. |
| [Original writing review](n8n/docs/02/02-writing-review-2026-09-09.md) | Prose faults, causes and planned corrections. |
| [Workspace commands](n8n/README.md) | Compact build, verification and deployment reference. |

## Sales promises and house style

These remain outside the n8n workspace:

- [Letter v1](../../copy/02/02-E2-esl-v1.md) and [letter v2](../../copy/02/02-E3-esl-v2.md): what the buyer was promised. A v2 buyer is owed both letters.
- [Attention Ledger source](../../copy/02/02-P3-attention-ledger.md): gift content inlined by the generator.
- [Voice profile](../../copy/02/evelyn-esl-voice-profile.md): house-style guidance referenced by the prompts.
- Handwritten product reference: `../../build/02/02-product.md`. The `build/` directory is git-ignored; this reference may be available only in the existing local workspace. It is not required to run the n8n generator.
- Shared 02 artwork: `../../assets/`; repository Rider–Waite artwork: `assets/tarot-rws/` from the repository root.

## Workflows and generated artifacts

| Workflow | Link | Generated local artifact under `n8n/docs/02/` |
| --- | --- | --- |
| Main definition | [5QkhGbpsusvIfh6j](https://ezyabsorb.app.n8n.cloud/workflow/5QkhGbpsusvIfh6j) | `02-fulfilment-OPENAI.n8n.json` |
| Manual v2 test | [IT3T9VNJOLBIADwQ](https://ezyabsorb.app.n8n.cloud/workflow/IT3T9VNJOLBIADwQ) | `02-fulfilment-MANUAL-V2-OPENAI.n8n.json` |

The main definition has 30 nodes. The manual test has 27 nodes, a manual trigger, no customer delivery, and disabled logging/upload/signing stages. Use **Execute workflow** in the manual test and inspect the PDF at node 11.

The manual fixture uses Sarah J Mitchell, first name Sarah, order `cs_test_n8n_testdrive_02_v2`, and letter code `c=23`. Sarah is fixture data; the real build uses buyer metadata for personalisation. Keep the order ID fixed when comparing revisions. Fixture `c=3` selects v1; `c=23` selects v2.

**Provider trap:** an unflagged generator build uses the default Claude configuration and writes `02-fulfilment.n8n.json`. It does not select Terra. Use `--openai --model gpt-5.6-terra` for the chosen Terra artifacts, and the matching flags when pushing or reading an execution.

## Tools to keep close

| Script under `n8n/scripts/` | Purpose |
| --- | --- |
| `push-02-n8n.py` | Create/update remote n8n definitions from generated artifacts. |
| `status-02-n8n.py` | Inspect a workflow or execution without running a reading. |
| `preview-02-prompts.mjs` | Free seeded prompt inspection for a house and arc. |
| `dryrun-02-reading.mjs` | Local model-backed generation/replay; paid unless using a free inspection mode. |
| `read-02-run.mjs` | Retrieve execution prose/draw and check it against the specified build. |
| `make-02-pdf.mjs` | Render a saved reading through the workflow’s HTML renderer. |
| `audit-02-prose.mjs` | Prose metrics; a diagnostic, not proof the reading is good. |
| `check-02-promises.mjs` | Required promises and prompt mechanisms. |
| `check-02-draw.mjs` | Deterministic draw, arc and card-pool invariants. |
| `check-02-architecture.mjs` | Seeded architecture, replay and word-budget invariants. |
| `check-02-takeaways.mjs` | Takeaway formatting, claim and date controls. |

## Build and verify

From the repository root, enter the **new** working directory:

```sh
cd improve-v1/v1-one-time-BEs/docs/02/n8n
```

After any prompt/spec edit, run the free checks:

```sh
python3 scripts/build-02-n8n.py
node scripts/check-02-promises.mjs
node scripts/check-02-draw.mjs
node scripts/check-02-architecture.mjs
node scripts/check-02-takeaways.mjs
node scripts/preview-02-prompts.mjs --house 5 --arc v2 --seed cs_test_n8n_testdrive_02_v2
```

Build the selected Terra definitions:

```sh
python3 scripts/build-02-n8n.py --openai --model gpt-5.6-terra
python3 scripts/build-02-n8n.py --testdrive --manual-only --openai --model gpt-5.6-terra --arc v2 --order cs_test_n8n_testdrive_02_v2
```

After an authorised manual execution, save its reading and render a local PDF (replace `<execution-id>`):

```sh
node scripts/read-02-run.mjs <execution-id> --build 02-fulfilment-MANUAL-V2-OPENAI.n8n.json
node scripts/make-02-pdf.mjs --from n8n-02-reading-<execution-id>
```

Credentials are read from the repository-root `.env`, which stays untracked. Rendering uses the repository’s installed dependencies. Remote pushing, activation and paid generation are separate actions from the free checks; see the workspace README for exact push commands.

## Decisions to preserve

- Twelve new cards per buyer, from a 16-card pool. Reversals off. Obligations stay in houses 2/5/8/12: **the card decides how, never whether**.
- Arc is selected from Stripe metadata `c`. Letter v2 owes both letters; retain the browser → checkout → Stripe letter-code wiring.
- House 5 is the only dated room; relative dates only, never calendar dates.
- Preserve Waite source blocks, accurate card lore, the Majors explanation, and the purchased gift.
- Seed any per-room rotation with the order ID. Do not paste worked examples into prompts: repeated template bleed was measured in this pipeline.
- The operator’s reading of the rendered PDF is the final prose gate. A green grader or promise checker is insufficient.
- Historical files keep their original contents. Old paths referring to the former workspace need translating to `docs/02/n8n/`; internal `scripts/` and `docs/02/` paths now start there.

## Next-session checklist

- [x] Shorter Terra profile built and pushed to the inactive main/manual definitions.
- [x] Accepted editorial PDF and blind paired score preserved.
- [x] Local development merge: build, 123 targeted app tests and 02 checks passed. Full TypeScript check still has 46 errors also present in upstream; see [integration record](../../../../docs/local-development-integration-20260910.md).
- [ ] Execute the current shorter manual workflow and record its execution ID, duration and grade.
- [ ] Retrieve and inspect the new PDF, then blind-score that actual artifact under the review contract.
- [ ] Resolve Supabase upload/signing and verify the delivery path before any live activation.
- [ ] Obtain the operator’s acceptance of the generated report before customer release.

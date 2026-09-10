# 02 n8n fulfilment workspace

All 02 pipeline work now lives here. Run commands from this directory:

```sh
cd improve-v1/v1-one-time-BEs/docs/02/n8n
```

## Start here

- [Latest handover and checklist](docs/02/02-shortening-and-manual-handover.md)
- [Full pipeline handover](docs/02/02-HANDOVER.md)
- [Accepted shortened PDF](docs/02/n8n-02-reading-30656-short.pdf)
- [Blind paired review](docs/02/02-length-paired-blind-review.md)
- [Generator](scripts/build-02-n8n.py) and [house specification](scripts/02-houses.json)

## Layout

- `scripts/`: generator, specification, deployment tools, checks, rendering and experiments.
- `docs/02/`: generated workflows, reports, draws, scorecards and historical handovers.
- `tmp/pdfs/`: PDF inspection images and extracted text.
- Shared source copy, handwritten products and artwork remain in `../../../copy/02/`, `../../../build/02/` and `../../../assets/`. Repository tarot artwork and `.env` remain at the repository root.

Historical records are preserved verbatim. In older notes, commands using `scripts/` or `docs/02/` now run from this directory. Old absolute links containing `v1-one-time-BEs/docs/02/` or `v1-one-time-BEs/scripts/` now resolve under `v1-one-time-BEs/docs/02/n8n/` (which retains its internal `docs/02/` and `scripts/` layout). References to source `copy/02/` and `build/02/` still refer to the `v1-one-time-BEs` workspace.

## Current state

Terra (`gpt-5.6-terra`) is the selected writer and grader, with a 6,400-word target. The accepted editorially shortened PDF scored 7.0/10 in the paired review; a fresh generation with the shorter prompts has not yet been scored.

- [Main workflow](https://ezyabsorb.app.n8n.cloud/workflow/5QkhGbpsusvIfh6j): pushed, inactive.
- [Manual test](https://ezyabsorb.app.n8n.cloud/workflow/IT3T9VNJOLBIADwQ): pushed, inactive; Execute workflow manually. No customer delivery; PDF at node 11. Sarah is the test fixture name.
- Supabase delivery configuration remains unresolved. This relocation did not modify remote workflows.

## Free verification

```sh
python3 scripts/build-02-n8n.py
node scripts/check-02-promises.mjs
node scripts/check-02-draw.mjs
node scripts/check-02-architecture.mjs
node scripts/check-02-takeaways.mjs
node scripts/preview-02-prompts.mjs --house 5 --arc v2 --seed cs_test_n8n_testdrive_02_v2
```

The unflagged generator builds the Claude/default artifact used by the checks. Build the selected Terra artifacts explicitly:

```sh
python3 scripts/build-02-n8n.py --openai --model gpt-5.6-terra
python3 scripts/build-02-n8n.py --testdrive --manual-only --openai --model gpt-5.6-terra --arc v2 --order cs_test_n8n_testdrive_02_v2
```

Deployment commands, when a push is requested:

```sh
python3 scripts/push-02-n8n.py --openai --update 5QkhGbpsusvIfh6j
python3 scripts/push-02-n8n.py --testdrive --manual-only --arc v2 --openai --update IT3T9VNJOLBIADwQ
```

Edit the generator/specification, never generated n8n JSON. Always use an explicit order ID when comparing readings. Paid dry runs and deployment are separate from free checks.

## Relocation verification

- [x] Moved 18 scripts/specifications and 303 documentation/artifact files.
- [x] Moved PDF QA working files.
- [x] Updated repository environment, package and shared-source paths.
- [x] Rebuilt default, Terra main and Terra manual artifacts; all 303 saved documentation/artifact files remained byte-identical.
- [x] Promise, draw (9,000 seeds), architecture (2,000 orders) and takeaway checks passed.
- [x] All relocated Python and JavaScript files passed syntax checks; seeded house 5 prompt preview succeeded.
- [x] No remote push, activation, paid generation or commit during the tidy-up.

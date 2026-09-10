# 08 Marcus — staged n8n fulfillment workflow

**Dedicated inactive workflow:** [08 Marcus — Stage 1 Manual PDF Test / Stage 2 Parked](https://ezyabsorb.app.n8n.cloud/workflow/Lksy14rvjB5Z7aYg).

No other workflow is updated, activated, deactivated or executed. The scoped update script can replace only this exact inactive Marcus workflow and has no create/delete/activate operation.

## Stage 1 — manual report test

The first lane is deliberately small enough to test from the n8n editor:

1. Open `2 · TEST INPUTS — EDIT ME`.
2. Enter `question`, `spreadType`, `firstName`, and `lastName`.
3. Click **Execute workflow**.
4. Open `9 · REPORT READY — DOWNLOAD PDF`, select **Binary**, and download `data`.

Supported test spread types are `three`, `six_questions`, `adaptive_eight`, `tree_of_life`, and
`twelve_houses`. The question and spread fix the face-up cards. Each execution draws the face-down
cards separately for the entered buyer. The same first and last name always identifies the same
personal card through the existing Expression-number method.

Stage 1 uses n8n's stored OpenAI and PDFShift credentials. It does not access Supabase, accept a
payment, store a customer record, send an email, or activate a webhook. A successful execution ends
with a downloadable PDF in the final node's binary output.

Regenerate the staged source with:

```sh
python3 improve-v1/v1-one-time-BEs/docs/08-marcus/n8n/build-staged-workflow.py
```

Review the exact cloud update without sending it:

```sh
python3 improve-v1/v1-one-time-BEs/docs/08-marcus/n8n/update-staged-workflow.py --dry-run
```

## Stage 2 — production fulfillment

Stage 2 is parked on the canvas until the Supabase tables and verified payment-event contract are
approved. It will load the immutable daily edition and fixed face-up cards, save one buyer-specific
draw atomically per paid order, persist the personal card, generate and store the private PDF, queue
24-hour or 12-hour delivery, and chain the optional audio job from the accepted written report.

## What exists

- [Main flow plan](MAIN-FLOW.md)
- [Audio branch plan](AUDIO-BRANCH.md)
- [Confirmed 24h / 12h delivery policy](DELIVERY-POLICY.md)
- [Replicate Chatterbox setup](CHATTERBOX.md)
- [Stage 1 source builder](build-staged-workflow.py)
- [Scoped Stage 1 cloud updater](update-staged-workflow.py)
- [Original production scaffold builder](build-workflow.py)
- [Runnable staged workflow JSON](08-marcus-staged.n8n.json)
- [Passing Stage 1 cloud execution evidence](STAGE-1-TEST-EVIDENCE.md)
- [47-node local inactive workflow JSON](08-marcus-fulfillment.n8n.json)
- [Create-only API script](create-new-workflow.py)
- [Creation receipt](created-workflow.json)
- [Adaptive local n8n execution evidence](LOCAL-EXECUTION-EVIDENCE.md)

The live cloud canvas now contains the runnable nine-node Stage 1 lane and a parked Stage 2 note. The
original 47-node production scaffold remains in the repository as an architecture reference; it is
not the live canvas and is not runnable until the Stage 2 backend exists.

## What is NOT connected yet

Stage 1 is working for manual PDF tests. It is not a customer fulfillment system, and the workflow
must remain inactive until these Stage 2 dependencies are built and tested:

- [ ] Authenticated backend operations below, durable job storage, idempotency and lease handling.
- [x] Stage 1 report writer, structural gate, and PDF renderer are credentialed and passed one cloud execution.
- [ ] Production report grading, private storage, durable retry state, and customer delivery.
- [ ] Dedicated backend header-auth credential on service nodes.
- [ ] Replicate header-auth credential on the two Chatterbox HTTP nodes.
- [ ] Marcus reference voice file from Joel, stored privately with fresh signed input URLs.
- [ ] Speech segment sizing, pronunciation test, media assembly/QA and private player.
- [ ] Delivery provider/template and scheduled dispatch of persisted delivery/recovery tasks.
- [ ] Service authentication on the new webhook; backend verification of event, product, paid order and entitlements.
- [x] One isolated local n8n main-reading run completed with an eight-card 4-up/4-down fixture and produced a PDF. Production integration checks and the audio branch remain pending.
- [x] One cloud Stage 1 manual run completed with a six-card 2-up/4-down test and returned a downloadable 135 kB PDF.

## Backend stage envelope

Each service node posts to the configured application base under `/internal/marcus08/<operation>`. Production endpoints remain unbuilt. The isolated local server now implements fixture-only stage adapters with SQLite leases and captured deliveries; see the [local README](../../../local/08-marcus/README.md). These do not create readings, synthesize speech or send messages.

Every stage response preserves an envelope with `eventId`, `orderId`, `jobId`, `leaseToken`, `order`, and the relevant immutable source/version references. The backend reloads trusted records and ignores client attempts to set cards, prices, entitlements or deadlines. A workflow branch is not authorization.

| Operation | Required behavior / fields used by the canvas |
|---|---|
| `reconcile` | Verify/deduplicate backend event, persist accepted state; return `action`: main, audio, delivery, recovery or none. |
| `claim-main` | Atomically claim and load saved buyer draw; return `jobState: claimed`, `order.paidAt` and trusted `order.bumpCents` (0 or 1277). Do not create a second draw on replay. |
| `build-brief`, `write-report` | Save a versioned brief and report candidate from the edition theme and every ordered free/paid position; derive counts rather than assuming six cards; reuse completed stages on recovery. |
| `grade-report` | Save verdict and approved version; return `reportStatus: approved` only when passed. |
| `render-written`, `queue-written-delivery` | Verify/store report artifact and durable delivery task with pinned `dueAt`. Dispatch independently of audio processing. |
| `claim-audio` | Require verified audio purchase and approved report. Return `audioStatus: claimed` only for one current lease holder; waiting/done exits cleanly. |
| `prepare-audio-script` | Save/check narration manifest matching the approved report. |
| `next-audio-segment` | Return `segmentState: pending` plus `segment.text`, saved seed, `voice.signedUrl`, `voice.version`, and optional `predictionId`; otherwise return done. |
| `record-prediction` | Accept `{context,prediction}`, persist provider ID before polling, return envelope with `predictionId`. |
| `poll-budget` | Renew valid lease and enforce attempts/deadline; return `pollStatus: allowed` or review. |
| `record-prediction-status` | Accept `{context,prediction}`; verify matching provider job and return envelope with `predictionStatus` and output reference. |
| `store-audio-segment` | Download/copy provider output promptly, check and persist it; return context for next segment. |
| `assemble-audio` | Assemble ordered saved segments, validate playable output; return `audioQa: passed` only on actual checks. |
| `complete-audio`, `queue-audio-delivery` | Save artifact and independent listening-link delivery task. Recheck entitlement and deadline. |
| `claim-delivery` | Claim ready delivery task; return `deliveryStatus: due` only when it is permitted to send. |
| `deliver`, `record-delivery` | Send through selected adapter and persist outcome; reconcile ambiguous sends before retry. |
| `recover` | Re-enqueue valid missed work by saved stage; never blindly regenerate paid products. |
| `fail-or-review` | Persist bounded retry/review state and visible error context. |

A stopped execution may leave an active lease. Recovery must detect its expiry. Provider create timeouts are ambiguous; the canvas deliberately has no automatic POST retry. Reconcile provider work or review before creating another chargeable prediction.

## Maintaining this new workflow

Run `python3 improve-v1/v1-one-time-BEs/docs/08-marcus/n8n/build-staged-workflow.py` from the repo
root to regenerate the current cloud source. This does not push changes. Use
`update-staged-workflow.py --dry-run` to review an update; the updater refuses any workflow other
than `Lksy14rvjB5Z7aYg`, refuses an active workflow, and never activates it.

The Stage 1 cloud execution used fictional buyer data. No audio generation, payment, Supabase write,
email, or customer delivery was executed.

# 08 Marcus — staged n8n fulfillment workflow

**Two dedicated inactive workflows (Joel, 2026-09-13: keep both):**

| Workflow | ID | Role |
|---|---|---|
| [08 Marcus — Numerology-Anchored Stage 1 / Stage 2 Parked](https://ezyabsorb.app.n8n.cloud/workflow/Lksy14rvjB5Z7aYg) | `Lksy14rvjB5Z7aYg` | **Test lane.** Manual inputs → canon → synthesis → plan → write → grade → PDF. Used to iterate the report. |
| [08 Marcus — Numerology-Anchored Written + Audio — 48-NODE INACTIVE DRAFT](https://ezyabsorb.app.n8n.cloud/workflow/UJamB32MGlNKdoEW) | `UJamB32MGlNKdoEW` | **The real production workflow.** Verified order → pinned LP/Expression/Personality canon → written + audio branches. Not runnable until Stage 2 backend exists. |

The fulfillment draft has an explicit `Require numerology anchors` gate before report writing. Its configuration guard is disabled and its production backend operations are still placeholders.

No other workflow is updated, activated, deactivated or executed. The scoped update script can replace only this exact inactive Marcus workflow and has no create/delete/activate operation.

## Stage 1 — manual report test

The first lane is deliberately small enough to test from the n8n editor:

1. Open `2 · TEST INPUTS — EDIT ME`.
2. Enter all eight inputs: `question`, `spreadType`, `displayFirstName`, `fullBirthName`,
   `dateOfBirth`, `editionId`, `heroImageUrl`, `positionsJson`. The code node throws if any is
   blank. The `question` comes from the edition (the named thing the morning letter was written
   on), not from the buyer.
3. Click **Execute workflow**.
4. Open `26 · REPORT READY — DOWNLOAD PDF`, select **Binary**, and download `data`.

Supported test spread types are `three`, `six_questions`, `adaptive_eight`, `tree_of_life`, and
`twelve_houses`. The question and spread fix the face-up cards. Each execution draws the face-down
cards separately for the entered buyer. The shared calculation method derives the private profile;
the Expression Number identifies the personal tarot card.

The tested generation core retrieves exactly three entries from the
[reusable numerology canon](numerology-canon/README.md), produces a question-specific synthesis with
passage-ID citations, grades that evidence, and only then maps the approved synthesis to the cards.
The customer writer receives the resulting plan without raw birth data, canon text, evidence IDs,
or the private Expression and Personality labels. Life Path is deliberately customer-visible and
appears before the personal-card section. It is the primary recognition anchor; the personal card
only explains how that Life Path may approach choice and commitment. A private-support grader and the exact customer-view comparison rubric independently
check the finished report. A failed first grade may receive one bounded rewrite using the same facts,
plan, and cards. The final customer gate rejects any report for which its grader still lists an
unsupported personal claim. Saved structure in n8n controls the card names, position labels, and count.

Stage 1 uses n8n's stored OpenAI and PDFShift credentials. It does not access Supabase, accept a
payment, store a customer record, send an email, or activate a webhook. A successful execution ends
with a downloadable PDF in the final node's binary output.

Regenerate the staged source with:

```sh
python3 improve-v1/v1-one-time-BEs/docs/08-marcus/n8n/build-numerology-workflow.py
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
- [Numerology-anchored report design](NUMEROLOGY-ANCHORED-READING.md)
- [Reusable numerology canon](numerology-canon/README.md)
- [Audio branch plan](AUDIO-BRANCH.md)
- [Confirmed 24h / 12h delivery policy](DELIVERY-POLICY.md)
- [Replicate Chatterbox setup](CHATTERBOX.md)
- [Audio provider test evidence](AUDIO-TEST-EVIDENCE.md)
- [Current numerology Stage 1 source builder](build-numerology-workflow.py)
- [Scoped Stage 1 cloud updater](update-staged-workflow.py)
- [Original production scaffold builder](build-workflow.py)
- [Current runnable workflow JSON](08-marcus-numerology-stage1.n8n.json)
- [Previous simple Stage 1 builder](build-staged-workflow.py)
- [Previous simple Stage 1 JSON](08-marcus-staged.n8n.json)
- [Passing Stage 1 cloud execution evidence](STAGE-1-TEST-EVIDENCE.md)
- [Compare-grade of execution 30667](STAGE-1-COMPARE-GRADE-30667.md)
- [48-node local inactive workflow JSON](08-marcus-fulfillment.n8n.json)
- [Create-only API script](create-new-workflow.py)
- [Original Stage 1 workflow creation receipt](created-workflow.json)
- [48-node fulfillment draft creation/update receipt](created-fulfillment-workflow.json)
- [Numerology-anchor audit and correction evidence](NUMEROLOGY-ANCHOR-AUDIT.md)
- [Adaptive local n8n execution evidence](LOCAL-EXECUTION-EVIDENCE.md)

The two cloud workflows remain separate: the inactive 37-node canon-backed Stage 1 test lane and the
inactive 48-node production fulfillment draft. The latter is reviewable in n8n but is not runnable
until its Stage 2 backend operations exist.

## What is NOT connected yet

Stage 1 is working for manual PDF tests. It is not a customer fulfillment system, and the workflow
must remain inactive until these Stage 2 dependencies are built and tested:

- [ ] Authenticated backend operations below, durable job storage, idempotency and lease handling.
- [ ] Production report grading, private storage, durable retry state, and customer delivery.
- [ ] Dedicated backend header-auth credential on service nodes.
- [x] Replicate header-auth credential verified in a temporary Chatterbox Turbo n8n smoke-test lane; production audio nodes remain unbuilt.
- [x] Two Marcus voice sources downloaded locally; v2 is selected, v1 is retained as an alternate, and hashes are recorded in [the voice asset manifest](assets/marcus-voice/README.md).
- [x] Selected voice v2 uploaded to private object storage with a pinned key and hash.
- [ ] Production fresh signed voice-input URL operation for n8n. A one-hour test URL was generated and verified successfully.
- [ ] Speech segment sizing, pronunciation test, media assembly/QA and private player.
- [ ] Delivery provider/template and scheduled dispatch of persisted delivery/recovery tasks.
- [ ] Service authentication on the new webhook; backend verification of event, product, paid order and entitlements.

### Evidence so far

Full detail, node by node, is in [STAGE-1-TEST-EVIDENCE.md](STAGE-1-TEST-EVIDENCE.md). In short:

- Stage 1 planner, writer, independent grader, structural gate and PDF renderer are credentialed and passed a cloud execution.
- One isolated local n8n main-reading run (eight-card 4-up/4-down fixture) produced a PDF; production checks and the audio branch stay pending.
- One cloud Stage 1 manual run (six-card 2-up/4-down) returned a downloadable 135 kB PDF.
- `30691` (post-repair): `LP4`/`EX6`/`PE1`, passed citation/synthesis QA and both graders first time, 1.18 MB PDF, zero unsupported claims; failed QA now ends at `QA HOLD · NO PDF`.
- `30694`: Life Path 4 shown as **The Builder**, The Lovers kept subordinate as the lens, both graders first time, 1.21 MB PDF.
- `30695`: `LP7`/`EX6`/`PE1` for Hng Ye Ying, shown as **The Seeker**, both graders first time, 1.19 MB PDF.
- `30700`: ten-card Tree of Life kept the email's Moon, Two of Swords and Three of Pentacles, drew seven buyer cards, both graders first time, 1.92 MB PDF; writer/rewrite budgets now scale with spread size after `30699` truncated at ten cards.
- `31276`: temporary n8n audio lane created Chatterbox Turbo prediction `s9g4pxdgh5rmy0d0kbyrd42rew`; the saved 14.14-second voice-v2 WAV passed format and hash checks. The temporary lane was removed and the cloud canvas restored to its inactive 37-node state.
- The 33-entry canon is embedded as a versioned runtime artifact; the workflow retrieves exactly three entries with passage-ID evidence. Editorial approval of the prose is a separate review item.

### Known gaps (2026-09-13)

- **Spread list mismatch.** The canvas supports `three`, `six_questions`, `adaptive_eight`, `tree_of_life`, `twelve_houses`. The letter library ([SPREADS.md](../daily-email/SPREADS.md)) has The Three (3), The Cross (5), The Six Questions (6), The Cross and Triangle (7), The Tree of Life (10), The Twelve Houses (12). So a letter laid on **The Cross** or **The Cross and Triangle** cannot be fulfilled yet — neither has a spread key on the canvas.
- **`adaptive_eight` is not in the library.** It turns 4 of 8 free, which breaks the ⅓-rounded-down rule (8 → 2). Drop it or re-cut it before Stage 2 (PARALLEL-PLAN T11).
- **Date of birth is required.** Stage 1 throws without `dateOfBirth`, so the booking page must collect it. Decided D1 (Joel, 2026-09-13): booking collects display first name, full birth name, date of birth, delivery email.

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

The approved default audio settings are pinned in [`config/marcus-audio-v1.json`](config/marcus-audio-v1.json): Chatterbox Turbo with Marcus voice v2, pitch-preserving 0.90× tempo, 300 ms paragraph pauses, 600 ms card-section pauses, and 900 ms before the closing synthesis. Store the config version on every job and artifact.

## Maintaining this new workflow

Run `python3 improve-v1/v1-one-time-BEs/docs/08-marcus/n8n/build-numerology-workflow.py` from the repo
root to regenerate the current cloud source. This does not push changes. Use
`update-staged-workflow.py --dry-run` to review an update; the updater refuses any workflow other
than `Lksy14rvjB5Z7aYg`, refuses an active workflow, and never activates it.

The Stage 1 cloud execution used the manually supplied test profile. No audio generation, payment,
Supabase write, email, or customer delivery was executed.

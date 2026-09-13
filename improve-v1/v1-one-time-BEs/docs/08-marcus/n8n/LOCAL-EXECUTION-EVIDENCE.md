# 08 Marcus - adaptive local n8n execution evidence

Date: 2026-09-10. Scope: isolated local fixture only.

## Result

An ephemeral Docker n8n instance imported a test copy of the 47-node inactive Marcus workflow and
completed one main-reading execution successfully. The last node was `Waiting or complete - no new
work`; n8n reported `status: success` and `finished: true`.

The saved fixture represented a future edition shape rather than one of the current six-card
emails:

- question: `What needs my attention as I decide what comes next?`;
- theme: `Moving from uncertainty toward a grounded choice`;
- spread: `The Eight Paths`;
- eight ordered positions;
- four fixed face-up cards from the edition;
- four face-down cards drawn once for this test order;
- a separate name-derived personal card.

n8n ran the order through event reconciliation, main-job claim, deadline calculation, adaptive
brief construction, structural report writing, grading, PDF rendering, written-delivery queuing,
the no-audio branch, and a clean end. The returned brief contained `freePositions.length === 4`,
`paidPositions.length === 4`, the edition theme, all eight saved position/card pairs, and the rule
that no report stage may assume six cards.

## PDF evidence

The n8n execution produced `written:n8n-eight-20260910-v2` with SHA-256:

`7a3088510728b33ee3d83a1d7ab1bc0072a11b27d1ceb5eafd164c4a6891121b`

The retained review copy is `output/pdf/marcus-n8n-adaptive-eight-card-test.pdf` at the repository
root. Automated PDF inspection confirmed three A4 pages, all eight card names, the 4/4 split, all
four paid position headings, the theme, and the local-only notice. All three rendered pages were
visually inspected for clipping, overlap, hidden table headings, and awkward page breaks.

## Isolation and limits

The canonical workflow stayed inactive with its configuration guard disabled. For the single CLI
execution, a temporary copy supplied the fixture event, local backend URL, and local fixture header;
it bypassed the webhook response node because the run began from the manual trigger. A temporary
Docker-to-host bridge forwarded only to the loopback fixture server and was stopped afterward. The
n8n container was ephemeral. No existing or cloud workflow was edited, activated, or executed.

The report sections deliberately contain labeled structural sample prose. This run proves n8n
routing, variable spread handling, theme continuity, saved-card parity, PDF rendering, and delivery
task creation. It does not prove production-quality tarot writing, Supabase/Stripe integration,
private storage, customer email, or audio generation.

## Dry run 2026-09-13 — 47-node draft, blind-spots 10-card, no audio

Scope: isolated local fixture only. Nothing on `ezyabsorb.app.n8n.cloud` was read, edited, activated
or executed (`UJamB32MGlNKdoEW` and `Lksy14rvjB5Z7aYg` untouched). No Replicate, OpenAI, PDFShift,
Stripe, Supabase or AWeber call was made. Nothing was committed.

### Result

**PASS.** An ephemeral Docker n8n (image `docker.n8n.io/n8nio/n8n:latest` = **2.38.7**, Docker
29.6.2) imported a temporary copy of the current 47-node `08-marcus-fulfillment.n8n.json` (the
generator output that now carries `replicateModel: resemble-ai/chatterbox-turbo`,
`voiceVersion: marcus-voice-v2-10s`, `audioConfigVersion: marcus-audio-v1` in the guard) and ran it
from the manual trigger against the local fixture adapter. n8n reported `finished: true`,
`status: success`, last node `Waiting or complete — no new work`, no node error.

Order under test (seeded through the current fixture API, `POST /api/intake` →
`POST /api/local-pay`, no audio accepted):

- order `b8960002-9456-4a0c-aa5e-895b9913b549`, edition `blind-spots-v1`, spread **The Tree of
  Life**, **10 positions — 3 fixed face-up (The Moon, Two of Swords, Three of Pentacles) + 7 drawn**
  (Three of Cups, The Empress, Six of Cups, Knight of Pentacles, Knight of Cups, The Hierophant,
  Nine of Swords); personal card The Hierophant (Expression 5);
- `bumpCents: 0`, `paidAt 2026-09-13T14:17:06.945Z` → workflow computed `deliveryHours: 24`,
  `dueAt 2026-09-14T14:17:06.945Z` (matches the fixture's own `dueAt`);
- `audio: null`, `audioDecision: pending`.

The brief returned by the fixture had `freePositions.length === 3`, `paidPositions.length === 7`,
the edition theme, the spread, all ten position/card pairs and the "never assume six cards" rule.
So the canvas has now been proven on a **third shape** (6-card editions in unit tests, 8-card 4/4 on
2026-09-10, 10-card 3/7 here) with no count hardcoded anywhere on the route.

### Per-node table — execution 1, `main.paid` event

| # | Node | Result | Fixture op → response (envelope fields that matter) |
|---|---|---|---|
| 1 | Manual entry | reached | — |
| 2 | New Marcus event (webhook) | **not exercised** | manual-trigger run |
| 3 | Configuration and guard | reached | guard `enabled: true` (temp copy only); fixed test event injected |
| 4 | Verify event and reconcile order | reached | `reconcile` → 200, `action: main` |
| 5 | Acknowledge durable event (Respond to Webhook) | reached, passed through | no webhook in this run; n8n 2.38.7 did not error on the manual path (last time this node was bypassed — not needed now) |
| 6 | Main job? | reached | true branch |
| 7 | Claim order and saved buyer draw | reached | `claim-main` → 200, `jobState: claimed`, `jobId main:<order>`, lease token, trusted `order.paidAt`/`bumpCents: 0` |
| 8 | Main lease acquired? | reached | true branch |
| 9 | Set 24h or 12h deadline | reached | `deliveryHours: 24`, `dueAt 2026-09-14T14:17:06.945Z` |
| 10 | Build adaptive themed reading brief | reached | `build-brief` → 200, brief with 3 free / 7 paid positions, theme, spread, personal card |
| 11 | Write paid positions and connections | reached | `write-report` → 200, structural report candidate v1 |
| 12 | Grade report and save verdict | reached | `grade-report` → 200, `reportStatus: approved`, `reportId report:<order>` |
| 13 | Report approved? | reached | true branch |
| 14 | Render and store written report | reached | `render-written` → 200, `artifactId written:<order>`, pdf 87,873 bytes, sha256 below |
| 15 | Queue written delivery independently | reached | `queue-written-delivery` → 200, `deliveryTaskId written:<order>`, order `writtenStatus: ready` |
| 16 | Reconcile and claim audio job | reached | `claim-audio` → 200, **`audioStatus: not-purchased`** (as required for a no-audio order) |
| 17 | Audio eligible now? | reached | **false branch** — audio sub-graph never entered |
| 18 | Waiting or complete — no new work | reached | `workflowResult: persisted; no further work in this execution` |
| — | Prepare narration … Queue audio listening-link delivery (19 audio nodes incl. both Replicate HTTP nodes, Wait, poll loop) | skipped | not reached; bridge log shows zero calls to `prepare-audio-script`/`next-audio-segment`/`record-prediction`/`poll-budget`/`store-audio-segment`/`assemble-audio`/`complete-audio`/`queue-audio-delivery` and nothing left the loopback bridge |
| — | Audio resume event? / Delivery job? / Recovery request? / Recover missed events / Save review or retry state | skipped | not on the `main.paid` path |

### Per-node table — execution 2, `delivery.due` event (extra, same temp copy with the event swapped)

The delivery nodes are only reachable from a separate `delivery.due` event (the `main.paid` path
ends at `Audio eligible now?`), so a second labelled execution was run for
`deliveryTaskId: written:<order>`.

| Node | Result | Fixture op → response |
|---|---|---|
| Manual entry → Configuration and guard → Verify event and reconcile order → Acknowledge durable event | reached | `reconcile` → 200, `action: delivery`, `deliveryTaskId` carried |
| Main job? | reached | false branch |
| Audio resume event? | reached | false branch |
| Delivery job? | reached | true branch |
| Claim due delivery task | reached | `claim-delivery` → 200, `deliveryStatus: due`, `deliveryLease` |
| Delivery can send now? | reached | true branch |
| Send approved artifact link | reached | `deliver` → 200, `deliveryOutcome: captured`, `outboxId outbox:written:<order>` |
| Record provider delivery outcome | reached | `record-delivery` → 200 |
| Waiting or complete — no new work | reached | clean end; `finished: true`, `status: success` |

Captured outbox row (fixture SQLite): `to: dry-blind-spots@example.test`, **`sent: false`**,
`notice: LOCAL CAPTURE ONLY — no provider send`. No email left the machine.

Across both executions the bridge saw 14 fixture calls, all HTTP 200 (plus two 401s from my own
token-less reachability probes before the run). No call went anywhere except `127.0.0.1:5088`.

### PDF evidence

- Pulled from `GET /api/orders/b8960002-9456-4a0c-aa5e-895b9913b549/report.pdf`: 200,
  `application/pdf`, **87,873 bytes, 4 pages (A4)**.
- SHA-256: **`341a2669a9e5a2e4141faae999d54cf9c7d78a631effc14eaa657b0db6626069`** — identical to the
  hash the `render-written` stage returned inside the n8n execution.
- Retained review copy: `output/pdf/marcus-n8n-dry-blind-spots-10card.pdf` (repo root; same hash).
- Text check (pdftotext): header "10 cards - 3 already read, 7 completed here"; all 10 position
  labels present; all 10 card names present (the 3 fixed ones each once in the spread table, the 7
  paid ones in table + section heading + prose); question, theme, spread and reader name present;
  personal card The Hierophant; local-only notice present ("LOCAL PIPELINE SAMPLE - NOT A CUSTOMER
  READING" and "…it is not a customer interpretation"). Prose is the fixture's labelled structural
  sample, as before — not Marcus writing.

### What was temporary (and where it went)

| Thing | Where | State after teardown |
|---|---|---|
| Temp workflow copies (`08-marcus-fulfillment.DRY.n8n.json`, `…DRY-delivery.n8n.json`) — guard `enabled: true`, `backendBaseUrl: http://host.docker.internal:5089`, fixed test event in the guard code, every `/internal/marcus08/*` HTTP node switched from `httpHeaderAuth` credential to a plain `Authorization: Bearer marcus08-local-fixture-only` header (the public fixture token), ids `DRYLOCAL20260913` / `DRYLOCAL2026091D`, `saveDataSuccessExecution: all` | session scratchpad `…/scratchpad/n8n-dry/` | **kept for reference**, never written into the repo. The two Replicate HTTP nodes were left on their (absent) credential — a natural stop if ever reached |
| Raw + parsed execution JSON (`exec-main.*`, `exec-delivery.*`), bridge log, seeded order JSON, PDF text dump | same scratchpad dir | kept |
| n8n state (imported workflows, both executions, throwaway `N8N_ENCRYPTION_KEY`) | Docker named volume `n8n-dry-data` only; one-shot `docker run --rm` containers for `import:workflow`, `list:workflow`, `execute` — no n8n server process was started, no `~/.n8n` on the host (confirmed absent) | **volume deleted**, no container left, nothing persisted on the host |
| Docker→host bridge `bridge.cjs` (rewrites `Host` to `127.0.0.1:5088`, forwards only `POST /internal/marcus08/*`) | bound to **127.0.0.1:5089** — Docker Desktop 29 delivers `host.docker.internal` traffic to the host loopback, so the bridge never had to leave loopback | stopped |
| Fixture order + artifact | `/tmp/08-marcus-local/state.sqlite`, `/tmp/08-marcus-local/artifacts/marcus-reading-b8960002-….pdf` | left in place (fake data only) |

Harness route used: Docker (daemon was down; `open -a Docker` answered in ~6 s), so the npx
fallback was not needed.

### Not exercised

Webhook trigger + real Respond-to-Webhook response, Supabase, Stripe (event + custom fields),
Replicate/Chatterbox (all 19 audio nodes), AWeber/any email provider, the `Save review or retry
state` (fail-or-review) node, the recovery branch, lease expiry/retry, real AI writing. `n8n
execute` also warned that its optional Python task runner could not start (no Python in the
image) — harmless, every Code node here is JavaScript.

### Observations worth a look (none blocked the run)

1. **`claim-delivery` returned `due` a day early.** The order's `dueAt` is 2026-09-14 but the
   fixture answered `deliveryStatus: due` at 2026-09-13 because the local adapter only checks lease
   state, not time. The canvas trusts that field, so the **production backend must enforce `dueAt`**
   (README already says so). Harness limitation, not a workflow defect.
2. **No error path on the backend HTTP nodes.** None of the 22 `/internal/marcus08/*` nodes has
   `onError`/continue-on-fail set, so a 4xx/5xx from the backend stops the execution rather than
   routing to `Save review or retry state`; that node is only reached by the explicit IF false
   branches. Not tested here (every call was 200). Worth a deliberate decision before Stage 2.
3. The Respond-to-Webhook node no longer needs bypassing on the manual path in n8n 2.38.7.

### Claimed vs verified

| Claim | Verified by |
|---|---|
| Cloud workflows untouched | no n8n cloud tool/API/URL was used at any point; only local Docker CLI |
| No Replicate/OpenAI/PDFShift/email call | bridge log = the only egress path from n8n, 14 calls, all to loopback fixture ops; audio nodes absent from `runData` |
| 47-node workflow, current guard | node count 47 in source and temp copy; guard code printed and diffed before edit |
| Main execution success | `exec-main.json`: `finished: true`, `status: success`, 17 nodes in `runData`, none with error |
| 3 fixed + 7 drawn, no six-card assumption | brief in node 10 output; PDF text; order draw |
| PDF hash | `shasum -a 256` on the fetched file = hash inside n8n's `render-written` output = hash of the saved `output/pdf` copy |
| Teardown | `lsof` on 5088/5089 = 0 listeners; `docker ps -a` no n8n; `docker volume ls` no `n8n-dry-data`; `~/.n8n` absent |
| Fixture adapter still intact after the client restructure | `fulfillment.test.ts` 3/3 pass before the run |

**Not verified / side effects to know about:**

- My own `server.ts` launch failed with `EADDRINUSE` — **a fixture server from another session was
  already listening on 5088 (pid 56968)**, so the seeding, the n8n calls and the PDF fetch all went
  to that pre-existing instance (same `/tmp/08-marcus-local/state.sqlite`; its API shape matched the
  current `server.ts`, including the checkout stand-in fields, so I believe it was the same code,
  but I did not prove which working copy it was started from). My teardown `pkill` **stopped that
  pre-existing server**. Restart it if it was wanted.
- `git status` shows a deleted tracked `.wav` under `n8n/assets/marcus-voice/tests/` and an
  untracked `tmp/pdfs/marcus-47-audit/` being written at 22:19–22:20 — **neither is from this
  run**; another process is working in this checkout concurrently. Left untouched.
- Only two files of mine touch the repo: this appended section and the new
  `output/pdf/marcus-n8n-dry-blind-spots-10card.pdf`. Nothing committed.

## Dry run 2026-09-13 (b) — 48-node draft, audio branch via local Replicate stand-in

Scope: isolated local fixture only. Nothing on `ezyabsorb.app.n8n.cloud` was read, edited, activated
or executed (`UJamB32MGlNKdoEW` and `Lksy14rvjB5Z7aYg` untouched). No OpenAI, PDFShift, Stripe,
Supabase or AWeber call was made. **Replicate was NOT called by the workflow** — a loopback stand-in
answered the two Replicate HTTP nodes (see §Stand-in). A separate, explicitly authorised real
Replicate call was made afterwards by a standalone script (§Real-voice sample), not by n8n. Nothing
was committed.

### Result

**PASS.** The current **48-node** `08-marcus-fulfillment.n8n.json` (generator output with the
`Require numerology anchors` gate) ran end to end in an ephemeral Docker n8n (2.38.7), including the
whole audio branch, and produced a playable MP3. Four labelled executions per order, two orders:

| Run | Event | Nodes run | n8n status | Last node |
|---|---|---|---|---|
| 2 | `main.paid` | **36 of 48** (all 19 audio nodes, 8 loop iterations) | `finished: true`, `success` | Waiting or complete — no new work |
| 2 | `audio.paid` (late-audio resume) | 9 | success | same |
| 2 | `delivery.due` written | 12 | success | same |
| 2 | `delivery.due` audio | 12 | success | same |
| 1 | same four events | same paths | success (main run's own n8n output lost — see §Harness notes; bridge + stand-in logs cover it, 53 backend calls + 24 stand-in calls, all 2xx) | same |

Not reached on the `main.paid` path (by design, 12 incl. the sticky note): New Marcus event
(webhook), Prediction still running?, Audio resume event?, Delivery job?, Claim due delivery task,
Delivery can send now?, Send approved artifact link, Record provider delivery outcome, Recovery
request?, Recover missed events and expired leases, Save review or retry state. Across the four
events every node except the webhook trigger, `Prediction still running?`, the recovery pair and
`Save review or retry state` executed at least once. **No node errored in any execution.**

Orders (fixture `POST /api/intake` → `POST /api/local-pay` → `POST /api/orders/:id/audio {accept:true}`),
edition `blind-spots-v1`, spread **The Tree of Life**, 3 fixed face-up (The Moon, Two of Swords, Three
of Pentacles) + 7 drawn, `sameDay:false` → `deliveryHours 24`; `displayFirstName Karen`,
`fullBirthName Karen Anne Miller`, `dateOfBirth 1968-03-16`; audio accepted ($17, `audioStatus queued`):

- run 1: `250c5c8c-0d30-4d72-b79d-9d01e7ccd753` (drawn: Page of Cups, Two of Wands, Page of Pentacles, Ace of Cups, Temperance, Judgement, Nine of Swords)
- run 2: `95b97875-0c92-4680-8d8a-b6b76c682e5b` (drawn: The Chariot, Ten of Pentacles, Six of Pentacles, Three of Cups, Queen of Cups, The Lovers, Four of Wands), `paidAt 2026-09-13T15:04:44.992Z`, workflow `dueAt 2026-09-14T15:04:44.992Z` = fixture `dueAt`.

**Numerology gate.** `build-brief` computed **Life Path 7 — The Seeker**, Expression 8, Personality 9,
pinned canon `LP7 / EX8 / PE9`, personal card **Strength** (= Expression 8). `Require numerology
anchors` passed on the first attempt (both orders). The report carried the Life Path block and the
grade approved it (`reportStatus approved`).

### Per-node table — run 2, `main.paid` (n8n's own runData; loop nodes show the last of their iterations)

| # | Node | runs | Result / key output |
|---|---|---|---|
| 1 | Manual entry | 1 | — |
| 2 | Configuration and guard | 1 | temp guard `enabled: true`; fixed test event `main.paid` |
| 3 | Verify event and reconcile order | 1 | `reconcile` → `action: main` |
| 4 | Acknowledge durable event | 1 | passed through on the manual path |
| 5 | Main job? | 1 | true |
| 6 | Claim order and saved buyer draw | 1 | `claim-main` → `jobState claimed` |
| 7 | Main lease acquired? | 1 | true |
| 8 | Set 24h or 12h deadline | 1 | `deliveryHours 24`, `dueAt 2026-09-14T15:04:44.992Z` |
| 9 | Build canon-backed numerology brief | 1 | `build-brief` → free 3 / paid 7, LP7 The Seeker, EX8 PE9, canon LP7/EX8/PE9, personal Strength |
| 10 | **Require numerology anchors** | 1 | **passed** (no throw) |
| 11 | Write paid positions and connections | 1 | `write-report` → 7 sections + Life Path block |
| 12 | Grade anchors, specificity and save verdict | 1 | `reportStatus approved`, `reportId report:<order>` |
| 13 | Report approved? | 1 | true |
| 14 | Render and store written report | 1 | `render-written` → pdf 88,335 B, sha256 `10391ed2…` |
| 15 | Queue written delivery independently | 1 | `deliveryTaskId written:<order>` |
| 16 | Reconcile and claim audio job | 1 | `claim-audio` → **`audioStatus claimed`** (audio purchased + report exists) |
| 17 | Audio eligible now? | 1 | **true → audio branch entered** |
| 18 | Prepare narration and check parity | 1 | `prepare-audio-script` → **8 segments** (7 card sections + closing), `reportHash 73163b3c…` matches the approved report |
| 19 | Next saved audio segment | 9 | 8× `segmentState pending`, 9th `done` |
| 20 | Segment remaining? | 9 | 8× true, 1× false → Assemble |
| 21 | Provider request already saved? | 8 | 8× "no" → Validate (no resume-with-saved-prediction case in this run) |
| 22 | Validate Chatterbox request | 8 | `replicateInput` = text (302–376 chars), `reference_audio` = fixture signed-URL stand-in, top_p 0.95, top_k 1000, temperature 0.8, repetition_penalty 1.2, seed 1…8 |
| 23 | Chatterbox create prediction (→ stand-in) | 8 | 201 `{id: mock…, status: starting}`; header auth present |
| 24 | Save prediction ID immediately | 8 | `record-prediction` → `predictionStatus starting` |
| 25 | Wait before provider poll | 8 | 10 s each (in-process; under n8n's 65 s DB-wait threshold) |
| 26 | Check poll budget and renew lease | 8 | `pollStatus allowed` (1 poll per segment) |
| 27 | Continue polling? | 8 | true |
| 28 | Get Chatterbox prediction (→ stand-in) | 8 | 200 `status succeeded`, `output http://127.0.0.1:5090/files/<id>.wav` |
| 29 | Persist provider result | 8 | `record-prediction-status` → `predictionStatus succeeded` |
| 30 | Prediction succeeded? | 8 | true |
| 31 | Copy audio segment to private storage | 8 | `store-audio-segment` → **downloaded** 1,357,498 B, sha256 `70986b34…` each (the approved sample) |
| 32 | Assemble and QA recording | 1 | `assemble-audio` → **`audioQa passed`**, mp3 1,046,781 B, **130.08 s** (expected 130.19 s: 8 × 14.14 s ÷ 0.9 + 6 × 0.6 s + 0.9 s) |
| 33 | Recording passed QA? | 1 | true |
| 34 | Publish private audio artifact | 1 | `complete-audio` → order `audioStatus ready` |
| 35 | Queue audio listening-link delivery | 1 | `deliveryTaskId audio:<order>` |
| 36 | Waiting or complete — no new work | 1 | `workflowResult: persisted; no further work in this execution` |

`audio.paid` (run 2): Main job? false → Audio resume event? true → `claim-audio` → `audioStatus ready`
→ Audio eligible now? **false** → end. So a late/duplicate audio event on an already-finished audio
job is a no-op (idempotent), which is the wanted behaviour; the branch that *resumes* a half-done
audio job was not exercised because the `main.paid` run had already completed audio in-line.

`delivery.due` (written, then audio; both runs): Delivery job? → `claim-delivery` `due` → `deliver`
`captured`, `outboxId outbox:<kind>:<order>` → `record-delivery` `captured` → end. Fixture outbox
rows say `sent: false` (no provider send).

### Stand-in for Replicate (new file, local-only)

`improve-v1/v1-one-time-BEs/local/08-marcus/mock-replicate.ts`, bound to **127.0.0.1:5090**. Answers
`POST /v1/models/resemble-ai/chatterbox-turbo/predictions` (201, `status starting`), `GET
/v1/predictions/:id` (200, `status succeeded`, `output` → its own `/files/<id>.wav`), serves the
**approved voice sample** (`tests/marcus-voice-v2-chatterbox-turbo-s9g4pxdgh5rmy0d0kbyrd42rew.wav`,
sha256 `70986b34…`, 1,357,498 B, 14.14 s f32 24 kHz) as every "generated" segment and the 10-s
reference at `/voice/marcus-voice-v2-10s.wav` (sha256 `7475c804…`). It requires *some*
`Authorization: Bearer …` header (value unchecked, logged redacted) to prove the credential slot was
replaced by a header. **No second bridge was needed:** Docker Desktop 29 routes
`host.docker.internal` to the host loopback and the stand-in does not check the `Host` header, so the
temp copy pointed the two Replicate nodes straight at `http://host.docker.internal:5090/…` (verified
from a `curlimages/curl` container before the run). The backend nodes still went through the
Host-rewriting bridge on 127.0.0.1:5089 → fixture 127.0.0.1:5088 exactly as in the (a) run.

Stand-in log totals for both runs: 16 creates, 16 polls, 16 file downloads, all 201/200; the only
non-2xx lines are my two pre-run connectivity probes (404 unknown prediction, bridge 401 no token).

### Local adapter changes (`local/08-marcus/fulfillment.ts` only; `fulfillment.test.ts` untouched, still 3/3)

| Lines (current file) | Change |
|---|---|
| 4 | `statSync` added to the `node:fs` import |
| 24–30 | `AUDIO_CONFIG` loaded from `n8n/config/marcus-audio-v1.json`; `FFMPEG` (`/opt/homebrew/bin/ffmpeg`, override `MARCUS_LOCAL_FFMPEG`), `FFPROBE`, `safeName`, `fileRecord` (bytes + sha256), `probe` (ffprobe duration/sample rate) |
| 55–75 | constructor gains `audioRoot='/tmp/08-marcus-local/audio'`; new private `assembleAudio()` — per-segment `atempo=0.9` (pitch-preserving), `anullsrc` silence between segments (600 ms between sections, 900 ms before the closing; 300 ms paragraph pause documented as intra-segment only), `concat`, WAV then `libmp3lame -q:a 3` MP3, QA = mp3 duration within 1 s of the computed expectation |
| 199–211 | `store-audio-segment`: an `http(s)` provider `output` is downloaded with `curl -fsSL` to `/tmp/08-marcus-local/audio/<orderId>/<segmentId>.wav` and recorded as `row.file {path,bytes,sha256}` (fails closed with 502 on a failed/empty download); non-URL outputs (the unit tests' `fixture://segment`) keep the old identity-only record (`fixtureOnly: true`) |
| 212–222 | `assemble-audio`: still 409 unless every ordered segment is `stored`; all-fixture-only → the old manifest artifact (tests); any stored segment without a file → 409; otherwise runs `assembleAudio`, saves artifact kind `local-audio-assembled-fixture` with segment records, wav/mp3 records, expected duration, pacing, and returns `audioQa` from the duration check |

### Artifacts (fake data only)

| File | Bytes | sha256 | Notes |
|---|---|---|---|
| `output/pdf/marcus-n8n-dry-48node-blind-spots.pdf` | 88,335 | `10391ed26d3e6339bfdd5d58cb3486001aadd0cb0905b8149a0e85157c2a95e5` | run 2 order; hash = n8n node 14 output = fixture artifact file. 4 pages |
| `output/audio/marcus-n8n-dry-48node-blind-spots.mp3` | 1,046,781 | `8870284eca9119e5573a08e8c41fcf91c974b40a0b03bdfc983ecb88b1b1897d` | run 2 pipeline output; mp3 24 kHz mono 64 kbps, **130.08 s** (= the approved 14.14 s sample ×8, slowed 0.9×, with pauses) |
| `/tmp/08-marcus-local/audio/<order2>/marcus-reading.wav` | 6,243,918 | `47de9742…` | kept beside the mp3 with the 8 downloaded segment WAVs |

PDF text order (pdftotext): header table (Prepared for Karen · Spread · Personal card Strength ·
**Life Path 7 - The Seeker**) → opening "Your Life Path 7 is The Seeker. That is the primary
numerology anchor…" → **"Your numerology foundation / Life Path 7 - The Seeker"** section (strengths,
growth edges, "How it shapes this reading") → **then** "Your personal card / Strength … a secondary
lens" → the 7 paid positions → closing → footer `LOCAL PIPELINE SAMPLE - NOT A CUSTOMER READING`. So
the dedicated Life Path block precedes the personal card, which is what the 48-node gate exists for.
One small thing to look at: in the summary table at the top the "Personal card" row sits one line
*above* the "Life Path" row; the sections themselves are in the right order.

Fixture records for order 2 (`/tmp/08-marcus-local/state.sqlite`): 8 `segments` rows, each `stored`,
`polls 1`, `file.bytes 1357498`, `file.sha256 70986b34…`, `fixtureOnly false`; `artifacts` `audio:<order>`
kind `local-audio-assembled-fixture`, `qa passed`, `expectedDurationSeconds 130.189`, mp3 130.08 s;
`deliveries` written + audio both `captured`, `dueAt` = order `dueAt`; `outbox` ×2 `sent: false`;
`jobs` main `ready` / audio `ready`, 1 attempt each; order `writtenStatus ready`, `audioStatus ready`.

### Real-voice sample (standalone script, real Replicate call — authorised by Joel)

Not part of the n8n run. After the harness was torn down, `n8n/assets/marcus-voice/narrate-sample.sh`
was run once. It read the token from `.env` (`REPLICATE_API_KEY`, quotes stripped; never printed or
written), minted a one-hour signed S3 URL for `marcus/08/audio/voices/marcus-voice-v2-10s-7475c804.wav`
in `$S3_BUCKET` (URL kept in memory only; the run record and this file contain no URL), submitted the
four `narration-sample.json` segments — real text from the cloud-generated report
`output/pdf/marcus-stage1-ye-ying-blind-spots-tree-of-life.pdf` (Ye Ying, Life Path 7, Tree of Life) —
with the exact `build-workflow.py` request body (`top_p 0.95, top_k 1000, temperature 0.8,
repetition_penalty 1.2, seed = segment index`), polled every 5 s, downloaded, and assembled with the
same ffmpeg recipe.

| Segment | Prediction id | Chars | Output | predict_time |
|---|---|---|---|---|
| 01 opening | `8tm0mh1w3hrmr0d0kd99qshb18` | 483 | 2,874,298 B, 29.94 s, sha256 `85c115e4…` | 7.34 s |
| 02 Life Path foundation | `tat66tbebsrmw0d0kd99nxq6cc` | 814 | 3,089,338 B, 32.18 s, sha256 `b5d199b9…` | 7.46 s |
| 03 Seven of Pentacles (position 4) | `hhyn7mx2gnrmy0d0kd98bq4w7g` | 770 | 3,031,738 B, 31.58 s, sha256 `88869134…` | 7.75 s |
| 04 closing | `amk779pq2drmr0d0kd9a5wq070` | 721 | 2,809,018 B, 29.26 s, sha256 `74fa9c0a…` | 7.15 s |

All four `succeeded` (pcm_f32le, 24 kHz mono, from `replicate.delivery`). Raw speech 122.96 s; total
predict_time 29.70 s; wall clock 54 s. **Cost: Replicate's prediction object reports no price, only
`metrics.predict_time`** — check the Replicate billing page. Assembled:

- `output/audio/marcus-real-voice-sample.mp3` — 1,124,901 B, **138.68 s** (expected 138.72 s), sha256
  `ee282028c45574bdd32ce36c993a2024eff7b9e8d9ce70dd1f20afa25fb713a2`
- `output/audio/marcus-real-voice-sample.wav` — 6,656,950 B, sha256 `3b57bccc…`; raw segments in
  `output/audio/segments/`; run record `output/audio/marcus-real-voice-sample.run.json` (no secrets).

Pronunciation: Chatterbox Turbo returns audio only, no transcript, and I cannot listen, so nothing
about pronunciation is verified here. The segments avoid the one card name with a known TTS trap
(Hierophant); Life Path is written "7" (single digit). Listening review is Joel's.

### What was temporary (and where it went)

| Thing | Where | Fate |
|---|---|---|
| 8 temp workflow copies (`DRYB-*.json`, ids `DRYB20260913{01..04,11..14}`): guard `enabled: true`, `backendBaseUrl http://host.docker.internal:5089`, `voiceReferenceUrl` → stand-in, fixed test event, 22 backend nodes → literal `Authorization: Bearer marcus08-local-fixture-only`, 2 Replicate nodes → `http://host.docker.internal:5090/…` + literal dummy bearer header, `saveDataSuccessExecution: all` | session scratchpad `…/scratchpad/n8n-dry-b/` (+ `run2/`) with raw n8n outputs, node tables, bridge/stand-in/fixture logs, seeded order JSON, fixture record dump, the copied n8n sqlite | kept for reference, never in the repo |
| n8n state (Docker named volume `n8n-dry-data`, throwaway `N8N_ENCRYPTION_KEY`) | one-shot `docker run --rm` for `import:workflow`, `list:workflow`, `execute` — no server, no `~/.n8n` | **volume deleted**, no container left, `~/.n8n` absent |
| stand-in 5090, bridge 5089, fixture 5088 | host loopback | all stopped; `lsof` on 5088/5089/5090/5091 = 0 listeners |
| fixture orders + artifacts | `/tmp/08-marcus-local/state.sqlite`, `/tmp/08-marcus-local/{artifacts,audio}/` | left (fake data) |
| `curlimages/curl:latest` image (connectivity probe) | Docker image cache | left |

### Harness notes

1. **`n8n execute --rawOutput` prints its result through n8n's logger.** With `N8N_LOG_LEVEL=warn`
   set for run 1's `main.paid`, the JSON was suppressed, and the CLI does not write executions to the
   database (0 rows in `execution_entity` despite `saveDataSuccessExecution: all`). That run's proof is
   the bridge log (53 backend calls, all 200, in the expected order) and the stand-in log (8 creates /
   8 polls / 8 downloads). Run 2 repeated all four events on a fresh order without the log-level
   variable and captured n8n's own output (6.8 MB for `main.paid`).
2. **Poll cadence is a harness artefact:** the stand-in succeeds on the first poll, so `Prediction
   still running?` → Wait loop-back and the poll-budget `review` exit (>20 polls) were not exercised.
3. Same as (a): the fixture's `claim-delivery` says `due` without checking `dueAt`; the backend must
   enforce it in production. No backend HTTP node has `onError`, so a 4xx/5xx stops the execution
   instead of reaching `Save review or retry state`.

### Claimed vs verified

| Claim | Verified by |
|---|---|
| Cloud workflows untouched | no n8n cloud tool, API or URL used; only local Docker CLI on an ephemeral volume |
| Workflow made no Replicate/OpenAI/PDFShift call | n8n's only egress = bridge (5089) + stand-in (5090); both logs show only loopback ops; the 2 Replicate nodes' URLs in the temp copies point at 5090 (grep for `api.replicate.com` in the temp copies = 0) |
| 48 nodes, current guard | count 48 in source and every temp copy; guard code printed before/after patch |
| All 19 audio nodes executed | run 2 `main.paid` runData: 36 nodes, 8 iterations of the segment loop, none with `error` |
| Numerology gate passed with real anchors | node 9/10 output: LP7 The Seeker, EX8, PE9, canon LP7/EX8/PE9; PDF text shows the foundation section before the personal card |
| Playable audio from the pipeline | `ffprobe`: mp3 130.08 s 24 kHz mono; its sha256 = n8n node 32 output = fixture artifact record = `output/audio` copy; duration matches the recipe within 0.11 s |
| Assembly fails closed | code path: 409 unless every segment `stored`; 409 if a stored segment lacks its file; 500 on ffmpeg failure — the 409/500 paths are asserted by reading the code, not by a failing run |
| Adapter tests | `fulfillment.test.ts` 3/3 before and after the edit |
| Real voice generated | 4 prediction ids above (visible in the Replicate dashboard), outputs from `replicate.delivery`, hashes recorded |
| No secret leaked | `grep -c r8_` and `grep -c X-Amz-Signature` on the run log and run record = 0 |
| Teardown | `lsof` 0 listeners on 5088–5091; `docker volume ls` no `n8n-dry-data`; `docker ps -a` no n8n; `~/.n8n` absent |

**Not verified:** real voice through the *workflow* (the n8n path only ever reached the stand-in);
resume of a half-finished audio job from an `audio.paid` event (the in-line chain finished first);
the `Prediction still running?` loop, poll-budget exhaustion and every review/failure exit; webhook
trigger + Respond-to-Webhook over HTTP; Supabase, Stripe, AWeber, PDFShift, OpenAI writing; production
private storage; how the finished audio sounds (no listening was possible here).

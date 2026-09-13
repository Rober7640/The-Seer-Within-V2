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

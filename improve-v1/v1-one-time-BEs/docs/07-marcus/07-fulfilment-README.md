# 07 — the fulfilment workflow, as importable n8n JSON

**Why JSON and not a built workflow:** the n8n **MCP** on this instance cannot create workflows.
The **public REST API can**, and it is a separate door — see *Two ways in* below. Either way the
workflow is authored here as JSON, which is the better artefact anyway: it lives in git, it reviews
as a diff, and it survives whoever owns the n8n login.

| | |
|---|---|
| **The workflow** | [`07-fulfilment.n8n.json`](./07-fulfilment.n8n.json) — 26 nodes, imports **inactive** |
| **The source** | [`scripts/build-07-n8n.py`](../../scripts/build-07-n8n.py) — ⛔ edit this, never the JSON |
| **Regenerate** | `python3 scripts/build-07-n8n.py` |
| **Push it to n8n** | [`scripts/push-07-n8n.py`](../../scripts/push-07-n8n.py) — REST API, never activates |
| **The plan it implements** | [`n8n-fulfilment-plan.md`](./n8n-fulfilment-plan.md) |

⛔ **Nothing here is live.** The workflow imports inactive and four of its steps point at
endpoints that do not exist yet.

---

## Two ways in

| Door | Can it create a workflow? |
|---|---|
| **The MCP** (`/mcp-server/http`) | **No** — read + execute only. Details below |
| **The public REST API** (`/api/v1/workflows`) | **Yes.** It answers `401 'X-N8N-API-KEY' header required`, not 404, so the API is enabled. It has been able to create workflows since long before the MCP builder tools existed, so the instance-version question does not apply here |

### Pushing it over the API

1. n8n → **Settings → n8n API → Create an API key**.
2. Put it in the **repo-root `.env`** — gitignored, and where every other operator script in this
   repo reads its secrets from:
   ```
   N8N_API_KEY=n8n_api_...
   N8N_BASE_URL=https://ezyabsorb.app.n8n.cloud
   ```
3. `python3 scripts/push-07-n8n.py --dry-run` → then without the flag to create it.

⛔ **The API is fussier than the UI importer.** It takes only `name`, `nodes`, `connections`,
`settings` and rejects `active`, `tags`, `pinData` with *"request.body should NOT have additional
properties"*. The `.n8n.json` keeps those fields because Import-from-File wants them; the push
script strips them. ⛔ It never activates anything — activation is a separate endpoint and a
deliberate human act.

## The MCP cannot build this itself

Checked live, 2026-09-03, against `ezyabsorb.app.n8n.cloud`.

| Question | Answer |
|---|---|
| Can the MCP create a workflow? | **No.** It exposes three tools — `search_workflows`, `get_workflow_details`, `execute_workflow` |
| Is it project-scoped? | **No.** That was the other hypothesis and it is ruled out — a scoping limit would still show the full toolset. `search_projects` is absent entirely, so this is the *old* MCP surface, not a filtered new one |
| What would a current instance expose? | ~40 tools, including `validate_workflow`, `create_workflow_from_code`, `update_workflow` |
| What version is needed? | Create/update landed in **2.14.0** (beta); n8n recommends **2.18.4+** |
| What version is this? | **Unknown — it cannot be read from outside.** `/rest/settings` returns the trimmed public payload with no `versionCli`, and the frontend bundle does not bake the version in. Read it in the UI: **Help → About** |

**`search_workflows` returning 0 does not mean the instance is empty.** On this surface only
workflows individually toggled *"Available in MCP"* are listed.

### ⚠ Whichever door you use, it may be the wrong instance

The live fulfilment for offers 02–06 runs in **Mike's** n8n, triggered by Stripe and filtered on
`body.data.object.metadata.product` — the codebase calls that string load-bearing in six places.
The connected instance shows zero workflows. Confirm whose instance this is **before importing**;
importing into a personal or empty instance puts the workflow somewhere the live funnel never reaches.

---

## What it does

Stripe says paid → load the stored draw → write it one position at a time → grade it →
render a PDF with the cards in it → hold to the SLA → tag AWeber, which is the send.

The three decisions worth knowing:

- **It never draws cards and never reads the clock.** It loads the stored draw by `spread` +
  `draw_date` — the same record the email and the booking page rendered from.
- **One model call per position, then one to join them.** A single call for 2,600 words drifts:
  the voice loosens and the later cards come out thinner than the early ones.
- **On a failed grade it regenerates once, then sends anyway.** Operator's call. The log is the
  entire mitigation, and it only works if somebody reads it — **daily, for the first two weeks**.
  ✅ *Fixed 2026-09-03:* the first failure used to bypass the log entirely, so a fail-then-pass
  recorded `pass: true` and no reason. Node **9c · Log the first failure** now catches it.

---

## Before it can run

### 0 · ✅ Two bugs found and fixed in the workflow *(2026-09-03)*

Replaying `4 · Build the brief` against `07-P1`'s real counts, for all seven days and all
three tiers. Full working and the proposed fix: [`07-spread-registry.md`](./07-spread-registry.md).

| | Fix |
|---|---|
| **The floor of 6 counted paid positions**, but `07-P1`'s floor is on the spread's **total** — its Total column is 6·8·6·7·9·7·12, and the booking page sells Tuesday as 8/13/18, which is paid *plus* free. **Mon, Wed, Thu and Sat threw on every $35 order** | ✅ counts `free + paid` |
| **Thursday and Saturday bought their own spread twice.** Tier 2 added The Undertow's five and Thursday *is* The Undertow; tier 3 added The Other Chair's five and Saturday *is* The Other Chair | ⭐ **Dissolved by 07-C5, not patched.** No rung adds a named spread any more, so nothing can be the day's own cut. Thursday keeps its $57 and Saturday its $87 |

### ⭐ Node 4 is on the 07-C5 question ladder *(moved 2026-09-04)*

**A rung is how many of HER questions Marcus answers off one morning's cut.** Answer 1 is the
day's spread. Every answer after it is the whole table read again against her next question,
plus **three of the morning's six OPEN cards** — cut off the same deck, in the same minute,
with no positions written on them.

| Rung | Key | She types | Passages n8n writes |
|---|---|---|---|
| The Spread · $35 | `spread` | one question | the day's paid positions |
| The Second Question · $57 | `pattern` | two | + 3 open cards |
| The Third Question · $87 | `table` | three | + 3 more, and a closing passage that reads the three answers against each other |

⛔ The three tier KEYS are unchanged. Stripe, `be_orders.tier` and every test read
`spread` / `pattern` / `table`; only what they mean changed.
⛔ **Deleted from node 4:** `IS_SPREAD`, `resolve()`, `blocks`, `skipped`, `ORDER`, `cheaper`
and its throw. The bug they guarded stopped existing.
⛔ **n8n is still spread-blind.** It reads a stored draw record, never a spread name and never
the registry. The only thing taken from `scripts/07-spreads.json` is the three OPEN position
`job` strings, and they are written into node 4 at BUILD time by `scripts/build-07-n8n.py`.

✅ Verified by `node scripts/test-07-brief.mjs`, which runs the real Code node out of the
generated JSON against all 7 spreads × 3 rungs and asserts every fan-out equals what
`scripts/07-registry.mjs` `resolve()` sold. It also asserts that a paid second question with
no text **holds the order** instead of inventing one.

### 1 · Three things that do not exist yet

*(Was five. Reading the live Evelyn flow removed two — see **The integrations are copied,
not invented** below.)*

| Missing | Where | Note |
|---|---|---|
| `be_marcus_daily` product key | `shared/backendOffers.ts` | `BackendOfferKey` is still `'twin-flame' \| 'judgement-day'`. n8n exact-matches this string; it must match byte for byte |
| `GET /api/be/07/fulfilment/:sessionId` | server | Returns the order row **joined to the stored draw**. Shape below |
| `POST /api/be/07/grade-log` and `/delivered` | server | ⛔ the log is the mitigation for "send anyway"; `/delivered` writes `reading_url` + `delivered_at` back |

### 1a · ⭐ The integrations are copied, not invented

Every external call is lifted from **`UaLPiVVs7j5jzNyO` — "V1 in V2 · Energy Clearing
Reading · Cosmo"**, which is ACTIVE and fulfilling real orders. Read it before changing any
of them.

| Step | What the plan doc guessed | What the live flow actually does |
|---|---|---|
| PDF | headless Chromium behind HTTP | **PDFShift** — `api.pdfshift.io/v3/convert/pdf`, Letter, `use_print: true`, cred `pdfshift-header-auth` |
| Storage | AWS S3 + our own signing endpoint | **Supabase Storage**, signed by Supabase's own `/object/sign`, cred `wealth-scriba-customer-report-generator` |
| Delivery | AWeber `POST` create subscriber | **find by email → PATCH** the subscriber, cred `Aweber for Heart Readr` |

⛔ **The delivery one was a real bug.** She is already on the daily list; creating her again
would be wrong and could reset her fields.

⚠ **Supabase returns `signedURL` as a RELATIVE path.** Prefix `SUPABASE_URL/storage/v1` if
the AWeber campaign needs an absolute link.

🔴 **Security, in the live flow and not ours:** three of its nodes have Supabase service keys
(`sb_secret_…`) pasted straight into the node JSON, across two different projects. The same
workflow also does it properly with an env var plus a credential — we copied that one. Those
keys are worth rotating; anyone who can read the workflow has them.

### 2 · `be_orders` has no columns for any of this

The table carries no `spread`, `draw_date`, `tier` or `question`. 07 needs all four, plus the
draw record itself. That migration comes before anything else — the plan's build order is right
that everything depends on the draw record.

**Her question does not travel in Stripe metadata.** Metadata values cap at 500 characters and a
real tarot question runs longer, so the workflow fetches it from our own API instead. That is the
one place this build departs from the plan doc, which assumed a webhook carrying the question.

### 3 · ⚠ The card art may be too small — depending on what the PDF is for

`assets/tarot-rws/` is at the **repo root** (not under `improve-v1/`). 104 PNGs, 18MB — 82 upright
plus 22 reversed. The S3 JPGs at `evelyn/tarot-rws/` are converted from these by
`scripts/host-be-asset.cjs`.

| Count | Size |
|---|---|
| 95 | 350 × 600 |
| 5 | 408 × 700 |

At 300dpi that is **1.2 inches** wide, against a real tarot card's 2.75. Beside a paragraph on a
screen that is fine. Printed, it is soft. ⭐ **Decide whether the PDF is a screen document or a
printable one before commissioning a rescan** — that is the open question, not "where is the art".

⛔ **No card back in that directory.** The 22 `-reversed` files are rotated faces. The only back is
`marcus/card-back.jpg` on S3, with no local copy — which is what `build-07-daily.py` points the
emails at.

### 4 · Environment variables

`OPENAI_API_KEY` · `APP_BASE_URL` · `BE_FULFILMENT_TOKEN` · `SUPABASE_URL` ·
`SUPABASE_BUCKET` · `AWEBER_ACCESS_TOKEN` · `AWEBER_ACCOUNT_ID` · `AWEBER_MARCUS_LIST_ID`

⭐ **`OPENAI_API_KEY`, not `ANTHROPIC_API_KEY`, since 2026-09-06** — the three model calls moved
to GPT. In the workflow itself the key is an n8n **credential**, never an env var; the env var is
only for `scripts/dryrun-07-reading.mjs`. Setup: [`07-openai-credential.md`](./07-openai-credential.md).

⛔ `PDF_RENDER_URL` is **dead** — PDFShift replaced the self-hosted renderer and no node reads it.
`SUPABASE_URL` and `SUPABASE_BUCKET` were missing from this list (nodes 12 and 12a need them).
⚠ `$env` is BLOCKED on this n8n instance (proved by execution 30129), so non-secret values are
inlined in `scripts/build-07-n8n.py` and secrets are credentials.

Plus AWS credentials on the S3 node (bucket `luna-assets-tsw`, prefix `07/readings/`).
⛔ Never `evelyn/tarot/` — live Evelyn broadcasts point at that prefix.

---

## The payload `/api/be/07/fulfilment/:sessionId` must return

```jsonc
{
  "order_id": "…", "email": "…", "first_name": "Sarah",
  "paid_at": "2026-09-03T22:14:07Z",
  "question":   "…",                    // her words, any length. Box one, always present
  "question_2": "…",                    // ⭐ REQUIRED at tier 'pattern' and 'table'
  "question_3": "…",                    // ⭐ REQUIRED at tier 'table'
  "topic": "love",                      // love | money
  "tier": "spread",                     // spread | pattern | table
  "bump_product_key": "marcus_same_day",// or null
  "email_free_read": "…",               // ⭐ what the email ALREADY said about the free cards
  "draw": {
    "spread_name": "The Two Doors",
    "spread_key":  "the-two-doors",     // carried through for logging. ⛔ The workflow no
                                        //    longer branches on it — a spread invented
                                        //    tomorrow needs no workflow change at all.
    "draw_date": "2026-09-03",
    "day":         [{ "number": 1, "name": "Door one, as it looks from here",
                      "job": "…", "card_name": "The Devil", "reversed": false, "free": true }],
    "open":        [ /* ⭐ THE OPEN SIX. Same cut, same minute, NO position and NO job — the
                        position is written by node 4 from the tier model, in the order the
                        cards came off the cut. { "number": 1, "card_name": "The Tower",
                        "reversed": true } × 6. ⛔ Only the 22 majors have a -reversed scan. */ ]
  }
}
```

`job` is the position's job **verbatim from the registry** — it goes straight into the prompt.
The workflow throws if the DAY SPREAD's total — free plus paid — falls below 6 (`07-P1`: floor
of 6); ⛔ the open cards are deliberately **outside** that count, or a four-card day spread
would pass at the top rung. It also throws if a paid question arrived with no text, and if the
morning drew fewer open cards than the rung needs — **it never re-cuts**.

---

## Smoke-tested for real — and it found two more *(2026-09-03)*

`node scripts/dryrun-07-reading.mjs tue spread` runs one order all the way through the real
Code nodes and the real model calls. Result: [`dryrun-tue-spread.md`](./dryrun-tue-spread.md)
— The Two Doors at $35, six paid positions, a real six-year-waiting question.

**After the three fixes below: 1,184 words against a 1,000 target (18%), grade PASS, ~30s and
about 12k in / 7k out.** ⚠ Before them the same order produced 1,573 words and a fake pass.

### 🔴 The grader was passing everything, because it never got to answer

`max_tokens: 4000` is shared with adaptive thinking. Graded the same reading four times:

| run | stop_reason | thinking | text | verdict |
|---|---|---|---|---|
| 1 | `max_tokens` | 4000 | **0 chars** | unparseable → **passed through** |
| 2 | `max_tokens` | 4000 | **0 chars** | unparseable → **passed through** |
| 3 | `max_tokens` | 4000 | **0 chars** | unparseable → **passed through** |
| 4 | `end_turn` | 1577 | 532 chars | **FAIL** — hedges, aphorisms, word count |

Three times in four the rubric burned the whole budget thinking and had nothing left to write
the verdict with, and the `catch` turned that into `pass: true`. ⛔ The one run that finished
**failed the reading on three rubric lines** — so the fail-open was hiding a true negative, not
a marginal call.

⛔ **Raising `max_tokens` is NOT the fix, and trying it first cost a round.** Adaptive thinking
expands to fill whatever budget it is given: at 12,000 the same grader thought for 10.4k, 11.1k
and 12k tokens and still blanked one run in three. Sonnet 5 **rejects `budget_tokens` with a
400**, so `output_config.effort` is the only lever — and it defaults to `high`, which is what a
yes/no checklist was running at.

✅ Fixed: `output_config: { effort: 'low', format: {…} }`, `max_tokens` back to 4,000. Thinking
dropped from ~11,000 tokens to ~500 and 3 runs in 3 returned a parseable verdict.

### ✅ And rubric line 8 was asking the model to count words

It failed a 1,151-word reading against a 1,000 target — 15%, inside the 20% tolerance. Models
count words badly. The word count is now computed in the request and passed in, so line 8 is
arithmetic on two given numbers. The spurious failure went away and three runs agreed.

⭐ This is exactly the failure this README predicted — *"a silently broken grader looks like a
clean run in every place except the log"*. It is worth knowing it took a real end-to-end run to
see it; the schema itself was fine, and a curl of the schema alone passes.

### 🔴 The positions spent the whole word budget, so every reading overshot

6 positions at 167 words came in on target at 1,045 — and the joiner then adds an opening, the
transitions and a close on top, landing at **1,573 against a 1,000 target, 57% over**. The
joiner was never told there was a target. ✅ Fixed: positions get 70% of the tier's words
(`POSITION_SHARE`), and the joiner is told the remaining 30% is its own.

## Still to smoke-test before activating
1. **One real order through n8n itself**, with the Wait node's 24 hours temporarily shortened.
   The dry run covers the logic and the model calls; it cannot touch Stripe, PDFShift, Supabase
   Storage, AWeber or the Wait node.

## Model IDs

⭐ **Switched to OpenAI 2026-09-06.** `gpt-5.1` writes, `gpt-5.1-mini` grades, both on
`api.openai.com/v1/chat/completions`. Set in ONE place — `MODEL_WRITE` / `MODEL_GRADE` at the top
of `scripts/build-07-n8n.py`.

🔴 **Verify both ids against the account before the first run** — a wrong id is a 404 on every
reading, and the defaults above were not checked against your model list:

```bash
curl https://api.openai.com/v1/models -H "Authorization: Bearer $OPENAI_API_KEY" \
  | python3 -c "import sys,json;[print(m['id']) for m in json.load(sys.stdin)['data']]" | sort
```

⛔ **Reasoning tokens come out of `max_completion_tokens`**, exactly as adaptive thinking did on
Anthropic — where high effort spent the whole ceiling reasoning and returned zero text on 3 runs
in 4, and the parser read the blank as a pass. **The lever is `reasoning_effort`, not a bigger
ceiling.** Grader stays at `low`. Full detail: [`07-openai-credential.md`](./07-openai-credential.md).

*(Was `claude-opus-5` / `claude-sonnet-5` on `api.anthropic.com/v1/messages`.)*

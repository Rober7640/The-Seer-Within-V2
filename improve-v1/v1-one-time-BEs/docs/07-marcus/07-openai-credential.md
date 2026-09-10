# 07 · the OpenAI credential in n8n

**Why this file exists.** The 07 fulfilment workflow made three model calls to Anthropic. On
2026-09-06 the operator moved the writing to GPT. The key is a **secret**, so it lives in an n8n
credential and never in the workflow JSON — an exported workflow with a key in it leaks the key
into this repo.

⛔ **Nothing is wired yet.** `scripts/build-07-n8n.py` carries a placeholder credential id and
`scripts/push-07-n8n.py` refuses to send a workflow that still has one. Work through this once.

---

## What changed, in one table

| | Was | Now |
|---|---|---|
| Endpoint | `api.anthropic.com/v1/messages` | `api.openai.com/v1/chat/completions` |
| Auth | `x-api-key` (credential `anthropic-header-auth`) | `Authorization: Bearer …` (credential `openai-header-auth`) |
| Extra headers | `anthropic-version`, `anthropic-workspace-id` | none |
| Budget field | `max_tokens` | **`max_completion_tokens`** |
| Effort | `thinking` + `output_config.effort` | **`reasoning_effort`** |
| Structured output | `output_config.format.json_schema` | **`response_format.json_schema`** with `strict: true` |
| Prompt caching | `cache_control: ephemeral` on the system block | automatic — no field, but **static content must come first** |
| Reply shape | `content[]` blocks, `type === 'text'` | **`choices[0].message.content`** (a plain string) |

The three nodes that changed: **5b · Write the position**, **7a · Join into one reading**,
**8 · Grade it**. Their three parsers changed with them: 5c, 7b, 8a.

---

## 1 · Create the credential

n8n → **Credentials** → **New** → search **Header Auth** (`httpHeaderAuth`).

| Field | Value |
|---|---|
| **Credential name** | `openai-header-auth` |
| **Name** | `Authorization` |
| **Value** | `Bearer sk-proj-…` |

⛔ **The value is the word `Bearer`, one space, then the key.** The single most common failure
here is pasting the bare key. It gives a 401 that reads exactly like an invalid key, so you go
and reissue a perfectly good one.

Save.

### Alternative, if you would rather not hand-type `Bearer`

n8n ships a predefined **OpenAI** credential (`openAiApi`) that builds the header for you and has
a slot for an organization id. To use it instead, change two lines in the `gpt()` helper in
`scripts/build-07-n8n.py`:

```python
"authentication": "predefinedCredentialType",
"nodeCredentialType": "openAiApi",
```

and swap the `credentials` key from `httpHeaderAuth` to `openAiApi`. Header Auth is the default
here only because every other credential in this workflow is that shape.

## 2 · Get the credential's id

n8n does not print the id in the UI. Open the saved credential and read the browser address bar:

```
https://<your-n8n>/home/credentials/8H0t9TxeiNyZfZbK
                                    └──── this ────┘
```

## 3 · Paste it into the generator

`scripts/build-07-n8n.py`, near the top:

```python
OPENAI_CRED = {"id": "TODO-openai-credential-id", "name": "openai-header-auth"}
#                     ^^^^^^^^^^^^^^^^^^^^^^^^^  replace this
```

## 4 · 🔴 Check the model ids against your account

I could not see your model list, so I set defaults I could not verify:

```python
MODEL_WRITE = "gpt-5.1"        # 5b and 7a — the prose
MODEL_GRADE = "gpt-5.1-mini"   # 8 — the rubric check
```

⛔ **A wrong model id is a 404 on every reading.** List what the account actually has:

```bash
curl https://api.openai.com/v1/models -H "Authorization: Bearer $OPENAI_API_KEY" \
  | python3 -c "import sys,json;[print(m['id']) for m in json.load(sys.stdin)['data']]" | sort
```

Change the two constants if needed. Nothing else in the file names a model.

## 5 · Rebuild and push

```bash
python3 scripts/build-07-n8n.py     # writes docs/07-marcus/07-fulfilment.n8n.json
python3 scripts/push-07-n8n.py      # refuses while any credential id starts with TODO
```

## 6 · Prove the calls before trusting the workflow

`scripts/dryrun-07-reading.mjs` makes the same three calls outside n8n, so a broken body shows up
in seconds instead of inside an execution log. It reads `OPENAI_API_KEY` from the environment or
from an **active** line in the repo `.env`:

```bash
OPENAI_API_KEY=sk-proj-… node scripts/dryrun-07-reading.mjs
```

---

## 🔴 The trap that already cost this offer once, and it did not go away

**Reasoning tokens come out of `max_completion_tokens`.** They did on Anthropic too, as adaptive
thinking, and here is what happened: at high effort, **three runs in four spent the entire ceiling
reasoning and returned zero text** — and the verdict parser's catch turned that blank into
`pass: true`. Raising the ceiling from 4,000 to 12,000 only moved the wall; it still blanked one
run in three.

⛔ **The lever is `reasoning_effort`, never a bigger ceiling.** The port keeps that:

| Node | `reasoning_effort` | `max_completion_tokens` | why |
|---|---|---|---|
| 5b · position | `medium` | 8,000 | a passage is ~140 words; the rest is headroom |
| 7a · joiner | `medium` | 24,000 | up to 2,600 words **and** reasoning, from one budget |
| 8 · grader | **`low`** | 4,000 | a yes/no rubric needs no deep reasoning — this is the fix |

And the silence is now loud. `finish_reason === 'length'` throws in 5b and 7a. The grader still
**fails open** — that is the product rule, "regenerate once, then send anyway" — but it now writes
`UNGRADED — …` into `why`, so `be_07_reading_grades` records that something went out unchecked.
⛔ Do not tidy those strings. That log is the entire mitigation.

## Housekeeping

- `.env` wants `OPENAI_API_KEY` now. `ANTHROPIC_API_KEY` is still used elsewhere in the repo —
  the V1 funnel and the V2 chat service both run on it. ⛔ Do not remove it.
- Set a **spend limit** on the OpenAI project before the first real send. A 76k list behind a
  loop that retries three times per node is not a place to discover a pricing surprise.

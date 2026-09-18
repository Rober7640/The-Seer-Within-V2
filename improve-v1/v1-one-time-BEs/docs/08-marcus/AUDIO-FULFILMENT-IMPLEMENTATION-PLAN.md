# 08 Marcus — Audio + PDF Fulfilment: Implementation Plan

> **Purpose:** a self-contained, executable plan so any session (or developer) can pick up
> the Marcus-08 audio/PDF fulfilment build without re-deriving context. Last updated 2026-09-24.

---

## 1. Architecture (DECIDED)

**Two separate n8n workflows, both triggered by Stripe, decoupled through the database.**

1. **PDF workflow** — fires on the **initial purchase** (the reading).
   - Gate on the Stripe **product name** → proceed only if Marcus-08, else stop the workflow.
   - Generate the reading report (OpenAI) + render the PDF.
   - Upload the PDF to **Supabase Storage** (same n8n HTTP PUT pattern used by existing funnels).
   - **Save the STRUCTURED report (JSON) to the DB** so the audio workflow can use it later.

2. **Audio workflow** — fires on the **audio UPSELL purchase** (a *separate, later* Stripe event).
   - Because audio is an upsell, it fires **well after** the PDF → **no race condition**; the report is already saved.
   - Gate on the Stripe product name → proceed only if the Marcus-08 audio upsell, else stop.
   - Look up the customer's order → **read their saved structured report from the DB**.
   - `POST /api/be/marcus-reading/generate-audio` → poll `audio-status` → get `audioUrl`.
   - Save `audioUrl` into the customer's **AWeber** entry (m8_* content field).

Why the DB in the middle: the two flows never pass data to each other; the PDF flow **writes** the
report, the audio flow **reads** it.

---

## 2. Status: DONE vs TODO

| Piece | Status |
|---|---|
| Audio generation server endpoint (`generate-audio` + `audio-status`) | ✅ **DONE**, live+proven on dev (PR #97 merged to `development`) |
| `server/lib/marcus08Audio.ts` (narration + fal queue + ffmpeg-static + Supabase upload) | ✅ DONE |
| Audio n8n test flow calls the endpoint (POST→poll→audioUrl) | ✅ DONE (id `9SWkiOnrCH6VztpD`, sample report) |
| **`be_orders.reading_report` (jsonb) column** | ⬜ TODO (schema + db:push to dev) |
| **`save-report` endpoint** (PDF flow → DB) | ⬜ TODO |
| **`get-report` endpoint** (audio flow ← DB) | ⬜ TODO |
| PDF n8n flow: product gate + read real order + save report + PDF→Supabase | ⬜ TODO (today uses manual test inputs) |
| Audio n8n flow: product gate + fetch report from DB (not sample) + AWeber write | ⬜ TODO (currently sample report, no AWeber) |
| Stripe triggers on both flows | ⬜ TODO |

---

## 3. Reference facts (so nothing needs re-discovery)

- **Dev base URL:** `https://the-seer-within-v2-development.up.railway.app`
- **Endpoints** (mounted under `/api/be/:offer/…`, offer = `marcus-reading`, in `server/routes/beFulfilment.ts`):
  - `POST /api/be/marcus-reading/generate-audio` — body `{ fileName, report, voiceUrl? }` → `202 { jobId }`
  - `GET  /api/be/marcus-reading/audio-status/:jobId` → `processing | done (audioUrl) | error`
- **Auth:** every `/api/be/…` call needs `Authorization: Bearer <BE_FULFILMENT_TOKEN>`.
- **Railway dev env vars (all set):** `FAL_AI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BE_FULFILMENT_TOKEN`.
- **n8n creds:** `BE Fulfilment (dev)` = `47WIHYBv4f0n4w8C` (Bearer token); fal cred `ZmDX3I35qOL1f06f` (only used by the old test-lane generator, not needed once the server does audio).
- **n8n workflows (cloud `ezyabsorb.app.n8n.cloud`):** PDF = `MctR7dHIVo8wTpOS`, Audio = `9SWkiOnrCH6VztpD`.
- **Supabase storage:** bucket `BE_Reading`, audio path `08-marcus/audio-reading/<file>.mp3`, PDF path `08-marcus/reading/<file>.pdf`. Upload = `PUT {SUPABASE_URL}/storage/v1/object/BE_Reading/<path>` with **`apikey` header** (the `sb_secret_…` key is NOT a JWT — Bearer-only fails "Invalid Compact JWS"). Public URL = `.../object/public/BE_Reading/<path>`.
- **DB:** Drizzle, `server/lib/db.ts` (uses `DATABASE_URL`). Tables `be_orders`, `be_order_intake`, `be_08_draws`, `be_08_editions` in `shared/schema.ts`. Reading text today = `be_orders.reading_body` (flat prose; do NOT store JSON there).
- **S3 helper (existing, for other assets):** `server/lib/s3Upload.ts`. Not used for audio — audio uses Supabase.
- **Structured report shape** (what `generate-audio` needs; produced by the PDF flow's write-report stage):
  `{ title, theme, opening, lifePathApplication, personalCardHeading, personalCardReading, synthesis, conclusion, sections:[{positionNumber, cardName, positionLabel, body}] }`

---

## 4. Build steps (in order)

### Step 1 — Storage column
- Add `readingReport` → `be_orders.reading_report` (jsonb, nullable) in `shared/schema.ts`.
- `npm run db:push` to the dev Supabase (and later prod).
- **Accept:** column exists; `npm run build` clean.

### Step 2 — Two endpoints (in `server/routes/beFulfilment.ts`, same Bearer-auth style)
- `POST /:offer/save-report` — body `{ sessionId, report }` → validate `sessionId` (cs_…) + report (opening+conclusion) → `UPDATE be_orders SET reading_report = report WHERE …session`. Idempotent (overwrite ok).
- `GET /:offer/report/:sessionId` — returns `{ ready: true, report }` if saved, else `{ ready: false }` (so the audio flow can proceed/poll). No PII in logs.
- Unit-test the validators like `server/lib/marcus08Audio.test.ts`.
- **Accept:** build clean; local smoke (POST save-report then GET report round-trips).

### Step 3 — PDF n8n flow (`MctR7dHIVo8wTpOS`)
- Add a **product-name gate** (from the Stripe trigger / order lookup) → stop if not Marcus-08.
- After the report is produced + PDF rendered: upload PDF to Supabase (HTTP PUT, `apikey` header) → PDF URL; and **POST the structured report to `save-report`**.
- (Replace manual test inputs with real order data from the fulfilment GET keyed by the Stripe session.)
- **Accept:** a run saves the PDF to Supabase AND `be_orders.reading_report` is populated.

### Step 4 — Audio n8n flow (`9SWkiOnrCH6VztpD`)
- Add a **product-name gate** → stop if not the Marcus-08 audio upsell.
- Replace the sample-report node with a **`GET /report/:sessionId`** call (retry a few times if `ready:false`, though as an upsell it should already be there).
- Keep the existing `generate-audio` → poll → `audioUrl` chain.
- Add a final step: **write `audioUrl` to the customer's AWeber entry** (m8_* field; see the AWeber memory for lists/fields).
- **Accept:** upsell purchase → audio generated → audioUrl in AWeber.

### Step 5 — Stripe triggers
- Give both flows a Stripe trigger (or the webhook receiver) filtered to the Marcus-08 product; PDF on the initial line item, audio on the upsell. Memory: add `payment_intent.succeeded` matching `be_08_marcus_audio`.
- **Accept:** a test-mode paid walk fires the correct flow end-to-end.

---

## 5. Guardrails / gotchas
- **Never push/commit without explicit user permission** (see memory `ask-before-pushing`).
- Work on a branch off `origin/development`; PR base MUST be `development` (repo default is `Production` — the create-PR link defaults wrong). 08 is on development only, NOT Production.
- Trim env vars in code if convenient — a trailing space in `SUPABASE_URL` on Railway broke the first live run ("Failed to parse URL …co /storage").
- fal Chatterbox garbles long text → keep ≤480-char segments (already handled in `marcus08Audio.ts`).
- Reload the n8n browser tab after any API edit (stale tab runs the old version).

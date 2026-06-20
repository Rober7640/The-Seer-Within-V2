# Luna Voss daily-email × Kit × S3 — Resume Prompt

Paste the block below into a fresh Claude Code session to continue the work.

---

I'm continuing work on the **Luna Voss daily-email pipeline** that generates send-ready
emails and pushes them to **Kit (ConvertKit)** as drafts, with image assets hosted on
**Amazon S3**. Here's the full state so you don't have to rediscover it.

## What's already done
- **Kit access:** The `kit` MCP is connected (account **cosmonumerology.com**, id 1382925,
  creator plan, timezone America/New_York… note: AWS is in Sydney, see below). The
  `kit-docs` MCP is also connected for the developer docs.
- **Kit API key:** `KIT_API_KEY` is in `.env` and works for the V4 broadcasts endpoint
  (header `X-Kit-Api-Key`, base `https://api.kit.com/v4`). Broadcast creation works with
  the API key — **no OAuth needed**. (Bulk + purchase endpoints would need OAuth.)
- **S3 hosting is live and tested.** Bucket **`luna-assets-tsw`**, region
  **`ap-southeast-2`** (Sydney), public-read bucket policy. IAM user `luna-s3-uploader`
  with policy `LunaS3Put` (s3:PutObject only). `.env` has `AWS_REGION`,
  `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET=luna-assets-tsw`,
  `ASSET_BASE_URL=https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com`.
- **Code changes made:**
  - NEW `server/lib/s3Upload.ts` — `uploadPublicAsset(key, body, contentType)` +
    `s3Configured()`. Reads creds from env (AWS SDK default chain). Sets long immutable
    Cache-Control, no ACL (public via bucket policy).
  - MODIFIED `scripts/build-luna-batch.ts` — uploads each per-day sky map to S3 and points
    the email at the S3 URL; falls back to theseerwithin.com if S3 not configured.
  - MODIFIED `server/lib/lunaEmailAssembler.ts` — after assembly, rewrites
    `https://theseerwithin.com/assets/luna/` → `${ASSET_BASE_URL}/luna/` (scoped to
    /assets/luna/ so the CTA link `theseerwithin.com/luna` is untouched).
  - NEW `scripts/upload-luna-static-assets.ts` — one-time upload of the 3 static assets:
    avatar (real JPEG), footer stamp (rasterized from `wordmark-mark.svg`), masthead
    watermark (rasterized from `constellation.svg`). Already run; assets are on S3.
  - NEW `scripts/_test-s3.ts` — S3 connectivity check (upload + public GET).
  - NEW `scripts/_push-to-kit.ts` — push an assembled `<date>.html` to Kit as a draft.
  - NEW `scripts/_test-template.ts` — build + push ONE template (A or C) for a date.
  - MODIFIED `package.json` — added `@aws-sdk/client-s3`.
  - MODIFIED `.env` / `.env.example` — KIT + AWS placeholders.
- **End-to-end verified.** Two Kit DRAFTS exist (nothing sent), all images load from S3:
  - Template **C** (chart-wheel): broadcast **24645811** →
    https://app.kit.com/campaigns/24645811/draft
  - Template **A** (text-light daily-sky): broadcast **24645834** →
    https://app.kit.com/campaigns/24645834/draft
  - (Deleted the original broken draft 24645744.)

## How to run the pipeline
- Build a batch (template C, uploads sky maps to S3, writes to
  `docs/kit/luna-voss-emails/outbox/`):
  `npx tsx scripts/build-luna-batch.ts <start-date> <days>`  e.g. `… 2026-06-18 7`
- Re-upload static assets only if avatar/SVGs change:
  `npx tsx scripts/upload-luna-static-assets.ts`
- Test S3: `npx tsx scripts/_test-s3.ts`
- Push one email to Kit as a draft:
  `npx tsx scripts/_push-to-kit.ts <date> "<subject>"`
- Build + push one template: `npx tsx scripts/_test-template.ts <A|C> <date>`

## Gotchas I already hit (don't relearn these)
- **theseerwithin.com soft-404s missing assets:** it returns the SPA index.html with
  HTTP 200 + `text/html` (~3945 bytes). A 200 alone does NOT mean an image exists —
  always check `content-type` is `image/*`.
- **Kit draft edit URL format:** `https://app.kit.com/campaigns/<id>/draft` (NOT
  `/broadcasts/<id>`, which 404s).
- **AWS key shape:** access key ID starts with `AKIA` (20 chars); secret is ~40 chars.
  (We repeatedly pasted them swapped — verify the ID starts with AKIA.)
- **Subject personalization:** templates emit `{firstName}`; convert to Kit syntax
  `{{ subscriber.first_name | default: "friend" }}` before pushing.
- **Template B** (`luna-email-template-B-visual-feature.html`) is NOT wired into the
  assembler — only A and C are. Wiring B needs anchor mapping for its visual-feature block.

## Pending / next steps (pick up here)
1. **Wire up Template B** into the assembler (TEMPLATES map + anchor mapping + decide what
   fills its visual-feature slot).
2. **Send-ready blockers** before any real send:
   - Real **CAN-SPAM physical address** (templates still say "123 Placeholder St…").
   - **Luna-branded verified sender** — currently defaults to
     `contact@zodiacnumerology.com`; footer says `hi@theseerwithin.com` (mismatch). Only
     `contact@cosmonumerology.com` has DMARC configured. Set `email_address` in the push +
     verify the address in Kit.
   - **Audience targeting** — drafts currently default to ALL subscribers; use a test
     tag/segment first (`subscriber_filter`).
   - Run each email through the **`persona-email-qa`** agent/gate.
   - Decide **auto-schedule** (`send_at`) vs draft-only.
3. **Housekeeping:** delete the test drafts (24645811, 24645834) when done; confirm the old
   leaked AWS key `AKIA6GJN4WIKUERXHDW7` was deleted in IAM after rotation.

Please start by confirming the S3 + Kit setup still works (`npx tsx scripts/_test-s3.ts`)
and then continue with [WHICH STEP YOU WANT].

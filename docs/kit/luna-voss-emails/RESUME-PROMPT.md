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
  - NEW `scripts/_test-template.ts` — build + push ONE template (A, B or C) for a date.
  - NEW `server/lib/lunaHeroMap.ts` — landscape (544×408) "smart hero" SVG renderer for
    Template B: aspect "two luminaries" (planet1/planet2 + orb) when there's a headline
    aspect, else a moon-phase disc (real illumination, waxing/waning from elongation).
    Exports `buildHeroSvg()` + `heroAlt()`.
  - NEW `scripts/_test-hero.ts` — render hero samples (aspects + every moon phase) to PNG
    for visual QA. NEW `scripts/_render-email.ts` — screenshot a full assembled outbox
    email to PNG.
  - MODIFIED `server/lib/lunaEmailAssembler.ts` — Template B now wired: B in the TEMPLATES
    map, `template: 'A'|'B'|'C'`, new `hero?: {src,alt}` opt + `defaultHero()`, hero
    src/alt region replacement (mirrors C's wheel anchors).
  - MODIFIED `scripts/build-luna-batch.ts` — 4th CLI arg picks template (A/B/C, default C);
    for B it renders the hero, rasterizes, uploads to `luna/hero/<date>.png`, passes `hero`.
  - MODIFIED `package.json` — added `@aws-sdk/client-s3`.
  - MODIFIED `.env` / `.env.example` — KIT + AWS placeholders.
- **End-to-end verified.** Two Kit DRAFTS exist (nothing sent), all images load from S3:
  - Template **C** (chart-wheel): broadcast **24645811** →
    https://app.kit.com/campaigns/24645811/draft
  - Template **A** (text-light daily-sky): broadcast **24645834** →
    https://app.kit.com/campaigns/24645834/draft
  - Template **B** (visual-feature hero, aspect mode = Moon □ Mars): broadcast **24646513** →
    https://app.kit.com/campaigns/24646513/draft
  - Template **B** (visual-feature hero, moon-disc mode = Full Moon, forced via `… B moon`):
    broadcast **24646862** → https://app.kit.com/campaigns/24646862/draft
  - (Deleted the original broken draft 24645744.)

## Current batch on Kit (2026-06-20 → 09-17, 90 days)
- **90 emails generated + drafted on Kit** — MIX templates (C:53 · B:23 · A:14). Draft ids in
  `outbox/kit-drafts.json`; QA findings in `outbox/QA-REPORT.md`; part-1 (30d) manifest/index
  archived as `outbox/*_part1.*`, current `manifest.json`/`INDEX.md` = the 60-day part 2.
- **Engine timing-accuracy fix shipped + 14 days regenerated** (see Gotchas). Standing
  send-gates still open (real address, Luna DMARC sender, audience) — NOT send-ready.

## How to run the pipeline
- Build a batch (uploads images to S3, writes outbox + INDEX.md + manifest.json):
  `npx tsx scripts/build-luna-batch.ts <start> <days> [A|B|C|MIX] [auto|aspect|moon]`
  e.g. `… 2026-06-20 30 MIX` · `… 2026-06-29 1 B moon` (force moon disc — see note below).
- Draft a built batch on Kit (reads manifest.json, exact subjects, draft-only):
  `npx tsx scripts/push-batch-to-kit.ts [from-date] [to-date]`
- Regenerate specific days after a fix + UPDATE their existing Kit drafts in place:
  `npx tsx scripts/regen-days.ts <date> [date...]`  (template per date from kit-drafts.json)
- Pre-QA audit (deterministic; flags day-early phase/station claims, no AI/web):
  `npx tsx scripts/_audit-batch-events.ts <start> <days>`
- Preview a built email as a PNG: `npx tsx scripts/_render-email.ts <date>`
- Re-upload static assets only if avatar/SVGs change: `npx tsx scripts/upload-luna-static-assets.ts`
- Test S3: `npx tsx scripts/_test-s3.ts`
- Push/build ONE: `npx tsx scripts/_push-to-kit.ts <date> "<subject>"` ·
  `npx tsx scripts/_test-template.ts <A|B|C> <date>`

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
- **Template B is now wired** (`luna-email-template-B-visual-feature.html`). Its hero is a
  data-driven "smart hero" (see `lunaHeroMap.ts`), NOT the square chart-wheel. Build it with
  `npx tsx scripts/build-luna-batch.ts <start> <days> B`. Caveat: the content generator emits
  a full-length body, but B's design calls for a SHORT 2–4 line body — see follow-up below.
- **Moon-disc mode almost never fires on its own.** Over a 45-day scan, every day had a
  headline aspect, so the smart hero renders the *aspect* "two luminaries" essentially always.
  On the 12 major moon-phase days the headline is usually the phase-defining Sun–Moon aspect
  (Full = Sun ☍ Moon, New = Sun ☌ Moon), so the aspect hero already encodes the phase. To see
  the moon disc, force it: `… B moon`. Possible enhancement: make Full Moon / quarters PREFER
  the moon disc (skip New Moon — it renders nearly black). Aspect-type spread over 45 days:
  Opposition 12 · Square 11 · Conjunction 9 · Trine 8 · Sextile 5 — so there's real day-to-day
  visual variety already.
- **Engine labels phases/stations ±1 day (FIXED in the generator).** `getDailySky` buckets
  the moon phase by a ~±1-day-wide elongation window, and the retrograde flag flips ~1 day
  before some canonical stations (e.g. Neptune). So "[Phase] today" / "stations today" copy
  could be a day off. Fixed: `dailySkyEditor.planDay` now computes `phaseExact` + an accurate
  `timingNote` ("EXACT today" vs "building — exact tomorrow" vs "around now"), and the
  generator has a TIMING ACCURACY hard rule. `scripts/_audit-batch-events.ts` flags any
  residual cases deterministically. If you regenerate, always pass `prev` (regen-days does)
  so `phaseExact` can see the neighbouring days.
- **Pushing to Kit — pass the subject explicitly and convert `{firstName}`.** `_push-to-kit.ts`
  takes the subject as an arg (the subject lives in Kit's field, not the HTML). The INDEX.md
  subject column is field 4 of the row — don't grab the wrong column. `_test-template.ts`
  auto-converts `{firstName}` but regenerates the copy; `_push-to-kit.ts` ships the exact
  outbox HTML.

## Pending / next steps (pick up here)
1. ✅ **Template B is wired** (smart hero: aspect "two luminaries" or moon-phase disc).
   Follow-up: the Haiku content generator emits a full-length body, but B's layout wants a
   SHORT 2–4 line body — add a body-length mode to `generateLunaDailyEmail` (or a B-specific
   trim in the assembler) so B reads as a punchy hero card, not a wall of text.
2. **Send-ready blockers** before any real send:
   - ✅ **CAN-SPAM physical address DONE** — real address baked into templates + assembler
     default + all 90 live Kit drafts + the Luna follow-up sequence email:
     `The Seer Within, 930 Washington Avenue, Suite 210-109, Miami Beach, FL 33139, USA`
     (`scripts/fix-address.ts` does the swap everywhere if it ever changes).
   - **Luna-branded verified sender** — currently defaults to
     `contact@zodiacnumerology.com`; footer says `hi@theseerwithin.com` (mismatch). Only
     `contact@cosmonumerology.com` has DMARC configured. Set `email_address` in the push +
     verify the address in Kit.
   - **Audience targeting** — drafts currently default to ALL subscribers; use a test
     tag/segment first (`subscriber_filter`).
   - Run each email through the **`persona-email-qa`** agent/gate.
   - Decide **auto-schedule** (`send_at`) vs draft-only.
3. **Housekeeping:** delete the test drafts (24645811, 24645834, 24646513, 24646862) when done;
   confirm the old leaked AWS key `AKIA6GJN4WIKUERXHDW7` was deleted in IAM after rotation.

Please start by confirming the S3 + Kit setup still works (`npx tsx scripts/_test-s3.ts`)
and then continue with [WHICH STEP YOU WANT].

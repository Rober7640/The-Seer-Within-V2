# Evelyn Cross — AWeber daily emails (14-day test kit)

Build of the **14-day sustainability test** from [`../evelyn-daily-email-handover.md`](../evelyn-daily-email-handover.md) (the planning doc, now alongside this build under `docs/aweber/`), for the AWeber list `theseerwithin_free` (~59k). Core device = **a rough pencil sketch from Evelyn's notebook**; daily unit = **a rotating page type** (9 types); conversion rides on top (3–4 "door" days in 14).

## Files
- **`evelyn-day01..14-original-design.html` — THE CANONICAL SEND FILES.** All 14 emails poured into Evelyn's *original* AWeber design (white · Helvetica 16px · header banner · `#0000ff` underlined links · gray rules). Each = hidden preheader → pre-frame line → linked sketch → letter → soft inline link (10 days) or clear CTA (days 6/9/12/14). Each file's top HTML comment carries its **Subject + Preheader + tagged link** for the manual paste. **Paste these into AWeber — the `templates/` files below are earlier design explorations, not the send set.**
- `14-day-emails.md` — all 14 emails, full copy, with per-day sketch subject + (door days) tagged link + lander opener.
- `templates/email-template.html` — reusable AWeber template (placeholders + a deletable DOOR BLOCK).
- `templates/example-day-01.html` — rendered **no-door** day (preview in a browser).
- `templates/example-day-06.html` — rendered **door** day.
- `assets/evelyn-portrait-144.jpg` — Evelyn's masthead portrait (144×144, ~9 KB; from `uploads/avatars/evelyn-cross.png`).

The **masthead** now shows Evelyn's **portrait** (small, round, gold ring) as the *sender identity* — it builds the relationship and, importantly, gives **funnel continuity**: the same face appears in the email → on `/evelyn` → in chat. The daily **pencil sketch stays the hero** (the content); the portrait never competes with it.

## Scaling past the first 14 — the `evelyn-daily` skill
Once the 14-day test is proven, **trigger `/evelyn-daily <count>`** to write the next batch (e.g. 50–60) at the same bar. The skill (`.claude/skills/evelyn-daily/SKILL.md`) carries the recipe — the three locked copy rules (curiosity subject → attention hook → real substance), the voice/guardrails, the page-type rotation + soft/door rhythm, the sketch pipeline, and the QA gate. It reads/updates two files so batches never repeat:
- **`STATE.md`** — rotation log, used situations/sketches/closes, next day index, thread-balance flags.
- **`situation-library.md`** — the situation + fable fuel, each with a mechanism seed; weighted toward the threads the first 14 missed (money, grief, late-life). Extend it when it runs low.

Proven gold-standard copy = `14-day-emails-v3.md`. The skill clones that voice/depth and the `evelyn-dayNN-original-design.html` send format.

## How to run each day (manual — see AWeber note)
1. Take the day's copy from `14-day-emails.md`.
2. **Generate the sketch** (style prompt below); host it (AWeber image manager); web-optimize to **<200 KB**, vertical.
3. Open `email-template.html`, replace `{{PREHEADER}}`, `{{SKETCH_URL}}`, `{{SKETCH_ALT}}`, `{{BODY}}` (wrap each paragraph in `<p style="margin:0 0 16px;">…</p>`). On **no-door** days, delete everything between `DOOR BLOCK START` / `DOOR BLOCK END`. On **door** days, set `{{CTA_URL}}` + `{{CTA_LABEL}}`.
4. Paste the HTML into a new AWeber **broadcast**, set subject, schedule for **~7–8pm recipient-local** (AWeber timezone send if available; else continental-US early evening).
5. Update your `STATE.md` (last page types, last door mechanic, used situations/sketches).

> **AWeber API reality (corrected 2026-06):** AWeber's API **CAN** create + schedule broadcasts — `POST {list}/broadcasts` (fields: `body_html`, `subject`, `body_text`, `click_tracking_enabled`, `is_archived`…) then `POST {broadcast}/schedule` (`scheduled_for`, one ISO-8601 time). Requires the **`email.write`** scope; our current token is subscriber-only, so it needs a **re-auth with `email.write` added**. **BIG CAVEAT:** a broadcast schedule is a **single `scheduled_for` time for the whole list** — **per-subscriber-timezone delivery is NOT available for broadcasts**, only for automated **Campaigns**. So: API automation works for *single-send-time* scheduling; true "8–9pm in everyone's local time" needs timezone-segmented broadcasts (N sends) or a Campaign. Unsubscribe + physical address are auto-appended by AWeber to every broadcast (set address in List Settings). Refs: api.aweber.com · docs.aweber.com.

## Sketch generation — style lock (only `[SUBJECT]` changes)
> *A rough amateur pencil sketch on plain off-white notebook paper, drawn quickly by an untrained hand. Subject: **[SUBJECT]**. Simple naive linework, uneven and slightly wobbly strokes, proportions a little off the way a real person sketches from memory — not a trained artist. Graphite only, no color, minimal shading. Visible paper texture, a faint eraser mark. Honest and unpolished but clearly recognizable and quietly sincere. Vertical, drawing roughly centered with plain margin. No printed text, no signature.*

Per-day `[SUBJECT]`: 1 two hands one cupping the other · 2 an oak and a reed by water · 3 flowers set back on a market shelf · 4 the single word "ENOUGH" large and alone · 5 an open hand palm up · 6 two teacups on a table · 7 a small bird in an open doorway · 8 two chairs turned slightly apart · 9 an empty boat drifting on water · 10 a younger woman at a window · 11 a man's hand holding a handbag · 12 a road forking in two · 13 a pressed gold leaf with a date beside it · 14 a key resting in a lock.

> **Anchor the hand.** Keeping "the same not-very-good hand in the same notebook" across many days is the top execution risk. Lock a style reference (one approved sketch as a reference image / seed), reject anything that drifts polished or illustrated, and regenerate. The sketch *is* the brand container.

## Assets & hosting (S3 — LIVE)
Reuses the existing **`luna-assets-tsw`** bucket (the shared TSW email-asset bucket, region **`ap-southeast-2`**, public-read policy). Evelyn's assets live under an **`evelyn/`** prefix (mirroring Luna's `luna/`). The IAM user `luna-s3-uploader` is **PutObject-only** (can upload, can't list/delete — least privilege).

`.env`: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION=ap-southeast-2`, `S3_BUCKET=luna-assets-tsw`, `ASSET_BASE_URL=https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com`.

**Layout / URLs:**
```
evelyn/portrait/evelyn-portrait-144.jpg     ← UPLOADED + verified live (one file, reused every email)
evelyn/sketches/day-NN-<subject>.jpg        ← ALL 14 UPLOADED + verified (GET 200), <200 KB each
```
> **Sketches: DONE.** All 14 generated via fal `nano-banana/edit` (Day-1 hands as the locked style reference → subject-swapped per day), optimized to <200 KB and uploaded. The canonical send files already point at these live URLs, so they render now. Local masters: `assets/sketches/day-NN-<subject>.jpg`. Generator: `scripts/gen-evelyn-sketches.cjs` — run with `NODE_PATH="$(pwd)/node_modules" node docs/aweber/evelyn-cross-emails/scripts/gen-evelyn-sketches.cjs [day-stem ...]` (no args = all 14; pass stems like `day-05-open-hand` to regenerate just those — S3 PutObject overwrites). Days 4 (`ENOUGH`) & 13 (pressed leaf + date) are the intentional text exceptions.
- Portrait (live): `https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com/evelyn/portrait/evelyn-portrait-144.jpg`
- `{{ASSET_BASE}}` in `email-template.html` = `https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com` (the examples already use the full URL).

**Rules baked in on upload:** `Content-Type: image/jpeg`, `Cache-Control: public, max-age=31536000, immutable`, no per-object ACL (public via bucket policy). JPEG only (never WebP); portrait <15 KB, sketches <200 KB.

**Daily upload flow** (key is PutObject-only, so verify by GET): optimize the sketch (<200 KB) → upload to `evelyn/sketches/<date>-<subject>.jpg` → paste `ASSET_BASE_URL + key` into the broadcast's `{{SKETCH_URL}}`. *(Helper to write next: a small `uploadPublicAsset(key, body, type)` — the Luna branch had `server/lib/s3Upload.ts`; not on `kit` yet.)*

Portrait optimize command (reproduce for updates):
`sips -s format jpeg -s formatOptions 82 -Z 144 uploads/avatars/evelyn-cross.png --out assets/evelyn-portrait-144.jpg`

> **Security:** the previously-leaked key was rotated and **retired/deleted in IAM**, and scrubbed from the docs. The current key is the rotated key on the same user (`luna-s3-uploader`).

## Link scheme — UTM + functional params (review item #2)
**Every link in every email** (hero sketch + soft/CTA link) uses one tagged URL:
`https://www.theseerwithin.com/evelyn/?utm_source=aweber&utm_medium=seerwithin_free&utm_campaign=<id>&bucket=<love|money|purpose>&opener=<opener-id>`

- **`utm_source`/`utm_medium`/`utm_campaign`** — standard UTM, matching Evelyn's *original* AWeber email convention. **PostHog auto-captures these client-side** (`$current_url` → utm props), so these emails report alongside everything else in the funnel investigation. `utm_medium=seerwithin_free` matches the original's exact value.
- **`bucket`** — read server-side by the `/evelyn` lander (`personaLander.ts` zod schema → `evelyn_lander_sessions`) and drives the static opener personalization. **Actively used today.**
- **`opener`** — forward-looking: carries the email's thread into the lander greeting once the lander accepts it (build dependency below). Harmless until then.
- Note: the lander does **not** read `utm_*` server-side, so the in-DB `evelyn_lander_sessions.campaign` column stays null for these sends — PostHog (utm) is the campaign-attribution surface. If you later want server-side per-email attribution too, have `personaLander.ts` also read `utm_campaign`.

Door days (6/9/12/14) additionally carry the `opener` that continues the email's thread instead of greeting cold:

| Day | campaign | bucket | opener-id | lander opener line |
|----:|----------|--------|-----------|--------------------|
| 6 | behind-d6 | purpose | behind-whom | "…Tell me — behind whom? Let's find whose pace you've been racing." |
| 9 | emptyboat-d9 | love | empty-boat | "…Tell me whose boat it was, and let's look at the water together." |
| 12 | fork-d12 | love | the-fork | "…tell me what you're pretending not to know. We'll start there." |
| 14 | lockeddoor-d14 | purpose | locked-door | "…Tell me which door. Let's put a hand to the handle together." |

> **⚠️ Build dependency:** the `/evelyn` lander today only personalizes its opener by `bucket` (`evelynLanderEngine.selectStaticOpener`). Until it accepts `&opener=` and maps these lines, door-day clickers get the generic bucket greeting and the "deepening" promise breaks at the door. Small change (accept the param → one case per opener-id). Ship it before the door days turn on, or keep door days `bucket`-only for the test.

## Voice & guardrail checklist (enforce on every draft — §3)
- Warm, maternal, kitchen-table. `dear` 2–4×, never more. Short, sometimes-halting sentences.
- **Rotate** the intuitive tell ("I can feel…", "I notice…", "there's something here…") — never the same two days running.
- **No** cosmic jargon ("spirit plane", "the cosmos"). **No** orphaned objects (no candle/flame — use notebook/morning beats).
- **Christianity-free:** Aesop / Zen / Taoist / secular-Sufi / folk / nature only. No saints, scripture, angels, prayer, or naming God.
- **Vulnerability guardrail:** comfort is real; no manufactured fear; no promised outcomes about a named person; the door is an honest "more," not a trap.
- **Rule 1:** strip the CTA — is it still an email someone's glad they opened? If not, rewrite.

## Send config
- **Sender:** `hi@theseerwithin.com` (brand inbox), from-name **Evelyn Cross**. *(Confirm SPF/DKIM for theseerwithin.com on AWeber.)*
- **Personalization:** OFF for the test — `dear` carries it. Add `{!firstname}` later via compositing, not per-subscriber gen-AI.
- **Cadence:** daily (7×/wk), with door days only 1 in week one (day 6), 3 in week two.

## Success metrics (§9) — and what's still needed
**Phase 1 (this kit):** can it sustain daily? Track **unsub, spam complaints, open-rate *trend* over 14 days, replies** (replies are the real tell). Flat/slow-decay opens = pass; a cliff = fail. Clicks matter least here.
**Phase 2 (when door days turn on — review item #5):** wire the tagged links above into a read of `evelyn_lander_sessions` → signup → purchase, so this is proven as a *funnel*, not just a beloved newsletter. Watch unsub against the prior **tarot** baseline, not zero (these 59k opted into daily tarot — expect some churn on the format change).

## Review fixes applied vs. open
- ✅ Tagged links + `opener` continuity on door days (copy + table above).
- ✅ Manual-AWeber-send reality stated.
- ✅ Sender locked; voice/guardrails encoded.
- ⬜ **Lander `opener=` param** (build dependency above).
- ⬜ **Expand the situation/fable library** before automating — the §7 seed (10) won't hold 9 page types daily without ~30-day repeats.
- ⬜ **Phase-2 revenue metric** wired to the funnel.

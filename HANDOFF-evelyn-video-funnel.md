# HANDOFF — Evelyn video funnel ($19 Soulmate Initials Reading)

**Start here.** Branch `heygen-funnel`, cut from `origin/development` (`48a7ded1`). Open PRs back into
`development`. **Status (2026-10-12): design only — no code written yet.**

## What we're building
Facebook ad → one page with two AI videos of Evelyn. The viewer taps one of three stones **inside** the
welcome video → the pitch video plays → she buys a **$19 Soulmate Initials Reading** (+ optional $11.11
"charge my stone" add-on) on Stripe → the existing backend upsells (U1 Protection Ritual, U2 Bracelet)
→ thank-you page. About 20 hours later an n8n workflow writes her reading and emails it as a PDF.

## Read in this order
| # | File | What it covers |
|---|---|---|
| 1 | this file | status, where everything is, rules, open items |
| 2 | [`docs/superpowers/specs/2026-10-12-evelyn-video-funnel-design.md`](docs/superpowers/specs/2026-10-12-evelyn-video-funnel-design.md) | **Job A** — pages, video player + tap zones, checkout, upsells, tracking, video hosting, tests. **Build this first.** |
| 3 | [`docs/superpowers/specs/2026-10-12-evelyn-soulmate-initials-n8n-delivery-design.md`](docs/superpowers/specs/2026-10-12-evelyn-soulmate-initials-n8n-delivery-design.md) | **Job B** — the n8n workflow that writes and emails the reading. It reads Job A's order data, so it comes second. |
| 4 | [`docs/evelyn-video-funnel/reference/`](docs/evelyn-video-funnel/reference/) | scripts, competitor walk, video stills (table below) |

## Reference files (on this branch)
All under `docs/evelyn-video-funnel/reference/`.

| File | Why you need it |
|---|---|
| `04-welcome-script.md` | Welcome video script — the current one is the "v2" table at the top |
| `11-video2-script-draft.md` | Pitch script — every promise in it is something the product must deliver (Job B §1) |
| `12-competitor-funnel-pages.md` | The competitor funnel we modelled, with `mia_checkout_top.jpg` / `mia_checkout_footer.jpg` |
| `welcome-at-49s-stones-live.jpg` | Welcome video frame just after the stones go live (48.6s) — check the tap zones against it |
| `scene_03-tap-zones-source.jpg` | The still the tap-zone percentages (Job A §3) were measured from |
| `pitch-at-368s-buy-button.jpg` | Pitch frame where she says "$19" — the buy button appears here (368.2s) |
| `EVELYN_PITCH_v2_contact_sheet.jpg` | Contact sheet of the whole pitch video |

## Files that live on other branches
| What | Where |
|---|---|
| 02 Twin Flame n8n template that Job B copies — `02-fulfilment-OPENAI.n8n.json`, generator `build-02-n8n.py`, lessons `02-HANDOVER.md` | branch **`origin/02-fulfillment`**, under `improve-v1/v1-one-time-BEs/docs/02/n8n/` (not on `development`) |
| 08 numerology Stage-1 node (Job B step 5) | this branch: `improve-v1/v1-one-time-BEs/docs/08-marcus/n8n/08-marcus-numerology-stage1.n8n.json` |

## The videos — on S3 (and the web versions on this branch)
The web versions are already the encodes Job A §8 asks for (H.264 720×1280, ~1 Mbps video + 96k AAC,
`+faststart`, captions burned in), each with a poster JPG made from its first frame. Copies are also in
`docs/evelyn-video-funnel/videos/`.

**Live on S3** — bucket `luna-assets-tsw` (public-read, region `ap-southeast-2`), uploaded 2026-10-12.
Range requests work (206), `Cache-Control: public, max-age=31536000, immutable`.

| File | Length | Size | Key moment | URL |
|---|---|---|---|---|
| Welcome, 720p | 61.5s | 8 MB | stones go live at **48.6s** | https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com/evelyn/vsl/v1/evelyn-welcome-v2-720p.mp4 |
| Welcome poster | — | 0.1 MB | — | https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com/evelyn/vsl/v1/evelyn-welcome-v2-720p-poster.jpg |
| Pitch, 720p | 6:50 | 56 MB | buy button at **368.2s** ("$19") | https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com/evelyn/vsl/v1/evelyn-pitch-v2-720p.mp4 |
| Pitch poster | — | 0.1 MB | — | https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com/evelyn/vsl/v1/evelyn-pitch-v2-720p-poster.jpg |
| Welcome master, 1080p | 61.5s | 51 MB | source only, don't serve | https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com/evelyn/vsl/masters/EVELYN_WELCOME_v2_captioned.mp4 |
| Pitch master, 1080p | 6:50 | 342 MB | source only, don't serve | https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com/evelyn/vsl/masters/EVELYN_PITCH_v2_final.mp4 |

So `EVELYN_VSL_ASSET_BASE` = `https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com/evelyn/vsl/v1` until CloudFront exists (open item 3). The keys are immutable: a
new cut goes to a new prefix (`v2/`), never over these.

⚠ The bucket is in **Sydney** and the ad traffic is **US**. Straight from S3, a US phone waits longer for the
first frame, so CloudFront in front of it still matters before real ad spend.

The videos are final: a re-render costs HeyGen credits, so ask the operator before asking for one.

## Rules — don't break these
- **Never touch the live V1 `/welcome1` or `/welcome2`.** This funnel's U1/U2 are the backend pages
  `/offers/upsell/welcome1|2`.
- The checkout **`readyForMoney` gate stays OFF** until the operator says go.
- Meta Purchase events go **only** to this funnel's products; every other `be_` product stays walled off.
- No countdown timer, no pre-ticked boxes, no subscription, and no reviews until real ones exist.
- Birth date and first name **never** go into Stripe metadata (Job A §5).
- n8n workflow JSON is **generated by a Python script and pushed through the API — never hand-edited.**
  Webhooks only go live when armed from the n8n UI (02 lesson 1).
- Add every new test case to `docs/test-ideas.md` (project rule, see `CLAUDE.md`).

## Open items
| # | Item | Owner |
|---|---|---|
| 1 | **Job B step 12** waits until `paidAt + 20h`, but `paidAt` comes from our app's own Stripe webhook. That webhook and n8n's fire at the same moment, so `paidAt` may still be empty when n8n reads it. Suggested fix: count from the Stripe event's `created` time. **Not decided yet.** | dev + operator |
| 2 | Welcome video's last line — does she say "pick" or "picked"? The script says "pick". Operator to listen. | operator |
| 3 | **CloudFront is still needed** (bucket is in Sydney, traffic is US). Our AWS key can't create it — the IAM user `luna-s3-uploader` only has `s3:PutObject` (per `docs/kit/luna-voss-emails/RESUME-PROMPT.md`). Give the operator exact console steps: distribution on origin `luna-assets-tsw.s3.ap-southeast-2.amazonaws.com`, path `evelyn/vsl/*`, then switch `EVELYN_VSL_ASSET_BASE` to it. | dev → operator |
| 4 | Operator setup for Job B (spec §4): arm the n8n webhook, add a Stripe endpoint → n8n, create the AWeber list + campaign, confirm the Supabase bucket, add an n8n SMTP credential for alerts. | operator |
| 5 | Checkout product image (Job A §4, item 1) is not made yet. | operator |
| 6 | The specs record decisions made with the operator on 2026-10-11/12. The operator handed this over before reading the written specs line by line, so check with them if something looks off. | — |
| 7 | Pitch claims about a real third party ("what he looks like", "strengths and flaws") and "over six thousand women" were flagged. **The operator chose to keep them** — decided, not open. | — |

## Suggested next step
Write a step-by-step implementation plan for Job A from its spec (small tasks, tests first), then build.
Plan Job B once Job A's order row and the `fulfilment/:sessionId` endpoint exist.

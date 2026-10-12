# Evelyn video funnel — pages, checkout, upsells (Job A)

Status: design approved in conversation 2026-10-11/12 · Owner: operator · **Start at
`HANDOFF-evelyn-video-funnel.md` (repo root).** · Delivery of the product is
Job B (`2026-10-12-evelyn-soulmate-initials-n8n-delivery-design.md`).

## 1. Goal
Facebook-ad traffic watches two AI videos of Evelyn, picks a stone **by tapping it in the video**,
watches the pitch, and buys a $19 "Soulmate Initials Reading" — then goes through the existing
Protection Ritual (U1) and Manifestation Bracelet (U2) upsells. Modelled on the competitor funnel
walked on 2026-10-11 (`docs/evelyn-video-funnel/reference/12-competitor-funnel-pages.md`), built in our own code so the stone pick, tracking and checkout are ours.

Videos (finished; not in git — see `HANDOFF-evelyn-video-funnel.md`):
- Welcome — `EVELYN_WELCOME_v2_captioned.mp4`, 61.5s, captions burned in, ends "tap yours below".
- Pitch — `EVELYN_PITCH_v2_final.mp4`, 6:50, captions burned in, cards build up on the table.

## 2. Flow
```
/evelyn/reading  (one page, two videos, no reload)
  welcome video ── from 0:48 stones tappable ──► pick ──► pitch video ── 6:08 buy button
/evelyn/checkout?stone=<rose-quartz|jade|garnet>   sales page → pop-up (email, first name, birth date, add-on)
  ──► Stripe Checkout ($19 [+ $11.11]) ──► U1 Protection Ritual ──► U2 Bracelet ──► /evelyn/thank-you
```
No countdown timer, no subscription, no reviews until real ones exist.

## 3. Page 1 — `/evelyn/reading`
Mobile-first, `max-w-md mx-auto`, 9:16 video box.

**Above the video:** headline "Ready to learn your soulmate's initials?" · line "Press play — Evelyn has
a message for you." (copy rules: say "cards", not "tarot").

**Player** — our own component over a plain `<video playsinline>`:
- Starts **muted autoplay** with a "🔊 Tap for sound" badge; the first tap unmutes and restarts at 0.
  If autoplay is blocked: poster (first frame) + big ▶ "Tap to hear Evelyn".
- No seek bar, no native controls. A tap toggles pause/play. Thin progress line along the bottom.
- **Stone tap zones** — three invisible buttons positioned over the decks as fractions of the video
  box (camera never moves; from `docs/evelyn-video-funnel/reference/scene_03-tap-zones-source.jpg`):

  | stone | left → right | x from–to | y from–to |
  |---|---|---|---|
  | Rose quartz | left deck | 4.3% – 33.3% | 76% – 92.5% |
  | Jade | middle deck | 37.4% – 63.7% | 76% – 92.5% |
  | Garnet | right deck | 68.9% – 97.2% | 76% – 92.5% |

  Inactive (taps fall through to pause/play) until **48.6s** ("These three stones have been waiting
  for you"); then each gets a soft pulsing glow ring and becomes a real `<button aria-label>`.
- **Backup buttons** under the video appear at the same moment: `Rose Quartz · Jade · Garnet`.
- **On pick:** brief glow on that stone (~400ms) → swap the source to the pitch video and play with
  sound (the tap is the user gesture). Stone saved to `localStorage` (`evelyn_vsl_v1`).

**Pitch video:** same player, no tap zones. At **368.2s** (she says "$19") a CTA slides in under the
video: "Get my reading — ~~$74~~ $19" → `/evelyn/checkout?stone=…`. Once shown it stays shown
(flag in `localStorage`, also on return visits).

**Return visits (same device):** stone known → go straight to the pitch, resume at the saved position
(saved every 5s), CTA shown if it was shown before.

**Failures:** welcome video `error`/stalled > 8s → show backup stone buttons at once. Pitch video
`error`/stalled > 8s → show the CTA at once.

## 4. Page 2 — `/evelyn/checkout`
Sales page, Mia's structure, our words. `stone` from the query (fallback: `localStorage`; missing → the
add-on line says "your stone").
1. "Your Soulmate Initials Reading is almost ready." + product image (Evelyn with the cards; made with
   the Codex still pipeline, same look as the videos).
2. Offer box: Soulmate Initials Reading + Heart Block Reading + Past Love Reading — ~~$74~~ **$19 today ·
   one payment · no subscription**. Button "Get my reading" (also in a sticky top bar on scroll).
3. "What's inside": his initials · someone new or someone you know · where and when you're likely to
   meet · what he's like · a picture of your seven-card spread · ask me questions by email.
4. 60-day money-back guarantee block.
5. FAQ: Who is Evelyn? · How and when will I get it? ("by email within 24 hours" — one constant,
   `DELIVERY_PROMISE`) · Is there a monthly fee? (No — one payment) · What if it doesn't resonate?
   (60-day refund, email support).
6. Reviews block — **hidden** until real reviews exist (a data array; empty = not rendered).
7. Footer: support email, entertainment-only disclaimer, Terms · Privacy · Refund.

**Pop-up** (opens from any "Get my reading" button):
- Email · First name · Birth date (native date picker; must be a real date, age ≥ 18, else inline
  message "This reading is for adults 18 and over").
- Add-on, unticked: "**YES, charge my {Stone} for me** — I'll charge your {stone} under tonight's moon
  and seal its energy into your reading, doubling its pull toward him. **Only $11.11**". `{Stone}` from
  the stone map (Rose Quartz / Jade / Garnet).
- "Continue to secure payment" → `beginBackendCheckout()` → Stripe Checkout (card, Apple Pay, Google
  Pay), email prefilled. Errors keep the pop-up open with "Something went wrong — please try again."

## 5. Checkout, order data, upsells
- **Catalog row** in `shared/backendOffers.ts` (key `soulmate-initials`): fixed $19.00, Stripe product
  `be_soulmate_initials`; bump `be_soulmate_initials_charge` $11.11 with a stone-aware label;
  `upsellEntryPath: '/offers/upsell/welcome1'`; `successPath: '/evelyn/thank-you'`; `readyForMoney`
  gate stays **off** until the operator says go; no shipping at the front end.
- **Intake** sent with the checkout request and validated server-side: `email`, `firstName`,
  `dateOfBirth` (ISO, ≥ 18), `stone` (enum). Written to **our order row when the Checkout Session is
  created** (so it exists before payment), which Job B's
  `GET /api/be/soulmate-initials/fulfilment/:sessionId` returns. Stripe session `metadata` carries only
  non-personal keys: `product`, `funnel: evelyn_vsl`, `stone`, `bump`, UTMs (copy rules §7) — birth date
  and first name stay out of Stripe.
- Card saved (`setup_future_usage: off_session` — already how backend checkout works).
- **U1/U2 = the existing backend upsell pages** `/offers/upsell/welcome1|2` (same products as V1
  `/welcome1|2`: `be_protection_ritual` $47, `be_bracelet` $47 / $30 downsell, one-tap charge, Stripe
  fallback page on decline, U1 address form for shipping). **The live V1 `/welcome1|2` are not
  touched** (pointing buyers there would overwrite old conversation rows and fire wrong pixels).
- New upsell copy `client/src/lib/upsellCopy/soulmateInitials.ts`, modelled on `heartCleanser.ts`:
  universal love bucket, every "clearing ritual" line replaced with "your Soulmate Initials Reading",
  static U2 reveal/personalise lines (bracelet stones stay as they are — rose quartz/jade/garnet are not
  on the bracelet), plus a test that walks every reachable string. Row in `BACKEND_UPSELL_PITCH`.
- U2 ends at `/evelyn/thank-you?s=…`.

## 6. Page 3 — `/evelyn/thank-you`
"Thank you, {first name}. Your Soulmate Initials Reading is being prepared." Her stone (and "your
{stone} will be charged tonight" if she bought the add-on), U1/U2 purchases if any, "arrives by email
within 24 hours" (`DELIVERY_PROMISE`), check-spam line, support email.

## 7. Tracking
- **Meta (browser + CAPI, deduped by event id):** PageView on all three pages (add `/evelyn` to the
  `isTrackedFunnel` allowlist) · ViewContent when the pitch starts · InitiateCheckout on "Continue to
  secure payment" · **Purchase** for $19 (+$11.11) · Purchase for U1 and U2.
  Today `resolveStripeEventName` returns null for every `be_` product; add **only** this funnel's
  products (`be_soulmate_initials`, its bump, and U1/U2 when `metadata.funnel = evelyn_vsl`). Browser
  Purchase fires on U1 load with `skipServerRelay`, like `SoulmateUpsellPage`.
- **PostHog** funnel `evelyn_vsl` (`client/src/lib/funnel.ts`): `vsl_view`, `vsl_sound_on`,
  `vsl_stone_pick {stone, via: video|button}`, `vsl_progress {video, pct: 25|50|75|100}`,
  `vsl_cta_shown`, `vsl_cta_click`, `checkout_view`, `checkout_initiated {price_cents, bump}`,
  `purchase_completed` (webhook), `upsell_accepted|declined {step}`.
- AWeber: buyer added to a new list/tag for this product at purchase (Job B emails from it).

## 8. Video delivery
- Re-encode for the web: H.264 720×1280, `+faststart`; welcome ≈ 10 MB, pitch ≈ 50 MB (target
  ~1 Mbps video + 96k AAC). Poster JPG = first frame of each.
- Upload to S3 `luna-assets-tsw` under `evelyn/vsl/v1/`; serve through a **CloudFront** distribution
  (US edges, range requests on). If our AWS key can't create the distribution, give the operator the
  exact console steps. Base URL is one constant (`EVELYN_VSL_ASSET_BASE`).

## 9. Policy items in this job
- `/refund`: add the Soulmate Initials Reading's **60-day money-back** rule (today it says 30 days on
  unused minutes, which contradicts the video).
- No fake countdown, no pre-ticked boxes, no subscription, real reviews only.

## 10. Testing (Playwright + unit; added to `docs/test-ideas.md`)
- Tap zones inert before 48.6s (drive `currentTime`), active after; each stone → pitch; backup buttons.
- Stone carried to checkout: add-on label for all three stones; missing stone → "your stone".
- CTA appears at 368.2s and persists across reload; video `error` → CTA / backup buttons at once.
- Birth-date validation (invalid, under 18, valid).
- Stripe **test mode** end-to-end: $19 + bump → U1 accept → U2 decline/downsell → thank-you;
  intake (first name, birth date, stone, bump) on the order row; only non-personal keys in Stripe metadata.
- Each Meta and PostHog event fires exactly once per action.
- Regression: V1 `/welcome1|2` and other backend offers unchanged (existing suites green).

## 11. Out of scope (Job A)
Writing and sending the reading (Job B, n8n) · answering buyer questions (support inbox, by hand) ·
reviews (none yet) · A/B tests (later, via `useABTest`).

## 12. Open risks
- The pitch says "what he looks like" and "strengths and flaws" (claims about a real third party) and
  "over six thousand women" — flagged in the 2026-10-08 teardown; the operator chose to keep them.
- AWS rights for CloudFront unknown until tried.

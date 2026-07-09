# V1 Funnel Attribution Map — Five Parallel Funnels

**Scope:** The five V1-style funnels that reuse the same chat/upsell components but differ by
entry point, tracking pixel, and Stripe/attribution tagging.
**Goal:** side-by-side map + flag every place they have DIVERGED from being clean parallels (drift).

**Source of truth:** funnel identity is centralized in two config files:
- `shared/funnelConfig.ts` — prefix, Stripe `productSuffix`, `aweberSuffix`, PostHog name, backend `param`.
- `shared/fbPixelConfig.ts` — which FB Pixel each funnel's URL resolves to (browser side).

Everything downstream (routes.ts helpers, facebook.ts, client funnel.ts) routes through those two
files. That's the good news: the plumbing is genuinely parallel. The drift is concentrated in the
**pixel layer**, a few **legacy/dead helpers**, and the **palm** funnel's deliberate structural fork.

---

## How funnel identity flows

1. **Client derives funnel from the URL.**
   - `client/src/lib/funnel.ts:28` `currentFunnel()` → `funnelDefForPath(path)?.param` (`v1-fb` / `v1-fb2` / `v1-gdn` / `v1-palm` / `undefined`).
   - `shared/funnelConfig.ts:43` `funnelDefForPath()` matches by prefix, with a trailing-slash guard so `/fb2` ≠ `/fb` and `/fb-palm` ≠ `/fb`.
   - PostHog name via `getPostHogFunnel()` (`funnel.ts:100`); the palm `sign` param is read separately (`App.tsx:133`).
2. **Client sends `funnel: currentFunnel()`** in the lead + checkout + upsell fetch bodies
   (`useConversation.ts:529,1412`, `useUpsellChat.ts:364,388`, `useUpsell2Chat.ts:428,458,517`).
3. **Server coerces + branches.** `server/routes.ts:182` `parseFunnel()` → `funnelDefForParam()`; helpers
   `fbSuffix` (195), `fbTagSuffix` (200), `fbPosthogName` (206), `funnelPath` (209), `fbifyAweberTags`
   (220), `kitFunnelTag` (233), `landerLabel` (240), `aweberLeadListId` (249). The funnel is persisted into
   **Stripe `metadata.funnel`** (`routes.ts:666,681`) so the webhook + upsell paths recover it.
4. **Pixel is derived independently from the URL** on the browser (`client/src/lib/facebook.ts:27` →
   `getPixelIdForUrl` → `shared/fbPixelConfig.ts`). Server-side CAPI always POSTs to the single
   `FB_PIXEL_ID` env (`server/lib/facebook.ts:8,100`); per-funnel server routing is done in Stape sGTM
   by an `event_source_url`-contains trigger, not in code.

---

## Comparison Table

| Dimension | **root** (V1 email) | **fb** | **fb2** | **fb-palm** | **gdn** |
|---|---|---|---|---|---|
| **Landing route → component** | `/` → `LandingPage` (`App.tsx:150`) | `/fb` → `LandingPage` (`:160`) | `/fb2` → `LandingPage` (`:168`) | `/fb-palm` → **`PalmBridge`** (`:177`) + `/fb-palm/b`,`/fb-palm/c` (`:178-179`) | `/gdn` → `LandingPage` (`:188`) |
| **Chat / U1 / U2 / success** | `/chat`,`/welcome1`,`/welcome2`,`/success` (`:151-154`) | `/fb/*` (`:161-164`) | `/fb2/*` (`:169-172`) | `/fb-palm/*` (`:180-183`) | `/gdn/*` (`:189-192`) |
| **All 4 inner routes reuse** | ChatPage / UpsellPage / Upsell2Page / SuccessPage | ← same | ← same | ← same | ← same |
| **Backend `funnel` param** | `undefined` | `v1-fb` | `v1-fb2` | `v1-palm` | `v1-gdn` |
| **FB Pixel (browser)** | `446814716830295` (default) | `446814716830295` (default — no fbPixelConfig entry) | **`738651185965027` (SHARED w/ soulmate)** (`fbPixelConfig.ts:35-40`) | `446814716830295` (default — no entry, deliberate `fbPixelConfig.ts:41-45`) | `446814716830295` (default — no entry) |
| **FB events fired** | PageView/Lead/IC/Purchase/Upsell (client + CAPI) | ← same | ← same | ← same | ← **same (fires FB events despite being Google traffic)** |
| **Stripe FE product name** | `Energy Clearing Ritual` | `… - FB` | `… - FB2` | `… - PALM` | `… - GDN` (`routes.ts:593`, `fbSuffix`) |
| **Stripe U1 product name** | `Volcanic Stone (aka Black Lava)` (legacy) | `Protection Ritual + Volcanic Stone - FB` | `… - FB2` | `… - PALM` | `… - GDN` (`routes.ts:1392-1394`) |
| **AWeber base tag** | `seer-within` | `seer-within-fb` | `seer-within-fb2` | `seer-within-palm` | `seer-within-gdn` (`fbifyAweberTags`, `aweberSuffix`) |
| **AWeber lead list env** | `AWEBER_LIST_ID` | `AWEBER_LIST_ID_FB` → fallback shared | `AWEBER_LIST_ID_FB2` | `AWEBER_LIST_ID_PALM` | `AWEBER_LIST_ID_GDN` (`aweberLeadListId:249`) |
| **Kit tag** | `v1` | `fb` | `fb2` | `palm` | `gdn` (`kitFunnelTag:233`) |
| **Resend `lander` label** | `homepage` | `fb` | `fb2` | **`fb-palm`** | `gdn` (`landerLabel:240`) |
| **Resend segment env** | `…_HOMEPAGE` | `…_FB` | `…_FB2` | **`…_FB_PALM`** | `…_GDN` (`resendAudience.ts:40`) |
| **PostHog funnel** | `v1` | `fb` | `fb2` | `palm` | `gdn` |
| **Price variant pool** | null-funnel variants | `*_fb` scoped | `*_fb2` scoped | `*_palm` (+ `35_palm_u47`) | `*_gdn` scoped (`priceVariant.ts:139` `scopeVariantsToFunnel`) |
| **Special-casing** | none (baseline) | none beyond suffixes | pixel share only | **major: bridge lander, `/b`+`/c`, custom chat opener, `sign`/`hook`/`thumb`, `PALM_REFLECT`** | fires FB pixel + `gclid` Google Ads conv |

Consistent across ALL five: same 4 inner components; funnel flows client→server→Stripe metadata→webhook
identically; the deterministic FB `event_id` scheme (`purchase_*`, `upsell_u1_*`, `upsell2_*`) is shared so
Pixel+CAPI dedup; PostHog `purchase_completed` derives funnel from metadata (`webhooks.ts:833`).

---

## Divergence Findings (where they are NOT clean parallels)

### D1 — Pixel separation is incomplete AND fb2 borrows the soulmate pixel (DRIFT / attribution risk)
**`shared/fbPixelConfig.ts:17-46`**
The premise "each funnel on its own pixel" holds for **exactly one** funnel, and even that one is not its
own: **fb2 reuses the soulmate pixel `738651185965027`**. root, fb, fb-palm, and gdn ALL share the default
pixel `446814716830295`.
- Consequence: **fb2 browser-side** PageView/Lead/IC/Purchase land on the **soulmate** pixel, cross-mixing
  fb2 traffic into soulmate pixel data. (Server CAPI is separated in sGTM by `event_source_url`-contains
  `/fb2`, but the client Pixel is not.)
- Consequence: root, fb, fb-palm, gdn are **indistinguishable at the pixel level** — they only separate via
  `event_source_url` in Events Manager / Custom Conversions, not by pixel.
- The `fb` and `fb2` comments each rationalize this, but relative to the stated design ("own pixel per
  funnel") it is drift. **Confirm with operator** whether fb2-on-soulmate-pixel is still intended.

### D2 — Client `isFbFunnel()` is dead code with a comment that contradicts live behavior (DRIFT)
**`client/src/lib/funnel.ts:21-24`** vs **`client/src/pages/SuccessPage.tsx:172-178`**
`isFbFunnel()` (returns true only for fb/fb2) is **never called anywhere in the client**. Its doc comment
claims it gates "the 'Upsell2' event name that must NOT fire for the Google /gdn funnel." The **live gate**
(`SuccessPage.tsx:174`) uses `currentFunnel()` — truthy for **gdn AND palm** — so gdn/palm **do** fire the
`Upsell2`/`upsell2_<session>` id (which is correct, and matches the server webhook). The dead helper's
comment describes the *opposite* of current behavior and will mislead the next reader.

### D3 — Two different `isFbFunnel` functions with DIFFERENT semantics (foot-gun / naming drift)
**`client/src/lib/funnel.ts:21`** (fb + fb2 only) vs **`server/routes.ts:189`** (ALL ad funnels incl gdn +
palm: `funnelDefForParam(funnel) !== null`). Same name, opposite breadth. The server one is the load-bearing
one (gates U1 product-name choice at `routes.ts:1392`); the client one is dead (see D2). Rename or delete the
client copy to remove the collision.

### D4 — Upsell-1 product NAME diverges by more than the suffix (asymmetric; intentional but breaks prefix-matching)
**`server/routes.ts:1392-1394`**
root/V1 U1 = `"Volcanic Stone (aka Black Lava)"`; every ad funnel = `"Protection Ritual + Volcanic Stone - <suffix>"`.
So the ad-funnel names are **not** "root name + suffix" — they're a different string. FE product IS a clean
`base + suffix` (`routes.ts:593`), but U1 is not. Finance reconciliation that assumes "strip the suffix to
get the base product" will mis-bucket U1 for V1 vs ad traffic. Documented as intentional (keep V1 receipts
byte-identical), but it is a real break from clean-parallel.

### D5 — Palm is a deliberate structural fork, not a URL-prefixed clone (intentional; largest divergence)
**`App.tsx:177-183`, `useConversation.ts:294-324`, `client/src/content/palmReads.ts`, `server/lib/prompts.ts:727-739`**
Unlike fb/fb2/gdn (which are pure prefix clones of root), fb-palm:
- renders **`PalmBridge`** at its root, not `LandingPage`;
- adds **two extra lander routes** `/fb-palm/b` and `/fb-palm/c` that no other funnel has;
- injects a **custom chat opener** keyed on `sign`/`hook`/`thumb` query params, plus a `PALM_REFLECT`
  conversation state (`client/src/types/chat.ts:7`) for the Version-C interactive read;
- carries palm-specific price variants (`35_palm`, `35_palm_u47` — `funnelConfig.ts:56`).
All intentional (it's the quiz bridge), but it means "five clean parallels" is really "four parallels + one
fork." Any audit that assumes palm behaves like fb must special-case it.

### D6 — Palm's identifier token is inconsistent across systems (minor DRIFT)
Same funnel, three different tokens: PostHog/Kit/AWeber use **`palm`** (`aweberSuffix "-palm"`, kit `palm`),
but Resend `lander` + segment use **`fb-palm`** (`landerLabel = prefix.slice(1)` → `resendAudience.ts:40`
→ `RESEND_SEGMENT_ID_FB_PALM`), while the AWeber per-lander list env is `AWEBER_LIST_ID_PALM`
(`aweberLeadListId:252`, from `posthog.toUpperCase()`). fb/fb2/gdn are internally consistent
(prefix == posthog == token); **only palm's prefix ("fb-palm") differs from its token ("palm")**, so its
Resend naming is out of step with its AWeber/Kit/PostHog naming. Easy to wire the wrong env var.

### D7 — GDN (Google traffic) fully reuses the Facebook pixel + CAPI (possible drift — confirm intent)
**`App.tsx:110` (`location.startsWith('/gdn')` → `trackPageView`)**, **`server/lib/facebook.ts:256,286,418`**
Because `funnelDefForParam('v1-gdn')` is truthy, the **Google Display Network** funnel fires server-side FB
`Lead` (`fireLeadEvent`), FB `Purchase`/`Upsell2` (`fireStripePurchaseEvent`), and the client fires FB
PageView/Lead/IC/Purchase on the **default FB pixel** — in addition to its `gclid` → `fireGoogleAdsConversion`
path. Whether double-reporting Google traffic into Meta is intended is unclear; the `isFbFunnel`-naming
suggests the "FB" behaviors were generalized to "any funnel" without carving Google out. **Confirm with
operator.**

### D8 — `<noscript>` pixel fallback is hardcoded to the default pixel for ALL funnels (minor)
**`client/index.html:66-69`**
The no-JS `<img>` PageView beacon hardcodes `id=446814716830295`. For a JS-disabled **fb2** visitor this
fires PageView to the **default** pixel, not fb2's soulmate pixel — a small inconsistency with D1's routing.
Low impact (no-JS share is tiny) but not a clean parallel.

---

## Quick verdict
- **Genuinely parallel & healthy:** routing, Stripe FE suffix, AWeber/Kit tags, PostHog names, price-variant
  scoping, event-id/dedup scheme. Adding a funnel = one `FUNNELS` entry + optional pixel entry + routes.
- **Real drift to fix:** D1 (fb2/soulmate pixel share + incomplete separation), D2+D3 (dead & colliding
  `isFbFunnel`), D6 (palm token inconsistency).
- **Intentional-but-note:** D4 (U1 name), D5 (palm fork), D7 (GDN on FB pixel), D8 (noscript pixel).

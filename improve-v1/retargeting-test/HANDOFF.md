# HANDOFF — /fb-tarot retargeting offer page

Branch `feat/tarot-retarget-offer`, based on `origin/development`. Not merged, not deployed, not live.
Line refs below are against this branch (2026-10-19).

---

## 1. What it is

A one-page offer for women who **turned a card on `/fb-tarot` and left without buying**. A
retargeting ad (Evelyn, ends on "Evelyn is waiting for you") sends them to:

```
/fb-tarot/b?src=retarget&hook=<hook>      (/fb-tarot?src=retarget renders the same page)
```

- Same product as the funnel's main offer, the **Energy Clearing Ritual**, at the
  **returning-reader price: $30** (14% off the tarot funnel's $35).
- Copy is **love or money**, picked from `hook` (`hookToBucket`, `client/src/content/tarotReads.ts:7044`;
  money = `MONEY_HOOKS`, `:7037`). Unknown/missing hook → default hook (`cards-honest`) → love.
- No cards, no chat, no quiz. Two buy blocks, one required first-name field (pre-filled from her
  earlier chat on this browser if `seer_conversation` has one). **No email is sent at checkout**;
  Stripe collects it.
- The ad side (copy rules, video board) is in `01-copy-rules.md` and `video/`. It is not part of
  this code change.

## 2. The flow, end to end

| Step | What happens | Where |
|---|---|---|
| Offer page | `TarotBridge` renders `TarotRetargetOffer` for any `src=retarget` visit (the quiz never mounts, so its `seer_conversation` wipe never runs) | `client/src/pages/TarotBridge.tsx:61` |
| Buy click | POST `/api/checkout` with `src:'retarget'`, `retargetPage:'offer'`, `returnTo:'lander'`, `funnel:'v1-tarot'`, `bucket`, `firstName`, `tarotHook`, `tarotDeck:'return-mhf'`. No email, no price | `client/src/lib/retargetBuy.ts:63-81` |
| Server: marker | `src` → closed set (`'recovery'`/`'retarget'`, else null); `rtfmt:'offer'` only for retarget + exact `'offer'` | `server/routes.ts:948-956`, `shared/orderBump.ts:369`, `shared/retargetCheckout.ts:107` |
| Server: price | `resolveCheckoutVariant`: retarget + marker on v1-tarot → `30_tarot_rt` ($30, downsell $25, U1 $47). Retarget without marker → `35_tarot`. Everything else unchanged | `server/routes.ts:1217`, `shared/retargetCheckout.ts:149`, `shared/fixedFunnelPrices.ts:56` |
| Server: Stripe | Line text "Personalized reading for you" if no name; PI description `… - Retarget`; `src` + `rtfmt` on PI and session metadata | `server/routes.ts:1390`, `:1455-1460`, `:1478-1481`, `:1526-1530` |
| Gateway | No email ⇒ always Stripe, never the Payments.AI split | `server/lib/paiLive.ts:164` |
| Cancel | Back to `/fb-tarot/b?src=retarget&hook=<hook>&cancelled=1` (cancelled note, scrolls to the offer) | `server/routes.ts:1490-1495`, `shared/retargetCheckout.ts:184` |
| Webhook | `src==='retarget' && !metadata.email` runs the same V2 account migration as the no-optin arm (email from `customer_details`). `noemail` is NOT set, so no `noemail` AWeber tag / " - No email" marker | `server/routes/webhooks.ts:1214-1215` |
| U1 `/fb-tarot/welcome1` | Unchanged live page/copy/price ($47). The Stripe fallback in `/api/upsell/user-data` creates her row from `customer_details.email`; it also warms the retarget cache | `server/routes.ts:2183`, `:2212`, `:2283` |
| U2 `/fb-tarot/welcome2` | `/api/upsell2/user-data` adds `retarget:true` + `retargetBucket` and blanks `concern`/`personName`. The page swaps the two AI beats (reveal + stone) for fixed love/money copy; `/api/upsell2/reading` is never called | `server/routes.ts:3271-3305`, `client/src/pages/Upsell2Page.tsx:193`, `client/src/lib/upsellCopy/retargetUpsell2.ts:33,47,80` |
| U2 downsell | Unchanged ($30) | — |
| Upsell orders | 1-click and fallback, U1 and U2, inherit `src` + `rtfmt` from the main session | `server/routes.ts:2807-2809`, `:3004-3005`, `:3522-3524`, `:3819-3820` |
| Thank-you `/fb-tarot/success` | `/api/luna-ty/handoff` → Evelyn (15 free min) instead of Luna, with `retarget:true`; card drops "she already knows your reading" | `server/routes.ts:2436-2450`, `server/lib/evelynThankyouGift.ts:62`, `client/src/pages/SuccessPage.tsx:45,373` |
| `/evelyn` arrival | 15-min gift once; reading brief = first name, love/money, came back via the returning-reader offer, ritual facts, upsells taken, and "what you do NOT know" | `server/lib/evelynThankyouGift.ts:120`, `:157`, `:317`, `:374`, `:408` |

### Gates

| Gate | Rule |
|---|---|
| $30 price | `src:'retarget'` **and** `retargetPage:'offer'` **and** funnel `v1-tarot`. Only the offer page sends the marker. A chat URL carrying `src=retarget` never gets $30 |
| Post-purchase (U2 copy, thank-you, brief) | The order's own Stripe Checkout Session: paid, `metadata.src==='retarget'`, `metadata.funnel==='v1-tarot'` (`server/lib/retargetOrder.ts:49`). Looked up once per session, cached (5000 entries). Only rows with no price variant or a tarot one are ever looked up (`:70`). `txn_…` (Payments.AI) ids are never looked up. A failed lookup = normal buyer |

No schema change, no new column: her `conversations` row carries no marker (deliberate, see the
header of `server/lib/retargetOrder.ts`).

### Stripe metadata written (main order)

| Key | Value |
|---|---|
| `src` | `retarget` |
| `rtfmt` | `offer` |
| `priceVariant` | `30_tarot_rt` (attributes to v1-tarot via `funnelParamFromPriceVariant`) |
| `funnel` / `product` / `bucket` / `firstName` | `v1-tarot` / `energy_clearing_ritual` / `love`\|`money` / her name |
| `email` | **absent** (checkout sends none) |

### Guaranteed unchanged for everyone else

- Every order without `src:'retarget'`: same price path, same metadata (keys absent, not empty),
  same PI description, same cancel URL. Recovery (`src=recovery`) is byte-identical
  (`srcMetadata`, `shared/orderBump.ts:381`). Unit tested.
- `/fb` thank-you brief + greeting: byte-identical (golden fixture
  `server/lib/__fixtures__/evelynTyBrief.fb.golden.json`).
- Non-tarot buyers never trigger a Stripe lookup. Normal tarot buyers: AI U2 reveal + Luna, as before.
- The live V1 chat is untouched: `client/src/hooks/useConversation.ts` and `client/src/pages/ChatPage.tsx`
  equal `origin/development`. `v1Checkout.ts` is a copy of the chat's hand-off, not a refactor of it.
- The normal `/fb-tarot/b?hook=…` quiz is unchanged (spec-tested).

## 3. File map

| File | What |
|---|---|
| `shared/orderBump.ts` | `normaliseSrc`, `srcMetadata`, `CheckoutSrc`, ` - Retarget` marker |
| `shared/fixedFunnelPrices.ts` | NEW. `FIXED_FUNNEL_PRICES` (moved from priceVariant.ts) + `RETARGET_OFFER_PRICES` |
| `shared/retargetCheckout.ts` | NEW. Marker, price precedence, `rtfmt` metadata, line text, cancel path, percent |
| `server/lib/priceVariant.ts` | Imports the fixed-price table from shared (no behaviour change) |
| `server/lib/paiLive.ts` | `src` type widened; upsell metadata uses `srcMetadata` |
| `server/routes.ts` | Checkout (src, price, metadata, cancel URL), upsell inheritance ×4, U1 cache warm ×2, U2 user-data, thank-you handoff |
| `server/routes/webhooks.ts` | V2 account migration for a no-email retarget buyer |
| `server/lib/retargetOrder.ts` | NEW. Post-purchase gate + cache |
| `server/lib/evelynThankyouGift.ts` | Thank-you persona choice, gift lookup, retarget reading brief |
| `client/src/pages/TarotBridge.tsx` | `src=retarget` → offer page |
| `client/src/pages/TarotRetargetOffer.tsx` | NEW. The page |
| `client/src/content/tarotRetargetOffer.ts` | NEW. Page copy (love/money) — source of truth |
| `client/src/lib/tarotRetarget.ts` | NEW. URL/hook/bucket/stored-name helpers |
| `client/src/lib/retargetBuy.ts` | NEW. Tracking + `/api/checkout` body |
| `client/src/lib/v1Checkout.ts` | NEW. Checkout hand-off (copy of the chat's) |
| `client/src/lib/tarotAttribution.ts` | Retarget visits ignore `deck=` in attribution |
| `client/src/lib/upsellCopy/retargetUpsell2.ts` | NEW. Fixed U2 reveal + stone copy — source of truth |
| `client/src/pages/Upsell2Page.tsx` | Passes `copyOverride` for retarget buyers |
| `client/src/pages/SuccessPage.tsx` | Evelyn card line for retarget buyers |
| `server/lib/retargetCheckout.test.ts` | NEW. Unit: checkout rules |
| `server/lib/retargetOrder.test.ts` | NEW. Unit: gate, scope, cache |
| `server/lib/retargetUpsellInheritance.test.ts` | NEW. Unit: upsell inheritance + tripwire on the 4 routes.ts sites |
| `server/lib/evelynThankyouGift.test.ts` + `__fixtures__/evelynTyBrief.fb.golden.json` | Unit: persona, briefs, /fb golden |
| `client/src/lib/upsellCopy/retargetUpsell2.test.ts` | NEW. Vitest: U2 override |
| `tests/fb-tarot-retarget.spec.ts` | NEW. Playwright: offer page (9 tests) |
| `tests/fb-tarot-retarget-post-purchase.spec.ts` | NEW. Playwright: U1/U2/thank-you + control (3 tests) |
| `playwright.fb-tarot-retarget.config.ts` | NEW. Sandbox-only config, no `webServer` |
| `docs/test-ideas.md` | Checklist incl. the unverified real-Stripe items |
| `improve-v1/retargeting-test/**` | README, copy rules, copy review docs, `page/screens.mjs` + 29 screenshots, video docs |

## 4. Run it locally (muted sandbox)

⚠ `.env` `DATABASE_URL` is **PRODUCTION**. Dev and prod share one DB. Never point a test at it.

Full sandbox recipe: `.claude/skills/v1-funnel-audit/SKILL.md` (§ sandbox). Short version:

```bash
# 1. Local Postgres on 127.0.0.1:5433, db "seer" (see the skill for first-time setup)
# 2. Muted env: sandbox DB, all 20 outbound integrations empty, no live Stripe key
node scripts/make-sandbox-env.mjs
grep ^DATABASE_URL .env.sandbox        # must print postgresql://postgres@127.0.0.1:5433/seer
# 3. Schema → SANDBOX only. Pass DATABASE_URL explicitly (drizzle.config.ts loads no dotenv)
DATABASE_URL=postgresql://postgres@127.0.0.1:5433/seer DOTENV_CONFIG_PATH=.env.sandbox npx drizzle-kit push
# 4. Server on 5066. VITE_POSTHOG override: the sandbox empties the key, which disables
#    posthog-js; the spec spies on posthog.capture, so it needs posthog initialised
#    (the spec aborts all *.posthog.com traffic, nothing is sent).
DOTENV_CONFIG_PATH=.env.sandbox PORT=5066 VITE_POSTHOG_API_KEY=phc_local_capture_only npx tsx server/index.ts
# 5. Page: http://127.0.0.1:5066/fb-tarot/b?src=retarget&hook=cards-return   (money: hook=cards-nest-egg)
```

The sandbox has **no Stripe key** (`make-sandbox-env.mjs` keeps only an `sk_test_` key; prod `.env`
has none). Checkout cannot complete there. For §5 put an `sk_test_…` key and a `stripe listen`
webhook secret into `.env.sandbox` by hand.

| Command | Expected on this branch |
|---|---|
| `npx tsx --test server/lib/retargetCheckout.test.ts server/lib/orderBump.test.ts` | 103 pass |
| `npx tsx --test server/lib/retargetOrder.test.ts server/lib/retargetUpsellInheritance.test.ts server/lib/evelynThankyouGift.test.ts` | 24 pass |
| `npx vitest run client/src/lib/upsellCopy/retargetUpsell2.test.ts` | 5 pass |
| `npm run test:price` | 149 pass |
| `npx tsc --noEmit -p .` | 46 errors, all pre-existing (same count as `origin/development`) |
| `LOCAL_BASE_URL=http://127.0.0.1:5066 npx playwright test --config=playwright.fb-tarot-retarget.config.ts` | 12 tests. **Last run green on the pre-rebase branch, not yet re-run on this branch** — run it first |
| `LOCAL_BASE_URL=http://127.0.0.1:5066 node improve-v1/retargeting-test/page/screens.mjs` | Regenerates `page/screens/offer-*.png` (the spec writes `post-*.png`) |

Run unit tests with a dead `DATABASE_URL` (e.g. `DATABASE_URL=postgresql://x@127.0.0.1:1/none`)
so nothing can reach prod by accident; the files above need no DB.

The post-purchase spec seeds two rows in the sandbox DB (hard-wired to `127.0.0.1:5433`) and stubs
only the server's Stripe-derived retarget answer (no Stripe in the sandbox). See its header.

## 5. ⚠ NOT verified — your first job: a real Stripe TEST-mode walk

Everything so far is unit tests + Playwright with `/api/checkout` intercepted. Walk this with a
test key in the sandbox (or a staging deploy with test keys), love and money hook once each:

- [ ] Offer page → Stripe: session total **$30.00**; line item "Energy Clearing Ritual - TAROT",
      description "Personalized reading for <name>"; PI description ends ` - Retarget`.
- [ ] Session **and** PI metadata: `src=retarget`, `rtfmt=offer`, `priceVariant=30_tarot_rt`,
      `funnel=v1-tarot`, `product=energy_clearing_ritual`, `bucket`, `firstName`; **no** `email`, **no** `noemail`.
- [ ] Cancel in Stripe → back on `/fb-tarot/b?src=retarget&hook=<hook>&cancelled=1`, cancelled note shown.
- [ ] Webhook: order marked paid; V2 account migration runs for the no-email buyer
      (`customer_details.email`); no `noemail` AWeber tag.
- [ ] `/fb-tarot/welcome1`: the Stripe fallback creates the row; U1 shows $47; **1-click charge on
      the saved card** works; U1 PI metadata has `src=retarget` + `rtfmt=offer`.
- [ ] `/fb-tarot/welcome2`: fixed reveal + stone copy (from the **real** session, no stub);
      no `/api/upsell2/reading` request; U2 $47 and downsell $30 both charge; both PIs carry `src`/`rtfmt`.
      Also try the decline-U1 path and a fallback checkout (card declined → hosted checkout) for both upsells.
- [ ] `/fb-tarot/success`: Evelyn card (not Luna), "She knows what you came back for…";
      link `/evelyn?…campaign=v1-ty-evelyn`.
- [ ] `/evelyn` arrival: 15 min granted **once** (reload doesn't double it); first message uses the
      retarget brief (name, love/money, the ritual; under 35 words; no price; never claims to remember what she said).
- [ ] n8n fulfilment (Mike's flow): receives `firstName`, `bucket`, `product` as before and does not
      choke on the new `src`/`rtfmt` values or the missing `metadata.email`.
- [ ] PostHog `purchase_completed.price_variant = '30_tarot_rt'`.
- [ ] Control: a normal `/fb-tarot/b` purchase is $35 and goes U2-AI → Luna, as before.

## 6. Go live

1. Merge `feat/tarot-retarget-offer` → `development`, then the normal production deploy.
2. **No DB migration needed**: no file under `shared/schema.ts` or `migrations/` changes on this branch.
   No new env vars. No Stripe price objects (the checkout uses inline `price_data`).
3. Nothing to flip in `/admin`: the old chat/letter/offer format A/B test was removed; every
   `src=retarget` visit gets the offer page.
4. Ad URL: `https://<prod-domain>/fb-tarot/b?src=retarget&hook=<hook>` — use the hook of the ad
   she originally clicked (love hooks e.g. `cards-return`; money hooks from `MONEY_HOOKS`). Do not
   add `deck=` (ignored). Audience: `/fb-tarot` visitors who did not purchase.

## 7. Known issues — found, NOT fixed (operator's call; these are live for everyone today)

| Issue | Where |
|---|---|
| Live U2 shared copy says "the shadow" (Path B, declined U1) — the offer page never uses that word | `client/src/lib/upsell2Messages.ts:69` (U1 also: `client/src/lib/upsellMessages.ts:66` "old shadows") |
| Live U1/U2 lines assume a chat she never had ("during our reading", "what you told me earlier", "energy signature from our conversation"). Kept by decision; first suspect if retarget U2 take-rate is low | listed in `page/05-post-purchase-copy.md` |
| The **/fb** thank-you brief says "nothing physical is sent" without limit — wrong for /fb buyers who took the lava stone or bracelet. The retarget brief scopes it to the clearing | `server/lib/evelynThankyouGift.ts:346` (/fb) vs `:385` (retarget) |
| A retarget buyer who also has an older /fb purchase gets the /fb brief (by design; `latestFbPurchase` wins) | `server/lib/evelynThankyouGift.ts:297-298` |
| Pre-existing: `playwright.fb-tarot-draw.config.ts` has 15 failures on `development` already. Not caused by this branch | — |
| Pre-existing: `tsc` 46 errors, same set as `development`, incl. `client/src/pages/Upsell2Page.tsx:161` (`sid` is `string \| null` in `trackGAdsPurchase`; same line is `:156` on development) and `server/storage.ts` | — |
| Compliance: the page makes **no guarantee or refund claim, by design**. Separately, the live V1 chat promises "my 30-day guarantee … every penny returned" (`client/src/hooks/useConversation.ts:2208`) and badges say "30-Day Guarantee" (`client/src/components/PurchaseCTA.tsx:16`), while `/refund` only offers a 30-day refund on unused minutes (`client/src/pages/RefundPage.tsx:45`). Pre-existing conflict | — |

## 8. Copy

| Copy | Source of truth | Review doc |
|---|---|---|
| Offer page (love + money) | `client/src/content/tarotRetargetOffer.ts` | `page/04-offer-copy.md` |
| U2 fixed beats + Evelyn's retarget brief | `client/src/lib/upsellCopy/retargetUpsell2.ts`, `server/lib/evelynThankyouGift.ts:374` | `page/05-post-purchase-copy.md` |
| Ads | — | `01-copy-rules.md` (binding brief), `video/` |

Rule: **copy changes go through the review docs.** Edit the TS source, update the matching review
doc (it quotes the TS word for word, with word counts and checks), re-run `page/screens.mjs` + the
specs, and get operator sign-off before merging. Don't edit live V1 copy (`upsellMessages.ts`,
`upsell2Messages.ts`, `upsellCopy/v1.ts`) to fit retarget buyers — six live funnels read it.

# retargeting-test — V1 non-buyer retargeting

## Current state (2026-10-16)

**One page: the offer page.** Women who turned a tarot card on `/fb-tarot` and left without
buying are sent by a retargeting ad to:

```
/fb-tarot/b?src=retarget&hook=<hook>        (/fb-tarot?src=retarget works too)
```

Every `src=retarget` visit sees the same page. Evelyn says she kept her place, makes one flat
claim, and offers the Energy Clearing Ritual at the **returning-reader price: $30 (14% off $35)**.
No cards on the page, no chat door. Two buy blocks, one required first-name box (pre-filled from
her earlier chat on this browser, if any). Checkout sends no email; Stripe collects it.

The chat and letter formats and the chat-vs-letter-vs-offer A/B test were built and then
**removed** on 2026-10-16 (operator decision). Their commits stay in git history.

### The $30 price rule

The server charges $30 **only** when the `/api/checkout` request has BOTH:

1. `src: 'retarget'`, and
2. the offer-page marker `retargetPage: 'offer'` (a closed check: exactly that string).

Only the offer page sends the marker. A chat URL that carries `src=retarget` gets the normal
price, never $30 (unit tested). The price comes from `RETARGET_OFFER_PRICES` in
`shared/fixedFunnelPrices.ts` (`30_tarot_rt`) — the same table the page prints "$35 → $30 · 14%"
from. Offer-page sales carry `metadata.src = 'retarget'` and `metadata.rtfmt = 'offer'` in Stripe
(upsells inherit both), and " - Retarget" in the PaymentIntent description.

### Files

| | |
|---|---|
| `client/src/pages/TarotRetargetOffer.tsx` | the page (TarotBridge renders it for `src=retarget`) |
| `client/src/content/tarotRetargetOffer.ts` | the copy — source of truth |
| `client/src/lib/tarotRetarget.ts` | URL / hook / stored-name helpers |
| `client/src/lib/retargetBuy.ts`, `v1Checkout.ts` | the page's checkout (a copy of the chat's hand-off; the live chat is untouched) |
| `shared/retargetCheckout.ts`, `shared/fixedFunnelPrices.ts` | price + marker rules, shared by page and server |
| `server/lib/retargetCheckout.test.ts` | unit tests (`npx tsx --test server/lib/retargetCheckout.test.ts`) |
| `tests/fb-tarot-retarget.spec.ts` | Playwright, sandbox only (`playwright.fb-tarot-retarget.config.ts`) |
| `page/04-offer-copy.md` | copy review doc |
| `page/screens.mjs` → `page/screens/offer-*.png` | screenshots (not committed) |
| `01-copy-rules.md` | the binding brief for written ads |
| `video/` | the Evelyn video board, build log and cuts |

### After she buys (post-purchase, 2026-10-16)

She bought with no chat and no email, so the pages after checkout know only her **first
name** and **love/money**. How each page treats her:

| Page | For a retarget buyer | Everyone else |
|---|---|---|
| `/fb-tarot/welcome1` — U1 Protection Ritual, $47 | Live page, live copy, live price. Nothing changed. | Same |
| `/fb-tarot/welcome2` — U2 Bracelet, $47 / downsell $30 | Live page, except two beats Claude normally writes from her chat are **fixed copy** (love or money). No AI call. | AI path, unchanged |
| `/fb-tarot/success` | Chat card hands her to **Evelyn** (15 free min), like `/fb` buyers | Luna, unchanged |
| Evelyn's chat after that | Knows her first name, love/money, that she came back via the returning-reader offer, the ritual, any upsells. Never pretends to know what she said. | Unchanged |

**The gate:** the order's own Stripe session — paid, `src = 'retarget'`, funnel `v1-tarot`
(`server/lib/retargetOrder.ts`). Her `conversations` row carries no marker (the page sends no
email, so the row is made later by the `/welcome1` Stripe fallback), so the server asks Stripe
once per session and caches the answer. Rows from any other funnel are never looked up. A
failed lookup means "normal buyer", i.e. the old behaviour.

**Upsell orders** inherit `src: 'retarget'` + `rtfmt: 'offer'` from the main session (1-click
and fallback, U1 and U2 incl. the downsell) — unit tested with a tripwire on all four sites.

| | |
|---|---|
| `server/lib/retargetOrder.ts` | the gate + cache |
| `server/lib/evelynThankyouGift.ts` | thank-you → Evelyn for retarget orders; gift; the retarget reading brief |
| `client/src/lib/upsellCopy/retargetUpsell2.ts` | the fixed U2 copy — source of truth |
| `page/05-post-purchase-copy.md` | copy review doc (U2 lines + the brief) |
| `tests/fb-tarot-retarget-post-purchase.spec.ts` | Playwright, sandbox only → `page/screens/post-*.png` |

**See it in the sandbox (port 5066, no Stripe):** the spec seeds a retarget row
(`session_id=cs_test_pw_rt_love`, Ann, love). `/fb-tarot/welcome1?session_id=cs_test_pw_rt_love`
shows U1 for real. U2's fixed copy and the Evelyn card need the server's Stripe check, which the
sandbox cannot do — the spec adds the server's retarget answer to the real responses. To see
them by hand, run the spec (screens land in `page/screens/post-*.png`).

### Not verified yet

- **A real Stripe test-mode walk from the page**: $30.00 total, `metadata.priceVariant=30_tarot_rt`,
  `rtfmt=offer`, `src=retarget`; cancel returns to the page with `&cancelled=1`; the webhook's V2
  account migration for a no-email buyer; upsells at full price inheriting the markers.
  Everything so far is unit tests + Playwright with `/api/checkout` intercepted.
- **The post-purchase path with real Stripe**: the U2 retarget flag and the thank-you → Evelyn
  decision from a real session; the U1/U2 1-click charges and fallback checkouts carrying
  `src`/`rtfmt`; the /evelyn arrival granting 15 min once and greeting from the retarget brief;
  the n8n fulfilment for a no-email order.
- Nothing is deployed or live.

---

## The spine

Retargeting **CLOSES**; it does not restart the reading.

### Three rulings that cost real work to learn
1. **⛔ Nothing personal may be load-bearing.** Naming the card she turned is a trap — repeat
   clickers and shared devices make us confidently name the WRONG card. A wrong name is a
   mix-up; a wrong psychic detail destroys the only claim the ad has. Use "the two you left"
   (universal); her first name only on a cookie hit; never her card, question or words.
2. **Guilt = "I was worried about you", NEVER "you ignored me".** Evelyn as the injured party
   kills the funnel's core product (AUDIENCE.md: relief from self-blame is the strongest thing
   it sells). Make the guilt about her abandoning HERSELF, then absolve it. Release the blame
   BEFORE the guilt lands.
3. **Name the beat, then read the line cold and ask what it does.** The label is not the work.

---

## RECOVERY — what was lost 2026-10-06

The folder was untracked; a cleanup removed it. Recovered by re-pulling Kling renders inside
their 24h window and from a Desktop copy.

**Gone and NOT recoverable:**
- `ads/ad-copy-VOICE.md` — three graded Hannah-register ads. Version B survives in the session
  transcript; **versions A and C are lost** and need rewriting.
- All Codex stills (free to regenerate; prompts are in the transcript).
- The two earliest probe renders (old Kling account 120411553).

**Lesson:** commit early. None of this needed to be untracked.

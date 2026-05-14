# Upsell 2 - Manifestation Bracelet

## Overview
Upsell 2 offers a Manifestation Bracelet after the user completes (or declines) Upsell 1 (Protection Ritual + Lava Stone). It features two entry paths, Claude AI-generated personalized readings, interactive questions, and payment processing via Stripe.

## Pricing
- **Full Price**: $47 (Manifestation Bracelet - Attuned)
- **Downsell Price**: $30 (Manifestation Bracelet - Standard)
- Pricing is enforced **server-side** — the client cannot override amounts

## Entry Paths
- **Path A**: User bought Upsell 1 → already has shipping address → reuse shipping1 fields
- **Path B**: User declined Upsell 1 → no shipping on file → collect new shipping into shipping2 fields

## Conversation Flow (33 Stages)
1. **INIT** → Fetch user data from `/api/upsell2/user-data`
2. **PATH_A_OPEN / PATH_B_OPEN** → Personalized opening based on entry path
3. **GAP** → Bridge message
4. **QUESTION_1** → Interactive question with quick replies
5. **AFTER_Q1** → Response to Q1
6. **INTRODUCE** → Introduce the Manifestation Bracelet + **show product image** (`manifestation_bracelet.png`)
7. **STONES** → Describe the 8 stones
8. **QUESTION_2** → Second interactive question
9. **AFTER_Q2** → Response to Q2
10. **MANIFEST_REVEAL** → Claude AI generates personalized manifest reveal (bucket-specific)
11. **RITUAL_INSTRUCTION** → Ritual instructions (Path A gets extra content)
12. **WHAT_RECEIVE** → What they receive
13. **QUESTION_3** → Third interactive question
14. **AFTER_Q3** → Response to Q3
15. **MANIFEST_PERSONALIZE** → Claude AI personalizes stone selection
16. **SOCIAL_PROOF** → Social proof messages
17. **PRICE** → Price reveal
18. **URGENCY** → Urgency messaging
19. **CTA** → Show purchase button ($47)
20. **OBJECTION_1** → First decline → downsell offer ($30)
21. **DOWNSELL_CTA** → Show downsell button ($30)
22. **DECLINED** → Soft decline and redirect to /success
23. **SHIPPING** → Collect shipping (Path B only)
24. **COMPLETE** → Final messages and redirect to /success

## Product Image
- **File**: `client/public/manifestation_bracelet.png`
- **Displayed at**: INTRODUCE stage, right after the introduction messages
- **Rendering**: Same style as lava stone image in Upsell 1 — rounded corners, shadow, purple border accent
- **Reference**: Passed as `braceletImage` prop to `useUpsell2Chat` hook, rendered via `sendImageMessage`

## Server Endpoints
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/upsell2/user-data` | POST | Fetch user data and mark upsell2 as offered |
| `/api/upsell2/reading` | POST | Generate Claude AI reading (manifest_reveal or manifest_personalize) |
| `/api/upsell2/charge` | POST | 1-click charge using existing payment method |
| `/api/upsell2/fallback-checkout` | POST | Create new Stripe checkout session as fallback |
| `/api/upsell2/shipping` | POST | Save shipping2 address for Path B users |

## Database Fields (conversations table)
- `upsell2_offered` (boolean) - Whether upsell2 was presented
- `upsell2_purchased` (boolean) - Whether user purchased
- `upsell2_payment_id` (text) - Stripe payment intent ID
- `upsell2_amount` (integer) - Amount charged in cents (4700 or 3000)
- `upsell2_type` (text) - 'full' or 'downsell'
- `shipping2_name`, `shipping2_line1`, `shipping2_line2`, `shipping2_city`, `shipping2_state`, `shipping2_postal`, `shipping2_country` - Path B shipping fields

## AWeber Integration
- **List ID**: `6939683` (dedicated list for Upsell 2, separate from Upsell 1's list `6937139`)
- **Function**: `addUpsell2Subscriber()` in `server/lib/aweber.ts`
- **Tags**: `seer-within-upsell2`, `bracelet-full` or `bracelet-downsell`
- **Custom Fields**:
  - `stripe_order_id`
  - `shipping_name`
  - `shipping_line1`
  - `shipping_line2`
  - `shipping_city`
  - `shipping_state`
  - `shipping_postal`
  - `shipping_country`

## Facebook Tracking
- **Function**: `trackUpsell2Purchase()` in `client/src/lib/facebook.ts`
- **Event**: Purchase (with content_name = 'Manifestation Bracelet')
- **Deduplication**: sessionStorage guard prevents double-firing on page reload
- **Dual tracking**: Facebook Pixel (client) + Conversions API (server) with shared event_id

## Key Files
| File | Purpose |
|---|---|
| `client/src/pages/Upsell2Page.tsx` | Main page component |
| `client/src/hooks/useUpsell2Chat.ts` | Chat state machine hook |
| `client/src/lib/upsell2Messages.ts` | All message constants (33 stages) |
| `client/src/components/upsell/Upsell2CTA.tsx` | Full price CTA button ($47) |
| `client/src/components/upsell/Upsell2DownsellCTA.tsx` | Downsell CTA button ($30) |
| `server/lib/prompts.ts` | Claude AI prompt builders |
| `server/lib/claude.ts` | Claude API wrapper functions |
| `server/lib/aweber.ts` | AWeber subscriber functions |
| `server/lib/db.ts` | Database helper functions |
| `shared/schema.ts` | Drizzle ORM schema |

## Security
- Server enforces pricing: $47 (full) / $30 (downsell) — client `amount` field removed from schemas
- 1-click charge validates original Stripe session is paid before processing
- Shipping data saved to separate fields (shipping2*) to avoid overwriting Upsell 1 shipping

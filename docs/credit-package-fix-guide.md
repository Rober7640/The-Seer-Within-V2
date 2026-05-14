# Credit Package System — Fix Guide

## Problem Summary

Per-persona credit packages configured in the admin dashboard are silently ignored. Users always see the global default packages ($9.99, $19.99, $29.99, $39.99) regardless of what's configured in the admin.

## Root Cause: Format Mismatch

### What the admin saves (`PersonaEditor.tsx` → `customPricing` column):

```json
{
  "freeCoins": 0,
  "packages": [
    {
      "id": "pkg-1711234567890",
      "label": "Quick Reading",
      "minutes": 15,
      "priceUsd": 1500,
      "popular": false,
      "savings": ""
    }
  ]
}
```

### What the backend expects (`server/lib/personaPricing.ts` line 31-33):

```json
[
  {
    "packageType": "starter",
    "coins": 180,
    "bonusCoins": 0,
    "totalCoins": 180,
    "priceUsd": 999,
    "label": "180 coins",
    "badge": "MOST POPULAR"
  }
]
```

### Why it fails

The pricing loader validates:
1. Is it an array? — **No**, admin saves an object with a `packages` key
2. Does each item have `packageType`? — **No**, admin saves `id`
3. Does each item have `totalCoins`? — **No**, admin saves `minutes`

Validation fails → falls back to `DEFAULT_PRICING` from `shared/types.ts`.

## Files Involved

| File | Role |
|------|------|
| `client/src/pages/admin/PersonaEditor.tsx` | Admin UI for editing packages (lines 1587-1763) |
| `server/lib/personaPricing.ts` | Loads & validates pricing from DB |
| `server/lib/personaManager.ts` | Saves `customPricing` as JSON string |
| `shared/types.ts` | Defines `PricingTier` type and `DEFAULT_PRICING` |
| `server/routes/credits.ts` | API endpoints that resolve tiers for purchase |
| `client/src/pages/CreditsPage.tsx` | User-facing credit purchase page |
| `client/src/components/BuyCreditsModal.tsx` | In-chat credit purchase modal |
| `client/src/components/OutOfCreditsModal.tsx` | Out-of-credits popup during chat |

## What Needs Fixing

### Fix 1: Format Alignment (Required)

Either:
- **Option A:** Update the admin editor to save in `PricingTier[]` format (flat array with `packageType`, `coins`, `bonusCoins`, `totalCoins`, `priceUsd`, `label`)
- **Option B:** Update `personaPricing.ts` to understand the admin's `{ freeCoins, packages }` format and convert it
- **Option C:** Define a single shared format and update both sides

**Recommended: Option A** — change the admin editor to save in the format the backend already understands. This avoids changing the purchase pipeline which is already working.

### Fix 2: Admin Editor Fields (Required)

The admin editor currently has: `label`, `minutes`, `priceUsd`, `popular`, `savings`

It needs to also capture or auto-calculate:
- `packageType` — a unique key like "starter", "popular", etc.
- `coins` — base coins included
- `bonusCoins` — extra bonus coins
- `totalCoins` — `coins + bonusCoins`

**Design decision:** Should the admin enter coins directly, or enter minutes and have the system calculate coins using `coinsPerMinute`? If using minutes: `coins = minutes * coinsPerMinute`.

### Fix 3: Nav Bar Credits Link (Nice-to-have)

`ChatServiceNav.tsx` links to `/credits` without `personaId`. Options:
- Pass the currently selected persona's ID if available
- Show global packages when no persona context (current behavior, fine as fallback)

### Fix 4: UI Text (Trivial)

- `CreditsPage.tsx` line 182: Change "same rate for all guides" to "rate varies by guide" (or make it dynamic)
- `BuyCreditsModal.tsx` line 138: Already says "rate varies by guide" — correct

## What Already Works (Don't Touch)

- **Purchase pipeline** — Stripe and PayPal endpoints correctly look up `tier.packageType`, `tier.totalCoins`, `tier.priceUsd` and grant coins
- **Billing system** — `coinsPerMinute` per persona is enforced in `creditTracking.ts`
- **Coin balance** — universal across personas, no per-persona wallet needed
- **Out-of-credits modal** — already fetches pricing with `personaId`
- **Availability/schedule system** — fully working, timezone-aware, enforced on greeting + session start

## Testing Checklist

After fixing, verify:
- [ ] Admin can create/edit packages for a persona
- [ ] Saving in admin stores correct format in DB
- [ ] `/api/credits/pricing?personaId=xxx` returns persona's custom packages (not defaults)
- [ ] `/credits?personaId=xxx` shows the custom packages to users
- [ ] Purchasing a custom package via Stripe works and grants correct coins
- [ ] Purchasing a custom package via PayPal works and grants correct coins
- [ ] Falling back to global defaults still works when persona has no custom packages
- [ ] Out-of-credits modal shows correct persona packages during chat
- [ ] Nav bar credits link behavior is acceptable

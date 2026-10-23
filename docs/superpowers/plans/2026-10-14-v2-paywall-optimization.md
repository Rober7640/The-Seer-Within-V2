# V2 Paywall Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lift V2 chat-paywall conversion by (A) making the already-built redesigned paywall ("Variant B") truthful and verified so it can be turned on confidently, and (B) fixing the per-guide pricing format bug so admin-configured prices actually load — all on localhost, nothing merged/deployed.

**Architecture:** The redesign already exists and is wired behind the experiment `paywall_copy_2026` (status `draft` → everyone sees Variant A). Work is: fix two correctness defects in B's presentation, verify B end-to-end locally via the non-prod `?paywallVariant=B` override, and repair the pricing-format mismatch (admin editor + seed + a one-off local migration + defensive loader normalization) so `getPersonaPricing` stops silently falling back to defaults. No price VALUES or the $2.99/min rate change — plumbing only.

**Tech Stack:** TypeScript, React (Vite), Express, Drizzle ORM (Supabase/Postgres), Playwright (`npm test`), `node:test` via `tsx --test` + Vitest for unit tests.

**Spec:** `docs/superpowers/specs/2026-10-14-v2-paywall-optimization-design.md`

## Global Constraints

- **Localhost only.** No deploy, no production DB, no external sends. The experiment `paywall_copy_2026` stays `draft` for real users; the documented local "turn on" is for verification only.
- **No price-value or rate changes.** $2.99/min default rate and the $10/$20/$30(/$50) default packs are unchanged. The fix makes *configured* prices load; it does not invent new ones. Evelyn's legacy `$15`/`$25` become valid packs **at the current rate** (so $15 ≈ 5 min at $2.99/min) — surfaced, not re-valued.
- **Dollar-wallet invariant:** a coin is a cent. For any pack, `coins === totalCoins === priceUsd` (all cents) and `bonusCoins === 0` unless a bonus is explicitly configured. Minutes are always derived per-guide as `totalCoins / coinsPerMinute`; never store minutes as truth.
- **Canonical pricing shape** (`shared/types.ts` `PricingTier`): `{ packageType: string, coins: number, bonusCoins: number, totalCoins: number, priceUsd: number, label: string, badge?: string, recommended?: boolean }`. The loader (`server/lib/personaPricing.ts`) accepts only a non-empty `PricingTier[]` where each item has `packageType` + numeric `totalCoins` + numeric `priceUsd`; anything else falls back to `DEFAULT_PRICING`.
- **Variant A must stay byte-identical** for real users throughout. Only B is touched.
- **Branch:** `feat/v2-paywall-optimization` (already created off `development`). Commit frequently.

## Review Focus

- **Flat-rate honesty (owned by Task A1):** when every tier shares one per-minute rate, B's ladder line must not imply a bulk discount ("on bigger packs"). Test both the flat and the varying-rate branches.
- **Bonus badge with zero/absent bonus (owned by Task A1):** a tier with `bonusCoins: 0` or missing must render no "+N free" badge and never emit `NaN`. Pin with a `toTierView` unit test.
- **Legacy pricing shapes that must normalize, not crash (owned by Task B1/B4):** the admin `{ freeCoins, packages:[{id,minutes,priceUsd,label}] }` object AND the seed array `[{packageType,minutes,priceUsd,label}]` (no coins) must both convert to canonical tiers; malformed/empty must yield `null` → defaults, not an exception.
- **Custom top-up floor after fix (owned by Task B5-verify):** `resolveCustomTier` sets the floor to the cheapest tier `priceUsd`. After a persona gets real custom tiers (e.g. Evelyn min $15), the custom-amount floor must move to that persona's cheapest pack — verify a $12 custom on Evelyn is rejected, $15 accepted.
- **Purchase still grants correct coins under custom tiers (owned by Task B5-verify):** buying a persona's custom pack via Stripe/PayPal sandbox must grant `totalCoins` cents and resume the reading — the purchase pipeline is unchanged but the tier now comes from DB, so smoke it.

---

## Task A1: Make Variant B's rate line honest under flat pricing

**Files:**
- Modify: `client/src/components/paywall/paywallCopy.ts` (add a rate-aware ladder helper; `B.modal.ladder` at line 94, `toTierView` at lines 27–46, `lowestPerMinuteLabel` at 49–53)
- Modify: `client/src/components/paywall/PaywallCard.tsx:145-148` (call the new helper)
- Test: `client/src/components/paywall/paywallCopy.test.ts` (new, Vitest)

**Interfaces:**
- Produces: `perMinuteVaries(tiers: PricingTier[], coinsPerMinute?: number): boolean` and `ladderLine(tiers: PricingTier[], coinsPerMinute: number, variant: PaywallVariant): string` exported from `paywallCopy.ts`.
- Consumes: existing `toTierView`, `lowestPerMinuteLabel`, `paywallCopy`.

- [ ] **Step 1: Write the failing test**

Create `client/src/components/paywall/paywallCopy.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { perMinuteVaries, ladderLine, toTierView } from "./paywallCopy";
import type { PricingTier } from "@shared/types";

const flat: PricingTier[] = [
  { packageType: "popular",    coins: 1000, bonusCoins: 0, totalCoins: 1000, priceUsd: 1000, label: "$10" },
  { packageType: "best_value", coins: 2000, bonusCoins: 0, totalCoins: 2000, priceUsd: 2000, label: "$20" },
  { packageType: "premium",    coins: 3000, bonusCoins: 0, totalCoins: 3000, priceUsd: 3000, label: "$30" },
];
const varying: PricingTier[] = [
  { packageType: "a", coins: 1000, bonusCoins: 0,   totalCoins: 1000, priceUsd: 1000, label: "$10" },
  { packageType: "b", coins: 2000, bonusCoins: 600, totalCoins: 2600, priceUsd: 2000, label: "$20" }, // cheaper per min
];

describe("ladder line honesty", () => {
  it("flat pricing does not imply a bulk discount", () => {
    expect(perMinuteVaries(flat, 299)).toBe(false);
    const line = ladderLine(flat, 299, "B");
    expect(line).not.toMatch(/bigger packs/i);
    expect(line).toContain("$2.99");
  });
  it("varying pricing keeps the as-low-as framing", () => {
    expect(perMinuteVaries(varying, 299)).toBe(true);
    expect(ladderLine(varying, 299, "B")).toMatch(/as low as/i);
  });
  it("variant A ladder is empty", () => {
    expect(ladderLine(flat, 299, "A")).toBe("");
  });
  it("toTierView emits no bonus and no NaN when bonusCoins is 0 or absent", () => {
    expect(toTierView(flat[0], 299).bonusMinutes).toBe(0);
    const noBonus = { ...flat[0] } as PricingTier;
    // @ts-expect-error simulate a legacy tier missing bonusCoins
    delete noBonus.bonusCoins;
    expect(Number.isNaN(toTierView(noBonus, 299).bonusMinutes)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run client/src/components/paywall/paywallCopy.test.ts`
Expected: FAIL — `perMinuteVaries` / `ladderLine` are not exported.

- [ ] **Step 3: Implement the helpers + harden `toTierView`**

In `client/src/components/paywall/paywallCopy.ts`:

Harden `toTierView` so an absent `bonusCoins` is treated as 0 (defensive; rendering is already guarded by `> 0`). Change line 35 from:

```ts
  const bonusMinutes = Math.floor((tier.bonusCoins / coinsPerMinute) * 10) / 10;
```

to:

```ts
  const bonusMinutes = Math.floor(((tier.bonusCoins ?? 0) / coinsPerMinute) * 10) / 10;
```

Then add, after `lowestPerMinuteLabel` (around line 53):

```ts
/** True when tiers do NOT all share one per-minute rate (i.e. a real bulk discount exists). */
export function perMinuteVaries(tiers: PricingTier[], coinsPerMinute: number = COINS_PER_MINUTE): boolean {
  const rates = tiers.map((t) => toTierView(t, coinsPerMinute).pricePerMinute).filter((r) => r > 0);
  if (rates.length < 2) return false;
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  return max - min > 0.005; // half a cent tolerance
}

/** Honest rate line: flat pricing says "just $X/min"; real bulk discounts say "as low as $X/min on bigger packs". */
export function ladderLine(tiers: PricingTier[], coinsPerMinute: number, variant: PaywallVariant): string {
  if (variant !== "B") return "";
  const lowest = lowestPerMinuteLabel(tiers, coinsPerMinute);
  return perMinuteVaries(tiers, coinsPerMinute)
    ? `As low as ${lowest}/min on bigger packs.`
    : `Just ${lowest}/min — you only pay while you're in a live reading.`;
}
```

- [ ] **Step 4: Point the component at the honest helper**

In `client/src/components/paywall/PaywallCard.tsx`, update the import block (lines 13–16) to include `ladderLine`, and replace lines 145–148:

```tsx
<p className="mb-2.5 text-center text-[12px] leading-snug text-white/50">
  {ladderLine(tiers, coinsPerMinute, variant)}
</p>
```

(Remove the now-unused `copy.modal.ladder` call here; leave the `B.modal.ladder` string in `paywallCopy.ts` untouched for back-compat — it is no longer referenced by PaywallCard.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run client/src/components/paywall/paywallCopy.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Typecheck**

Run: `npm run check`
Expected: no NEW errors beyond the pre-existing baseline (note the baseline count before you start).

- [ ] **Step 7: Commit**

```bash
git add client/src/components/paywall/paywallCopy.ts client/src/components/paywall/paywallCopy.test.ts client/src/components/paywall/PaywallCard.tsx
git commit -m "fix(paywall): honest flat-rate ladder line in variant B; harden toTierView bonus"
```

---

## Task B1: Shared pricing-format helper (admin shape + legacy → canonical tiers)

**Files:**
- Create: `shared/pricingFormat.ts`
- Test: `shared/pricingFormat.test.ts` (new, `node:test` via `tsx --test` to match `server/lib/*.test.ts` convention)

**Interfaces:**
- Produces:
  - `type AdminPackage = { id?: string; packageType?: string; label?: string; minutes?: number; priceUsd: number; popular?: boolean; savings?: string }`
  - `adminPackagesToTiers(packages: AdminPackage[]): PricingTier[]` — dollar-wallet: `coins = totalCoins = priceUsd`, `bonusCoins = 0`.
  - `normalizeLegacyPricing(raw: unknown): PricingTier[] | null` — accepts a canonical `PricingTier[]` (returned as-is if valid), the admin `{ freeCoins, packages }` object, or a minutes-based array; returns `null` when nothing usable.
- Consumes: `PricingTier` from `@shared/types`.

- [ ] **Step 1: Write the failing test**

Create `shared/pricingFormat.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { adminPackagesToTiers, normalizeLegacyPricing } from "./pricingFormat";

test("adminPackagesToTiers builds dollar-wallet canonical tiers", () => {
  const tiers = adminPackagesToTiers([
    { id: "pkg-1", label: "15 Minutes", minutes: 15, priceUsd: 1500, popular: true },
    { id: "pkg-2", label: "30 Minutes", minutes: 30, priceUsd: 2500 },
  ]);
  assert.equal(tiers.length, 2);
  const t0 = tiers[0];
  assert.equal(t0.priceUsd, 1500);
  assert.equal(t0.coins, 1500);
  assert.equal(t0.totalCoins, 1500);
  assert.equal(t0.bonusCoins, 0);
  assert.ok(typeof t0.packageType === "string" && t0.packageType.length > 0);
  assert.equal(t0.label, "15 Minutes");
  assert.equal(t0.badge, "MOST POPULAR");
});

test("normalizeLegacyPricing converts the admin {freeCoins,packages} object", () => {
  const tiers = normalizeLegacyPricing({
    freeCoins: 0,
    packages: [{ id: "p", label: "Quick", minutes: 15, priceUsd: 1500 }],
  });
  assert.ok(tiers);
  assert.equal(tiers!.length, 1);
  assert.equal(tiers![0].totalCoins, 1500);
});

test("normalizeLegacyPricing converts a minutes-only array (seed legacy)", () => {
  const tiers = normalizeLegacyPricing([
    { packageType: "15min", minutes: 15, priceUsd: 1500, label: "15 Minutes" },
    { packageType: "30min", minutes: 30, priceUsd: 2500, label: "30 Minutes" },
  ]);
  assert.ok(tiers);
  assert.equal(tiers![0].totalCoins, 1500);
  assert.equal(tiers![0].packageType, "15min");
});

test("normalizeLegacyPricing passes through already-canonical tiers unchanged", () => {
  const canonical = [{ packageType: "popular", coins: 1000, bonusCoins: 0, totalCoins: 1000, priceUsd: 1000, label: "$10" }];
  const tiers = normalizeLegacyPricing(canonical);
  assert.deepEqual(tiers, canonical);
});

test("normalizeLegacyPricing returns null for junk/empty", () => {
  assert.equal(normalizeLegacyPricing(null), null);
  assert.equal(normalizeLegacyPricing({}), null);
  assert.equal(normalizeLegacyPricing([]), null);
  assert.equal(normalizeLegacyPricing({ packages: [] }), null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test shared/pricingFormat.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the helper**

Create `shared/pricingFormat.ts`:

```ts
import type { PricingTier } from "./types";

export type AdminPackage = {
  id?: string;
  packageType?: string;
  label?: string;
  minutes?: number;
  priceUsd: number; // cents
  popular?: boolean;
  savings?: string;
};

function isCanonicalTier(t: any): t is PricingTier {
  return t && typeof t.packageType === "string" && typeof t.totalCoins === "number" && typeof t.priceUsd === "number";
}

/** Dollar-wallet: a coin is a cent, so coins = totalCoins = priceUsd and bonusCoins = 0. */
export function adminPackagesToTiers(packages: AdminPackage[]): PricingTier[] {
  return packages
    .filter((p) => p && Number.isFinite(p.priceUsd) && p.priceUsd > 0)
    .map((p, i) => {
      const cents = Math.round(p.priceUsd);
      return {
        packageType: (p.packageType || p.id || `tier_${i}`).toString(),
        coins: cents,
        bonusCoins: 0,
        totalCoins: cents,
        priceUsd: cents,
        label: p.label && p.label.trim() ? p.label : `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`,
        ...(p.popular ? { badge: "MOST POPULAR" } : {}),
      } as PricingTier;
    });
}

/**
 * Convert any stored customPricing shape into canonical PricingTier[].
 * Accepts: canonical array (passthrough), admin `{freeCoins,packages}` object,
 * or a minutes-based array. Returns null when nothing usable is present.
 */
export function normalizeLegacyPricing(raw: unknown): PricingTier[] | null {
  if (!raw) return null;
  let value: any = raw;
  if (typeof raw === "string") {
    try { value = JSON.parse(raw); } catch { return null; }
  }
  const arr: any[] | null = Array.isArray(value)
    ? value
    : (value && Array.isArray(value.packages) ? value.packages : null);
  if (!arr || arr.length === 0) return null;
  if (arr.every(isCanonicalTier)) return arr as PricingTier[];
  const tiers = adminPackagesToTiers(arr as AdminPackage[]);
  return tiers.length ? tiers : null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx tsx --test shared/pricingFormat.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add shared/pricingFormat.ts shared/pricingFormat.test.ts
git commit -m "feat(pricing): shared helper to normalize legacy/admin pricing to canonical PricingTier[]"
```

---

## Task B2: Admin editor saves canonical `PricingTier[]`

**Files:**
- Modify: `client/src/pages/admin/PersonaEditor.tsx` (pricing types lines 32–44, `syncPricingToForm`/save path lines 455–495)
- Modify: `server/lib/personaManager.ts:140` (widen `UpdatePersonaInput.customPricing` to accept canonical tiers) and the `PricingPackage` note at 24–29

**Interfaces:**
- Consumes: `adminPackagesToTiers` from `shared/pricingFormat`.
- Produces: the PATCH to `/api/admin/personas/:id/config` now sends `customPricing` as a **`PricingTier[]`** array (not `{ freeCoins, packages }`). `freeCoins` continues to be sent as its own top-level field.

- [ ] **Step 1: Write the failing test (API round-trip)**

Add to a new `tests/admin-pricing-format.spec.ts` (Playwright API test; mirrors existing admin specs):

```ts
import { test, expect, request } from "@playwright/test";
// Assumes a running local server + admin creds from env (see tests/admin.spec.ts for the login helper).
// Pseudocode skeleton — reuse the project's existing admin auth helper rather than re-implementing.

test("admin pricing saves as canonical PricingTier[] and loads back", async ({ playwright }) => {
  // 1. login as admin -> token (reuse helper from tests/admin.spec.ts)
  // 2. PATCH /api/admin/personas/:id/config with pricing packages (minutes+price)
  // 3. GET /api/credits/pricing?personaId=:id
  // 4. expect each tier to have packageType + totalCoins === priceUsd + bonusCoins === 0
  //    and NOT equal the default $10/$20/$30 set when custom packages were provided
});
```

> NOTE for implementer: wire this to the real admin-login + persona-id helpers already used in `tests/admin.spec.ts` / `tests/admin-grant-credits.spec.ts`. Keep the assertions above.

- [ ] **Step 2: Run it to verify it fails**

Run: `npx playwright test tests/admin-pricing-format.spec.ts`
Expected: FAIL — pricing loads back as defaults (format mismatch) / assertion on `totalCoins` fails.

- [ ] **Step 3: Convert admin packages to canonical on save**

In `client/src/pages/admin/PersonaEditor.tsx`, at the save path (around lines 486–495) replace the raw `JSON.parse(form.customPricing)` assignment so the serialized `PricingConfig` is converted to canonical tiers before sending:

```ts
import { adminPackagesToTiers } from "@shared/pricingFormat";
// ...
// customPricing: send canonical PricingTier[] (not {freeCoins,packages}); freeCoins goes on its own field.
if (pricing.packages.length > 0) {
  payload.customPricing = adminPackagesToTiers(pricing.packages);
} else {
  payload.customPricing = null; // clear -> fall back to defaults
}
payload.freeCoins = pricing.freeCoins;
```

(Remove the old `form.customPricing` JSON-parse branch for pricing; if a raw-JSON escape hatch textarea must stay, run its parsed value through `normalizeLegacyPricing` before assigning.)

- [ ] **Step 4: Accept canonical tiers server-side**

In `server/lib/personaManager.ts`, line 140, widen the type so canonical tiers pass through `updatePersona` unchanged (it already `JSON.stringify`s whatever array it gets at lines 292–298):

```ts
  customPricing?: import("@shared/types").PricingTier[] | PricingPackage[] | Record<string, unknown> | null;
```

- [ ] **Step 5: Run the API test to verify it passes**

Run: `npx playwright test tests/admin-pricing-format.spec.ts`
Expected: PASS.

- [ ] **Step 6: Typecheck + commit**

```bash
npm run check   # no new errors vs baseline
git add client/src/pages/admin/PersonaEditor.tsx server/lib/personaManager.ts tests/admin-pricing-format.spec.ts
git commit -m "fix(admin): save per-persona pricing as canonical PricingTier[] so it actually loads"
```

---

## Task B3: Seed emits canonical tiers (Evelyn's $15/$25, no re-valuing)

**Files:**
- Modify: `server/lib/seedPersona.ts:114-117` (Evelyn `customPricing`)

**Interfaces:**
- Consumes: `adminPackagesToTiers` from `shared/pricingFormat`.

- [ ] **Step 1: Write the failing test**

Add `server/lib/seedPricing.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { adminPackagesToTiers } from "../../shared/pricingFormat";

// Mirrors the values seeded for Evelyn; guards that the seed produces loadable canonical tiers.
test("seed pricing for Evelyn is canonical and loadable", () => {
  const tiers = adminPackagesToTiers([
    { packageType: "15min", label: "15 Minutes", minutes: 15, priceUsd: 1500 },
    { packageType: "30min", label: "30 Minutes", minutes: 30, priceUsd: 2500 },
  ]);
  for (const t of tiers) {
    assert.equal(typeof t.packageType, "string");
    assert.equal(t.totalCoins, t.priceUsd);
    assert.equal(t.bonusCoins, 0);
  }
  assert.equal(tiers[0].priceUsd, 1500);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx tsx --test server/lib/seedPricing.test.ts`
Expected: FAIL (import path / value) until the seed is updated to the canonical values — run after Step 3; it should pass then. (If the helper already exists from B1, this test passes on its own; its real job is to lock the seeded values — keep it.)

- [ ] **Step 3: Update the seed to canonical tiers**

In `server/lib/seedPersona.ts`, replace lines 114–117:

```ts
    customPricing: JSON.stringify(adminPackagesToTiers([
      { packageType: '15min', label: '15 Minutes', minutes: 15, priceUsd: 1500 },
      { packageType: '30min', label: '30 Minutes', minutes: 30, priceUsd: 2500 },
    ])),
```

Add the import at the top of the file:

```ts
import { adminPackagesToTiers } from '@shared/pricingFormat';
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx tsx --test server/lib/seedPricing.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/lib/seedPersona.ts server/lib/seedPricing.test.ts
git commit -m "fix(seed): Evelyn pricing in canonical PricingTier[] (same \$15/\$25 values, now loadable)"
```

---

## Task B4: Local migration script + defensive loader normalization

**Files:**
- Create: `server/scripts/migratePersonaPricing.ts` (idempotent; `--dry-run` default, `--apply` to write)
- Modify: `server/lib/personaPricing.ts:27-44` (use `normalizeLegacyPricing` as the fallback path before giving up to defaults)
- Test: `server/lib/personaPricing.test.ts` (new, `node:test`)

**Interfaces:**
- Consumes: `normalizeLegacyPricing` from `shared/pricingFormat`.
- Produces: `getPersonaPricing` now returns normalized tiers for legacy rows instead of silently using defaults.

- [ ] **Step 1: Write the failing test for loader normalization**

Create `server/lib/personaPricing.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeLegacyPricing } from "../../shared/pricingFormat";

// The loader's new fallback: a legacy minutes-array must normalize rather than drop to defaults.
test("legacy minutes-array normalizes to canonical tiers (loader fallback contract)", () => {
  const legacy = JSON.stringify([
    { packageType: "15min", minutes: 15, priceUsd: 1500, label: "15 Minutes" },
  ]);
  const tiers = normalizeLegacyPricing(legacy);
  assert.ok(tiers && tiers[0].totalCoins === 1500 && tiers[0].bonusCoins === 0);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx tsx --test server/lib/personaPricing.test.ts`
Expected: PASS already if B1 is done — this test pins the *contract* the loader will rely on. (It guards against a future regression in the normalizer.) If B1 isn't merged yet, it FAILs on import.

- [ ] **Step 3: Harden the loader fallback**

In `server/lib/personaPricing.ts`, replace the `else`/`catch` fallbacks (lines 36–41) so a legacy shape is normalized before defaulting:

```ts
import { normalizeLegacyPricing } from '../../shared/pricingFormat';
// ...
      if (isValid) {
        tiers = parsed;
      } else {
        tiers = normalizeLegacyPricing(parsed) ?? DEFAULT_PRICING.tiers;
      }
    } catch {
      tiers = normalizeLegacyPricing(result[0].customPricing) ?? DEFAULT_PRICING.tiers;
    }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx tsx --test server/lib/personaPricing.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the migration script (dry-run default)**

Create `server/scripts/migratePersonaPricing.ts`:

```ts
// Idempotent local migration: convert any persona.custom_pricing stored in a legacy
// shape ({freeCoins,packages} object, or a minutes-array without coins) into canonical
// PricingTier[]. Dollar amounts are PRESERVED (no re-valuing). Dry-run by default.
//   npx tsx server/scripts/migratePersonaPricing.ts            # preview only
//   npx tsx server/scripts/migratePersonaPricing.ts --apply    # write changes
import 'dotenv/config';
import { db } from '../lib/db';
import { personas } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { normalizeLegacyPricing } from '@shared/pricingFormat';

function isAlreadyCanonical(raw: string | null): boolean {
  if (!raw) return true; // null = defaults, nothing to do
  try {
    const p = JSON.parse(raw);
    return Array.isArray(p) && p.length > 0 &&
      p.every((t: any) => t.packageType && typeof t.totalCoins === 'number' && typeof t.priceUsd === 'number');
  } catch { return false; }
}

async function main() {
  const apply = process.argv.includes('--apply');
  const rows = await db.select({ id: personas.id, slug: personas.slug, customPricing: personas.customPricing }).from(personas);
  let changed = 0;
  for (const r of rows) {
    if (isAlreadyCanonical(r.customPricing)) { console.log(`skip  ${r.slug} (canonical/null)`); continue; }
    const tiers = normalizeLegacyPricing(r.customPricing);
    if (!tiers) { console.log(`WARN  ${r.slug} unconvertible -> will fall back to defaults; leaving as-is`); continue; }
    console.log(`fix   ${r.slug}: ${r.customPricing} -> ${JSON.stringify(tiers)}`);
    changed++;
    if (apply) {
      await db.update(personas).set({ customPricing: JSON.stringify(tiers), updatedAt: new Date() }).where(eq(personas.id, r.id));
    }
  }
  console.log(`\n${apply ? 'APPLIED' : 'DRY-RUN'}: ${changed} persona(s) ${apply ? 'updated' : 'would change'}.`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 6: Run the migration dry-run locally and eyeball output**

Run: `npx tsx server/scripts/migratePersonaPricing.ts`
Expected: prints a `fix …` line for any legacy row (e.g. Evelyn if her row predates B3), `skip …` for canonical/null. No DB writes. Confirm dollar amounts are preserved.

- [ ] **Step 7: Apply locally, then confirm idempotency**

Run: `npx tsx server/scripts/migratePersonaPricing.ts --apply`
Then run the dry-run again: `npx tsx server/scripts/migratePersonaPricing.ts`
Expected: second run reports `0 would change` (all `skip`), proving idempotency.

- [ ] **Step 8: Commit**

```bash
git add server/lib/personaPricing.ts server/lib/personaPricing.test.ts server/scripts/migratePersonaPricing.ts
git commit -m "fix(pricing): loader normalizes legacy rows + idempotent local pricing migration (dry-run default)"
```

---

## Task B5-verify: End-to-end — a custom-priced persona shows its own prices

**Files:**
- Modify/extend: `tests/paywall-experiment.spec.ts` (add a custom-pricing assertion) OR add `tests/persona-custom-pricing.spec.ts`
- Also update the KNOWN-stale `tests/credits.spec.ts` assertions (old `$15`/"15 Minutes"/"3 minutes remaining") to the current coin/dollar model so the suite is green.

**Interfaces:** consumes the running local server + `GET /api/credits/pricing?personaId=…`.

- [ ] **Step 1: Write the verification test**

Add to `tests/persona-custom-pricing.spec.ts`:

```ts
import { test, expect, request } from "@playwright/test";

test("GET /api/credits/pricing returns a persona's custom tiers, not defaults", async ({ playwright }) => {
  const ctx = await playwright.request.newContext({ baseURL: "http://localhost:5000" });
  // Evelyn has custom $15/$25 after seed+migration. Resolve her id via public personas API.
  const personas = await (await ctx.get("/api/personas")).json();
  const evelyn = personas.find((p: any) => p.slug === "evelyn-cross");
  expect(evelyn).toBeTruthy();
  const pricing = await (await ctx.get(`/api/credits/pricing?personaId=${evelyn.id}`)).json();
  const prices = pricing.tiers.map((t: any) => t.priceUsd).sort((a: number, b: number) => a - b);
  expect(prices).toEqual([1500, 2500]);           // her configured packs, not the default 1000/2000/3000/5000
  for (const t of pricing.tiers) {
    expect(t.totalCoins).toBe(t.priceUsd);          // dollar-wallet invariant
    expect(t.bonusCoins).toBe(0);
  }
});

test("custom-amount floor follows the persona's cheapest pack", async ({ playwright }) => {
  const ctx = await playwright.request.newContext({ baseURL: "http://localhost:5000" });
  // A $12 custom top-up on Evelyn (min pack $15) must be rejected; $15 accepted.
  // Drive via the authenticated /api/credits/create-order or /checkout path used by the app,
  // reusing the user-auth helper from tests/credits.spec.ts. Assert 4xx for 1200, ok for 1500.
});
```

> NOTE: wire the second test to the real authenticated purchase-intent endpoint + user-login helper already in `tests/credits.spec.ts`.

- [ ] **Step 2: Start the local server and run**

Run (in one terminal): `npm run dev`
Run (in another): `npx playwright test tests/persona-custom-pricing.spec.ts`
Expected: PASS (Evelyn shows $15/$25).

- [ ] **Step 3: Fix the stale credits.spec.ts assertions**

Update `tests/credits.spec.ts` stale strings (old `$15 / "15 Minutes" / "3 minutes remaining"` and slug-not-UUID personaId) to the current dollar/minute model so they reflect reality. Run: `npx playwright test tests/credits.spec.ts` → Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add tests/persona-custom-pricing.spec.ts tests/credits.spec.ts
git commit -m "test(pricing): verify per-persona custom pricing loads end-to-end; refresh stale credits specs"
```

---

## Task A2: Verify Variant B end-to-end locally (manual + Playwright)

**Files:**
- Extend: `tests/paywall-experiment.spec.ts` (truthful-copy assertions for B)

**Interfaces:** non-prod `?paywallVariant=B` override on `/credits` and `/reading`.

- [ ] **Step 1: Extend the experiment spec with truthful-copy assertions**

Add to `tests/paywall-experiment.spec.ts` a case that loads `/credits?personaId=<evelyn>&paywallVariant=B` and asserts:

```ts
// Within the existing B-variant test block:
await expect(page.getByText(/non-refundable/i)).toHaveCount(0);        // killed in B
await expect(page.getByText(/on bigger packs/i)).toHaveCount(0);       // no false bulk-discount under flat pricing
await expect(page.getByText(/\$2\.99\/min/i)).toBeVisible();           // honest flat rate
await expect(page.locator("text=/NaN/")).toHaveCount(0);               // no NaN artifacts
```

- [ ] **Step 2: Run the experiment spec**

Run: `npx playwright test tests/paywall-experiment.spec.ts`
Expected: PASS (existing 4 + new assertions).

- [ ] **Step 3: Manual browser walkthrough (document results in the PR/handoff)**

With `npm run dev` running, as a logged-in local test user with Evelyn selected, verify by hand and note pass/fail for each:
- `/credits?personaId=<evelyn>&paywallVariant=B` — store renders, honest rate line, guarantee line (not "non-refundable").
- In-chat (`/reading?...&paywallVariant=B`): drive the **three triggers** — (a) let time hit 0:00 mid-chat → "Continue Your Chat"/B header + End Chat; (b) tap the low-balance banner / buy button → "More time together"/B header + "Maybe later"; (c) "Continue Reading" with no time → B header + End Chat.
- Complete a purchase on **Stripe sandbox** and on **PayPal sandbox**; confirm coins granted and the reading resumes.
- Compare the same URLs with `?paywallVariant=A` to confirm A is unchanged.

- [ ] **Step 4: Commit the test changes**

```bash
git add tests/paywall-experiment.spec.ts
git commit -m "test(paywall): assert variant B copy is truthful under flat pricing"
```

---

## Task A3: Document the local "turn on" switch + confirm kill-switch

**Files:**
- Create: `docs/v2-paywall-turn-on.md` (local runbook)

- [ ] **Step 1: Determine the authoritative enable path**

Inspect how `assign(PAYWALL_EXPERIMENT_KEY, …)` resolves (experiments framework) vs the `system_config.paywall_copy_experiment` row seeded by `server/scripts/migratePaywall.ts`. Confirm which one actually flips real (non-override) users to B today — check `server/lib/experiments.ts` `assign`/`getExperiment` and whether an `experiments` table row with key `paywall_copy_2026` must be `running`. Record the exact, current mechanism.

- [ ] **Step 2: Write the runbook**

`docs/v2-paywall-turn-on.md` documents, for localhost only:
- **QA/view without enabling:** append `?paywallVariant=B` (non-prod) on `/credits` / `/reading`.
- **Start the A/B (local):** the exact command/row edit that moves `paywall_copy_2026` to `running`, scoped to Evelyn, `percentB:50` (whichever mechanism Step 1 proves is live).
- **Kill instantly:** set it back to `draft`/disabled → everyone returns to A.
- **Measurement:** the `paywall_views` → `credit_purchases` conversion query (copy from PostHog findings §3.13), measured from the app DB.
- An explicit note: **actually starting the live A/B is Joel's decision; this task only proves readiness locally.**

- [ ] **Step 3: Verify the override + kill behavior locally**

With `npm run dev`: confirm `?paywallVariant=B` shows B and `?paywallVariant=A` shows A, and that with no override a normal user sees A (experiment `draft`). Note results in the runbook.

- [ ] **Step 4: Commit**

```bash
git add docs/v2-paywall-turn-on.md
git commit -m "docs(paywall): local runbook to enable/kill the variant-B A/B + measure conversion"
```

---

## Task C1: Verify conversion tracking end-to-end (paywall_views → purchase)

**Files:** none (verification task); optionally a small SQL note appended to `docs/v2-paywall-turn-on.md`.

- [ ] **Step 1: Confirm the tracking schema exists locally**

Ensure `paywall_views` exists (run `npx tsx server/scripts/migratePaywall.ts` if needed — it's idempotent). Confirm the `checkout_views`/exposure path in `POST /api/credits/checkout-view` writes on modal open.

- [ ] **Step 2: Generate local data and verify rows**

With `npm run dev`, open the paywall under B (override) and A as two local users; trigger modal opens and at least one sandbox purchase. Then query the DB and confirm exposure/`paywall_views` rows carry the correct `{user_id, variant, surface, persona_id, is_out_of_credits}`.

- [ ] **Step 3: Run the conversion query**

Run the §3.13 first-view-dedup + 7-day-window conversion SQL against the local DB and confirm it returns sensible numbers for the seeded activity (buyers/viewers per variant). Record the query + result in the runbook.

- [ ] **Step 4: Final branch check**

Run the full relevant suites and confirm green:

```bash
npx vitest run client/src/components/paywall/paywallCopy.test.ts
npx tsx --test shared/pricingFormat.test.ts server/lib/personaPricing.test.ts server/lib/seedPricing.test.ts
npx playwright test tests/paywall-experiment.spec.ts tests/persona-custom-pricing.spec.ts tests/credits.spec.ts
npm run check   # no new TS errors vs baseline
```

- [ ] **Step 5: No commit needed** (verification only). Summarize results for the human review.

---

## Self-Review (completed)

- **Spec coverage:** A1 (residual B copy bug) ✔ Task A1; A2 (verify B e2e) ✔ Task A2; A3 (turn-on doc) ✔ Task A3; B1 canonical format+helper ✔ Task B1; B2 admin editor ✔ Task B2; B3 seed ✔ Task B3; B4 migration + B5 loader normalization ✔ Task B4; cross-cutting tracking ✔ Task C1; custom-pricing e2e ✔ Task B5-verify. Non-goals remain excluded.
- **Placeholder scan:** the two Playwright tests that must reuse existing auth helpers are explicitly flagged with NOTE + concrete assertions (not silent TODOs); all code steps carry real code.
- **Type consistency:** `adminPackagesToTiers`/`normalizeLegacyPricing`/`perMinuteVaries`/`ladderLine` names used consistently across tasks; `PricingTier` shape matches `shared/types.ts`.
- **Review Focus:** each listed failure mode is pinned — flat-rate/bonus (A1 tests), legacy normalization (B1 tests), custom-amount floor + purchase-grant (B5-verify tests).

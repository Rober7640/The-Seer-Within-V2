# BE-03 (Judgement Day) — local end-to-end test runbook

Plan 2 makes 03 a full funnel: booking → order bump → Upsell 1 → Upsell 2 → thank-you,
via the shared `/offers/upsell/` pages with 03's (de-personalized) copy.

## What automated checks already prove
- `npm run check` at the repo's pre-existing baseline (no new type errors).
- All unit tests green (judgement copy, pitch registry, catalog, be_upsell_orders).
- `npm run build` succeeds (both `/offers/upsell/` pages + the thank-you page emit chunks).
- **Playwright render-smoke passes** (`scripts/walk-03-smoke.mjs`): the booking page, the
  shared upsell page (graceful on a bad session), and the thank-you/Entry page all render
  at their new `/offers/` URLs with zero page-errors.

Run the smoke yourself:
```bash
DATABASE_URL='postgresql://<you>@localhost:5432/seer_local' PORT=5051 npm run dev   # terminal A
BASE=http://localhost:5051 node improve-v1/v1-one-time-BEs/scripts/walk-03-smoke.mjs # terminal B
```

## The one piece a headless smoke can't do: a real paid walk
A full purchase needs Stripe's hosted checkout (a test card) + the webhook — do this by hand:

1. **Enable checkout** (it's build-time gated). Set `VITE_BACKEND_CHECKOUT_LIVE=true`
   (e.g. in `.env`/`.env.local`) and **restart** `npm run dev` (Vite reads it at build).
   Use **Stripe TEST** keys (the worktree `.env` already has `sk_test_…`).
2. Ensure `seer_local` has `be_orders` + `be_upsell_orders` (Plan 1 provisioned them).
3. Walk it in a browser at `http://localhost:5051`:
   - `/offers/wiccan/judgement-day?fn=Sarah` → tick the 4 agree boxes → **Give** (amount ≥ $17) →
     optionally take the **Unburdening** bump → checkout.
   - Pay with Stripe test card `4242 4242 4242 4242`, any future expiry/CVC.
   - You land on `/offers/upsell/welcome1?session_id=cs_…` → 03's Upsell 1 chat (de-personalized).
     Accept or decline → `/offers/upsell/welcome2` (Upsell 2, incl. the $30 downsell) →
     `/offers/wiccan/judgement-day/success` (the thank-you = Entry: "reply to the email").
4. **Verify attribution** (Plan 1): after an accepted upsell,
   ```bash
   DOTENV_CONFIG_PATH=.env.test npx tsx server/scripts/be-upsell-stats.ts
   ```
   Expect a `be_upsell_orders` row with `offer='judgement-day'` (and the initial in `be_orders`).
   The AWeber tag applied is `be-03-upsell1-protection` / `be-03-upsell2-bracelet`.

## Notes / open items
- **03 upsells are de-personalized** (Joel's ruling): no Claude reveal/personalize, no bucket/name —
  the U1 block is universal. The 3 universal connective lines in `judgementUpsellCopy` are flagged
  for Joel's copy eyeball.
- The Entry is an **email reply** (per `03-T1`), not an on-page form.
- Still Joel's, not needed to test the funnel: the 03 **product PDF** + delivery email.
- Go-live (separate from local test): run `create-be-upsell-orders-table` on prod (Plan 1), and
  confirm 03's upsell AWeber Campaigns trigger off the tag (shared lists 6972555/6972556).

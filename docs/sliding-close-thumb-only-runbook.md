# Sliding close ($55 / $35) — thumb-only 50/50: test path & go-live

**⚠ RETIRED 2026-07-26** — `55-35_palm` is parked at weight 0, superseded by the
`35_palm_gate` commitment-gate A/B test. Kept as a historical record only.

**Decision (Joel, 2026-07-14 call):** the sliding close runs **50/50** against the current
close, on the **fb-palm THUMB ads only**.

> "We should never put new tests onto a new lander… the one that is getting the most traffic
> is still the thumb. The test should go on to thumb, and then once Ruby has confirmed hand
> size or the decode-him or finger shape is working, then we will make sure the test also
> goes to those."

**Decision (Lewis, 2026-07-14):** the **root** funnel stays **out** of the test (~15 visitors/day
→ can never reach significance).

---

## 1. The constraint that shapes everything

**Dev and production share ONE database.** There is no staging DB. So editing
`system_config.v1_price_variants` — the thing that starts the test — is **instantly live to
~620 real fb-palm conversations/day** and cannot be rehearsed first.

That is not a hypothetical: a corrupted key (`"down  sellCents"`) silently killed the root $45
test for two weeks, and nobody could see it, because there was no way to try the config first.

Two mechanisms exist now so a config flip is never again a leap of faith:

| | |
|---|---|
| **`V1_PRICE_VARIANTS_JSON`** | Env var that **replaces** the DB variant pool for one process. Set it on Railway **dev** (or locally) to serve the exact pool you intend to ship while production's row — and production traffic — stay untouched. Loudly logged; `/admin/price-test` reports `variantsSource: "env"`. **Must never be set on production.** |
| **Validator hardening** | A variant missing `downsellCents > 0` is now **dropped and logged as an error** instead of silently serving a NULL price. Unknown keys (the typo fingerprint) are logged too. |

---

## 2. How thumb-only works

`system_config` variants gained an optional **`signs`** array:

```jsonc
{"id":"35_palm_u47", "funnel":"v1-palm", "weight":1, ...}                    // no signs → EVERY sign
{"id":"55-35_palm",  "funnel":"v1-palm", "weight":1, ..., "signs":["thumb"]} // thumb ONLY
```

- `funnel` is a **partition** (palm traffic never sees root/fb variants).
- `signs` is an additive **filter** — it never removes the unscoped control from the pool.

So **thumb** draws from a 2-variant pool (50/50), and **hand-size / finger-shape / palms / …**
draw from a 1-variant pool → **100% control**. Palm traffic with no `?sign=` is treated as
thumb, because the bridge deliberately omits `&sign=` for its default sign.

**Extending the test to another sign is a pure config edit** — append to the array:

```jsonc
"signs":["thumb","hand-size"]
```

New traffic on that sign joins the 50/50 within 60s. **No code, no deploy.** That is exactly the
"then we will make sure the test also goes to those" step, made cheap.

---

## 3. Test it on dev — BEFORE production

### 3a. Unit tests (no DB, seconds)

```bash
npm run test:price
```

35 tests. They run against the **real shipping artifacts** (`improve-v1/go-live-pool.json` and
`improve-v1/go-live-55-35-config.sql`), including a **drift guard** that fails if the SQL and the
JSON ever disagree — so dev can't rehearse a pool that production won't get.

### 3b. Integration — isolated local sandbox (the real proof)

Drives the real `/api/lead` endpoint: real assignment, real DB writes, real stickiness.

```bash
# 1. sandbox Postgres (isolated — NOT the shared prod DB)
"D:\pg-local\pgsql\bin\pg_ctl.exe" -D "D:\pg-local\data" -l "D:\pg-local\logfile" -o "-p 5433" start

# 2. env file with the sandbox DB + the go-live pool + EVERY integration muted
node scripts/make-sandbox-env.mjs

# 3. run the app against it
DOTENV_CONFIG_PATH=.env.sandbox npx tsx server/index.ts

# 4. the spec
npx playwright test --config=playwright.sliding-close.config.ts
```

It asserts: thumb ≈50/50 · **every other sign 100% control** · the sliding arm charges **$55 main
/ $35 grace** (not the legacy $25) · sticky assignment · spoofed signs can't reach the $55 arm.
The spec **refuses to run against any non-localhost URL**, and fails loudly if the sliding arm
isn't configured (so "hand-size never gets $55" can't pass vacuously).

> ### ⚠️ ALWAYS use `.env.sandbox`. Do not hand-blank env vars.
> On Windows, `$env:FB_ACCESS_TOKEN = ''` **deletes** the variable rather than emptying it —
> and `import "dotenv/config"` then repopulates it from the real `.env`. A run that did this on
> 2026-07-14 isolated the *database* correctly but still fired **309 live `Lead` events at the
> Meta pixel** and made 309 AWeber calls. `scripts/make-sandbox-env.mjs` + `DOTENV_CONFIG_PATH`
> is the only reliable mute: dotenv never reads the real `.env` at all.

### 3c. Optional — clickable rehearsal on Railway dev

Set on the **dev service only**:

```
V1_PRICE_VARIANTS_JSON = <contents of improve-v1/go-live-pool.json>
```

The dev URL then serves the real thumb 50/50 for you / Joel / Ruby to click, while production's
config row is untouched. **Note:** dev writes its conversation rows to the *shared* DB, so use
recognisable test emails and clean them up. Confirm `/admin/price-test` shows
`variantsSource: "env"` on dev — and **`"db"` on production**.

---

## 4. Go live (order is non-negotiable)

1. **Deploy the code to Production.** It is dark: no `55-35*` variant is configured, so every
   lander is byte-identical. `npm run test:price` must be green.
2. **Verify prod is dark** — `/admin/price-test` shows `variantsSource: "db"`, and no `55-35_palm`
   in the pool.
3. **Run the SQL** — `improve-v1/go-live-55-35-config.sql`, as a separate, deliberate step.

   > 🔴 **Never run the SQL first.** Without the code, anyone assigned `55-35` sees the *classic*
   > close at **$55 with no grace option and no choice card**. And a build without `signs`
   > support ignores the key entirely and puts the test on **every** palm sign.

4. **Verify within minutes:**
   - Railway prod logs → `priceVariant: assigned`. **Every** hit with `variant=55-35_palm` must
     carry `sign=thumb`. Any other sign = contamination → roll back.
   - The split query at the bottom of the go-live SQL. A **NULL `grace_cents`** on `55-35_palm`
     means the config is corrupted and the $35 grace charge is broken → roll back immediately.
5. **Tell Ruby** the thumb ads are now the test — ad spend and creative must stay **constant**
   while it runs, or the comparison is biased.

**Rollback:** set `55-35_palm` weight to `0`. New traffic reverts within 60s (config cache TTL);
already-assigned buyers keep the price they were quoted (sticky by design — a visitor's price must
never flip mid-funnel).

---

## 5. Still open (not blockers, but decide before/soon after launch)

- **AWeber tags grace buyers `downsell`, not `initial-purchase`.** Harmless in code, but under the
  sliding close the $35 grace option is offered *up front*, so `downsell` may become the **majority**
  of buyers. If any AWeber automation fires off the `initial-purchase` **tag** rather than paid-list
  membership, most buyers will now be skipped. **Confirm which**, then decide. (~5-line fix.)
- **Measurement:** the metric is **revenue per visitor**, not conversion — the arm deliberately
  trades take-rate for AOV. Need a minimum run length and a kill threshold.
- **Meta pixel, 2026-07-14:** ~309 junk `Lead` events were pushed to the live pixel by the
  mis-isolated sandbox run above (all `@example.com`, `funnel=v1-palm`). Today's palm Lead count is
  inflated by roughly half a day's volume. Not deletable retroactively — just don't trust 7/14 lead
  numbers for palm.

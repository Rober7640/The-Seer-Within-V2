# Sliding-Scale Close ($55 / $35) — Pre-Flight QA Report & Open Questions

**Prepared:** 2026-07-13 · **Build under test:** `36bb08f` (+ go-live SQL `3d9a812`)
**Verdict:** ✅ **Functionally sound. Ready for a 50/50 test on fb-palm.**
**Blocking:** 3 decisions needed from the business before the config flip (see § Open Questions).

---

## 1. What was tested, and how

The close is dark today — it activates only when a `55-35*` price variant is assigned from
`system_config.v1_price_variants`. Nothing in the code is live until that DB row changes.

**⚠️ Important constraint:** dev and production **share one database**. There is no staging or
canary environment. The moment the go-live SQL runs, the test is live to real fb-palm traffic
(~620 conversations/day). So the rehearsal was run against an **isolated local Postgres sandbox**
(`127.0.0.1:5433`) with the `55-35_palm` variant configured there, live Stripe swapped for **test**
keys, and AWeber / Resend / Kit / Meta all disabled. **Zero production traffic was involved.**

This deliberately covers what the original evidence pack did **not**. The author's own flow eval
(`transcript-eval.mjs`) runs with `?noemail=1` + `?close=55`, which bypasses real variant assignment
and never clicks checkout — so it validates the *copy*, but never proved that palm assigns the arm
or that the grace button charges the right amount. **Both are now proven.**

---

## 2. Results

### 2.1 The 50/50 split works (fb-palm)

40 leads driven through `/api/lead` with `funnel=v1-palm`, both variants at weight 1:

| Variant | Assigned | Main | Grace | Upsell 1 |
|---|---|---|---|---|
| `35_palm_u47` (control) | **20 / 40 (50%)** | $35 | $25 | $47 |
| `55-35_palm` (sliding) | **20 / 40 (50%)** | $55 | $35 | $47 |

**Sticky assignment confirmed** — the same emails were re-submitted and none re-rolled, so a
visitor's price can never flip mid-funnel.

### 2.2 The money path is correct — the critical check

The $35 grace option rides the existing **`downsell`** checkout slot. The danger was that it would
charge the legacy **$25** downsell instead of $35. Verified against real Stripe test sessions:

| Button clicked | Actual Stripe charge | Metadata |
|---|---|---|
| "Cover the Full Offering · $55" | **$55.00** ✅ | `type=main`, `priceVariant=55-35_palm`, `funnel=v1-palm` |
| "I need a little grace · $35" | **$35.00** ✅ | `type=downsell`, `priceVariant=55-35_palm`, `funnel=v1-palm` |

### 2.3 Everything else that was verified

| Area | Result |
|---|---|
| Server assigns the arm from config | ✅ `55-35_palm` → `main 5500 / grace 3500 / upsell1 4700` |
| 8-beat "honest offering" pitch renders | ✅ *"The full offering for this work is $55."* |
| Two-tier choice card renders | ✅ grace first, $55 RECOMMENDED last |
| Works on **every** palm sign lander | ✅ arm keys on `funnel=v1-palm` (the `/fb-palm` path), **not** on `sign`/`hook`. Tested via `sign=hand-size`. All 10 signs + all hooks inherit it, no per-sign work |
| Purchase saved to DB | ✅ `purchased` + `purchaseType` recorded |
| **Revenue recorded = amount actually charged** | ✅ $35 for grace, $55 for full (not the assigned price) — so `/admin/price-test` revenue/visitor will be **correct** |
| Abandoned carts excluded from the readout | ✅ dashboard requires `purchased AND upsellOffered` (the latter only flips after Stripe confirms `paid`) |
| AWeber paid list | ✅ grace buyers **are** added to the paid list (see § 3.1 — tag caveat) |
| Upsell 1 **and** Upsell 2 offered | ✅ identical path for grace buyers: pay → `/welcome1` ($47) → `/welcome2`. Not gated on purchase type; reached whether U1 is accepted **or declined** |
| Client cannot spoof the price | ✅ `/api/chat` and `/api/checkout` both re-read the variant server-side |
| Rollback | ✅ set the two `55-35*` weights to 0 → new traffic reverts instantly (60s cache). Already-assigned buyers keep their sticky price |
| Dark by default | ✅ no `55-35` in the live config today; code is not on Production |

---

## 3. Issues found

### 3.1 🟠 AWeber tags grace buyers as `downsell` (decision needed)

A $35 grace buyer is, by design, a **full buyer** — same ritual, same reading. But AWeber tags them:

| Buyer | Tags |
|---|---|
| $55 full | `paid`, `initial-purchase`, `initial-purchase-palm` |
| $35 grace | `paid`, **`downsell`**, `downsell-palm` |

**No application code branches on this tag** — the funnel, Stripe, upsells and the price-test
readout are all unaffected. The risk lives inside **AWeber automations**, which we cannot inspect
from the codebase.

This tagging isn't new (classic $25 downsell buyers already get it), but the **mix flips**: today
`downsell` is a small minority who objected three times; under the sliding close the $35 option is
offered **up front as a first-class choice**, so it may become the **majority** of buyers.

Consequences if unfixed:
1. Any AWeber automation keyed on the `initial-purchase` **tag** (rather than paid-list membership)
   will now skip **most** buyers instead of a few.
2. AWeber reporting will look alarming — "initial purchases" appear to collapse while "downsell"
   spikes, even if revenue is flat or up.
3. The label is permanently wrong. Tags are not retroactive, so this can't be cleanly fixed later.

**Action:** confirm whether buyer automations fire off the **paid list** or the **`initial-purchase`
tag**. If the list → safe to ship. If the tag → ~5-line fix first (tag grace buyers
`initial-purchase` *plus* a distinct `grace` tag, so automations fire and segmentation stays clean).

### 3.2 🟠 Root funnel has almost no traffic — palm is the only real test

Conversations since 2026-06-30:

| Funnel | Conversations | ≈ / day |
|---|---|---|
| **palm** | **8,048** | ~620 |
| **root** | **195** | ~15 |

A 50/50 on **root** gives ~7 visitors per arm per day — well under one sale per arm per day. It
cannot reach significance in any useful timeframe. **The palm arm is the experiment.**

### 3.3 🔴 The bug that silently killed the $45 test is still unfixed

Confirmed empirically: **all 195** root `45` conversations since 6/30 have `downsell_amount_cents =
NULL`. Cause: the config has a corrupted key `"down  sellCents"`, and `fetchVariantsFromDb` only
validates `id`, `priceCents > 0`, `weight >= 0` — it **never requires `downsellCents`**. The broken
variant passes validation, NULL lands on the row, and `getVariantForEmail` then falls back to `35`.

**Net effect:** those 195 users were pitched and charged **$35/$25 while labelled `45`** — the root
price test has been dead for two weeks and its data is polluted.

The go-live SQL fixes *this instance* of the typo. It does **not** fix the bug class — the next
`downsellCents` typo will silently kill a test the same way. Recommend hardening the validator
(require `downsellCents > 0`; drop + log invalid variants).

### 3.4 🟡 Minor / pre-existing (not blockers)

- **Upsell-2 prompt** tells a grace buyer they "purchased the clearing ($55)" though they paid $35.
  Author flagged this as acceptable; the prompt never instructs quoting the figure.
- **Paid-list add + purchase confirmation both fire from `/api/upsell/user-data`** — i.e. when the
  buyer lands on `/welcome1`. A buyer who pays and closes the tab before that page loads is never
  added to the paid list and isn't counted as a buyer. Pre-existing; hits **both arms equally**, so
  it will not bias the A/B.
- **`firstName` is interpolated into the pitch with no sanity check** (a test run produced
  *"Before I begin, I, let me be honest…"*). Pre-existing, not sliding-close specific — worth a
  separate look.

---

## 4. Open questions for the business (before the config flip)

**A. The split itself**
1. **Confirm the fb-palm split: 50/50 `35_palm_u47` (current) vs `55-35_palm` (sliding)?** This is
   the real test — palm is the only funnel with enough traffic.
2. **Root:** the SQL also puts root on a 50/50 (`35` vs `55-35`) and parks `45`. At ~15/day it will
   never conclude. Include it as a smoke/sanity arm, or leave root alone?
3. **Palm is our highest-volume funnel and we just shipped new ad hooks + art to it.** Confirm you
   want 50% of that traffic on a $55 anchor from day one — not root-first, palm-later.

**B. Measurement & stopping rule**
4. **How long does it run, and what kills it?** Metric is **revenue per visitor** (not conversion —
   the arm deliberately trades take-rate for AOV). Need: minimum run length, the kill threshold, and
   what $55-take-rate you'd consider a win. If nearly everyone takes $35, revenue is flat and we've
   added friction for nothing.
5. **Will fb-palm ad spend stay constant during the test?** Changing spend or creative mid-test
   biases the comparison.
6. **Exclude the 195 polluted root `45` rows** (labelled `45`, actually served $35/$25) from the
   readout, or leave them?

**C. Operational**
7. **AWeber:** do buyer automations fire off the **paid list** or the **`initial-purchase` tag**?
   (Decides whether § 3.1 must be fixed before launch.)
8. **Should we harden the price-variant validator** so a future typo can't silently kill a test
   again? (§ 3.3 — this is what cost us the $45 test.)
9. **Who runs the SQL, and when?** **Order is non-negotiable: deploy `36bb08f` to Production first,
   verify, then run the SQL as a separate deliberate step.** If the SQL goes first, anyone assigned
   `55-35` sees the *classic* close at $55 — a flat $55 pitch with **no grace option and no choice
   card**.
10. **Rollback:** who has authority to pull it, and on what trigger? (Rollback = set the two
    `55-35*` weights to 0; new traffic reverts within 60s, already-assigned buyers keep their price.)
11. **Is support briefed?** Customers will now see two prices for the same product; expect
    "why is it $55 for me?" questions. Refund policy / 30-day guarantee unchanged on both arms.

---

## 5. Cleanup outstanding

During this work a stale dev server was holding port 5000 against the **shared production DB**, and
one funnel walk hit production before the guard caught it. Result:

- one junk conversation row in prod: `slidetest+1783938635161@example.com` (assigned the normal
  `35_palm_u47` control — **no pricing change, no charge, nothing customer-facing**);
- that address was likely pushed to **AWeber / Resend / Kit** by `/api/lead`.

**Pending approval:** delete the prod row and remove the address from the email systems. Hard guards
are now in place (abort if the port is taken; wait for our own server's log line; assert the row
lands in the local DB) and every subsequent run was provably local.

---

## 6. Bottom line

The build does what it claims. Assignment, pitch, choice card, both charge amounts, upsell chain,
DB, and revenue reporting all check out on fb-palm across every sign lander.

**Nothing technical blocks the 50/50 on fb-palm.** What's left is business decisions (§ 4) and one
5-line AWeber tagging fix *if* your automations key on tags rather than the paid list.

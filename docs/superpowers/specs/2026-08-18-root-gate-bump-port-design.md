# Port the commitment gate + order bump to ROOT (`v1-root`)

**Date:** 2026-08-18 · **Status:** design approved (operator, 2026-08-18) · **Ships dark.**

Root is the original Evelyn funnel — `/`, `/chat`, `/welcome1`, `/welcome2`, `/success` —
the one email traffic lands on, before fb-palm and fb-tarot existed. It runs today with
neither of the two optimizations those funnels proved.

---

## Decisions (operator, 2026-08-18)

| | |
|---|---|
| Commitment gate on root | **Ship to everyone.** No test |
| Main-path order bump on root | **Ship to everyone.** No test |
| Downsell bump on root | **Split test** — pool root into the existing tarot row, do not create a second one |
| How "everyone" is expressed | Mark the rows `done` with a winner and widen `scope.funnel`. `assign()` already rolls a declared winner out to everyone in scope (`experiments.ts:397`) |
| Bump fulfilment | Nothing extra to deliver — root inherits the winning **double-strength clearing** copy, which sells depth on the one clearing rather than a second reading |
| `/fb`, `/fb2`, `/gdn` | **Out.** Root only. Adding them later is one more entry in the scope array |

**Why no test on root.** Root is ~10 pitch-arrivals/day at 4.4% pitch→paid, against
tarot's ~180 at 9.6% — roughly **13 buyers/month**. Both effects are already proven on two
funnels. A 50/50 split on root would halve the benefit and still never reach a verdict.

---

## 1. What is being ported, and what is not

| | Ported | Why |
|---|---|---|
| Commitment gate (`CommitmentGateCard`) | ✅ | Proven on palm, extended to tarot 2026-07-31 |
| Main-path order bump + winning copy | ✅ | Live at 30%+ take; copy arm B won 37.8% → 54.5% (p=0.034) |
| Downsell bump ($9.77 / $12.77) | ✅ as a test | Root's downsell is $25, same as tarot's — the parity maths carries over unchanged |
| **Close depth** (`v1_close_depth_2026`) | ❌ | Deliberately tarot-scoped. The reason is written into `experiments.ts:1576-1578`: root would add ~5% sample while mixing two baselines. Nothing here changes that |
| **`hours-55-35_tarot`** | ❌ | Design only, no code, and 4th in the queue |

**No new UI is built.** `CommitmentGateCard`, `BumpOfferCard`, `startPurchase` and the
`/api/checkout` path are already funnel-agnostic — `ChatPage.tsx:269-320` branches on
`userData.commitmentGate` and `chat.showBumpOffer`, never on which lander she came from.

---

## 2. The actual blocker: root has no funnel param

`currentFunnel()` returns `undefined` for `/` — by design, so root requests stay
byte-identical to the pre-ad-funnel app (`client/src/lib/funnel.ts:26-30`). `FunnelParam`
is `"v1-fb" | "v1-fb2" | "v1-gdn" | "v1-palm" | "v1-tarot"`; root is the absence of all of
them.

Both live rows are scoped `scope.funnel = ['v1-palm','v1-tarot']`, and an array scope can
never match root:

```ts
// server/lib/experiments.ts:273-279
if (Array.isArray(scopeFunnel)) {
  const funnels = scopeFunnel.filter(f => typeof f === 'string' && f.length > 0);
  if (funnels.length === 0) return true;
  return typeof contextFunnel === 'string' && funnels.includes(contextFunnel);
}
```

`contextFunnel` is `undefined` on root, so the `typeof` check fails and root always lands
on control. That is the whole reason root has neither feature — not missing UI, not missing
checkout support.

### Approach chosen: a server-side sentinel, experiments only

Root keeps sending nothing. The four V1 resolvers translate an absent funnel into the
string `'v1-root'` before calling `assign()`, and the exposure contexts stamp the same
value. Nothing else in the app learns the sentinel exists.

Lives in `server/lib/experiments.ts` next to `matchesFunnelScope` — this is experiment
plumbing, not offer config, so it does not belong in `shared/orderBump.ts`.

```ts
/**
 * The funnel string the EXPERIMENT FRAMEWORK sees for V1 traffic.
 *
 * Root V1 (`/`, `/chat`) deliberately sends no funnel param, so `context.funnel`
 * is undefined there and an array `scope.funnel` can never match it
 * (matchesFunnelScope requires a string). Every V1 test would silently skip root.
 *
 * 🔴 EXPERIMENTS ONLY. Never pass this to the price pool. scopeVariantsToFunnel
 * matches `(v.funnel ?? null) === target` exactly and falls back to the WHOLE pool
 * when nothing matches — so a root visitor carrying 'v1-root' would stop matching
 * the unscoped `35`/`45`/`59` variants and start drawing `45_fb`, `35_palm_u47`
 * and every other funnel's price. See §6, risk 1.
 */
export const ROOT_FUNNEL = 'v1-root';

export function experimentFunnel(funnel?: string | null): string {
  return typeof funnel === 'string' && funnel.length > 0 ? funnel : ROOT_FUNNEL;
}
```

### Why not the two obvious alternatives

**Make root a real funnel in `shared/funnelConfig.ts`.** Rejected. `scopeVariantsToFunnel`
(`server/lib/priceVariantPool.ts:188-195`) returns the entire pool when no variant matches
the target funnel, and root's `35`/`45`/`59` carry no `funnel` field. The day root starts
sending `'v1-root'` it draws palm and fb prices. It would also change root's Stripe product
suffix and AWeber tag, which are finance and list-segmentation surfaces. All fixable, none
of it needed for this.

**Drop `scope.funnel` from the rows.** Rejected twice over: it sweeps in `/fb`, `/fb2` and
`/gdn`, and the start guard (`server/routes/admin/experiments.ts:990-996`) refuses to start
a `v1_main_funnel` test with no funnel scope.

---

## 3. Code changes

### 3.1 Where the translation goes — inside the resolvers, not the call sites

There are **seven** places that resolve these arms, and they must all agree:

| Where | Line | Resolves |
|---|---|---|
| Lead capture | `priceVariant.ts:305` | `resolvePalmGate` |
| Lead capture | `priceVariant.ts:347` | `resolveV1Bump` |
| Lead capture | `priceVariant.ts:384` | `resolveV1CloseDepth` |
| Checkout | `routes.ts:807` | `resolveV1Bump` |
| Checkout | `routes.ts:828` | `resolveV1DownsellBumpPrice` |
| Resume | `routes.ts:1558` | `resolvePalmGate` |
| Resume | `routes.ts:1559` | `resolveV1Bump` |

🔴 **A disagreement between any two of them is a billing bug, not a cosmetic one.** The
downsell bump is living proof: the card reads one price and `/api/checkout` resolves
another, and the only thing hiding it is that both currently fall back to the same number
(§5).

So the sentinel is applied **once per resolver**, at the top of each function body in
`server/lib/experiments.ts`:

```ts
export async function resolvePalmGate(email, funnel?, sign?, key = PALM_GATE_EXPERIMENT_KEY) {
  const subject = typeof email === 'string' ? email.trim().toLowerCase() : null;
  const a = await assign(key, subject, { funnel: experimentFunnel(funnel), sign: sign ?? null });
  ...
```

Same one-line change in `resolveV1Bump`, `resolveV1DownsellBumpPrice` and
`resolveV1CloseDepth`. **None of the seven resolver call sites above changes** — they keep
passing the raw `funnel` they already have, so they cannot drift apart from each other.
(The three `logExposure` calls in §3.2 are a separate, cosmetic edit.) A future resolver
that forgets the helper
simply behaves as today (root skipped), which is the safe direction to fail.

**Why not inside `assign()` itself.** `assign()` is shared with the V2 persona-prompt and
paywall tests, where an absent funnel is genuinely "not a funnel test". Stamping `v1-root`
on those exposures would write false data into `experiment_exposures.context`.

### 3.2 Exposure context

The three `logExposure` calls in `priceVariant.ts` (lines 330, 360, 399) pass
`funnel: funnel ?? null`. Change to `funnel: experimentFunnel(funnel)` so root's rows are
identifiable in the tally — `server/lib/experiments.ts:1119` already reads
`e.context->>'funnel'` for the per-funnel breakdown, and a null there reports as
unrecorded.

### 3.3 Nothing else

No client change. No new component. No schema change. `bumpProductName(funnelSuffix)`
resolves to `"+ Double-Strength Clearing"` with an empty suffix on root, matching how
root's main product name already omits one.

---

## 4. Shipping the gate and the bump — two SQL edits

Both use the same shape: widen `scope.funnel`, set `status = 'done'`, set `winner_variant`.
`assign()` then applies the winner's payload to everyone in scope with `enrolled: false`,
so no new exposures accumulate and the tally is frozen at what it already collected.

| Row | New scope | Status | Winner |
|---|---|---|---|
| `v1_palm_commitment_gate_2026` | `['v1-palm','v1-tarot','v1-root']` | `done` | the arm whose payload is `{gate: true}` |
| `v1_bump_copy_2026` | `['v1-palm','v1-tarot','v1-root']` | `done` | `B` |

⚠ **Read the gate row's arm key off the database, do not assume `A` or `B`.** That row was
never seeded from a file in this repo — it was created by a transactional write replicating
`/start` on 2026-07-28 — so the repo cannot tell you which key carries `gate: true`. The
bump row's `B` *is* in the repo (`improve-v1/create-bump-copy-experiment-2026-08-11.sql:98`).

**One bump row, not two.** `V1_BUMP_EXPERIMENT_KEY` resolves to
`V1_BUMP_EXPERIMENT_KEY_DEFAULT = 'v1_bump_copy_2026'` (`shared/orderBump.ts:312`), and the
env override is set on no environment. Both of that row's arms carry `payload.bump = true`,
so declaring B the winner hands root the bump **and** the winning copy in one move.
`v1_order_bump_2026` is no longer read and needs nothing.

Raw SQL, not the admin UI: the assignment freeze in
`server/routes/admin/experiments.ts` 409s any scope edit on a non-draft row. Same
deliberate one-off override as `improve-v1/extend-gate-to-tarot-2026-07-31.sql`, and for
the same reason — the bucket is `sha256(subject_id + key) % 100` and does not read `scope`
at all, so no already-enrolled palm or tarot subject is re-bucketed or moved.

🔴 **Pre-flight, on the day.** Both rows must already be concluded. If either is still
`running` on palm/tarot, marking it `done` **ends that test**. Check status first and get
an explicit operator decision; do not assume the docs match the database.

### Copy on root

Root inherits variation A verbatim:

> Before I begin, {firstName} — one thing.
> A shadow this old has roots. Three hours gets its hold. It doesn't always get the root.
> For $12.77 I'll go twice as deep tonight. Six hours instead of three, double the force, all the way down.
> It drains me more. But nothing gets left in you.

This is the only reason root needs no fulfilment coordination. Variation A is
bucket-agnostic by construction (`shared/orderBump.ts:339-341`) — it sells depth on the one
block Evelyn already found, so there is no second topic to name and no second artifact to
produce. **Control's copy would not port cleanly**: it offers a second reading on a paired
topic, and root is the only funnel where `BUMP_PAIRINGS` would actually fire all four
branches (palm and tarot both hardcode love).

The gate's three statements are topic-neutral and ship unchanged.

---

## 5. The downsell bump test — root joins the tarot row

`v1_downsell_bump_price_2026` (spec: `2026-08-16-v1-downsell-bump.md`) stays **one** test.
Scope widens from `['v1-tarot']` to `['v1-tarot','v1-root']`; arms, stopping rule and
verdict metric are untouched.

| Parameter | Value |
|---|---|
| Arms | A `{bumpCents: 1277}` · B `{bumpCents: 977}`, 50/50 |
| Primary | Revenue per downsell buyer — never take-rate |
| Guardrail | Downsell **completion**, both funnels, monthly eyeball |
| Stop | **Date: 2026-11-17.** Not a p-value |

**Why pool rather than create a root row.** Root produces ~2 downsell buyers/month. A
root-only split is one buyer per arm per month — not a weak test, an unreadable one. Tarot's
own version was already declared unable to reach significance; adding a second, thinner copy
of it would produce two unreadable results instead of one marginal one.

### 🔴 Hard prerequisite — fix the billing bug before this row is started

Found 2026-08-17, browser-verified. Arm A would **show her $9.77 and charge her $12.77**:

- `/api/checkout` resolves the real arm — `routes.ts:826-831` ✅
- `/api/lead` never sends `bumpCentsDownsell` — it is absent from the response built at
  `routes.ts:1355-1371`, and `grep` finds the field in three client files and **zero**
  server files
- so `BumpOfferCard` is pinned to the `resolveBumpCents(undefined, 'downsell')` fallback of
  $9.77 (`ChatPage.tsx:308-311`)

Harmless while the row is `draft` — with no arm assigned both sides fall back to $9.77 and
agree. **Starting the row is what breaks them apart**, on root exactly as on tarot.

The fix is the shape `bumpCopy` already uses: resolve the arm at lead capture, return
`bumpCentsDownsell` on the `/api/lead` response, capture it client-side.

**Second gap, worth fixing in the same pass:** `resolveV1DownsellBumpPrice` logs **no
exposure at all** (`experiments.ts:1547-1558`), so the row currently has no denominator.
Resolving at lead capture supplies one — note that it then enrols every root and tarot
lead, not only downsell-reachers, so "exposed" changes meaning. The verdict metric (revenue
per downsell buyer) is unaffected.

---

## 6. Risks and open questions

1. **Root's dormant price arms.** Root's pool is `35` (weight 1) with `45`, `59` and
   `55-35` parked at weight 0, so root is $35/$25 today and the $9.77 proportional-parity
   argument holds exactly. If `45` or `59` is ever re-weighted the downsell becomes
   $32/$42 and the ratio breaks. Not guarded in code — a stated assumption, to be
   re-checked before any root price arm is revived.
2. **The sentinel must never reach the price pool.** The single most dangerous line in this
   change would be passing `experimentFunnel(funnel)` into `selectVariant`. Covered by a
   unit test that asserts root still draws from the unscoped variants.
3. **Repeat buyers.** Root is the email list, so a higher share of returning visitors than
   palm or tarot. Both arms bucket on the email hash and re-split the whole population, and
   neither re-prices anyone — the price still comes from her stored `conversations` row. So
   this is safe, but root's before/after will move for mix reasons as well as treatment
   reasons. Do not read a period-over-period number as an effect size.
4. **`ab_visitor_id` on root.** Stamped at lead capture from the cookie
   (`routes.ts:1229`, `readVisitorId`), so it is funnel-independent — unlike the palm
   breakage, which was a missing cookie on the landers. Verify on root before relying on
   any joined readout.
5. **Gate friction on a warm list.** The gate adds three taps before the buy button on
   traffic that already knows Evelyn. Proven on cold ad traffic; unproven on email traffic,
   and shipped without a test by decision. The revert is clearing the winner on one row.

---

## 7. Verification

Before the rows are touched:

- [ ] `npx tsc --noEmit` clean on every touched file.
- [ ] Unit: `experimentFunnel(undefined) === 'v1-root'`, `experimentFunnel('v1-tarot') === 'v1-tarot'`,
      `experimentFunnel('') === 'v1-root'`.
- [ ] Unit: `matchesFunnelScope(['v1-palm','v1-tarot'], 'v1-root')` is **false** —
      widening scope is what enrols root, never the sentinel alone.
- [ ] Unit: root still draws only the unscoped price variants —
      `scopeVariantsToFunnel(pool, undefined)` returns `35`/`45`/`59`/`55-35` and nothing else.
- [ ] Unit: a `done` row with a winner applies its payload on root and enrols nobody.
- [ ] Browser, local sandbox, root `/chat`: reach the close, tick all three gate boxes,
      confirm the bump turn renders, and assert the card's price equals the Stripe line.
- [ ] Browser, second pass: decline three times, reach the $25 downsell, take its bump, and
      assert the same equality at $25 + $9.77.

After the rows are flipped:

- [ ] One real root lead sees the gate and the bump.
- [ ] Exposure rows for root carry `context.funnel = 'v1-root'`.
- [ ] Palm and tarot behaviour is unchanged — same gate, same copy, no new exposures.

## 8. Revert

| Undo | How |
|---|---|
| Gate on root | Clear `winner_variant` on the gate row, or drop `v1-root` from its scope |
| Bump on root | Same, on `v1_bump_copy_2026` |
| Downsell split | Set the row back to `draft` — both sides fall back to $9.77 and agree |
| The sentinel itself | Nothing to revert. With no row scoped to `v1-root` it changes no behaviour |

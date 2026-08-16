# V1 test queue

What we test next, in what order, and why. **Judgement only** — every live number
(what's running, progress, arm splits) comes from the scripts, because a doc that
repeats them is wrong within a day and then nobody trusts it.

```bash
# board: running tests, beat map, whether this doc has gone stale
LIVE_AUDIT_CONFIRM=1 node .claude/skills/v1-funnel-live-audit/scripts/plan-live.mjs --live

# can a new test on these beats run today?
... plan-live.mjs --live --beats price,objections

# targetN for a +30% effect on the live baseline
... plan-live.mjs --live --size --effect 30 --metric pitch-paid

# arm outcomes — SPENDS A LOOK, see "Peeking" below
LIVE_AUDIT_CONFIRM=1 node .../diagnose-live.mjs --live --tally
```

---

## The queue

| | Test | Split | Landers | Why here |
|---|---|---|---|---|
| **NEXT** | Call `v1_bump_copy_2026` for arm B | 50 / 50 | fb-palm + fb-tarot, **all** | Answered: take-rate 37.8% → 54.5%, p=0.034. Gating 55/35 for a $1,156/30d prize. |
| 2 | Call `v1_tarot_version_bc_2026` for arm B | 50 / 50 *(was 30 B / 70 C until 14 Aug)* | **4 named** — `cards-return`, `cards-will-commit`, `cards-feels`, `cards-who-he-is` (83% of tarot traffic) | Directional, not significant. Call on low regret, not evidence — see Peeking. |
| 3 | Start `hours-55-35_tarot` | **50 / 50** — decide before start | fb-tarot, **all** landers | **Before close depth**, because it restructures the close and close depth is built on the structure. |
| 4 | Start `v1_close_depth_2026` | **50 / 50** | fb-tarot, **all** landers | Designed against whichever close wins in 3. |

🔴 **Default to 50/50 and justify anything else.** An uneven split is a bet that the
majority arm is the better one, placed before you have any evidence. B/C ran 70% on arm C
and C turned out to be the weaker arm — roughly $200/day until it was re-weighted on
14 Aug. A 50/50 test also resolves fastest for a given total sample, because power is
maximised when the arms are equal. `plan-live.mjs` flags any arm configured above 60%
without needing to look at outcomes.

🔴 **Scope is not one thing.** `hours-55-35_tarot` and `v1_close_depth_2026` are scoped by
FUNNEL, so they hit all 13 live tarot landers. `v1_tarot_version_bc_2026` is scoped by
LANDER — four of them, 83% of traffic. The remaining 17% (`cards-meant-alone`,
`cards-someone-else`, `cards-come-back`, `cards-hiding-something`, and the tail) is a clean
slice with no opener test on it, and therefore a free single-factor read on anything
funnel-wide that runs alongside B/C.

Live lander shares change weekly — `plan-live.mjs --live` prints the current table with a
column per lander-scoped test.

**Why 55/35 before close depth.** If 55/35 wins, the close is rebuilt — guarantee and
proof hoisted above the price bubbles, objection step-down suppressed, a new offer card
replacing the ending. A thickened close designed against today's close would not transfer.
The reverse is not true: if close depth wins first, 55/35's seven bubbles still drop into a
longer close. Asymmetric, so the restructuring test goes first.

**Cost of that order:** close depth's modelled prize ($8,117/30d) is larger than 55/35's
tier mix ($2,000–5,900/30d). Deferring it ~3 weeks forgoes roughly $5,700 *if it works*,
which is unproven. We are buying a clean sequence with a speculative gain.

---

## Beat map — one test per beat

Two tests on one beat means the copy contradicts itself in one cell. Assignment is
orthogonal (price uses `Math.random()`, experiments use `sha256(email+key)`), so the
problem is **never statistical** — it is always that a cell has to be mutilated to make
sense, and a mutilated cell is not the same treatment as the one it is compared against.

| Beat | Where | Tests |
|---|---|---|
| opener | first chat message, pre-email | `v1_tarot_version_bc_2026` |
| crisis | CRISIS_REVEAL → CRISIS_COST | `v1_clearing_theme_palm_2026_b` |
| ritual | pitch: ritual + deliverable | `v1_close_depth_2026` |
| **price** | pitch: price + guarantee + proof | `hours-55-35_tarot`, `v1_close_depth_2026` ⚠ |
| **objections** | post-pitch objection handling | `hours-55-35_tarot`, `v1_close_depth_2026` ⚠ |
| **bump** | order-bump row before Stripe | `v1_bump_copy_2026`, `hours-55-35_tarot` ⚠ |

The map lives in `plan-live.mjs` as `BEATS` — edit it there when a test starts touching a
new stretch of funnel, or the collision check goes quietly blind.

---

## Per-test parameters

### `hours-55-35_tarot` — two-price close
Spec: commit `d865636`. Variant id deliberately does **not** start `55-35`, because
`isSlidingCloseVariant()` is a `startsWith` match and would co-fire the retired arm.

| | |
|---|---|
| Split | **50 / 50.** Not yet created — set at creation. Do not start it uneven: the retired arm's failure was a conversion effect, and an uneven split makes a conversion loss both bigger and slower to see. |
| Primary | Revenue per visitor through `/success` — not checkout conversion |
| 🔴 Stop-loss | **~15% drop in buyers.** At 30% choosing $55, rev/buyer rises ~18%, so beyond a 15% conversion drop the mix gain stops covering the lost sales. |
| Watch | Conversion, **not** tier mix. The retired arm did not lose on mix — women picked $55. It lost by turning giving into shopping, which only shows in conversion. |
| Gates | `v1_bump_copy_2026` (its card moves the bump row inside itself), `v1_tarot_version_bc_2026` |

### `v1_close_depth_2026` — thickened close *(not created yet)*

```
subject_type: email
variants:  A 50 {}   ·   B 50 { close: "deep" }
scope:     { funnel: ["v1-tarot"], freezeAssignment: true }
conversion:{ type: "v1_main_funnel", targetN: 7300, windowDays: 7 }
```

| | |
|---|---|
| Split | **50 / 50** (`A 50 {}` · `B 50 { close: "deep" }`) |
| Primary | Revenue per 1,000 leads (main + bump + U1 + U2) |
| Guardrail | Pitch→paid (the mechanism) · upsell-1 take (a longer close must not buy the front end at the back end's cost) |
| Detectable | **+30% on a 9.6% baseline. A +20% effect will not be visible** |
| Landers | All 13 live tarot landers — funnel-scoped, not lander-scoped |
| Duration | ~21 days at 356 leads/day. **Recompute targetN at start** — `plan-live.mjs --size --effect 30` reads the live baseline, and it moved 6,800 → 7,300 in a day as traffic shifted. |
| Looks | **Two only** — 3,650 and 7,300 exposures |
| Stop early | Upsell-1 take drops >20% relative in arm B |
| Open | Whether arm B includes its price block. Recommendation: **no** — 315 words / 23 messages, survives the 55/35 transition without a mid-flight re-cut. |

Copy: artifact `bcf892f7-4b4f-4487-b84e-415fca7f35fc`.
Root-lander read-through: artifact `d3c2103b-100b-472a-9d0e-7d7ae0317956`.

---

## Peeking — the rule

Every look at a running test's outcome inflates its false-positive rate:
**1 look 5% · 2 looks 8% · 4 looks 13% · 10 looks 19% · unlimited 100%**
(Armitage, McPherson & Rowe 1969.)

`diagnose-live.mjs` used to tally every running test on **every run**, making peeks a side
effect of asking an unrelated question. Fixed 2026-08-16: outcomes now require `--tally`,
which numbers the look and records it to `audit-runs/v1-funnel-live-audit/experiment-looks.json`.

**Pre-register the look schedule in this doc before a test starts.** Two looks keeps the
effective rate near 6%.

---

## Not tests — no slot needed, currently unowned

Worth more than either experiment in the queue, and invisible because they appear in no
experiment table.

| | Size / 30d | Note |
|---|---|---|
| **Stripe abandonment** | **~$14,489** | 896 women/month click buy and never pay. A recovered one converts at ~100% because she already chose to pay. Biggest single number in the funnel. |
| Upsell-2 reach | ~$1,700 | 81% of buyers are offered it. Find the missing 19% — error, redirect, or exit. |
| `ab_visitor_id` on palm | — | Stamped on 18 of 6,928 palm conversations (0.3%), so `v1_clearing_theme_palm_2026_b` has produced 34 days of unreadable data. Stop that test; fix the stamp before re-running it. |

---

## Decision log

Append, never rewrite. The point is that a conclusion's *basis* survives, so nobody quotes
a number in six weeks that was never load-bearing.

| Date | Decision | Basis |
|---|---|---|
| 2026-08-14 | B/C re-weighted 70/30 → 50/50 | Arm C held 70% while converting worse; ~$200/day |
| 2026-08-16 | Palm traffic stopped | Deliberate — spend cut to test new landers. Not decay. |
| 2026-08-16 | Call `v1_bump_copy_2026` for **B** at 41% of sample | Take-rate p=0.034 is the metric the copy was written to move. Revenue difference between arms is noise (p=0.416). Whole test is worth $1,156/30d and gates a larger one. |
| 2026-08-16 | Call `v1_tarot_version_bc_2026` for **B** on direction, **not significance** | B led at every look and on all four landers, but ~9 looks were spent, and the gap decayed from +41% (15 Aug) to +19% (16 Aug) as data arrived. Ship B because the downside is ~zero, not because it is proven. **Do not quote p=0.023.** |
| 2026-08-16 | Close depth ordered **after** 55/35 | 55/35 restructures the close; close depth is built on the structure. Asymmetric rework risk. |
| 2026-08-16 | Close depth scoped `v1-tarot` only | Root is 10 pitch-arrivals/day at 4.4% vs tarot's 180 at 9.6% — adds ~5% sample while mixing two baselines. Palm has no traffic. |

---

## Baselines *(refresh with `plan-live.mjs --size`; these go stale)*

As of 2026-08-16, fb-tarot, last 7 days:

- **320 leads/day** · 180 reaching the pitch/day
- **pitch → paid 9.6%** · **$65 per buyer**
- Volume down ~65% from the 6–7 Aug peak — deliberate spend cut, not decay

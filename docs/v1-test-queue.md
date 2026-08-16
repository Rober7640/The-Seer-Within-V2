# V1 test queue

> **Next action — call `v1_bump_copy_2026` for arm B.**
> It has already answered its question, and it is blocking the 55/35 price test.

This doc holds only what a script cannot: what we decided and why. Every live number —
what's running, progress, arm splits — comes from `plan-live.mjs`. Commands at the bottom.

---

## Running now

| Test                            | Split | Covers                           | Where it stands                                                         |
|---------------------------------|-------|----------------------------------|-------------------------------------------------------------------------|
| `v1_bump_copy_2026`             | 50/50 | palm + tarot, all landers        | **Done.** Take-rate 37.8% → 54.5% (p=0.034). Call it.                   |
| `v1_tarot_version_bc_2026`      | 50/50 | 4 tarot landers (83% of traffic) | B leads, but directional only. Call it.                                 |
| `v1_clearing_theme_palm_2026_b` | 50/50 | global                           | **Broken.** 34 days of unreadable data — see *Work that needs no test*. |

## Coming next

| # | Test                  | What it changes                     | Split | Covers                   | Starts                              |
|---|-----------------------|-------------------------------------|-------|--------------------------|-------------------------------------|
| 1 | `hours-55-35_tarot`   | Two-price close — $55 alongside $35 | 50/50 | fb-tarot, all 13 landers | When the two above are called       |
| 2 | `v1_close_depth_2026` | Thickened close — 140 → ~315 words  | 50/50 | fb-tarot, all 13 landers | ~3 weeks later, once 55/35 resolves |

**Why 55/35 goes first.** It rebuilds the close — guarantee and proof move above the price
bubbles, the objection step-down is suppressed, a new offer card replaces the ending. Close
depth is designed on top of today's close, so if 55/35 won first, close depth would have to
be redesigned. The reverse isn't true: a longer close still accepts 55/35's bubbles fine.

**What that costs.** Close depth's modelled prize ($8,117/30d) is bigger than 55/35's tier
mix ($2,000–5,900/30d). Deferring it ~3 weeks gives up roughly $5,700 *if it works* — which
is unproven. We're buying a clean sequence with a speculative gain.

---

## Four rules

**1 · One test per beat.** Two tests rewriting the same stretch of script means one cell
contains contradictory copy, and a cell you have to mutilate isn't the same treatment as
the one it's compared against. Assignment is orthogonal, so this is never a statistics
problem — always a copy problem.

| Beat                          | Owned by                                            |
|-------------------------------|-----------------------------------------------------|
| opener — first chat message   | `v1_tarot_version_bc_2026`                          |
| crisis — CRISIS_REVEAL → COST | `v1_clearing_theme_palm_2026_b`                     |
| ritual + deliverable          | `v1_close_depth_2026`                               |
| price + guarantee + proof     | `hours-55-35_tarot` **and** `v1_close_depth_2026` ⚠ |
| objection handling            | `hours-55-35_tarot` **and** `v1_close_depth_2026` ⚠ |
| order-bump row                | `v1_bump_copy_2026` **and** `hours-55-35_tarot` ⚠   |

The ⚠ rows are why close depth waits, and why it ships **without its price block**.
Map lives in `plan-live.mjs` as `BEATS` — edit it there when a test touches new ground.

**2 · Default to 50/50.** An uneven split bets that the majority arm is better before you
have evidence. B/C ran 70% on arm C, C was weaker, ~$200/day until 14 Aug. It costs twice:
the loss while it runs, and slower resolution, since power is maximised at equal arms.

**3 · Two looks, pre-registered.** Every peek inflates the false-positive rate — 1 look 5%,
4 looks 13%, 10 looks 19%, unlimited 100%. Write the look schedule here *before* the test
starts. `diagnose --tally` numbers each look and records it.

**4 · Scope is funnel *or* landers, and they differ.** 55/35 and close depth are
funnel-scoped — all 13 live tarot landers. B/C is lander-scoped — four of them, 83% of
traffic. The other 17% is a clean single-factor slice.

---

## Test details

### `hours-55-35_tarot` — two-price close
Spec: commit `d865636`. Variant id must **not** start `55-35` — `isSlidingCloseVariant()`
is a `startsWith` match and would co-fire the retired arm.

| Parameter     | Value                                                                                                                                                         |
|---------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Split         | 50/50 — set at creation, don't start it uneven                                                                                                                |
| Primary       | Revenue per visitor through `/success`, not checkout conversion                                                                                               |
| **Stop-loss** | **~15% drop in buyers.** At 30% choosing $55, rev/buyer rises ~18% — beyond a 15% conversion drop the mix gain stops covering lost sales.                     |
| Watch         | **Conversion, not tier mix.** The retired arm didn't lose on mix — women picked $55. It lost by turning giving into shopping, which only shows in conversion. |

### `v1_close_depth_2026` — thickened close *(not created)*

```
subject_type: email
variants:  A 50 {}   ·   B 50 { close: "deep" }
scope:     { funnel: ["v1-tarot"], freezeAssignment: true }
conversion:{ type: "v1_main_funnel", targetN: 7300, windowDays: 7 }
```

| Parameter      | Value                                                                                        |
|----------------|----------------------------------------------------------------------------------------------|
| Primary        | Revenue per 1,000 leads (main + bump + U1 + U2)                                              |
| Guardrails     | Pitch→paid · upsell-1 take (a longer close mustn't buy the front end at the back end's cost) |
| Detectable     | **+30% on a 9.6% baseline. A +20% effect will not be visible.**                              |
| Duration       | ~21 days at 356 leads/day. Recompute targetN at start — it moved 6,800 → 7,300 in one day.   |
| Looks          | 3,650 and 7,300 exposures. No others.                                                        |
| Stop early     | Upsell-1 take drops >20% relative in arm B                                                   |
| Arm B contents | Mechanism, ritual, deliverable, objections. **No price block** — that beat belongs to 55/35. |

Copy: artifact `bcf892f7-4b4f-4487-b84e-415fca7f35fc` · root read-through: `d3c2103b-100b-472a-9d0e-7d7ae0317956`

---

## Work that needs no test

Nobody owns these. Together they're worth more than either experiment in the queue, and
they're invisible because they appear in no experiment table.

|                         | Worth /30d   | What                                                                                                                                                 |
|-------------------------|--------------|------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Stripe abandonment**  | **~$14,489** | 896 women/month click buy and never pay. A recovered one converts at ~100% — she already chose to pay. Biggest single number in the funnel.          |
| Upsell-2 reach          | ~$1,700      | 81% of buyers are offered it. Find the missing 19% — error, redirect, or exit.                                                                       |
| `ab_visitor_id` on palm | —            | Stamped on 18 of 6,928 palm conversations. `v1_clearing_theme_palm_2026_b` has 34 days of unjoinable data. Stop it; fix the stamp before re-running. |

---

## Decision log

Append, never rewrite. The point is that a conclusion's *basis* survives, so nobody quotes
a number in six weeks that was never load-bearing.

| Date       | Decision                                                                     | Basis                                                                                                                                                                                                |
|------------|------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 2026-08-16 | Call `v1_bump_copy_2026` for **B** at 41% of sample                          | Take-rate p=0.034 is the metric the copy was written to move. Revenue difference between arms is noise (p=0.416). Worth $1,156/30d and gates a larger test.                                          |
| 2026-08-16 | Call `v1_tarot_version_bc_2026` for **B** on direction, **not significance** | B led at every look and on all 4 landers, but ~9 looks were spent and the gap decayed +41% (15 Aug) → +19% (16 Aug) as data arrived. Ship B because the downside is ~zero. **Do not quote p=0.023.** |
| 2026-08-16 | Close depth ordered **after** 55/35                                          | 55/35 restructures the close; close depth is built on that structure. Asymmetric rework risk.                                                                                                        |
| 2026-08-16 | Close depth scoped **fb-tarot only**                                         | Root is 10 pitch-arrivals/day at 4.4% vs tarot's 180 at 9.6% — adds ~5% sample while mixing two baselines. Palm has no traffic.                                                                      |
| 2026-08-16 | Close depth ships **without its price block**                                | That beat belongs to 55/35. Avoids a mid-flight re-cut, which would invalidate everything collected before it.                                                                                       |
| 2026-08-16 | Palm traffic stopped                                                         | Deliberate — spend cut to test new landers. Not decay.                                                                                                                                               |
| 2026-08-14 | B/C re-weighted 70/30 → 50/50                                                | Arm C held 70% while converting worse. ~$200/day.                                                                                                                                                    |

---

## Commands

```bash
# board: running tests, lander coverage, beat map, whether this doc has gone stale
LIVE_AUDIT_CONFIRM=1 node .claude/skills/v1-funnel-live-audit/scripts/plan-live.mjs --live

# would a new test on these beats collide with anything running?
... plan-live.mjs --live --beats price,objections

# targetN for a +30% effect on the live baseline, with a sensitivity ladder
... plan-live.mjs --live --size --effect 30 --metric pitch-paid

# arm outcomes — SPENDS A LOOK, see rule 3
... diagnose-live.mjs --live --tally
```

**Baselines** *(2026-08-16, fb-tarot, 7d — refresh with `--size`)*
320–356 leads/day · 180 reaching the pitch/day · pitch→paid 9.6% · $65 per buyer.
Volume is down ~65% from the 6–7 Aug peak, deliberately.

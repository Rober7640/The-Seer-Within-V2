# V1 test queue

> **Next action — deploy, then create the `v1_close_depth_2026` draft row and start it.**
> The code is BUILT and dark (2026-08-16). Run
> `improve-v1/create-close-depth-experiment-2026-08-16.sql` on dev, then prod, then
> press Start in `/admin/experiments`. Nothing changes for a single woman until that
> last step.

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

| # | Test                  | What it changes                         | Split | Covers                     | Starts                                     |
|---|-----------------------|-----------------------------------------|-------|----------------------------|--------------------------------------------|
| 1 | `v1_close_depth_2026` | Thickened close — 132 → 465 words       | 50/50 | fb-tarot, all 13 landers   | **Built + dark. Run the SQL, then Start**  |
| 2 | Non-buyer close page  | Email the free list to a new close page | n/a   | all funnels, one free list | Needs the page built. No code for the send |
| 3 | `hours-55-35_tarot`   | Two-price close — $55 alongside $35     | 50/50 | fb-tarot, all 13 landers   | ~3 weeks later, against the winner         |
| 4 | Downsell bump price   | $12.77 → $9.77 on the $25 path          | n/a   | downsell path only         | **Not a test** — ship it, see below        |

### 2 · Non-buyer close page

Opted in, never bought → stays on the **free** list (`AWEBER_LIST_ID=6936953`); buyers are
written to a **separate paid list** by `addPaidSubscriber()` with a `paid` tag. So the
segment already exists in AWeber with no code change:

> **free list, no `paid` tag** = opted in, didn't buy

**Build needed:** the close page. Nothing else — the send is an AWeber sequence.

🔴 **That segment is ~7,500/month and mixes three very different women.** It is a broadcast,
not a cart-recovery email:

| Who                                  | 30d tarot | What she needs to hear            |
|--------------------------------------|-----------|-----------------------------------|
| Never reached the pitch              | ~3,950    | come back and finish your reading |
| Reached the pitch, never clicked     | 2,942     | the offer, properly               |
| **Clicked buy, abandoned at Stripe** | **671**   | *"you were one step away"*        |

**To split them you need an abandonment tag** — `checkout.session.expired` is currently
unhandled, so nothing marks her. A few hours of work, and it is what lets the 671 get their
own urgent email instead of one broad one. Do it early or the sequence can never be
targeted.

**Also:** the free list is the same list Evelyn's daily reframe deck sends to — check send
fatigue before adding a sequence. And `AWEBER_LIST_ID_TAROT` is empty, so all funnels share
one free list; a tarot-only sequence needs a tag filter.

**Why it is worth doing regardless:** **0 of 671** abandoners bought later on their own.
Nothing here is cannibalised — every recovered sale is incremental.

### 4 · Downsell bump price — a decision, NOT a test

🔴 **This cannot be tested and should not be queued as one.** The $25 downsell has ~34 bump
offers a month. Detecting whether $9.77 beats $12.77 there needs **10–17 months**. Ship a
price on judgement, document the reasoning, revisit only if downsell volume ever grows.

**The reasoning: match the ratio, not the absolute.** A woman on the downsell has just said
$35 was too much. Charging her the same $12.77 asks for half as much again on top of a
price she already flinched at:

| Bump   | on  | = uplift on her order       |
|--------|-----|-----------------------------|
| $12.77 | $35 | **36.5%**                   |
| $12.77 | $25 | **51.1%** ← the problem     |
| $9.77  | $25 | **39.1%** ← close to parity |

Exact proportional parity would be **$9.12**. $9.77 is within 7% of it and keeps the `.77`
charm-price shape used everywhere else, so it is the natural pick.

**Weak supporting evidence, stated as weak:** downsell bump take is **33.3% on 9 offers**
against 37–50% on the main path. Directionally consistent with "$12.77 is too much there",
but n=9 proves nothing on its own. The ratio argument is doing the work.

**Ship $9.77 on the downsell path.** One constant, no experiment, no traffic. Worth roughly
$130/month either way — the reason to do it is that the current price is disproportionate,
not that the money is meaningful.

*(If you ever want the main bump's price tested properly, that path has ~350 offers/month
and would resolve in 1–2 months. Different question, and not currently queued.)*

**Why close depth goes first — reordered 2026-08-16.** Both target the same leak: the
**2,942 women a month who reach the pitch and never click** (72.7% of everyone who gets
there). Close depth is worth roughly **3×** more, and it is the only one that can start
today.

|                                     | Close depth                 | 55/35                                           |
|-------------------------------------|-----------------------------|-------------------------------------------------|
| Value if it hits its powered effect | **~$8,450/30d**             | ~$2,600/30d from tier mix                       |
| Blocked by                          | nothing                     | bump copy — its card moves the bump row         |
| Prior evidence                      | none — fresh hypothesis     | **the previous two-price close lost**           |
| Downside risk                       | a longer close may tire her | conversion loss, which is how the last one died |

The earlier order put 55/35 first on **rework risk** — it restructures the close, so close
depth would need redesigning against the winner. That is true and it was over-weighted:
the rework is a day or two of rewriting arm B, while running the smaller test first costs
three weeks of the bigger test's return.

Going first also lets close depth run as the **full five-block treatment** including its
price block, rather than the 315-word version cut to avoid the 55/35 collision.

---

## Four rules

**1 · One test per beat.** Two tests rewriting the same stretch of script means one cell
contains contradictory copy, and a cell you have to mutilate isn't the same treatment as
the one it's compared against. Assignment is orthogonal, so this is never a statistics
problem — always a copy problem.

| Beat                          | Owned by                                              |
|-------------------------------|-------------------------------------------------------|
| opener — first chat message   | `v1_tarot_version_bc_2026`                            |
| crisis — CRISIS_REVEAL → COST | `v1_clearing_theme_palm_2026_b`                       |
| ritual + deliverable          | `v1_close_depth_2026`                                 |
| price + guarantee + proof     | `v1_close_depth_2026` first, then `hours-55-35_tarot` |
| objection handling            | `v1_close_depth_2026` first, then `hours-55-35_tarot` |
| order-bump row                | `v1_bump_copy_2026`, then `hours-55-35_tarot` ⚠       |

Close depth now runs first and owns those beats until it resolves; 55/35 takes them after.
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

### `v1_close_depth_2026` — thickened close *(code built + dark; row not created)*

```
subject_type: email
variants:  A 50 {}   ·   B 50 { close: "deep" }
scope:     { funnel: ["v1-tarot"], freezeAssignment: true }
conversion:{ type: "v1_main_funnel", targetN: 7200, windowDays: 7 }
```

| Parameter      | Value                                                                                                                                                                                                       |
|----------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Primary        | Revenue per 1,000 leads (main + bump + U1 + U2)                                                                                                                                                             |
| Guardrails     | Pitch→paid · upsell-1 take (a longer close mustn't buy the front end at the back end's cost)                                                                                                                |
| Detectable     | **+30% on a 9.8% baseline. A +20% effect will not be visible** — it needs 15,600 exposures (~44 days) against 7,200 (~21).                                                                                  |
| Duration       | ~21 days at 355 leads/day. Recompute targetN at start — it moved 6,800 → 7,300 → 7,200 in two days.                                                                                                         |
| **Looks**      | **3,600 and 7,200 exposures. No others.** Pre-registered 2026-08-16, before the first exposure.                                                                                                             |
| Stop early     | Upsell-1 take drops >20% relative in arm B                                                                                                                                                                  |
| Arm B contents | **All five blocks** — mechanism, ritual, deliverable, price, objections. Measured at **465 words / 27 messages** against control's 132 / 8. Price block restored 2026-08-16 when this moved ahead of 55/35. |
| Preview        | `?close_depth=deep` on any /fb-tarot chat URL — forces arm B, enrols nobody.                                                                                                                                |

🔴 **Build spec: [`docs/superpowers/specs/2026-08-16-v1-close-depth-2026.md`](superpowers/specs/2026-08-16-v1-close-depth-2026.md)**
— the full arm-B copy, every edit point, and the verification checklist.
**Create the row with [`improve-v1/create-close-depth-experiment-2026-08-16.sql`](../improve-v1/create-close-depth-experiment-2026-08-16.sql)** — dev first, then prod, then Start in `/admin/experiments`.

*(Artifacts `bcf892f7-…` and `d3c2103b-…` are the visual walkthroughs. Reference only —
the spec is the source of truth.)*

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

| Date       | Decision                                                                      | Basis                                                                                                                                                                                                                                                                                              |
|------------|-------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 2026-08-16 | Close depth **REVERSED to run BEFORE 55/35** (supersedes the row below)       | Same leak, ~3× the value, and unblocked. The rework risk that put 55/35 first is real but costs days; running the smaller test first costs three weeks of the bigger one's return.                                                                                                                 |
| 2026-08-16 | Close depth **ships WITH its price block** (supersedes the row below)         | It now owns the price beat until it resolves, so the collision that cut the block is gone. Arm B is the full five-block treatment. Cutting it later would invalidate everything collected before.                                                                                                  |
| 2026-08-16 | Looks pre-registered at **3,600 / 7,200** exposures                           | targetN recomputed on the live baseline the day it was built (123/1258 = 9.8% pitch→paid, +30%, 80% power). Written here before the first exposure, per rule 3.                                                                                                                                    |
| 2026-08-16 | Price-justification block placed **before** the existing three price messages | The spec said both "preceded by" (§4) and "immediately before the guarantee" (§5). Before all three builds plain → sacred; after the first restarts a block that has already named the price.                                                                                                      |
| 2026-08-16 | Close depth buckets on **hashEmail(email)**, unlike the other email tests     | It is the first email-keyed test to set `freezeAssignment`, and the freeze looks the subject up in `experiment_exposures.subject_id`, which stores the hash. The raw address would miss every time — the freeze would silently degrade to re-bucketing. Locked by `server/lib/closeDepth.test.ts`. |
| 2026-08-16 | Call `v1_bump_copy_2026` for **B** at 41% of sample                           | Take-rate p=0.034 is the metric the copy was written to move. Revenue difference between arms is noise (p=0.416). Worth $1,156/30d and gates a larger test.                                                                                                                                        |
| 2026-08-16 | Call `v1_tarot_version_bc_2026` for **B** on direction, **not significance**  | B led at every look and on all 4 landers, but ~9 looks were spent and the gap decayed +41% (15 Aug) → +19% (16 Aug) as data arrived. Ship B because the downside is ~zero. **Do not quote p=0.023.**                                                                                               |
| 2026-08-16 | Close depth ordered **after** 55/35                                           | 55/35 restructures the close; close depth is built on that structure. Asymmetric rework risk.                                                                                                                                                                                                      |
| 2026-08-16 | Close depth scoped **fb-tarot only**                                          | Root is 10 pitch-arrivals/day at 4.4% vs tarot's 180 at 9.6% — adds ~5% sample while mixing two baselines. Palm has no traffic.                                                                                                                                                                    |
| 2026-08-16 | Close depth ships **without its price block**                                 | That beat belongs to 55/35. Avoids a mid-flight re-cut, which would invalidate everything collected before it.                                                                                                                                                                                     |
| 2026-08-16 | Palm traffic stopped                                                          | Deliberate — spend cut to test new landers. Not decay.                                                                                                                                                                                                                                             |
| 2026-08-14 | B/C re-weighted 70/30 → 50/50                                                 | Arm C held 70% while converting worse. ~$200/day.                                                                                                                                                                                                                                                  |

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
320–355 leads/day · 180 reaching the pitch/day · pitch→paid **9.8%** (123/1258) · $65 per buyer.
Volume is down ~65% from the 6–7 Aug peak, deliberately.

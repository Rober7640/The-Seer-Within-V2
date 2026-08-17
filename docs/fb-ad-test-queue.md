# FB ad test queue

> **Next: A, then E.** A needs no build — all four destinations are live in
> `client/src/content/tarotReads.ts`. E is the only test that can move the bucket mix.

Questions come from [`fb-ad-question-testing-roadmap.md`](./fb-ad-question-testing-roadmap.md)
(love) and [`v1-money-bucket-voc.md`](./v1-money-bucket-voc.md) (money). Method:
`.claude/skills/fb-ad-levers`. Funnel-side tests: [`v1-test-queue.md`](./v1-test-queue.md).

Results live in Ads Manager, not here. Log outcomes at the bottom.

---

## Queue

| # | Test | Arms | Budget | Stop | Kill it if |
|---|---|---|---|---|---|
| A | Soulmate × age | 12 | ~free | 3wk / 100 purch per band | Bands within ~15% |
| B | Soulmate × keyword | 14 | ~$6,000 | 3wk | No arm beats control |
| C | Presupposing form | 2 | ~$1,700 | ~50 purchases | B doesn't beat A |
| D | Settle depth | 1 | ~$2,000 | ~50 purchases | Never exits learning phase |
| **E** | **Money gate** | **3** | **~$1,500** | **2wk / 40 purch** | **Worse than love control → F/G/H never run** |
| F | Money × age | 6 | ~free | 3wk | Bands within ~15% |
| G | Money × keyword | 8 | ~$3,000 | 3wk | No arm beats control |
| H | Money tarot lander | build | ~$2,000 | at spend | Lands at/under money base |

A–D optimise inside love. E–H test whether we can buy a different bucket at all.

---

## A — soulmate × age

Copy matched to the wound. Age lives in the ad set, never in the copy.

| Band | Destination | Attack | Headline |
|---|---|---|---|
| 25–44 | `cards-soulmate` | control | Have I already met my soulmate? |
| 25–44 | `cards-soulmate` | WHY | Why does my soulmate keep slipping past me? |
| 25–44 | `cards-love-again` | WHY | What keeps me choosing everyone but my soulmate? |
| 45–54 | `cards-someone-for-me` | WHY | Why hasn't my soulmate found me yet? |
| 45–54 | `cards-alone-forever` | HOW-LONG | How long does a soulmate keep you waiting? |
| 45–54 | `cards-meant-alone` | BINARY | Is my soulmate still coming, or have I already missed him? |
| 55–64 | `cards-where-soulmate` | BINARY | Is there a soulmate for me after the marriage ended? |
| 55–64 | `cards-not-found-yet` | HOW-LONG | How long does it take to find a soulmate the second time? |
| 55–64 | `cards-soulmate-closer` | WHY | Why did I give my best years to someone who wasn't my soulmate? |
| 65+ | `cards-new-soulmate` | BINARY | Is it too late to meet my soulmate? |
| 65+ | `cards-soulmate-out-there` | HOW-LONG | How much longer do I have to wait for my soulmate? |
| 65+ | `cards-ready-to-love` | WHY | **Am I still allowed to want a soulmate?** ⭐ |

⭐ The only line that offers permission rather than a prediction. Expect it to survive.

## B — soulmate × keyword

Age held constant. All arms are spirituality words; the contrast is identity/outcome
(*soulmate*) vs practice (*blocked*, *energy*, *healing*).

| Keyword | Value | Attack | Headline |
|---|---|---|---|
| — | control | — | Have I already met my soulmate? |
| blocked | +67%, n=908 | BINARY | Is something blocking me from meeting my soulmate? |
| blocked | | WHY | Why do I keep getting blocked before my soulmate arrives? |
| blocked | | HOW-LONG | How long has something been blocking my soulmate from me? |
| connection | +48%, n=1,726 | BINARY | Is this connection my soulmate, or something else? |
| connection | | WHY | Why does this connection feel like my soulmate when nothing is happening? |
| connection | | HOW-LONG | How long has my soulmate been this close without me knowing? |
| energy | +116%, n=613 | BINARY | Is my energy keeping my soulmate away? |
| energy | | WHY | What does my energy say about my soulmate? |
| energy | | HOW-LONG | How long has my energy been out of step with my soulmate? |
| healing | +110%, n=410 | BINARY | Is my soulmate waiting for me to heal? |
| healing | | WHY | Do I need to heal before my soulmate arrives? |
| healing | | HOW-LONG | What still needs healing before my soulmate finds me? |
| probe | — | — | What's blocking me from love? ⚠ |

Start with **blocked** and **connection** if $6k is too wide. Soulmate concerns are worth
$4,487/1k against blocked's $8,220 — half that gap transferring is ~1.8× on the account's
biggest generic line.

## C — presupposing form

| Arm | Headline |
|---|---|
| A (control) | Will he ever commit? |
| B | Why won't he commit to me? |

Won by 23% on $490. `cards-wont-commit` is also the account's best-earning hook
($6,390/1k vs `cards-will-commit` $4,700) — same direction, confounded by lander. If the
rule holds it applies free to every ad, forever.

## D — settle depth

| Question | Governs |
|---|---|
| When did we become roommates? | Whether the 16-question ROOMMATES build happens at all |

Every deep question in the account is also a starved one ($450–497 lifetime), so depth and
underspend are confounded. This buys the answer once.

---

## E — money gate

Against the running love control, same audience settings, bare v1 funnel.

| Arm | Theme | Value | Headline |
|---|---|---|---|
| control | — | — | *running soulmate incumbent, unchanged* |
| 1 | block | $14,083/1k | Is something blocking my money? |
| 2 | retirement | $15,146/1k | Why am I still working when I should be retired by now? |

**Why it matters:** money earns ~42% more per 1,000 conversations than love and takes
~2.5% of the traffic.

| Bucket | Convos | Conv. | Rev/1k |
|---|---:|---:|---:|
| someone | 5,056 | 22.9% | $10,830 |
| purpose | 8,747 | 19.7% | $9,520 |
| **money** | **12,671** | **19.3%** | **$9,140** |
| love | 61,090 | 14.1% | $6,440 |

## F — money × age

Two bands only. 119 of 129 money women who state an age are 55+; under-55 is 10 rows,
zero buyers.

| Band | Attack | Headline |
|---|---|---|
| 55–64 | WHY | Why is my money still blocked this close to retiring? |
| 55–64 | HOW-LONG | How long has something been blocking me from a nest egg? |
| 55–64 | BINARY | Is something blocking my money, or did I just leave it too late? |
| 65+ | WHY | Why am I still working when the money should have come by now? |
| 65+ | HOW-LONG | How much longer will something keep blocking my money? |
| 65+ | BINARY | Is something still blocking my money, or have I run out of time? |

The wound inverts against love: 65+ fears *too late to stop working*, not *too late for
love*. Same word — **still** — pointed the other way.

## G — money × keyword

`blocked` is the theme word here, so it is the control.

| Keyword | Value | Attack | Headline |
|---|---|---|---|
| blocked | control, +70% | — | Is something blocking my money? |
| energy | +69%, n=122 | BINARY | Is my energy blocking my money? |
| energy | | WHY | What does my energy say about why money won't stay? |
| energy | | HOW-LONG | How long has my energy been working against my money? |
| god/prayer | +61%, n=151 | WHY | I've prayed about money for years. What's still blocking it? |
| god/prayer | | HOW-LONG | How long will my prayers for money keep going unanswered? |
| god/prayer | | BINARY | Is my money blocked, or am I asking for the wrong thing? |
| probe | — | — | Why does money never stay? |

`blocked` is the only keyword that reproduces across both buckets (+70% money, +67% love).

## H — money tarot lander

| Build | Hypothesis | Settle before building |
|---|---|---|
| Money card on `/fb-tarot` via `fb-tarot-add-card` | 63 money concerns mentioning tarot are worth $15,413/1k — 2.7× money base | ~$2,000 |

n=63 is one good week from noise.

---

## Flags

| Flag | Applies to | Rule |
|---|---|---|
| Age | A, F | Ad set only. Banned form is "Are you over 65 and…" — first person is fine |
| Bereavement | A (65+), E–H | 65+ points at the after-loss family but only ~20% are widowed. Money's best-converting theme is death/estate — deliberate decision, never default |
| Health/disability | A (45–54), E–H | Never a headline. Restricted attribute. Serve her once in; don't acquire on it |
| Financial status | E–H | Restricted. Banned form is "Are you broke?" — every money line here is first person |
| Windfall | E–H | Read the pattern, never the outcome. No ad may imply a win |
| Fate | A (45–54) | `LONELINESS_HOOKS` carries FATE + FOREVER bans — never promise or rule out a future alone |
| A is a bundle, not an age test | A | Band and destination are confounded. Never quote it as "age is worth N×" |
| Probe risk | B, G | Soulmate is the spirituality keyword doing the recruiting. If a probe wins on cost, check *what audience it brought* before scaling |
| Money is unproven | E–H | Every money conversation today is self-selected out of a love ad. The bucket table may be selection, not audience. That's what E buys |
| No money lander | E–H | All tarot/palm hooks are love. Money ads hit the bare funnel and she picks the bucket — an extra step love doesn't pay |

Two paid bases in this doc: `purchased` (bucket table, E) and webhook-stamped
`main_paid_at` (keyword values, G). Compare within a basis, never across.

Keyword and age values are words she wrote *after* clicking — a correlate, not proof an ad
carrying the word attracts her.

---

## Decision log

| Date | Decision | Why |
|---|---|---|
| 2026-08-17 | Queue created, broad before deep | Levers multiply a winner without shrinking the pool |
| 2026-08-17 | A first | No build needed |
| 2026-08-17 | E gates F/G/H, runs 2nd | Only test that can move the bucket mix; money may be selection |
| | | |

---

## Commands

```bash
LIVE_AUDIT_CONFIRM=1 node .claude/skills/fb-ad-levers/scripts/age-bands.mjs --live
LIVE_AUDIT_CONFIRM=1 node .claude/skills/fb-ad-levers/scripts/anchor-value.mjs --live
# both take --bucket money · age-bands takes --theme 'soul ?mate' to read the wound
```

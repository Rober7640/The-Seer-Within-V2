---
name: creative-cascade
description: "Use when managing the ad account as a PORTFOLIO instead of mining a new question. Two jobs. (1) MAP THE TERRITORY — build a segment's cascade (segment → injury → question → format) and compare the full 4×4×4 against what is built and what is running, so the output is the GAP. (2) STACK ORDER — which rung to spend into next, which is tapping out, what mix blends to target. Use when asked to: map the creative territory, show what ads we are NOT running, build the 64, fill the cascade, audit the hook roster, find dark or unused landers, pick which persona/segment/audience to scale next, get a stack or build order, check if we are tapped out or saturated on a theme, see if efficiency is decaying as we spend in, or set per-segment targets that blend the account to target. Reads registries for what is BUILT, the live DB for what is RUNNING; never invents a question and never claims spend data this repo lacks."
---

# creative-cascade — manage the ad account as a portfolio

One segment can hold 64 different ads: 4 injuries × 4 questions × 4 formats. Most
accounts have far more creative territory than creative actually running. This skill
finds that gap, then decides which rung to spend into next.

It does **not** invent questions. It manages ones that already exist.

## How to invoke this

| You say | Job | What runs |
|---|---|---|
| *"map the creative territory"* · *"what ads aren't we running"* | **A** | A1 census → A2 if a segment is named |
| *"build the 64"* · *"fill the cascade for X"* | **A** | A2 on a cascade file |
| *"audit the hook roster"* · *"which landers are dark?"* | **A + B** | A1 census, then B1 for the dark-cell list |
| *"which persona/segment should we scale next?"* | **B** | B1 → B3 → B5 |
| *"are we tapped out on commitment?"* | **B** | B1 → B4 |
| *"what blends us to target?"* | **B** | B1 with `--target`, then B5 |

If the ask is *"give me more questions under X"*, that is **not this skill** — it is a
`fb-ad-question-mining` deepen run. Hand it over.

## Vocabulary — read this before writing any of these words down

🔴 **Say "segment", never "persona", everywhere in the analysis.** In this repo a
`persona` is an AI advisor in the V2 chat service (Evelyn Cross, Luna Voss, Marcus
Stone) — a different product, with its own `personas` table and its own skills
(`persona-audit`, `persona-iterate`, `persona-email-kit`). The media-buyer word
"persona" means an **audience segment**.

**One exception, and only one:** the rename note itself. Open the answer with a single
sentence naming both words so the operator can follow the mapping, then never use the old
word again. Use this shape:

> *Renaming once: your "persona" is our **segment**, your "angle" is our **injury**. Both
> of your words already mean something else in this codebase.*

Trying to explain the rename without naming the word produces vague prose ("your top
level", "your second level") and the operator cannot tell which of his words mapped where.

The four levels, shared exactly with `fb-ad-question-mining`:

| Media-buyer word | **Ours** | What it is | In code? |
|---|---|---|---|
| persona | **segment** | one specific situation she is in — ROOMMATES, UNAVAILABLE | ❌ nowhere |
| angle | **injury** | what that situation did to her — the thing she has no event for | ❌ nowhere |
| concept | **question** | the ad headline. One hook = one lander | ✅ `TAROT_HOOKS` / `PALM_HOOKS` |
| format | **format** | how the ad hands her to the reading | ✅ routes in `App.tsx` |
| *(not a cascade level)* | **family** / theme | `angleForHook`'s 19 groups — the market, above the cascade | ✅ `angleForHook()` |

The **family** row is not part of the cascade, but it is the default grouping
`cascade-stack.mjs` reports at, so it needs a name. Call it "family" or "theme". Never
call it an injury.

Two more collisions, both confirmed in this repo:

- **"concept" already means a DECK** (`fb-tarot/docs/STATUS.md`: "Each concept = one
  deck"). Say **question**. Hand a "concept" to `fb-tarot-add-card` and it builds card
  art when you wanted a headline.
- **"format" already means an EMAIL template** (the reframe deck's seven formats). Ours
  is a lander format. Say "lander format" the first time in any doc that touches email.

🔴 **`angleForHook()` in `client/src/content/tarotReads.ts` returns 19 families and calls
them `angle` — but a code `angle` is roughly a THEME, not an injury.** `commitment`,
`trust`, `reunion` are themes. Group by it and call it an injury and you over-report by a
whole level. Say "family" or "theme"; say "angle" only when quoting `angleForHook`, and
say that you are.

## The three states an ad cell can be in — never collapse them

| State | Answered by | Never infer from |
|---|---|---|
| **BUILT** — a registry entry exists | `cascade-map.mjs` (code, complete) | anything else |
| **RUNNING** — it produced attributed conversations | `cascade-stack.mjs --live` (partial) | the registry |
| **SPENDING** — money is behind it | **Meta Ads Manager only. Not in this repo.** | either of the above |

The baseline failure this table exists to stop: quoting a historical revenue figure as if
it described current delivery. A question can be built, get zero spend, and still show
revenue from six months ago.

---

# JOB A — map the territory, output the gap

## A1. Census: what is built across the whole account

```bash
node .claude/skills/creative-cascade/scripts/cascade-map.mjs
```

No DB, no flags, instant. Prints every question grouped by family, the format roster, and
the total built cell count. Everything is parsed from `tarotReads.ts`, `palmReads.ts` and
`App.tsx`, so a hook added today shows up today.

Three findings it produces that keep being rediscovered:

1. **Levels 1 and 2 do not exist in code.** Nothing in the running system records which
   segment or which injury an ad was bought against. So a per-segment question ("is
   ROOMMATES tapping out?") is not answerable from this data — not thinly, *not at all*.
   The finest grain recorded is the question.
2. **Format is free on tarot.** The same registry entry renders on `/fb-tarot` (static
   reveal card), `/fb-tarot/b` (no card, reveal as chat) and `/fb-tarot/c` (interactive,
   the model reads her answer). Three different ads, one build, changed by the URL. This
   is the cheapest unfilled territory in the account and it is unmanaged.
3. **Palm has no family layer.** `palmReads.ts` has no `*_HOOKS` arrays and no
   `angleForHook`. Its questions are one flat list, so a palm family cannot be reported
   as a group. That is a real hole, not a display quirk.

## A2. One segment's cascade

Write a cascade file, then map it:

```bash
node .claude/skills/creative-cascade/scripts/cascade-map.mjs \
  --cascade .claude/skills/creative-cascade/examples/roommates-cascade.json
```

Copy `examples/roommates-cascade.json` and edit — or pipe the JSON in with `--cascade -`
when you must not write files. Questions that are `cards-*` slugs resolve against the
registry; free text is a proposed question and reports UNBUILT.

🔴 **Copy the questions VERBATIM out of the run file.** Paraphrasing one while building
the cascade file is how invented copy gets in through the back door — the paraphrase
becomes the ad. Count them too: a run file listing four attacks (WHY / HOW-LONG / BINARY
/ RIVAL) must produce four questions, not three.

**Real runs come back ragged, and that is fine.** The 4×4×4 is the *theoretical*
territory, not a quota. Report the ragged shape as "N of a possible 4" per level and leave
the rest empty. This is the exact moment the temptation to round up to 64 appears.

🔴 **But ONE injury on a segment is not raggedness — it is an unfinished derivation.
Send it back.** A segment is a situation, and a situation wounds in several ways at once.
ROOMMATES arrived here with 1 injury and 4 questions (16 cells). Re-reading the same
buyer quotes for *wounds* rather than *topic* produced **four** injuries — the un-event,
erased, the clock, no permission — and 48 cells. Nothing in this skill could have found
that: the questions were absent, not dark, and a gap report would have shown 16 of 16
cells unbuilt and looked complete.

So when a cascade file has one injury, or a segment's questions all attack the same wound,
**do not map it — hand it back for `fb-ad-question-mining` Step 3b (derive the
injuries)**. Say plainly: *"this segment came back with one injury; that is a quarter of
its territory at most, and Step 3b is the fix."* You are the last check before a build
order gets priced off a quarter of the real map.

Every cell gets a fill cost:

| Cost | Means | Build with |
|---|---|---|
| **FREE** | reachable today by changing the URL | nothing |
| **PORT** | exists on the other funnel only | `fb-palm-hooks` / `fb-tarot-add-card` |
| **QUESTION** | new registry entry + server roster sync | `fb-tarot-add-card` |

**The build unit is the QUESTION, not the cell.** One registry entry serves every tarot
format, so a 14-question gap is 14 builds unlocking 42 cells — not 42 builds. The script
now rolls the gap up this way. Quoting the cell count as a build count prices the plan 3×
and gets it shelved.

**Price a QUESTION honestly.** A new tarot question reuses `DEFAULT_DECK` (`return-mhf`)
art, so it needs **no card strip** — assuming otherwise makes every build look far more
expensive than it is. But `CardSetConfig.reads` is keyed **per hook**, so it still needs
its own 3 four-sentence reveals written into that deck, plus the two server rosters
synced (`routes.ts` `validHooks`, `prompts.ts` vocab) or the chat handoff 400s. "No new
art" is not "no work".

⚠ A mining run file may also spec a **bespoke deck** for a segment (the 2026-08-15
commitment run specs two, with full card copy). That art is **optional, not a blocker** —
ship on the default deck, add art after a winner shows. Say so, or the run file and this
skill read as a contradiction.

## 🔴 A3. Never invent a question to fill a cell

This is the failure that showed up hardest in baseline testing: given a 4×4×4 grid with
empty cells, an agent writes plausible headlines to complete it, then labels them
"drafts". Half the grid becomes fiction that reads exactly like the verified half.

**An empty cell is a finding. Report it empty.**

- Every question in a cascade file must trace to a `docs/fb-ad-question-mining/*.md` run.
- If the operator wants more questions, that is a **`fb-ad-question-mining` deepen run**,
  not something you write here. Hand it over.
- No exceptions. Not "clearly implied by the injury". Not "just to show the shape". Not
  "marked unverified so it's fine".

**Failure mode if you get it wrong:** the invented lines are indistinguishable from
VOC-traced ones a week later, and someone builds a lander on a sentence no buyer ever
said.

---

# JOB B — stack order, decay, and ceilings

## B1. Run it

```bash
LIVE_AUDIT_CONFIRM=1 node .claude/skills/creative-cascade/scripts/cascade-stack.mjs \
  --live --days 120 --bins 4 [--level family|question] [--target 5824]
```

Needs **both** `--live` and `LIVE_AUDIT_CONFIRM=1`, reuses
`v1-funnel-live-audit/scripts/lib/live-db.mjs`, opens a `READ ONLY` transaction, and
proves it with a canary write Postgres must reject. Run from repo root.

🔴 It imports `PAID` from that lib and must never redefine a sale. The raw `purchased`
flag is set at checkout-**click** and over-counts real sales by about 2.5×.

`--target` is in **dollars per 1,000 conversations**, and it means the **account blend**
target. Internals are cents.

⚠ Do not paste a theme base in as a target. `$5,824` is the *commitment theme* base from a
mining run — a different denominator and a different population. Using it as the account
target makes the whole account look far below target, which is a measurement mismatch, not
a business fact. Only the operator can supply a real target.

🔴 **ALWAYS RUN BOTH LEVELS. Never report from `--level family` alone.**

```bash
LIVE_AUDIT_CONFIRM=1 node .../cascade-stack.mjs --live --days 120 --level family
LIVE_AUDIT_CONFIRM=1 node .../cascade-stack.mjs --live --days 120 --level question
```

A family verdict **averages its questions and will hide a bad one**. On the first live
run `decode-him` read `SCALING CLEAN`, while the single question holding **55% of the
whole account's mix** — `cards-return` — read `TAPPING OUT?` at 0.76× the blend. The
healthy siblings buried it. That was the biggest finding in the account and it is
invisible one level up.

**When the two levels disagree, the question level wins.** It is where the money sits and
where the fix is made.

`--level family` groups by `angleForHook` (roughly a theme). `--level question` groups by
hook slug, and labels rows by **slug, not headline**, because headlines are not unique:
`cards-return` and `cards-come-back` are both "Will he come back?". Quote the slug when
handing anything to a build skill.

**Floors:** `--min-n 200` drops small groups from the table, `--min-bin-n 120` marks thin
bins unscorable. On a short window with a coverage ramp most bins go thin and most
verdicts become `THIN — cannot say` — widen `--days` or drop `--bins`. The dropped share
is printed and **is itself a finding**: unrankable, not bad.

**Watch for `unknown:` groups.** Slugs live in production that exist nowhere in the
registry (four on the first run). The script surfaces them. They prove the census is not
a complete list of what has run.

## B2. Where ad attribution actually lives

There is no ad id, campaign id, or `utm_content` column on `conversations` —
`utm_content` is sent to analytics and never persisted. The **only** per-ad key in this
database is the lander context on the exposure row:

```
experiment_exposures.context->>'hook'
```

joined to conversations on `context->>'conversationId'`, or on `ab_visitor_id =
subject_id` for lander-time exposures. The tarot deck/hook/facing/angle is written there
at lead capture; the palm hook is written onto the order-bump exposure.

A baseline agent inspected the schema, found no ad columns, and concluded attribution was
absent entirely. It is not absent — it is partial, and it is in that JSON column.

## B3. Rank on revenue per 1,000 conversations. Never on buy-rate.

Buy-rate hides order value and upsell take, and upsell take is where groups separate. On
the V1 money bucket two themes bought at 29.4% vs 29.7% and differed by $470 per
thousand. Memory: `rank-by-revenue-per-1k`.

## B4. Reading the decay watch

The script scores decay on two **relative** axes, and this is not cosmetic:

- volume → the group's **share of attributed mix** in that bin
- value → its rev/1,000 **indexed to the blend** in that bin (1.00× = average)

🔴 **Why raw volume is banned here.** The first live run scored raw counts and reported
`decode-him: vol +1191%, rev −71%, TAPPING OUT`. Neither number was about decode-him.
Attribution coverage itself ramped mid-window, so every group's count exploded and every
group's rate fell together. Raw volume measures **how much we logged, not how much we
bought.** On the relative axes the same data reads `SCALING CLEAN`, which is true.

| Verdict | Means |
|---|---|
| `TAPPING OUT?` | taking ≥5pp more of the mix while falling ≥15% against the blend |
| `DECAYING vs blend` | falling against the blend without taking more mix — fatigue or mix, not saturation |
| `SCALING CLEAN` | taking more mix and holding its rate |
| `HOLDING` | neither moved much |
| `THIN — cannot say` | under `--min-bin-n` |

🔴 **The question mark on `TAPPING OUT?` is permanent.** Getting relatively worse while
absorbing more mix is the *shape* of a pool thinning. It is equally the shape of creative
fatigue, a seasonal shift, or Meta changing who it delivers to. It says where to look in
Ads Manager. It is not a saturation measurement and must never be reported as one.

## B5. Ceilings and the blend

The operator's rule: you cannot hold every segment to one efficiency target. Each has a
ceiling; you spend in, tap it out, then unlock the next until the account blends to
target.

With `--target`, the script prints each rung's **max share before the blend breaks** —
how much of the mix a below-target rung can hold before the blended rev/1,000 drops under
target, assuming the other rungs keep their current relative mix.

🔴 **That is a MIX ceiling, not a TAM ceiling.** It says nothing about how many such women
exist on Facebook. Nothing in this repo computes TAM, and prevalence from
`fb-ad-question-mining` is a share of *our* traffic, not of Facebook's audience.

Without `--target` the stack order is **relative only** — first rung, second rung. It
cannot say how many rungs are enough. No account CPA or ROAS target exists anywhere in
this repo; the operator has to state one. Say so rather than picking one yourself.

**Stack order, stated as rungs with triggers — never as a single winner:**

1. Spend into the top of the efficiency table while it reads HOLDING or SCALING CLEAN.
2. When a rung reads `TAPPING OUT?`, stop adding and open the next rung down.
3. A rung below the blend still earns; it just pulls the blend down. Mix decision, not a
   rejection. A rung that is **big and below base** is the one real trap.

A small rung at 2.4× base (ROOMMATES, ~1% of its theme) is a **margin play**: build it,
expect it to tap out fast, have the next rung ready. Say "margin play" in the same breath
as the multiple, every time.

🔴 **Never line a mined rate up against a live rate.** ROOMMATES' `$14,065 per 1,000`
comes from matching concern text across a whole theme's history. The live table's
`$6,571` comes from a 60-day, 15.8%-attributed slice. **Different populations, different
windows, not comparable.** Putting them in one table implies a comparison that is not
there. Label every number mined or measured.

## B6. When the operator asks about a SEGMENT

The live system records no segment, so "which segment should we spend into next?" cannot
be measured here. Do not stop at that — do this instead:

1. Answer from the verified segments in the latest `docs/fb-ad-question-mining/*.md` run.
2. Label those numbers **mined, not measured**, and say the live system cannot see them.
3. Give the live stack order at the question and family level alongside, since that *is*
   measured and is what the money actually moves through.
4. Plan reporting at the question level, because that is the finest grain production logs.

---

## LIMITS — say these out loud with the numbers, not instead of them

| Limit | Detail |
|---|---|
| **No spend data at all** | No spend, impressions, CPM, CPC, CPA, frequency or ROAS in this DB. Not thin — absent. Conversations = impressions × CTR × lander-conversion, and Meta chose two of those three. |
| **Partial attribution** | Coverage was **15.8%** on a 60-day run. Everything is computed on that slice. |
| **Dark ≠ not running** | A question with no attributed row may be running hard and unattributed. |
| **Whole-funnel outages** | Palm read 0/10 attributed because its hook only lands on the order-bump exposure. The script now calls that an **attribution outage** and reports palm UNMEASURED. Reporting it as "not running" would be the most damaging thing here. |
| **No segment-level anything** | Segment and injury are not recorded in the running system. Per-segment decay is not computable. |
| **No TAM** | Nothing here estimates addressable audience size. |

### What would close the decay question

A **Meta Ads Manager export**, by ad, by day: *Amount spent, Impressions, Frequency,
Link clicks, CPM, Cost per result, Purchases, Purchase ROAS*.

🔴 **It cannot be joined to this database today.** The only per-ad key here is the hook
slug, and `utm_content` is never persisted. To join, the **ad name in Meta must carry the
hook slug** (e.g. `...cards-gone-cold...`). Check that before promising a joined report.
Do not invent any other source.

---

## Handoff — both directions

### FROM `fb-ad-question-mining` → here

That skill mines `conversations.concern`, derives segments and injuries, verifies them,
and writes the questions. Its output — `docs/fb-ad-question-mining/<mode>-<theme>-<date>.md` —
is this skill's **input**. Take its verified segments and their questions, put them in a
cascade file, cite the run file in `"source"`.

Come here when the operator's question stops being "what should we ask?" and becomes
"what have we got, and where should the money go?"

### FROM here → `fb-ad-question-mining`

Go back there whenever Job A finds an injury with too few questions, or Job B finds a
rung tapping out and the next rung is not written yet. Say it plainly: *"the gap is real
but there is no verified question for it — that is a deepen run on <theme>."*

**Do not duplicate that skill.** It derives; this one measures. Concretely:

| | `fb-ad-question-mining` | `creative-cascade` |
|---|---|---|
| reads | `conversations.concern` (buyer quotes) | the registries + exposure attribution over time |
| scope | one theme, downward | the whole account, sideways |
| output | new segments, injuries, questions | the gap, dark cells, stack order, blend |
| answers | "is my new idea already built?" | "what did we build and never run?" |
| decay | states it cannot observe it | observes it at question/family level, with caveats |

### FROM here → build skills

`fb-tarot-add-card` (a tarot deck or a new question), `fb-palm-add-sign` (a palm sign),
`fb-palm-hooks` (palm question wiring). This skill maps and prices; it never builds.

## Where a run gets written

Most runs answer in chat and write nothing — this skill is a read, not a deliverable.

Write a file only when the operator is going to act on it (a build order, a spend plan):

```
docs/creative-cascade/<job>-<scope>-<YYYY-MM-DD>.md
    gap-commitment-2026-08-15.md
    stack-account-2026-08-15.md
```

Keep it to what someone deciding needs: the gap table or the stack rungs, each number
labelled **mined** or **measured**, and the limits. Method detail belongs in this skill.
Never duplicate a `fb-ad-question-mining` run file's analysis — link it.

## Red flags — stop

- You are about to write a headline that is not in a mining run file → **stop**, that is
  a deepen run.
- You are about to say an ad "isn't running" from registry or DB evidence → **stop**,
  that is Ads Manager's answer.
- You are about to call `TAPPING OUT?` a saturation finding → **stop**, keep the caveat.
- You are about to rank by buy-rate or by raw counts → **stop**, revenue per 1,000.
- You are about to write "persona", or call a segment an "angle" → **stop**, reread the
  vocabulary table.
- You are about to report a family verdict without running `--level question` → **stop**,
  the family average hides the bad question.
- You are about to put a mined rate and a live rate in the same table → **stop**, label
  each one and say they are not comparable.

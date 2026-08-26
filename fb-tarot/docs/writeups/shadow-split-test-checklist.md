# Shadow split test — build checklist

**The task.** Write an Inherited Shadow read for 37 live landers, get them approved, wire them,
then run one experiment splitting each lander **70% shadow / 30% natural**.

> ⛔ **Arming a lander deletes nothing.** The natural read stays and becomes the 30% arm.

## The three steps, in order

| | Step | Done when | Verify with |
|---|---|---|---|
| **1** | **Writeup** ✅ **DONE 2026-08-24 — all 37** | A shadow read exists for all 3 cards, and it passes the gates | `node scripts/check-draft.mjs --dir shadow` · `python3 scripts/check-shadow-readback.py` (the collision check is retired for this method — see below) |
| **2** | **Approved** ✅ **DONE 2026-08-25 — all 37** | 🔴 **The operator has read the copy and said go.** The only box no script can tick | — a human, and nothing else |
| **3** | **Wired** 🔨 **IN PROGRESS** | The read is in the registry and the code can serve it | `npx tsx scripts/lander-registry.mts` — the Method column reads `natural + shadow` on all 37 |

### What step 1 needed that did not exist yet

Both gate commands in the table took a `--dir` that had not been written, so neither could see a shadow
draft. Three things were added, and each was fed a deliberate violation and watched to fail before being
trusted (`natural-tarot-cut.md`: *"a green gate on an UNWIRED family means nothing"*):

| | |
|---|---|
| `--dir` on both gates | `check-draft.mjs` and `check-collisions.mts` were hard-wired to `drafts/rewrites/` |
| 🔴 **the echo window moved with the beat** | The seven cuts say her ad back in cut 2, so `checkEcho` read bubbles 1-2. The shadow opens on a CLAIM and a PROOF and does not reach her question until beat 3 — every shadow read failed the echo gate **for obeying its own spec**. On `--dir shadow` the same check reads bubbles 1-3 |
| 🔴 **`--all` had to stop skipping wired hooks** | Its rule is *"unwired only — a wired hook is already guarded"*. All 37 are already wired **with their natural read**, and that guard protects that read, not this one. Left alone it would have checked nothing and printed a tick |
| `scripts/check-shadow-readback.py` | The read-back, made repeatable: banned symbols, invented life-facts, authorship, mediumship, the per-hook money findings, the after-loss refusal, and the connective spine. It caught a count (*"the one who can do it twice"*) that both other gates passed |

⚠ The 14-word ceiling is **reported, never failed**, and only on beats 3-6. Beats 1-2 spend five words naming
the card before the claim starts: the one read the operator approved line by line runs 17 and 16 words there,
and 14 · 10 · 12 · 9 on the argument beats. Turning a craft target into a gate is how the reading-grade gate
went wrong.

🔴 **All 37 writeups are done BEFORE any approval is asked for** (operator, 2026-08-24). Step 2
is a single review of the whole set, not 37 separate ones.

🔴 **Step 3 does not start until step 2 is complete for every lander.** They all enter the
experiment at the same time — see below.

## The experiment — the 4th step, once

**One experiment, scoped by hook.** Not 37 experiments: a single one, with every lander enrolled
by hook so the results break down per lander and outliers are visible.

| | |
|---|---|
| Split | **shadow 70% · natural 30%** |
| Scope | per hook, all 37 at once |
| URL | `/fb-tarot/b` — every visitor already lands there, `/c` redirects |
| Version | B only. That is where the six beats are actually served |
| Primary metric | **her first chat reply** — ⚠ this lives in PostHog, NOT in the experiment framework. `conversion.type` here is `v1_main_funnel`, so `targetN` and the dashboard verdict gate the REVENUE side only |
| 🔴 Guardrail | **revenue per 1,000 conversations.** A read that wins replies and loses sales is a loss — and at 70/30 that lands on most of the traffic. Buy-rate hides it |
| Enrolment | **all landers on the same day.** Staggered starts mean comparing arms that began in different weeks |
| Horizon | **targetN 10,200 on the NATURAL arm** — the smaller arm governs. Sized from this funnel's own 30-day baseline (510 buyers / 9,609 leads = **5.31%**), 20% relative MDE, adjusted for the 70/30 imbalance. ⚠ At the whole funnel's ~192 natural-arm chats/day that is **~53 days, and it is an UPPER bound**: these 37 are a subset of the 104 live landers, so the real wait is longer |

⚠ ~~`v1_tarot_version_bc_2026` is **paused**~~ — **WRONG, corrected 2026-08-25 by the Phase-5
pre-flight.** It is `done` with `winner_variant = 'B'`. That is fine, and is what this test needs: a
concluded experiment keeps APPLYING its winner, so its four landers resolve to version `b`, and the
other 100 fall through to the URL's own version — also `b`, after the `/c → /b` redirect. Everyone is
on B, the only version that can serve either read. Do not restart it.

🔴 **THERE *IS* AN OVERLAPPING EXPERIMENT, and the checklist missed it.** `v1_close_depth_2026` is
**running**, scoped to funnel `v1-tarot`, started 2026-08-20, at **946 of its 14,400** exposures
(~6%). It changes the **close**; this changes the **opening read**. Crossed factors on one funnel.

✅ **OPERATOR DECISION, 2026-08-25: "the overlap is fine."** Both tests run together. Holding this
one would have cost **months** at close-depth's ~190 exposures/day, so the crossing is accepted.

🔴 **What that decision buys, and what it costs.** Accepting the crossing makes the **stratified
readout mandatory, not optional** — it is §5 of
`improve-v1/create-tarot-shadow-experiment-2026-08-25.sql`. Three things follow:

| | |
|---|---|
| **The dashboard cannot do it** | Every tally in `server/lib/experiments.ts` filters `WHERE e.experiment_key = <one key>`; nothing in the codebase crosses two keys. `/admin/experiments` will only ever show the POOLED read result — averaged over both closes, which is the number the crossing makes untrustworthy alone. Read the pooled row for the headline, then read §5 before believing it. |
| **The join is clean** | No email hashing needed: close-depth writes `context->>'conversationId'` on **100%** of its exposures, and `conversations.ab_visitor_id` carries this test's visitor id. Verified on real rows 2026-08-25 — routing close-depth's own exposures back through that link recovers exactly their own arms (A→A 494, B→B 452). |
| ⚠ **The cross only sees part of the test** | Close-depth is EMAIL-keyed at **lead capture**; this test is VISITOR-keyed at the **opener**, several steps earlier. Every woman who read the opener and never left an email has a read arm and **no close arm**. She is real data for this test — never drop her — but she cannot be stratified. Expect a large `(no close arm)` bucket and report its size, so it is obvious how much of the test the cross actually covers. |

🔴 **If shadow wins under one close and loses under the other, that is an interaction** — neither the
pooled number nor either half is a verdict. Say so; do not pick the flattering half.

## Excluded, and why

| | |
|---|---|
| `cards-feels` · `cards-return` | ⛔ Protected controls. Never rewritten, never armed |
| The 6 loneliness hooks | Their frame **refuses to supply a cause.** This method's engine is supplying one. Structurally incompatible |
| ~56 other decode-him hooks | The answer *is* the product there. That is the natural method's strength and the weakest case for switching |

---

## The 37 landers, in build order

✝ = carries an extra ban that exists nowhere else on the funnel (never rule on God, in either direction).

### 1 · Commitment — 3

A real man exists. No timeframe, and the read never predicts what he does next.

| | # | Hook | Ad headline | 1 writeup | 2 approved | 3 wired |
|---|---|---|---|---|---|---|
|  | 1 | `cards-will-commit` | Will he ever commit? | ✅ | ✅ | ☐ |
|  | 2 | `cards-wont-commit` | Why won't he commit to me? | ✅ | ✅ | ☐ |
|  | 3 | `cards-ready-commit` | Is he ever going to be ready for real commitment? | ✅ | ✅ | ☐ |

### 2 · Money — 11

Full MONEY_GUARD: no amount, no date, no source, no financial advice, never blames her, never "too late", never presumes she is broke.

| | # | Hook | Ad headline | 1 writeup | 2 approved | 3 wired |
|---|---|---|---|---|---|---|
|  | 4 | `cards-blocked-retiring` | Why is my money still blocked this close to retiring? | ✅ | ✅ | ☐ |
|  | 5 | `cards-nest-egg` | How long has something been blocking me from a nest egg? | ✅ | ✅ | ☐ |
|  | 6 | `cards-too-late` | Is something blocking my money, or did I just leave it too late? | ✅ | ✅ | ☐ |
|  | 7 | `cards-still-working` | Why am I still working when the money should have come by now? | ✅ | ✅ | ☐ |
|  | 8 | `cards-how-much-longer` | How much longer will something keep blocking my money? | ✅ | ✅ | ☐ |
|  | 9 | `cards-out-of-time` | Is something still blocking my money, or have I run out of time? | ✅ | ✅ | ☐ |
|  | 10 | `cards-my-energy` | Is my energy blocking my money? | ✅ | ✅ | ☐ |
|  | 11 | `cards-money-wont-stay` | What does my energy say about why money won't stay? | ✅ | ✅ | ☐ |
|  | 12 | `cards-energy-how-long` | How long has my energy been working against my money? | ✅ | ✅ | ☐ |
| ✝ | 13 | `cards-prayed-years` | I've prayed about money for years. What's still blocking it? | ✅ | ✅ | ☐ |
| ✝ | 14 | `cards-prayers-unanswered` | How long will my prayers for money keep going unanswered? | ✅ | ✅ | ☐ |

### 3a · Soulmate × keyword — 6

The ad already tells her she is the problem. Best fit on the funnel. No particular man exists.

| | # | Hook | Ad headline | 1 writeup | 2 approved | 3 wired |
|---|---|---|---|---|---|---|
|  | 15 | `cards-blocking-soulmate` | Is something blocking me from meeting my soulmate? | ✅ | ✅ | ☐ |
|  | 16 | `cards-blocked-before` | Why do I keep getting blocked before my soulmate arrives? | ✅ | ✅ | ☐ |
|  | 17 | `cards-energy-away` | Is my energy keeping my soulmate away? | ✅ | ✅ | ☐ |
|  | 18 | `cards-energy-soulmate` | What does my energy say about my soulmate? | ✅ | ✅ | ☐ |
|  | 19 | `cards-waiting-to-heal` | Is my soulmate waiting for me to heal? | ✅ | ✅ | ☐ |
|  | 20 | `cards-heal-first` | Do I need to heal before my soulmate arrives? | ✅ | ✅ | ☐ |

### 3b · Soulmate × age band — 11

No man exists yet; she asks WHEN or WHETHER. The age band lives in the ad set, never in the copy.

| | # | Hook | Ad headline | 1 writeup | 2 approved | 3 wired |
|---|---|---|---|---|---|---|
|  | 21 | `cards-slipping-past` | Why does my soulmate keep slipping past me? | ✅ | ✅ | ☐ |
|  | 22 | `cards-choosing-wrong` | What keeps me choosing everyone but my soulmate? | ✅ | ✅ | ☐ |
|  | 23 | `cards-found-me-yet` | Why hasn't my soulmate found me yet? | ✅ | ✅ | ☐ |
|  | 24 | `cards-keeps-waiting` | How long does a soulmate keep you waiting? | ✅ | ✅ | ☐ |
|  | 25 | `cards-missed-chance` | Is my soulmate still coming, or have I already missed him? | ✅ | ✅ | ☐ |
|  | 26 | `cards-after-marriage` | Is there a soulmate for me after the marriage ended? | ✅ | ✅ | ☐ |
|  | 27 | `cards-second-time` | How long does it take to find a soulmate the second time? | ✅ | ✅ | ☐ |
|  | 28 | `cards-best-years` | Why did I give my best years to someone who wasn't my soulmate? | ✅ | ✅ | ☐ |
|  | 29 | `cards-too-late-love` | Is it too late to meet my soulmate? | ✅ | ✅ | ☐ |
|  | 30 | `cards-longer-to-wait` | How much longer do I have to wait for my soulmate? | ✅ | ✅ | ☐ |
|  | 31 | `cards-allowed-to-want` | Am I still allowed to want a soulmate? | ✅ | ✅ | ☐ |

### 3c · Soulmate × where — 3

Defining ban: never name a PLACE. No tactic, never her fault.

| | # | Hook | Ad headline | 1 writeup | 2 approved | 3 wired |
|---|---|---|---|---|---|---|
|  | 32 | `cards-where-soulmate` | Where is my soulmate right now? | ✅ | ✅ | ☐ |
|  | 33 | `cards-soulmate-closer` | Is my soulmate closer than I think? | ✅ | ✅ | ☐ |
|  | 34 | `cards-not-found-yet` | Why haven't I found my soulmate where I am? | ✅ | ✅ | ☐ |

### 3d · Soulmate × after loss — 3

Someone has died. Hardest ban is NO ARRIVAL, plus no mediumship, and the man is never spoken for.

| | # | Hook | Ad headline | 1 writeup | 2 approved | 3 wired |
|---|---|---|---|---|---|---|
|  | 35 | `cards-new-soulmate` | Will I find a new soulmate after loss? | ✅ | ✅ | ☐ |
|  | 36 | `cards-soulmate-out-there` | Is there still a soulmate out there for me? | ✅ | ✅ | ☐ |
|  | 37 | `cards-ready-to-love` | Am I ready to love again after losing him? | ✅ | ✅ | ☐ |
---

## Step 3 · how the wiring is built (decided 2026-08-25)

**Serving design: option A — a second roster.** `DECKS[deck].reads` (the natural read) is not
edited. The shadow reads live beside it, and the arm decides which roster `openerB` reads from.

🔴 **The reason, and it is the whole reason:** if the experiment is draft, paused, erroring or
mid-deploy, 100% of visitors get exactly what runs today. The failure mode of a split test must
be "nothing changed", not "the unproven arm went to everyone". These 37 hooks are most of the
tarot traffic and this method has never served a live visitor.

| | |
|---|---|
⚠ **The Method column does not FLIP, it GAINS.** An armed lander reads `natural + shadow`, because
under option A both reads serve it — 70% shadow, 30% natural. A lander that read only `shadow`
would mean the natural read had been deleted, which is the one thing this design forbids.

| Experiment key | `v1_tarot_shadow_2026` |
| Split | 70% shadow · 30% natural · Version **B** only |
| The roster | `client/src/content/tarotReadsShadow.ts` — **generated, never hand-edited** |
| Regenerate it | `npx tsx scripts/shadow-drafts-to-registry.mts` |

**The fold**, as `scripts/lander-registry.mts` defines it — six beats into the same four slots,
six bubbles on her screen:

```
natural   [picture]        [bridge] [cuts 3-6 joined by \n] [loop]
shadow    [claim \n proof] [her]    [but \n so]             [loop]
```

Slot `[1]` is still the bridge and `[3]` is still the loop, so every guard written against the
four slots keeps its meaning, and the 19 files pinning four slots still pass.

**To change a read: edit the DRAFT and regenerate.** Editing the roster by hand loses the change
the next time anyone regenerates, and breaks the guarantee that what serves is what was approved.
The generator proves it — it unfolds its own output and compares every bubble to the draft,
exiting non-zero if one character differs.

### The files the serving change touches

| File | Change |
|---|---|
| `server/lib/experiments.ts` | `resolveTarotMethod()` beside `resolveTarotVersion()`, same defensive shape; anything unexpected ⇒ `natural` |
| `server/routes.ts` | `/api/tarot/version` returns `method` too — one round-trip, one exposure row |
| `client/src/lib/tarotAttribution.ts` | returns `{version, method}`, plus `rememberTarotMethod` so PostHog carries the arm |
| `client/src/hooks/useConversation.ts` | passes the arm into `tarotOpenerB` |
| `client/src/content/tarotReads.ts` | `openerB(deck, hook, card, method = 'natural')` |
| `server/routes/admin/experiments.ts` | ⭐ **a sixth file, added at review.** Registers the key in `V1_MAIN_FUNNEL_KEYS` + `VISITOR_KEYED_V1_MAIN_KEYS`. Inert on its own, but without it the experiment cannot be seeded with the `v1_main_funnel` conversion type — and the **revenue guardrail has nowhere to come from** |

⚠ **The card art needs nothing.** It rides bubble 1 via `sendBotMessages(msgs, art)`, independent
of the read text, so it shows on both arms. `PICTURE_HOOKS` is empty — `beat1WithPicture` fires
for no hook on either arm.

### The build order, and where it stops for a human

| | Phase | Done when | Who |
|---|---|---|---|
| ✅ | **1 · The copy is in the registry** | `tarotReadsShadow.ts` generated and verbatim-verified; `tarotReads.ts` untouched; `tsc` clean. Dead code — nothing imports it, so nothing can serve it | Claude |
| ✅ | **2 · Serving code** | The five files above. Default arm is `natural`, and method applies only when version resolves to `b` | Claude · **stopped for review of the diff, approved 2026-08-25** |
| ✅ | **3 · Tests + tooling** | `server/lib/tarotMethod.test.ts` (12 cases) · `tests/tarot-shadow-roster.test.ts` (14 cases) · `lander-registry.mts` reads the second roster and REFUSES an armed protected control · all suites green | Claude |
| ✅ | **4 · Local smoke, both arms** | **64/64** on 2026-08-25 — `audit-tarot-shadow.mjs`, real browser, real resolver, arm forced through a sandbox-only copy of the experiment. Report + transcripts + screenshots in `audit-runs/v1-funnel-audit/tarot-shadow/` | Claude · **stopped with a transcript** |
| ✅ | **5 · Experiment seeded as DRAFT** | Seeded in PRODUCTION 2026-08-25 via `improve-v1/create-tarot-shadow-experiment-2026-08-25.sql`. draft · visitor · natural w30 FIRST + shadow w70 · 37 landers · freeze on · targetN **10,200** (sized, not inherited) · 0 exposures. Draft changes nothing | Claude |
| ☐ | **6 · Live** | Deploy, then flip draft → running in `/admin/experiments`. Day-one check: exposures near 70/30, no SRM, both arms rendering | 🔴 **Operator** |
| ☐ | **7 · Readout** | Two pre-registered looks. **Revenue per 1,000 conversations read first**, replies second — a read that wins replies and loses sales is a loss, and at 70/30 that lands on most of the traffic. 🔴 **The design is CROSSED (operator, 2026-08-25), so the pooled dashboard row is not a verdict on its own** — run §5 of the seed SQL and stratify by close arm | Operator + Claude |

**Verification commands, all of them:**

```
npx tsx scripts/shadow-drafts-to-registry.mts     # regenerate the roster + verbatim proof
npx tsc --noEmit
node scripts/check-draft.mjs --dir shadow
python3 scripts/check-shadow-readback.py
npx tsx scripts/lander-registry.mts               # 37 read `natural + shadow`; exits 1 on an armed control
npm run test:experiments                          # incl. tarotMethod.test.ts — 83 pass
npx vitest run tests/tarot-shadow-roster.test.ts  # the serving side — 14 pass
npx tsx .claude/skills/v1-funnel-audit/scripts/audit-tarot-shadow.mjs   # Phase 4, both arms, real browser
```

⚠ The smoke needs the **sandbox** running first — see `.claude/skills/v1-funnel-audit/SKILL.md`
§"Run it": start Postgres on `:5433`, `node scripts/make-sandbox-env.mjs`, then
`DOTENV_CONFIG_PATH=.env.sandbox npx tsx server/index.ts`. It forces each arm by weighting a
**sandbox-only** copy of `v1_tarot_shadow_2026` 100/0, and deletes it again when it finishes.

⚠ `npx tsc --noEmit` is **not** clean on this repo and never has been: 174 pre-existing errors in
unrelated files. The check that matters is that none of them name a file this work touched.
⚠ `npx vitest run` collects the node:test files too and reports them failed. They are not — they
need `tsx --env-file=.env.test --test`. Run the vitest-native suites, or `npm run test:experiments`.

🔴 **The invariants, for whoever picks this up next:**
1. The copy is approved and frozen. It moves verbatim; it is never rewritten to satisfy a gate.
2. Natural is the default on every failure path.
3. Arming deletes nothing — `DECKS.reads` is never edited.
4. `fb-tarot/docs/inherited-shadow-cut.md` is the spec. Not the review file, not an old draft.
5. Claude does not deploy and does not flip the experiment on.

### What the Phase-4 smoke found, and it was in the AUDIT (2026-08-25)

The first run reported 7 failures. **None of them were the product** — all seven were one wrong
assumption in the audit script, and it is worth recording because the same trap is waiting for
anyone who writes a tarot walk:

🔴 **`return-mhf` is FACE-DOWN, so the panel she TAPS is not the card she DRAWS.**
`TarotBridge.cardForPanel` shuffles. The script tapped panel `a` and then graded the read against
card `a`'s copy — so it expected the Magician and saw the Hanged Man, on three landers at once,
and on one of them the bubble COUNT differed too (that lander's cards fold to 8 and 7). The fix is
to read `?card=` off the chat URL the bridge builds, which is the only place that knows the draw.

The same fact killed the cross-arm comparison: the shadow walk and the natural walk of one lander
routinely draw DIFFERENT cards, so comparing the two runs' bubbles to each other compares two
different readings. Both cross-arm checks moved inside the walk, keyed on the card actually drawn.

Two other audit-side faults the run surfaced:

| | |
|---|---|
| `settle()` returned before Claude answered | It waits for 2.5s of quiet, and there IS 2.5s of quiet between her message appearing and the typing indicator starting. `chatStatus` was still null, so "did not 400" would have passed **vacuously**. Now the script awaits the `/api/chat` response, and a separate check asserts it fired at all |
| the walk took 77s | 14 scripted bubbles at up to 5s of fake typing each. Clamping `setTimeout` in the page (what `audit-flow`/`audit-upsells` already do) took it to ~18s |

### The collision check is retired for this method (operator, 2026-08-25)

`npx tsx scripts/check-collisions.mts --dir shadow` now exits straight away and explains why.
It is **not** a ship condition for the Inherited Shadow, and its absence is not an oversight.

**Why.** The check looks for the same six-word run in two different landers, on the assumption
that sharing means copy-paste. The canon now requires the sharing:

| | |
|---|---|
| Beat 5 | carries a **mandatory** measured origin finding — *"I don't think this began with you"* — on all 108 reads |
| Beat 4 | states the one fact her ad establishes; repeating a true sentence beats swapping synonyms to dodge a checker |
| Beats 1–2 | 37 landers share ONE three-card deck, so the drawn detail is the same picture by definition |

Measured before retiring it: **3,251 flags, 91% of them in beats 4 and 5** — the two beats the
rulings make identical on purpose. A checker that flags the spec trains everyone to ignore it,
and then it cannot catch the thing it was built for either.

⚠ **Two things did NOT change.**
1. `inherited-shadow-cut.md` §Pre-flight step 3 still stands — the **three cards inside one
   lander** must not open the same way. Different axis, checked by eye before drafting.
2. The check is still fully live for the seven-cut drafts (`--dir rewrites`), where its premise
   holds: those families have their own hooks and their own cards.

## Where the work lives

| | |
|---|---|
| Method spec | `fb-tarot/docs/inherited-shadow-cut.md` — the six beats, plus 3 worked examples |
| The other method | `fb-tarot/docs/natural-tarot-cut.md` — shared voice rules and the read-back |
| Which detail proves what | `fb-tarot/docs/decks/return-mhf/symbols.md` · `arcana-eef/symbols.md` |
| Bubble 1 claims | `fb-tarot/docs/decks/card-claims.md` |
| Drafts | `fb-tarot/docs/drafts/shadow/<hook>.json` |
| What exists today | `fb-tarot/docs/lander-registry.md` (generated) |

🔴 **Run the read-back before showing any writeup** — `natural-tarot-cut.md` §"The read-back".
The gates catch words and syllables. They caught none of the four faults the operator found on
2026-08-23.

# Run state — /fb-tarot copy migration

> ⬆️ **CURRENT STATE at the top. The overnight-run record from earlier on 2026-08-19 follows
> below and is kept for its VOC findings and its tooling notes, not for its queue.**

## 2026-08-19 · the Natural Tarot-Cut conversion — TRACK A AND TRACK B COMPLETE

**Nothing is wired. Nothing has reached a visitor.**

- **All 76 remaining Track-A landers converted** to the seven cuts, family by family, in the
  checklist's own top-down order: his-other-life · decode-him · fidelity · twin-flame ·
  reconciliation · soulmate-after-loss · commitment · trust · soulmate-where · searching ·
  still-feels · loneliness · pulling-away · missing-him · reunion · soulmate-label ·
  why-he-left · honesty · healing · self-frame · hidden-intuition.
- **Track B built: all 11 money landers exist.** The 3 trial hooks converted to the cuts, and
  the 8 unbuilt ones written straight to them from `money-block.draft.md` §5–§6.
- **Bubbles 1 and 2 were left alone everywhere.** The art line was already checked against the
  card and is pinned by the beat-1 distinctness guards; the bridge already echoes the ad. Only
  bubbles 3–6 were rewritten, plus bubble 7 where it named an absence rather than an object.

### Verified
| Gate | Result |
|---|---|
| `npx vitest run --config scripts/vitest.drafts.config.ts tests/tarot-` | **496 / 496** (23 files) |
| `npx vitest run tests/tarot-` (live registry) | **496 / 496** |
| `node scripts/check-draft.mjs` (all hooks) | no problems |
| `npx tsx scripts/dryrun-drafts.mts` | all drafts clear |
| `node scripts/preview-rewrite.mjs --html` | 77 hooks, 0 problems |
| `npx tsc --noEmit` | 46 errors = baseline, unchanged |

### Guard changes, and why each one moved
1. **`tests/tarot-soulmate-label-copy.test.ts` — the openerB test is now split-aware.** It
   asserted 5 messages and a >400-char beat 3. Both are copy SHAPES, not faults: `openerB` runs
   every beat through `intoBubbles`, so split copy serves 8, and grade-5 bubbles measure 185–220
   in beat 3. It now indexes from the END and measures the whole served read (460–510 across the
   nine). This was the suite's one red test since the migration began.
2. **`tests/tarot-missing-him-copy.test.ts` — the timeframe test no longer contradicts the
   life-sentence test.** That file's LIFE SENTENCE test says in writing that promising the hurt
   ends is allowed (operator, 2026-08-19); three lines in its TIMEFRAME test banned the sentence
   that says it. Removed those two; every dated form and `these things take` still banned.
3. **`scripts/dryrun-drafts.mts` synced twice** — it was still banning the after-loss arrival
   promise and the missing-him hurt-ends promise after the real guards stopped. A mirror that
   argues with the source of truth sends the writer chasing a rule nobody holds.

### 🆕 `tests/tarot-money-block-copy.test.ts` — written, and proven to bite
The gap the last run flagged is closed. It does **not** read the registry the way its siblings
do, because it cannot: `wire-drafts-setup.mts` only patches a hook the registry already has
(`if (!reads?.[d.hook]) continue`), so for an unbuilt family every deck-level guard skips and the
run still prints a tick. This file loads the registry per hook where wired and the draft JSON
where not, and says which it used. 14 assertions: structure, facing, open loop, message scent,
33 distinct card framings (against the live deck too), no recycled 6-word runs, the seven bans,
and a per-hook finding so eleven landers cannot become one lander in eleven headlines.

**All seven bans were fed a deliberate violation and all seven fired** — an amount, a date, a
named relative, "sell the house", "your money mindset", "the money is coming", "your prayers were
heard", "you are broke". The same drill was run on `cards-his-children` ("you should come first"
trips the ranking ban), so the love guards are confirmed live on draft copy too.

⚠️ Its restatement exemption is NARROWER than the love families': it skips a clause only when the
clause is a literal fragment of that lander's own headline. `cards-too-late` needs it (its ad
contains ban 5's phrase) and a real assertion is never a substring of the ad.

### 💰 TRACK B IS WIRED (operator: "yes money needs to build new pages as well")
All 11 money landers are in the registry and serve end to end. Verified by running the real
functions, not by reading the diff:

    parse       {"deck":"return-mhf","hook":"cards-my-energy","card":"a","version":"b"}
    angle       money-energy | bucket: money        ← hookToBucket() no longer hardcoded
    tap line    "Think of the money that never came. Tap the card that calls you."
    tap (love)  "Think of the man on your mind."    ← unchanged for every other hook
    openerB     8 messages, the seven cuts + name capture
    prompt      money guard present · prayer clause ONLY on the prayer pair · love frame untouched

What that took, beyond copy: `hookToBucket()` branches; `CardSetConfig.hookInstruction` +
`instructionFor()` read by `TarotBridge.tsx`; a money frame in `buildTarotReflectPrompt` tested
FIRST rather than appended to the five-branch ternary (every existing frame assumes a man);
4 angles + 4 rosters + `TAROT_HOOKS` / `HEADLINES` / `TAROT_QUESTION` / `TAROT_HOOK_CONTEXT` /
`TAROT_HOOK_TENDENCY`; `validHooks` in `routes.ts`; admin angle labels.

Ad links (return-mhf is the default deck, so no `&deck=`):
`/fb-tarot/b?hook=cards-my-energy` … one per hook.

### ⛔ THE `decode-him` DECK IS RETIRED (operator call)
Not the ANGLE — the angle is the reporting label for the hooks that read HIM and is untouched.
The DECK was the seeded Sun/Moon/Tower set whose strip png was byte-identical to
`client/public/palm/thumbs-strip.png` (md5 `8e10ada…`), so a visitor tapped a PALM THUMB and was
then told "you turned the Sun". Nothing in the repo linked `deck=decode-him`, so no traffic was
lost. Removed: the `TarotDeck` union member, the `DECODE_HIM` config, the `DECKS` entry, the
`TAROT_CARD_VOCAB` entry **and the fallback that pointed at it** (now `return-mhf`), the
`validDecks` roster entry, the placeholder png, and the deck's blocks in three drafts. Two tests
had to shrink with it — the readability grandfather list (it may only ever shrink) and the
fidelity incumbent sweep, which iterated a deck that no longer exists.

### 💜 TRACK A IS WIRED TOO (operator: "wire the love landers too")
**74 landers wired** from the approved drafts, folded verbatim — nothing was retyped between the
preview and the registry. The generated checklist now reads **95/95 clean · 0 problems left**,
and that tick is derived from the live registry, not from anyone remembering to tick it.

⛔ Two hooks were deliberately NOT touched, per the standing decision: `cards-feels` (the control
for two live comparisons, whose baseline already broke once this month) and `cards-who-he-is`
(already wired with signed-off copy).

🔴 The wiring script failed on its first run and the failure is worth keeping: its brace scanner
tracked strings but not COMMENTS, and this file is 40% commentary full of apostrophes ("don't",
"she's"), so the first one read as an unterminated string and the scan walked off the end of the
file. It aborted before writing, so nothing was half-wired — but a scanner over this source has
to skip `//` and `/* */` as well as quotes.

Checked after wiring, on the live registry: 496/496 tarot guards · tsc 46 (baseline) ·
`check-read.mjs --hook` PASS · every return-mhf card read now carries the four-bubble beat 3
(0 left on the old single block) · Version B serves 8 messages.

### What is NOT done
- **Nothing is committed and nothing is deployed.** `be-offers` is 28+ commits ahead.
- The old per-hook comments above some reads still describe the copy they replaced.

### Where the review lives
- Full draft preview (77 hooks): https://claude.ai/code/artifact/ae22f7e3-5f5f-40f0-9b4e-7ca03862bb69
- The decision brief: https://claude.ai/code/artifact/4cb22e65-aace-4044-978b-8a7462439b86

---

# Overnight migration run — 2026-08-19 (earlier; historical)

Operator asked for the rest of Track A drafted, previewed and published for morning review.
**Nothing is wired. Nothing has reached a visitor.** 482/482 tarot tests pass, tsc 46 = baseline.

## Result
79 landers drafted (76 love + the 3-lander money-retiring trial). With the 12 already clean, all **88 of 88** are now covered.
**481 of 482 real guard assertions pass against the drafts.** The one failure is structural,
not copy — see §"Before wiring" item 1.

## ✍️ Second pass — CONCRETENESS (operator feedback, the important one)
Operator read `cards-alone-forever` card a and said the wording was hard to follow:

    3. I will not tell you how long, dear. Nobody honestly can.
    4. See him. He has today's tools and no calendar at all.
    5. But hear what forever means when you say it.
    6. It is not a length. It is how heavy this got, dear.

He was right, and **no gate could have caught it** — "It is not a length." is grade 2.
The readability gate counts syllables and sentence length; it cannot see abstraction.
This also repeated a standing instruction I already had ([[tarot-copy-picture-before-meaning]]:
no metaphors she has to decode).

**Three rules, now enforced in `scripts/check-draft.mjs`:**
1. Never open a bubble on a bare It / That / This. Each bubble is its own chat message with a
   typing pause, so the referent has scrolled. "That gap is real, dear" is fine (noun attached).
2. No concept-nouns — length, premise, notion, ration, hinge, "a real fork", "a shape problem".
3. Never make her analyse her own wording. Do that work for her.

**74 lines rewritten** across 46 hooks. Plus three sustained metaphors removed, which no regex
found — `cards-on-my-mind/b` ran shape/lie-flat/odd-shape/shape-is-wrong across four bubbles.
(`cards-not-enough` keeps its scales: bubble 1 shows there are none on the table, so she is
looking at the thing before it is used to mean anything. That is the correct technique.)

Operator call: the 4 flagged bubbles inside already-wired `cards-feels` / `cards-who-he-is`
were LEFT ALONE. `check-draft.mjs` exempts those two hooks so signed-off copy is not reopened.

## 🔎 The guard audit (run after the operator asked "have you audited your work?")
The first pass was only checked against `dryrun-drafts.mts`, which is a HAND re-implementation
of the guards — it proves only what somebody remembered to transcribe. Loading the drafts into
the in-memory registry and running the REAL `tests/tarot-*-copy.test.ts` found **12 failures
both other gates passed clean**. All fixed. Re-run it any time:

    npx vitest run --config scripts/vitest.drafts.config.ts tests/tarot-

**The class nobody had anticipated:** saying her own headline back to her trips her own
family's ban. "there is someone else", "he still loves you", "you are ready", "stop searching",
"you will be alone forever", "you are meant to be alone", "he is hiding something", "he is
telling you the truth", "you are being deceived" are all banned phrases AND the exact words of
the ad. Ten echoes had to be rebuilt to sound like her question without using it.
The rest were **missing affirmations** — seven reads refused cleanly but gave her nothing back,
which those guard files explicitly require ("still affirms HER", "every read gives her something
back", "DOES affirm the past tense", "every hook AFFIRMS something, it does not only refuse").

**START HERE:** https://claude.ai/code/artifact/1d5d1316-1e1f-4837-bbf7-0c57d69a02b2
(index of all 16 review pages, plus the flags below)

## Tooling added
- `.claude/skills/v1-funnel-live-audit/scripts/voc-by-theme.mjs` — VOC search across the WHOLE
  V1 corpus by theme regex. Needed because `voc-by-hook.mjs` returns almost nothing for a
  family that shipped days ago (his-other-life: 14 quotes across 5 hooks). Read-only, same gate.
- `scripts/dryrun-drafts.mts` — runs the guards from `tests/tarot-<family>-copy.test.ts`
  against the DRAFT json before wiring: beat-1 distinctness across the deck, the 6-word-run
  rules, per-family required findings, and every ban sweep. **It caught ~40 real failures the
  readability gate passed clean**, including a dozen cases where restating her own headline in
  beat 2 tripped that family's ban (e.g. "there is someone else", "he still loves you",
  "you are being deceived", "you have given up", "you will be alone forever").
- `scripts/check-draft.mjs` — per-bubble readability readout, so a failing line is found in one pass.
- `scripts/preview-rewrite.mjs` — `--hook` may now be repeated; `--out <path>` redirects the render.
  ⚠️ zsh does not word-split unquoted vars — pass repeated flags via an array or `${=args}`, or
  the filter silently renders every draft (this bit once and five pages were republished).

## 🔴 Before wiring
1. **soulmate-label — it is FOUR lines, not three, and only one should be deleted.** Measured,
   not guessed: `openerB` returns **8** messages for split copy, not 5.
   - `439` `toHaveLength(5)` → 8
   - `440` `msgs[0]` opens on the card → **passes untouched**
   - `441` the loop line is now `msgs.at(-2)`, not `msgs[3]`
   - `442` the name capture is now `msgs.at(-1)`, not `msgs[4]` — **the handoff missed this one**
   - `444` asserts the read body is >400 chars. Measured 185–220 across all nine cards. That bar
     was written for long-form beat 3 and grade-5 copy can never meet it → **delete this one.**
   Recommendation: repair 439/441/442 to be split-aware (they are real protection), delete 444.
2. **Pre-existing dup in LIVE copy:** `cards-feels` and `cards-return` share the 6-word run
   "but look where his eyes are" on card c of return-mhf and arcana-mfh. No test catches it
   (both are seed hooks with no guard file). Left alone — signed-off copy, operator's call.
3. **decode-him is NOT blocked.** Shipped cards-feels/cards-return already open on the card name
   instead of a picture line, because that deck's strip is the fb-palm thumb art with no
   revealStrip. Same approach used for cards-honest/cards-cheating, so all 8 are drafted. The
   underlying art question is still open.

## Findings from the VOC that changed the copy
- **his-children:** not one woman in 192 concerns asked to outrank a child. The injury is being
  outside the door — "his daughter is getting married and I'm not invited, I've been his partner
  nine years", "he had a whole life without me".
- **cards-someone-else (best converter, 9.8%):** its traffic is NOT mainly infidelity — widows,
  exes, stalled situationships. It wins because it names the GAP, not a third person. Preserved.
- **twin-flame:** one mention of the phrase across 62 concerns. The label is the ad's word, not
  hers, so the reads stay human and leave the cosmology alone.
- **cards-honest / cards-real-person:** heavily online-and-unmet, some plainly being defrauded.
  Reassurance is the failure mode; nothing vouches for him.
- **soulmate-after-loss:** the "loss" is often a divorce, a walkout or a nursing home, not a
  death — so nothing presumes one, which also keeps it safe when it was one.

## Order completed
his-other-life · decode-him · fidelity · twin-flame · reconciliation · soulmate-after-loss ·
commitment · trust · soulmate-where · searching · still-feels · loneliness · pulling-away ·
real-feelings · missing-him · reunion · why-he-left · honesty · healing · soulmate-label ·
self-frame · hidden-intuition  — **all done**

## Not done (not asked)
- Track B, the 11 money landers.
- Wiring anything.
- Pushing `be-offers` (still 28 commits ahead, undeployed).


## ✍️ Third pass — CONVERSATIONAL REGISTER (operator, the biggest single fix)
Operator: *"still too much prose … write in conversational english."* Measured it:
**signed-off copy runs 37% contractions; my 1,523 new bubbles ran 0%** (five of them).
706 bubbles contracted, now at 40%. Plus balanced clauses, aphorisms and appositive tails
removed by hand. Full rule: memory `tarot-copy-conversational`.

🔴 The blind regex pass produced real grammar errors ("which one it's", "the most modest thing
there's") and snapped EIGHT required-finding regexes that need the literal "will not". Both
gates caught them. `check-draft.mjs` now flags a contraction at a clause end.

## 💰 Track B trial — money-retiring (3 of 11)
`cards-blocked-retiring` · `cards-nest-egg` · `cards-too-late`. Built on the NEAR-MISS, not
poverty — `docs/v1-money-bucket-voc.md` §3 says so outright ("The near-miss is the hook, not
the poverty"), and it clears the never-presume-her-finances ban for free.

🔴 **Least proven set in the batch.** `tests/tarot-money-block-copy.test.ts` does not exist, so
these could only be run against the readability gate and a hand-coded version of the seven bans
— NOT real assertions. Write that guard file alongside the remaining 8, not after. It needs a
RESTATEMENT EXEMPTION: the `cards-too-late` headline contains ban 5's own phrase.

Remaining 8 money landers: money-working (3) · money-energy (3) · money-prayer (2).
Draft source: `fb-tarot/docs/drafts/money-block.draft.md` §5 (reveals) + §7 (wiring list).

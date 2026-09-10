# 07 — how to add a spread without touching n8n

**The answer: n8n is already spread-blind, and should stay that way.** The workflow never
names a spread. It loads a stored draw record, reads `draw.spread_name` as a string, fans out
one item per paid position, and writes each one. It would fulfil a spread invented tomorrow
without a single node changing.

So *"how do we add spreads later"* is not an n8n question. It is a question about where a
spread is **defined** — and it used to be defined in four places that nothing kept in agreement.

> ✅ **Built, 2026-09-04.** [`scripts/07-spreads.json`](../../scripts/07-spreads.json) is now that
> one definition: 7 spreads, 55 positions, every `job` string. `scripts/07-registry.mjs` is the
> only arithmetic on top of it, and **`node scripts/check-07-registry.mjs`** asserts that the
> registry, `07-P1`, the seven daily `.md`, the seven built `.html`, `07-art-prompt.md`,
> `make-07-spread-covers.py`, `07-dryrun-orders.json`, the booking page and `build-07-n8n.py`
> all still say the same thing. Steps 4 and 6 below are done; **step 3 is still the one that
> cannot wait**, and step 5 waits on the endpoint in `07-server-spec.md`.

---

## 1 · What was wrong — both now fixed

Three things, found by replaying the workflow's own `4 · Build the brief` node against
`07-P1`'s real counts for all seven days and all three tiers.

| day | spread | free | paid | The Spread $35 | The Pattern $57 | The Table $87 |
|---|---|---|---|---|---|---|
| mon | The Weight | 1 | 5 | 🔴 **throws** | 10 | 15 |
| tue | The Two Doors | 2 | 6 | 6 | 11 | 16 |
| wed | The Small Instruction | 1 | 5 | 🔴 **throws** | 10 | 15 |
| thu | The Undertow | 2 | 5 | 🔴 **throws** | 🔴 10, *5 duplicated* | 🔴 15, *5 duplicated* |
| fri | The Ledger | 3 | 6 | 6 | 11 | 16 |
| sat | The Other Chair | 2 | 5 | 🔴 **throws** | 10 | 🔴 15, *5 duplicated* |
| sun | The Zodiac Spread | 3 | 9 | 9 | 14 | 19 |

### ✅ A · The floor of 6 counted the wrong thing — 4 of 7 days could not be sold at $35

`if (paid.length < 6) throw` counts **paid** positions. `07-P1`'s floor is on the spread's
**total**, and its Total column proves it: 6 · 8 · 6 · 7 · 9 · 7 · 12, every one at or above 6.
The booking page agrees — it advertises Tuesday as **8 / 13 / 18 cards**, which is paid *plus*
the free ones she already watched go down.

**Fixed** in `BRIEF_JS`: the check is now `free.length + paid.length < 6`. Monday, Wednesday,
Thursday and Saturday take a $35 order instead of throwing on every one.

### ✅ B · Thursday and Saturday bought their own spread twice

Tier 2 adds **The Undertow's five**. On Thursday the day's spread *is* The Undertow. Tier 3 adds
**The Other Chair's five**; on Saturday the day's spread *is* The Other Chair. Nothing guards it,
so those buyers pay $57 or $87 for five positions written twice.

**Fixed** with one rule: *an expansion is skipped when it is the day's own spread*, and a tier
that then resolves to the next cheaper tier is **refused**, loudly, naming the refund.

⛔ The refusal compares against the **cheaper tier**, not against the day block. The first
version of this guard compared against the day block and let Saturday's Table through — it had
added the Undertow, so it "added something", but what it added was exactly Saturday's Pattern.
$87 for the $57 reading, and the naive check cannot see it.

⭐ **What falls out of the rule: two days have two rungs, not three.**

| Day | Its own spread is | So it has no | Ladder |
|---|---|---|---|
| **Thursday** | The Undertow *(tier 2's expansion)* | **Pattern — $57** | Spread $35 → Table $87 |
| **Saturday** | The Other Chair *(tier 3's expansion)* | **Table — $87** | Spread $35 → Pattern $57 |

Nobody loses value — those rungs only ever sold content the buyer already had. But 🔴 **the
booking page must stop offering them**, and `07-C2` currently prints three tiers on all seven
days. Until it is changed, a Thursday buyer can still pick Pattern, pay $57, and the workflow
will refuse the order. The alternative is to write a **third reusable expansion** so every day
keeps all three rungs — more product, more copy, and an operator call, not a code fix.

### ⚠ C · A spread is defined in four places and generated from none

`07-P1` (prose table) · the daily `.html` (which cards, which are free) · the API payload
(`job` verbatim) · the booking page (card counts per tier). Adding a spread today means editing
four things by hand and hoping they agree. Nothing checks them.

---

## 2 · The shape to move to

**One registry. n8n stays downstream of it and learns nothing.**

```
scripts/07-spreads.json        ⭐ THE definition. Everything else reads it.
   │
   ├─► server  GET /api/be/07/fulfilment/:sessionId
   │              resolves tier → returns ONE flat ordered positions[]
   │              already deduplicated, already floor-checked
   │
   ├─► build-07-daily.py       which cards are free, what the counts are
   ├─► the booking page        "8 / 13 / 18 cards", per day
   └─► make-07-day-art.py      how many face up, how many face down

   n8n  ──► reads the draw record only. Never the registry. Never a spread name.
```

### The registry entry

```jsonc
"the-weight": {
  "name": "The Weight", "day": "mon", "slug_in_link": "the-weight",
  "question": "What am I carrying that was never mine?",
  "shape": "A weight has an origin, a purpose, a cost, a hold and a release. That is the six.",
  "positions": [
    { "n": 1, "name": "What's on you", "job": "…", "free": true },
    { "n": 2, "name": "Whose hands it was in before yours", "job": "…", "free": false }
    // … every position. `job` goes straight into the prompt, so these sentences ARE the reading
  ],
  "built_email": {                     // the week that is BUILT — not the contract
    "email_md": "copy/07-marcus/daily/07-D-mon-the-weight.md",
    "art_png": "assets/07-mon-rws.png", "cover_png": "assets/07-cover-the-weight.png",
    "hero_asset": "marcus/07-spread-mon.jpg", "facedown_asset": "marcus/07-down-mon.jpg",
    "face_up": [ { "n": 1, "card": "Ten of Wands", "slug": "ten-of-wands", "reversed": false } ]
  }
},
"the-undertow": {
  "name": "The Undertow", "day": "thu",
  "reusable_as": "pattern",            // ⭐ this is what tier 2 adds
  "block_key": "undertow",             //    …and the key it arrives under in the draw record
  "positions": [ /* … */ ]
}
```

⭐ **The ladder lives in its own object, `tier_model`, and touches no spread — and that paid for
itself the same day.** [`07-C5`](../../copy/07-marcus/07-C5-tiers-by-questions-asked.md) was locked
hours after the registry was built, and switching the whole product from a card ladder to a
question ladder was **one object replaced and two dead fields removed**. All seven spreads, all 55
positions and every `job` string were untouched. ⛔ So `reusable_as` and `block_key` are gone, and
the example below is kept only to show what an expansion block used to look like.

⚠ **`built_email` is the week that is built, not the contract.** Its cards are fixed by the
shipped `.html` and photographed into the art. A new week's cut replaces the `.md`, the
photograph, the cover and this block **together**; the check is what makes sure all four move at
once, which is exactly what failed before (Tue and Sun were shot with cards no email mentions).

Two fields carry the whole tier system:

- **`reusable_as`** marks a spread as an expansion block. No hardcoded `['day','undertow']`
  list in an n8n Code node, which is the worst possible home for a pricing rule — not
  diffable in review, not testable, and changing it means re-pushing the workflow.
- **A spread is never eligible for its own expansion.** That single rule fixes bug B for
  Thursday and Saturday *and* for any future spread that gets promoted to an expansion.

### ⭐ Move the tier arithmetic out of n8n and into the API

Today `4 · Build the brief` decides what a tier contains. It should receive that already
decided, and the Code node collapses to:

```js
const paid = o.draw.positions.filter(p => !p.free);
if (paid.length + o.draw.free_count < 6) throw new Error(`below the floor of 6`);
return paid.map((p, i) => ({ json: { …brief, index: i + 1, total: paid.length, position: p } }));
```

Three reasons, in order of how much they cost if ignored:

1. **The booking page needs the same arithmetic** to print "13 cards" before she pays. If it
   lives in n8n, the number she is sold and the number she is delivered are computed by two
   different pieces of code that can disagree. That is the one failure this offer cannot
   survive — the same argument the plan doc already makes about the *cards* matching.
2. **Deduplication needs spread identity**, which the API has and n8n should not.
3. **Business rules in a Code node are invisible to review.** A price ladder belongs in the
   repo, in a diff, next to a test.

---

## 3 · Adding a new spread, once this is in

Nothing on this list is n8n.

1. **Registry** — add the entry: positions, `job` per position, which are `free`.
2. **Email** — write the daily `.html`; the free cards must match the registry.
3. **Art** — add a CARDS paragraph to `07-art-prompt.md`, `python3 scripts/make-07-day-art.py <day>`.
4. **Wire** — `optimize-07-art.py` → `host-be-asset.cjs` → `wire-07-art.py` → `preview-07-daily.py`.
5. **Check** — `node scripts/check-07-registry.mjs` asserts registry ↔ `07-P1` ↔ email ↔ built
   HTML ↔ art ↔ covers ↔ fixture ↔ ladder ↔ booking page agree on names, counts, cards, which are
   free and every `job` string. ✅ Built. ⛔ Run it after any edit to any of them — one flipped
   `free` flag surfaces as 12 named disagreements across 6 files, which is the drift that
   already happened once and was caught only by a manual read.

**The registry is also the quality surface.** A new spread's report is only as good as its
position `job` strings, because those go verbatim into the prompt. Writing a spread *is*
writing those sentences — the rest is plumbing.

---

## 4 · Order to do it in

| # | | Why | State |
|---|---|---|---|
| 1 | Fix the floor-of-6 check | 4 of 7 days could not take an order | ✅ done |
| 2 | Skip an expansion that is the day's own spread | Thu and Sat were charged twice | ✅ done |
| 3 | **Booking page: drop Thu's Pattern and Sat's Table** | The workflow now refuses them; the page still sells them | 🔴 **next, and it is copy** |
| 4 | Build the registry from `07-P1` | Everything below depends on it | ✅ `scripts/07-spreads.json` |
| 5 | Move tier resolution into the API | The booking page and the PDF stop being able to disagree | ◐ the arithmetic is in `scripts/07-registry.mjs`; the endpoint is still `07-server-spec.md` §4a |
| 6 | Write the agreement check | Stops the drift that already happened once | ✅ `scripts/check-07-registry.mjs` |

⭐ Step 3 is the only one that cannot wait. Step 5 is half done and it is the useful half: the
tier arithmetic now has **one** home, `resolve()` in `scripts/07-registry.mjs`, which the booking
page and the `be_07_draws` seed both call. What is left is a route file importing it — until then
n8n keeps its own copy of the rule, and `test-07-brief.mjs` is what proves the two still agree.

## 5 · How this is checked

**Two scripts, and both exit non-zero on any problem.**

`node scripts/check-07-registry.mjs` — the registry against every file that restates any part of
it. ⛔ Run it after editing `07-spreads.json`, a daily `.md`, `07-art-prompt.md` or
`make-07-spread-covers.py`.

`node scripts/test-07-brief.mjs` — runs the **real** `4 · Build the brief` code, pulled out of the
generated workflow JSON rather than copied, against all seven spreads at all three tiers. It
asserts no position is written twice, that the two refused rungs are exactly Thursday's Pattern
and Saturday's Table, and — ⭐ the one that matters — that **n8n's paid fan-out equals the count
`resolve()` sold**, so the number she is charged for and the number she receives cannot drift
apart. ⛔ Re-run it after any change to `BRIEF_JS`.

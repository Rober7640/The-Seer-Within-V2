# 07 — the 30-day spread test

**What this is.** A plan to build and run thirty daily tarot emails, each finding a different named
thing, in order to learn **which ones earn**. Written 2026-09-05, before any work starts.

---

## The chain

**What we found.** Nobody on Etsy sells a named spread — card structure appears three times in
~130 listings, never as the product. The market buys a **named thing** (*"What Is Blocking Your
Money?"*, *"The Unsent Message"*, *"Who Is Coming Towards You?"*), a **question count**, or a
**speed**. 07 was built the other way round: seven in-house spreads, and a concept forced onto each
afterwards. That is why the letters read as arguments rather than as readings.

**What it means.** The spread has to be designed **backwards from the thing it finds**, and the
thing has to be one she already has a word for. Seven guesses is too few to find the winners.

**What we do.** Retire the seven. Build thirty, each answering a named thing with evidence behind
it. Send them. Keep the ones that earn.

⛔ **And before any of that: make the test countable.** See Phase 0. Today an order does not record
which morning's letter sent it, so thirty sends would produce thirty letters and no answer.

---

## Locked, 2026-09-05

| | |
|---|---|
| **Spreads** | ⛔ Clean sheet. All seven retired — The Weight, Two Doors, Small Instruction, Undertow, Ledger, Other Chair, Zodiac |
| **The product** | Unchanged. 07-C5: $35 / $57 / $87 buys one, two or three of **her** questions on that morning's cut |
| **Topics** | Follow the Etsy ranking, regardless of topic — `voc/08-etsy-ranked.md` |
| **Openings** | Fixed rotation, one shape per weekday, repeating across the thirty |
| **Marcus reads the man** | ⭐ Rule relaxed. What the spread shows about him is said flat, no disclaimer. `07-P1` carries the new wording |
| **Scale** | 30 days, run as a test to find the earners |

**Survives untouched:** the booking page (h2), the C5 ladder, n8n node 4, the report design, the
registry *machinery* and its checks, the whole VOC bank.
**Retired with the spreads:** 7 shipped letters · 4 written 2026-09-05 (in `archive-daily-v2/`) ·
7 spread photographs · the `spreads` data in `scripts/07-spreads.json`.

---

## Phase 0 · Make it countable ⛔ BLOCKER — nothing else ships until this works

*Rationale: `be_orders.spread_key` is written in `07-server-spec.md` §3c and is NOT in
`shared/schema.ts`. The `&s=` slug reaches the booking page and stops there.*

| # | Task | Done when |
|---|---|---|
| 0.1 | Add `spreadKey` (+ the other four intake columns) to `beOrders` in `shared/schema.ts` | Types compile |
| 0.2 | Run the migration `2026-09-03-be-07-daily.sql` | Column exists in Supabase |
| 0.3 | Carry `&s=` from the booking page into the Stripe checkout metadata | Metadata visible on a test session |
| 0.4 | Write it onto the order in the paid webhook | A test order row carries its `spread_key` |
| 0.5 | Readout script: **revenue per 1,000 sends, per spread** — front end + bump + both upsells | Prints a ranked table from real rows |
| 0.6 | End-to-end proof: click a `&s=` link, pay, and see the right key on the order | One real test purchase reconciles |

⛔ **Rank by revenue per 1,000, never by buy-rate.** Buy-rate hides upsell take and ranked the V1
money sub-groups wrong.

---

## Phase 1 · Find thirty named things  *(can run in parallel with Phase 0)*

| # | Task | Done when |
|---|---|---|
| 1.1 | Lift the ranked categories already collected | `voc/08-etsy-ranked.md` — done, ~11 categories |
| 1.2 | Mine the VOC bank for further named things | Candidates with a verbatim line each |
| 1.3 | ⭐ Mine `conversations.concern` — **your own buyers** — for named things with real volume | Candidates ranked by count, not vibes |
| 1.4 | Consolidate to **30**, each with: the thing in her words, evidence, source, est. demand | One ranked table |
| 1.5 | Assign the 30 to days, and the 7 opening shapes to weekdays | The calendar |

⛔ A candidate must pass all three: **she already has a word for it** · a spread can answer it
without guessing at a stranger's future decisions · it survives being asked again next month.

---

## Phase 2 · Design the spreads  *(needs 1.4)*

| # | Task | Done when |
|---|---|---|
| 2.1 | Write the spread-design rules — how a spread is built backwards from a named thing | A one-page spec |
| 2.2 | Design in **batches of ~6, one agent per batch** ⛔ never one agent per spread | 30 designed |
| 2.3 | Per spread: positions, which are free, and the `job` string per position | ⛔ `job` goes verbatim into the prompt — this IS the reading |
| 2.4 | Load into `scripts/07-spreads.json` | Registry regenerated |
| 2.5 | `node scripts/check-07-registry.mjs` and `test-07-brief.mjs` | Both green |

⚠ Batches, not singles. Seven parallel agents drifted on 2026-09-04 — lengths grew, the light day
stopped being light. Nothing held the set together.

---

## Phase 3 · Art  *(needs 2.4 — the long pole)*

| # | Task |
|---|---|
| 3.1 | A CARDS paragraph per spread in `07-art-prompt.md` |
| 3.2 | `make-07-day-art.py` → `optimize-07-art.py` → `host-be-asset.cjs` → `wire-07-art.py` |
| 3.3 | Covers per spread |
| 3.4 | Check registry ↔ email ↔ art agree |

⛔ Only Rider-Waite. Photographs, never flat graphics. A reversed **minor** has no scan and 404s.

---

## Phase 4 · Write, send, measure  ⭐ in waves

| # | Task |
|---|---|
| 4.1 | **Batch 1 — six letters only.** One agent per letter, each with its named thing, its opening shape, and big idea / problem / promise |
| 4.2 | Build HTML (`build-07-daily-v2.py`), refresh previews |
| 4.3 | QA: `copy-check.cjs` · no price · no delivery promise · `&s=` is a full registry key |
| 4.4 | Send batch 1. **Read the numbers at 4–5 sends.** |
| 4.5 | Batches 2–5, written knowing which named things convert |

⛔ **Do not write thirty letters before sending six.** Letters written after real data will be
better than anything written blind, and the six will kill several candidates outright.

---

## Open, and needed before the phase that uses them

| | Needed by |
|---|---|
| 🔴 **Nothing cuts the "open six" each morning.** C5 needs it and the code does not exist | Phase 0 |
| 🔴 The booking link carries no draw date — a forwarded email shows the wrong morning | Phase 0 |
| 🔴 The same-morning open-card allocation edge (07-C5 §2) | before it takes money |
| ⚠ Supabase credential for n8n phases 3b+ — `Authorization` / `Bearer <service_role key>` | Phase 4 |
| ⚠ The reading's voice is unproven — no model call has been made since the rewrite | Phase 4 |
| ⚠ AWeber list 6960130 still sends as EVELYN | ⛔ before the first send |

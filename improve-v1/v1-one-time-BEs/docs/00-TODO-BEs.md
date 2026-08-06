# 00 — TODO

Sequenced next actions. The full inventory is [00c-ASSETS](./00c-ASSETS-BEs.md); this is the
order to do it in.

**Deck:** 02 Twin Flame → 03 Judgement Day → 04 The Turn → 05 Cut the Cord

---

## ✅ Blockers cleared — operator, 2026-08-03

- [x] **Hex go/no-go: GO on both.** 03 ships first, reframed as a closure rite; 05 ships after
      rename + rewrite. ⚠ GO commits us to the third-party intake machinery — intake queue `S29`,
      alarm triage `S30`, 30-day delete `S31` — **live before the first 03 order lands**, not after.
- [x] **05 is named _Cut the Cord_.** Names the object, not the person, which is the compliance
      reframe itself. ESP tag, Stripe product, statement descriptor and asset IDs all inherit it.
- [x] **02's free gift: the 28-day attention ledger.** The source's horoscope instructs the buyer
      to gamble (`02:791`, `799-807`) — the Duval prosecuted pattern. The replacement keeps the
      structure that makes a free gift work (four 7-night cycles · a love window in weeks 1–2 and
      4 · a repeat-if-nothing-happened line) and swaps *play two familiar and two new games* for
      *record one line a night about what you noticed*.
      ⚠ **Name collision accepted deliberately.** 03 uses "ledger" twice already (its big idea,
      and *The Ledger of Signs*). The corpus-wide variance check must not re-raise this as a bug —
      instead differentiate 03's usage: 02's ledger is a record she keeps, 03's is a debt that
      gets closed.
- [x] **Bump deliverables don't exist.** The four concepts are specced ([00e §4a](./00e-FRAMEWORK-BEs.md));
      only the deliverables are missing. Each offer's group D writes its own — and **D ships with
      A**, or the copy is selling something that isn't there.

## ⛔ Still open — neither blocks the 02 pilot

- [ ] **05's hook references "the Commitment Charm"**, an offer we don't sell. The letter's
      premise doesn't land until it's rewritten ([00b §6.4](./00b-BUILD-BEs.md)). ⚠ Now 05's **only
      remaining blocker** — the payments question below is answered.
- [x] ✅ **05's *"she will NOT pursue him anymore"* NEVER SHIPS** (operator, 2026-08-04). 05 is
      written on the reframe only: the cord is the object, the rival appears as an unnamed presence,
      and the governing test for every line is *write it as if she will read it* — buyers forward
      things. This was the one construction that could cost the processor for all four offers.
- [x] ~~**Pre-check the order bump?**~~ (`02-C6`) ✅ **Ships UNCHECKED** (operator, 2026-08-04).
      A pre-selected paid add-on is a negative option under the FTC rule and card-network rules, and
      this deck already runs PWYW and hex-adjacent products that draw processor scrutiny. `02-C3`
      was written as an opt-in, so no copy changed.

## ⚠ Corpus-wide variance findings so far

Logged as found, resolved in the device-variance check at the end of Phase 1.

- **"Nine Nights"** — 03's free gift is *Nine Nights of Water*, 05's sealing practice is
  *The Nine Nights*. Same device, two offers, one buyer. One must change.
- **"ledger"** — 02's free gift vs 03's big idea and *Ledger of Signs*. Accepted above; keep the
  two senses distinct rather than renaming.
- **"four"-part night structures** — 05's *Four Watches* (Dusk · Midnight · Third · Dawn) sits
  close to 02's four 7-night cycles. Watch it; not yet a collision.
- **The precedent beat (beat 8)** — invented precedent is ratified deck-wide (operator,
  2026-08-04), so all four letters carry one. 02's is *a draw that repeated* (Ruth). ⚠ 03's and
  04's must be different **stories**, not the same story renamed — derive each from its own
  mechanism so 03's is not a draw and 04's is not a draw either.

## Phase 1 — write all the copy (~52 assets)

Run **one workflow per offer**, 02 first as the pilot. Five asset groups, pipelined
write → audit → revise, then a voice-consistency pass.

- [x] **02 Twin Flame — group A written, audited and ✅ RATIFIED** *(operator, 2026-08-04)*.
      ESL v1, ESL v2, subject bank, both abandon nudges → [`copy/02/`](../copy/02/README.md).
      **The voice is now the deck standard** — 03 and 04 match `02-E2`/`02-E3`, not the source
      letters' register. Three gate decisions taken, all binding deck-wide: invented precedent
      **keeps** (each offer writes its own distinct one) · the v2 Moon copy/art mismatch is
      **accepted** (do not re-flag) · the P.S. **ships on all eight letters**, no A/B
- [x] **02 Twin Flame — groups B–E written.** Booking page + bump · confirmation + wait-filler +
      thank-you · the twelve + attention ledger + Astro Force · U1a/U1b/U2a → [`copy/02/`](../copy/02/README.md)
- [x] **03 Judgement Day — groups A–E written.** ⚠ **Mechanism rebuilt off Vodou** (operator,
      2026-08-04): no Legba/Kalfu/Samedi, no hex. Three offices survive as **Entry · Transfer ·
      Closing**. [00a §03](./00a-BRIEFS-BEs.md) and [00e §10](./00e-FRAMEWORK-BEs.md) updated to match
- [x] **04 The Turn — groups A–E written**, including the three ladder emails. ⚠ 04 had **no free
      gift** specced (§6c unsatisfied, and the nudge was reaching for the paid bump) — added
      `04-P3` the rim calendar, and `04-C3`/`04-C4` for the Still Cup
- [ ] **05 Cut the Cord** — **not written this pass.** Still blocked on the Commitment Charm hook
      rewrite ([00b §6.4](./00b-BUILD-BEs.md)). ⛔ It must also **rename "Nine Nights"** — 03 now owns
      it (see [00f](./00f-VARIANCE-PASS.md))

**Groups per offer** — A runs first, the rest read its output:

| | Group | Assets |
|---|---|---|
| A | the letter | ESL v1 · ESL v2 · subject lines · abandon nudges |
| B | the page | booking page · bump copy |
| C | follow-through | confirmation + wait-filler · thank-you |
| D | the product | the reading · free gift · bump instructional |
| E | the upsells | U1a · U1b · U2a |

**The copy auditor** reports findings, never rewrites. Three passes, every finding citing a line
*and* a rule: brief fidelity (`00a`) → framework compliance (`00e` §1–7, P1–P9) → copy mechanics
(`direct-response-copy` skill).

**Hard rules go in the script, not an agent** — deterministic and an LLM catches them
inconsistently. ✅ **Built: `scripts/copy-check.cjs`.** Run `node scripts/copy-check.cjs` (all of
`copy/`) or pass a path for one offer. Exits non-zero on any finding.

```
  04's banned vocabulary    open communication · seek guidance · embrace growth
  price + SLA consistency   $35/47/57/67 · $12.77 · 24h vs 3 nights · PWYW anchors 300/250
  AI tells                  delve · leverage · comprehensive
  hedge words               tends to · may indicate · usually · almost never  ← a FAIL
  price in a letter         money first appears at booking statement 6
  delivery promise          a letter may describe CRAFT ("three nights"), never an arrival time
  booking page completeness must state a price (or {{TODAYS_RUNG}}) and an SLA
  DEVICE VARIANCE           any sentence appearing in 2+ offers  ← needs all four in view
```

Word-sense exclusions are deliberate and documented in the script: *tends to her own knowing* is
care not hedge · *don't usually say* is habitual · `+24h` is a send delay not an SLA · a paragraph
opening ⚠ or ⛔ is a note to the builder, not copy. **Every one of these was a false positive the
script produced and had to be taught** — don't loosen them further without checking what regressed.

⚠ **Two checks were retired on 2026-08-03 and must not come back:** the calendar-deadline regex
and the third-party-outcome regex. Both were written as if this were a regulated financial
product. Windows and dates are allowed; predictions are stated flat. The em-dash count is also
gone — it's Evelyn's cadence. See [00a standing constraints](./00a-BRIEFS-BEs.md) for the single
line that still needs an operator decision before **05** ships (a payments question, not a copy
one, and it blocks nothing else).

- [x] **Device-variance pass run across 02/03/04** → [00f-VARIANCE-PASS](./00f-VARIANCE-PASS.md).
      Cross-offer sentence collisions **0**; buyer-facing phrase collisions 105 → 4 (all
      framework-mandated statement stems). ⚠ The abandon nudges had become nearly one email in three
      costumes — four shared lines — which no per-offer audit could have seen.
- [ ] **Re-run the variance pass once 05 exists.** This one covered three offers of four, and 05
      still has to rename "Nine Nights".

## Phase 2 — production (not before Phase 1 is human-approved)

- [ ] Shared plumbing `S1`–`S33` — see [00c](./00c-ASSETS-BEs.md). Start: offer registry,
      booking page component (Treatment B), `be_orders` + webhook, three checkout modes
- [ ] Email HTML + hosted images. **`02-P2` is ~10 min** — 7 of 12 cards already on S3, the
      other 5 are `node docs/aweber/evelyn-tarot-emails/host-card.cjs <slug>`
- [ ] Inbound pipeline: MX on `reply.theseerwithin.com` → Resend catch-all → `be_replies`
- [ ] Intake queue (5 fields, ~3 min/order) + alarm triage — **must exist before the first
      03/05 order lands**
- [ ] Segmentation gate — without it "women-only" isn't real

## Later

- [ ] n8n generator behind `getReadingBody()`, personalised from V1 Supabase data
- [ ] Mirrored 04/05 variants for she-target and unknown-target buyers *(parked; measure the
      split first)*
- [ ] A/B 02's booking page: source's six statements vs the brief-derived version

# Prompt-B Buyer Audit — every purchase in the last 12 hours

**Run:** 2026-07-10 06:19 UTC · **Window:** 2026-07-09 18:19 → 2026-07-10 06:19 UTC (12h)
**Method:** `scripts/pull-buyer-transcripts.ts` (read-only: every query inside `BEGIN TRANSACTION READ ONLY`; startup canary write rejected with SQLSTATE 25006 ✔) + `scripts/analyze-buyer-pull.ts`
**Prompt flip:** experiment `persona_prompt_evelyn_2026` `started_at` = **2026-07-09 09:13:24 UTC** (status `running`, A=0/B=100). All 13 purchases are ≥9h post-flip. Every Evelyn buyer has a `variant=B` exposure row; the one Aiden buyer correctly has none.
**Raw transcripts:** `improve-v2/transcripts/monitor/purchases-12h/` and `…/preflip-baseline-48h/` (gitignored — PII; initials only in this doc)

---

## 1. Headline: B is doing exactly what it was built to do

Identical mechanical stats over the pre-flip 48h buyer cohort (103 paid purchases / 70 buyers, old prompt) vs the last 12h (13 purchases / 10 buyers, prompt B):

| Behavior — buy-to-continue purchases (pre-gap ≤60m or mid-session) | OLD prompt (n=59) | PROMPT B (n=5) |
|---|---|---|
| Full reading (≥100-word assistant turn) delivered **before** the money ran out | **0%** | **80%** |
| Pre-purchase session cut off on an open question | 85% | 40% |
| Ask-only assistant turns (<30 words, ends "?") in those sessions | 25% | 8% |
| Buyer resumed chat ≤15 min after paying | 90% | **100%** |

**The old prompt monetized cliffhangers** (100% of buyers paid without ever receiving a full reading). **B monetizes delivered value** — the reading lands first, and the meter cut still converts at the same speed. Joel's core fear — "if we deliver the reading, will they still pay?" — is answered for tonight's cohort: **yes, 5/5 resumed within 15 minutes.**

Caveats, stated plainly: n=5 buy-to-continue purchases under B is small; windows differ (12h US-evening vs full 48h that included the 7/7-promo expiry); the ≥100-word threshold is a heuristic (spot-reads of all 10 buyers' transcripts confirm it matches reality). Purchase *rate* is not comparable across these windows — do not read revenue conclusions from this table.

## 2. Per-buyer table (13 purchases, 10 buyers — all pulled, all read)

| Buyer | Package | Buy-to-continue? | Reading before cut? | Buyer type | Prompt | Notes |
|---|---|---|---|---|---|---|
| 01-GH | popular $19.99 | Delayed (old-prompt cutoff Jul 7 → bought Jul 9) | Jul 7: NO (old) · post-buy B: yes | Companion (validation) | pre-session old / post B | Also: 7-min promo chat transcript not visible in paid chat — paid re-intake |
| 02-TT | popular $19.99 | Cold return (email), balance 0 | Post-buy: yes | Answer-seeker (rapid oracle) | B | ⚠ "C. read it, love" — invented checkable fact (§4.2) |
| 03-CC | popular $19.99 | Cold return, balance 0 | Post-buy: yes | Mixed | B | Model outcome: "Thank you 🙏 really helpful", left 60 coins unspent |
| 04-CT | premium $49.99 | Cold return (V1 product issue) | n/a — came for support | Support-seeker | B | ⚠⚠ Paid $49.99 to ask about V1 stone/bracelets; Evelyn disowned them; then billing drained her full pack (§4.1, §4.3) |
| 05-SS | popular $19.99 (Aiden) | Cold (email link → paywall) | NO — interrogation only | Curiosity | Aiden (not B) | 7 straight ask-turns, jargon, pack died on a question (§4.6) |
| 06-LL | best_value $29.99 | YES — 0.6m gap, cut at 30 coins | Post-buy: yes, complete | Answer-seeker | B | Ideal arc: bought in 36s, got reading, left 750 coins unspent |
| 07-SN ×3 | premium $49.99 ×3 | YES — mid-session, then 0.8m, 0.6m | YES before 1st buy | Companion (crisis arc) | B | $150/54min; ghost double-billing + close-out drain accelerated packs (§4.1); crisis false-positive handled (§4.7) |
| 08-LL ×2 | popular $19.99 ×2 | #1 cold; #2 YES (cut on question, returned 91m) | #2: yes | Answer-seeker | B | Memory instability: knew "J." at 00:49, lost it by 02:47 (§4.5) |
| 09-KK | premium $49.99 | Delayed 39h (free-trial cliffhanger, old prompt) | Trial: NO (old) · post-buy B: yes | Answer→companion | pre old / post B | Free 3-min cliffhanger converted straight to premium; B held the honest line (§5) |
| 10-HH | popular $19.99 | YES — 0.6m gap | YES — hard verdict landed first | Answer-seeker (marriage crisis) | B | Ended on devastating verdict with no door — pack drained silently (§4.4) |

Revenue: $419.87. Repeat buyers in-window: 2 (07-SN ×3, 08-LL ×2).

## 3. Sharpest verbatim quotes

**B delivering before the meter (the design working):**
> Evelyn, to 06-LL, 90 seconds after her purchase: full reading ending *"…watch for this — within two weeks, he'll either take one concrete step forward, or he'll offer you a clear timeline… Come tell me which one happens, love."* → client: *"Thank you"* — left with 750 coins unspent.

**Buy-to-continue at the emotional peak (mid-session purchase):**
> 07-SN, 23:55: *"When I come back from [Hawaii] is when I plan to tell the kids the truth…"* — **completes a $49.99 checkout at 23:57 between her own messages** — 23:59: *"Both, because I dont know how they will handle it…"* The conversation never paused.

**The old prompt's cliffhanger economics (what B replaced):**
> Old-prompt session, 01-GH, Jul 7 — her pack dies seconds after Evelyn asks: *"What does your gut tell you is holding him back from reaching out?"* 0/59 pre-flip buy-to-continue purchases had received a full reading first.

**The failure B hasn't killed (§4.2):**
> 02-TT: *"did he read it and is he ever going to get out from this darkness"* → Evelyn: *"**C. read it, love.** He's holding your words like something fragile…"* — an invented, checkable fact.
> 01-GH (opened with *"I can't pay more than what I just paid"*): *"Should I delete? He sees they've been deleted"* → Evelyn: *"He's checking — that tells me everything… **You're not imagining this.**"*

**The billing bug from the customer's side (§4.1):**
> 04-CT says *"Thank you"* at 21:28 and leaves — a 699-second session. Charged **1,800 coins** (her entire $49.99 pack, bought 12 minutes earlier). Balance now: 0.

**Cross-system blindness (§4.3):**
> 04-CT: *"I didn't receive the stone that you sent me. I did receive 2 bracelets…"* → Evelyn: *"**I don't send physical items like stones or bracelets. That wasn't from me.**"* — the V1 funnel sells the Protection-Ritual lava stone and Manifestation Bracelet under Evelyn's name.

## 4. Leaks & gaps, ranked by money at risk

### 4.1 🔴 CODE — Billing drain family (the stop-the-bleed item; predates B)
Three signatures, all verified in tonight's rows and present in the baseline (18 overbilled sessions / +8,905 coins in the pre-flip 48h; 7 baseline buyers made 3–4 purchases in 48h — the pattern is old):
- **Close-out drain — `coins_charged` ≫ `duration_seconds`, drains to exactly 0:** `1cad17ac` (250s → 1,530 coins), `07a6cdc1` (699s → 1,800), `86f0f400` (364s → 540). The charge runs on after the user leaves and stops at balance zero.
- **Parallel ghost session:** `ceba3de6` "ended" 2s after start yet billed 480 coins in lockstep with `af7170db` (also 480) — both died at 00:13:55, exactly 480s later: **two billing streams on one conversation**, halving 07-SN's pack. Content-proven: the ghost holds byte-identical copies of the live session's messages.
- **Idle-tail billing:** 14 sessions tonight (44 in baseline) billed ≥2 min past the last message (e.g. `edcbc432`: last message 5 min in, billed the full 9).
Consequence tonight: 07-SN paid $150 in 54 min and 04-CT's $49.99 lasted 12 minutes — **exactly the marihayes dispute shape** (refunded, not contested). These are next week's chargebacks. Also: rapid session re-creation writes **duplicate message rows** into new sessions (9 zombie sessions for 07-SN alone) — corrupts data and probably seeds the ghost-billing race.

### 4.2 🔴 PROMPT — TRUE-READ buckles under direct reunion-hope questions
Mechanics hold (give-then-ask ✓, threads ✓) but the honesty rules crack when the client asks a direct question about an absent person's *actions or inner state*: "did he read it" → *"C. read it"*; "he sees they've been deleted" → *"He's checking."* Counter-proof that B *can* hold: 09-KK got *"silence IS her answer"* on a closed door. **Prompt delta:** add a hard micro-rule to THE FEELING LAYER: *an absent person's concrete actions (read / saw / checked / knows / said) are unknowable — never affirm one as fact; read the client's side of the wire instead.* This is the same family the eval's contradiction-bait case probes; add these two live cases to `improve-v2/eval/cases.json`.

### 4.3 🟠 PRODUCT+PROMPT — V2 is blind to V1 purchases (Joel's call point, confirmed live)
04-CT paid premium to ask about physical products sold under Evelyn's name; Evelyn denied selling them. The LETTERS rule prevents disowning emails — nothing covers V1 orders (main reading, Protection Ritual/stone, bracelet, energy-clearing PDF). **Fix (two parts):** (a) inject a one-line V1 purchase summary into `[RUNTIME_CONTEXT]` (orders exist keyed by email in `conversations`/Stripe); (b) prompt rule mirroring LETTERS: never disown the shop's offerings; fulfillment issues route warmly to support.

### 4.4 🟠 RUNTIME+PROMPT — hard-zero cutoff has no wind-down
The ≤2-min WIND-DOWN never fired for buyers whose balance (not the clock) ran out: 10-HH's last screen is *"…the woman he's already chosen"* — no door, no thread, balance 0; 09-KK's pack died mid-question. If `[RUNTIME_CONTEXT]` minutes reflect pack size rather than live balance, B can't see the cliff. **Fix:** feed remaining-balance minutes into RIGHT NOW every turn (or inject a low-balance system beat), so the invariant "never end on your own question" can actually fire before hard zero.

### 4.5 🟡 SYSTEM — memory instability
08-LL: Evelyn used "J." correctly at 00:49, then at 02:47 apologized for *"carrying a detail from an old note that doesn't belong to your story"* and re-asked his name. 04-CT: greeted with a romance-memory she disputed (*"There is no man. I have not dated in months"*). Recovery language was graceful (per prompt), but wrong recall burns trust and minutes.

### 4.6 🟡 ROLLOUT — Aiden still runs the pattern B was built to kill
05-SS paid $19.99 to follow an email link, landed in unexplained numerology (*"I didn't ask any question. just followed your link. what is this message about"*), then got 7 consecutive ask-turns and zero delivered reading before her pack died on a question. This is the strongest argument for Joel's plan to port B's GIVE-THEN-ASK / READ-THE-TURN scaffolding to the other personas.

### 4.7 🟢 Observations (no action urgency)
- Crisis-safety false positive: 07-SN's worry about a third party triggered the 988 script aimed at *her*; she corrected, Evelyn recovered well and re-grounded. Acceptable failure mode — safe direction.
- Consecutive-question cadence: 09-KK saw 10+ turns in a row ending on a question ("lean statement after a question" rule not holding under rapid client volleys). Minor; each turn still led with a give.
- Cross-surface transcript loss: 01-GH's 7-min promo chat isn't visible from paid chat — she spent paid minutes re-telling her story (*"Can you see it on free 7 minutes chat"* → "I can't see what you typed in that other chat").
- 46% of tonight's purchases were cold returns (no session in 48h) — the daily letters are pulling buyers in at balance-zero; they must buy before they can speak. Worth watching as its own funnel.

## 5. Direct answer to the two baseline questions

1. **Is B delivering readings before the meter cuts?** Yes — 80% of buy-to-continue purchases (vs 0% pre-flip), confirmed by reading all 10 buyers' transcripts, including hard-truth verdicts (10-HH) and honest closed-door reads (09-KK), not just comfortable ones.
2. **Does buy-to-continue still convert when the reading is delivered?** Yes — 5/5 resumed within 15 min; 07-SN bought mid-sentence, 06-LL in 36 seconds, 08-LL came back 91 minutes later to answer the question she was cut on. What's *left* of the old cliffhanger mechanic is now supplied by the meter (real scarcity), not by withheld readings — which is the trust-safe version of the same economics. The revenue risk has moved: it's no longer "no reading before payment," it's **billing bugs eating paid packs** (§4.1) turning tonight's best customers into next week's disputes.

## 6. Repro

```bash
npx tsx scripts/pull-buyer-transcripts.ts --hours 12                      # or --from/--to ISO
npx tsx scripts/pull-buyer-transcripts.ts --from 2026-07-07T09:13:00Z --to 2026-07-09T09:13:00Z \
  --out improve-v2/transcripts/monitor/preflip-baseline-48h
npx tsx scripts/analyze-buyer-pull.ts improve-v2/transcripts/monitor/purchases-12h "label"
```
Safety contract: refuses localhost DBs, refuses output outside `improve-v2/transcripts/`, canary write must be rejected (25006) or the run aborts. Rubric: `improve-v2/eval/EVAL.md`.

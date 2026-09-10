> # ⛔ SUPERSEDED BY THE OPERATOR — 2026-09-04
>
> This document recommended keeping the no-upsell rule shut. **The operator has overruled it:
> two upsells are required**, to maximise return per buyer. `README.md` now carries that as a
> rule and `07-C1` has been corrected so the page no longer promises "nothing after it".
>
> ⭐ **Keep reading anyway.** The recommendation is dead; the CONSTRAINTS are not. Every proposal
> below still died on a real fact, and a new proposal that repeats one dies the same way:
> depth and speed are already sold, the method is already free in all seven dailies, spec §7
> bans packs and volume discounts, and `expiresIn: 604800` kills anything delivered later than
> seven days. Use this as the list of walls, not as the answer.

> ⚠ **Read this caveat before the argument.** Two of the three "kills" below cite
> [`07-C1-the-booking-page.md`](../../copy/07-marcus/07-C1-the-booking-page.md) — a draft written
> by an agent on 2026-09-03 that has **never shipped**. So *"she has already agreed there is
> nothing after it"* is a **draft decision, not a fact about a live product**; it can be changed
> by editing that draft. Only **kill 3 — the space is empty** rests on shipped reality, and it is
> the one independently verified: all seven dailies do explain their own card count and do print
> their paid position names. Weigh the three accordingly.
>
> *Produced by a 12-agent workflow: 5 research streams, 3 proposals from different stances,
> 3 adversarial critics, 1 synthesis. Every proposal came back fatally flawed.*

---

# 07 — should the daily tarot offer have upsells?

**Decision requested:** reopen `copy/07-marcus/README.md:118` — *"No upsells. No chat handoff. `/marcus` is not linked from the daily or the report."*

---

## The answer: no. Keep it shut.

Not "not yet on the technicality that 07 isn't built" — though it isn't. **No**, because the slot is already promised away in her own words, and because the space of things that could go in it is empty once you subtract what 07 already sells and what the daily already gives away free.

Three proposals were written and each was adversarially challenged. All three came back **fatally flawed**. I checked the killing citations myself in the repo. Every one holds. There is no version of a 07 upsell to graft together from the survivors, because the parts that survived are not upsells — they are free fixes to the product.

### The three kills, in order of finality

| # | The kill | Where it is written |
|---|---|---|
| **1** | **She ticks a box saying there is nothing after it.** The sixth agreement, in her first person, before Stripe: *"**Yes** — I'm paying {{TIER_PRICE}} for this, once, and there's nothing after it."* Restated as fact under the button: *"One payment. Nothing after it."* A U1 screen seconds later makes the buyer a liar in a sentence she personally checked. | `copy/07-marcus/07-C1-the-booking-page.md:230, :254` |
| **2** | **The ban is settled twice, on two different rationales.** README:118 protects the daily. `07-C1`'s "What is deliberately not on this page" settles it again against the *receipt*: *"**Upsells after the button** \| Settled. The thank-you page takes the optional context and stops."* The claim that line 118 "bundles three decisions" — the load-bearing move in all three proposals — is true but irrelevant. Unbundling it does not unbundle the second record. | `07-C1:437` |
| **3** | **There is no product left to sell.** See the table below. | — |

### Kill 3 in full — the space is empty

The market sells exactly four things after a written reading. 07 has spent, banned, or given away all four.

| Axis | Status on 07 |
|---|---|
| **Depth** — more cards, a different question | **Spent.** That is the $35 / $57 / $87 ladder, and each rung already answers a different question |
| **Speed** — sooner | **Spent.** That is the +$12.77 same-day bump |
| **A different object** — follow-up question, extra question, voice note, "double check" | **Banned twice.** Rule 2 (no personal details) forbids all of them, since every one needs her question. And `07-C1` Open thread 2 already ruled on them: *"every one of them is more reading, which is tier 2's job again with extra steps"* |
| **Repeat entitlement** — a pack, a seat, banked readings | **Banned by spec §7:** *"No pack, no cap, no discount for volume."* The spec's recurrence mechanism is already chosen and is not a subscription: *"A returning buyer types only her new question and pays"* |

That leaves one shape: a **non-reading artefact** — the method, the layouts, what the 55 positions ask. Two of the three proposals built their U1 on exactly that. **It is already free, every morning, to all 76,718 people.**

I verified this rather than assumed it:

- **All seven dailies explain their own layout reason**, as a named beat. Mon *"Six isn't a number I picked"* · Tue *"Eight isn't a number I picked" / "A door is three things"* · Wed *"Why a pointing card gets six and not one"* · Thu *"Why an undertow gets seven"* · Fri *"Nine isn't a number I picked"* · Sat *"Seven isn't a number I picked"* · Sun *"Back to the twelfth house, and why it sits where it does"*.
- **All seven dailies print their paid position names** in the beat-10 withhold block — *"Whose hands it was in · What it was for · What it costs you now… These 5 are still in my hand"*.
- **The booking page prints them again**, before payment: *"The face-down labels are the paid position names from `07-P1`, verbatim, in order."*

So a $27 "method notes" product resells free public copy, and its pitch — *"so she can lay them at her own table"* — teaches her to do the one thing that could produce fewer $35 orders. That is `00j` Step 2's explicit trap: **never let the upsell sell against the product.**

---

## The critics, answered one by one

Item 4 of the brief: no "fatally flawed" verdict may be ignored. None is. Each is confirmed against the files, with the one place each critic overreached noted, because the operator should not inherit a wrong fact either.

| Proposal | Verdict | Confirmed by me | Where the critic overreached |
|---|---|---|---|
| **A** — The Whole Method $27 + The Second Cut $27 | Fatal, **upheld** | The method content is free (7/7 dailies, verified). The Second Cut is arithmetically impossible: one draw row per `(spread_key, draw_date)`, and 30 days after a Tuesday is a Thursday — there is no Two Doors cut that morning. Either escape breaks something: waiting for the next Tuesday makes the "second cut" the shared draw that goes free to 76k; cutting privately breaks Marcus's stated method and the shared-draw promise | It said a lifetime-once flag needs a new schema column. It does not — `be_orders` already has `email` and `idx_be_orders_email` (`shared/schema.ts:1620`). Minor, and it does not save the proposal |
| **B** — The Working Notes $27 + The Envelope $17 | Fatal, **upheld** | The flow is wrong about 07: the question is taken *before* payment (`07-C1` beat 5, Open thread 1), and the post-payment page **is** the receipt (beat 16). So the proposal's own safety rule — *"never between paying and the intake"* — is unsatisfiable here. The Envelope is the bump's axis reversed: $12.77 to arrive sooner, then $17 to arrive later, on one order, minutes apart. And it is already broken: `07-fulfilment.n8n.json` node 12a signs the reading URL with `expiresIn: 604800` — 7 days. Every 30/60/90-day envelope ships a dead link | The disclosure argument is slightly overstated — a method manual is not *sold as* a reading. But the disclosure point stands anyway: the human half of 07 is the photographed cut, and a product with no draw in it has no human half to shelter under |
| **C** — The Standing Cut $27/mo + Marcus's Notes $19 | Fatal, **upheld** | Head-on collision with spec §7 (*"No pack, no cap, no discount for volume"*) and with README:117 (*"nothing may make $35 sound partial"*) — a $27 standing price shown sixty seconds after she paid $35 makes $35 the sucker price. A $27 credit spendable against $57/$87 turns published tiers into a negotiation. The proposal spotted the §7 contradiction and handed it to the operator instead of solving it, which is the tell | It said the market has no $10–$21/month memberships. It does — Tarotdoxa $10/$14/$17, Turtle $17–21, Artisan $15, Typewriter $14. The membership *shape* is real in the market. It is banned in *this* offer, which is what matters |

**Its own author named the fatal risk correctly**, and it is the one that would not have shown up in a conversion test: a monthly charge sold sixty seconds after a first purchase, to a **dormant** list (two sends ever, ~87 days ago, ~41k never mailed), on a Stripe account offers 02–06 share and a sending domain Evelyn's live thirteen-list programme shares. Month-two "what is this charge" disputes cost the Evelyn programme its deliverability. That is a bet-the-list risk behind a $27 product.

---

## The one real finding in all three, and where it actually goes

Every proposal found the same true gap, and it is worth keeping:

> **No tier can say whether anything MOVED.** There is one draw row per `(spread_key, draw_date)`, never updated after its email sends. The $35 asks *what is this*, $57 asks *why does it keep happening*, $87 asks *what is he doing*. Nothing asks *has it changed* — which is the only question a second-time buyer has.

It is not sellable, for the reason above. **It is free, and it belongs in the daily.** On a morning a spread comes round again, Marcus can note that a card is back, or that this cut says something different from the last time this spread ran. That costs nothing, breaks no promise, needs no charge, no screen, no month-long commitment — and it makes **the daily itself** the thing that recurs, which is what rule 6 exists to protect.

Same treatment for the second finding: 07 hands her **nothing to hold and nothing to do** when the PDF lands. `07-C1` Open thread 2 already ruled on that, and ruled the right way:

> *"The spread photograph of her own draw is the one genuinely missing artefact, and it belongs inside the product at every tier, **not sold back to her**."*

---

## What would have to be true to reopen this — and the cheapest test

Reopening is a **later** decision on a **different** number, not a rewrite of this one. Four conditions, and all four must hold.

| # | Must be true | Why |
|---|---|---|
| 1 | Statement six and the line under the button are **deleted first**, as their own named operator decision | You cannot sell after "nothing after it". This is a change to the booking page's honesty, not a side effect of an upsell |
| 2 | 07 has taken real money for **14 days**, with a refund, complaint and **repeat-purchase** baseline | The known failure mode is a bad reading reaching a payer, and the grader was silently passing everything until 3 Sept. An upsell raises what gets refunded when that happens |
| 3 | Repeat-purchase rate comes back **LOW** | If it is HIGH, an upsell trades a compounding asset for a one-off — do not build. Only a low repeat rate says the LTV thesis is wrong for this list and revenue must come from the order |
| 4 | The candidate is not depth, not speed, needs no personal detail, has a **human act** behind it, adds **no second fulfilment path**, and still reads as Marcus on her fortieth viewing | Anything failing one of these is a pricing change to `07-C2`, not an upsell |

**Cheapest test — costs nothing and needs no build.** The spec already commits to the one-click repeat (§7: *a returning buyer types only her new question and pays*). Ship it, then measure repeat-purchase rate over the 14-day factorial. That single number decides condition 3, and it is the number that tells you whether an upsell is a gain or a tax. **Do not test an upsell by building one** — a screen between her money and her receipt is not reversible on a daily programme once she has seen it.

---

## What I need from you to proceed

Nothing on upsells. Five decisions that actually unblock the offer, in order:

| # | Decision | Why it is blocking |
|---|---|---|
| 1 | **Thursday and Saturday**: drop the missing rung, or write a third reusable expansion | Thursday *is* The Undertow so it has no $57; Saturday *is* The Other Chair so it has no $87. The workflow refuses both. The page still prints three tiers on all seven days, so **it cannot take money as written** (`07-C2`, red) |
| 2 | **Where the question box sits** — Open thread 1, awaiting you. Recommendation on file: it stays before payment | Fulfilment `409`s without it. Until this is called, every order fails (`07-server-spec` step 6, red) |
| 3 | Confirm the tiered pricing model + Thu/Sat refusals move into `priceBackendOffer`, so they refuse **before** Stripe | `$57`/`$87` cannot currently be expressed (`07-server-spec` step 7, red) |
| 4 | Green-light the two unbuilt conversion devices the market scan rated highest: **the photograph of her own draw** (free, inside every tier) and the **fictional-client sample reading** — `dryrun-tue-spread.md` is already the whole text | *"We have none"* and *"the best single conversion device found anywhere"* (`market-research.md`). Both raise revenue on the four SKUs that already exist, with no new product and no new disclosure exposure |
| 5 | Ratify: **README:118 stays shut**, and add a one-line note pointing at `07-C1:230` so nobody re-proposes this without seeing the ticked promise first | This is the third time the question has been asked. Record the reason, not just the answer |

**One correction to make while you are in the file:** README:115–117 still records the bump as an expansion. `07-C2` changed it to speed on your call. The "Settled" list has drifted once already — which is exactly why it is worth writing down *why* line 118 is settled, not only that it is.

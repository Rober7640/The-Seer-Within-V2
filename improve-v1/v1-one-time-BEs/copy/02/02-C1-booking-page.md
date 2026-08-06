# 02-C1 — Booking page *(Twin Flame Tarot)*

| | |
|---|---|
| **Offer** | 02 Twin Flame Tarot — READING · $35 fixed + $12.77 bump · 24h SLA |
| **Arrives from** | all seven CTAs in `02-E2`/`02-E3` + the three nudge CTAs. One destination, `c=` tells us which |
| **Treatment** | **B — plain direct-response** (`S2`, decided). Config-driven component, one page not four |
| **Voice** | ⚠ **the BUYER's, first person, throughout.** Evelyn is named in the third person and never speaks on this page |
| **Brief** | [00a §02](../../docs/00a-BRIEFS-BEs.md) · **Component** [00e §3](../../docs/00e-FRAMEWORK-BEs.md) |
| **Free gift** | the 28-night attention ledger (`02-P3`) — **never the source's horoscope** |
| **Bump** | `02-C3`, rendered between statement 8 and the button |

**This is the first time money is mentioned anywhere in the funnel.** Five agreements happen
before statement 6, and by then agreeing is a habit. Do not move the price up.

---

## Header

**The Twin Flame Tarot Reading — your booking**

*By booking this reading you agree to the following:*

---

## The six statements

<!-- STATEMENT 1 · affirm the READER was right — P8. The cheapest rung: she already believes it -->

**Yes — you were right, Evelyn.**

You read it correctly, and I want to see the rest of what you saw.

<!-- STATEMENT 2 · grant permission — the BIG IDEA, in her voice -->

**Yes — I give Evelyn Cross permission to draw my destiny.**

The full twelve, one to each house, on the strength of the three that came away in her hand. My
future is already drawn. I would rather see it than be surprised by it.

<!-- STATEMENT 3 · accept its weight -->

**Yes — I understand this is done by a professional, and that its instructions are not to be taken
lightly.**

If the spread asks something of me, I am asking for it because I intend to act on it.

<!-- STATEMENT 4 · accept scarcity. Derived from the MECHANISM, not from a calendar or a counter -->

**Yes — I understand Evelyn does not lay a twelve on request.**

She lays it when a first draw asks for one, and mine asked. I understand a draw that comes away on
its own may not come to me twice.

<!-- STATEMENT 5 · accept the effort + the SLA. 24h — decided, overrides the source's 16h/8h -->

**Yes — I understand this is the heaviest reading she does.**

It takes the whole of a night and it cannot be hurried. My reading will take a minimum of
**24 hours** to reach me.

<!-- STATEMENT 6 · accept the price. Fixed, so no P2 collapse — but the reason-why still earns its place -->

**Yes — I agree to pay a modest one-time sum of $35.00 for this.**

I understand it is priced the way it is because it is twelve trumps drawn out of the twenty-two,
laid one to a house, and because she keeps the whole of a night for it.

---

## The request

<!-- STATEMENT 7 · still her voice. Ends on the brief's PROMISE, in her words -->

Evelyn — you are now in possession of my complete spread.

I therefore ask you to **lay my twelve** and produce my complete reading. Tell me plainly what my
Tower is standing on: its name, its face, and how close it is. Tell me which of the two the Lovers
handed me, and which door the windfalls come through.

Give me the day, the door, and who is standing at it —

so that I stop finding out last.

<!-- STATEMENT 8 · the free gift, RECEIVED and thanked for BEFORE it arrives — P9 -->

And I understand that you will also send me, free of charge, **the twenty-eight-night attention
ledger** — four turns of seven, one line a night about what I noticed, and a read-back on the
fifteenth night — so that when the first sign shows itself inside five to seven days, I am the sort
of woman who catches it instead of the sort who reconstructs it afterwards.

Thank you, Evelyn, for this. I'll keep it properly.

---

`[02-C3 — the order bump renders here]`

---

## The button

> ### LAY MY TWELVE

<!-- P3 · the button completes statement 7's own sentence. Permission verb AND the payoff -->

**Under the button, small:** *One payment. Nothing recurring. Your reading reaches you within
24 hours.*

---

## Build notes

- **Everything is first person and it never breaks.** She is not reading a sales page; she is
  signing a statement she appears to have authored. That is the whole commitment device, and one
  sentence of Evelyn talking would collapse it. The bump keeps the same voice for the same reason.
- **The page never says "buy."** Booking · permission · request · draw · lay · produce.
- **Statement 1 is about the reader, not about the buyer** (P8). *"You were right"* opens a small
  relationship debt and costs her nothing, which is exactly why it works as the cheapest rung. The
  derived-from-the-brief alternative — *"the three cards have not left my mind"* — is self-report,
  and it tested weaker.
- **Statement 4's scarcity is the mechanism's, not a counter.** Evelyn rations the twelve by what
  the first draw asked for, so there is no capacity cap to build and **no `S8` dependency** — unlike
  03 and 05, whose scarcity lines are promises only code can keep (P4).
- **The free gift is the ledger, not the horoscope.** The source's horoscope instructs the buyer to
  gamble (`02:791`, `799-807`) — the Duval prosecuted pattern. Statement 8 must describe the ledger
  concretely, because `02-P3` is written to this description and the +24h nudge already promised
  the buyer this exact shape. **Change one, change all three.**
- **The window is the letter's window.** *Five to seven days* appears here as it does in the deck
  line and the stakes preview, so the ledger has something to be a ledger *of*.
- **Statement 7 asks for all three withholds by name** — the Tower's identity, the Lovers' fork,
  the World's door. Each one is a loop the letter deliberately left open, so the request reads as
  hers rather than as a form. It also makes the product's obligations explicit: `02-P1` must close
  all three or the buyer can point at this page.
- ⚠ **No intake instruction on this page.** P1 applies to ACT offers, which cannot be fulfilled
  without a reply. 02 is a READING — it needs nothing from her but the say-so, and adding a reply
  step would cost conversions for a product that doesn't use it.
- ⚠ **The price is hard-coded here because 02 is fixed-price.** 04's equivalent statement carries a
  merge field instead (§3a) — do not copy this statement into the ladder offer.

---
---

# 02-C1b — Booking CHAT *(the same booking, as a conversation)*

*(operator decision, 2026-08-05. **The page above is not superseded and must not be deleted** — it
stays as the fallback and as the A/B challenger if this loses.)*

| | |
|---|---|
| **What changed** | The funnel is now **one medium after the email**: letter → booking chat → U1 chat → U2 chat. No booking *page* is built |
| **Why** | The register break used to land four seconds after the charge, in the remorse window. It now lands at the click, before money moves |
| **Engine** | the same chat engine that drives `02-U1a`/`02-U2a` — booking becomes its first configured flow, so `S2` (booking page component) is **dropped** and `S20` absorbs it |
| **After payment** | **V1's own pages, reused.** `/welcome1` → `/welcome2` → **`02-T1` as a PAGE.** No allocator, no ownership check, no persisted conversation across Stripe |
| **Unchanged** | five agreements before any mention of money · the free gift is the ledger · the bump renders adjacent to the total · 24h SLA · $35 fixed |

---

## The flow this sits inside

```
   ┌──────────────────────────────────────────────────────────────┐
   │  0   TRIGGER — V1 frontend buyer, ~2h wait                    │
   └────────────────────────────┬─────────────────────────────────┘
                                ▼
 ╔════════════════════════════════════════════════════════════════╗
 ║  1   THE LETTER          EMAIL · PROSE                         ║
 ║      ══ THE ONLY PLACE ANYTHING IS SOLD ══                     ║
 ║      whole ESL in the body · 7 CTAs → one URL · ?c=1..7         ║
 ╚════════════════════════════════╤═══════════════════════════════╝
                                  │ click · first_name offer variant sub_id
                                  ▼
 ╔════════════════════════════════════════════════════════════════╗
 ║  2   BOOKING CHAT        CHAT · CLOSE ONLY        ← THIS FILE  ║
 ║      ⛔ asks nothing   ⛔ re-argues nothing                      ║
 ║      ① ② ③ ④ ⑤ ⑥ tapped in her words · ⑥ = first money        ║
 ║      ⑦ the request   ⑧ the gift, thanked for                   ║
 ║      ┌──────────────────────────────┐                          ║
 ║      │ CHECKOUT CARD — not a bubble │ bump +$12.77             ║
 ║      │ total $35.00 · LAY MY TWELVE │ total · button           ║
 ║      └──────────────────────────────┘                          ║
 ╚════════════════════════════════╤═══════════════════════════════╝
                                  ▼
 ┌────────────────────────────────────────────────────────────────┐
 │  3   STRIPE (hosted) — the one break in format, and fine       │
 └──────────┬────────────────────────────────────┬────────────────┘
      success_url                           cancel_url
      ?session_id={CHECKOUT_SESSION_ID}          ▼
            │                         /tarot/twin-flame?recover=1
            ▼
 ╔════════════════════════════════════════════════════════════════╗
 ║  4   /tarot/twin-flame/welcome1     CHAT     ← V1 REUSED       ║
 ║      UpsellPage.tsx · useUpsellChat.ts, unchanged              ║
 ║      new opening beats only — 02-U1a, 02-U1b                   ║
 ╚════════════════════════════════╤═══════════════════════════════╝
                                  ▼
 ╔════════════════════════════════════════════════════════════════╗
 ║  5   /tarot/twin-flame/welcome2     CHAT     ← V1 REUSED       ║
 ║      Upsell2Page.tsx · useUpsell2Chat.ts, unchanged            ║
 ║      new path opens only — 02-U2a                              ║
 ╚════════════════════════════════╤═══════════════════════════════╝
                                  ▼
 ╔════════════════════════════════════════════════════════════════╗
 ║  6   THANK-YOU PAGE       PAGE · NOT CHAT   ← 02-T1 AS WRITTEN ║
 ║      a receipt. sells nothing. names the delivery subject.     ║
 ║      + conditional Astro Force block if the bump was taken     ║
 ╚════════════════════════════════╤═══════════════════════════════╝
                                  ▼
                 ══ email ══  02-T3 confirmation
                              → 24h → 02-P1, the twelve
```

**After payment, no branching.** *(operator decision, 2026-08-05)*

```
   paid ──► U1  $47 lava stone      shown to EVERYONE
             ├─ accept ──► shipping form ──┐
             └─ decline ─► SOFT_DECLINE ───┤
                                           ▼
            U2  $47 → $30 bracelet    shown to EVERYONE
             ├─ accept ──┐
             └─ decline ─┴──► THANK-YOU PAGE (02-T1)
```

**The allocator (`S21`) is dropped and the objects are not re-minted.** Both were rejected for the
same reason `00b` §4 gives: a themed protect-object and attract-object per offer is eight physical
SKUs, *"a bigger operation than the entire backend deck."* The same stone and the same bracelet are
sold to everyone, including buyers who already own one from V1's own `/welcome1`.

⚠ **The known cost, accepted:** 02's buyers are V1 customers, V1's U1/U2 take rate runs 20–30%, and
02 buyers are self-selected repeat purchasers — so the share arriving at `/welcome1` already owning
a lava stone is likely *higher* than that base rate. Those buyers are pitched an object they own.
The realistic failure is not a double order; it is Evelyn appearing not to remember, which is the
one thing this deck's device-variance rule exists to prevent. **Parked, not solved** — see the tail.

**What this deletes from the build:** no conversation persisted across the Stripe round-trip.
`UpsellPage.tsx:41` reads `session_id` from the URL and loads the buyer from it — it never touched
localStorage or chat history, so V1's pages need nothing from the booking chat but a Stripe session.
`/welcome1` and `/welcome2` are already mounted under six funnel prefixes in `App.tsx`; the backend
deck is one more route line, not a component.

⚠ **U1's opening is OURS, not V1's.** V1's first message names *"your Energy Clearing Ritual"* — a
product the tarot buyer never bought. The engine and the ~48 downstream messages reuse verbatim;
`02-U1a`, `02-U1b` and `02-U2a` replace the openings and nothing else.

---

## ⛔ Nothing in this chat re-argues the offer

The letter sells. The chat closes. They are different jobs and the second one is not a smaller
version of the first.

She has read three thousand words and clicked. **A sold buyer who is sold to again can talk herself
back out of it** — so every beat here removes a reason to stop and never adds a reason to buy. If a
line's job is persuasion, it belonged in the letter and it is too late for it now.

This is also why nothing is asked. A question is a *selling* move: you ask to find out what someone
wants, or to warm them. She is past both. Asking now says *I'm not sure you're ready yet*, which is
the opposite of what a close should say. The deck-wide form of the rule:

> **Ask nothing before the money. Ask everything after it.**

⚠ Evelyn's register follows from this: **she acts as though the sale is already made.** Taking down
a booking, briskly, with a night's work ahead of her. Not persuading, not grateful. A woman who
isn't trying to convince you reads as a woman in demand — which is what the letter already claimed
when it said she doesn't lay a twelve on request. The chat should *behave* as if that is true rather
than assert it a second time. Any acknowledgement that sounds relieved is a line that needs cutting.

---

## ⛔ The rule that replaces "Evelyn never speaks"

The page's voice rule was *Evelyn is named in the third person and never speaks*. That rule cannot
survive a chat, and its **purpose** must:

> **Evelyn frames and acknowledges. The buyer asserts. No statement is ever spoken by Evelyn.**

Every `Yes —` belongs to the buyer and renders as *her* message. The moment Evelyn asks *"do you
agree this is done by a professional?"* and the buyer taps *yes*, the commitment device is gone —
that is a salesperson collecting a nod, not a woman signing her own words. A tapped utterance is
heavier than a ticked box; a nod is lighter than both.

## ⛔ Third person → second person, throughout

The page is a document *about* Evelyn, so it says *"I give Evelyn Cross permission"* and *"the three
that came away in her hand."* The chat is addressed *to* her, so every one of those becomes **you /
your**. Statement 7 already reads this way on the page — the rest are converted to match it.

---

## `BOOKING_OPEN` — Evelyn, 3 messages

> You came.

> Then let me take this down properly, dear. The way I take down a booking for a twelve.

> A few things I need said back to me first. In your own words — a spread this heavy gets laid on
> the strength of what was agreed to.

<!-- ⛔ Nothing is asked here. Not a warm-up question, not a card-preference tap, nothing. See the
     rule above: she is already sold, and a question at this point reads as doubt about that.
     Evelyn is opening a booking, not opening a conversation. -->

---

## `STATEMENT_1` — affirm the READER was right *(P8 — the cheapest rung)*

**Evelyn**

> Start with the plainest one. The three cards that came away — was I right about them?

**Buyer** — button: *"Yes — you were right."*

> **Yes — you were right, Evelyn.** You read it correctly, and I want to see the rest of what
> you saw.

**Evelyn**

> I thought so, dear.

---

## `STATEMENT_2` — permission *(the BIG IDEA)*

**Evelyn**

> Now the one that matters. I can't lay a twelve for a woman who hasn't asked me to.

**Buyer** — button: *"Yes — draw my destiny."*

> **Yes — I give you permission to draw my destiny.** The full twelve, one to each house, on the
> strength of the three that came away in your hand. My future is already drawn. I would rather see
> it than be surprised by it.

**Evelyn**

> Thank you. That's the one I needed.

---

## `STATEMENT_3` — accept its weight

**Evelyn**

> Two more about what you're taking on. This isn't a parlour trick, and the spread will ask things
> of you.

**Buyer** — button: *"I intend to act on it."*

> **Yes — I understand this is done by a professional, and that its instructions are not to be taken
> lightly.** If the spread asks something of me, I am asking for it because I intend to act on it.

**Evelyn**

> Good.

---

## `STATEMENT_4` — scarcity, from the MECHANISM

**Evelyn**

> And you should know I don't lay a twelve because somebody asked nicely.

**Buyer** — button: *"I understand mine asked."*

> **Yes — I understand you do not lay a twelve on request.** You lay it when a first draw asks for
> one, and mine asked. I understand a draw that comes away on its own may not come to me twice.

**Evelyn**

> It did.

---

## `STATEMENT_5` — the effort + the SLA

**Evelyn**

> One about time, so you're not sitting there refreshing.

**Buyer** — button: *"I'll wait the night."*

> **Yes — I understand this is the heaviest reading you do.** It takes the whole of a night and it
> cannot be hurried. My reading will take a minimum of **24 hours** to reach me.

**Evelyn**

> Inside twenty-four hours, and not a moment before it's finished.

---

## `STATEMENT_6` — the price ⚠ FIRST MENTION OF MONEY IN THE ENTIRE FUNNEL

**Evelyn**

> And the last one, dear, which is the money.

**Buyer** — button: *"Yes — $35.00."*

> **Yes — I agree to pay a modest one-time sum of $35.00 for this.** I understand it is priced the
> way it is because it is twelve trumps drawn out of the twenty-two, laid one to a house, and
> because you keep the whole of a night for it.

<!-- Five yeses precede this and the button carries the number. Do not move it earlier and do not
     soften the button to "continue" — the honest moment is the point. -->

---

## `THE_REQUEST` — statement 7, still hers

**Evelyn**

> Then ask me for it. I'll put it the way I heard it in your draw.

**Buyer** — button: *"Tell me what my Tower is standing on."*

> Evelyn — you are now in possession of my complete spread. I'm asking you to **lay my twelve** and
> produce my complete reading. Tell me plainly what my Tower is standing on: its name, its face, and
> how close it is. Tell me which of the two the Lovers handed me, and which door the windfalls come
> through. Give me the day, the door, and who is standing at it — so that I stop finding out last.

**Evelyn**

> I will.

⚠ **The button is reworded and the reason is mechanical.** On the page, statement 7 and the payment
button both said *lay my twelve*; in a chat those are two separate moments and cannot carry the same
words. The payment button keeps `LAY MY TWELVE`.

---

## `THE_GIFT` — statement 8, now *given* rather than described

**Evelyn**

> And I'm sending you something alongside it, free of charge — the **twenty-eight-night attention
> ledger**. Four turns of seven. One line a night about what you noticed, and a read-back on the
> fifteenth night.

> The first sign shows itself inside five to seven days. I'd rather you were the sort of woman who
> catches it than the sort who reconstructs it afterwards.

**Buyer** — button: *"Thank you — I'll keep it properly."*

> Thank you, Evelyn. I'll keep it properly.

**This beat improves in the move.** P9 wants the gift received and thanked for *before* it arrives.
On a page the buyer had to thank a form for something nobody had offered her. Here Evelyn hands it
over and she thanks a person. Same beat, less strain.

⚠ The ledger's shape is quoted from `02-P3` and from the +24h nudge in `02-E6`. **Change one, change
all three.**

---

## `CHECKOUT_CARD` — not a bubble

**Evelyn**

> Then that's everything I need from you. Settle it here and I'll start tonight.

```
  ┌─────────────────────────────────────────────┐
  │  [ 02-C3 — the order bump ]        +$12.77  │
  │  ─────────────────────────────────────────  │
  │  Total today                        $35.00  │
  │     ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓         │
  │     ┃      LAY MY TWELVE   →       ┃         │
  │     ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛         │
  │  One payment. Nothing recurring. Your       │
  │  reading reaches you within 24 hours.       │
  └─────────────────────────────────────────────┘
```

⚠ **The bump must stay on this card and must not become a chat beat.** `02-C3` converts because it
is a low-friction tick adjacent to the total at the moment of payment. Rendered as its own
conversational pitch it stops being a bump and becomes a $12.77 upsell, which is a different and
worse product.

**The card is also how the other three offers reuse this flow.** The chat carries the argument; the
card takes the money — so 03/05's pay-what-you-want amount picker and 04's server-resolved ladder
price are card variants, not new conversations. Treatment B's locked values (`00b` §3 — white
ground, `#B3261E` headline, `#16A34A` CTA, Arial stack) still apply **to the card**.

---

## Build notes

- **No decline path on statements 1–6.** Every option is affirmative; the exit is closing the tab.
  That is deliberate for a commitment ladder and should be a recorded choice rather than an
  oversight. `SOFT_DECLINE` belongs to U1/U2, not here.
- ⚠ **Cut the typing delay right down** (~200–400ms, not V1's reading cadence) and hold Evelyn to
  **one line** between statements. In V1 the chat *is* the product, so latency reads as presence.
  This is a checkout, and latency reads as a slow checkout. `00b` §3 chose the no-webfont Arial
  stack specifically so this step renders instantly on a slow phone — don't hand that back.
- **No progress counter.** *"3 of 6"* is form furniture and it breaks the fiction the whole flow
  depends on. Worth testing later against completion, not assumed now.
- ⚠ **Instrument drop-off per beat from the first send.** Six taps means six places to lose her
  where the page had one. This is the single number that decides whether this decision was right,
  and it is cheap to capture now and impossible to reconstruct later.
- ⚠ **The handoff has to survive the click** — first name, offer, variant and subscriber id all
  arrive from the letter's CTA. The V2 side of this codebase has shipped a lander that parsed zero
  URL params, so verify it rather than assuming it.
- **No letter rebuild.** All seven CTAs in `02-E4-*` point at the `{{BOOKING_URL}}` build token, so
  changing the destination from a page to a chat costs nothing in group A.
- ⚠ **The price is hard-coded in `STATEMENT_6` because 02 is fixed-price.** 04's equivalent carries
  a merge field — do not copy this beat into the ladder offer.
- **Re-run `node scripts/copy-check.cjs copy/02`.** This file now holds two versions of the same
  copy, so duplicate-phrase and price-consistency checks will read differently than they did.

## Settled, and not to be re-opened per-offer

- ⛔ **No checkboxes and no tick marks inside the chat.** *(operator, 2026-08-05 — reviewed as
  wireframes and rejected.)* Two variants were drawn: the six as a single checklist card in the
  transcript, and the six as tapped messages annotated with a ✓. **Both are dead.** A list of
  *"Yes — I agree that…"* items is a terms-and-conditions form, and **forms read as coming from
  software while everything else in the chat comes from a person** — which is exactly why this copy
  works on a page, where it is *meant* to look like a signed statement, and looks cheap in a
  conversation. The checklist variant also hands her the $35 on arrival, discarding the pacing that
  justified the chat in the first place.
  **The transcript is the document.** Six statements in her own words, on her side of the screen,
  are already a signed record; decorating them with ticks only reimports the form. The single
  non-chat element in the whole flow is the checkout card, which *should* look like software,
  because it is taking her money.
- **The booking chat asks nothing.** Decided 2026-08-05. A card-preference tap was drafted
  (*"which of the three has stayed with you?"* → World / Lovers / Tower) and **rejected** — it was a
  selling move in a closing asset. Its one real benefit was free segmentation, and `?c=1..7` already
  gives a weaker version of that signal at zero friction.
- **Everyone sees U1 and U2.** No allocator, no ownership check, no re-minted objects.
- **The thank-you is a page, not a chat beat.** `02-T1` ships as written. An earlier draft folded
  it into Evelyn's sign-off inside the conversation; that is superseded.

## Parked — worth testing, not worth blocking on

- **A second attract-object.** The only clean fix for repeat buyers being pitched a stone they
  already own. Rejected for now on SKU cost (`00b` §4), not on merit.
- **A skip-if-owned check.** The cheap half of the same problem: one lookup against
  `bracelet_orders` / `soulmate_orders`, and if she owns the object, skip that page. No routing, no
  four-way branch. ⚠ **Not a one-way door** — double orders surface in support within a week and the
  check can be added then without touching the flow.
- **Measure before deciding either.** One query gives the real overlap — of the V1 customers who
  would receive 02, how many already own a stone — instead of the 20–30% estimate. Under ~15%,
  ignore it; over ~25%, build the skip. Both parked items need this same number.
- **03 and 05's intake is a separate decision.** They cannot be fulfilled without the buyer naming a
  target, and a chat could take it inline — which would remove Diagram H's per-order Reply-To, MX
  and `be_replies` apparatus entirely. Against that: `01`'s Lesson 1 makes the *reply* the
  mechanism, not a side effect. ⚠ Do not settle it on 02's behalf; 02 needs nothing from her.
- **This page-vs-chat pair is a live A/B, not a replacement.** The page above ships as the
  challenger if the chat's completion rate comes in under it.

---

# 02-C1b — register variations for the ladder

Three complete versions of the six. **The psychology is identical in all three** — a consistency
ladder, cheapest rung to most expensive, price last, everything in her voice. What varies is the
*register*, and the register is carrying one specific job:

⚠ **The page borrowed formality and the chat cannot.** *"By booking this reading you agree to the
following"* wears the costume of a legal document, and that costume made a $35 tarot reading feel
like engaging a professional. A conversation has no such furniture, and it may not be re-imported —
see the checkbox ruling above. So each variation earns the ceremony back a different way, or
deliberately spends it on something else.

`⑦` the request and `⑧` the gift are written above in **A**'s register. Whichever variation wins,
those two are rewritten to match it before anything ships.

---

## Variation A — THE CLERK *(incumbent — the beats written above)*

**The bet:** Evelyn keeps records. The ceremony lives in her *conduct* — she takes bookings down,
she needs things said back, she works to a schedule. Formality without a form.

**Frames** — `You came.` / `Then let me take this down properly, dear. The way I take down a booking
for a twelve.` / `A few things I need said back to me first. In your own words.`

| # | Button | What lands, in her voice |
|---|---|---|
| ① | *Yes — you were right.* | **Yes — you were right, Evelyn.** You read it correctly, and I want to see the rest of what you saw. |
| ② | *Yes — draw my destiny.* | **Yes — I give you permission to draw my destiny.** The full twelve, one to each house, on the strength of the three that came away in your hand. My future is already drawn. I would rather see it than be surprised by it. |
| ③ | *I intend to act on it.* | **Yes — I understand this is done by a professional, and its instructions are not to be taken lightly.** If the spread asks something of me, I am asking for it because I intend to act on it. |
| ④ | *I understand mine asked.* | **Yes — I understand you do not lay a twelve on request.** You lay it when a first draw asks for one, and mine asked. A draw that comes away on its own may not come to me twice. |
| ⑤ | *I'll wait the night.* | **Yes — I understand this is the heaviest reading you do.** It takes the whole of a night and it cannot be hurried. My reading will take a minimum of **24 hours** to reach me. |
| ⑥ | *Yes — $35.00.* | **Yes — I agree to pay a modest one-time sum of $35.00 for this.** It is priced the way it is because it is twelve trumps drawn out of the twenty-two, laid one to a house, and because you keep the whole of a night for it. |

**Risk:** the clerical manner is the weakest of the three at replacing ceremony. It gestures at
formality rather than performing it, and *"I understand that…"* six times can read as small print
spoken aloud — which is the checkbox problem wearing a different coat.

---

## Variation B — PLAIN SPEECH

**The bet:** don't replace the ceremony, spend it. She is on a phone, she is already sold, and every
word between her and the button is a tax. Shortest taps in the deck, most intimate register,
fastest completion.

**Frames** — `You came.` / `Good. Sit with me a minute and I'll take this down.` / `Six things, and
then I start.`

| # | Button | What lands, in her voice |
|---|---|---|
| ① | *You were right.* | **You were right, Evelyn.** All of it. I want to see the rest of what you saw. |
| ② | *Draw my destiny.* | **Draw my destiny.** All twelve, one to each house. My future is already drawn — I would rather see it than be surprised by it. |
| ③ | *I'll do what it asks.* | **I'll do what it asks.** If the spread tells me to change something, I'm not asking to be told for the sake of being told. |
| ④ | *I know mine asked.* | **I know mine asked.** You lay these when a first draw calls for one. Mine did, and a draw like that may not come twice. |
| ⑤ | *I'll wait.* | **I'll wait.** A night's work, and it can't be hurried. Twenty-four hours before it reaches me. |
| ⑥ | *$35.00 — yes.* | **$35.00, once.** Twelve trumps out of twenty-two, laid one to a house, and a whole night of yours. That's what it costs. |

⚠ **B names the count** (*"six things"*). That is not the rejected progress counter — it is Evelyn
saying how short this is, which lowers the cost of starting. It is also the only variation that can
afford to, because it is genuinely short.

⚠ **B trades assent for instruction, and that is a real deviation from the framework.** *"Draw my
destiny"* is a command, not a proposition — and `00e` P2 is explicit that the ladder works *"because
each statement is a claim you assent to."* A commanding buyer may well commit harder than an
agreeing one, but this is the framework's own stated mechanism being altered, not decorated. If B
ships, that is the thing to watch.

---

## Variation C — THE OATH

**The bet:** stop apologising for the ceremony and perform it. The page's authority came from
looking like a document; C's comes from being *spoken*. It is the only variation that uses the one
thing the chat can do and the page never could — she says it out loud.

**Frames** — `You came.` / `Before I lay anything, there are things that have to be said. Not
written. Said.` / `I'll give you the words. You give me the yes.`

| # | Button | What lands, in her voice |
|---|---|---|
| ① | *You read them right.* | **You read them right, Evelyn.** I felt it when I got to the third one. I want the rest of what you saw. |
| ② | *You have my permission.* | **You have my permission to draw my destiny.** Twelve, one to each house, on the strength of the three that came away in your hand. My future is already drawn. Let me see it. |
| ③ | *I'll carry what it asks.* | **I'll carry what it asks of me.** I am not asking to be comforted. If there is something to be done, I will do it. |
| ④ | *I know it may not come twice.* | **I know a draw like mine may not come twice.** You don't lay a twelve because a woman asks. You lay it when the first draw asks. Mine asked. |
| ⑤ | *Take the whole night.* | **Take the whole night.** I would rather wait for something laid properly than have it quickly. Twenty-four hours. |
| ⑥ | *Yes — $35.00.* | **Yes — thirty-five dollars, once.** Twelve trumps out of twenty-two, one to each house, and a night of your work. I know what I am paying for. |

⚠ **C's risk is the sender test.** This list has had months of Evelyn writing to it daily. A woman
who suddenly speaks like a ritual officiant reads as a different person, and that is the same
failure the deck's block-capitals ban exists to prevent (see `02-E2`'s decision 1). ③'s *"I am not
asking to be comforted"* is the line to check first — it is the strongest sentence in any of the
three and also the one furthest from how she has ever written.

---

## Choosing between them

| | A — clerk | B — plain | C — oath |
|---|---|---|---|
| Words she "says", ⑥ statements | ~150 | ~95 | ~130 |
| Replaces the page's ceremony | weakly | doesn't try | directly |
| Framework-faithful (P2 assent) | yes | ⚠ no — commands | yes |
| Sender-test risk | lowest | low | ⚠ highest |
| Best if the problem turns out to be… | nothing | drop-off per tap | the chat feeling cheap |

**Recommendation: ship A, bank C as the challenger, hold B.** A is written, audited and carries the
least risk on a pilot with no traffic. C is the only one that answers the ceremony problem head-on,
so it is the challenger worth having. B is the answer to a *measured* completion problem — do not
ship it pre-emptively, because it is also the one that alters the mechanism.

⛔ Whichever ships, the rules above are unchanged: no checkboxes, no ticks, no counter, no text
input, nothing asked, nothing re-argued, and the full statement lands as her message however short
the button is.

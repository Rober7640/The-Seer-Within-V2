# 07-C1 — the booking page *(Marcus Daily Tarot)*

| | |
|---|---|
| **Offer** | 07 Marcus Daily Tarot — RECURRING · three tiers $35 / $57 / $87 + $12.77 speed bump · 24h SLA |
| **Arrives from** | the three text CTAs in every daily. One destination. `?c=1\|2\|3&s=<spread>` |
| **Voice** | **two, and they never blur.** Marcus is first person for everything he says. The tick-statements are hers, first person, and Marcus is named in the third person inside them |
| **Reads** | [`07-C2`](./07-C2-the-three-tiers.md) the ladder · [`07-P1`](./07-P1-the-seven-spreads.md) the positions · [`07-P2`](./07-P2-the-device-set.md) the sentences |
| **Refuses** | Thursday's Pattern and Saturday's Table — see beat 9 and [`07-spread-registry.md`](../../docs/07-marcus/07-spread-registry.md) |
| **Supersedes** | [`07-C1-booking-page-preview.html`](./07-C1-booking-page-preview.html), a mockup. What was kept and what changed is in the build notes |

---

## What this page has to do

She has read a letter, looked at a photograph of a real cut, and clicked a link that said *tell me
what you're asking*. She arrives sold on the idea and undecided on one thing only: which reading.
So the page has four jobs and they run in this order.

1. **Prove the cards are still there.** She saw two turned this morning. If the page opens on a
   price grid, the thing she clicked has vanished and the letter's promise went with it. The first
   screen is the spread, as it lies, with the face-down ones named and not turned.
2. **Take her question.** It is the product input, it is the commitment device, and it is the only
   thing that can route the tier. Nothing else on the page can do those three jobs.
3. **Let the arithmetic choose the price.** Her question's shape names the rung. Nobody argues for
   the upgrade — the routing table does it, and it does it by pointing *down* as often as up.
4. **Get out of the way.** Six agreements, one disclosure, one button.

⛔ **What it must not do is sell again.** The letter sold. A woman who has been sold to twice can
talk herself back out of it. Every beat below removes a reason to stop; none of them adds a reason
to buy.

---

## The page, beat by beat

### 1 · Masthead

> **MARCUS STONE**
> Daily Tarot · The Seer Within
>
> `{{DAY}} · {{SPREAD}} · cut {{DRAW_DATE}}, before light`

The date is a bare fact and she can check it against the email she just left.

### 2 · The headline

> # The other {{N_DOWN_WORD}} are still face down.
>
> *I cut once, before it got light, and I read whatever sat on the cut. {{N_FREE_WORD}} of them I
> turned over for the whole list this morning. The rest don't turn over until I know what you're
> asking.*

*Tuesday reads:* **The other six are still face down.** · *Two of them I turned over for the whole
list this morning.*

### 3 · The spread, as it lies

The card strip. Face-up cards are their RWS scans with the position under them; face-down cards are
backs, numbered, with the position named under each. **She can count them.** That is the whole
proof, and it is why no adjective appears anywhere near it.

> ## The {{N_TOTAL_WORD}}, as they lie
>
> You saw {{FREE_NAMES}} this morning. These {{N_DOWN}} haven't been turned.

*Tuesday:* **The eight, as they lie** · *You saw door one and door two this morning. These six
haven't been turned.*

`[STRIP — {{N_FREE}} faces with position labels, then {{N_DOWN}} backs, each labelled with its
position name from 07-P1]`

### 4 · The line that finishes her CTA *(`?c=`)*

One line under the strip. It changes with the link she clicked and nothing else on the page does.
Full copy in *What changes per entry point*, below.

### 5 · The question

> ## What are you asking me?
>
> One thing, in your own words, and be exact about it. *"What's going on with him"* is not
> something I can lay cards on. *"He says eventually and it's been four years — do I keep waiting"*
> is.

`[TEXTAREA — placeholder is the day's own ask, per the table below]`

Under the box, two lines. The first is live and changes as she types — that is the router, and its
copy sits in beat 7. The second is fixed:

> I read the cards. What you tell me points them at the right thing. It isn't what the reading gets
> built out of.

⭐ That second line does two jobs at once. It kills *"you just wrote back what I told you"* before
the thought forms, and it stops her writing nine hundred words when four sentences is the input.

### 6 · The statements

Five ticks, hers, before any price is agreed to. The sixth — money — waits until she has picked a
rung, and it is beat 11.

> ## Before I lay them
>
> **Yes** — I saw the {{N_FREE_WORD}} this morning, and I want the rest of them turned over.
>
> **Yes** — the question above is mine, and it's the one I actually want answered.
>
> **Yes** — I understand Marcus reads the cards, not the people in them. Nothing in my reading is a
> claim about what anybody else is going to do.
>
> **Yes** — I understand this cut was made once, this morning, and won't be made again for me.
>
> **Yes** — I understand my reading is written for me, and that it reaches me inside 24 hours.

⛔ The scarcity in statement four comes from the mechanism, not a counter. One cut a day is how
Marcus works and the letter already said so. There is no timer on this page and nothing to keep
in sync.

### 7 · The routing

> ## Which one your question needs
>
> Pick the one your question actually needs. I'd rather you paid for less reading than more — a
> question that wants one answer gets muddier under eighteen cards, not clearer.

Then the table, printed on the page as three plain rows:

| If you're asking… | Take |
|---|---|
| one thing, about you | **The Spread** |
| *why do I keep* — anything that's happened more than once | **The Pattern.** The repeat is the tell, and the cards that read it are the origin ones |
| what **he's** doing, thinking, or waiting on | **The Table.** His side has to be laid before it can be read |

And under it, the one that catches most of them:

> *"Should I stay or should I go"* is two questions. Both doors have to be read against the thing
> underneath them, so that one starts at **The Pattern**.

**The live router line, under the question box.** It fires on what she has typed, in this order,
and it always names one rung and stops:

| What she typed | The line |
|---|---|
| *or* / *should I stay* / *should I go* / *should I leave* | That reads as **two questions** — both doors, against the thing underneath them. **The Pattern** is the one that holds it. |
| *what is he* · *does he* · *is he* · *why does he* · *what does he want* · *is he thinking* | You're asking what's going on **on his side**. That has to be laid before it can be read, and that's **The Table**. |
| *keep* / *again* / *always* / *every time* / *still* | A thing that repeats has a start date. **The Pattern** is what finds it. |
| anything else | One thing, asked plainly. **The Spread** is the one — you don't need the others for this. |

⛔ **The pronoun test is not a mention test.** *"Do I keep waiting for him"* mentions him and is a
question about her, and the $35 Spread is the right answer to it. Route to The Table only when the
question's subject is what he is doing or thinking. Getting this wrong pushes almost every love
question to the top rung, which is the exact behaviour the line above the table promises she won't
get.

⛔ **The router never says she needs one.** It says which one holds it, and the tiers stay tappable
whatever it says.

### 8 · The three *(or two)*

Three cards, side by side. None pre-selected, no "most popular", no crossed-out price.

**The Spread — $35**

> The {{N_DOWN_WORD}} that went face down in this morning's email, laid on your question. What the
> thing actually is, what each part of it costs, and who you are on the other side of it.
> **{{N_TOTAL}} cards.** If your question is one thing, this is the one.

**The Pattern — $57**

> Everything above, and then five more that ask why it keeps happening. When it started — and
> there's a date, and it sits years before the thing you'd point at. What's kept it alive. Who it
> still serves, which is the card nobody expects. **{{N_PATTERN}} cards.** Take this if you've been
> here before.

**The Table — $87**

> Everything above, and then his side of it, laid the way his would be. What he's doing. What he
> thinks he's doing. What he'd have to admit. What he does if nothing changes. **{{N_TABLE}} cards.**
> I read the cards, not the man — this is what the spread says about him, and never a claim to know
> his mind.

*Tuesday's counts are 8 · 13 · 18. The rest are in the day table below.*

### 9 · The rung that isn't there — Thursday and Saturday

Two days sell two rungs. The third is not printed as a card and has no price and no button. It is a
full-width note under the two live ones, in the same frame, so the row reads as **two rungs and a
note** rather than a grid with a hole in it.

**Thursday — no Pattern:**

> **There's no Pattern today, and that's not an oversight.**
> The Pattern is the five cards I add when a day's cut doesn't already ask why a thing keeps
> happening. Today's does. The Undertow *is* that question — when it started, what's kept it alive,
> who it still serves — and those cards are already lying on the table in front of you. Charging you
> again for them would be charging you twice. If your question is *why does this keep happening*,
> take The Spread. Today that's the right one.

**Saturday — no Table:**

> **There's no Table today, and that's not an oversight.**
> The Table is his side of it, laid the way his would be. That's what The Other Chair is, and The
> Other Chair is today's cut. Stacking it on top of itself would sell you the same five cards twice.
> If your question is about what he's doing, take The Spread. That's what today's spread is for.

⭐ **The absence is a trust proof, so it gets said out loud.** A refusal to sell is the strongest
version of the line at the top of beat 7, and on both days the missing rung is missing *because the
day already answers that question at the bottom price*. That is also why the router still has three
answers on all seven days — on Thursday and Saturday one of them points down instead of up.

⛔ Do not invent a replacement tier to fill the gap, and do not silently print two cards with no
explanation. The first sells content she already has; the second looks broken.

### 10 · The bump

⛔ **It does not exist until a rung is chosen.** Before that it is a fourth option competing with
three; after, it is an add-on to the one she picked. Never pre-checked.

> ☐ **Back before tonight — $12.77**
> I write these in the order they land on me. Tick this and yours goes to the front of that
> queue — written today, in your inbox tonight, instead of tomorrow. I'm at the table until about
> six my time; ordered after that, it's first thing in the morning and I'll tell you so on the
> receipt.

### 11 · The money line

Appears with the price she picked, in her voice, directly above the disclosure. This is the sixth
agreement and it is the first thing she agrees to that costs anything.

> **Yes** — I'm paying {{TIER_PRICE}} for this reading. One payment for the reading, nothing recurring.

### 12 · How the reading gets made

⛔ **Before payment, on the page, not only in the PDF.** Sandwiched, and the labour split stated
honestly: the draw is a real thing a person did, the writing is assisted.

> ### How your reading gets made
> The cut is mine. One cut, at my table, before it got light this morning, and the cards you're
> looking at are the ones that came off it. The writing is assisted — I use a machine to help me put
> the reading into words, against your question and against these cards and nothing else. No part of
> it is a template and no part of it is somebody else's reading with your name on it.

### 13 · The button

> ### TURN THEM OVER — {{ORDER_TOTAL}}

Until the six ticks and a rung are done, the button's place carries a line that names what's left,
so the page never just ends:

> *{{N}} to tick* · *no reading picked yet*

### 14 · Under the button

> One payment for the reading. Nothing recurring. Your reading is written out and reaches you inside 24 hours, at the
> address you pay from.

### 15 · The guarantee and the guardrail

> **If it doesn't reach you inside 24 hours, tell me and I'll send the money back.** What I can't
> promise is that you'll like what the cards say. Ask before I've started and you get all of it
> back. Once it's written, it's written.

> Marcus reads **the cards**, not the man. Everything in The Table is what the spread says about
> him. It is never a claim to know his mind and never a promise about what he'll do.

### 16 · What follows the button

Stripe's hosted page, then back to the thank-you page, which is where the rest of the intake
happens. Its opening beat:

> ### It's in front of me.
> {{SPREAD}}, cut {{DRAW_DATE}}. Here's the question you sent, as you wrote it:
>
> > *{{HER_QUESTION}}*
>
> That's what I'm laying them on. If there's one thing I should know before I start — who's in it,
> how long it's been going on, what you've already tried — put it here. It's optional and it changes
> nothing about the price.

`[OPTIONAL TEXTAREA]`

> Either way it's with you inside 24 hours{{, tonight if she took the bump}}, to this address.

### 17 · If she leaves

Stripe's cancel returns her to `?recover=1`, with the question she typed still in the box and the
rung still selected.

> Your question's still here and nothing's been charged. The cards are still face down.

---

## What changes per spread *(`&s=`)*

Everything numeric, and one placeholder. **The page is one template.**

| Day | `s=` | Spread | Free | Down | Spread $35 | Pattern $57 | Table $87 |
|---|---|---|---|---|---|---|---|
| Mon | `the-weight` | The Weight | 1 | 5 | **6** | 11 | 16 |
| Tue | `two-doors` | The Two Doors | 2 | 6 | **8** | 13 | 18 |
| Wed | `small-instruction` | The Small Instruction | 1 | 5 | **6** | 11 | 16 |
| Thu | `the-undertow` | The Undertow | 2 | 5 | **7** | ⛔ none | 12 |
| Fri | `the-ledger` | The Ledger | 3 | 6 | **9** | 14 | 19 |
| Sat | `other-chair` | The Other Chair | 2 | 5 | **7** | 12 | ⛔ none |
| Sun | `zodiac` | The Zodiac Spread | 3 | 9 | **12** | 17 | 22 |

*The Pattern always adds five and The Table always adds ten. That never moves, which is what keeps
the ladder legible across seven different spreads.*

**The face-down labels** are the paid position names from `07-P1`, verbatim, in order. Tuesday's six
read *What it costs · What it gives · Who you become* twice over. Sunday's nine are its nine unread
houses.

**The question box placeholder** is the day's own ask, written so it models a specific question
rather than handing her one to accept:

| Day | Placeholder |
|---|---|
| Mon | *My mother's been dead two years and I'm still running her house rules. Whose is this?* |
| Tue | *Six years, no ring, nothing's moved since 2023. Do I keep waiting or do I go?* |
| Wed | *I know what's wrong and I've known for months. What do I actually do today?* |
| Thu | *Every time it's going well I pick a fight. Why do I keep doing that?* |
| Fri | *I gave up my job and my city for this. Has it paid me back or have I just stayed?* |
| Sat | *He texts every day and won't make a plan. What's he actually doing?* |
| Sun | *I've been holding on for a year waiting for something to change. Where is this going?* |

**The routing table's rows move on two days only:**

- **Thursday** — the *why do I keep* row points at **The Spread**, because the seven she's looking at
  are already that question. *"Should I stay or go"* points at The Spread too on Thursday: what's
  underneath both doors is what The Undertow reads, and the origin cards she'd be paying extra for
  are already in the seven. The *what he's doing* row still points at **The Table**.
- **Saturday** — the *what he's doing* row points at **The Spread**, because The Other Chair is that
  spread. The other two rows are unchanged.

⛔ **The router never points at a rung the page isn't selling**, on any day.

⛔ **`s` is required and is never guessed.** README rule 11: she can click Tuesday's email at 11pm
ET, which is Wednesday in Singapore, so the clock is not allowed near this. A missing or unknown
`s` shows a plain page with no cards and no prices:

> This link's lost the day it came from. Open today's email again and use one of the three links
> inside it — they carry the cut with them.

---

## What changes per entry point *(`?c=`)*

`c` says which of the three CTAs she clicked. **It changes one line and one focus behaviour.** No
price, no tier, no card, no statement moves — a page that reshapes itself around a click she can't
remember making reads as a trick.

| | Where she clicked | The line under the strip | Focus |
|---|---|---|---|
| `c=1` | mid-letter, right after the last card | *You asked me to lay the {{N_DOWN_WORD}} behind these. They're right there, and the only thing missing is what you want them laid on.* | top of the strip |
| `c=2` | the concrete ask | *You came from the part where I asked what you're actually asking. So — say it, and I'll cut into it.* | the question box |
| `c=3` | the final CTA | *You read the whole thing before you clicked. Put the question in front of me and I'll turn the rest of them over.* | the question box |

An unknown or missing `c` falls back to the `c=3` line, which assumes nothing.

---

## Build notes

### Open thread 1 — where the question box sits

**Recommendation: her question stays before payment. Everything else in the intake moves after it.**
That is the two-step page, and the split is *the question, then the money, then the detail*.

**The case for pay-first**, which is the market's unanimous practice: a buyer who stalls at an intake
form having already paid can be chased by email; one who stalls at a blank box before paying is
simply gone. The box is the highest-friction element on the page and it currently sits in front of
every dollar.

**Why it loses here anyway**, in the order the arguments matter:

1. **Nothing can be fulfilled without it.** `GET /fulfilment/:sessionId` answers `409` with
   `missing:["question"]` and refuses to guess (`07-server-spec.md` §6.3). So a paid order with no
   question is not a delayed sale that can be rescued by email — it is a refund and a support
   ticket. The market's recovery move assumes a human reader who can write *something*. This
   pipeline correctly will not.
2. **The routing dies without it.** The tier ladder is the strongest mechanic on the page and its
   only input is the shape of her question. Choosing blind turns three tiers into a price grid, and
   a price grid sells the cheapest rung every time.
3. **The CTA promised it.** All three links in every daily are some version of *tell me what you're
   actually asking* and *put the question in front of me*. Landing on prices instead is a
   message-match break at the most expensive moment in the funnel.
4. **Typing it is the commitment.** She has written the thing down before she has spent anything,
   which is the strongest version of the effect the six statements are reaching for.

**What moves after payment, and it is real:** every optional field. The context box, anything about
who's in it, how long it's been going on. That is beat 16, and it means step one asks for exactly
one thing.

⭐ **The challenger arm, if step-one abandonment is worse than the routing is worth.** Replace the
free-text box before payment with a three-tap shape picker — *one thing · it keeps happening · it's
about him* — which routes the tier without asking her to write a word, and move the free-text
question to the post-payment page. It keeps the routing, keeps pay-first, and costs the commitment
device. **Measure it before assuming it wins**: the metric is completed orders per click, never
step-one completion, because a question typed on step two is a question that can go missing.

### Open thread 2 — what the bump is

**Recommendation: keep speed, keep $12.77, and fix the honesty problem the market flagged.**

The expansion bump is dead — tier 2 is the expansion now, and two products selling depth at once
cannibalise. Speed is the market's other axis and it is genuinely different in kind: same-hour
roughly doubles an Etsy price, and at $35 the market already expects same-day where 07 promises 24
hours. The build agrees — `bump_product_key: "marcus_same_day"` and node `13 · same-day? → 13a ·
Wait` already exist in the workflow, so this is the only candidate that costs nothing to ship.

**The two things that have to change with it**, or it reads as a manufactured defect:

1. ⛔ **Stop describing 24 hours as labour.** 02's booking page says the reading *takes the whole of
   a night and cannot be hurried* — say that here and paying $12.77 to hurry it is an obvious
   contradiction. 07's SLA is a **queue**, and the copy above says so: *I write these in the order
   they land on me.* The bump buys position, not haste.
2. **Publish the cut-off.** The research is blunt that every credible fast promise carries one, and
   that only sellers who publish working hours are honest about same-day. Beat 10 names six in
   Marcus's evening and says what happens after it.

**The alternatives, and why not.** A follow-up question, a second question, a voice note — each is a
different object and each is defensible, but every one of them is *more reading*, which is tier 2's
job again with extra steps. The spread photograph of her own draw is the one genuinely missing
artefact, and it belongs inside the product at every tier, not sold back to her.

### What is deliberately not on this page

| Not here | Why |
|---|---|
| **Her name, her birthday, his name, his birthday** | The maximum-intake position, and the research says it is a positioning choice rather than a best practice. Four fields of friction that the prompt never reads. First name comes from AWeber, email from Stripe, and the question does the rest |
| **A countdown or a seats-left counter** | The scarcity is one cut a day, which is how he works. A counter is a promise only code can keep |
| **"No sugarcoating", or any version of it** | A third of ~150 profiles sampled use it. It is table stakes and it costs a line to say |
| **Testimonials** | Real readings are private. The honest substitute is the sample below, and an invented one is not on the table |
| **The sample reading, inline** | ~1,200 words would bury the tiers. It goes as one text link — *"See one, start to finish, written for a woman who doesn't exist"* — and the fictional-client framing turns the privacy rule into the trust proof |
| **A link to `/marcus`, or any chat handoff** | Settled |
| **Upsells after the button** | ⭐ **REVERSED 2026-09-04** — two upsells are now required. The thank-you page is no longer the end of the flow; U1 and U2 sit between the button and it |
| **Word counts as the headline unit** | Four sellers in the whole sample quote words. Everyone else sells countable things, and 07's countable thing is cards |
| **Email capture** | She is already on the list. That is how she got here |

### Kept from the mockup, and changed

**Kept, because they were right:** the card strip with face-down positions named and countable; the
question box above the tiers; the five agreements before any price; the bump hidden until a rung is
picked and never pre-checked; the button gated behind ticks with a line saying what's left; the
guardrail block under everything; the live router under the question box; *"I'd rather you paid for
less reading than more"* as the frame on the tier row.

**Changed:**

| | |
|---|---|
| **Thursday and Saturday printed three tiers** | Two rungs and a written refusal. The workflow refuses those orders after payment, so the page had to stop taking them |
| **The router's pronoun test** | It fired on any *he/him/his* and sent almost every love question to $87 — including the dry-run question, which is correctly a $35 Spread. Now it fires only when the question's subject is what he's doing or thinking |
| **The router had no positive answer** | Its default line said nothing. It now names The Spread out loud, which is the rung the frame above it promises she'll be pushed toward |
| **No money statement anywhere** | Price appeared only on the button. Statement six now ratifies it in her voice, after she picks — the deck's device, adapted to a ladder |
| **No AI disclosure at all** | Required before payment. Beat 12, sandwiched, with the labour split named |
| **No guarantee, no refund terms** | Delivery is guaranteed, accuracy is not, and the refund stages on work begun |
| **No headline** | The page opened on the strip. It now opens on the count that is the whole offer |
| **Nothing per entry point** | `?c=` was accepted and ignored. It now finishes the sentence the CTA started |
| **No `s` failure state** | An unknown spread would have rendered an empty page. It now says what went wrong and how to fix it |
| **The bump had no cut-off** | *"Back before tonight"* with no working hours is the escape-clause-free promise the research warns about |

### Open items this page depends on

- 🔴 **The tier price and the refusals belong in `priceBackendOffer`, not in the browser and not in
  n8n.** Thursday's Pattern and Saturday's Table must be refused before Stripe, not after
  (`07-server-spec.md` §6.2). This page not printing them is necessary and is not sufficient.
- 🔴 **The link carries `&s=` but not the draw's date.** A forwarded email opened two days later
  resolves the same `spread_key` against a different `draw_date`, and the page would show a cut she
  never read about. Either the link carries the date or the page resolves the newest draw for that
  spread and says which morning it came from.
- 🔴 **The sample reading is an asset that doesn't exist yet.** `dryrun-tue-spread.md` is the whole
  thing already written; it needs a fictional asker and a page to live on.
- ⚠ **Every count on this page is computed twice** — once here to sell her 13 cards, once in
  fulfilment to write them. The registry doc is right that this is the one disagreement the offer
  cannot survive, so both should read the same registry before this takes money.

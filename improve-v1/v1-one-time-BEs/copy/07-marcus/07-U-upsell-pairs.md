# 07-U — four U1/U2 pairs, proposed

| | |
|---|---|
| **Why this exists** | Operator, 2026-09-04, reversing the no-upsell note: *"Upsells are the lifeblood of every funnel. We need a proper brainstorm to tackle extending the average order value."* |
| **Status** | ⭐ **Proposals.** Nothing here is written to ship. Pick one pair, then it gets built to [`00j`](../../docs/00j-WORKFLOW-UPSELLS.md) like every other pair in the deck |
| **Seeds** | Both of the operator's are built on — **audio** is Pair 1, a **physical object with a ritual** is Pairs 1, 2 and 3 |
| **The walls** | [`07-upsell-decision.md`](../../docs/07-marcus/07-upsell-decision.md) — its recommendation is dead, its constraints are not. Every proposal below is checked against them by name |
| **Where they sit** | `booking page → SHE PAYS → U1 → U2 → thank-you (optional context) → the reading` |
| **Skills run** | `direct-response-copy` · `positioning-angles` |

---

## The unlock — and it is the only reason any of this is legal

The last round died partly on *"no personal details in an upsell"*, read as banning anything
built from her question. That reading is too wide, and `0-WORKFLOW.md:281` settles it in the
other direction:

> *"impersonal upsells, personal product."*

The rule binds the **screen**, not the thing the screen sells. 02's U1 sells a stone that is
charged for one buyer; its upsell copy names nobody. So the test for 07 is not *"is the product
personal?"* — every product in the deck is. The test is three questions:

1. Does the **screen** name her, her question or her cards? It must not.
2. Does the product need **new input** from her? It must not — that is the intake, and the intake
   is on the thank-you page, downstream of both upsells.
3. Is the product built from what she **already paid for**? It must be.

Everything below passes all three. That is what the last round's *"a different object — banned
twice"* line was really about: a follow-up question, an extra question and a double-check all
need her to type something new. A rendering of the reading she already bought does not.

## The machinery that already exists — read this before costing anything

Checked in the live V1 funnel, which is where the Protection Ritual and the Manifestation Bracelet
actually run. Four of these change a decision below.

| Thing | What is really there |
|---|---|
| **The charge** | ⭐ **1-click, off-session, on the card from the $35.** `/api/upsell/charge` retrieves the checkout session, checks it is paid and hers, then a new PaymentIntent with `off_session: true, confirm: true`. She never re-enters a card |
| **The fallback** | A hosted Stripe page when the off-session charge is refused — *"Indian cards reject off-session PIs outright"* is a comment in the code. 🔴 **Backend offers do not have it.** `isTwinFlameOffer()` routes to `/api/backend/upsell/charge`, which has **no hosted fallback** and just asks her to try again. 07 inherits that gap |
| **The chain** | `V1_CHAIN_1` = confirmation → gap → risk → 3 questions → solution → offer → CTA, ~55–60 bubbles. `V1_CHAIN_2` = path open → reveal → gap → 3 questions → stones → ritual → price → urgency → CTA. Both in `lib/upsellCopy/v1.ts` |
| **The downsell** | ⭐ **U1 has none — one decline is terminal.** Only **U2** downsells, once, on price, with a damaged-goods reason: *"it just hasn't been attuned to anyone yet… I can send it to you for $30 instead."* A second decline exits |
| **Shipping** | `ShippingForm.tsx`, shared. ⛔ **Seven countries only** — US, CA, GB, AU, NZ, IE, SG |
| **Shipping reuse** | Verified: U2 Path A with `hasShipping` shows **no form at all** — *"I'll ship it to the same address as your protection stone."* Path B collects into separate `shipping2_*` columns |
| **Who actually ships it** | 🔴 **Nobody, automatically.** The V1 upsell path ends at `logger.info("Upsell order to ship (legacy)")`. The only working alert in the repo is the storefront's `braceletOrders.ts` → "New order to ship" email. 06's spec calls V1 the precedent; the precedent is thinner than it reads |
| **Physical SLAs on record** | `shared/braceletProducts.ts`: ships within 7 business days · US delivery 1–2 weeks · international 21 days or more · tracking email 3–5 days after dispatch |

Three consequences, and they are not small:

1. **Any physical pair inherits a 21-day international tail and a manual pick-and-pack with no
   alert built.** Budget the alert. It is `braceletOrders.ts` copied, not invented.
2. **Only U2 gets a downsell**, because that is the shape the deck has proven. Each pair below names
   its U2 downsell; none of them proposes one on U1.
3. **The backend hosted-checkout fallback has to be built before 07 sells anything after the
   button**, or every declined off-session charge is a lost upsell with no recovery path.

## The hinge — one sentence, and all four pairs argue from it

`00j` Step 2: *the hinge is DERIVED from the product, never invented.* 07's is Marcus's own
thesis, stated in the daily before any money changes hands:

> **You have already chosen. The spread doesn't decide it for you. The spread is how you find out
> what you already decided.**

Read that as a limit and the whole upsell space falls out of it. A reading is a piece of
**knowing**. Knowing at six in the morning and doing exactly the same thing by Thursday is the
failure Marcus already named at the table — Hester spent nine years *deciding* and calling that a
decision. The product ends at the knowing. Every pair below sells a different half of the gap
between knowing and doing:

| Pair | The half it sells |
|---|---|
| 1 | She read it. She was never **told** it |
| 2 | She has it. It is not **anywhere she walks past** |
| 3 | She knows what it says. She has no idea what it **costs to ignore** |
| 4 | The cut is on the table until tonight and there is room on it for **one more question** |

## The walls, as a checklist every pair is scored against

| # | Wall | Where it is written |
|---|---|---|
| 1 | Depth is sold — more cards, another spread, is the ladder | `07-C2` |
| 2 | Speed is sold — the same-day bump | `07-C2` |
| 3 | The method is free — all seven dailies explain their own card count and print the paid position names | verified in all 7 `.html` |
| 4 | No packs, no volume discounts | spec §7 |
| 5 | Nothing on the signed link later than seven days — `expiresIn: 604800` | n8n node 12a |
| 6 | No personal details **on the screen** | deck rule, `0-WORKFLOW.md:281` |
| 7 | No outcome promises, no claims about a third party | offer-wide |
| 8 | ⛔ Never let the upsell sell against the product | `00j` Step 2 |

Wall 8 is the one that kills the obvious ideas. A deck, a cloth, a "learn the layouts" manual —
each teaches her to do the one thing that produces fewer orders. None of them appear below.

---

# Pair 1 — "Told, then carried"

**The operator's audio seed.** Sells the medium, then the object.

| | U1 | U2 |
|---|---|---|
| **Name** | **The Sitting** | **The Marker** |
| **Price** | $47 | $27 |
| **Shape** | audio, ~20 min | posted object + one printed card |
| **Lands** | with the PDF, inside 24 hours | card is instant; object posts in 7–14 days |
| **Fulfilment cost** | $0.30–$1.10 | $4–$8 landed |

## U1 · The Sitting

**One line.** Marcus reads her reading out loud at table pace — one card at a time, with the stops
where he would stop.

**The mechanic.** Not an audiobook of the PDF. The script is re-cut for speech: the position
becomes a spoken heading, the `[IMG-n]` tags come out, and Marcus tells her when to stop the
recording and look at the card before he says what it means. It is a sitting, played back. Same
words, same cards, same count — a different act.

**Why she says yes at that exact moment.** She has just paid for a document she is about to read
on a phone, standing up, at six in the morning, skimming to the end to see how it comes out. She
knows that about herself. The ask names it before she can deny it, and it costs her nothing to
admit.

**How n8n fulfils it.** One branch off the existing chain, no second pipeline:

- `7c · Bought the sitting?` — IF, on an `upsells[]` array added to the payload from
  `GET /api/be/07/fulfilment/:sessionId`
- `7d · Cut the sitting script` — Code. Takes the joined reading out of `7b · Keep the reading`,
  strips the image tags and bracketed card headers, inserts the spoken headings and stop-marks
- `7e · Speak it` — httpRequest to ElevenLabs `/v1/text-to-speech/{voice_id}`, one call per
  position, reusing the `5 · Each position` splitInBatches loop. Chain them with
  `previous_request_ids` and the clips stitch themselves, which removes a concat step entirely
- Then **existing nodes only**: `12 · Upload to Supabase Storage` takes a second object,
  `12a · Get signed URL` returns a second URL, `14a · Tag + reading_url` gains `audio_url`

**What it costs.** Speech only, and it adds 60–90 seconds to a run that already takes 30.

| Line | Per order |
|---|---|
| ElevenLabs, ~5,500 characters | $0.30–$1.10 depending on the plan |
| Supabase Storage | negligible |

**The ask, in Marcus's voice.**

> You're going to read this the way you read everything. Fast, standing up, to the end, to see how
> it comes out. That's not a criticism. That's what reading is.
>
> Let me read it to you instead. The way I'd read it if you were sitting across the table from me —
> one card at a time, and I stop where I'd stop, because there are two or three places in every one
> of these where the stopping is the point.
>
> Twenty minutes. You don't have to do anything but sit there.

## U2 · The Marker

**One line.** A flat black stone for her pocket, and one printed card with the sentence and the
count on it.

**The mechanic.** Every reading Marcus writes names one moment — not a day, not a mood, a moment
that turns up most days and takes about four seconds. The card carries that sentence. The stone
carries nothing. Its whole job is that her hand finds it and she says the sentence. It is a
**count**, not a charm, and Marcus says so out loud — which is the only version of a charged object
his register can carry.

**Why she says yes at that exact moment.** After the audio she has been *told*; after declining it
she has been *given a document*. Both branches end in the same place — the reading finishes and the
day starts. The Marker is the only thing on offer that survives the end of the reading.

**How n8n fulfils it.** The card is generated, the object is picked and packed by hand:

- `7g · Compose the marker card` — Code, then one httpRequest model call, ~120 words: the sentence,
  the moment, the count, and what it means if the number is zero
- It joins `10a · Build the HTML` as a final section, so it rides the **same** PDFShift call, the
  same upload and the same AWeber send. She has the sentence inside 24 hours whether or not the
  post has moved
- `15b · Ship this` — an operator alert carrying name, address and the card PDF. `ShippingForm.tsx`
  collects the address on the screen, unchanged. 🔴 **The alert itself does not exist on the V1
  upsell path** — that path ends at a log line. It has to be lifted from `braceletOrders.ts`, which
  is the storefront's and is the only working one in the repo

**What it costs.** About two minutes of somebody's hands, plus:

| Line | Per order |
|---|---|
| Stone, at 500 units | $0.40–$1.50 |
| Printed card | ~$0.15 |
| Mailer + postage | $2.50–$6.00 |
| **Landed** | **$4–$8** |

**The ask, in Marcus's voice.**

> Your reading names one moment. Not a bad day and not a mood — one moment, four seconds long, that
> turns up most days and that you walk straight past.
>
> I'll send you something to put in your pocket. Every time your hand finds it, you say the sentence
> I've printed on the card that comes with it. That's the whole instruction.
>
> It isn't lucky and it doesn't do anything. It's a count. At the end of a fortnight you'll know the
> number, and the number is the thing you've never had.

**The downsell** *(one step, then out — the deck's proven shape)*. Drop the object, keep the
instruction, and the reason is true rather than invented:

> Fair enough — you don't want a parcel. Then let me just send you the card. It's the sentence and
> the count, in your inbox with the reading, nothing in the post and nothing to wait for. You'll
> have to find your own thing to put in your pocket.

## Nearest wall, and why it does not hit it

**Wall 1, depth.** Twenty minutes of Marcus talking reads like *more*. It is not: same word count,
same card count, same claims, nothing added. The proof is arithmetic and she can check it — the
audio is the document, said. Marcus's own device set says lead with the count, not the adjective.

⚠ **The real risk in this pair is not a wall.** It is the voice. A synthetic Marcus that lands
wrong does not just lose the sale — it retroactively makes the persona feel manufactured, on a list
of 76,718 people who get a letter from him every morning. Buy the voice work before you buy the
funnel work, and test it on the daily first, free, as one read-aloud paragraph.

---

# Pair 2 — "Off the screen"

**The physical seed, at its cheapest and most honest.** Sells the object, then the act.

| | U1 | U2 |
|---|---|---|
| **Name** | **On Paper** | **The Standing Instruction** |
| **Price** | $47 | $27 |
| **Shape** | printed and posted booklet | one page, digital |
| **Lands** | 7–14 days | with the PDF, inside 24 hours |
| **Fulfilment cost** | $8–$13 landed | ~$0.02 |

## U1 · On Paper

**One line.** Her reading, printed and posted, because the link stops working in seven days.

**The mechanic.** Nothing is added and nothing is rewritten. The same PDF, laid out for print, saddle-
stitched, and put in the post. The argument is not "nicer" — the argument is a fact about the
product she has just bought, which is the strongest kind of ask available anywhere in this offer.

**Why she says yes at that exact moment.** She has paid for something she cannot yet see, and she
has just been told, by the man who made it, a true and slightly inconvenient thing about it that he
had no obligation to tell her. That is Hopkins' reason-why in one sentence and it is doing three
jobs at once: it justifies the object, it proves he is not hiding anything, and it turns a technical
limit into the offer.

**How n8n fulfils it.** The artefact already exists — node `11 · PDFShift → PDF` makes it today:

- `11a · Print-ready PDF` — a second PDFShift call with print CSS and bleed. Optional; the screen
  PDF prints acceptably if you want to ship without it
- `15a · Queue the print job` — httpRequest to Lulu's Print API `/print-jobs` (or Peecho), passing
  the Supabase object URL and the address. If print-on-demand is not wired for launch, this degrades
  to the 06 pattern with no code change: a row plus an operator "ship this" alert
- Address collected on the upsell screen by `ShippingForm.tsx`, unchanged

**What it costs.** Saddle-stitch A5, 8–12 pages — roughly 75% margin at the price in the table.

| Line | Per order |
|---|---|
| Print | $3.50–$5.50 |
| Post | $4–$8 |
| **Landed** | **$8–$13** |

⚠ **The seven-country limit is the real ceiling, not the cost.** `ShippingForm.tsx` accepts US, CA,
GB, AU, NZ, IE and SG only, and the storefront's own recorded SLA is *21 days or more* for
international. On a 76,718-person list nobody has segmented by country, a share of buyers will see
an offer they cannot take. Either the screen suppresses itself outside the seven, or the seven get
extended before this ships.

**The ask, in Marcus's voice.**

> One thing about the link I'm about to send you. It stops working after seven days. That isn't a
> trick to hurry you along — it's how the file is signed, and I'd rather say it now than have you
> find out in a fortnight when you go looking for it.
>
> So let me print it and post it to you. The same reading, on paper, in an envelope.
>
> Paper doesn't expire. And you can put it somewhere you walk past, which is not something you can
> do with a file.

## U2 · The Standing Instruction

**One line.** One page: the one thing to do, the hour to do it, the sentence to listen for, and what
it means if she gets to the end of the day and hasn't.

**The mechanic.** Four parts, about 250 words, written off the cards she already paid for. It makes
no new claim about her situation, adds no cards, and answers no new question. The daily already
hands 76,718 people one free act every morning — *"catch yourself at the one moment you'd normally
call it not the right time"*. This is that device, written off her own six instead of off the day's
two.

**Why she says yes at that exact moment.** Both branches converge, which is what makes this a pair
and not two products in a queue. Took the paper: *you'll have it in a drawer, and drawers are where
this goes.* Declined it: *you'll read it on a screen, once, and then it's Thursday.* Same gap, and
she reaches it from either side.

**How n8n fulfils it.** ⭐ Zero new fulfilment path, which is the whole reason it belongs here:

- `7h · Compose the instruction` — Code, building the prompt from the same brief object node 4
  already assembles
- `7i · Write the instruction` — one httpRequest model call, ~250 words
- Appended before `10a · Build the HTML`, so it rides the same PDFShift call, the same upload, the
  same signed URL and the same AWeber send. Nothing new can arrive late because nothing new arrives

**What it costs.** About two cents of model time and roughly four seconds.

**The ask, in Marcus's voice.**

> Here's what happens next, and I've watched it happen for fourteen years.
>
> You'll read the reading. All of it. You'll agree with most of it and there'll be one part you read
> twice. Then it'll be Thursday, and Thursday will look exactly like last Thursday.
>
> That's not a failing. Nobody hands you the next bit.
>
> So let me write you the next bit. One page. One thing to do, the hour to do it, the sentence to
> listen for while you're doing it, and what it means if you get to the end of the day and haven't.

**The downsell.** A digital page has no damaged-goods story, so the only honest lever is scope —
which is the same axis the tier ladder already runs on:

> Then take the smallest piece of it. Not the page — the hour. I'll tell you which hour of your day
> this sits in and what to listen for in it, and that's all you'll get, and it's the part that does
> most of the work anyway.

⚠ This is the weakest downsell in the file, and it is a real cost of the pair. A cheap digital item
has nowhere to fall to. Consider running Pair 2's U2 with no downsell at all rather than shaving a
product that is already one page.

## Nearest wall, and why it does not hit it

**Wall 5, nothing later than seven days.** On Paper arrives in 7–14. The wall is a property of the
Supabase signed URL, not a promise made to the buyer — `expiresIn: 604800` binds the file the link
points at. Paper is not signed and does not expire. 06 already ships manufactured goods on a
7-business-day to 1–2 week clock, so the deck has the precedent and the shipping code. And the
reading itself still lands inside 24 hours; the post is a second copy of a thing she already has,
which is why a delay in it can never be a broken promise.

---

# Pair 3 — "Thirty days"

**The time angle.** Sells the prediction, then the delivery of it at the only hour it works.

| | U1 | U2 |
|---|---|---|
| **Name** | **The Check** | **The Thirtieth Morning** |
| **Price** | $37 | $27 |
| **Shape** | one page, digital | a posted letter, timed |
| **Lands** | with the PDF, inside 24 hours | day 30 |
| **Fulfilment cost** | ~$0.03 | $0.90–$2.50 |

## U1 · The Check

**One line.** Three things that will be true in her life thirty days from this morning if nothing
about this changes — dated, written off her own cards, hers to check.

**The mechanic.** The reading answers *what is this*. The ladder answers *why does it keep
happening* and *what is he doing*. Nothing at any price answers **what does it cost me to do
nothing** — the decision doc found that gap itself and called it the only question a second-time
buyer has. It cannot be sold as a reading. It can be sold as a bill.

Written entirely about her: what she will have said, what she will not have said, and what she will
be telling herself on the thirtieth morning. Marcus does not check it. She does, and the fact that
he is not there when she does is the point of the product.

**Why she says yes at that exact moment.** She has just bought an answer and she is about to
discover that an answer changes nothing on its own. The Check is a bet Marcus makes against her own
inertia, in writing, dated, in front of her. Nobody who is sure they will act declines it, and
nobody who is unsure can look away from it.

**How n8n fulfils it.** Identical shape to the Standing Instruction, so if both pairs ship the
second one is nearly free:

- `7j · Compose the check` — Code, from the same brief
- `7k · Write the check` — one model call, ~200 words, constrained to first person about the buyer
- Appended before `10a · Build the HTML`. Same PDF, same send
- ⛔ Rubric line for node `8 · Grade it`: the three statements must be about **her** and must never
  name or predict anybody else. That is one extra line in an existing rubric, not a new grader

**What it costs.** About three cents.

**The ask, in Marcus's voice.**

> I've told you what these cards say. I haven't told you what it looks like if you do nothing with
> them, and that's the part everybody finds out on their own, slowly, over about a month.
>
> Let me write it down instead. Three things. About you, not about anybody else. Dated thirty days
> from this morning.
>
> Then keep the page and check it yourself. I don't need to be there and I'm not going to ask you
> how it went.

## U2 · The Thirtieth Morning

**One line.** The same page, printed and posted, landing on the thirtieth morning.

**The mechanic.** ⭐ The one product in this file that escapes the seven-day link, because it never
touches the link. A letter has no expiry. One side carries the three statements; the other carries a
single line from Marcus and nothing else.

**Why she says yes at that exact moment.** The after-no branch is the strongest in the whole file,
and it is not a discount and not a retry. Took The Check: *you'll have the page, and in thirty days
you'll have forgotten you have it.* Declined it: *then don't have it now. Have it then.* The refusal
is not argued with — it is granted, and the product is re-shaped around it. That is V1's Path B
instinct done properly.

**How n8n fulfils it.** This one does add machinery, and the machinery is the price of admission:

- `15c · Queue the thirtieth` — writes `be_07_post_queue` with `send_on = paid_at + 30d`
- A second, small scheduled workflow: Cron daily → pull due rows → PDFShift the page →
  httpRequest to a letter API (Lob `/v1/letters`, Docmail or Stannp)
- ⭐ Lob schedules up to 180 days out natively via `send_date`, which removes the queue table and
  the cron entirely and makes this a single extra node on the main chain

**What it costs.**

| Line | Per order |
|---|---|
| Letter, domestic | $0.90–$1.60 |
| Letter, international | $1.60–$2.50 |

**The ask, in Marcus's voice.**

> The trouble with a page you keep is that you don't keep it. It's under four other emails by Friday
> and gone by the tenth, and on the thirtieth morning you won't go looking for it, because on the
> thirtieth morning you won't remember there was one.
>
> So let me post it to you. A real envelope, on the thirtieth morning. Three things on one side, one
> line from me on the other.
>
> You don't have to do anything. It just turns up.

**The downsell.** ⭐ The best one in the file, because it is a real reduction with a real reason and
it still clears the seven-day wall — an email carrying the text, rather than a link to a file, has
no expiry at all:

> If a letter's too much, I'll put it in your inbox instead. Same three things, same morning,
> thirty days out. It's not the same as an envelope on the mat and I won't pretend it is — but it
> turns up on the day, which is the whole point of it.

## Nearest wall, and why it does not hit it

**Wall 7, no outcome promises.** The Check states three things that will be true in thirty days. It
does not hit the wall because every statement is about the **buyer**, stated flat, which is exactly
what the $35 reading already does at the position named *who she becomes*. The ban is on promises
about a third party and on guaranteed results; the deck's own record is that predictions get stated
flat and that both the calendar-deadline and third-party regexes were retired from `copy-check` on
purpose. The guardrail sentence from The Table covers the rest and should be repeated verbatim on
this screen.

⚠ Wall 5 is the second-nearest, for the letter. Same answer as Pair 2: the seven days is a property
of the signed URL, and paper is not signed. But be honest about the other cost — a letter posted
thirty days out cannot be recalled, and it will occasionally land on a woman whose situation has
changed completely. That is the highest complaint risk in this file and it is not a technical one.

---

# Pair 4 — "The same cut, twice"

**The widest range, and the only one that grows the list instead of taxing it.**

| | U1 | U2 |
|---|---|---|
| **Name** | **Her Cut, For Someone Else** | **On Paper** *(Pair 2's U1, re-used)* |
| **Price** | $35 | $47 |
| **Shape** | a second reading, on a link she forwards | printed and posted booklet |
| **Lands** | 24 hours after the friend types her question | 7–14 days |
| **Fulfilment cost** | $0.30–$0.60 | $8–$13 landed |

## U1 · Her Cut, For Someone Else

**One line.** One more reading off this morning's cut, for one person she names, at the price she
just paid.

**The mechanic.** The cut is a real morning act and it is over. It is also, and this is the honest
part, big enough for more than one question — Marcus lays it once and reads it against whoever asks.
She gets a link to forward. The other woman types her own question on the ordinary booking page, in
a state that says *already paid, question only*. Marcus never sees who sent it unless she says so.

**Why she says yes at that exact moment.** Somebody came to mind while she was reading. In this
category somebody always does — a sister, the friend who has been in the same four years, the woman
at work. It is also the only ask in this file that lets her do something generous sixty seconds
after doing something entirely for herself, which is a different and easier emotional move than
buying more for herself.

**How n8n fulfils it.** ⭐ Nothing new. Not one node:

- A second `be_orders` row, same `spread` and `draw_date`, `question` null until redeemed
- `/marcus/gift/:token` is the existing booking page in a question-only state
- On submit, the **existing webhook path** runs the **existing workflow** on the second row. Node 3
  loads it, node 4 builds the brief, everything downstream is untouched
- New state to hold: redeemed / unredeemed, one nudge, and a refund rule for a gift nobody claims

**What it costs.** One more full run of the workflow that already exists.

| Line | Per order |
|---|---|
| Opus 5, ~12k in / 7k out, plus one PDFShift call | $0.30–$0.60 |

**The ask, in Marcus's voice.**

> I cut once this morning and those cards are still on the table in front of me. There's room on it
> for one more question, and it doesn't have to be yours.
>
> If somebody came to mind while you were reading — and somebody came to mind — I'll lay this
> morning's cut for her as well. She types her own question. I never see your name next to hers and
> I don't tell her where it came from unless you want me to.
>
> Same price I charged you. Not a discount and not a bundle. One more question, off the same cut,
> while it's still on the table.

## U2 · On Paper *(two states)*

Pair 2's U1, moved to the second slot. It is the deck's most re-usable U2 because it stacks on
anything — there is no purchase it contradicts and no decline it argues with. It also reuses the
V1 shipping-form pattern that already handles exactly this fork.

**Path A — she bought the gift.** Two readings are now coming, both on links that die in seven days.
The offer becomes *both, printed, and hers goes to her own address if you want it to* — which is
the Manifestation Bracelet's shipping-reuse fork, unchanged.

**Path B — she declined it.** ⛔ The decline is never re-litigated. The offer is Pair 2's U1 word for
word, which is the right shape after a no: it argues from a fact about her own product rather than
from the thing she just turned down.

**The ask, in Marcus's voice** *(Path A opening only — Path B is Pair 2's U1 unchanged)*.

> That's two of these coming, then. Hers and yours, off the one cut, which I don't do often.
>
> Both of them arrive on a link that stops working after seven days. That's how the file is signed
> and it's the same for everybody.
>
> Let me print them instead. Yours to you. Hers to her, if you'd rather she opened an envelope than
> a link — and if you'd rather she didn't know it came from you, an envelope is better at that than
> an email is.

**The downsell** *(Path A only)*. Halve the shipment, not the price of the object:

> Then just yours. One envelope, one address, and hers stays a link. That's the cheaper end of it
> and it's the one most people take.

⚠ On Path B the downsell has to be a price move, not a scope move, because there is only ever one
booklet to print. That is the one place this pair needs a number the deck has not set.

## Nearest wall, and why it does not hit it

**Wall 4, no packs and no volume discounts.** Spec §7 bans a pack, a cap and a discount for volume.
This is one reading, at full price, for a different person, on a separate payment. Nothing is
banked, nothing is capped and nothing is cheaper for being bought twice. ⛔ The moment it is priced
below the front end it becomes precisely the thing §7 bans, so the price is not a lever here — it
is the compliance.

⚠ The real objection to this pair is tonal, not structural. She has just typed the most private
sentence she has typed all year and paid a stranger to read it. Turning to her sixty seconds later
and asking her to think about somebody else is the one ask in this file that could read as
merchandising. It is also the only one that puts a new subscriber on a 76,718-person daily list, at
a customer-acquisition cost of nothing, which on a recurring programme is worth more than the $35.

---

# The comparison

Take-rates are **reasoned estimates, not data.** 07 has taken no money, so there is no 07 baseline
to anchor on. The reasoning is: post-purchase upsells in this category run roughly 10–30% on U1 and
5–15% on U2; an ask priced above the front end suppresses take; an address form and a wait suppress
it further; instant digital delivery lifts it; and the emotional register of the moment matters more
here than in any other offer in the deck, because she has just disclosed something.

| Pair | U1 | U2 | Est. take U1 | Est. take U2 | Fulfilment cost | Build effort | Risk to the daily |
|---|---|---|---|---|---|---|---|
| **1 — Told, then carried** | The Sitting $47 | The Marker $27 | 12–20% | 8–14% | $0.30–$1.10 · $4–$8 | **High** — a TTS branch, a voice to choose and licence, plus pick-and-pack | **Medium-high.** Not the funnel — the voice. A wrong Marcus contaminates every morning letter |
| **2 — Off the screen** | On Paper $47 | The Standing Instruction $27 | 15–25% | 12–20% | $8–$13 · $0.02 | **Medium** — one print API or the 06 manual pattern; U2 is two nodes | **Low.** Nothing new can be late, because the reading still lands in 24h and the paper is a second copy |
| **3 — Thirty days** | The Check $37 | The Thirtieth Morning $27 | 18–28% | 10–16% | $0.03 · $0.90–$2.50 | **Medium** — U1 is two nodes; U2 needs a letter API and a scheduled send | **High.** An un-recallable letter arriving a month later, to a woman whose situation may have changed |
| **4 — The same cut, twice** | Her Cut $35 | On Paper $47 | 6–12% | 12–20% | $0.30–$0.60 · $8–$13 | **Low-medium** — no new nodes at all, but a redemption state, a nudge and a refund rule | **Medium.** Tonally the riskiest ask; strategically the only one that *feeds* the list |

**Why Pair 3's U1 estimate is the highest and its pair is still not the recommendation:** The Check
is the easiest yes in the file — cheap, instant, and it names a fear she already has. Its U2 is the
most dangerous object in the file. A pair is only as safe as its second screen.

**Why Pair 4's U1 estimate is the lowest:** it is the only ask that requires her to think about
somebody other than herself at the exact moment she has finished thinking about herself.

## Recommendation

**Ship Pair 2 — On Paper and The Standing Instruction.** On Paper has the only ask sentence in this
file that is a verifiable fact about the product she has already bought — the link really does die
in seven days — and telling her that unprompted buys more trust than it costs in sales, while also
being the physical object the operator asked for at the cheapest possible fulfilment. The Standing
Instruction rides the existing PDF on two extra nodes and cannot arrive late, break a promise or
generate a support ticket, so the pair's entire downside is bounded by the print run. Build The
Sitting next and test its voice on the free daily before it is ever attached to money, because the
audio idea is the strongest *product* in this file and the riskiest *asset*.

---

## Build notes

### ⛔ `copy-check` blocks three of these prices today

`scripts/copy-check.cjs` allows offer 07 only `$35.00 · $35 · $57 · $87 · $12.77`, and its
`ALL_PRICES` list has no `$27` or `$37` at all. Every price in this file therefore lives in a table,
which `bodyOf()` strips, and no ask sentence quotes a number — which is also correct on the deck's
own terms, since 02's opening beats carry no price either and the price lives in `SOLUTION` onward.

Before any of this can appear as page copy, whichever pair is chosen needs its two prices added to
both lists:

```js
'07': { name: 'Marcus Daily Tarot', sla: /\b24 hours?\b/i,
        prices: ['35.00', '35', '57', '87', '12.77', '47', '27'] },
```

### 🔴 One line on the booking page still has to change

`07-C1` beat 11 and beat 14 both say **"One payment. Nothing recurring."** The "nothing after it"
promise has already been removed, but "one payment" is still false the moment a U1 screen appears
sixty seconds later. It should read *"One payment for this reading. Nothing recurring."* — which is
true with or without upsells, and which is the smallest edit that keeps the sixth agreement honest.
This is a change to the page's honesty, not a side effect of picking a pair, and it is condition 1
of the reopening test.

### What every pair still needs before it can be built

| # | Open | Blocks |
|---|---|---|
| 1 | `upsells[]` on the payload from `GET /api/be/07/fulfilment/:sessionId` | every pair — n8n cannot branch on a purchase it cannot see |
| 2 | `be_marcus_daily` in `shared/backendOffers.ts`, plus the U1/U2 prefixes in `lib/backendOffers.ts` | every pair — the resolver is prefix-keyed and 07 has no entry |
| 3 | Where the question box sits *(open thread 1)* | Pair 4 especially — the gift link is the booking page in a question-only state, which is the two-step page already under discussion |
| 4 | 🔴 A hosted-checkout fallback on `/api/backend/upsell/charge` | **every pair.** V1 has one; backend offers do not. Without it every refused off-session charge is an unrecoverable lost sale and the buyer just sees "try once more" |
| 5 | 🔴 A "ship this" operator alert on the upsell path | Pairs 1, 2 and 4. The V1 upsell path ends at a log line; `braceletOrders.ts` is the only working alert and it belongs to the storefront |
| 6 | Whether `ShippingForm.tsx`'s seven countries are enough, or the screen suppresses itself outside them | Pairs 1, 2 and 4 |
| 7 | Thursday's missing `$57` and Saturday's missing `$87` | nothing here, but it blocks taking money at all, so it comes first |

### Deliberately not proposed

| Idea | Why not |
|---|---|
| A deck, a cloth, a "how I lay them" manual | Wall 8. Teaches her to do the thing that produces fewer orders. The method is also free in all seven dailies |
| The photograph of her own draw | `07-C1` open thread 2 already ruled it belongs **inside** the product at every tier, free. Selling it back is the one move that would make $35 look partial |
| A follow-up question, an extra question, a double-check | Needs new input from her, which is the intake, which is downstream of both screens |
| Anything monthly, banked, or capped | Spec §7, and a recurring charge sold to a dormant list on a sending domain Evelyn's thirteen live lists share is a bet-the-list risk behind a small product |
| A chat handoff to `/marcus` | Settled separately, and not reopened here |

### Sources

`README.md` · `07-C1` · `07-C2` · `07-P1` · `07-P2` · `daily/07-D-tue-two-doors.md` ·
`docs/07-marcus/07-upsell-decision.md` · `docs/07-marcus/07-fulfilment-README.md` ·
`docs/07-marcus/07-fulfilment.n8n.json` *(node names quoted verbatim)* ·
`docs/07-marcus/market-research.md` · `docs/07-marcus/dryrun-soulmate-spread.md` ·
`docs/0-WORKFLOW.md:281` · `docs/00j-WORKFLOW-UPSELLS.md` · `copy/02/02-U1a` · `copy/02/02-U2a` ·
`scripts/copy-check.cjs`

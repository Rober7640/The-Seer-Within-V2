# 0-WORKFLOW — building a backend offer, together

A working checklist for you and Claude to run in one chat. Works for **any offer
in the deck** — 03, 04, 05 and whatever comes after.

Two halves:

- **Phase A — the funnel.** Booking page → order bump → upsell 1 → upsell 2 →
  thank-you page → wiring → tests. This is how she buys.
- **Phase B — the product.** The reading itself: planned, written to length,
  formatted as a Word doc, exported to PDF, with the tarot cards inserted. **This
  is the thing she actually paid for.**
- **Phase C — the customer list, and the two emails it sends.** She joins the
  backend deck's own AWeber list the moment she pays. That is what sends her the
  thank-you, and later the one that delivers the reading.

**How we use it:** Claude does one step, shows you, and waits. You approve or
send it back. Nothing goes live — none of these offers has Stripe yet, so no
button charges anyone.

**Say this to start:**
> Read `improve-v1/v1-one-time-BEs/docs/0-WORKFLOW.md` and build offer `<number>`.

**Say this to pick it up again later:**
> Read `improve-v1/v1-one-time-BEs/docs/0-WORKFLOW.md` and do the next unticked
> step for offer `<number>`.

### 📋 Every new offer gets its own copy of this file

```
cp docs/0-WORKFLOW.md docs/<nn>/0-WORKFLOW-<nn>.md
```

**This file is the single source of truth.** ⛔ It is never ticked — the steps
stay empty so every new offer reads them clean. The copy is where the offer is
worked: ticked, answered, annotated.

| | Master *(this file)* | The offer's copy |
|---|---|---|
| The steps, and the **rules and craft** learned while building | ✅ the only home | ⛔ never edited there |
| ☑ **Ticks**, worksheet answers, decision answers, notes | ⛔ never | ✅ that is what it is for |
| Every screen's URL | ✅ the whole deck, one table | ✅ that offer's rows only |
| What was built and every departure from the copy specs | ⛔ | the offer's deliverables doc — 03's is [`00l`](./00l-DELIVERABLES-03.md) |

⛔ **Learned something general while building? Write it HERE first, then pull it
down into the copy.** A rule improved only in a copy is a rule the next offer
never gets — which is exactly how 02's chat ended up an older shape than 03's
without anybody deciding it should be. That is the one failure mode of working
in copies, and it is avoided by hand, every time.

**Live copies:** [`03/0-WORKFLOW-03.md`](./03/0-WORKFLOW-03.md).

---

## Where each offer stands

| | Archetype | Money | Needs her reply? | Product | Funnel |
|---|---|---|---|---|---|
| **02** Twin Flame | Reading | $35 fixed + bump | no | written, 4,821 words, 12 cards | ✅ built — [`00i`](./00i-DELIVERABLES-U1-U2.md) |
| **03** Judgement Day | **Act** | pay-what-you-want | **yes** | written, 2,429 words | ◐ booking built, upsells not — tick sheet in [`00l`](./00l-DELIVERABLES-03.md), upsells planned in [`00k`](./00k-PLAN-03-UPSELLS.md) |
| **04** The Turn | Reading | ladder $35→$47→$57→$67 | no | written, 3,714 words | not analysed |
| **05** Hex Her | — | — | — | — | ⚠ no copy at all yet |

⚠ **"Written" means the words exist in a markdown file.** No product has been
formatted, had its cards inserted, or been made deliverable. Phase B has never
been run.

---

## 📎 Every screen we have built, and how to see it

**One row per screen that renders.** Keep it current as you build — a screen
nobody can find is a screen nobody reviews, and by the next session the URL and
the query string that makes it work are gone. See rule 7.

Local base: `http://localhost:5000`, after `npm run dev`.
⛔ **Nothing here charges.** Every button logs `[preview] would checkout {…}`.

### 02 — Twin Flame *(Reading · $35 fixed + bump)*

| Screen | Path | Treatment | State |
|---|---|---|---|
| Booking | `/tarot/twin-flame/preview-page` | page | ✅ built · preview |
| Booking | `/tarot/twin-flame/preview-chat` | chat | ✅ built · preview |
| Upsell 1 — Protection Ritual | `/tarot/twin-flame/welcome1?demo=true` | chat | ✅ built · preview |
| Upsell 2 — Manifestation Bracelet | `/tarot/twin-flame/welcome2?demo=true` | chat | ✅ built · preview |
| Thank-you *(receipt)* | `/tarot/twin-flame/success` | page | ✅ built · preview |

⚠ `?demo=true` is **required** on the two upsells — without it they expect a real
conversation in the database and will not render.
⚠ 02's booking sits at `preview-page` / `preview-chat` because two treatments
were competing. 03 puts the page at the offer root instead, which is where the
letter's `{{BOOKING_URL}}` actually points.

### 03 — Judgement Day *(Act · pay-what-you-want · needs her reply)*

| Screen | Path | Treatment | State |
|---|---|---|---|
| Booking · step 1 **Agree** | `/wiccan/judgement-day` | page | ✅ built · preview |
| Booking · step 2 **Give** | `/wiccan/judgement-day?step=give` | page | ✅ built · preview |
| Booking | `/wiccan/judgement-day/chat` | chat | ✅ built · preview |
| Upsell 1 | — | chat | ❌ not built (A4). Copy drafted in `copy/03/03-U-upsell-beats.md` |
| Upsell 2 | — | chat | ❌ not built (A5) |
| Thank-you = **the Entry form** | — | page | ❌ not built (A6) ⚠ load-bearing: the booking screens no longer ask her for the Entry anywhere |

Query strings that change what you see:

| Add | To | Shows |
|---|---|---|
| `?fn=Sarah` | either booking treatment | what the letter passes down. ⚠ Nothing displays it — it rides through to checkout |
| `?step=give` | the booking page | step 2 — ⛔ only if the four boxes were ticked this visit. A cold link bounces to step 1 |
| `?cancelled=1` | the booking chat | the back-from-Stripe door, with its own copy |

### 04 — The Turn · 05 — Hex Her

Nothing built. 04 is `/wiccan/tea-reading`, 05 is `/wiccan/hex-her` when they
come — named in D1 so they slot in beside 03.

### Not this deck, but next door

| Screen | Path | Note |
|---|---|---|
| V1 funnel | `/` | ⛔ **live and taking money.** Six funnels share its code — the walks assert it still serves |
| Paywall redesign | `/paywall-preview` | separate work, behind a disabled flag |

### The proof

| | Evidence |
|---|---|
| 02 | see [`00i`](./00i-DELIVERABLES-U1-U2.md) |
| 03 booking, split | [`03-booking-split-2026-08-09`](../../evidence/03-booking-split-2026-08-09/README.md) — 50 page assertions, 47 chat |
| 03 booking, single page *(superseded)* | `improve-v1/evidence/03-booking-2026-08-08/` |

```
node improve-v1/v1-one-time-BEs/scripts/walk-03-booking.mjs      improve-v1/evidence/<folder>
node improve-v1/v1-one-time-BEs/scripts/walk-03-booking-chat.mjs improve-v1/evidence/<folder>/chat
```

---

# Step 0 — the worksheet

**Fill this in first. It decides everything else.** Claude reads the offer's copy
specs and proposes the answers; you confirm.

| Question | Where the answer is | This offer |
|---|---|---|
| Reading or Act? | `0X-C1` header row | |
| How is it priced? | `0X-C1` — fixed, pay-what-you-want, or a ladder | |
| Does the work need a reply from her? | `0X-C1` statement 7b, `0X-T1` | |
| Does the booking page promise anything only code can keep? | `0X-C1` — capacity caps, deadlines | |
| What is the one sentence both upsells sell? | `0X-P1` | |
| How long is the product, and how many cards? | `0X-P1` — count the words and the `[IMG-…]` tags | |
| What loops did the sales letter open? | `0X-E2` — and which product section closes each | |

### ⛔ SETTLED: the upsells use no personal details

**The upsells never use anything we collected about her.** No situation, no
concern, no name of the person she is asking about, no how-long. Not because we
cannot get them — because that is the decision.

The order never changes:

```
  booking page → SHE PAYS → upsell 1 → upsell 2 → thank-you page → the product
```

So every upsell is written to be true for every buyer of that offer, and the
specifics come from **the product**, not from her. 02's upsells name houses 2, 5
and 12 out loud, and every buyer's spread has all three.

The only exception is her **first name**, if checkout captured one. If it did
not, Evelyn says "dear" and nothing is lost.

⚠ Drafted upsell copy that merges a detail — 03 has four such tokens — gets the
sentence **cut**, not filled in. This is not a per-offer question. It is the rule.

**The product is the opposite.** It is personal, it merges her name throughout,
and for an Act offer it is written from the intake she replies with. Keep the two
straight: impersonal upsells, personal product.

---

### Her first name — AWeber has it

She arrives from an AWeber letter, and AWeber knows her name. So it just has to
be carried down the chain:

```
  AWeber letter                 {{ subscriber.first_name | capitalize }}
        │  CTA link:  {{BOOKING_URL}}?c=1&fn=<name>
        ▼
  booking page                  reads ?fn=, keeps it for the tab
        ▼
  checkout                      sends it as Stripe metadata.firstName
        ▼
  conversations row             /api/upsell/user-data reads it from there
        ▼
  upsells · thank-you · product email
```

**What to build:** the booking page reads `?fn=` and passes it to checkout. That
is the whole job, and it is the difference between "Thank you, Sarah" and "Thank
you, Friend" on every screen after the money.

- ⚠ **URL-encode it.** Names have spaces and apostrophes. O'Brien breaks a query
  string that was not encoded.
- ⚠ **Keep it to the first name.** Do not put her email in the URL — it shows up
  in server logs and referrer headers, and the name alone is enough.
- ⚠ **Keep the fallback.** She may forward the letter, or open the page without
  the parameter. Then it is "dear", which reads fine, and `displayName()` already
  turns the literal `"Friend"` into it.

---

## Rules that hold for every offer

1. **The money comes first, then the upsells.** Always.
2. **The upsell must not fight the product.** Find the trap before writing. 02
   sells the stone as what she does *instead of* investigating, because the
   product tells her not to investigate. 03 sells *choosing* what fills the
   space, never a feeling to fill it with, because the product promises calm.
3. **Nothing reused from the old funnel may mention a "clearing"**, an "energy
   field", or "our conversation". It leaks 14 times and none of it is true here.
4. **Never print a blank where a detail should be.** Cut the sentence instead.
5. **The live funnel must not change.** Six funnels share this code. The tests
   prove it, step by step.
6. **Questions are free.** She answers in the chat and Evelyn uses it two
   messages later — no stored data needed. Drop them only if you want them
   dropped. 02 has none because you asked for that on 02; it does not carry over.
7. 📎 **Every screen that renders gets a row in *Every screen we have built*
   above** — its path, its treatment, its state, and any query string needed to
   see it. Do it the moment it renders, not at the end of the step. ⚠ Keep the
   **state** column honest too: a row still saying *preview* after Stripe lands
   is worse than no row.
8. **She joins the customer list the moment she pays, and the tag IS the send.**
   One AWeber list for the whole deck, one tag per offer, and an AWeber Campaign
   triggered by that tag is what puts her thank-you in her inbox. So the
   list-add is not bookkeeping to be done later — a failed write is a woman who
   paid and got nothing. See C0.

## What the archetype changes

| | **Reading** (02, 04) | **Act** (03) |
|---|---|---|
| Thank-you page | a **receipt** — confirm, name the email subject, stop | the **intake itself** — a form she fills in on the page, ⚠ not an instruction to reply to an email (03, 2026-08-09) |
| Her details | may exist at checkout | arrive later, by reply |
| Product shape | one section per card | a verdict, then what to do about it |
| Product length | 3,000–5,000 words | shorter by nature — see Phase B |
| Upsell may threaten | what reaches her while she waits | her own openness, never a person coming back |

## What the pricing model changes

| Model | Booking page needs | Built? |
|---|---|---|
| Fixed + bump (02) | a total and a bump card | ✅ yes |
| Pay-what-you-want (03) | an amount box she types in, empty, with a floor that is **enforced, never printed, and never spoken mid-keystroke** | ❌ new |
| Ladder (04) | four price options, one chosen | ❌ new |

---

## The decisions Claude must stop and ask

⚠ **The answers go in the offer's deliverables doc, not here.** 03's are in
[`00l`](./00l-DELIVERABLES-03.md), with the reasoning kept — a decision without
its why gets re-litigated every time somebody new reads it.

| # | Decision | Asked at |
|---|---|---|
| D1 | The URL this offer lives at (02 is `/tarot/twin-flame`) | A1 |
| D3 | Any promise on the booking page that needs code — capacity caps, deadlines. **Build it, or cut the sentence** | A2 |
| D4 | Money limits — the floor for pay-what-you-want, or the rungs of a ladder | A2 |
| D11 | **One page, or one job per screen** — split it once the booking page passes ~2 phone screens | A2 |
| D5 | Product length, if it is currently under 3,000 words | B1 |
| D6 | Card artwork — the public-domain deck we already hold, or something commissioned | B4 |
| D7 | **One PDF per buyer (merged, automated) or one PDF for everyone** — decides whether Word is a per-order step or a one-off design step | B5 |
| D8 | PDF attached to the email, or hosted and linked | B6 |
| D9 | The free gift as a closing section of the same PDF, or its own file | B6 |
| D10 | How long after delivery the next offer sends, and in which email | C2 |

⚠ **There is no D2** — the gap predates this file and no reason for it survives.
Left as it is: the offer docs cite these by number, so renumbering would break
every citation to buy nothing.

---

# Phase A — the funnel

### ☐ A1. Fill in the worksheet, settle D1
Claude proposes, you confirm. Ten minutes, and it unblocks everything. Write the
answers into **the offer's deliverables doc**, not here.

### ☐ A2. The booking page — **and its chat**
**Read:** `0X-C1`, and `00e-FRAMEWORK-BEs.md` §3.

⚠ **A booking page over about 2 phone screens should be split** *(learned on 03,
2026-08-09)*. 03's measured 3,450px — 4.1 screens of unbroken commitment copy
before the button, and it leaks silently at whatever depth she gives up. One
job per screen: assent, then money. The rules that make it survivable —

- **Step one must cost nothing.** No keyboard, no price. Say so out loud on it.
- **Its button is her own sentence**, not *Next*.
- **The step goes in the URL**, so the browser's own Back walks between steps
  instead of leaving the funnel, and her ticks survive it.
- ⛔ **A cold arrival at a later step goes back to step one.** Consent not given
  in that page's lifetime is never assumed.
- **The bump does not get a screen of its own** — inline beside the total is the
  whole reason a bump converts.
- ⚠ **Two screens means two numbers.** That is half the argument for splitting;
  wire the drop-off measurement when the offer gets tracking.

⚠ **This step has TWO deliverables, not one** — a gap in an earlier draft of
this workflow, found on 03 *(operator, 2026-08-08)*. Every offer needs a **page
treatment AND a chat treatment**, because the letter's CTA has two candidates
for what it lands on. 02 built both (`TwinFlameBookingPage` /
`TwinFlameBookingChat`) and 03 now does too (`/wiccan/judgement-day` and
`/wiccan/judgement-day/chat`).

The chat is not a re-skin of the page. What changes:

- **Fewer statements, one line each.** The page is faithful to the source
  package; the chat is the 3-point commitment gate — plus any the archetype
  forces. 03 runs four because an ACT offer's intake agreement cannot be
  dropped.
- **Evelyn speaks in the stream, never inside the card.** The card is the
  buyer's first person, exactly as the page is.
- **The bump is its own TURN, after she has committed**, and it is rewritten in
  Evelyn's voice as a question. The page's bump is a checkbox label — right
  there, wrong here.
- **Resume copy exists**, for a refresh and for the Stripe cancel round-trip.
  ⛔ Position is restored; consent never is. ⚠ **A refresh is not a return** —
  she never left, so do not greet her for coming back. That line belongs to the
  Stripe round-trip alone, where it is true, and there it should also say
  **nothing has been taken**: she has just walked off a payment page and that is
  her live question.
- ⚠ **The letter re-argues nothing.** The chat is a greeting and a close.

**How it is paced** *(learned on 03, 2026-08-09 — applies to every offer's chat)*

- **One sentence per turn.** A beat's lines must not land as a block: that is a
  transcript being pasted in, not somebody talking.
- ⛔ **Never a flat delay.** If every line takes the same time, a three-word
  greeting and a ninety-character sentence arrive at the same speed, and the
  reader knows it is a machine before she can say why. Pace on **character
  count, with run-to-run variance** — `client/src/lib/chatPace.ts` does this and
  is ready to reuse.
- **Faster than a reading chat.** V1's `lib/typing.ts` runs 60ms/char up to five
  seconds, which is right for a reading and wrong here: this sits between the CTA
  and Stripe, and latency in front of a payment reads as a slow payment. 03 runs
  ~18ms/char, capped at 2s, whole run to the card ~3.5s.
- **Open on her already writing** — the typing indicator, not a wall of text that
  was always there, and not a blank screen either. Use V1's own three-dot markup
  (`ChatPage.tsx`) so every chat looks like the same woman at the same keyboard.
- **The card gets its own beat**, rather than landing on the heels of the last
  sentence. It is the payoff.
- ⚠ **Assert the pace in the walk**, or a later edit flattens it back silently.
  03 times the long line and fails under 1.2s.

⛔ **Copy 03's chat, not 02's.** `TwinFlameBookingChat.tsx` predates all of the
above and still reveals a beat's lines as a block with no paced typing. It is
the older shape, not the agreed one, and 02 should be ported when it is next
opened.

Statements in **her** voice — Evelyn does not speak on this page. Then the money
part, the bump, the button.

⚠ On an Act offer, the statement where she agrees to reply with her details is
the most important sentence on the page. Without that reply the work never
starts.

**Done when:** it renders, the button only appears once she has ticked
everything, it logs instead of charging, and 📎 **both treatments have rows in *Every screen
we have built*** with whatever query string they need.

### ☐ A3. The order bump
**Read:** `0X-C3`.

Sits inline beside the total, and is **never pre-checked** — a pre-selected paid
add-on is a negative option under FTC and card-network rules.

⚠ It must carry **its own product code**. The fulfilment robot matches on that
exact text, so a reused code sends her the wrong thing.

### ☐ A4. Upsell 1
**Read:** `0X-U*` (the U1 sections), and [`00j`](./00j-WORKFLOW-UPSELLS.md).

Most of the copy is already drafted. Claude wires it in and keeps the questions
unless you say otherwise.

⚠ The "her situation" block is **one block for everyone**, built from facts true
of every buyer's product. Any drafted variants that key off her details are not
used — see the settled rule above.

### ☐ A5. Upsell 2
**Read:** the U2 section of the same file.

Two openings: one for buyers who took upsell 1, one for those who didn't.

⚠ Cut any detail we do not have by then. ⚠ The two AI-written passages in the old
flow get replaced with fixed copy unless this offer genuinely knows her concern
at that moment.

### ☐ A6. The thank-you page
**Read:** `0X-T1`.

Receipt or intake — see the archetype table. Getting this backwards is the
easiest mistake in the build.

⚠ The email subject line shown here must match the product email **exactly**.

⚠ **On an ACT offer this screen IS the intake**, and on 03 it is now
load-bearing: the booking page no longer asks her for the Entry anywhere. It
needs the form (who, what they did, how long), a *"send me the link"* escape for
the woman who cannot write it at that moment, and — because she has already paid
— a **fallback record** for whoever never comes back. ⛔ A paid product must
never fail to arrive.

### ☐ A7. Wiring and tests
Routes for all four pages. Test file copied from 02's and re-pointed.

⚠ Tests must prove the live funnel is untouched. ⚠ The offer needs the scrolling
fix 02 has, or its buttons sit below the fold.

📎 **Then reconcile the whole offer against *Every screen we have built*** —
every route registered here should already have a row, and this is where a
missed one shows up. Rows added at the end of a build are the ones with the
wrong query string in them.

### ☐ A8. Walk it and screenshot it
Claude drives a real browser through the whole thing and saves the screenshots so
you can read the flow without sitting through it.

---

# Phase B — the product

This is what she paid for. Everything in Phase A is packaging.

**The product is a PDF**, built from a Word document, with the cards inside it.

A product that arrives thin, late, or looking like a plain email undoes the whole
funnel — and it is the only part she will judge you on afterwards. Refunds happen
here, not on the booking page.

### ☐ B1. Scope it

**Target: 3,000–5,000 words** for a Reading. That is not padding — it is what
makes a $35–$67 reading feel like a night's work by a person rather than
something generated. Where we are:

| Offer | Now | Verdict |
|---|---|---|
| 02 | 4,821 words, 12 cards | in range |
| 04 | 3,714 words | in range |
| 03 | 2,429 words | ⚠ under — but it is an Act, and a verdict is not a reading |

⚠ **Decision D5 for anything under 3,000.** An Act product closes an account and
tells her what to expect; padding it to 4,000 words would work against the
promise of *put it down and sleep*. My recommendation is to leave 03 short and
let its shape justify it — but say so deliberately, not by accident.

Also settle here:

- **How many sections**, and what each one is. A Reading is usually one section
  per card. An Act is a verdict, then the practical part.
- **The second act.** The free gift (`0X-P3`) renders *inside* the same email as
  a second act — never as a separate send. 02's is the first house; 03's is Nine
  Nights of Water. Announcing it twice spends it twice.
- **The subject line**, which must match `0X-T1` word for word.

### ☐ B2. Plan the structure before writing a word

Build the map first. For a Reading, that is a table with one row per section:

| Position | Card | What it has to do | Which letter loop it closes |
|---|---|---|---|

Then check three things:

1. **Every loop the sales letter opened is closed by a named section.** 02 opened
   three — which door the money comes through, renewal or arrival, and who the
   Tower is — and each is answered in a specific house. If a loop has no closer,
   the buyer has paid to be told the same question again.
2. **No card repeats a card she already saw free.** 02's twelve deliberately have
   zero overlap with the six in the letter.
3. **The arrangement means something.** 02's rule: *read all twelve before you
   decide what it says, because the meaning is in the arrangement.* That only
   holds if the arrangement was designed.

⛔ **Do not reorder positions or reassign cards later without re-reading the
letters.** Three withholds, three answers, and she has the letter in her inbox
where she asked for each one. The upsells reference these too — 02's upsells name
houses 2, 5 and 12 out loud.

### ☐ B3. Write it

**Read first:** `00e-FRAMEWORK-BEs.md` §6a (units) and §6b (rules), plus
`0X-P1`'s own build notes.

Voice rules that matter most:

- **Evelyn's register, not horoscope filler.** 02-P1 says it plainly: no "cosmic
  forces have aligned in your favour". Plain, direct, a bit blunt, British.
- **Say the answer.** *"It is the arrival."* *"It is the second."* A reading that
  hedges every verdict reads as a machine covering itself.
- **Every section ends with something to do.** Not a feeling — an instruction she
  could carry out this week.
- **A warning belongs in most sections**, and it should name a behaviour rather
  than a person.
- **Inoculate early.** 02 tells her some cards will look like they contradict
  each other, and to read all twelve before deciding. That one paragraph
  prevents a refund request from someone who stopped at section three.
- **`%FIRSTNAME%` throughout**, at the density the spec sets.

Per-section shape that works: *name the card and the position → what it means
here, specifically → the condition or instruction → the warning that belongs to
it.*

### ☐ B4. Insert the cards

We already hold a full public-domain deck. **Nothing needs buying or drawing.**

- **Source images:** `assets/tarot-rws/<slug>.png` — 78 cards plus reversals,
  Rider-Waite-Smith from Wikimedia Commons, public domain (`index.json` records
  the provenance).
- **Slugs are not what you would guess.** Most majors carry a `the-` prefix, and
  the spelling is British:

  | In the doc | File |
  |---|---|
  | `[IMG-MAGICIAN]` | `the-magician` |
  | `[IMG-PRIESTESS]` | `the-high-priestess` |
  | `[IMG-HIEROPHANT]` | `the-hierophant` |
  | `[IMG-CHARIOT]` | `the-chariot` |
  | `[IMG-STRENGTH]` | `strength` |
  | `[IMG-WHEEL]` | `wheel-of-fortune` |
  | `[IMG-JUSTICE]` | `justice` |
  | `[IMG-HANGEDMAN]` | `the-hanged-man` |
  | `[IMG-DEATH]` | `death` |
  | `[IMG-TEMPERANCE]` | `temperance` |
  | `[IMG-DEVIL]` | `the-devil` |
  | `[IMG-JUDGMENT]` | ⚠ `judgement` — the file is spelled the British way |

- **Upload them:**
  ```
  node improve-v1/v1-one-time-BEs/scripts/host-be-asset.cjs card the-magician wheel-of-fortune …
  ```
  They land at `evelyn/tarot-rws/<slug>.jpg`, converted to JPEG, cached forever.
  The script is safe to re-run.

- ⛔ **Never write to `evelyn/tarot/`.** That prefix serves tarot emails already
  sitting in inboxes and others already scheduled; overwriting a key changes the
  artwork inside mail that has shipped. The script refuses, by design.

- **Display at 240px wide.** Source cards are 350×600, so they are converted, not
  resized — resizing them down and back up softens the art.

- ⚠ **The reading must work with images switched off.** Many clients block them
  by default. Name the card in text next to every picture, and give every image
  real alt text. A reading that becomes a column of broken boxes is a refund.

### ☐ B5. Format it as a document

**The product is a PDF, not an email.** The email is only the envelope — it says
"here it is" and carries the link or the attachment. That decision changes
everything about formatting: forget 600px widths and Gmail clipping, and think
about pages, margins and where the page breaks fall.

**The chain:** markdown → **Word (.docx)** → **PDF**.

The Word file in the middle is the point. It is the version a human can open and
adjust before anything is sent — nudge a card, fix a widow, re-break a page.

#### What is on this machine

| Tool | Status |
|---|---|
| Microsoft Word | ✅ installed |
| pandoc (markdown → .docx) | ❌ needs `brew install pandoc` — one command |
| LibreOffice / wkhtmltopdf | ❌ not installed, not needed |
| Playwright (HTML → PDF) | ✅ installed — the fallback route |

**Recommended:** install pandoc. Then `0X-P1.md` converts straight to a .docx
that carries our styles, using a **reference document** — a Word file that
defines what Heading 1, Heading 2 and body text look like. Build that once and
every offer inherits it.

**Fallback if you would rather not install anything:** write the reading as HTML
and print it to PDF with Playwright, which is already here. Full control over
page breaks through print CSS. ⚠ But there is no Word file in that route, so
nobody can hand-adjust it.

#### Page design to settle once, then reuse

- **Page size.** US Letter, unless most buyers are elsewhere. A4 pages print
  wrong on US printers and vice versa.
- **A cover page.** Her name, the offer's title, the date, one card. This is the
  single cheapest thing that makes a PDF feel like a product rather than a
  document. 
- **Margins wide enough to read** — 1 inch minimum, more if the line length feels
  long.
- **One card per section**, sized so the section heading and the card sit on the
  same page. A card stranded alone at the top of a page looks like a mistake.
- **Page breaks between sections.** Twelve houses should be twelve openings, not
  a wall.
- **Page numbers and a running header** with her name or the offer title.
- **Serif for the body.** It is a reading, not a dashboard.
- ⚠ **Check the last page.** Documents that end mid-sentence at a page break, or
  leave one orphan line on a final page, look unfinished.

#### The bit that decides the pipeline

Her name is merged all through the text. So either:

- **one PDF per buyer**, generated with her name in it — which means this has to
  be automated, not hand-finished in Word each time; or
- **one PDF for everyone**, with the personal address living in the covering
  email instead.

⚠ **This is decision D7 and it changes the build.** Hand-finishing in Word does
not scale past a few orders a day; a fully automated merge means the Word step is
a *design* step done once, not a per-order step.

Sensible middle: design the template in Word once, export it as the reference,
then let the code merge each buyer's copy and produce her PDF automatically.

### ☐ B6. Make it deliverable

The seam already exists: **`getReadingBody(offer, buyer)`**. Build against it —
it just returns a PDF path or URL now rather than an HTML body.

- **Attachment or link?** Decision D8. An attachment feels more like a product
  and works offline. A link keeps the email light, can be re-downloaded, and lets
  you fix a mistake after sending — which an attachment can never do. Big PDFs
  also hurt inbox placement.
- **If it is a link,** host it somewhere durable with an unguessable URL, and
  keep it working — she will come back to this months later.
- **The subject must match `0X-T1` exactly.** The thank-you page told her what to
  look for.
- ⚠ **Store what was actually sent** (`be_orders.reading_body`, or the generated
  file). A re-send has to be identical, and support needs to see what she got.
- **The free gift** (`0X-P3`) goes in the same PDF as a closing section, not as a
  second file. Two attachments look like admin; one document looks like a
  reading. That is decision D9 if you disagree.

### ☐ B7. The gate before it ships

Every box, every time:

- ☐ Word count in range (or D5 answered).
- ☐ Every loop the letter opened is closed, by name.
- ☐ Every `[IMG-…]` replaced with a real card image, at the right size.
- ☐ No `%TOKEN%` left unmerged. No blanks anywhere.
- ☐ Subject matches the thank-you page word for word.
- ☐ The free gift appears once, as the closing section.
- ☐ **Page through the whole PDF.** No card stranded alone, no section heading at
  the bottom of a page, no orphan final page.
- ☐ Open it on a phone. Most people will read it there first.
- ☐ Print one page. If it is ever printed, the margins have to work.
- ☐ File size sensible — under ~5MB, or the email suffers.
- ☐ Send a real test to Gmail and one Outlook, and open the attachment or link
  from each.
- ☐ Read it aloud. This is the last check and it catches the most.

---

# Phase C — the customer list, and the two emails it sends

Only two emails, and both are part of the purchase. The marketing emails — sales
letter, abandon nudges — stay out of this workflow.

Between them these two are the whole gap between paying and reading, and that
gap is where refunds get requested.

**Both come out of AWeber** *(operator, 2026-08-09)*, off the deck's own customer
list. Nothing in this phase sends mail from our own code.

### ☐ C0. The customer list — built ONCE, for the whole deck

**Read:** nothing. This step happens on the first offer that ships and every
offer after it inherits the result. If `AWEBER_BE_CUSTOMER_LIST_ID` is already in
`.env`, tick it and go to C1.

**ONE list, a tag per offer** *(operator, 2026-08-09)*. Not a list per offer. A
woman who buys 02 and then 03 is one customer, in one place, counted once against
the AWeber bill. Everything that differs per offer differs by tag.

⛔ **Not the existing paid list.** `theseerwithin_paid` (6936955) is V1's $35
buyers — 5,290 of them. Anything automated on that list reaches all of them.

#### Once, by hand

1. **Create the list in AWeber's web UI.** Name it to the account's own
   convention, beside `theseerwithin_paid` and `theseerwithin_soulmate_paid` —
   **`theseerwithin_be_customer`**.

   ⛔ **The API cannot do this.** `POST /accounts/{id}/lists` returns
   **405 Method Not Allowed** — tried 2026-08-10, it is a hard limit of AWeber
   API 1.0, not a scope problem. Do not spend an hour on it again.
2. **Add four custom fields to it**, spelled exactly:

   | Field | Written when | Carries |
   |---|---|---|
   | `stripe_order_id` | she pays | the join back to Stripe and to support |
   | `offer` | she pays | `twin-flame`, `judgement-day`, … |
   | `entry_url` | she pays, ACT offers only | her Entry form, for the woman who closed the page |
   | `reading_url` | when her PDF exists | what the delivery email links to |

3. **Put the list id in `.env`** as `AWEBER_BE_CUSTOMER_LIST_ID`.

⚠ **A custom field is per-list.** It does not exist on the new list because it
exists on another one. Missing fields fail quietly — the subscriber is created
and the value is dropped.

⚠ **The API *can* create custom fields, but our token cannot.**
`POST …/lists/{id}/custom_fields` answers *"Missing required scopes:
list.write"* (checked 2026-08-10). The broadcast token is minted with
`account.read, list.read, subscriber.read, subscriber.write, email.read,
email.write` — see `SCOPES` in `docs/aweber/aweber-oauth.cjs`. Adding
`list.write` there and re-authorising would open this path; until somebody wants
that, four fields by hand on the same screen as the list is two minutes.

#### The tags — ⛔ an API, not labels

`server/lib/backendCustomerList.ts` holds them, and its unit tests assert the
literal strings, because three things exact-match them and none of them live in
this repo: the thank-you Campaign, the delivery Campaign, and n8n's fulfilment
filter. **Add tags; never rename one.**

| Tag | Applied | What it does |
|---|---|---|
| `be-customer` | every backend buyer | the segment "has bought from the deck" |
| `be-<nn>-<slug>` | at purchase | ⚡ **fires her thank-you** |
| `be-<nn>-bump` | at purchase, if she took the bump | fulfilment, and a segment worth having |
| `be-<nn>-delivered` | when her PDF exists | ⚡ **fires the delivery email** |

#### Per offer, in code

One call at the moment she pays, and one when her reading is ready:

```ts
import { addBackendCustomer, markBackendReadingDelivered } from './lib/aweber';

await addBackendCustomer({ email, firstName, offer: 'judgement-day',
                           stripeOrderId, bumpPurchased, entryUrl });
await markBackendReadingDelivered({ email, offer: 'judgement-day',
                                    stripeOrderId, readingUrl });
```

- ⚠ **Log a failure loudly and retry it.** Rule 8: the write is the send.
- 🔴 **Never send an empty `custom_fields`.** AWeber reads `{}` with
  `update_existing` as *clear every custom field*, which is how a soulmate buyer
  lost her `stripe_order_id` eleven seconds after paying. Both functions above
  refuse rather than risk it, and the delivery call deliberately re-sends the
  fields it did not change.
- Both are idempotent, because Stripe retries `checkout.session.completed`.

**Done when:** the list exists, its four fields exist, the id is in `.env`, and
`npx vitest run server/lib/backendCustomerList.test.ts` is green.

### ☐ C1. The thank-you email — sends immediately

**Read:** `0X-T3`.

⚠ **Check whether it already exists before writing one.** 02's is written in full
(`02-T3`), including a story to fill the wait.

**How it sends:** an AWeber Campaign on the customer list, triggered by this
offer's tag. She is tagged at the moment she pays, so it lands within a minute.

What it has to do:

- Thank her as **her good judgment**, not our good fortune.
- Say the work has already started, in the present tense.
- Restate the wait, and name the subject line of the email that will deliver it.
- **Open a loop, don't close one.** 02 names the question it will answer first —
  turning a silent 24 hours into anticipation.
- ⚠ **It sells nothing.** No links to anything buyable.

**The wait-filler.** 02 fills the wait with a story. That story is matched to her
emotional state, and it does not transfer:

| Offer | Her state during the wait | So the filler |
|---|---|---|
| 02 | hopeful, 24 hours | a warm story that resolves |
| 03 | angry, three nights | quiet inoculation — *don't spend these nights watching for their downfall* |
| 04 | tempted to act now | argues against texting him tonight |

⚠ **Derive it from the wait, don't lift 02's.** Lifted, it will be the wrong
register and she will feel it.

⚠ **Subject line: transactional, not the broadcast format.** Our proven send
format is emoji + first name + curiosity. This one is a receipt — she is
expecting it and support will ask her to find it six weeks later. Do not turn it
into a hook.

**Rendering it.** The spec file IS the source — there is deliberately no second
copy of the words:

```
node improve-v1/v1-one-time-BEs/scripts/render-be-email.mjs \
     improve-v1/v1-one-time-BEs/copy/<nn>/<nn>-T3-confirmation-email.md
```

It writes `.html` and `.txt` beside the spec, in the canonical Evelyn shell, and
drops the notes (the frontmatter table, `<!-- BEAT n -->` comments, everything
from `## Build notes` down).

⚠ **`%FIRSTNAME%` becomes AWeber Liquid, with TWO fallbacks.** `Dear
%FIRSTNAME%,` with a `"dear"` fallback renders **"Dear dear,"** for every buyer
whose name we never captured — and `?fn=` only arrives from the AWeber letter, so
that is a real share of them. The renderer gives the salutation `"friend"` and
everything mid-sentence `"dear"`. Do not flatten them back to one.

### ☐ C2. The delivery email — sends when the reading is done

**Read:** `0X-T4`. ⚠ **This asset is new.** It did not exist for any offer,
because the reading used to *be* the email. Once the product became a PDF, the
email became the envelope and needed its own copy. 02's is now written.

**How it sends:** a second AWeber Campaign, triggered by `be-<nn>-delivered`. We
apply that tag when her PDF exists, and set `reading_url` in the same call.

🔴 **AWeber cannot put a different link in each buyer's email by itself.** The
link has to arrive as a custom field on her subscriber record, which the email
merges. That is the whole reason `reading_url` exists, and it is the one part of
this design that is doing real work rather than bookkeeping.

⚠ **The alternative is decision D7 — one PDF for everybody.** If the offer takes
that road, `reading_url` becomes a constant and this whole seam gets simpler.
Settle D7 before building the Campaign, not after.

What it has to do:

- **Subject matches `0X-T1` and `0X-T3` word for word.** Both told her what to
  watch for.
- Hand it over in one line, with the link or the attachment.
- Repeat the one instruction that prevents a refund — for 02, *read all twelve
  before you decide what it says*. It is inside the PDF too. She needs it in the
  envelope, because the buyer who gives up does it before she reaches the copy
  that would have stopped her.
- **Close the loop the confirmation opened — by pointing, not answering.** Name
  where the answer is; make her open the document to get it.
- Name the free gift so she reads to the end. Do not describe it.
- One line of admin: what to do if it will not open.

⚠ **It sells nothing either.** This is the highest-goodwill moment in the whole
funnel and it is very tempting to put the next offer in it. She has not read the
product yet, so an offer here arrives before the value does. **The next offer is
a separate send, after she has had time to read** — that gap is decision D10.

⚠ **Do not summarise the reading.** Every verdict in the email is a reason not to
open the document, and the document is the product.

### ☐ C3. Upload them, automate them, and prove it

Both emails now exist as HTML. Neither of them sends until somebody wires it up
in AWeber, and **that part cannot be scripted.** AWeber's API creates broadcasts;
it does not create the tag-triggered Campaign that a thank-you needs. So the
copy is uploaded by tool and the automation is assembled by hand.

**1. Upload the HTML as a draft.** Safe — `create` makes an unscheduled draft and
nothing in that script can send:

```
node docs/aweber/aweber-broadcast.cjs create \
     improve-v1/v1-one-time-BEs/copy/<nn>/<nn>-T3-confirmation-email.html \
     --subject "…" --text <nn>-T3-confirmation-email.txt \
     --list $AWEBER_BE_CUSTOMER_LIST_ID
```

⛔ **Never `schedule` it.** A scheduled broadcast goes to the whole list — every
backend buyer, including people who bought a different offer months ago. This
draft exists to be reviewed and to be the source you paste into the Campaign.

**2. Build the Campaign, by hand, in AWeber.** One per offer, per email:

| | Thank-you | Delivery |
|---|---|---|
| Trigger | tag applied: `be-<nn>-<slug>` | tag applied: `be-<nn>-delivered` |
| Wait | none | none |
| Body | the T3 draft | the T4 draft |

**3. Swap every `{{AWEBER_…}}` slot.** The renderer prints them and refuses to
be quiet about them. They are placeholders, **not syntax** — insert the real
field from AWeber's own personalization picker rather than typing it. A token
that ships unswapped is read by a buyer as gibberish at the exact moment she is
deciding whether any of this was real.

**4. Seed-test, and read the actual email.** Send one to yourself and one to a
second inbox. ⚠ Two things are only ever caught here:

- ☐ The Liquid resolved. Both fallbacks: a subscriber **with** a first name, and
  one **without**. "Dear dear," is the failure this catches.
- ☐ The custom field resolved. An unset `reading_url` must not send a live email
  linking to nothing.

**Done when:** every box below is ticked, with the seed test in your own inbox.

- ☐ A test purchase put a real subscriber on the list, with all her fields.
- ☐ Her offer tag arrived, and the thank-you landed.
- ☐ It landed **once** — Stripe retries, and a buyer thanked twice looks broken.
- ☐ A buyer of the *other* offer did **not** get it.
- ☐ The delivered tag fired the delivery email, with her own PDF link in it.
- ☐ Subject lines match `0X-T1` word for word, both emails.
- ☐ Read on a phone. Most of them will.

---

# After the POC — personalising the product from Supabase

If this proves out, the next stage is already planned in the deck: **an n8n flow
that looks her up in Supabase and writes a reading built from what we actually
know about her.** She is a past buyer, so her own words are sitting there.

The seam is already the right shape. `getReadingBody(offer, buyer)` returns a
static template today; in Phase 2 the same function calls n8n instead. **That is
a config change, not a rewrite** — which is the whole reason the seam was built
before it was needed.

The pieces, as the deck numbers them:

| | What |
|---|---|
| `S25` | the n8n flow — query Supabase by email → build the prompt → Claude → return the body |
| `S26` | a **read-only** database user, scoped to just the personalisation columns. ⚠ Not the app's connection string |
| `S27` | the quality gate — if what we hold on her is thin, fall back to the static version. **A paid product must never fail to arrive** |
| `S28` | echo slots — three per reading, one quoting her own words back |

`S28` is the one to build first if only one gets built. Quoting a buyer's own
sentence back to her, once, does more than a page of generated prose.

⛔ **This does not change the upsells.** They stay impersonal — that is the
settled rule, and it does not have a Phase 2. Personalisation belongs to the
product only, where she has paid for it and where it arrives as a considered
document rather than a chat message that seems to know too much.

⚠ **Two things to get right before it runs on real buyers.** Everything it writes
about her comes from things she told a different persona, months ago, so it must
read as Evelyn having *studied* her, not as a database being read aloud. And the
quality gate has to be honest — a thin record should produce the static reading,
not a padded one.

---

## Not in this workflow

The marketing emails — the sales letter and the abandon nudges. Different job,
different tools.

## Missing for every offer, not just this one

No Stripe. No tracking of its own. Nowhere to store the sent product. Full list
at the bottom of [`00j`](./00j-WORKFLOW-UPSELLS.md).

⚠ **Stripe is what blocks C0 from being proved.** `addBackendCustomer` is
written and unit-tested, but its one caller — the `checkout.session.completed`
handler — does not exist for any backend offer, so no buyer has ever reached the
list. Until then C0 can be built and C1/C2 can be written and uploaded, but C3's
end-to-end boxes cannot be ticked by anybody.

⚠ These cost us a day on 02 and will cost the same on 03, 04 and 05. **Fixing
them once, centrally, is now cheaper than hitting them three more times.**

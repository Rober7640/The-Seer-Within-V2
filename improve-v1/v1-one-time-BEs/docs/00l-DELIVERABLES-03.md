# 00l — DELIVERABLES: offer 03, Judgement Day

**What was built for 03, and every place the build departs from the copy specs,
with the reason.** The ticks and the decisions live in 03's working copy of the
method, [`03/0-WORKFLOW-03.md`](./03/0-WORKFLOW-03.md).

⛔ **Nothing charges.** 03 has no Stripe. Every button logs and stops.

---

## The tick sheet is not here

📎 **[`03/0-WORKFLOW-03.md`](./03/0-WORKFLOW-03.md)** — 03's working copy of the
method, ticked as it is built. ⛔ Do not keep a second set of ticks in this file:
two tick sheets means one of them is wrong and nobody knows which.

**This file is the record**: what was built, and every place the build departs
from the copy specs, with the reason.

---

## The one-time refactor *(prerequisite, `00j` §4a)*

`client/src/lib/twinFlameUpsellCopy.ts` is gone. In its place:

| File | Holds |
|---|---|
| `client/src/lib/backendOffers.ts` | the registry: prefix → `{ upsell1, upsell2 }`, and the two resolvers |
| `client/src/lib/upsellCopy/types.ts` | the four shapes + `displayName()` |
| `client/src/lib/upsellCopy/v1.ts` | ⛔ V1's chains and copy — six live funnels |
| `client/src/lib/upsellCopy/twinFlame.ts` | 02's copy, moved byte-identical |

`client/src/lib/funnel.ts` gained `JUDGEMENT_PREFIX`, `BACKEND_OFFER_PREFIXES`,
`backendOfferPrefix()`, `isJudgementOffer()`, and `funnelPath()` now routes by
whichever prefix the path belongs to instead of by 02 specifically.

**Proof it was a move:** 02's 25 unit tests pass unchanged, `tsc` gained no new
errors, and all 215 of 02's copy lines are byte-identical to the version in git.

---

## A2 + A3 — the booking page and its bump

**Built:** `client/src/pages/JudgementBookingPage.tsx`,
`client/src/lib/judgementBooking.ts`, route `/wiccan/judgement-day`.
**Evidence:** [`03-booking-split-2026-08-09`](../../evidence/03-booking-split-2026-08-09/README.md)
— 50 page assertions and 47 chat, all passing. (The single-page version it
replaced is
[`03-booking-2026-08-08`](../../evidence/03-booking-2026-08-08/README.md), 21.)

The page follows 02's PAGE treatment: it scrolls like a document, on a light
sheet over the starfield, in the buyer's first person throughout. Evelyn never
speaks on it.

### ⚠ It is now TWO SCREENS *(operator, 2026-08-09 — approved wireframe)*

The built page measured **3,450px on a phone — 4.1 screens of unbroken
commitment copy** to reach the button, and the Entry form would have taken it to
about five. So it splits, and each screen asks for **one kind of thing**:

| | Screen | URL | Holds | Measured |
|---|---|---|---|---|
| 1 | **Agree** | `/wiccan/judgement-day` | the four non-money statements, button `GO ON, EVELYN` | **1,173px · 1.4 screens** |
| 2 | **Give** | `…?step=give` | her request, the price rung + the $300 anchor, the amount box, the gift, the bump, the total, the button | **2,424px · 2.9 screens** |
| 3 | **Enter** | after the money | her story — ⚠ **not built yet** | — |

Nothing was rewritten to do this. The copy was already grouped this way in
`judgementBooking.ts`; the split only decides which group is on screen.

**Mechanics, and why each one is that way:**

- **The step is in the URL.** So the browser's own Back walks her between the
  two instead of throwing her out of the funnel. Her ticks survive it, because
  the component never unmounts.
- ⛔ **A cold arrival at step 2 goes back to step 1** — refresh, deep link, a
  shared URL — with the boxes clear. Consent not given in this page's lifetime
  is not assumed. Same rule the chat already keeps.
- **Two dots, and the step named.** She can see she is one screen from done.
  A numbered stepper would make this a form.
- **The button is her own sentence** — *Go on, Evelyn* — not *Next*. She is
  continuing, not submitting.
- **Step 1 says what it costs**: *"Four taps. Nothing to type, and no price
  yet."* The live objection at a step 1 of 2 is *how much of this is there*.
- **The bump does not get a screen.** It stays inline beside the total, which is
  the whole reason a bump converts. (The chat gives it a turn because a chat has
  turns; a page has adjacency.)

**Honest cost:** a second screen is a second place to leave, and every click
leaks somebody. What makes it survivable is that step 1 costs her nothing but
assent — and that two screens produce two numbers, so a drop-off becomes
visible. The wall leaked too; it just never showed up anywhere.

### ⛔ The reply-by-email block is retired, not moved

The ninth element (`P1`) — *"After I confirm, I will reply to Evelyn's email and
tell her who it is, what they did, and how long ago… that reply is the Entry"* —
**is gone from the page.** Not softened, not moved down: the mechanism it
described no longer exists. The Entry is screen 3 of this funnel, a form she
fills in after the money.

Two things follow, and both are recorded here so they are not lost:

1. **The page's reassurance dropped its third clause** — *"Reply to the
   confirmation email to begin."* — because it is no longer true of the page.
   The CHAT still carries it, because the chat's gate still asks her to reply.
   ⚠ The two converge when the chat is split.
2. ⚠ **Until the Entry screen exists, nothing on this page tells her about the
   part only she can do.** That is a real gap, it is deliberate, and it closes
   with the thank-you rewrite — not later.

### Departures from `03-C1`

| # | Departure | Why |
|---|---|---|
| 1 | **Statement 4 is cut entirely** — the scarcity rung, *"she holds one account at a time… if the week is spoken for, this page closes until it isn't."* | Decision D3. It is a promise only `S8` can keep, and 00e P4 is explicit: build it or don't write the line. A scarcity claim the software doesn't honour is the one lie on this page a buyer can catch. **Five statements survive the cut — four on step 1, the price rung on step 2.** Restore it verbatim to step 1 the day `S8` lands |
| 2 | The amount field ships **empty** | Decision D4. A prefilled number is a price, and statement 6 has just said she is not being given one |
| 3 | ⛔ **The floor is never printed** — on either treatment *(operator, 2026-08-09)* | A stated minimum does not read as a limit, it reads as **the price**: put $17 under an empty box and the box fills with $17, on every order. It also contradicts the statement directly above it. The floor still holds; it speaks only once she is under it — *"$17 is the smallest amount that will go through."* — and then it blames the rails, not her. ⚠ Supersedes the 2026-08-08 build, which printed *"Minimum $17 — below that the card charges take more of it than she does."* |
| 3b | ⛔ **And never while she is still typing** *(operator, 2026-08-09 — found in review on both treatments)* | The first build judged every keystroke, so typing **17** was refused at the **1**. Every amount that starts with a 1 was corrected before she finished her sentence — which reads as being told off, at the exact moment she is deciding what the work is worth. It now waits until she is **finished**: the field still for 1.4s, or she leaves it. It goes quiet again the instant she types. One shared hook, `hooks/useFloorSpoken.ts`, so the two treatments cannot drift |
| 4 | The bump headline is set **upright, not italic** (02's is italic) | 02's bump headline is six words; 03's is a full sentence in her voice, and that length in serif italic on an amber ground is the hardest setting on the page to read |
| 5 | The spec's single column is **two screens** (2026-08-09) | The measured wall — 3,450px, 4.1 phone screens. Nothing is rewritten: the split only decides which group of the spec's own copy is on screen |
| 6 | **The ninth element is deleted**, and the reassurance loses *"Reply to the confirmation email to begin."* | The Entry is a screen in the funnel now, not a reply to an email, so the agreement to reply has nothing left to agree to. ⚠ Both lines have to be rewritten in `03-C1` — the spec still describes the old mechanism |
| 7 | The deck line — *"By requesting this working you agree to the following:"* — shows on step 1 only | It introduces the statements. By step 2 she has agreed to them, and repeating it would frame the money screen as another agreement ladder |

### Departures from `03-C3`

None. The bump's copy is the spec's, in her voice, inline beside the total, and
it is never pre-checked — a pre-selected paid add-on is a negative option under
FTC and card-network rules.

⚠ Its product key is **`unburdening`**, its own. n8n exact-matches that string,
so inheriting V1's `double_reading` would post her a second reading instead.

### The CHAT treatment *(operator, 2026-08-08)*

02 has two candidate treatments for what the letter's CTA lands on, and 03 gets
the same pair. **Built:** `client/src/pages/JudgementBookingChat.tsx` at
`/wiccan/judgement-day/chat`, class-for-class off `TwinFlameBookingChat.tsx` so
the two offers' chats cannot drift.

Same mechanism as 02's: Evelyn talks, the close is ONE inline gate card, the
buyer has no conversational turn, nothing posts to her side of the stream, and
the bump is its own turn after she has committed.

**Two rules of 02's chat that 03 cannot keep, and why:**

| 02's rule | 03 | Reason |
|---|---|---|
| No text input anywhere | ⚠ **one input — the amount** | 02 asks her nothing because it collects nothing. Pay-what-you-want has exactly one thing only the buyer can supply |
| Three statements in the gate | **four** | The fourth is the intake agreement (P1). On an ACT offer it is not optional — without her reply there is no product to make. Ticking it beats being told it, and it happens before the money |

⛔ **The floor is not announced** *(operator, 2026-08-08)*. No "minimum $17"
under the field. A stated minimum is a price, and she has just ticked a
statement saying there isn't one. The floor still holds — it speaks only once
she is under it, and then it explains itself: *"$17 is the smallest amount that
will go through."*

✅ **The page now keeps the same rule** *(2026-08-09)*, so the two treatments no
longer differ on it — one shared string, `FLOOR_VIOLATION`, said at the same
moment by both.

**The thread has a title** *(operator asked, 2026-08-09)*: a thin strip under
Evelyn's name reading **Judgement Day — confirm your booking**. Without it the
chat was the only screen in the funnel that never said which offer she was
booking. It is sized to hold one line down to a 320px phone — wrapped, a subject
strip stops reading as a label and starts reading as a message.

### ⛔ The tense rule — "confirm", never "confirmed"

The first version said *your booking*, on the reasoning that nothing can be
called a confirmation before the money. **The operator's correction is better:
she clicked *"Open my page"* in the letter, so a booking is already in flight,
and this screen is where she finishes it.** The verb is true the moment she
lands, and it names the job. It is also the same move the rest of the copy makes
by never saying *buy* — booking, permission, request, close, take.

| | True here? | Where it belongs |
|---|---|---|
| **confirm** — a job she is doing | ✅ yes, from the click onward | the booking screens |
| **confirmed · confirmation · your order · receipt** — a state | ❌ not until money moves | the screen after the money, and `03-T3` |

Both walks assert it, in both directions: the title must say *confirm your
booking*, and the word *confirmed* must not appear anywhere on either screen.

⚠ Page and chat carry the **identical** title. The two are an A/B on
**mechanism**; naming the offer differently would make the test measure two
things at once. Both also set the browser tab (`TAB_TITLE`) — a tab she left
open used to read *"The Seer Within - Psychic Chat"*, which is the wrong product.

### One sentence per turn, at a human pace *(operator, 2026-08-09)*

Evelyn's lines arrived as a block — a transcript being pasted in, not somebody
talking. Now each line is its own turn: **a beat, then the typing indicator for
as long as that line would take to type, then the line.** The three dots are the
same markup as V1's live chat (`ChatPage.tsx`), so the two read as the same
woman at the same keyboard.

⛔ **A flat delay is the tell.** If every line takes the same time, *"You came."*
and a ninety-character sentence arrive at the same speed, and the reader knows
it is a machine before she can say why. `client/src/lib/chatPace.ts` paces on
character count with ±18% run-to-run variance — same shape as V1's
`lib/typing.ts`, tuned faster because this is a checkout and latency in front of
a payment reads as a slow payment. The whole run to the card is ~3.5 seconds.

The chat also **opens on her already writing** rather than on a wall of text
that was always there — and the card gets its own beat rather than landing on
the heels of the last sentence.

⚠ The gate card's heading and deck were **set larger** at the same time. That
sentence says what ticking the boxes means, and at the old size it read as small
print on the thing she was agreeing to.

⚠ **02's chat now differs.** `TwinFlameBookingChat.tsx` still reveals a beat's
lines as a block — 03 was built class-for-class off it, and this is the first
deliberate divergence. **Port it** when 02 is next opened, or the two treatments
stop being comparable.

### The resume lines — a refresh is not a return *(operator, 2026-08-09)*

The old refresh copy — *"You came back. I've kept your place, dear. Nothing is
lost."* — was wrong twice. **She never left**, so greeting her for coming back
claims an absence that did not happen; and *"kept your place"* is waiting-room
language from a different business, when the letter's whole device is the
ledger, her page, and the hand that stopped on it.

| Door | What she reads | Why |
|---|---|---|
| **Refresh** — she never left | *Still here, dear. / Your page is where you left it, and nothing is written on it yet. Four things to agree to.* | A continuation, not a greeting. In the letter's own furniture, truthful about the page, and it **carries the instruction** — the greeting beat is not replayed, so she used to land at the gate with no idea what it wanted |
| **Back from Stripe** — she really did leave | *You came back. / I've kept the book open at your page, dear. Nothing has been started, and nothing has been taken.* | The line is kept for the one door it is true of. ⚠ And the money is named: she has just walked off a payment page, so her live question is whether she was charged. Answering it unasked is the difference between a return and a support email |

⚠ The cancelled path had **no test at all** before this; it has one now, and its
own screenshot (`C8b-cancelled.png`).

The bump is rewritten for the chat, as 02's was: `BUMP` is a checkbox label in
the buyer's voice (right on a page, wrong in a chat), `CHAT_BUMP` is Evelyn
speaking and the ask is a question. Its total line adds her own figure to the
$12.77, so nothing is a surprise on the Stripe page.

**Resume:** position is restored, consent is not — and neither is the amount.
She lands back at the gate with the boxes clear and the field empty. Restoring
an agreement she did not re-give hollows out the device and is the wrong side of
a chargeback.

**Evidence:** the same folder, `C1`–`C9`, 26 assertions, all passing:

```
node improve-v1/v1-one-time-BEs/scripts/walk-03-booking-chat.mjs improve-v1/evidence/03-booking-<date>
```

⚠ **Which treatment ships is undecided**, exactly as it is for 02. Both are
preview-only and neither charges.

⚠ **The split has not reached the chat yet** *(2026-08-09)*. It cost the chat
nothing — it has always paced one beat at a time, and its 26 assertions re-ran
unchanged after the page was split ([evidence](../../evidence/03-booking-split-2026-08-09/README.md),
`chat/`). What it still owes is the same two deletions the page has taken: gate
statement ④ still asks her to reply by email, and `CHECKOUT.reassurance` still
ends on that instruction. **Next job on 03, before U1/U2.**

Worth saying plainly: once both treatments are stepped, they stop being two
philosophies and become the same flow at two speeds — which makes the A/B a fair
fight for the first time.

### Built along the way — the `?fn=` chain, half of it

`bookingFirstName()` in `client/src/lib/funnel.ts` reads the letter's `?fn=`,
trims and caps it, and keeps it for the tab in `sessionStorage` (not
localStorage — a name belongs to this visit and must never leak into a later
one). The booking page reads it once on mount and carries it into the checkout
payload.

⚠ **Nothing displays it.** The page is her voice and never addresses her. It
exists for the screens *after* the money.
⚠ **The other half is still owed:** checkout has to send it on as Stripe
`metadata.firstName`. That lands when 03 gets Stripe.

---

## C0 + C1 — the customer list, and 03's thank-you *(2026-08-09)*

**The deck now has a customer list step, and it is a SENDING step.** Master
`0-WORKFLOW` gained Phase C0 and C3, and rule 8. Decided by the operator on the
day: **one AWeber list for the whole backend deck, a tag per offer** — not a list
per offer — and **AWeber sends the post-purchase emails**, not our own code.

### What that overturns

⚠ **`00b`/`00c` said the buyer emails were transactional, sent by us through
Resend** — *"n8n returns the body; we do the sending. Tracking, suppression and
idempotency stay ours."* That is now false for the two Phase C emails. It still
holds for anything Resend is the only tool for: the inbound reply pipeline
(`S15`–`S18`) is untouched.

🔴 **The cost of that choice, stated once.** AWeber cannot put a different link
in each buyer's email. So her PDF has to arrive as a **custom field**
(`reading_url`) on her subscriber record, which the email merges. That is the
whole reason `markBackendReadingDelivered` exists. ⚠ If D7 lands on *one PDF for
everybody*, this seam collapses to a constant and should be simplified — settle
D7 before anyone builds the delivery Campaign.

### Built

| | |
|---|---|
| `server/lib/backendCustomerList.ts` | the tags, as a registry. 03's are `be-03-judgement-day`, `be-03-bump`, `be-03-delivered` |
| `server/lib/aweber.ts` | `addBackendCustomer()`, `markBackendReadingDelivered()` |
| `server/lib/backendCustomerList.test.ts` | 14 assertions, green |
| `improve-v1/v1-one-time-BEs/scripts/render-be-email.mjs` | spec markdown → AWeber HTML + text |
| `copy/03/03-T3-confirmation-email.{html,txt}` | 7.8 KB, rendered |
| `.env.example` | `AWEBER_BE_CUSTOMER_LIST_ID` |

⛔ **Nothing exists in AWeber.** No list, no custom fields, no Campaign. That
half is a web-UI job and needs the operator; the API creates broadcasts, not
tag-triggered Campaigns.

### Departure from `03-T3`

**It was the intake vehicle. It is now the second door to the intake.** The spec
said *"Reply to this email and tell me who it is and what they did… that reply is
your Entry"* — written before D11 moved the Entry onto a screen after the money.
Left alone it would have sent every 03 buyer down a second intake path that
nothing is built to read, competing with the form she was just shown.

Rewritten to: confirm the Entry if she filled it, link her back to it if she did
not. The link is `{{AWEBER_ENTRY_URL}}` — **a placeholder, not syntax**. It is
the `entry_url` custom field, and it gets inserted from AWeber's own
personalization picker when the Campaign is built. The renderer refuses to be
quiet about unswapped slots.

⚠ **The salutation and mid-sentence merges have different fallbacks.**
`Dear %FIRSTNAME%,` with a `"dear"` fallback renders **"Dear dear,"** — so the
salutation falls back to `"friend"` and everything else to `"dear"`. This will
bite every future offer's T3 and T4; it is handled in the renderer, not per file.

Also added: a `**Preheader:**` to both `02-T3` and `03-T3`, which neither had.

---

## Still to run

In order:

1. **Split the chat the same way** — and delete its two email-reply lines.
2. **A6, brought forward: the thank-you page becomes the Entry screen** — the
   form (the name, what they did, how long), plus a *"send me the link"* escape
   for the woman who cannot write it now. ⚠ It is now load-bearing: the page no
   longer asks her for the Entry anywhere else.
3. Then `0-WORKFLOW` A4 (upsell 1), A5 (upsell 2), A7 (wiring + tests),
   A8 (the browser walk), then Phase B and Phase C.
4. **The AWeber half of C0** — create `theseerwithin_be_customer` and its four
   custom fields, set `AWEBER_BE_CUSTOMER_LIST_ID`, then build 03's thank-you
   Campaign off `be-03-judgement-day`. Operator job; nothing here can do it.

⚠ **Spec files still describing the old single page:** `03-C1` (the ninth
element and the reassurance), `03-T1` (a receipt, not an intake form),
`03-E2` beat 13 and `03-P1` (both still carry the "one a week" claim that D3
cut from the page). ✅ `03-T3` is no longer on this list — rewritten above.

## Carried-over unbuilt work

Everything in [`00j`](./00j-WORKFLOW-UPSELLS.md)'s last section still applies,
plus 03's own list in [`00g`](./00g-PENDING.md) §C2 — the inbound reply pipeline
(`S15`–`S18`), the intake queue (`S29`), alarm triage (`S30`), the 30-day delete
(`S31`), and the PWYW checkout itself (`S5b`). ⚠ **`S29`–`S31` must exist before
the first real 03 order lands**, because the product cannot be made without her
reply and that reply will contain accusations about people who never consented.

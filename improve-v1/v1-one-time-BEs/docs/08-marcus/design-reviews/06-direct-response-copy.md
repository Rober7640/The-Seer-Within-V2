# 06 · Direct-response copy review — the 08 Marcus funnel (2026-09-13)

**Lens:** the `direct-response-copy` skill, applied to the eight customer-facing pieces after
purchase intent: four post-purchase emails and four pages. **Suggest only.** No file was changed.
Every proposed line is written in Marcus's register (objects and actions, short sentences) and
respects the fixed rules: receipts and deliveries sell nothing; no countdown-as-scarcity, no fake
scarcity, no "one-time offer"; the numerology is never taught; her card is never named before the
report; subject lines are locked; one woman over 55 reads it once on a phone.

**Levers used** (one line each, so the tables can name them without explaining):

| Lever | Plain meaning |
|---|---|
| Clarity of offer | She can say back what she's buying and what arrives |
| Specificity | A countable thing or a clock time instead of a category or a duration |
| Reason-why | The instruction or claim carries its cause, so she believes and obeys it |
| Objection handled | The worry she'd have at that line is answered at that line |
| CTA wording | The button names what she gets, not what we do to her card |
| Risk reversal | What can't go wrong, said before she has to decide |
| Urgency without pressure | Tell her exactly what happens next, so waiting isn't a decision |
| Proof | Evidence from other readers (none exists here; nothing is invented) |

---

## 1. What the copy already does well

By direct-response standards this is unusually disciplined copy. The thanks is framed as **her**
judgement ("You didn't. Good."), which is Hopkins' "offer service, not salesmanship" done in four
words. The confirmation opens a real loop (which card her name points to) and the delivery closes it
by pointing, not telling, so the PDF stays the payoff. The wait-filler ("look at the pictures, find
one thing you didn't see") is a free, useful act that keeps her in the reading instead of in her
inbox. The specifics are physical, never abstract: "on a walk, in the car, at the sink"; "the shape
I laid the cards in this morning"; "a card on its own says one thing." The upsell leads with a
real cost of misuse (agreeing with advice you can't use) rather than a benefit list, and it keeps
the written reading whole, which is the honest version of the "not incomplete without it" trap.
The thank-you page handles the single most expensive post-purchase question ("was I charged
twice?") in one plain sentence about two lines on a card statement. Deadlines are tied to payment
and printed as her clock time. Nothing counts down as a threat, nothing is scarce that isn't, and
no testimonial is faked. The cold reads have already done the clarity work the skill's "read it
aloud" test asks for; what follows is the persuasion layer on top of that, not a rewrite.

---

## 2. Piece by piece

Every changed customer-facing sentence needs a fresh `cold-read`. The column says so anyway, so the
builder never has to guess.

### 2.1 ORDER-CONFIRMATION.md (draft 4, 263/265 words)

| # | Current | Proposed | Why (lever) | Cold read |
|---|---|---|---|---|
| 1 | Preheader: *I have what I need. {{N_PAID}} cards, inside {{DEADLINE_HOURS}} hours.* | *I have what I need. {{N_PAID}} cards, written out, by {{DUE_AT_LOCAL}}.* | **Specificity.** The preheader is the second-most-read line on a phone. A clock time is a fact she can check against; "inside 24 hours" is arithmetic she has to do. Beat 4 already relies on `{{DUE_AT_LOCAL}}`, so no new dependency | Yes |
| 2 | Beat 4: *It comes to {{DELIVERY_EMAIL}} as a link, in an email titled …* | *It comes to {{DELIVERY_EMAIL}} in an email titled *Your reading is ready — {{QUESTION}}*. Tap the link inside and the reading opens.* | **Objection handled.** For this reader "a link" can mean a download, a login or a scam. "Tap and it opens" is the whole action. +6 words on a 263/265 body: trade a line or raise the cap a third time | Yes |

Leave beats 2, 3, 5 and 6 exactly as written (see §4).

### 2.2 AUDIO-ORDER-CONFIRMATION.md (draft 5, 232/265 words)

| # | Current | Proposed | Why (lever) | Cold read |
|---|---|---|---|---|
| 1 | Beat 3: *Nothing is in the audio that isn't in the written one, and nothing from the written one is missing from the audio.* | *Nothing added. Nothing left out.* | **Clarity.** Keeps the build note's rule (both directions) in six words instead of twenty-two. Two short sentences are his register; the current line is the one long sentence in the email | Yes |
| 2 | Beat 4: *…with a link to download the recording.* | *…with a link to download the recording. Tap it and it saves to your phone, and plays there like a voice message.* | **Clarity of offer.** COLD-READ-05 round A found the "download" gap in **both** audio emails; round B fixed only the delivery. This email is read first and is where she judges whether she got what she paid for. Reuses a sentence that already passed. 232 → ~248 words | Yes (a passed sentence in a new place) |

Leave beats 2, 5 and 6. Beat 5 ("Hearing your card named is not the same as reading its name")
is the desire line and is doing its job.

### 2.3 WRITTEN-DELIVERY.md (draft 4, 160/160 words)

| # | Current | Proposed | Why (lever) | Cold read |
|---|---|---|---|---|
| 1 | Beat 5: *Beside the card just read, the meaning changes.* | *Next to the card before it, the meaning changes.* | **Clarity.** This is the say-back all three readers gave, word for word, and the current line cost a second pass in all four rounds. A reader who stumbles here may skip the instruction that stops the likeliest refund (reading the last card cold) | Yes (a fifth round on one line) |
| 2 | Beat 7: *Keep this email somewhere you'll find it, %FIRSTNAME%.* | *Keep this email somewhere you'll find it, %FIRSTNAME%. The link is the way back to your reading.* | **Reason-why.** An instruction with its reason gets followed. A lost link is a support ticket and, at worst, a "never got it" refund. +9 words on 160/160: the cap must move (the confirmation's moved twice) or a line be traded | Yes |
| 3 | (no such line) | After beat 5: *When you've read it, write back one line. Which card stopped you.* | **Proof, built honestly.** This funnel has no testimonials and may not invent any. The only honest way to get them is to ask at the moment of most goodwill. A reply is not an offer, so it stays inside "sells nothing". It also hands Marcus her next question. **Judgement call**: the build note says this moment is "the wrong moment to spend"; a reply ask spends a little. Needs a reply-to decision (where replies land) and the cap | Yes |

### 2.4 AUDIO-DELIVERY.md (draft 5, 144/160 words)

No change proposed. It is the tightest of the four: one link, one instruction said twice, a setting
she can picture ("somewhere nobody will talk to you"), "and I'll sort it" as the support line.

One temptation to resist: two of three readers wondered whether the recording starts playing out
loud at the tap. Do **not** add "it won't play until you press play". Phones differ and the line
can't be promised. The reader who said she'd wait for headphones is the behaviour we want, and the
copy already produces it.

### 2.5 Booking page (`booking.js` + `booking_copy` for `what-are-my-blind-spots`)

Rendered order: headline → lead → three turned cards → "What we'll look at next" + bridge → table
photo → seven face-down positions → price → promise → offer → name note → signature → bump →
total → button → under-line.

| # | Current | Proposed | Why (lever) | Cold read |
|---|---|---|---|---|
| 1 | Edition bridge: *…showed the pattern: attention pulled into the distance, a decision held between the same two options, and a conclusion nobody else has checked.* | *…showed the pattern: you look past the clue in front of you, you weigh the same two choices again, and nobody else has checked your conclusion.* | **Clarity + enter the conversation already in her mind.** These are the letter's own three findings in the letter's own plain words (the creature at the bottom; the crossed swords; the drawing someone else holds). The current line is the abstract version of what she just read; the concrete version is what she remembers. Cold-read item 10 ("I can't", O) | Yes (edition gate) |
| 2 | Promise: *A written reading, sent as a PDF link to your email within 24 hours of payment.* | *The seven cards and your own card, written out for you and sent to your email as a link, within 24 hours of payment.* | **Clarity of offer / specificity.** Names what $35 buys in countable objects and matches the confirmation email's wording, so page and email say the same thing. Drops "PDF". Also fix the name drift on this page: "personal reading" (H2), "written reading" (bump), "full reading" (offer copy) are three names for one thing; use **personal reading** everywhere (H2, ledger and thank-you already do) and "written" only when audio is beside it. Build: the count comes from the edition, not a literal | Yes |
| 3 | Button: *Continue to secure payment — $35* | *Continue my reading — $35* (the under-line keeps "secure payment") | **CTA wording.** The button names what she gets, and it is the same verb as the email link she tapped to get here ("Continue the blind-spot reading"), so the thread doesn't break at the money moment. The label still matches the action (it opens the payment page) | Yes |
| 4 | Under-line: *Name, email and card details are taken on the secure payment page.* | *One payment, not a subscription. Name, email and card details go in on the secure payment page.* | **Objection handled.** The masthead "Daily Tarot Reader" made two of three readers ask "am I subscribing?" (item 12). That fear is strongest in exactly this buyer, and the place to kill it is under the button, where the skill puts friction reducers | Yes |
| 5 | Bump: *Your written reading normally arrives within 24 hours of payment. Add this to receive it within 12 hours.* | *Your reading normally arrives within 24 hours of payment. Add this and it arrives within 12 — by about {{NOW+12H}} instead of {{NOW+24H}}.* | **Specificity + contrast.** The bump currently sells a number; two clock times sell the difference she'd feel. For a morning buyer that difference is "this evening, not tomorrow morning", which is the whole reason to pay $12.77. Build: computed from page load, hence "about"; the real deadline stays tied to payment. The cold-read capture artefact (an evening 12-hour time read as 24) disappears when both times sit side by side | Yes |

Not proposed, on purpose: no price anchor. There is no honest one (no "usually $X", no comparison
product), and a fake one is the fastest way to lose a reader who has just watched him tell the
truth for ten cards.

### 2.6 Bridge page (`bridge.js`)

| # | Current | Proposed | Why (lever) | Cold read |
|---|---|---|---|---|
| 1 | *I have your question, your saved cards, and the personal card connected to your name.* | *I have your question, the {{N_FREE}} cards you've seen and the {{N_PAID}} still face down, and the card your name points to.* | **Clarity / trust.** The second after paying, "saved cards" reads as her bank card (3/3, item 1) and "personal card" wobbles the same way. "The one your name points to" already passed in the emails. Counts come from the order's edition snapshot | Yes |
| 2 | *Before you view your receipt, I want to show you one optional way to receive the same reading.* | *Before your receipt, one page. It's about hearing this same reading in my voice. Optional. Then your receipt.* | **Clarity + urgency without pressure.** "One optional way to receive" was "I can't" for two of three (item 2). Naming the form (hearing it) without the price or the argument stays inside the bridge SCOPE, and it pre-frames the upsell so its first line can't land as a payment problem | Yes |
| 3 | Position of *Nothing on the next page changes or delays that order.* (under the countdown) | Same words, placed directly after line 2, before the countdown | **Risk reversal read before the page moves.** At seven seconds on a phone the last line may not be reached. No wording change, so no cold read. Conflicts with design review 02's placement (reassurance under the action) and the page is short at 390px, so this is a judgement call and low priority | No |

Leave the countdown copy. It is a mechanical timer with a plain "continue now", not a scarcity
device, and the cold read found it clear.

### 2.7 Audio upsell (`upsell.js`, copy from `upsell-1-audio/COPY.md`)

| # | Current | Proposed | Why (lever) | Cold read |
|---|---|---|---|---|
| 1 | Eyebrow: *A quick warning before you view your receipt.* | *Your order is safe. One thing before your receipt.* | **Buying environment / objection handled.** All three readers read "warning" as "something is wrong with my order" (item 3). A frightened reader taps No to reach her receipt. The warning survives in the headline ("Don't skip to the answer"), where it does its job | Yes |
| 2 | *That is why I can also prepare your complete reading as an audio recording.* | *That is why I'll also read it to you, as a recording. A recording plays in order. The last card comes after the ones before it, the way I wrote it.* | **Reason-why.** The argument has a hole exactly where the mechanism should be; all three readers filled it themselves ("because a recording plays in order", item 4). Say it. It's a fact about recordings, not a claim about her attention, so it stays inside the SCOPE rule (no "audio forces attention") | Yes |
| 3 | Includes list: *The same saved spread and personal-card lens* | *The same cards, in the same order, read through your own card* | **Clarity.** "I can't" for two of three (item 5). The includes list is the part of the page a scanner reads; a line she can't say back is a line that isn't selling | Yes |
| 4 | Sleeve: *Not yet recorded* · *Length shown once recorded* | *Recorded once you add it* · *It runs as long as your reading takes to read aloud, start to finish.* | **Objection handled.** "I'd be paying for something whose length I won't know" (O, item 6). An honest limitation is a trust marker only when it's framed as a fact about the product; here it reads as a defect. Length follows the reading (SCOPE: no padding), so say that and drop the promise of a number | Yes |
| 5 | Under the Yes button: nothing | If D2 = one tap: *Yes charges the card you just used, $17. No form.* If D2 = payment page again: *Yes opens the payment page for $17.* | **Clarity / friction.** All three readers asked what the tap does (item 7). Sugarman: tell them exactly what happens. One line, chosen after D2 | Yes, after D2 |

Leave the headline, the decline button and the "One additional payment … whether you add audio or
not" line (see §4). No proof line: there is none to give, and the reply ask in §2.3 is how one
gets built.

### 2.8 Thank-you page (`thank-you.js`)

| # | Current | Proposed | Why (lever) | Cold read |
|---|---|---|---|---|
| 1 | Page ends after the ledger; nothing to tap, no closing line (item 11) | *That's everything. You can close this page. Your reading comes as an email from Marcus Stone titled *Your reading is ready — {{QUESTION}}*. Anything wrong, write to {{SUPPORT_EMAIL}}.* | **Urgency without pressure / closure.** A page with nothing to tap reads as "did it finish?". Naming the email title repeats the confirmation's promise and cuts "can't find it" tickets. Needs the support address approved: the emails use `hi@theseerwithin.com`, but no approval doc exists in 08 (README line 204, FUNNEL-BUILD-CHECKLIST D8) | Yes |
| 2 | Written row, paid state: *Marcus has your question and your cards.* | *Marcus has your question, your {{N_TOTAL}} cards and your name.* | **Specificity.** Closes the "cards = bank card" wobble carried over from the bridge, and "your name" confirms the input for her personal card landed. Minor | Yes |

Leave the status words, the deadline line with her clock time, the ledger and the two-payments
sentence exactly as written.

---

## 3. The three highest-value changes, ranked

No baseline exists yet, so the effects below are directions with the mechanism named, not numbers.
Each is one A/B in the existing experiment framework once the funnel is live.

| Rank | Change | Where | Expected effect |
|---|---|---|---|
| 1 | **Upsell opener + mechanism** (§2.7 #1 and #2): replace "A quick warning" with "Your order is safe. One thing before your receipt", and add "A recording plays in order" where the reason-why is missing | Upsell page, two sentences | **$17 take-rate.** The page opens with a fear and then has a hole in its argument; both were 3/3 stumbles. The take-rate multiplies over every buyer, and the fix costs nothing on the written side. This is the largest single lever found |
| 2 | **Bump as two clock times + "not a subscription"** (§2.5 #5 and #4) | Booking page | **$12.77 take-rate and $35 abandonment.** Every 10 points of bump take is about +$1.28 average per buyer on a $35 sale. The subscription line removes a reason to stop at the button that two of three readers named unprompted |
| 3 | **Closure and the way back** (§2.8 #1 and §2.3 #2): the thank-you closing line and "The link is the way back to your reading" | Thank-you page, written delivery | **Refunds and tickets.** "Did it go through", "can't find it" and "lost the link" are the three cheapest refunds to prevent, and each is one sentence. Depends on the support address being approved |

The edition bridge rewrite (§2.5 #1) is high value for this one edition only and goes through the
edition gate, so it is not ranked here.

---

## 4. What to leave exactly as it is, and why

- **Receipts and deliveries sell nothing.** Right by rule and right by the skill: the delivery is
  the moment of most goodwill, and a pitch there spends it. The only addition proposed is a reply
  ask, which is not an offer, and it is flagged as a judgement call.
- **"A lot of people read the free cards, nod, and leave the rest face down. You didn't. Good."**
  Thanks as her judgement. Do not warm it up.
- **The loop** ("I don't know yet which card your name points to … I'll name it in the reading. Not
  here.") and its close by pointing ("Meet it on the page."). Naming the card in an email would be
  the most expensive sentence in the deck.
- **The wait-filler** (look at the pictures, find one thing, there's always one). Service, not
  salesmanship, and it keeps her looking at cards instead of at her inbox.
- **The locked subjects and the matched titles.** Receipts, not hooks. The confirmation promises a
  title and the delivery carries it word for word. That promise kept is worth more than any
  open-rate trick.
- **"Same cards. Same order."** and every line that keeps the written reading whole. The honest
  version of the upsell; the dishonest version ("the full reading") is the one that gets refunds.
- **"It was paid as two separate payments … so your card statement may show two lines."** The best
  objection-handling sentence in the funnel.
- **The decline button** ("No thanks—I'll read it on my own."). Full size, no shame, frames her as
  capable. Do not shrink it or make it a text link.
- **"Nothing on the next page changes or delays that order."** Risk reversal in nine words.
- **The deadline lines** tied to payment with her clock time. Specificity done right.
- **The bridge countdown.** A mechanical timer with a plain escape, not a scarcity device.
- **"The date does its own job in the reading."** The ceiling on teaching the method. Readers say it
  back correctly and can't name the job, which is the design.
- **No testimonials, no guarantee, no anchor price.** None exist. Inventing any of them would cost
  more trust than it buys, and the reader has just watched him tell the truth for ten cards.

---

## Claimed vs verified

**Read in full:** `.claude/skills/direct-response-copy/SKILL.md`; the four email `.md` files (copy
and build notes); `COLD-READ-04.md`, `COLD-READ-05.md`, `COLD-READ-PAGES-01.md`; `booking.js`,
`bridge.js`, `upsell.js`, `thank-you.js` (string literals); `upsell-1-audio/COPY.md`, `SCOPE.md`
and `DIRECT-RESPONSE-REVIEW.md`; `build-08-daily.py` lines 327–365 (`booking_copy` for
`what-are-my-blind-spots`); `daily-email/SHAPE.md` intro, "Voice preferences" and "Never";
`daily-email/letters-02/what-are-my-blind-spots.md`; `bridge-page/SCOPE.md`; `booking-page/SCOPE.md`
(first 120 lines); `thank-you/SCOPE.md`; `design-reviews/README.md`.

**Verified by grep:** no refund, guarantee or money-back policy exists anywhere in the 08 docs
(only "decide before launch" checklist items), so no risk-reversal copy that promises one is
proposed. No support address appears in any of the four page files; `hi@theseerwithin.com` is in
the eight email files per COLD-READ-05, with no approval doc.

**Also verified:** `S.order.editionSnapshot` is the full `Edition` (`contracts.ts:58`) and
`fulfillment.ts:68–69` filters its `positions` by `visibility === 'free' | 'paid'`, so the
`{{N_FREE}}`, `{{N_PAID}}` and `{{N_TOTAL}}` counts proposed for the bridge and thank-you are
available on the order without a new field.

**Inferred, not verified:** the pages were read as source, not rendered in a browser, so the
rendered order in §2.5 is from the template string, not a screenshot. `{{NOW+12H}}` on the booking page assumes the page can compute from page load; the booking page has
no order yet, so it cannot use payment time. The word counts quoted are from the cold-read reports,
not recounted. D2 (does Yes charge one-tap or reopen payment) is open; §2.7 #5 gives both lines.
The reply-ask (§2.3 #3) assumes replies to the delivery email can land somewhere a person reads;
not checked. The expected effects in §3 are directions, not measured numbers; nothing here has a
baseline yet.

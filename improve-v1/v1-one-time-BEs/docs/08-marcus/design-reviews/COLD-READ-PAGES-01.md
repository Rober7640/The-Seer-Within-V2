# Cold read — the five locked pages, as rendered (2026-09-13)

Method: `cold-read` skill on the live local app. The rendered text of booking → checkout stand-in →
bridge → audio upsell → thank-you was captured at 390px with the local-test notices stripped, and
given to three readers (M, N, O) who had seen none of the scopes, reviews or emails. Audience line:
a woman over 55, on a phone, first thing in the morning, arriving from Marcus's email.

**Two artefacts of the capture, not the pages:** the speed bump was ticked before capture, so all three
readers "never chose the $12.77" and saw the PDF line say 12 hours while the bump box said 24; and the
capture ran in the evening, so a 12-hour deadline printed as 6:04 the next morning, which a
first-thing-in-the-morning reader read as 24 hours. Both disappear in real use.

**Fixed on the page after this round (mechanical, removals only):** the booking page stated the
birth-name/date-of-birth ask twice (a generic prefix plus the edition's own copy) — the prefix is gone;
"Fig. IV · The table" appeared on phones where Figs. I–III were hidden — the numeral now hides with them.

## Findings, all three readers unless noted

| # | Page | Words | What happened | Owner |
|---|---|---|---|---|
| 1 | Bridge | *your saved cards, and the personal card connected to your name* | Right after paying, "saved cards" read as **her bank card** before correcting to tarot (M, N, O). "Personal card" then wobbled the same way | Copy — bridge SCOPE line, approved. Needs "tarot" or "the three cards from this morning" |
| 2 | Bridge | *one optional way to receive the same reading* | **I can't** (N, O); M: "by post? by phone?" | Copy — bridge SCOPE line |
| 3 | Upsell | *A QUICK WARNING BEFORE YOU VIEW YOUR RECEIPT* | All three: "is something wrong with my order?" A warning the second after paying reads as a payment problem | Copy — COPY.md eyebrow, approved |
| 4 | Upsell | *That is why I can also prepare your complete reading as an audio recording.* | All three could not join "the order matters" to "therefore audio"; each guessed "because a recording plays in order" — the page never says it | Copy — COPY.md |
| 5 | Upsell | *The same saved spread and personal-card lens* | **I can't** (N, O); M: guessed "same cards and my personal card" | Copy — COPY.md includes box |
| 6 | Upsell | *Not yet recorded* · *Length shown once recorded* | Is it a status of something I own, or does it not exist because I haven't bought it? "I'd be paying for something whose length I won't know" (O) | Copy — sleeve micro-copy (new) |
| 7 | Upsell | the Yes button | Does Yes charge the card I just used, without asking again? Not said; the receipt later shows it did (M, N, O) | Product — **D2**; then one line under the button |
| 8 | Checkout | *Name on card* → *I'll use your first name when I write to you* | The card may be her husband's or say "MRS K M SMITH". Which first name does he use — card or birth name? (M, N, O) | Product — derive the display first name from the birth name, not the card holder; Stripe's billing name is for the bank |
| 9 | Booking | *FIG. IV · THE TABLE — as the cards lie this morning* | "Are positions four to ten drawn or not?" — the photo says laid, the blank names say not (M, O); "this morning" — for me or for everyone? (N, O) | Copy — the table caption (new); consider "the seven still face down" |
| 10 | Booking | *attention pulled into the distance* | **I can't** (O); half-understood (M, N) | Copy — the edition's bridge paragraph (per-edition, cold-read gated already; this one slipped) |
| 11 | Thank-you | end of page | Nothing to tap; no "you can close this", no "your receipt comes by email", no support address (M, N, O) | Product — **no approved support address exists in the 08 docs**; then one closing line |
| 12 | All | masthead *Daily Tarot Reader* | "Is this every day? Am I subscribing?" (M, N) | Product — the masthead role is the email's; a decision, not a page fix |
| 13 | All | *— What are my blind spots?* | Read as a question put to her before settling (M, O) — same as the email subjects | Operator decision already open (COLD-READ-02) |
| 14 | Booking | *Total USD* | "Is that my currency?" (M, N, O) | Product — 02/07 pattern; a decision |
| 15 | Booking | *What's left of the love* / *What you want to win* | Whose love? win what? (N, O) | Edition position labels — from SPREADS.md, cold-read gated already; leave |
| 16 | Upsell/Thank-you | *◆* and *→* row marks | "Bullets that mean nothing to me" (M, N) | Design — harmless; swap for plain numerals or a dash |

**Clear for all three:** the price, the bump's own copy (once unticked), the checkout fields and the
birth-certificate hint, the month-first date example, the two-row ledger on the upsell, both buttons,
the status rows and "two separate payments" line on the receipt, the countdown and "continue now".

**What every reader could say back by the end:** what she bought, what it costs, that a second $17
charge happened, when the reading arrives, where it goes. The stumbles are on the way, not at the end.

## Routing

- Items 1–6, 9: copy owners. 1–2 are bridge SCOPE lines; 3–5 are COPY.md (approved — Joel's call to
  reopen); 6 and 9 are new micro-copy from this build and can be rewritten and re-read now.
- Items 7, 8, 11, 12, 14: product decisions for Joel. 8 and 11 have a recommendation each above.
- Item 10: the blind-spots edition's own bridge paragraph — send back through the edition's cold read.

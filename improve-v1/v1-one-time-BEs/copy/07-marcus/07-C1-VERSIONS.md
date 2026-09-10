# 07-C1 — five booking pages, one to pick

**The brief was one line: the page is cluttered, drop the hero photograph, build five.** These are
five different answers to *what does this page actually need in order to sell?* — not five paint
jobs on the same scroll. Pick one and the other four get deleted.

| | The one-line idea | On arrival | Mid-order | vs today |
|---|---|---|---|---|
| *the reference page* | *what the operator called cluttered* | *4,978px* | *5,711px* | — |
| [**v1 · The Order**](./07-C1-booking-page-v1.html) | A standing order bar carries the whole state, so the body stops repeating itself | 3,727px | 4,266px | **−25%** ⭐ ship this |
| [**v2 · The Letter**](./07-C1-booking-page-v2.html) | The page is the rest of the letter she read forty minutes ago | 4,354px | 4,961px | −13% · the voice bet |
| [**v3 · The Table**](./07-C1-booking-page-v3.html) | The cards ARE the page, at four times the size, every one tappable | 2,834px | 3,934px | −31% · close second |
| [**v4 · Two Steps**](./07-C1-booking-page-v4.html) | One decision per screen: her question, then the price | **1,053px** | 3,796px | screen 1 is one phone |
| [**v5 · One Box**](./07-C1-booking-page-v5.html) | The shortest page that can still take money | 1,341px | 1,744px | **−69%** ⭐ the radical one |

*Heights are a 390px phone on Thursday's spread, idle and with two questions typed and $57 picked.*

**I would ship v1 and test v5 against it.** v1 keeps every argument the reference page makes and is
a quarter shorter for it, but the real gain is not the height — it is that what she has ordered and
what it costs never leave the screen, so the arithmetic does the selling and the body never has to
repeat itself. v5 is the honest challenger: it assumes 1,400 words of
Marcus already did the persuading this morning and that the page's only job is not to get in the
way. Those two disagree about something real and the disagreement is measurable. v2, v3 and v4 each
buy one quality at a stated price, and each is worth building if the operator wants that quality.

## True of all five

- ⛔ **No hero photograph.** `marcus/07-spread-<day>.jpg` appears in none of them.
- **Every card is still a photograph.** Face-up cards are the RWS scans; every card back is one
  crop of that day's own `marcus/07-down-<day>.jpg`. No CSS rectangles, no vectors.
- **Numbers come only from the generated island.** No version states a count in hand-written copy;
  `grep` for a digit next to "cards" outside the markers and there is nothing in any of them.
- **The URL contract is intact.** All seven `&s=` keys, `?c=1|2|3` with an unknown or missing `c`
  falling back to 3, the lost-link page when `&s=` is missing or wrong, `&d=` and `&recover=1`.
- **The ladder is 07-C5.** $35 one question · $57 two · $87 three, all three live on all seven days.
- **Nothing was quietly dropped from the promise.** All six agreements, the one-payment line, the
  reading reaching her inside 24 hours at the address she paid from, the money back if it does not,
  and the guardrail — *Marcus reads the cards, not the man* — are on every one of the five. What
  moves between versions is where they sit and whether they are open or one tap away.
- The pay button is still the reference build's mockup: it alerts the Stripe payload.

---

## v1 · The Order

**The idea.** She is buying a countable thing off a cut that already happened, so make the order
legible at every moment and stop arguing. A standing bar at the foot always says what she has asked
for, how many cards that comes to, what it costs, and the single next thing that is missing — and
tapping it takes her there.

**What it removes.** The hero photograph; the framed figure the strip used to sit inside; the
open six as a row of tiles (they are named in one sentence instead — 07-C5 §5.5's stated fallback);
the standalone gate box, whose job the bar took over; the section shell around the cards, which is
now one flush strip with a text toggle listing what each face-down card is already set on.

**What it risks.** A bar with a running total is a shop, and Marcus is not a shop — this is the
version most likely to feel like retail. It also covers ~110px of the page on a phone at all times,
and it is the one version whose main device has to be seen on a phone to be judged.

**New copy needing sign-off.** The bar's five *what's missing* prompts, "See what's in it", and
"What each of the {N} is already set on".

## v2 · The Letter

**The idea.** She arrives forty minutes after reading a letter that ended *"tell me that, and I'll
lay the other five"*, so the page is the rest of that letter — the email's own paper, one column,
no panels, no tiles, no grid. The three rungs are three paragraphs she can tap and the order total
is a sentence in his voice: *"So that's 10 cards across your two questions, and $57 today."*

**What it removes.** The hero photograph, and every shaded box, card, tile and receipt table on the
page. **Also: the cards at the top.** This is the version that bets she has already seen the cut
this morning — the strip appears once, late, small, after she has typed.

**What it risks.** It is the longest page of the five and has no skim path at all: a woman who
scrolls looking for a price does not find one until she has passed 400 words. It is also the
version that most depends on the writing being good, which is not a thing you can A/B your way out
of. ⭐ It puts boxes two and three **under box one**, which is what 07-C5 §5.3's copy literally
says and the opposite of the reference build — running it settles that open question.

**New copy needing sign-off.** The opening line, the order sentence, the five gate lines, the
sign-off.

## v3 · The Table

**The idea.** What she is buying is cards being turned over, so the cards are the top of the page at
four times the size, on a dark felt, every one of them a button. Tapping a face-down card names the
position it is already set on and says the same thing every time: what it gets laid *on* is what
you type below.

**What it removes.** The hero photograph — the RWS scans and the photographed backs are doing its
job now. The frame's two paragraphs. And every rung's body copy: the three prices are a compact
switch row, and only the rung she picks unfolds its prose. That alone takes ~1,000px off the page.

**What it risks.** It is image-heavy, tapping cards is play rather than buying, and the biggest
thing on the page is not the question box. ⭐ It is also the only version that **shows** the six
open cards rather than naming them — 07-C5 §5.5 recommends this and flags the risk out loud: a
woman who buys one question can count six backs she never got.

**New copy needing sign-off.** The four card-readout lines and the counts line under the row.

## v4 · Two Steps

**The idea.** The clutter is that every decision is on screen at once. So screen one is her question
and nothing else, and screen two is the price, the cards, the agreements and the button, with her
own sentence quoted at the top of it.

**What it removes.** From screen one: the cards (a text link opens them), the prices, the
agreements, the guarantee — everything that is not the question. From the page: the hero
photograph and the open six.

**What it risks.** ⚠ **A tap now stands between her and the price.** The market research in the
README says a page that hides its price loses the sceptic, and this is the only version that does.
The line under the first button is written to make the price feel one tap away rather than withheld,
and it is not proof. Wizards also lose people between steps, and a reload drops her back to step
one with her typing intact but her place lost.

**New copy needing sign-off.** The two step names, "Next — what it costs", the nothing-is-charged
line, the quote header and its *Change it* link.

## v5 · One Box — the radical one

**The idea.** The shortest page that can still take money. She has just read 1,400 words of Marcus
and clicked a link that already said what this is, so the page argues nothing: one line, one box,
three words with prices on them, two ticks, one button. Everything the reference page *argues* —
the cards, what a second and third question buy, how the reading gets made, the guarantee — is
folded into four quiet toggles at the foot, closed by default.

**What it removes.** Nearly everything, but almost none of it permanently: the hero photograph and
the card art above the fold, the frame's paragraphs, all three rungs' prose, the *how it gets made*
block, the guarantee prose, the receipt table. All of it is one tap away except the photograph.

**What it risks.** Two things, and one is a decision, not a bug. ⚠ **The five statements sit under
ONE tick instead of five**, with all five printed underneath it — that is the only consent shortcut
in the set and it is the operator's call, not mine. And a page this bare has no answer for the
woman who arrives unsure: there is nothing to read her way into, so if the morning's letter did not
already sell her, nothing here will. It is also, because of those printed statements, about one and
a half screens rather than one on a 390px phone; the only way to get the button above the fold is
to hide the five behind the tick, which is the wrong trade.

**New copy needing sign-off.** The single agreement line, the three price-switch labels, the four
toggle names, the four button waiting-states.

---

## How to review them

Open any file off disk and add the query string. **`&s=` takes the full registry key.**

```
?c=1&s=the-weight              Mon · The Weight             6 / 9 / 12
?c=2&s=the-two-doors           Tue · The Two Doors          8 / 11 / 14
?c=3&s=the-small-instruction   Wed · The Small Instruction  6 / 9 / 12
?c=1&s=the-undertow            Thu · The Undertow           7 / 10 / 13
?c=2&s=the-ledger              Fri · The Ledger             9 / 12 / 15
?c=3&s=the-other-chair         Sat · The Other Chair        7 / 10 / 13
?c=1&s=the-zodiac-spread       Sun · The Zodiac Spread     12 / 15 / 18
```

`&d=2026-09-02` pins the cut date so a screenshot is reproducible; `&recover=1` is the state she
comes back to from Stripe's cancel. Drop `&s=` to see the lost-link page. ⛔ Its list of the seven
keys is a review affordance and comes out before any of these ships.

## The numbers, which is the one thing that cannot be wrong

All five carry the same **generated** registry island, and `scripts/build-07-booking-data.mjs` now
writes and checks **every** `07-C1-booking-page*.html` that carries the markers rather than only the
reference page. A candidate is a page that can take money, so it gets the reference's guard; a
design nobody has picked yet is exactly when a number drifts.

```
node scripts/build-07-booking-data.mjs            # rewrite every island
node scripts/build-07-booking-data.mjs --check    # fail if any is stale
node scripts/check-07-registry.mjs                # runs the above, plus everything else
```

Proven: corrupting one candidate's island by a single card fails `check-07-registry.mjs`, and the
failure names the file.

## What was verified

A Playwright pass opened **all five** versions at **all seven** `&s=` values, filled the question,
tapped **all three** rungs on each, filled the extra boxes, ticked every agreement, and read the
total back out of the page.

- **105 rung/day combinations** (5 × 7 × 3), every total equal to `tierTable()`.
- The pay button carries the right price at every rung, and the bump adds exactly 12.77 to it.
- `?c=1`, `?c=2`, `?c=3` each render their own entry line; `?c=9` and a missing `c` fall back to 3.
- Missing `&s=` and `&s=nope` both render the lost-link page.
- `&recover=1` restores all three boxes, the rung and the bump, in all five.
- Zero console errors, zero 4xx responses — every image URL resolves on every day.
- 320px, 390px and 1280px, light and dark: no sideways scroll on the page body in any version.
- `node scripts/copy-check.cjs copy/07-marcus` — PASS, no findings.

## Still open, whichever wins

These are the reference build's open items and none of the five settles them.

1. 🔴 **The link carries `&s=` but not the draw date.** All five walk back from today to that
   spread's weekday, which is a guess and shows the wrong morning on a forwarded email.
2. 🔴 **The open six's duplicate-draw edge case** (07-C5 §2) is undecided and has to be settled
   before any of these takes money.
3. ⚠ **The sample reading does not exist.** All five link to `#sample`.
4. ⚠ **The button is a mockup**, and the refusal of a rung must happen in `priceBackendOffer`
   before Stripe, never in the browser.
5. ⚠ **`localStorage` carries the recover state**, which is enough for review and not for a
   different device.

# 07-C1 — five formats, one to pick

**Round one built five orderings of one page and the operator was right that they were the same
page.** This round changes the unit: five **formats**, judged by one test — *could this be turned
into g1 by moving blocks or editing CSS?* If yes it is not a variant, and it is not here.

## The decision

> **Ship g1.** It is the target, made correct on all seven days. Nothing else here beats it on
> the thing the target is best at, which is that the argument and the demonstration are the same
> object: she taps a price and a box opens.
>
> **Then test g2 · The Thread against it.** It is the only one of the five that changes what kind
> of thing the page *is*, and it is the shape this business has already proved — the V1 funnel at
> `/chat` is a chat. In a thread the box that has to be filled is pinned to the bottom of the
> screen, so the fault we started this exercise trying to fix cannot occur at all.
>
> g3, g4 and g5 each buy one quality at a stated price and are worth building if the operator
> wants that quality. None of them is a safer bet than g1.

| | The format | Cards | The choice is | Scroll |
|---|---|---|---|---|
| **g1 · The Page** ⭐ | The target, ported | a strip in a panel | three rung panels | normal |
| **g2 · The Thread** ⭐ | A conversation with a composer | an attachment in a message | three chips inside one of his messages | to the bottom |
| **g3 · The Table** | The cards are the interface | the page's whole top, tappable | three empty **places at the table**, drawn as cards | normal |
| **g4 · The Letter** | Prose, no furniture at all | a plate pasted into the letter | three prices **inside a sentence** | normal |
| **g5 · The Board** | A pinned board and a swapping rail | pinned, never leaves the screen | three rows in the rail | **the document never scrolls** |

**Could any two be collapsed?** No, and here is the check. g1 → g2 needs a message model, a
composer and a send; g1 → g3 needs the rung panels deleted and the choice moved onto card-shaped
seats; g1 → g4 needs the three panels rewritten as one sentence; g1 → g5 needs the document scroll
removed and the panels replaced by panes. Every one of those is different DOM and different words,
not different CSS. The closest pair is g1 and g4, and they differ by about 300 words of copy.

---

## g1 · The Page — how faithful it is

**Faithful on flow, mechanism and voice; every count is now a token.**

| The target | g1 |
|---|---|
| headline that counts, then the strip, then box one, then the count, then the rungs, then the extra boxes open in place, then bump → disclosure → CTA | identical, in that order |
| *"the box appearing IS the demonstration of what the money buys"* | kept whole — boxes two and three sit directly under the rungs and the page carries her to the first empty one |
| the router reports what she TYPED and offers to move the second half into its own box | kept, including the pre-fill that splits her *"stay or go"* across two boxes |
| Fraunces + IBM Plex, `--paper #FBF8F1`, `--gold #9C6A16`, 3px radii, framed backs | unchanged |
| one checkbox on the page, the $12.77 bump | unchanged |
| every rung prints its own card count as a receipt | unchanged |

**The six things that had to change, and why each one is forced.**

1. 🔴 **Every count is a registry token.** The target hardcodes *"Eight cards"*, *"these six"* and
   *"The six that went face down"*. On Monday that page sells two cards that do not exist. g1
   prints 6/1/5 on Monday, 8/2/6 on Tuesday and 12/3/9 on Sunday, straight off the island.
2. 🔴 **`$12.77` was typed into the JavaScript.** It now comes from `REG.bump.price_usd`, like the
   three rung prices.
3. **"Door one" / "Door two" became "Turned this morning" / "Still face down".** Doors are a fact
   about The Two Doors and about no other spread. Monday has no doors. The two labelled groups,
   the gold mono band label and the framed backs all survive; only the labels generalise.
4. **Every face-down card is drawn.** The target draws four cards — one turned and one back per
   door — and puts the rest in the caption. The operator asked for the face-down cards shown, so
   all of them are: 6 on Monday, 8 on Tuesday, **12 on Sunday**, which is the most there is.
   Six columns of backs on a phone, nine from 560px; nothing scrolls sideways at 320px.
5. **The art is the real files**, not base64: `evelyn/tarot-rws/<slug>.jpg` for the turned cards
   and that day's own `marcus/07-down-<day>.jpg` for the backs, cropped by the measured
   `backCrop` numbers. Photographs, never a flat graphic.
6. ⚠ **One small bug in the target, fixed.** Its CTA still read *"Pick how many questions"* after
   she had picked one, while the red line under it said a box was empty — the button contradicted
   the helper. g1's button names the real blocker (*"There's still an empty box"*) and the red
   line keeps the count. **The price is never on the button while a box she paid for is empty.**

**Also added, because the target is a mockup and this is a page that takes money.** `<meta
charset>` and `<meta viewport>`, mobile-first at 390px with four media queries, the `&s=` day
contract with a lost-link page, `&d=` (which now refuses a date whose weekday is not the spread's,
so the masthead cannot print *"Wednesday · The Two Doors"*), and `&recover=1`.

**Not carried over.** The target's `.note` strip at the top is a mockup instruction to the
operator, so it is an HTML comment here instead. The target has no `?c=` entry line and neither
does g1.

**What it risks.** Nothing structural. It is the longest of the five on a phone (~3,000px on
Tuesday) because the whole spread and three rungs of prose are open at once, and the strip is the
first thing she meets — a woman who came for a price scrolls past 12 cards to reach one.

**New copy needing sign-off.** Only the tokenised forms of the target's own sentences, plus
`ctaWaitBox` and the guardrail line added to the disclosure block (*"I read the cards, not the
man…"*), which is there because there is no longer a checkbox to carry it.

---

## g2 · The Thread ⭐

**The format.** A conversation. Marcus's messages on the left, hers on the right, a composer
pinned to the bottom of the screen. No sections, no panels, no rung list.

**The order of events.**

1. Four of his messages: the headline that counts, the lede, the whole board as one attachment,
   and *"What are you asking me?"*
2. The composer is question one. She types and sends; it becomes her own bubble.
3. He answers with the router line — a fact about the sentence she just sent.
4. *"How many things are you asking me?"* and three chips, each carrying a price.
5. ⭐ **She taps a price. He says what it buys. The next composer appears, one message down.**
6. Same for the third. Then the bump as a chip pair, the disclosure and the guardrail as two of
   his messages, a receipt, and the button.

**What the format buys.** The box she has to fill is pinned to the bottom of the screen, so it
cannot be off-screen — the fault that started this whole exercise is structurally impossible.
It is also the only version where the page has a voice rather than a layout, and the house has
already proved it converts: `/chat` is the V1 funnel.

**What it risks.** ⚠ A chat implies a person is there. Marcus is not, and the disclosure says the
writing is assisted, so the format is making a promise the copy then walks back. It is also the
slowest of the five to reach a price — she must send question one before the chips appear — and a
sceptic who wants to know the cost before she types has no way to get it.

**New copy needing sign-off.** The message-by-message sequencing (which words go in which bubble),
the bump chip pair, the *"Tonight is on — take it off"* toggle, and the closing receipt bubble.

---

## g3 · The Table

**The format.** The cards are the interface. Every card on the board is a button, and tapping one
says what it is already set on — which is the proof the face-down cards are not decoration.

**What replaces the rung list.** Three empty places at the table, drawn as cards, in a row after
the spread. The first is hers already; the second and third are dashed and carry a price. She is
not reading a price list, she is looking at a table with room on it.

**The order of events.** Board (tappable, with a readout) → box one, sitting on the table with no
panel around it → the three places → ⭐ **taking a place opens it into somewhere to write, in the
row she just tapped** → bump, disclosure, button.

**What it risks.** ⚠ Tapping cards is play, not buying, and the readout rewards exploring rather
than deciding. The three seats are also the least explicit price presentation of the five: at
320px each seat is about 90px wide and carries a name, a line and a price, which is a lot in a
small square.

**New copy needing sign-off.** *"Yours already" / "Take this place"*, the tapped-card readout
lines, and the `tapHint`.

---

## g4 · The Letter

**The format.** No page furniture at all. One column of prose in his hand, a drop capital, and the
cards as a plate pasted into the letter between two rules. There is not a panel, a tile or a
button-shaped button above the sign-off.

**The order of events.** The letter explains the cut and shows the plate → *"write it on the
line"* and a ruled line, not a box → the router in italics → the paragraph about how many things
she is asking → ⭐ **three prices inside one sentence, underlined; tapping one does not select a
control, the letter CARRIES ON in a new paragraph addressed to the choice she made, and rules a
second line under it** → the count as a receipt line → the bump as a postscript → *Marcus* → the
disclosure → the button.

**What it risks.** ⚠ It is the version most dependent on the writing being good, and it has no
skim path: a woman looking for a price passes about 250 words before she finds one, and the prices
are underlined words rather than buttons, which some people will not read as tappable. ⛔ It is
also the only version where the pay button is visibly a button in a page that has spent 600 words
pretending not to have any.

**New copy needing sign-off.** Almost all of it — `l1` through `l6`, the three `after` paragraphs
that continue the letter once she has chosen, the ruled-line labels and the sign-off.

---

## g5 · The Board

**The format.** The cut is laid out and it stays put. The document does not scroll. The board is
pinned at the top for the whole purchase and the work happens in a rail underneath it, which
swaps its contents rather than growing.

**The order of events.** Board pinned → rail pane one: box one, the router, the three rungs, the
chosen rung's prose, **Next** → ⭐ **the rail swaps to the boxes that rung bought, with the caret
already in the first of them, one line under where the price was — nothing on the board moved and
nothing scrolled** → pane three: bump, receipt, disclosure, button, with *Back* on both.

**What it buys.** She never loses sight of what she is buying, and she is never more than one
panel from the end. It is also the only version that is exactly one screen tall on arrival.

**What it risks.** ⚠ **The honest limit is stated in the file:** on a short phone with the keyboard
up the *rail* scrolls internally. The document still does not. ⚠ Panes also hide the argument —
the rung prose is gone the moment she moves to pane two — and a reload starts her at pane one.
⚠ `100dvh` layouts are the ones that break on older mobile browsers.

**New copy needing sign-off.** The pane step labels (*"One of three"*), *Next* / *Back* / *"Back
to the questions"*, and the compressed one-line rung descriptions.

---

## What is true of all five

- **The mechanism is intact in every one of them.** The box appearing is the demonstration, and in
  every version it appears directly under the control she just used, with the page (or the thread,
  or the rail) carrying her to it.
- **No consent ticks anywhere.** Exactly one checkbox per page and it is the bump — g2 uses a chip
  pair instead, so it has none at all. The guardrail is prose in the disclosure block on all five.
  This is checked by the Playwright pass, not by reading the files.
- **The whole day spread is drawn**, turned and face down, off the registry. **The open cards are
  neither drawn nor named until she picks a rung that includes them**, which is what holds the
  board at 12 and never 18.
- **No count is typed anywhere.** Every number is a token filled from the generated island, so all
  five are right on all seven days. `node scripts/build-07-booking-data.mjs --check` covers them.
- **The price is never on the button while a box she paid for is empty**, and the button goes dead
  again if she empties one.
- charset, viewport, mobile-first at 390px, `?c=` / `&s=` / `&d=` / `&recover=1`.

## What was measured, not read

All five, at **390×844, 320×720 and 1280×900**, on **Monday, Tuesday and Sunday**, walking all
three rungs — **135 complete orders**.

| | Result |
|---|---|
| `documentElement.scrollWidth − clientWidth` | **0** everywhere, idle and mid-order |
| any element with `scrollWidth > clientWidth` | **none** — the 12-card Sunday board fits 320px |
| console errors · failed requests · 4xx | **zero** across all 45 loads |
| cards drawn vs registry | `free`+`paid` exactly, every day, every version |
| checkboxes on the page | one (`#bump`) on g1/g3/g4/g5, zero on g2 — asserted, not assumed |
| CTA total | correct at all 135; the bump adds **exactly 12.77** at all 135 |
| CTA with a paid box empty | never live, and never carrying a price — checked on the way in, and again by emptying the last box after a complete order |

**🔴 How the off-screen-box fault was tested.** For every version, day, viewport and rung: tap the
package, **wait for the scroll to actually settle** (poll until the position is stable for six
frames — the rail's own scrollTop as well as the window's), then read `getBoundingClientRect()` for
every required box. Two assertions: **no empty required box may have `top < 0`**, and **at least
one empty required box must intersect the viewport**. Filled boxes are allowed to scroll away.
All five pass at every combination.

**Two real bugs the pass caught while building.**

- 🔴 **g3's first seat was a disabled button.** *"Yours already"* was `aria-disabled`, so once she
  had taken a second place there was no way back down to one question. It is now a live control
  that resets to one.
- 🔴 **The card art was cropped.** `aspect-ratio:200/347` against scans that are 350×600 clipped
  about a percent off each side, which is enough to cut the T and the L off `THE DEVIL` — the card
  prints its own name across the full width of the plate. The ratio is now the scans' own.

## Still open, whichever wins

1. 🔴 The link carries `&s=` but not the draw date, so all five walk back from today to that
   spread's weekday. A forwarded email shows the wrong morning.
2. 🔴 The open cards' duplicate-draw edge case (`07-C5` §2) is undecided and has to be settled
   before any of these takes money.
3. ⚠ The button is a mockup — it alerts the Stripe payload. The refusal of a rung must happen in
   `priceBackendOffer` before Stripe, never in the browser.
4. ⚠ `localStorage` carries the recover state, which is enough for review and not for a different
   device.

## How to review them

Double-click `review-booking-pages/index.html`, pick a day, and open G1–G5 from the top. Or open a
file off disk with a query string:

```
?c=1&s=the-weight              Mon · The Weight             6 = 1 turned + 5 down
?c=2&s=the-two-doors           Tue · The Two Doors          8 = 2 + 6
?c=3&s=the-small-instruction   Wed · The Small Instruction  6 = 1 + 5
?c=1&s=the-undertow            Thu · The Undertow           7 = 2 + 5
?c=2&s=the-ledger              Fri · The Ledger             9 = 3 + 6
?c=3&s=the-other-chair         Sat · The Other Chair        7 = 2 + 5
?c=1&s=the-zodiac-spread       Sun · The Zodiac Spread     12 = 3 + 9
```

```
node scripts/build-07-booking-data.mjs            # rewrite every island
node scripts/build-07-booking-data.mjs --check    # fail if any is stale
node scripts/check-07-registry.mjs                # the above, plus everything else
```

⛔ Round one's `07-C1-booking-page-f1…f5` and `07-C1-FLOWS.md` are untouched and still open —
they answer a different brief (five orderings, five consent treatments) and the operator may still
want to point at one.

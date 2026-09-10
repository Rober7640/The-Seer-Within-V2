# 07-C1 — five flows, one to pick

**The brief was that the paint is right and the order of events is wrong. So the paint does not
move.** All five are the `07-C1-booking-page-mockup-c5.html` visual language — the same Bodoni /
Plex type, the same ochre and slate, the same sunk card strip, the same felt, the same Marcus.
What changes between them is **when each thing happens**.

## The decision

> **Ship F1. Test F2 against it.**
>
> F1 is the flow that cannot produce any of the four faults, because in F1 a thing that is not her
> turn is not on the page. It is also the only one with **no consent control at all**, which is
> where the evidence actually points once you read what the research says rather than what we
> built off it. F2 is the honest challenger: it keeps the whole page open and puts the researched
> three-point agreement on the button itself. F1 and F2 disagree about one measurable thing —
> whether a commitment step earns its friction — and nothing else.
>
> F4 is the one worth building anyway even if it loses, because it is the only version that stops
> asking her to value three products she has never bought.

| | The flow in one line | Cards | Ticks | Screens |
|---|---|---|---|---|
| **F1 · The Count** ⭐ | Each step opens the next, and nothing is on the page before its turn | first | **none** | 1 |
| **F2 · The Turnstile** ⭐ | Everything is open; the pay button is a door with three points on it | first | **3, in a popup on the button** | 1 |
| **F3 · Two Doors** | What it costs, then what to write | first | 1, over all five, at the button | 2 |
| **F4 · The Ledger** | No menu — one question at $35, and each further one is a line she adds | first | folded into the button's label | 1 |
| **F5 · Price First** | The price is the first thing on the page; the cards come after, as the receipt | **after** | 3, printed inline | 1 |

---

## What is true of all five

**She chooses the package before a box exists.** The operator's correction — *"u gave the option of
3 questions before u even asked the user which package she wants to buy"* — is the root of the old
fault 2, not a separate issue, and all five now obey it. There is never a place to type that she
has not already paid for, and the box appears directly under the control she just used.

**The page never shows or names a card she is not buying.** Only the cards actually turned over in
this morning's email are drawn — one on Monday, two on Tuesday, three on Sunday, straight off the
registry. Everything still face down is *said*: *"Nine more are still face down."* The count is the
**day spread's own remainder**, never the cut's total, so Sunday is nine and never fifteen or
eighteen. The open cards are not mentioned at all until she picks a rung that includes them. This
is `07-C1-booking-page-v3h-b.html`'s `COPY.decl` + `declare()`, reused rather than reinvented.

**Nothing states a count in hand-written copy.** Every number on every page is a token filled from
the generated registry island, so all five print the right numbers on all seven days.
`node scripts/build-07-booking-data.mjs --check` covers them by their filenames.

**The guardrail is on every one of them, before payment.** *Marcus reads the cards, not the man.*
On F1 it is a printed statement; on F2 and F5 it is one of the three she agrees to *and* a block;
on F3 it is inside the five; on F4 it is one of the three printed above the button. It stopped
being a checkbox on three of the five. It never stopped being on the page.

**Two lines of shared copy changed and need sign-off on all five.** The hero used to be *"The
other six are still face down"*, which restated the declaration on the felt an inch above it, off
the same registry, in the same words. It is now **"They don't turn over until I know what you're
asking."** with a lede that names no count at all. And the router's offer became
**"Give the second half its own box — $57"**, because under package-first the router can no longer
point at a box; it can only offer to buy one.

**`<meta charset>` and `<meta viewport>` on all five, mobile-first, seven to nine media queries
each** — against the mockup's four. 390px is the design width and everything above it is a
widening. ⚠ *The brief said the mockup declares no charset and no viewport. It declares both
(lines 1–2 of the file, which is untracked, so somebody fixed it). What is still true is the
four media queries and the desktop-first sizing.*

---

## The four faults, and what each version does about them

| | 1 · consents before she knows the price | 2 · boxes appear off-screen | 3 · orphaned counter | 4 · dead section title |
|---|---|---|---|---|
| F1 | no consent control exists; the terms sit at the payment moment | boxes are step 3, under step 2, and the page carries her | **no counter** — the step she is on *is* what is missing | *How many things are you asking me?* |
| F2 | consent is a popup **after** she has decided to buy | boxes are the next block under the rungs; scrolled into view | the missing line sits above the button; the modal's counter sits with its own three ticks | same |
| F3 | consent is on screen 2, four inches from the button | a screen change starts at the top — a box cannot be revealed above her | the missing line is directly above the button | same |
| F4 | no consent control; the button's label carries it | the new box is born under the button she just tapped | the missing line is the slip's last word before the button | same |
| F5 | consent is three ticks immediately above the button | boxes are directly under the rungs, scrolled to | the missing line sits between the ticks and the button | same |

**Fault 4's replacement is `07-C5` §5.2 verbatim** — *How many things are you asking me?* The old
title, *Which reading your question needs*, described the dead C2 model where the rungs were
quantities of our cards.

---

## The tick question, and why the five differ on it

The research this project cites for the commitment step is
`docs/intel/how-i-built-a-60k-per-month-astrology-offer.md` line 54: the single biggest conversion
lift came from **a popup on the checkout button that made the visitor agree to three crucial
points before proceeding.** Two things in that sentence were lost in translation on the reference
page:

1. **Three points, not five.** We had five.
2. **A popup fired by the checkout button** — so it lands *after* she has committed. Ours was a
   section she scrolled past *before* she had chosen a rung or seen a price.

So the evidence never supported the block we built. It supports a short agreement at the moment of
payment. **Nothing here removes the commitment step as a concept; it moves it, shrinks it, and in
two of the five tests whether it is needed at all.**

**The three, where a version uses three.** These are the three that actually prevent a refund or a
complaint. They are the same words in F2, F4 and F5, so the three versions are comparable.

> - I understand this cut was made once, this morning, and won't be made again for me.
> - I understand Marcus reads the cards, not the people in them — nothing in my reading is a claim
>   about what anybody else will do.
> - I understand my reading is written for me and reaches me inside 24 hours, at the address I pay
>   from.

**The two that drop out** — *I saw the two this morning* and *the question above is mine* — are not
deleted. They are true, so they are still said, as plain copy under the boxes.

| Version | Treatment | What it buys | What it costs |
|---|---|---|---|
| F1 | **None.** Five statements as plain second-person copy above the button | Zero friction at the exact moment she is closest to paying; nothing to misread as a form | No record that she read anything. If a chargeback ever turns on *"I didn't know it was one cut"*, this is the version with the weakest answer |
| F2 | **Three, in a popup on the pay button** | The researched pattern, reproduced properly: after the decision, three points, three taps | It is an extra screen between her and Stripe, and a modal on a phone is the one pattern people close reflexively |
| F3 | **One tick over all five** | Keeps every statement, costs one tap, and sits beside the button rather than two screens above it | Five statements under one tick is a consent shortcut, and it is the operator's call whether that reads as honest or as small print |
| F4 | **Folded into the button's own label** | No control at all, and the agreement is unavoidable — she cannot press the button without pressing the sentence | A two-line button is unusual, and the label carries the price *and* the agreement, so it is doing two jobs |
| F5 | **Three, printed inline** | Same three as F2, no modal. F2 and F5 differ by exactly one thing, which is the only way to learn whether it was *three points* or *the popup* that did the work | Three taps on the page, in the place the old five-tick block sat — the least new of the five treatments |

---

## F1 · The Count ⭐

**The flow in one line.** One screen where each step opens the next, and a thing that is not her
turn is not on the page.

**The order of events.**

1. The cut — only the cards turned this morning, then *"the other six are still face down"*, said.
2. **Step one · how many things are you asking me?** Three rungs, three prices, none pre-selected.
   The chosen rung unfolds its own prose; the other two do not.
3. **Step two appears.** Exactly as many boxes as she just paid for. The page scrolls to it and
   puts the caret in the first empty one.
4. **Step three appears** — only once every box she bought has something in it. The bump, the
   slip, the five statements as plain copy, the button.

**What it fixes.** All four. There is no consent step to be early (1). A box cannot appear off
screen because it is the top of the next step and the page goes there (2). There is no counter to
orphan, because the step she is looking at is the thing that is missing (3). The title is C5's (4).

**What it risks.** ⚠ **A woman who scrolls to find a price finds one; a woman who scrolls to find
out what she gets finds a page that has hidden most of itself.** This is the version least
readable by a sceptic doing a first pass, and the step numbers make it feel like a form even
though it is three taps. It is also the version with no record of consent at all.

**New copy needing sign-off.** `termsH` / `termsLead` and the five statements rewritten second
person (*"You saw two this morning. Paying is what turns the rest of them over."*), `moneyPlain`,
the three step labels, and `askH` (*"Now the two questions."*).

---

## F2 · The Turnstile ⭐

**The flow in one line.** Everything is open at once and the only gate is the door: the pay button
does not pay, it opens three points, and agreeing to all three opens the way through.

**The order of events.**

1. The cut, said.
2. How many things are you asking me — three rungs, each carrying one line of what it buys.
3. The boxes appear under the rung she tapped; the page scrolls to the first empty one.
4. The bump, the slip, and a line naming the one thing still missing with a link that goes there.
5. **Turn them over — $57.** Which opens the turnstile: three points, a counter beside them, and
   only then the real button.

**What it fixes.** Consent moves from before the price to after the decision, and shrinks from five
to three (1). Boxes are born under the rungs and scrolled to (2). The counter that used to float
two sections away from its checkboxes now sits inside the modal with them, and the page's own
missing-line sits directly above the button (3). Title (4).

**What it risks.** ⚠ A modal on a phone is the thing people dismiss without reading, and the
research's lift may have come from the *content* rather than the *popup*. That is exactly why F5
exists. It is also the only version where the pay button does not do what it says on first press,
which is a small betrayal of the label.

**New copy needing sign-off.** `modalH` (*"Three things, then I'll cut into it."*), `modalSub`,
the three waiting states, `modalBack`, `plainTwo` (the two statements that leave the modal), and
the four *what's missing* lines.

---

## F3 · Two Doors

**The flow in one line.** Two screens: what it costs, and then what to write.

**The order of events.**

1. **Screen one.** The cut, the hero line, and one decision: how many things she is asking, at
   three prices, with all three arguments open at once so they can be compared side by side.
2. A rung is tapped; a **Next — write your two questions** button appears under the row.
3. **Screen two.** An order bar at the top saying what she picked and what it costs, with
   *Change it*. Exactly that many boxes. The bump. The slip.
4. One tick over the five statements, the missing line, the button.

**What it fixes.** Consent is on screen two, beside the button (1). A screen change starts at the
top, so a required field cannot be revealed above where she is standing — this is the version where
fault 2 is structurally impossible rather than handled (2). The missing line sits above the button
(3). Title (4).

**What it risks.** ⚠ **Wizards lose people between steps**, and this adds a tap that F1 does not.
The reverse of `07-C1-VERSIONS`' v4 risk: v4 hid the price behind a step, which the README's market
research says loses the sceptic; this hides the *typing* instead, which is the safer half to hide,
but it is still a second screen. A reload lands back on screen one with her typing intact.

**New copy needing sign-off.** `nextCta` and its three forms, `nextWait`, the order-bar sentence,
*Change it*, and the four missing lines.

---

## F4 · The Ledger

**The flow in one line.** No menu — one question at $35, and every further question is a priced
line she chooses to add to a slip that adds itself up in front of her.

**The order of events.**

1. The cut, said.
2. *"One question is $35. That's where everybody starts and it's where most people stop. If there's
   a second thing, I'll ask you before there's anywhere to type it."* — **the package, named and
   priced, before there is anywhere to type.**
3. The slip shows one line. Box one appears under it.
4. Once box one has something in it — and not before — **Yes, there's a second thing. Add it, $22
   more.** A paid line, tapped, and *only then* box two, which the page carries her into. *Take it
   off* removes both the line and the box.
   ⛔ *The gate on box one being non-empty is not decoration. Without it she can buy her way down to
   question three with question one still blank, and the only empty box on the order then sits two
   screens above where the page has put her — the exact fault this brief is about. The Playwright
   walk found it, and it is fixed.*
5. Same for **And a third. Add it, $30 more** — with the closing passage named as what the extra
   buys, which is the honest answer to why question three costs more than question two.
6. Three is where I stop. The bump, the slip's total, three printed points, and a button whose own
   label says yes to them.

**What it fixes.** All four, and it is the only version where the *upsell* is also fixed: the
router's offer and the slip's next line are the same control, so *"you asked me two things"* and
*"that's $22 more"* are one sentence instead of two arguments.

**What it risks.** ⚠ **It is the only version that pre-selects a rung**, which `07-C5` §5.3
explicitly rules out for the three-up row. What that buys is that she never sees a box she has not
paid for. What it costs is that **$87 is never a thing she considered, only a thing she could
arrive at** — and anchoring says the three-up row is what makes $57 look reasonable. This is the
version most likely to shift the mix down. It also prints the deltas, so she can see that question
three costs more than question two; the copy answers that out loud rather than hoping she does not
notice.

**New copy needing sign-off.** `openLine`, both `add` offers and their sub-lines, `remove`, `cap`,
`buttonTop` (the folded agreement), and `needQ`.

---

## F5 · Price First

**The flow in one line.** The price is the first thing on the page and the cards come after it, as
the receipt for what she just chose.

**The order of events.**

1. One line saying where she has come from and that the rest of the table is face down.
2. **How many things are you asking me** — three rungs, three prices, above the fold on a 390px
   phone with no scrolling at all.
3. The boxes, under the rung she tapped.
4. **Only then the cut.** *"Now the cards, and what you just bought."* The turned cards, and a
   declaration that can now be exact instead of hedged, because it knows the rung.
5. The bump, the slip, three ticks, the button.

**What it fixes.** Consent is three points immediately above the button (1). Boxes under the rungs
(2). Missing line between the ticks and the button (3). Title (4). And it fixes something the other
four do not: the declaration under the cards stops being written for an unknown rung.

**What it risks.** ⚠ **She lands on a price with almost no context.** For a woman who arrives warm
off a 1,400-word email that is a feature; for anyone else it reads as a shop. It also spends the
top of the page on the one thing the email already showed her — which is the bet — and if that bet
is wrong the page has no way to recover, because there is nothing above the price to read.

**New copy needing sign-off.** `opening`, `cutLateH` (*"Now the cards, and what you just bought."*),
and the three-tick waiting states.

---

## What I found beyond the four faults

Everything below was read out of the mockup, not guessed.

1. 🔴 **The mockup draws the cards she has not seen.** Six blue backs, numbered, with their
   position names printed under them — *What it costs*, *What it gives*, *Who you become*. Under
   the operator's rule of 2026-09-04 that is the thing the page may not do: only what has actually
   been turned over gets drawn, and the rest is said. All five follow `v3h-b`: one, two or three
   Rider-Waite scans and a sentence.
2. 🔴 **The mockup is a Tuesday-only artefact.** Eight tiles, eight position names and two turned
   cards, all typed into the HTML, plus `12.77` typed into the JavaScript twice. On Monday it would
   print seven cards that do not exist and name six positions that are not Monday's. All five take
   every card, name, position, price and count from the generated island — nothing is typed.
3. 🔴 **The router points at a box that is not there.** Type *"do I stay or go"* into the mockup
   and it answers *"the second box is where the part you left out goes"* — and there is no second
   box, because she has not bought one. It is the same fault as fault 2, said out loud by the page
   itself. All five make the router offer a **package change with the new price on the offer**,
   and only the tap opens a box.
4. ⚠ **The five consent rows are `<div>`s, not `<label>`s.** So on a phone the only tap target is
   the 19px box itself; tapping the sentence does nothing. Wherever a tick survives in the five,
   it is a `<label>`.
5. ⚠ **The card strip is a sideways scroller** (`overflow-x:auto`), which on a 320px phone puts
   cards behind a gesture nobody makes. The five use a grid of exactly as many columns as there are
   turned cards, so Monday's single card does not print two gaps and nothing scrolls sideways.
6. ⚠ **The gate line concatenates three unrelated failures into one sentence** — it can render as
   *"3 left · no reading chosen · a question box is empty"*, which reads as noise rather than an
   instruction. All five name **one** missing thing at a time, in the order she will meet it.
7. ⚠ **No way back.** The mockup has no `&s=`, no `?c=`, no `&recover=1`, no lost-link page and no
   `localStorage` — it is one hardcoded morning. All five carry the whole URL contract.
8. ⚠ **`aria-pressed` is the only signal a rung was chosen** — no focus ring. All five add
   `:focus-visible`.
9. ⚠ **Dead code in `sync()`**: `const asked = [...]` is built on every keystroke and never read.

## What was measured, not read

A Playwright pass opened all five at **390×844, 320×720 and 1280×900**, on **Monday, Tuesday and
Sunday**, and walked all three rungs on each — **135 complete orders**.

| | Result |
|---|---|
| `documentElement.scrollWidth − clientWidth` | **0** everywhere, idle and mid-order |
| any element with `scrollWidth > clientWidth` | **none**, at every viewport |
| console errors · failed requests · 4xx | **zero**, all 45 page loads (every RWS scan and both font files resolve) |
| pay button total | correct at all 135, and the bump adds **exactly 12.77** at all 135 |
| pay button with an empty paid box | **never appears** — checked on the way in *and* by emptying the last box after a complete order, which shuts it again |
| card images drawn vs registry `counts.free` | equal on every day (1 Mon · 2 Tue · 3 Sun) |
| F2's turnstile | its own button is absent until all three points are ticked, and carries the same total |

**🔴 How fault 2 was tested specifically.** For every design, day, viewport and rung: record
`window.scrollY`, tap the package, **wait for the smooth scroll to actually settle** (poll
`scrollY` until it is stable for six frames), then read `getBoundingClientRect()` for every
required box. Two assertions: **no empty required box may have `top < 0`** (above the top of the
viewport), and **at least one empty required box must intersect the viewport**. Filled boxes
scrolling out of view are allowed — that is normal reading.

**It caught a real one.** F4 originally offered *"add a second thing"* before question one had
anything in it, so a buyer could reach $87 with question one blank and land 165px past it on a
390px phone (227px at 320px). Fixed: the offer to add a question does not exist until the box
above it has something in it. Every design now passes at every combination.

**Two more found by building rather than by testing.**

- 🔴 **A CSS class collision.** The declaration's title carried `class="t"`, which is also the
  rung button's class, so the sentence rendered inside a bordered, padded card. Renamed `.dt` /
  `.ds`. Worth noting because `.t` and `.s` are exactly the kind of two-letter class that a fifth
  version quietly inherits.
- 🔴 **`&d=` could print a lie in the masthead.** A pinned date whose weekday is not the spread's
  day rendered *"Wednesday · The Two Doors"*. The pin is now ignored unless its weekday matches
  the spread, which also makes screenshots reproducible without hand-checking a calendar.

## Still open, whichever wins

These are the reference build's open items and none of the five settles them.

1. 🔴 The link carries `&s=` but not the draw date, so all five walk back from today to that
   spread's weekday. A forwarded email shows the wrong morning.
2. 🔴 The open cards' duplicate-draw edge case (`07-C5` §2) is undecided and has to be settled
   before any of these takes money.
3. ⚠ The sample reading does not exist. All five link to `#sample`.
4. ⚠ The button is a mockup. The refusal of a rung must happen in `priceBackendOffer` before
   Stripe, never in the browser.
5. ⚠ `localStorage` carries the recover state, which is enough for review and not for a different
   device.

## How to review them

Open any file off disk and add the query string. `&s=` takes the full registry key.

```
?c=1&s=the-weight              Mon · The Weight             6 / 9 / 12
?c=2&s=the-two-doors           Tue · The Two Doors          8 / 11 / 14
?c=3&s=the-small-instruction   Wed · The Small Instruction  6 / 9 / 12
?c=1&s=the-undertow            Thu · The Undertow           7 / 10 / 13
?c=2&s=the-ledger              Fri · The Ledger             9 / 12 / 15
?c=3&s=the-other-chair         Sat · The Other Chair        7 / 10 / 13
?c=1&s=the-zodiac-spread       Sun · The Zodiac Spread     12 / 15 / 18
```

Or double-click `review-booking-pages/index.html`, pick a day, and open F1–F5 from the top of the
list. The review copies differ from the real files by one line — a default day so they render
without a query string.

```
node scripts/build-07-booking-data.mjs            # rewrite every island
node scripts/build-07-booking-data.mjs --check    # fail if any is stale
node scripts/check-07-registry.mjs                # the above, plus everything else
```

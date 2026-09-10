# 07-C1 · H — the rungs first, three ways

**The brief was one line: same flow, but the first question comes after the three payment options.**
So the rungs move above the boxes and **every box, box one included, is now a consequence of what
she picked**. That makes the mechanism *more* consistent, not less: pick two questions, two boxes
open, and she watches both arrive.

**Everything else is g1.** Same masthead, same headline, same strip, same cards, same colour, same
type, same disclosure, same bump, same button. The arrival screen of all three is **byte-identical
to `g1-tue-390.png`** — same PNG, 464,221 bytes — because nothing above the fold moved.

## The decision

> **Ship h2 · Reversible against g1.**
>
> All three answer the same question — *how does she count things she has not written down yet?* —
> and only h2 answers it by **not making her**. Her number is a draft, the page says so before she
> picks, and then the page does the counting for her out of her own sentence and offers to move
> her **either way**. Every other answer still needs her to get it right first go.
>
> It is also the only version that can lower the price she is about to pay, which is the thing that
> makes the ladder read as Marcus rather than as a shop, and it does it at the one moment the
> argument is provably true — she has written one thing and left the box she paid for empty.
>
> **h3 is the honest challenger** if the operator would rather the page never showed her an empty
> box she has not earned. h1 is the cheapest of the three to ship and the least likely to teach us
> anything: it is g1's flow reordered and reworded, with no new mechanism to be right or wrong.

| | The flow in one line | Its answer to *count before writing* | Idle | Mid-order |
|---|---|---|---|---|
| *g1 · The Page* | *box one first, then the count* | *she has already typed when she is asked* | *2,899px* | *3,396px* |
| **h1 · The Count** | The count asked as a plain question about her, price subordinate | **Reframe it.** She answers about her morning, not about a menu | 2,686px | 3,431px |
| **h2 · Reversible** ⭐ | She picks, writes, and the page offers to move her up *or* down | **Make it a draft.** Getting it wrong costs one tap and loses nothing | 2,730px | 3,504px |
| **h3 · One At A Time** | A box is earned by the box above it being written | **Only ever ask about the next one.** Never three empty boxes | 2,665px | 3,713px |

*390px phone, Tuesday's spread. Mid-order is $57 with both questions typed — h3's is taller because
its third ask has appeared by then.*

## True of all three

- ⛔ **Marcus talking her down survives, unmoved.** Rung one's own receipt — *"If you came with one
  thing, stop here. This is the one and you don't need the other two."* — and the italic line under
  the row of rungs are both g1's, word for word. Under this flow they now sit **above** the boxes,
  so she reads the advice before there is anywhere to type. h2 and h3 give it a tap as well.
- ⛔ **No consent ticks.** One checkbox on each page and it is the $12.77 bump. The honest
  disclosure and the guardrail — *I read the cards, not the man* — stay as prose.
- **Registry-driven, no count in hand-written copy.** Every number is a token off the generated
  island. `node scripts/build-07-booking-data.mjs --check` covers all four pages by filename and
  `check-07-registry.mjs` still names **g1** as the live page, untouched.
- **The whole day spread is drawn**, turned and face down, and the open six are never on it —
  1/5 Mon, 2/6 Tue, 3/9 Sun, 12 cards at the most.
- **The URL contract is intact**: all seven `&s=` keys, `?c=1|2|3`, `&d=`, `&recover=1`, the
  lost-link page.
- **⛔ g1 was only ever read.** The three new pages were generated out of it so that the head, the
  CSS, the island, the `COPY` object and the plumbing are g1's bytes; each variant appends its own
  CSS, its own `COPY` overrides and its own format script, and nothing else.

**Two lines of shared copy the reorder forced, on all three.**

1. Rung one used to say the cards are turned over *"on the thing you typed above"*. Nothing has
   been typed when she reads it now. → *"…on the one thing you ask me."*
2. The router's fork readings ended in a promise that is only true at some rungs, so the promise
   became a token. At $35 it is **07-C1-FLOWS.md's own approved line** — *"Give the second half its
   own box — $57"* — because under package-first the router can only offer to buy a box. At $57 and
   $87 the box already exists, so it says so: *"The second box is already open — put the other half
   in it."*

---

## h1 · The Count

`07-C1-booking-page-h1.html` · `h1-tue-390.png` · `h1-tue-57-390.png`

**The idea.** The count is not a package she has to value, it is a fact about her morning she
already knows. So ask it that way and get the price out of the headline.

**The order of events.**

1. The masthead, the headline that counts, the lede — g1's.
2. The strip: the cards turned this morning, and the ones still face down — g1's.
3. **"How many things did you come with?"** Three rungs. The answers are *One thing. · Two things. ·
   Three things, and three is where I stop.* Each price drops **under** its answer, small, in the
   mono face, at the size of a fact rather than an offer.
4. The italic line under the row: *"If there's only one thing, buy one…"*
5. A rung opens **every box it bought, box one included**, directly beneath, and the page carries
   her to the first empty one.
6. The bump, the disclosure, the CTA — g1's.

**What it risks.** ⚠ **It is the version with no new mechanism, so there is nothing in it to
measure.** If it beats g1 the cause is the wording of one heading and the size of three prices, and
that is a hard result to act on. ⚠ Shrinking the price is a real bet in the other direction too:
the three-up row with three big gold numbers is what makes $57 look reasonable, and h1 deliberately
turns that anchor down. ⚠ *Things* and *questions* are now both in play on the same screen —
the heading and the rung answers say *things*, the receipts and the boxes say *questions*.

**New copy needing sign-off.** `frameH` (*"How many things did you come with?"*), `frameP1`
(*"Most women come with one thing and a second one they've stopped saying out loud…"*), and the
three rung answers.

**Different from the archived F1 · The Count**, which shared the name and the rung-first order: F1
hid everything that was not the current step, and its stated risk was that a sceptic scrolling to
find out what she gets meets a page that has hidden most of itself. h1 hides nothing but the boxes.

---

## h2 · Reversible ⭐

`07-C1-booking-page-h2.html` · `h2-tue-390.png` · `h2-tue-57-390.png`

**The idea.** She cannot count what she has not written, so do not make her. The number she picks
is a draft; she writes; the page reads what she wrote and offers to move her.

**The order of events.**

1–2. The masthead, the headline, the lede, the strip — g1's.
3. **"How many things are you asking me?"** — g1's heading and g1's three rungs, unchanged.
4. The italic line, then one new sentence: *"Change the number as often as you like. Nothing you've
   typed goes anywhere."* — the promise that makes the count safe to guess.
5. A rung opens every box it bought, box one included, and the page carries her to the first empty
   one.
6. She writes, and the page answers her count:
   - **UP** — a fork in box one at $35 puts a real control under the router: *"Give the second half
     its own box — $57."* One tap picks the rung, moves the second half into box two, and carries
     her to it. ⛔ The router still only *reports*; the tap picks a **rung**, and the rung opens the
     box, which is the same rule g1 has, not an exception to it.
   - **DOWN** — bought two or three, wrote the first, left the rest empty: *"You've written the one
     thing and left the box you paid for empty. If there's only the one, don't pay me for two."*
     One tap → $35, and her typed text stays in the hidden boxes if she goes back up.
7. The bump, the disclosure, the CTA — g1's.

**What it risks.** ⚠ **The down offer is the only control on this page that argues against the
sale**, and it fires on a rule (*first box written, paid boxes empty*) that will sometimes catch a
woman who is simply mid-sentence on question two — she has typed nothing there *yet*. It withdraws
itself the moment she starts, but she will have seen it. ⚠ Two offers is one more thing on a page
that already has a bump; there is a version of this that reads as the page arguing with her. ⚠ The
up offer's tap **rewrites her own sentence** — it splits box one at the *or* — and although the
button says it will, that is still the page editing her words.

**New copy needing sign-off.** `frameP1`, `keep` (*"Change the number as often as you like…"*),
`downOffer`, `downAct` (*"Then just the one — $35"*). `upAct` is F-series copy already approved.

**Different from the archived F1–F5:** all five made the router offer an *upgrade*. None could move
her down, and none told her a change was free. h2 is that missing half.

---

## h3 · One At A Time

`07-C1-booking-page-h3.html` · `h3-tue-390.png` · `h3-tue-57-390.png`

**The idea.** She is never asked to hold more than one empty box. A box is earned by the box above
it being written, and the question *"was there a second thing?"* is asked at the only moment she
can honestly answer it — after she has written the first.

**The order of events.**

1–2. The masthead, the headline, the lede, the strip — g1's.
3. **"How many things are you asking me?"** — g1's heading, g1's three rungs, all three prices open
   on arrival so the anchor survives.
4. The italic line under the row.
5. A rung opens **box one, and only box one**. The page carries her to it.
6. She writes it, and only then does the next thing happen:
   - bought one → **"Was there a second thing?"** *Yes — open a box for it, $57* and *No. One is
     the thing.*, both full width, same size. ⛔ The decline is never a grey link.
   - bought two → box two appears, written-for, and the page goes there.
   - bought three → box two, then box three, each earned by the one above it.
7. After box two, **"And a third?"** — which talks her out of it in the same breath as offering it:
   *"…I'd rather answer two things you came with than three you invented here."*
8. The bump, the disclosure, the CTA — g1's.

**What it risks.** ⚠ **Two consecutive asks is a ladder she did not choose to climb**, and however
even-handed the decline is, a page that asks twice after she has already answered can read as a
squeeze. ⚠ At $87 she pays for three boxes and is shown one, which is the opposite of the mechanism
the whole page rests on — the box appearing *is* the demonstration, and here two of the three
appear late. ⚠ 🔴 **The router and the first ask can contradict each other on screen**: after a
plain question the router says *"One thing, asked plainly. One question is what this morning's cut
is for,"* and directly beneath it Marcus asks whether there was a second. It is arguably the trust
move — he says one is enough, then asks anyway, and gives her an equal-weight *No* — but it is the
one place on any of these three where he can read as talking out of both sides. **Operator call.**

**New copy needing sign-off.** `frameP1`, and both asks in full — `COPY.ask[2]` and `COPY.ask[3]`,
their headings, their bodies and all four button labels.

**Different from the archived F4 · The Ledger**, which also added questions one at a time: F4 had
no menu at all and pre-selected $35, and its stated risk was that $87 was never a thing she
considered, only a thing she could arrive at. h3 keeps the three-up row, so the anchor stays; the
asks are the safety net, not the only route up.

---

## What was measured, not read

Three Playwright passes, `chromium`, off `file://`, at **390×844 and 320×720**, on **Monday,
Tuesday and Sunday**, all three variants, all three rungs — **54 complete orders**, plus a pass on
the controls that exist on only one variant each, plus a pass that reads the order the button
actually sends.

| | Result |
|---|---|
| `documentElement.scrollWidth − clientWidth` | **0** everywhere, idle and mid-order |
| any element wider than itself, or sticking out of `.page` | **none**, at both viewports, idle and mid-order |
| console errors · page errors · failed or 4xx requests | **zero**, all 18 contexts (every RWS scan, every card back and both font files resolve) |
| pay button total | correct at all 54 orders, and the bump adds **exactly 12.77** at all 54 |
| pay button with a paid box empty | **never lights** — checked on the way in, and by emptying the last box after a complete order, which shuts it and takes the price back off it |
| cards drawn vs registry | 1/5 Mon · 2/6 Tue · 3/9 Sun on all three, never the open six |
| checkboxes on the page | **exactly one**, id `bump`, on all three |
| the order the pay button sends | correct at all 27 payloads — `spread_key`, `tier`, the bump, exactly as many non-empty questions as the rung bought, and `cards_sold` equal to the C5 ladder (6/9/12 Mon · 8/11/14 Tue · 12/15/18 Sun) |
| `build-07-booking-data.mjs --check` · `check-07-registry.mjs` | both pass; the island is current in all four pages and the check still names g1 as live |
| | **1,062 + 112 + 135 = 1,309 assertions, 0 failures** |

**🔴 How "the box that opens is where she is looking" was tested.** For every variant, day, viewport
and rung: scroll to the top, record `scrollY`, tap the rung, then **wait for the smooth scroll to
actually settle** — poll `window.scrollY` until it is unchanged for six animation frames — and only
then read `getBoundingClientRect()` for every required box that is visible. Three assertions:
**no empty paid box may have `top < 0`**, **at least one empty paid box must intersect the
viewport**, and the page must have moved. Then the same three again after *every* box is filled,
because h3 reveals boxes as a consequence of typing and not only of tapping. It also holds for the
two controls that reveal a box without a rung being tapped — h2's *"give the second half its own
box"* and h3's *"yes, open a box for it"* — both of which were walked and both of which land box
two on screen.

**🔴 How "changing rung must not lose typed text" was tested.** Pick $35, type box one, jump to $87,
type box two, drop **two rungs** to $35, come back up to $57 — then assert both strings are
character-for-character what was typed and the order is live at $57. At both viewports, on all
three days, on all three variants. Hidden boxes are hidden, never cleared. *(The test text carries
no "or", because `splitOr` is supposed to move half of an "or" sentence into box two — see below.)*

---

## Found in g1 while working — not fixed, not touched

1. 🔴 **`splitOr` edits her sentence without asking.** Tap $57 or $87 with *"should I stay or should
   I go"* in box one and g1 silently cuts the sentence in half, puts a `?` on the first part and
   moves the rest into box two. It is the target artifact's own move and it is a good one, but on
   g1 nothing on screen said it would happen. (h2 only does it behind a button whose label says so;
   h1 and h3 inherit g1's behaviour unchanged.)
2. ⚠ **The router names an action that does not exist.** *"Say the word and I'll put the second half
   in its own box"* — there is no way to say the word. `07-C1-FLOWS.md` §"What I found" flagged this
   exact fault on the mockup and the F-series fixed it by naming the rung and its price; g1, being a
   faithful port, carries the softer version of it back in.
3. ⚠ **Dead code.** `wireBoard()`, `COPY.tapped` / `tappedSub` / `tappedUp` / `tappedUpSub` /
   `tapHint` and every `COPY.rungs.*.short` are defined and never used — g1 calls `boardHTML(false)`
   and never wires a tap. `COPY.qName` is unused too.
4. ⚠ **`ctaWait` is set twice** to the same string — once in the `COPY` literal, once in the
   `Object.assign` under it.

None of these is a reason not to ship g1, and none was changed. Items 3 and 4 are inherited by all
three variants because the plumbing is g1's bytes.

## How to review

Open any file off disk and add the query string. `&d=` pins the cut date and is ignored unless its
weekday is that spread's.

```
?c=1&s=the-weight              Mon · The Weight             6 / 9 / 12
?c=2&s=the-two-doors           Tue · The Two Doors          8 / 11 / 14
?c=3&s=the-small-instruction   Wed · The Small Instruction  6 / 9 / 12
?c=1&s=the-undertow            Thu · The Undertow           7 / 10 / 13
?c=2&s=the-ledger              Fri · The Ledger             9 / 12 / 15
?c=3&s=the-other-chair         Sat · The Other Chair        7 / 10 / 13
?c=1&s=the-zodiac-spread       Sun · The Zodiac Spread     12 / 15 / 18
```

The three moments worth opening on a phone:

- **h1** — tap *Two things* and watch where the price is. `h1-tue-57-390.png`
- **h2** — tap *Two questions*, write the first box, leave the second. `h2-tue-57-390.png`
- **h3** — tap *One question*, write the box, read what he asks next. `h3-tue-57-390.png`

```
node scripts/build-07-booking-data.mjs            # rewrite every island
node scripts/build-07-booking-data.mjs --check    # fail if any is stale
node scripts/check-07-registry.mjs                # the above, plus everything else
```

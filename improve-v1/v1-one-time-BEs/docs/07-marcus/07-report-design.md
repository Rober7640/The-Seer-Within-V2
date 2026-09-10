# 07 — the report. One design, seven spreads, three rungs

| | |
|---|---|
| **Answers** | `problems.md` item 7 — *"the report writing is pretty dull and boring… a major disappointment"* · item 10 scenario 2 — *a report for each spread* |
| **The operator's decision, 2026-09-04** | ⭐ **ONE report design, demonstrated with seven worked examples.** Not seven layouts |
| **Governed by** | [`07-C5`](../../copy/07-marcus/07-C5-tiers-by-questions-asked.md) §1 §3 §4 — the locked product · [`marcus-voice-profile.md`](../../copy/07-marcus/marcus-voice-profile.md) — the writing standard |
| **Ships as** | `scripts/07-report-template.mjs` — the renderer · `scripts/make-07-report-examples.mjs` — the seven examples |
| **Replaces** | node `10a · Build the HTML` in `docs/07-marcus/07-fulfilment.n8n.json`. ⛔ This work did **not** edit `scripts/build-07-n8n.py` — §8 is the handover |
| **Does not change** | any price · any tier key · any spread · any daily email · the booking page |

---

## 0 · The chain

**What we found.** The current report is not badly written so much as badly *shaped*. Its worst
fault is not a sentence anywhere — it is that a woman who paid $35 for an answer to one question
cannot find the answer in the document. It is four words in the middle of a paragraph on page two,
and it is never printed again. Everything else compounds that: six identical sections, a 100-character
line, and a paid object that is visibly less designed than the free email that sold it.

**What it means.** The dullness is structural. You cannot write your way out of it, because the
page gives every sentence the same weight, so the reader has no way to tell which one she bought.
And the shape physically cannot carry the product the operator locked this morning — there is
nowhere in the markup to put a second question, its heading, its turn back to the table, or the
closing passage that justifies the top rung.

**What we do.** One design with a fixed spine: **the cover, then the answers, then the cut, then the
working.** The flat answer to every question she asked is lifted out of the prose and printed as
page two, before a word of explanation. The table she was sold in the morning letter is drawn on
page three. Only then does the reading start, one answer per chapter, each opening under her own
words. The passage layout puts the card in a rail and the prose in a 4.5in column, which fixes the
measure, and it sets the picture of the card apart from the reading of it — which is the voice
profile's rule R1, made visible on the page.

---

## 1 · What is wrong with the report we ship today

Read `docs/07-marcus/reading-tue.pdf` alongside `copy/07-marcus/daily/07-D-fri-the-ledger.html`.
The email is the better-made object, and it is the free one.

| # | The fault | The evidence |
|---|---|---|
| 1 | 🔴 **The answer is not in the document.** *"The spread says go"* is four words inside the third paragraph of the opening. Nothing on any of the six pages restates what she asked or what he answered | `reading-tue.pdf` p2. `problems.md` item 7: *"actually answering the question is most important"* |
| 2 | 🔴 **Six identical units.** Same heading size, same 1.6in card floated left, four to five paragraphs, every time. Nothing on the page is more important than anything else, so nothing reads as important | node 10a's `while` loop emits one `<section>` shape and only one |
| 3 | 🔴 **The line is 6.7 inches — about 100 characters.** Book measure is 60–75. This alone accounts for a large part of "heavy to read" | `.inner{padding:.85in .9in}` with no column |
| 4 | **The paid object is less designed than the free letter.** The email has a photograph of the cut, gold eyebrows, per-card headings, a face-down strip naming every withheld position, a P.S. panel. The PDF has one accent colour used twice and one drop cap | compare the two files |
| 5 | 🔴 **The cut is never shown.** The letter sells a photograph of a table with most of it face down. The report then shows six thumbnails floated beside text and never draws the table at all | `free_cards` is used only to compute the string *"2 you saw, 6 you didn't"* |
| 6 | **The count is 8.5pt grey, said once.** Voice move 1.6 is plain arithmetic out loud. The report whispers it in a caption | `.facts b{font-size:7.5pt}` |
| 7 | **The numbering opens on "3".** Positions 1 and 2 are free, so they are absent, and the buyer's first heading is card three. It reads like a document with pages missing | markers carry the spread index |
| 8 | **It ends on the disclaimer.** Page 6 of 6 is nine-tenths white and its content is *"the writing is assisted"* | `reading-tue.pdf` p6 |
| 9 | 🔴 **It cannot carry the locked product.** One opening, N identical sections, a colophon. No slot for a second question, a verbatim heading, a turn back to the table, or a closing passage | `07-C5` §3 |
| 10 | ⛔ **A reversed minor 404s.** The marker ends `(reversed)`, `slug()` turns that into a `-reversed.jpg` filename, and only the 22 majors were ever scanned that way | `scripts/make-reversed-scans.py` header |

⚠ **What is *not* wrong.** The cover is good and it survives unchanged in shape. The per-spread
cover key (`07-cover-<slug>.jpg`) is the right mechanism and stays. The marker format — prose with
bracketed position markers — is the right idea and is extended rather than replaced.

---

## 2 · The report, page by page

One spine. Every rung, every spread, every day.

| Page | What it is | Why it exists |
|---|---|---|
| 1 | **The cover.** Spread name, cut date, her name, and a new line naming the rung and the question count | unchanged in kind. The rung line is the receipt on the front |
| 2 | ⭐ **"What you asked me, and what I said."** Every question she typed, verbatim, each followed by Marcus's flat answer in a panel | fault 1. **This page is the product.** Everything after it is the working, and the page says so |
| 3 | ⭐ **"The table, as it lies."** Every card in the cut, drawn, in position order — the day's spread first, then the cards laid on her second and third questions | fault 5. The object the morning letter sold |
| 4… | **One chapter per answer.** Heading = her question verbatim. Then the opening, then the passages, then one pull-quoted line | 07-C5 §3 moves 1 and 2 |
| … | **The closing passage** — top rung only | 07-C5 §3 move 4 |
| last | **"Before I put them away."** The close, the signature, and the small print, as one block | fault 8. The reading ends on Marcus, not on a disclaimer |

### The passage — the unit that repeats 5 to 15 times

```
┌──────────┬────────────────────────────────────────┐
│          │  4  What it costs you now              │  ← gold index + position name
│  [card]  │  ─────────────────────────────────────  │
│  1.55in  │  A stone figure lying flat on a tomb…  │  ← THE PICTURE, italic, set apart
│          │                                        │
│ Four of  │  Here's the one I sat over. The Four   │  ← THE READING, 4.5in column
│ Swords   │  of Swords in the cost seat is a…      │
└──────────┴────────────────────────────────────────┘
```

⭐ **The split between the picture and the reading is the single best thing in the design and it
costs the writer nothing**, because the voice profile already demands it. R1 says the first sentence
about a card names a physical thing. The renderer takes the first paragraph of every passage, sets
it in italic at a smaller size beside the card, and starts the reading underneath. Two consequences:
the page now has a rhythm instead of a wall, and R1 becomes visible — a passage that opens on a
concept-noun looks wrong on the page before anybody reads it.

### What makes it not dull, itemised against the diagnosis

| Fault | The fix |
|---|---|
| 1 · the answer is missing | page 2 exists and is the first thing after the cover |
| 2 · six identical units | five different objects now repeat: the passage, the pull quote, the turn-back panel, the answer opener, the closing passage. A page has at most two of the same thing on it |
| 3 · the measure | 4.5in column, ~70 characters. `.col.wide` at 5.4in for the openings and the close |
| 4 · less designed than the email | the palette, the gold rule, the uppercase micro-label and the panel are lifted straight off `07-D-*.html`. Serif body because this one is printed |
| 5 · the cut is never shown | page 3 |
| 6 · the count is whispered | page 3's standfirst says it in words — *"Eighteen cards came off one cut on 6 September. Three of them you saw in the letter."* Generated arithmetic, in his register |
| 7 · numbering opens on 3 | page 3 shows positions 1 and 2 with an **IN THE LETTER** tag, so the jump is explained before it happens |
| 8 · ends on a disclaimer | the close, the signature and the small print are one unbreakable block titled *Before I put them away* |

---

## 3 · How it holds 6 cards and 12

Nothing in the design counts cards. Two rules do the work.

1. **The passages are a list.** Monday emits 5, Sunday emits 9, and at the top rung 11 and 15. The
   only thing that changes is how many times the same block repeats.
2. **The table page is a 6-column grid.** Six cards is one row. Twelve is two. Eighteen is three
   plus two group headings.

| | Cards on the table | Table page | Whole report |
|---|---|---|---|
| Mon · The Weight · $87 | 12 | one page | 17 pp |
| Sun · The Zodiac Spread · $87 | 18 | **two pages** — the day's twelve and the second question on one, the third on the next | 15 pp |
| Sat · The Other Chair · $35 | 7 | one page | 7 pp |

⚠ **Eighteen cards is the only case that spills, and it spills honestly** — the break falls between
two groups, never inside one, because each group is one unbreakable object. A spread bigger than
twelve would need a smaller plate; twelve is the registry's maximum today and the check asserts it.

### ⛔ The paper margin — why it is on `@page` and not on the container

A container's `padding` is laid down **once**, at the top of the element. So every sheet a section
spilled onto started at the paper edge and the text bled off the top of the page — 38 of the 66
non-cover sheets in the seven examples did this, the Sunday table-page spill among them. Padding
cannot fix it, because there is no second helping of padding for the second sheet.

The border therefore comes from `@page`, which **is** re-applied to every sheet:

| | top | left / right | bottom |
|---|---|---|---|
| the cover · `@page :first` + `@page cover` | 0 | 0 | 0 — full bleed, unchanged |
| pages 2–3 · `@page frontmatter` | .55in | .9in (container) | .3in |
| the reading · `@page` | .55in | .95in (container) | .55in |

Three things are deliberate.

1. **Horizontal stays 0 on `@page`.** Left and right padding *does* repeat on every fragment, so
   the two measures were already correct and are left exactly where the design put them.
2. **The element padding was reduced by the same amount the page margin adds**, so the first sheet
   of every section is unchanged to the pixel: .7in of head on page 2, page 3 and every answer
   opener, .8in of foot at the end of the reading, .32in under the table.
3. ⛔ **The cover keeps no margin, and two independent rules say so** — `@page :first` (CSS 2.1)
   and a named `@page cover` (Chrome 110+). Only one of them has to survive the renderer. With
   neither, the cover grows a white frame *and* spills its bottom .55in onto a second sheet, which
   is what a renderer without named-page support would do.

⚠ **Cost: three sheets across the seven examples** (Mon 16→17, Thu 7→8, Fri 10→11). Nothing else
moved, and no table page spilled that did not spill before.

⚠ **A short passage and a long one both work, and this was tested rather than assumed.** Sunday's
$87 gives 15 passages about 121 words each; Monday's gives 11 at about 165. The rail is a fixed
1.55in either way, so a short passage sits beside its card and a long one runs past it.

---

## 4 · How it holds 1, 2 and 3 questions

This is 07-C5 §3 made into markup. The three answers are **sequenced, not parallel**, and the page
has to show that.

| | 1 question · $35 | 2 · $57 | 3 · $87 |
|---|---|---|---|
| Page 2 | one question, **set large** — the answer fills the page | two, medium | three, compact |
| Chapters | one | two | three |
| Answer 1 opens with | the full opening, drop cap, Marcus arriving | same | same |
| Answers 2 and 3 open with | — | ⭐ a **turn-back panel**: the named card, small, on the gold-ruled panel, and one or two sentences saying what it says differently now | same |
| Pull quote | one | two | three |
| Closing passage | — | — | ⭐ **"The three of them, side by side"**, its own opener, its own page |

⭐ **The answer page scales its type to the question count, and that is a deliberate design
decision rather than a fitting hack.** At the floor rung the answer *is* the product, so it is set
at 30pt over 15pt body and given the whole page. At three questions the same page holds three
question-and-answer pairs at 21pt over 12pt. Same page, same parts, one design — the emphasis
follows what she bought.

⭐ **The turn-back panel is the thing that makes a second answer feel like a reading.** It is the
only place in the document where a card that has already been read appears again, and it appears
small, beside two sentences about what changed. `07-C5` §3 move 1 argues this is what three separate
mornings can never produce. On the page it is also the only visual object that says *this answer
inherited a table*, which is exactly the claim the $57 rung makes.

---

## 5 · The file the writer produces

The reading is one plain-text file. Markers are whole lines in square brackets. Everything between
two markers is prose. That is the entire format, and the renderer **throws on a marker it cannot
read** — the old node dropped unmatched text in silence, which is how an opening once went missing
from a PDF a buyer had paid for.

| Marker | Where | Renders as |
|---|---|---|
| `[answer N · <her question, verbatim>]` | opens every answer, including the first | the chapter opener, forced onto a new page, her words as the heading |
| `[the answer]` | once per answer, before the first position | ⭐ **pulled to page 2.** Never printed twice |
| `[back to the table · <Card Name>]` | answers 2 and 3 only | the turn-back panel |
| `[<n> · <position> · <Card Name>]` | every paid position | a passage. `n` may be `4` or `2.1` |
| `[keep]` | once per answer | the pull quote |
| `[the three together]` | top rung only | the closing passage opener |
| `[close]` | once | *Before I put them away*, plus the signature |

Two things are derived and need no marker:

- **Paragraph 1 of every passage is the picture.** Set beside the card, in italic.
- **The last paragraph of `[close]` is the signature** if it opens with an em-dash or runs under
  45 characters. Both of Marcus's habitual sign-offs are caught.

---

## 6 · The art rules the renderer enforces

⛔ **A reversed card is never a second file.** The renderer always requests the upright scan and
turns it 180° in CSS, which is what reversed means at a table. Verified: **zero** `-reversed.jpg`
requests across all seven examples, and eight rotated cards render, including two reversed **minors**
(Queen of Cups on Monday, Seven of Swords on Friday) that would have 404'd under node 10a today.
This removes the whole bug class rather than backfilling scans for it.

⛔ **The spoken name of a card is not always its filename.** `The Wheel of Fortune` slugs to
`the-wheel-of-fortune`, which 403s; the deck file is `wheel-of-fortune`. The renderer carries a small
alias table so a writer cannot break a PDF by naming a card correctly. `judgment` → `judgement` is
in there too.

⛔ **Photographs only, one deck, one back.** The report uses the same `evelyn/tarot-rws/` scans as
the daily email and the per-spread cover at `marcus/07-cover-<slug>.jpg`. No new art is required by
this design, and none was made for it.

---

## 7 · The seven worked examples

`node scripts/make-07-report-examples.mjs` rebuilds all of them, HTML and PDF, and fails on a
missing image.

| Day · spread | Rung | Q | Cards | Passages | Pages | File · `docs/07-marcus/` | What it proves |
|---|---|---|---|---|---|---|---|
| **Tue** · The Two Doors | The Spread | 1 | 8 | 6 | 8 | `07-report-tue-two-doors-1q-35.pdf` | ⭐ **the floor.** One question, set large. The whole product at $35 |
| **Thu** · The Undertow | The Spread | 1 | 7 | 5 | 8 | `07-report-thu-undertow-1q-35.pdf` | the floor again, on the shadow-work day |
| **Sat** · The Other Chair | The Spread | 1 | 7 | 5 | 7 | `07-report-sat-other-chair-1q-35.pdf` | ⛔ the reads-the-cards-not-the-man day, at the floor. Every position is phrased as *him* |
| **Wed** · The Small Instruction | The Second Question | 2 | 9 | 8 | 10 | `07-report-wed-small-instruction-2q-57.pdf` | two questions on the **smallest** spread. The turn-back panel |
| **Fri** · The Ledger | The Second Question | 2 | 12 | 9 | 11 | `07-report-fri-ledger-2q-57.pdf` | two questions, nine-card spread, one reversed **minor** |
| **Mon** · The Weight | The Third Question | 3 | 12 | 11 | 17 | `07-report-mon-weight-3q-87.pdf` | ⭐ **the top rung on the floor spread.** Sequencing, two turn-backs, the closing passage |
| **Sun** · The Zodiac Spread | The Third Question | 3 | **18** | **15** | 15 | `07-report-sun-zodiac-spread-3q-87.pdf` | ⭐ **the stress test.** The biggest spread at the top rung — the only case where the table page spills |

The reading source for each is `docs/07-marcus/report-examples/reading-<day>.txt`.

⛔ **The questions are not invented.** Question one is the dry-run order's own question, verbatim,
from `scripts/07-dryrun-orders.json`. On a two- or three-question rung the extra questions are lifted
out of the **same woman's own dry-run text** — the second thing she already asked in the same
paragraph. That is exactly what the booking page's live router does with box one (`07-C5` §5.2).

⚠ **The open cards in the multi-question examples are synthetic and this is a build note, not a
design one.** `07-dryrun-orders.json` carries `draw.day` and no `draw.open`, because every order in
it is tier `spread` — the gap `07-C5` §7.5 already flags. The stand-ins in `make-07-report-examples.mjs`
are real cards, none of them already in that day's spread, in a fixed order, because **the order off
the cut is the position**. The morning draw job has to start storing six more before any of this
takes money.

### Word counts, against the registry's budget

| | mon | tue | wed | thu | fri | sat | sun |
|---|---|---|---|---|---|---|---|
| written | 2791 | 1037 | 1827 | 1033 | 1786 | 966 | 2588 |
| target | 2600 | 1000 | 1800 | 1000 | 1800 | 1000 | 2600 |

⭐ **`WORDS = { spread: 1000, pattern: 1800, table: 2600 }` needed no change**, which is the
prediction `07-C5` §3 made and this is the first time it has been tested against real prose at all
three rungs. The later answers land inside budget because they inherit the standing table and pay
for no establishing work.

---

## 8 · ⭐ What the reading prompt must be told — the handover to the n8n agent

⛔ This is the whole of what `scripts/build-07-n8n.py` has to change for this design to be fillable.
Each line is written to go into a prompt as it stands.

**Node 5a — every passage**

1. **The first paragraph of a passage is the picture on the card and nothing else.** Physical nouns
   only — a man, staves, a lit window. No meaning, no "this card is about", no reference to her
   question. It is typeset separately from the reading, so it has to stand alone. *(This is R1 and
   the prompt already half-asks for it. It now has to be a paragraph boundary, not a preference.)*
2. **Paragraphs 2 onward are the reading**, on her question, in that position.
3. **Card names are spelled exactly as the draw record gives them.** ⛔ Never "The Wheel of
   Fortune" — the deck's name is "Wheel of Fortune". A reversed card's marker ends `(reversed)` and
   the writer never writes a filename.

**Node 7 — the joiner**

4. ⭐ **Every answer must contain exactly one `[the answer]` block: one to three sentences, flat,
   answering that question and nothing else.** It is printed on page two of the PDF, before any of
   the working. It is the single most load-bearing instruction in this list — it is what fault 1 is.
   If a question cannot be answered by cards (it asks what another person will decide), the block
   says so in one sentence and answers the one underneath it.
5. **Every answer opens with `[answer N · <her question, verbatim>]`**, including answer one. Her
   words, her punctuation, no tidying.
6. **Answers two and three open with `[back to the table · <Card Name>]`** and one or two sentences
   naming what that already-read card says differently now. ⛔ Do not re-explain the card. Say what
   changed. *(07-C5 §7.3's `first_of_answer` block, now with a marker to emit.)*
7. **Exactly one `[keep]` per answer — one sentence.** This is the voice profile's R4 announced
   aphorism, and it is the *only* one permitted in the whole reading. The renderer prints it under
   *"If you take one thing out of this, take this"*, so the writer must not write that phrase.
8. **At the top rung, `[the three together]`** — three to five paragraphs, naming at least one card
   from each answer. Not a summary; the fourth thing that only exists because three questions came
   off one cut.
9. **`[close]` ends the file.** Two to four paragraphs, then the signature on its own line.
10. **Markers are whole lines.** Nothing else in the file may be bracketed, and there is no
    markdown — no headings, no bold, no bullets. ⛔ The renderer throws on a marker it cannot parse,
    which is deliberate: it fails in n8n where somebody can see it, instead of silently deleting
    paid-for prose from a PDF.

**Node 8a / the payload**

11. The verdict object must carry **the whole day array**, not just the free cards:
    `day_cards[{number, name, card_name, reversed, free}]` and
    `open_cards[{number, name, card_name, reversed, answer}]`. Page three draws every card in the
    cut, so `free_cards` alone is no longer enough.
12. It must carry **`questions[]`** — all one to three, in order — and `tier_label`.

**Node 10a**

13. Replace it with `renderReport` from `scripts/07-report-template.mjs`. It is written to paste in:
    drop the `export` keywords and read `v` from `$('8a · Read the verdict').first().json` instead
    of an argument. `scripts/make-07-pdf.mjs` pulls node 10a's real code out of the workflow JSON
    and should keep doing so once it moves.

---

## 9 · What this does not decide

| | |
|---|---|
| ⚠ **The prompt** | Owned by the n8n agent. §8 is the request, not the edit. `build-07-n8n.py` was not touched |
| ⚠ **`draw.open`** | The morning draw job has to store six more cards. Until it does, every multi-question example uses stand-ins |
| ⚠ **Marcus's headshot** | `problems.md` item 1 asks for one on the email header. `marcus/marcus-headshot.jpg` does not exist on S3, and this design does not use one |
| ⚠ **PDFShift** | The examples render through local Chromium at node 11's page settings (Letter, margin 0, print backgrounds). PDFShift's own quirks are still untested, exactly as `make-07-pdf.mjs` already warns |
| ⚠ **A spread bigger than twelve** | Would need a smaller plate on the table page. Twelve is the registry's maximum and `check-07-registry.mjs` asserts it |

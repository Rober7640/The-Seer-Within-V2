# 0-WORKFLOW — building a backend offer, together

A working checklist for you and Claude to run in one chat. Works for **any offer
in the deck** — 03, 04, 05 and whatever comes after.

Two halves:

- **Phase A — the funnel.** Booking page → order bump → upsell 1 → upsell 2 →
  thank-you page → wiring → tests. This is how she buys.
- **Phase B — the product.** The reading itself: planned, written to length,
  formatted as a Word doc, exported to PDF, with the tarot cards inserted. **This
  is the thing she actually paid for.**
- **Phase C — the two emails that carry it.** The confirmation she gets on
  purchase, and the one that delivers the reading.

**How we use it:** Claude does one step, shows you, and waits. You approve or
send it back. Nothing goes live — none of these offers has Stripe yet, so no
button charges anyone.

**Say this to start:**
> Read `improve-v1/v1-one-time-BEs/docs/0-WORKFLOW.md` and build offer `<number>`.

**Say this to pick it up again later:**
> Read `improve-v1/v1-one-time-BEs/docs/0-WORKFLOW.md` and do the next unticked
> step for offer `<number>`.

Copy this file per offer if you want a clean set of tick boxes for each — e.g.
`0-WORKFLOW-03.md`. The steps never change; only the worksheet answers do.

---

## Where each offer stands

| | Archetype | Money | Needs her reply? | Product | Funnel |
|---|---|---|---|---|---|
| **02** Twin Flame | Reading | $35 fixed + bump | no | written, 4,821 words, 12 cards | ✅ built — [`00i`](./00i-DELIVERABLES-U1-U2.md) |
| **03** Judgement Day | **Act** | pay-what-you-want | **yes** | written, 2,429 words | analysed in [`00k`](./00k-PLAN-03-UPSELLS.md) |
| **04** The Turn | Reading | ladder $35→$47→$57→$67 | no | written, 3,714 words | not analysed |
| **05** Hex Her | — | — | — | — | ⚠ no copy at all yet |

⚠ **"Written" means the words exist in a markdown file.** No product has been
formatted, had its cards inserted, or been made deliverable. Phase B has never
been run.

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

## What the archetype changes

| | **Reading** (02, 04) | **Act** (03) |
|---|---|---|
| Thank-you page | a **receipt** — confirm, name the email subject, stop | an **intake gate** — the reply instruction goes *above* the delivery promise |
| Her details | may exist at checkout | arrive later, by reply |
| Product shape | one section per card | a verdict, then what to do about it |
| Product length | 3,000–5,000 words | shorter by nature — see Phase B |
| Upsell may threaten | what reaches her while she waits | her own openness, never a person coming back |

## What the pricing model changes

| Model | Booking page needs | Built? |
|---|---|---|
| Fixed + bump (02) | a total and a bump card | ✅ yes |
| Pay-what-you-want (03) | an amount box she types in, with a floor | ❌ new |
| Ladder (04) | four price options, one chosen | ❌ new |

---

## Decisions log

Claude stops and asks at each. Write the answers here as you go.

| # | Decision | Answer |
|---|---|---|
| D1 | The URL this offer lives at (02 is `/tarot/twin-flame`) | ☐ |
| D3 | Any promise on the booking page that needs code (capacity caps, deadlines) — build it, or hide the sentence | ☐ |
| D4 | Money limits — the floor for pay-what-you-want, or the rungs of a ladder | ☐ |
| D5 | Product length, if it is currently under 3,000 words | ☐ |
| D6 | Card artwork — the public-domain deck we already hold, or something commissioned | ☐ |
| D7 | **One PDF per buyer (merged, automated) or one PDF for everyone** — decides whether Word is a per-order step or a one-off design step | ☐ |
| D8 | PDF attached to the email, or hosted and linked | ☐ |
| D9 | The free gift as a closing section of the same PDF, or its own file | ☐ |
| D10 | How long after delivery the next offer sends, and in which email | ☐ |

---

# Phase A — the funnel

### ☐ A1. Fill in the worksheet, settle D1
Claude proposes, you confirm. Ten minutes, and it unblocks everything.

### ☐ A2. The booking page
**Read:** `0X-C1`, and `00e-FRAMEWORK-BEs.md` §3.

Statements in **her** voice — Evelyn does not speak on this page. Then the money
part, the bump, the button.

⚠ On an Act offer, the statement where she agrees to reply with her details is
the most important sentence on the page. Without that reply the work never
starts.

**Done when:** it renders, the button only appears once she has ticked
everything, and it logs instead of charging.

### ☐ A3. The order bump
**Read:** `0X-C3`.

Sits inline beside the total.

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

Receipt or intake gate — see the archetype table. Getting this backwards is the
easiest mistake in the build.

⚠ The email subject line shown here must match the product email **exactly**.

### ☐ A7. Wiring and tests
Routes for all four pages. Test file copied from 02's and re-pointed.

⚠ Tests must prove the live funnel is untouched. ⚠ The offer needs the scrolling
fix 02 has, or its buttons sit below the fold.

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

# Phase C — the two emails that carry it

Only two, and both are part of the purchase. The marketing emails — sales
letter, abandon nudges — stay out of this workflow.

Between them these two are the whole gap between paying and reading, and that
gap is where refunds get requested.

### ☐ C1. The confirmation email — sends immediately

**Read:** `0X-T3`.

⚠ **Check whether it already exists before writing one.** 02's is written in full
(`02-T3`), including a story to fill the wait.

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

### ☐ C2. The delivery email — sends when the reading is done

**Read:** `0X-T4`. ⚠ **This asset is new.** It did not exist for any offer,
because the reading used to *be* the email. Once the product became a PDF, the
email became the envelope and needed its own copy. 02's is now written.

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

---

## Not in this workflow

The marketing emails — the sales letter and the abandon nudges. Different job,
different tools.

## Missing for every offer, not just this one

No Stripe. No source for her first name, so she gets called "Friend" unless we
fix it. No tracking of its own. Nowhere to store the sent product. Full list at
the bottom of [`00j`](./00j-WORKFLOW-UPSELLS.md).

⚠ These cost us a day on 02 and will cost the same on 03, 04 and 05. **Fixing
them once, centrally, is now cheaper than hitting them three more times.**

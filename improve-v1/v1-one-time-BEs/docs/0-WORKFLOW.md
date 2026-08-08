# 0-WORKFLOW — building a backend offer, together

A working checklist for you and Claude to run in one chat. Works for **any offer
in the deck** — 03, 04, 05 and whatever comes after.

Two halves:

- **Phase A — the funnel.** Booking page → order bump → upsell 1 → upsell 2 →
  thank-you page → wiring → tests. This is how she buys.
- **Phase B — the product.** The reading itself: planned, written to length,
  formatted as an email, with the tarot cards inserted. **This is the thing she
  actually paid for.**

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
| **What do we know about her when the upsells run?** | see below | |
| Does the booking page promise anything only code can keep? | `0X-C1` — capacity caps, deadlines | |
| What is the one sentence both upsells sell? | `0X-P1` | |
| How long is the product, and how many cards? | `0X-P1` — count the words and the `[IMG-…]` tags | |
| What loops did the sales letter open? | `0X-E2` — and which product section closes each | |

### The question that decides the most

**What do we know about her at the exact moment the upsells run?**

The order never changes:

```
  booking page → SHE PAYS → upsell 1 → upsell 2 → thank-you page → the product
```

So the upsells only know what the booking page collected, plus whatever her email
address can be matched to. For every name, number or detail the drafted upsell
copy prints, ask: *is it in hand by then?*

⚠ **On an Act offer the answer is usually no.** Her details arrive as an email
reply that the thank-you page asks for — which is after both upsells. The copy
can be perfectly right for the product email later and still be unprintable in
the upsells. 03 merges four such details. All four are unavailable.

If the answer is no, either cut the sentence or look her up by email in the old
database — she is a past buyer, so her details may already be there.

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
| D2 | The four "her situation" blocks — pick one with an email lookup, or write a single block for everyone | ☐ |
| D3 | Any promise on the booking page that needs code (capacity caps, deadlines) — build it, or hide the sentence | ☐ |
| D4 | Money limits — the floor for pay-what-you-want, or the rungs of a ladder | ☐ |
| D5 | Product length, if it is currently under 3,000 words | ☐ |
| D6 | Card artwork — the public-domain deck we already hold, or something commissioned | ☐ |

---

# Phase A — the funnel

### ☐ A1. Fill in the worksheet, settle D1 and D2
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

Most of the copy is already drafted. Claude wires it in, keeps the questions
unless you say otherwise, and handles the "her situation" block per D2.

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

### ☐ B5. Format it as an email

**Model to copy:** the render script at
`docs/aweber/evelyn-reframe-deck/scripts/render-aweber.mjs` — proven, and it has
a test beside it. The design spec is in the `evelyn-tarot-pivot` notes.

Email HTML is not web HTML. The rules that actually bite:

- **Tables for layout.** No flexbox, no grid.
- **Inline styles.** Most clients strip `<style>` blocks, and Gmail is the worst
  of them.
- **600px maximum width**, and it has to survive a 320px phone.
- **No web fonts.** Use the stack the reframe deck already uses.
- **Width and height on every image**, so the layout holds before they load.
- **Dark mode.** Test it. White card art on a dark ground can look broken.
- **Keep the merge tags intact** — a renderer that escapes `%FIRSTNAME%` sends
  every buyer a letter addressed to a token.

Long emails get clipped by Gmail at around 102KB. A 4,800-word reading with
twelve images will be close. Check it, and if it clips, that is a real problem —
the clipped part usually includes the free gift.

### ☐ B6. Make it deliverable

The seam already exists: **`getReadingBody(offer, buyer)`**. Build against it.

- **Now:** it returns the static template with `%FIRSTNAME%` merged. That is the
  whole MVP and it is enough to ship.
- **Later:** the same function calls out to a generator that personalises from her
  old funnel data. Because the seam is there, that is a config change rather than
  a rewrite.
- **The subject must match `0X-T1` exactly.** The thank-you page told her what to
  look for; if it does not match, the promise breaks in the one place she was
  told to check.

⚠ Also unbuilt, and needed before the first real order: somewhere to store what
was actually sent (`be_orders.reading_body`), so a re-send is identical and
support can see what she got.

### ☐ B7. The gate before it ships

Every box, every time:

- ☐ Word count in range (or D5 answered).
- ☐ Every loop the letter opened is closed, by name.
- ☐ Every `[IMG-…]` replaced with a real image that loads.
- ☐ Read it once with images blocked. Still a reading?
- ☐ No `%TOKEN%` left unmerged. No blanks.
- ☐ Subject matches the thank-you page word for word.
- ☐ The free gift appears once, inside this email.
- ☐ Read it on a phone, in dark mode.
- ☐ Send it to a real inbox — Gmail and one Outlook — and check clipping.
- ☐ Read it aloud. This is the last check and it catches the most.

---

## Not in this workflow

The other emails — the sales letter, reminders, and the confirmation email.
Different job, different tools.

## Missing for every offer, not just this one

No Stripe. No source for her first name, so she gets called "Friend" unless we
fix it. No tracking of its own. Nowhere to store the sent product. Full list at
the bottom of [`00j`](./00j-WORKFLOW-UPSELLS.md).

⚠ These cost us a day on 02 and will cost the same on 03, 04 and 05. **Fixing
them once, centrally, is now cheaper than hitting them three more times.**

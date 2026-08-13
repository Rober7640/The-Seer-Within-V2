# 0-WORKFLOW-02 — Twin Flame Tarot, the working copy

**This is 02's tick sheet.** The same shape as
[`0-WORKFLOW-03`](../03/0-WORKFLOW-03.md), against the master
[`0-WORKFLOW`](../0-WORKFLOW.md).

⚠ **Written late — 2026-08-11.** 02 was built *before* the per-offer tick sheet
existed (03 got the first one on 2026-08-09), so until now 02's status lived in
three places that each held a piece of it: the deck grid in
[`00g`](../00g-PENDING.md), the booking record in
[`00h`](../00h-DELIVERABLES-BEs.md), and the per-offer boxes in
[`00b`](../00b-BUILD-BEs.md) — ⛔ **which are stale and must not be trusted**
(00g flags ~25 boxes that read as undone but are not). **This file supersedes
00b's 02 section.** Where they disagree, this one is right.

| | Edit it here? |
|---|---|
| ☑ **Tick boxes**, worksheet answers, decision answers, 02's own notes | ✅ yes — that is what this copy is for |
| The **steps**, the **rules**, and the craft learned while building | ⛔ **no.** Those live in the master and only in the master |

⛔ **If you learn something general while building 02 — a rule, a trap, a better
way — write it into [`../0-WORKFLOW.md`](../0-WORKFLOW.md), then pull it down
here.** A rule improved only in this copy is a rule 04 never gets.

⚠ **What was built, and every departure from the copy specs, is in
[`../00h-DELIVERABLES-BEs.md`](../00h-DELIVERABLES-BEs.md)** (the booking step)
and [`../00i-DELIVERABLES-U1-U2.md`](../00i-DELIVERABLES-U1-U2.md) (the two
upsells). This file says *how far we are*; those say *what it turned out to be*.

**Say this to pick 02 up again:**
> Read `improve-v1/v1-one-time-BEs/docs/02/0-WORKFLOW-02.md` and do the next
> unticked step.

---

## Where 02 stands, at a glance

| Phase | | |
|---|---|---|
| **A — the funnel** | ☑ A1 · ◐ A2 · ☑ A3 · ☑ A4 · ☑ A5 · ☑ A6 · ◐ A7 · ◐ A8 · ☑ A·shared | every screen renders; Stripe wired but dark |
| **B — the product** | ☑ B1 · ☑ B2 · ☑ B3 · ☑ B4 · ☑ B5 · ☐ B6 · ◐ B7 | **a real PDF exists** — 31 pages, 3.7MB, proofed and 4 defects fixed |
| **C — list + emails** | ☐ C0 · ☑ C1 · ☑ C2 · ☐ C3 | copy written, code live, **nothing in AWeber yet** |
| **Decisions** | ☑ D1 · ☑ D3 · ☑ D4 · ☑ D11 · ☑ D5 · ☑ D6 · ☑ D7 · ☑ D12 · ☐ D8 · ☐ D9 · ☐ D10 | D8/D9 come at B6, D10 at C2 |

⚠ **A step is ticked only when it is built, seen in a browser, and its evidence
written down.** Half-done stays ◐, and says what is missing.

🔴 **02 is the deck's pilot for Phase B.** Nobody has produced a PDF from this
pipeline for any offer. Whatever B4/B5/B6 cost here, they cost once — 03, 04 and
05 inherit the answer.

### The three things that stand between 02 and a real sale

1. **C0** — the AWeber customer list does not exist. 🙋 Operator, by hand.
   Without it a buyer is charged and **hears nothing**, because the tag is the send.
2. **Phase B** — there is no deliverable product. 4,821 words in a markdown file
   is not a thing you can send someone.
3. **The flag** — `BACKEND_CHECKOUT_LIVE` in
   `client/src/lib/backendCheckout.ts`. One line, and it is deliberately last.

---

## 📎 Every screen we have built, and how to see it

**02's screens only.** ⚠ The deck-wide table — 03, 04, 05 and what sits next
door — is in the master. Add every new 02 screen to **both**.

Local base: `http://localhost:5000`, after `npm run dev`.
⛔ **Nothing here charges.** Every button still logs `[preview] would checkout {…}`.

| Screen | Path | Treatment | State |
|---|---|---|---|
| Booking | `/tarot/twin-flame/preview-page` | page | ✅ built · preview |
| Booking | `/tarot/twin-flame/preview-chat` | chat | ✅ built · preview ⚠ older shape — see A2 |
| Upsell 1 — Protection Ritual | `/tarot/twin-flame/welcome1?demo=true` | chat | ✅ built · preview |
| Upsell 2 — Manifestation Bracelet | `/tarot/twin-flame/welcome2?demo=true` | chat | ✅ built · preview |
| Thank-you *(receipt)* | `/tarot/twin-flame/success` | page | ✅ built · preview |

⚠ `?demo=true` is **required** on the two upsells — without it they expect a real
conversation in the database and will not render.
⚠ 02's booking sits at `preview-page` / `preview-chat` because two treatments are
still competing. Whichever wins moves to the offer root, where the letter's
`{{BOOKING_URL}}` points.

| Add | To | Shows |
|---|---|---|
| `?fn=Sarah` | either booking treatment | what the letter passes down. ⚠ Nothing displays it — it rides through to checkout |
| `?cancelled=1` | the booking chat | the back-from-Stripe door, with its own copy |

### The proof

| | Evidence |
|---|---|
| 02 upsell flow | `improve-v1/evidence/02-upsell-flow-2026-08-07/` |
| 02 booking, either treatment | ❌ **none.** There is no `walk-02-booking*.mjs` — 03 has two walk scripts, 02 has none. This is the A8 gap |

---

# Step 0 — the worksheet

☑ **Answered.** 02 is the offer every later worksheet was written against.

| | |
|---|---|
| **Archetype** | **READING.** She buys, she waits, it arrives. Nothing is needed from her after the money — which is why 02's thank-you is a receipt and 03's is an intake |
| **Pricing model** | **Fixed + bump.** $35.00, and $12.77 for Astro Force |
| **Root URL** (D1) | `/tarot/twin-flame` |
| **The wait** | 24 hours, hopeful. So the thank-you email fills it with a story that resolves |
| **Product length** | 4,821 words (`02-P1`), over the 3,000 floor — D5 does not apply |
| **Her details at checkout** | first name only, from the letter's `?fn=`. ⛔ Nothing else — the upsells are written to need nothing |

---

# Phase A — the funnel

### ☑ A1. The worksheet, and D1
Settled. `/tarot/twin-flame`, above.

### ◐ A2. The booking page — **and its chat**
Both treatments built and **locked** *(operator, 2026-08-06)*, and both render.
Full record: [`00h`](../00h-DELIVERABLES-BEs.md).

**What keeps this ◐, not ☑:**

- ⛔ **02's chat is the OLDER SHAPE.** `TwinFlameBookingChat.tsx` predates the
  pacing rules the master now carries — it reveals a beat's lines as a block, on
  a flat delay, with no paced typing and no typing indicator. 03's chat is the
  agreed shape. **The master is explicit: 02 should be ported when it is next
  opened** (`chatPace.ts` is ready to reuse). Until then the page/chat A/B is
  measuring two different eras of craft as well as two mechanisms.
- ☐ **Which arm ships is undecided.** Both are locked; which one the letter's CTA
  points at needs the completion-rate read. ⚠ Until it is decided, neither lives
  at the offer root.
- ⚠ **The two arms differ on format, length AND bump placement.** Recorded in 00h
  so nobody reads the result as "chat beats page" when three things moved.
- ☐ **Drop-off instrumentation.** Per-turn, from the first send. The chat has
  three places to lose her where the page has one, and it cannot be
  reconstructed later.
- ☐ **The free-gift doc pass.** Both builds promise the first house **tonight**;
  eight files still say the 28-night ledger — `02-C1` statement 8, `02-C1b`'s
  gift beat, `02-E6`'s +24h nudge, `02-P3`'s header, `02-T1`,
  `copy/02/README.md`, `00-FLOW-BEs.md:77`, and the `backend-esl-deck` memory.

### ☑ A3. The order bump
Built, inline beside the total on the page, its own turn in the chat, **never
pre-checked**. $12.77.

☑ **It carries its own product code** — `astro_force`
(`TWIN_FLAME_BUMP_PRODUCT_KEY`, `shared/backendOffers.ts`), with its own Stripe
line-item name *"+ Astro Force instructional"*, and the Stripe Dashboard
description names it too. ⛔ It does **not** inherit V1's `double_reading` /
*"+ Double Your Reading Add-On"* — n8n exact-matches that string and would post
her a second tarot reading. The $12.77 is deliberately the same as V1's.

### ☑ A4. Upsell 1 — Protection Ritual
Built. V1's components with 02's own opening beats
(`client/src/lib/upsellCopy/twinFlame.ts`). Record:
[`00i`](../00i-DELIVERABLES-U1-U2.md).
⚠ The "her situation" block is one block for everyone — 02 collected nothing it
could merge.

### ☑ A5. Upsell 2 — Manifestation Bracelet
Built, both path opens. Same record.

### ☑ A6. The thank-you page
Built (`TwinFlameThankYouPage`). **Receipt-shaped, per the archetype** — it
confirms, names the email subject, and stops. ⛔ Not V1's `/success`, which tells
her an "Energy Clearing Ritual" begins tonight, a product she never bought.

### ☑ A·shared. Stripe *(2026-08-10)*
Built once, centrally, so 03/04/05 inherit it.

| Piece | Where |
|---|---|
| Offer catalog — **the only place a price lives** | `shared/backendOffers.ts` |
| `be_orders` + its migration | `shared/schema.ts`, `migrations/2026-08-10-be-orders.sql` |
| Checkout + thank-you lookup | `server/routes/backendOffers.ts` |
| Webhook → order row → `addBackendCustomer` | `server/routes/webhooks.ts`, `server/lib/beOrders.ts` |
| The client's one way to Stripe | `client/src/lib/backendCheckout.ts` |

⛔ **Ships dark.** `BACKEND_CHECKOUT_LIVE = false`, so every button still logs.
That constant carries the go-live checklist. 02 is `readyForMoney: true` in the
catalog — its after-the-money screen exists — so **flipping that one flag takes
02 live** (03 refuses money separately until its intake is built).

☐ **The already-purchased redirect** is still not built: a buyer who refreshes
should land on her thank-you page, not a fresh booking chat.

### ◐ A7. Wiring and tests
☑ Routes registered for all five screens.
☑ `tests/twin-flame-upsell-copy.test.ts` — pins 02's upsell chain, its
no-asking/no-data rules, and **asserts every other funnel's chain is untouched**.
☑ `server/lib/backendOffers.test.ts` + `beOrders.test.ts` — 35 tests over the
money rules and the customer-list write.
☐ **No test covers 02's two booking treatments.** 03's walk asserts its screens;
02 has nothing equivalent.

### ◐ A8. Walk it and screenshot it
☑ The upsell flow was walked (`evidence/02-upsell-flow-2026-08-07/`).
☐ **The booking screens never were.** 03 has `walk-03-booking.mjs` and
`walk-03-booking-chat.mjs`; **02 has no walk script at all.** Copy 03's and
re-point them — that is most of A7's gap too.

---

# Phase B — the product 🔴 never run, for any offer

02 is the pilot. `02-P1-the-twelve.md` — 4,515 words of reading, plus `02-P3`'s
902-word gift as the closing act.

- ☑ **B1. Scope it.** In range, so **D5 does not apply**. Twelve sections, one per
  house. The gift renders inside the same document as a second act, never a
  separate send. ✅ The delivery subject `%FIRSTNAME% — your twelve are laid` is
  identical in all four places it appears — verified, not assumed.
  *(Fixed on the way past: `02-T1` cited `02-P4`, a file that has never existed.)*
- ☑ **B2. Plan the structure.** Map built and all three checks run **against the
  letters themselves**, not against the product's own claims:
  - ✅ **No card repeats a free one.** The two letters name exactly World, Lovers,
    Tower, Star, Emperor and Moon; none of the twelve appears in either.
  - ✅ **The arrangement means something.** House 5 read against house 7 is the
    mechanism the whole reading turns on.
  - 🔴 **Every loop closed — FAILED, now fixed.** The product answered `02-E2`
    only. But `02-E3` is a **follow-up to the same woman** ([`00e` §1c](../00e-FRAMEWORK-BEs.md)),
    so there were **six** withheld units, not three. Two were live with no closer
    and one promise was contradicted outright. See below.
- ☑ **B3. Write it.** Done, and **revised 2026-08-13** to close what B2 caught.
- ☑ **B4. Insert the twelve cards.** ☑ **D6 answered** — the public-domain RWS deck
  we already hold. All twelve placed, from local files, by
  `scripts/build-be-product.mjs`. The face-down fan is the cover.
  ⚠ **B4's S3 upload step does not apply to a PDF.** That instruction was written
  when the product was an email; a PDF embeds the images, and "must work with
  images switched off" is an email problem a PDF does not have.
  ⚠ **The art is 350×600**, so a card at 2.2in is ~159dpi — right on screen and
  fine from a home printer, short of press quality. Wider buys size at the cost of
  sharpness. This is the ceiling of the deck we hold, not a setting.
- ☑ **B5. Format it as a document.** ☑ **D7 answered** *(operator, 2026-08-13)* —
  **one PDF for everyone**, so Word is a one-off design job, not a per-order step.
  Built: `assets/be-reference.docx` (US Letter · 1in margins · Georgia 12pt/1.4 ·
  centred page number) → `build/02/02-product.docx` → **`build/02/02-product.pdf`,
  31 pages, 3.7MB** (under the ~5MB gate).
  🙋 **A hand pass in Word is still yours to make if you want one** — but the document
  is now proofed and shippable without it.
  ⛔ **Do not re-run `make-be-reference-docx.mjs` afterwards** — it rebuilds the
  reference from pandoc's default and would discard your adjustments.

### ◐ B7 · proofed as a PDF, and it earned its keep *(2026-08-13)*

Word is the only docx→PDF converter on this machine (no LibreOffice, no LaTeX); the
`osascript` recipe is in the master's B5. **The first proof carried four defects, and
not one was visible in the markdown or the .docx:**

| Defect | Cause | Fixed by |
|---|---|---|
| 🔴 every heading in **blue sans-serif** | pandoc's reference points headings at the Word theme's major font + accent-blue. Body was Georgia, so the file looked configured | `make-be-reference-docx.mjs` — headings now Georgia, ink `#2A2622` |
| 🔴 a caption **"The Magician"** printed under a heading that had just said it | pandoc promotes an image WITH alt text to a figure and prints the alt | `build-be-product.mjs` emits `![](path)` — no alt, no caption |
| 🔴 **⚠ in the buyer's copy**, mid-reading | the specs use ⚠/⛔ as notes to the writer; one sat on a real sentence in the gift | build script strips leading markers **and reports each one** |
| 🔴 a stray **rule under Evelyn's signature**, last page | the scene-rule stripper was regex-on-newlines; the last rule has no newline after it | line-based strip |

Also tuned: cards 2.2in → **1.9in**, because House 1 was spilling three lines onto an
otherwise blank page. That also lifts the art to ~184dpi.

☐ **Still yours to check**, and they need a human: read it on a phone · print one page ·
read it aloud.

⚠ **One unexplained cosmetic**: faint corner brackets around each card in the PDF. Ruled
out our side — the docx holds a plain `wp:inline` picture with no border and no figure
wrapper, and the source PNGs are clean. Most likely a Word display preference
(*Show text boundaries*). Worth one look when you next open Word.

### D12 · the spread, drawn — and why it beats an ecover *(operator asked, 2026-08-13)*

☑ **D12 answered for 02: the chart wheel, and it is the cover.** The decision is now a
step in the master workflow (asked at B2, built at B4, checked at B7), so 03, 04 and 05
each get asked what *their* picture is — a tea cup's regions for 04, the three nights
for 03. It is no longer something 02 happened to do.

`assets/02-zodiac-spread.png` — the twelve cards in their twelve houses, one image,
generated from the same house→card table the copy is written against, so it **cannot
drift from the words**.

It is now the **cover**, replacing the face-down fan. A fanned, face-down deck says
*"not yet turned"* — that is the booking page's job, not the delivered reading's; she
has paid and they are turned. And it does the thing an ecover cannot: a 3D book mockup
makes a digital file feel like an object, whereas this **proves there is a spread**, on
the page she opens first, and doubles as the map she flips back to.

⚠ **A first render had the houses running the wrong way.** House 1 was correctly at
nine o'clock, so it looked right — but everything else was mirrored, putting house 4 at
the top and house 10 at the bottom. Anyone who has seen a birth chart knows the 4th is
its floor and the 10th its crown. ⛔ **Check a wheel against all four landmarks**
(1 → 9 o'clock · 4 → 6 o'clock · 7 → 3 o'clock · 10 → 12 o'clock), never the first
house alone.

⚠ The house numbers ride **on** their cards. Floated inboard on their own radius they
collided with the card names at the left and right extremes.

**The three scripts, and which one to run**

```
node improve-v1/v1-one-time-BEs/scripts/make-be-reference-docx.mjs   # once, ever
node improve-v1/v1-one-time-BEs/scripts/make-zodiac-spread.mjs 02    # if a house is reassigned
node improve-v1/v1-one-time-BEs/scripts/build-be-product.mjs 02      # after any copy edit
```

The build script refuses to produce a document that still contains a `%TOKEN%` or an
unreplaced `[IMG-…]`. Both are B7 gate items, enforced at build time rather than left
to somebody's eyes — one document reaches every buyer at once, and a printed
`%FIRSTNAME%` is the single defect she cannot un-see. ⚠ The token gate has already
earned itself: it caught the first build dragging the spec's own metadata table into
the product.

⛔ `build/` is gitignored — it regenerates from the copy. **`assets/be-reference.docx`
is not, and must not be**: it is the deck's page design, and it is meant to be
hand-adjusted.
- ☐ **B6. Make it deliverable.** ⛔ **D8** (attached or hosted-and-linked) and
  **D9** (the gift as a closing section, or its own file).
- ☐ **B7. The gate before it ships.**

### What B2 caught, and what changed in the product

| Loop | Was | Now |
|---|---|---|
| **v2 · the Emperor** — *a floor under me, or a room with the door shut?* | unanswered. The letter promised the house placement would decide it | **House 4** answers it flat: it fell in the house of her home, so **it is a floor**. The shut room is handed to the seventh, by name |
| **v2 · the Moon** — *the man I am reading in the dark* | unanswered | **House 12** names it and explains why looking harder never worked — the same room, the same ⛔ do-not-investigate instruction |
| **the day / which week / what he looks like** — promised in **both** letters | **contradicted.** The product said *"a reading is not a timetable"* | **House 5** gives a window — weeks four and five, counted from reading — and a description of him. The closing inoculation now dates the fifth house deliberately and declines to date the other eleven |

⚠ **Weeks, not a date.** One document serves every buyer, so a printed date would
be wrong for all but one of them.

### Zero overlap: kept, and the reasoning written down *(operator asked, 2026-08-13)*

The letters promise **both** *"twelve **new** cards, not these three again"* and
*"the **house** the Lovers/Emperor falls into is what separates them"*. Read
literally those cannot both hold — the second needs the free card dealt.

**Novelty wins.** Being shown the same cards again is the fastest way a buyer
concludes she was robbed, and it is the promise stated most plainly. The mechanism
survives because it was never about the card: each fork names two candidate
**rooms**, and the spread says which one is lit, via the new card that landed there.

Two defects this question surfaced in the 2026-08-12 edit, both now fixed:

| | |
|---|---|
| 🔴 House 4 said *"It fell here"* of the **Emperor** | It is not in the spread. It read as a thirteenth card and made the novelty promise a lie. Now: the room came up **Temperance**, and Temperance keeps nobody anywhere |
| 🔴 The Emperor block was inserted **mid-argument** | It split *"slower than you want it to be"* from *"That is not a disappointment, dear"* — the antecedent broke. The block now sits at the **end** of house 4, after Temperance's own case |

House 5 also now states the two-room mechanism out loud (renewal would show in the
7th, arrival in the 5th) instead of leaving the reader to assemble it from house 7.

⚠ **Deck arithmetic for 03/04/05:** 22 majors − 6 spent free − 12 laid = **4 spare**
(Fool, Empress, Hermit, Sun). Decide which six each offer's letters spend *before*
writing its product.

⛔ **The cost of D7, recorded once:** the three **echo slots** (`S28`, houses 1, 7
and 12) are dead. They were per-buyer merges from her own V1 transcript, and one
document for everyone cannot carry them. `00c` calls `S28` the highest-confidence
finding of the 10-lens run. The decision stands; this is what it bought.
**Every `%FIRSTNAME%` is gone from the product and the gift** — eight sentences
read better without it, three took *"dear"*. The warmth now rests entirely on the
covering email (`02-T4`), which does still merge, and which is worth re-reading
with that extra load in mind.

⚠ **B5/B6 are still the unknowns.** Nobody has produced a PDF from this pipeline
yet.

---

# Phase C — the customer list, and the two emails it sends

- ☐ **C0. The customer list.** 🙋 **Operator, by hand, and it blocks everything
  else here.** `theseerwithin_be_customer` in the AWeber UI — ⛔ the API returns
  405 for list creation, don't retry. Four custom fields spelled exactly:
  `stripe_order_id`, `offer`, `entry_url`, `reading_url`. Then
  `AWEBER_BE_CUSTOMER_LIST_ID` into `.env` (⚠ absent today; it exists only in
  `.env.example`). ⛔ **Not** `theseerwithin_paid` — that is V1's 5,290 buyers.
  ⚠ Both AWeber access tokens were **expired** (401) on 2026-08-10.
  🔴 The code that writes this list is live and tested. Without the list id it
  logs `List ID not configured`, records it on `be_orders.customer_list_error`,
  and sends nothing.
- ☑ **C1. The thank-you email.** Written in full: `02-T3` (md, txt, html),
  including the story that fills the 24 hours. ☐ Not uploaded as an AWeber
  Campaign, and its trigger tag `be-02-twin-flame` does not exist yet.
- ☑ **C2. The delivery email.** Written: `02-T4`. Same two gaps.
  ⛔ **D10 unanswered** — how long after delivery the next offer sends, and in
  which email.
- ☐ **C3. Upload, automate, prove.** ✅ No longer gated on Stripe — the write
  happens on a real `checkout.session.completed`. Gated on C0 and the tokens.

---

## Copy — what 02 still owes

☑ Complete and gated — 15 files pass the deterministic gate:
`node improve-v1/v1-one-time-BEs/scripts/copy-check.cjs improve-v1/v1-one-time-BEs/copy/02`
⚠ Run it after **any** copy edit. Its word-sense exclusions were each a real
false positive — don't loosen them.

- ☐ **Image sets beyond the hero.** Each letter has a written hero brief; the
  supporting sets do not exist.
  🔴 **Check `02-E5`'s "hero spread" against the new B7 gate.** That asset is
  pre-purchase, and the drawn wheel shows all twelve **paid** cards. The letter's hero
  must be the face-down fan or the free six — never the wheel. Same rule for the
  booking page and the `02-E6` nudges.
- ☐ **An ecover, for Phase A.** Not for the product — the wheel beat it there — but the
  booking page still has to make a digital file look like something you receive.
  ⛔ Wrap the **face-down** deck, not the spread.
- ☐ **The free-gift doc pass** — the eight files listed under A2.
- ☐ **`02-E4-esl-v1.html` (the plain one) has no job left**, superseded by
  variant B's P.S. and centring. Harmless; delete when B is confirmed as the only
  shipping form.
- ⚠ **02's Moon copy/art mismatch is ACCEPTED.** Settled — do not re-flag it.
- ⚠ **Headline and deck are centred in both letters** — needs a re-render check
  at 600px and 390px.

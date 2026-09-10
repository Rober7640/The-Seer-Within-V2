# 07 — the phased test plan

**The point of phasing: the five failure classes in this workflow are unrelated, and testing
them together tells you nothing.** A blank PDF could be a bad prompt, a missing card, a
PDFShift setting, an expired signed URL or the wrong AWeber list. Run them apart and each
failure has one cause.

⭐ **Phases 1–3 need no server, no database migration and no Stripe.** That is the whole
reason to phase it this way: the three missing endpoints and the `be_orders` columns block
*delivery*, not *making the thing*. Pin a fixture on node 3 and the first three phases run today.

| Phase | Nodes | Proves | Needs |
|---|---|---|---|
| **1 · The words** | 3 → 9b | n8n can write the reading | nothing — a pinned fixture |
| **2 · The pictures** | 10a | the right card is beside the right passage | S3 card art |
| **3 · The document** | 11 → 12a | a PDF exists and opens from a link | PDFShift + Supabase creds |
| **4 · The delivery** | 13 → 15 | it reaches an inbox, from Marcus | AWeber list config |
| **5 · A real order** | 1 → 15 | Stripe starts it and it finishes | the 3 endpoints + DB columns |

## How to run any phase in isolation

n8n's **pinned data** is the mechanism. Pin the output of the node *before* the phase, then
"Execute from here". You never need the upstream half to exist.

- **Phase 1** pins node **3 · Load the order + the draw** with a fixture.
  ✅ `scripts/07-dryrun-orders.json` now holds **all seven days** — 55 positions, counts
  6·8·6·7·9·7·12 matching 07-P1's Total column, every card verified against the deck, three
  reversed cards included so the phase-2 fix has something to exercise. ⭐ Every fixture also
  carries `question_2`, `question_3` and the morning's six `open` cards, so a rung above $35
  can be dry-run for the first time. Verified against the real node 4: **all seven days work
  at all three rungs** — 07-C5 dissolved the Thursday/Saturday refusals.
- **Phase 2** pins **8a · Read the verdict** with a finished reading —
  `docs/07-marcus/dryrun-tue-spread.md` has one, and it carries the `[n · name · card]` markers
  that node 10a splits on.
- **Phase 3** pins **10a · Build the HTML** with the HTML string.
- **Phase 4** pins **12a · Get signed URL** with a URL you already know resolves.

⛔ Unpin every node before phase 5. A forgotten pin makes a live order silently deliver a
fixture, and it looks like a clean run.

---

## Phase 1 · The words

**What is already known and does not need retesting.** `scripts/dryrun-07-reading.mjs` runs the
real Code nodes and the real model calls outside n8n. Tuesday at $35 produced 1,184 words
against a 1,000 target and passed the rubric. The prompts, the word budgets and the grader are
settled.

**What that did NOT prove — this is what phase 1 is for.** The harness *shimmed n8n's own API*:

| Untested | Why it is the risk |
|---|---|
| `$runIndex` and `$('5c · Keep the prose').all(0, r)` in node 5a | This is how each position sees what the earlier ones said. The harness faked it with a plain object. If it misbehaves, every position is written blind to the others and the reading reads as six disconnected notes — which is exactly the failure the per-position design exists to avoid, and it will still grade PASS |
| The `splitInBatches` branches | Output 0 = done, output 1 = loop. Wired correctly in the JSON; confirm it in a run |
| `cache_control: ephemeral` on the voice block | The harness saw ~3,600 cached tokens per run. If n8n's HTTP node reshapes the body, the cache silently misses and every position pays full price for the voice block |
| Nodes **9 · Passed?**, **9a · First failure?**, **9b · Go round again** | **Never executed once.** The dry run passed, so the regenerate-once path has never run. 9b loops back to node 4 |

**How to force the failure path.** The grade must fail on demand or 9/9a/9b stay untested. Pin
node **8a** with `{ pass: false, failed: [6], why: "forced" }` and confirm: it regenerates
**exactly once**, then continues to 10 regardless of the second verdict. Watch for the loop
running twice — `attempt` is incremented in node 4 and 9a reads it.

**PASS gate**
- [ ] Every passage written, each reading its own job, none repeating another —
      `dayPaid + 3 × (questions − 1)` of them; `node scripts/test-07-brief.mjs` has the table
- [ ] ⭐ At `pattern` / `table`: each later answer opens by naming a card already on the table
      and saying what CHANGED about it, and every passage answers the question in its own
      heading. This is the thing 07-C5 §3 exists to prevent, and a grader will not catch it
- [ ] `usage.cache_read_input_tokens > 0` on positions 2–6
- [ ] Forced failure regenerates once and only once, then proceeds
- [ ] Grader returns a parseable verdict — ⛔ if `why` says *"unparseable — passed through"*,
      the grade is fake; see the effort fix in the fulfilment README
- [ ] **Both** grade-log rows appear for a fail-then-pass: the first failure (`regenerated: true`)
      and the second verdict

### ✅ The first failed grade was never logged *(found and fixed 2026-09-03)*

Node 10's own comment reads *"EVERY failure gets logged… It must never be skipped"* — and the
wiring skipped it. `9a · First failure?` went straight to `9b · Go round again`, so a
fail-then-pass reading recorded `pass: true` and **nothing about why the first attempt failed**.
The grade log is the entire mitigation for "regenerate once, then send anyway", and it was blind
to exactly the case it exists for.

It could not simply be re-routed: node 10 flows into 10a and builds the PDF, so sending the first
failure through it would deliver the reading that just failed. Fixed with a separate dead-end
node, **9c · Log the first failure**, which logs with `regenerated: true` and then loops.

---

## Phase 2 · The pictures

Node **10a** splits the reading on its `[n · name · card]` markers and puts each card image
beside its passage.

### ✅ All three faults found here are fixed *(2026-09-03)*

| Was | Now |
|---|---|
| 🔴 **A reversed card was written as reversed and pictured upright.** Node 5a told the writer `(reversed)`; the joiner's marker dropped the flag, so `slug(card)` resolved the upright scan | The joiner appends `(reversed)` to the marker. ⭐ `slug()` already turned that into `four-of-swords-reversed` — byte-identical to the real filenames — so **no change to `slug()` and no change to the split regex** |
| 🔴 **77 of 100 cards were not on S3 at all** — most of the deck. A missing key renders as a silent gap in a paid PDF, and S3 answers **403, not 404**, so absence looks like a permissions error | All uploaded |
| 🔴 **Reversed art existed for the 22 majors only.** After the marker fix, a reversed *minor* would have 404'd — the fix would have made things worse | 58 reversed scans backfilled by rotating the uprights 180°, which is exactly what the 22 majors already are. `scripts/make-reversed-scans.py` |
| 🔴 **Two Aces are misnamed.** The deck files them as `one-of-swords` / `one-of-pentacles` while Cups and Wands use `ace-`. Any writer producing standard tarot names slugs to `ace-of-swords`, which 403'd | `ace-` copies added and uploaded. ⛔ **Copied, not renamed** — two `index.json` files reference the `one-` names and one serves Evelyn's live tarot art |

**Verified:** every one of the **160** card slugs in `assets/tarot-rws/` returns 200 from
`evelyn/tarot-rws/`. Checked one by one, not sampled.

⚠ **The remaining risk is a card name nobody has a file for.** `slug()` takes the model's free
text with no fixed vocabulary, so a reading that says "The Wheel" instead of "Wheel of Fortune"
still resolves to a 403 and a silent gap. The real fix is a closed vocabulary — the same
argument as the spread registry. Until then this stays a live hazard.

**PASS gate**
- [ ] Every position shows a card, and it is that position's card
- [ ] A reversed position shows the reversed scan
- [ ] No gap anywhere in the rendered PDF
- [ ] Card and passage stay together — `page-break-inside: avoid` is already set

## Phase 3 · The document

### ✅ Phase 3a is DONE — a real PDF exists, with no Supabase and no PDFShift key

`node scripts/make-07-pdf.mjs tue` runs the **real** `10a · Build the HTML` jsCode out of the
generated workflow JSON, then renders it through local headless Chromium at node 11's own page
settings (Letter, margin 0, print CSS). PDFShift is itself a hosted headless Chrome, so this
exercises everything except PDFShift's own quirks.

**Result: 5 pages, 771KB, all six cards load, no request fails, no position splits a page.**

⛔ **It found the worst bug of the build.** `10a` split the reading on its card markers with
`.split(...).slice(1)` — and `parts[0]` is everything *before* the first marker, which is the
joiner's **opening**. So the ~194 words that answer her question were deleted from the PDF.
Rubric line 3 requires that answer inside the first 200 words; the grader checked it was there
and passed; then the renderer threw it away. **Nothing but rendering a real PDF would have
caught it** — every earlier check operated on the reading, not the document. ✅ Fixed and
re-verified: every sentence of the opening now appears in the output.

⚠ Page 5 carries only the AI disclosure. Harmless, but it is a page of white space in a paid
document — worth a `page-break-before: avoid` before this ships.

### What is still untested, and needs the real credentials

⛔ The PDFShift, Supabase and AWeber keys are **not in this repo's `.env`** — they live as n8n
credentials on the n8n instance. So phase 3b and phase 4 cannot be run from here at all.

### Phase 3b · through the real services

**11 · PDFShift → 12 · Upload to Supabase Storage → 12a · Get signed URL.** All three are
copied from the live Evelyn flow `UaLPiVVs7j5jzNyO`, so the shapes are right; what is untested
is this document through them.

| Trap | What happens |
|---|---|
| ⚠ **Supabase returns `signedURL` as a RELATIVE path** | Prefix `SUPABASE_URL/storage/v1`. Already documented; it is still the most likely phase-3 failure |
| PDFShift fetches the card images itself | They are remote S3 URLs. If a fetch is slow or 403s, the PDF renders **with gaps and no error** |
| `@page { size: Letter }` | Confirm Letter is intended. The list is largely US, so probably yes — but decide it rather than inherit it |
| Card art is 350×600 | ⚠ **The earlier 1.17in figure was wrong.** The PDF renders each card at `width:1.6in`, not at a real card's 2.75in — so it is **219dpi effective**, not 128. Still under 300, but far milder than it looked. 480px would reach 300dpi at 1.6in. ⭐ Still decide whether this is a screen document or a printable one |
| The signed URL expires | Check the TTL. A link that dies before she opens it is a support ticket, not a bug report |

**PASS gate**
- [ ] PDF opens in Preview and in a browser
- [ ] No position split across a page break; no orphaned heading
- [ ] Every card image present at full quality
- [ ] The AI disclosure is on the last page
- [ ] The signed URL opens in a private window, from a phone, an hour later

---

## Phase 4 · The delivery

**13 · same-day? → 13a · Wait → 14 · Find her on AWeber → 14a · Tag + reading_url → 15 · Mark
delivered.** Node 14a *is* the send: tagging triggers the campaign.

🔴 **The blocker that is invisible in every file.** The from-name and from-address live on
AWeber list `6960130`, not in this repo. **Both prior sends to these people went out as Evelyn.**
A reading from Marcus arriving from Evelyn is the offer's credibility gone in one send.

- [ ] From-name and from-address on list 6960130 set to Marcus
- [ ] The `reading_url` custom field exists on that list
- [ ] The campaign that sends on the tag is built and live
- [ ] ⛔ Find-then-PATCH, never create — she is already a subscriber and creating her again
      could reset her fields
- [ ] Test on a subscriber you control, not on a real buyer
- [ ] Shorten node 13a from 24h for the test, then **put it back**

---

## Phase 5 · A real order

Everything above, started by Stripe. This is the phase that needs the work nothing else needed.

- [ ] `be_marcus_daily` in `shared/backendOffers.ts` — n8n exact-matches the string
- [ ] `be_orders` has `spread`, `draw_date`, `tier`, `question`, and the draw record
- [ ] `GET /api/be/07/fulfilment/:sessionId` returns the payload in the fulfilment README
- [ ] `POST /api/be/07/grade-log` and `/delivered` exist
- [ ] Every pin removed
- [ ] One real card payment, end to end
- [ ] Read the grade log. **Daily, for the first fortnight** — it is the entire mitigation for
      "regenerate once, then send anyway"

---

## The ecover

**There is already a cover page in the PDF and it is three lines of text** — node 10a renders
`<div class="cover">` with the spread name, the draw date and her first name. So this is not a
new asset with no home; it is an existing page that currently looks like nothing.

### ⛔ Do not commission a 3D ecover

The glossy floating-book-and-tablet render is the standard for digital products and it is
**wrong for this one**. 07's art rule is that every image is a photograph of a real table and
shows the act as already done. A rendered 3D object is the flat graphic that rule exists to
forbid, and it would sit two inches from photographs that follow it.

### Two candidates, both photographs

| | What it shows | Cost |
|---|---|---|
| **A · the printed reading** | The pages printed and lying on the raven cloth beside the cards | ⚠ Implies paper. Honest only if the booking page says it is a PDF she can print — and 07 makes **no delivery promise anywhere**, so this needs a decision |
| **B · the cards, close** | Her two face-up cards and the six face-down, shot tight on the same cloth | No implication at all, and it is literally her spread. Weaker as an "object you receive" |

⭐ **Recommended: B, with the spread name and date set in type over it.** It carries no delivery
implication, it is the same photograph language as the emails, and — the deciding reason —
**one photographic base plus type means adding a spread needs no new art.** That is the same
principle as the spread registry: a new spread should be a data row, never a commission.

Both are generated at `assets/07-cover-a-printed.png` and `assets/07-cover-b-cards.png`.

### Where the cover has to work

- [ ] **Page 1 of the PDF**, full bleed at Letter — the existing `.cover` div
- [ ] **The booking page**, so she can see what she is buying before she pays
- [ ] ⛔ **Not in the daily email.** The email sells the question, not the artefact, and an
      image of the product is a delivery promise by implication

**Sizing.** Letter at 300dpi is 2550×3300px. The generated art is ~1250px square. Enough for a
screen PDF, **not** enough for a full-bleed printed cover — the same question as the card art in
phase 3, and it should be answered once for both.

# 0-WORKFLOW-06 — the Wishing Bracelet, the working copy

**This is 06's tick sheet.** The same shape as [`0-WORKFLOW-02`](../02/0-WORKFLOW-02.md) and
[`0-WORKFLOW-03`](../03/0-WORKFLOW-03.md), against the master [`0-WORKFLOW`](../0-WORKFLOW.md).

📋 **Picking up the actual BUILD (Phase A code), not the copy/decision history?** Read
[`HANDOVER.md`](./HANDOVER.md) instead — written 2026-09-02 specifically for the developer taking
this over, once all copy and every decision was finished. This file is the reasoning behind those
decisions; `HANDOVER.md` is the "what to build" version.

⚠ **Created late — 2026-09-01, after the fact.** Copy work on 06 (the letter, both device
candidates) started before this tick sheet existed. That's a gap in following the deck's own
convention, not a decision — this file exists now to close it.

| | Edit it here? |
|---|---|
| ☑ **Tick boxes**, worksheet answers, decision answers, 06's own notes | ✅ yes — that is what this copy is for |
| The **steps**, the **rules**, and the craft learned while building | ⛔ no. Those live in the master and only in the master |

⛔ **If you learn something general while building 06, write it into
[`../0-WORKFLOW.md`](../0-WORKFLOW.md) first, then pull it down here.**

**06 is not in [`00a-BRIEFS-BEs.md`](../00a-BRIEFS-BEs.md) yet.** Its brief lives instead in
[`06-SPEC-wishing-bracelet.md`](./06-SPEC-wishing-bracelet.md), copywriter-POV shape (problem / big
idea / mechanism / solution) rather than the four-field table — merge into `00a` once a device is
picked and the offer is no longer a candidate.

⚠ **No separate PRD exists for 06, and none is planned** *(clarified, operator + Claude,
2026-09-01)*. This file plus the master `0-WORKFLOW.md` already are the single source of truth —
the same shape 02 and 03 use, no third document. The spec sheet above did the one job neither of
those covers (a copywriter-POV brief, ahead of `00a`'s four-field table existing for this offer);
that job is finished, not ongoing.

**Say this to pick 06 up again:**
> Read `improve-v1/v1-one-time-BEs/docs/06/0-WORKFLOW-06.md` and do the next unticked step.

---

## Where 06 stands, at a glance

| Phase | | |
|---|---|---|
| **Content — the letter** *(precedes 0-WORKFLOW's Phase A; tracked in `00-TODO-BEs.md`'s Group A)* | ✅ **DONE, 2026-09-02: `06-E2-esl-product-creature-a-close-c.md`.** Creature-a, question-style subheads, close-c's reorganized close | see the Fourth round section below |
| **A — the funnel** | ☐ everything — zero code exists in `client/`/`server/`/`shared/` for offer 06, confirmed 2026-09-02 | not started, but all blocking decisions are resolved (D1 = `/wiccan/wishing-bracelet`) |
| **B — the product** | ☐ everything | not started. Product shape itself is undecided — see note |
| **C — list + emails** | ☐ everything | not started |
| **Decisions** | ☐ most of them | see the decisions table below |

⚠ **This offer is not chained to 04's limit and doesn't touch 05** *(Cut the Cord, still reserved,
still blocked on its own hook rewrite)*. 06 sells to the same backend customer list as 02–04, on
its own mechanism. Operator decision, 2026-09-01.

### ✅ Resolved, operator, 2026-09-01 — the shape of the letter

**Kau Cim and I Ching are reading-selling engines, not product-selling ones.** Both are proof
devices built to justify *more reading* (the pattern 02 and 04 actually use) — grafting a shipped
physical object onto the end of one produces exactly the "why doesn't this end as a letter"
awkwardness both candidates hit. **06 is not selling a reading. It sells an object.** So a third
candidate exists with no divination device at all — the object's own myth is the spine, start to
finish, everything from the spec sheet (myth, materials, ritual, honest limit) is IN this letter
rather than deferred to a booking page that doesn't exist. All three letters are kept; nothing was
deleted.

| Candidate | File | Shape |
|---|---|---|
| Kau Cim | `06-E2-esl-kaucim.md` | reading-led, object deferred entirely to the booking page |
| I Ching | `06-E2-esl-iching.md` | reading-led, object deferred entirely to the booking page |
| Product (v1) | `06-E2-esl-product.md` | object-led, no reading device — but improvised beat labels, doesn't follow a real structure |

### ✅ Second round, operator, 2026-09-01 — 5 physical-item beat structures, in parallel

Reading beats (`00e-FRAMEWORK-BEs.md` §1) and physical-object beats are two different problems —
grafting a reading-device 17-beat table onto a product letter (what "Product v1" did, informally)
doesn't work. Five agents, each building to a **named, real direct-response architecture**,
distinct beat count and job per beat, all against the same facts (myth, materials, ritual, VOC
grounding, honest limit) and the same reused image (`assets/06-pixiu-statue.jpg`, no new sourcing).

| Candidate | File | Structure | Beats | Precedent name |
|---|---|---|---|---|
| Sugarman | `06-E2-esl-product-sugarman.md` | "slippery slide" — reveals the object early, reason-why | 10 | Deirdre |
| Schwartz | `06-E2-esl-product-schwartz.md` | sophisticated-market, big-idea-first, compressed | 8 | Alma |
| ~~Halbert~~ | ⛔ deleted 2026-09-02, operator: "too many test files" | personal narrative, object as the story's conclusion | 9 | Constance |
| Hopkins/Caples | `06-E2-esl-product-hopkins.md` | reason-why case-building, plain and direct | 8 | Yvonne |
| ~~Collier~~ | ⛔ deleted 2026-09-02, operator: "too many test files" | opens on someone else's story, soft-sell | 7 | Margit |

All 16 files across offer 06 passed `copy-check.cjs` clean when built. All 5 previews rendered
(`*-PREVIEW.html`, ~4.8MB each, real image embedded — this predates the file-size lesson in
`../0-WORKFLOW.md`'s D12 section, which is why they were this big). **8 live candidates existed for
06** at the time (2 reading-led + 6 product-led). Once creature-a won (Fourth round below), Halbert
and Collier were the first two of the losing candidates deleted outright, rather than kept as
reference — operator call, 2026-09-02, on a directory that had grown to 51 files. kaucim and iching
were explicitly kept despite being a different losing direction (reading-led, not product-led) —
see the Fourth-round audit note for the rest.

### ✅ Third round, operator, 2026-09-02 — booking page, bump, linter extended

- **`06-C1-booking-page.md` written.** Five statements (no fake scarcity — 06 has no capacity
  constraint the way Evelyn's night-capacity does, so that rung is cut, not faked), a new shipping-
  wait consent statement no other offer needed, `{{PRICE}}` as a merge field (price still genuinely
  undecided). Shipping address deliberately deferred to **after** payment, reusing V1's proven
  `ShippingForm.tsx` pattern, rather than bolting an address form onto the commitment ladder.
- **`06-C3-order-bump.md` written** — "The Closed Purse," text-only self-performed ritual
  (confirmed, not the Bixie-pairing idea, which was considered and explicitly rejected). Proposed
  price `$11.11`, not locked.
- **`scripts/copy-check.cjs` extended** to know about offer 06 for the first time (its own `OFFERS`
  entry, SLA pattern, bump price) — the same extensibility point every prior offer used, not a
  bypass. Caught two real issues in the process: a stray literal `$0` in 06-C1's own buyer-facing
  copy (fixed), and a price-statement sentence copied too closely from 02/04's phrasing (reworded).
- **⚠ Corpus-wide device-variance check now includes 06 for the first time**, and found 3 real
  collisions with 02's ratified letters. One (creature-a's sign-off, "I'm on your side in this,
  dear") was in the active candidate and is fixed. The other two, plus the *same* sign-off in 8+
  other non-active candidate files (kaucim, iching, product, sugarman, schwartz, halbert, collier,
  creature-b), are **deliberately left as-is** — those files are reference/comparison material, not
  on a path to production, and a full cleanup belongs to the same later pass 00-TODO-BEs.md already
  calls for ("re-run the variance pass once 06 exists"), not to this session's scope.

### ✅ Fourth round, operator + Claude, 2026-09-02 — candidate chosen, then iterated hard

**Creature-a is the direction.** Confirmed over the other 7 (kaucim, iching, product v1, sugarman,
schwartz, halbert, hopkins, collier) and its own sibling creature-b. Everything below happened to
creature-a specifically, on top of the third round's booking page / bump / linter work.

**Directory audit, operator, 2026-09-02 — "too many test files," done in two passes.** By the time
creature-a's own iteration was done, `copy/06/` held 51 files — 9 dead-end candidates (product v1,
the 5 named DR-architecture letters, creature-b) plus every creature-a sub-variant (5 subheadline
styles, 3 close variants), most still carrying their old, oversized `-PREVIEW.html` renders (several
at ~4.8MB, predating the file-size fix), plus two loose reference `.webp` images never wired into
anything. First pass: Halbert and Collier deleted by name. Second pass, operator: "keep winner of
course. delete the rest" — everything not the winner, kaucim, or iching went: product v1, Sugarman,
Schwartz, Hopkins, creature-b, the original unheaded creature-a, all 4 non-chosen subheadline
styles, both non-chosen close variants (close-a, close-b), and the 2 loose `.webp` files. **51 → 12
files, 23MB → 4MB.** `kaucim` and `iching` are the only losing candidates still on disk — kept
deliberately: they're the reading-led *direction*, not a same-direction stylistic runner-up like
the other 8 were. One fix alongside the cleanup: the shared creature-a subject-line file
(`06-E1-subject-lines-product-creature-a.md`) never matched any creature-a letter's exact filename
(the render script needs an exact match, no fuzzy fallback — see its own header comment), which is
why every creature-a preview showed "subject: none found." Renamed to
`06-E1-subject-lines-product-creature-a-close-c.md` to match the winner; confirmed the real subject
line now resolves on render.
- ⚠ **Not yet done, and worth doing while this is fresh:** `kaucim` and `iching`'s own
  `-PREVIEW.html` files (2.97MB and 1.07MB) still use the pre-fix full-resolution base64 embedding
  — they were never migrated to the hosted-image pattern because that fix only touched creature-a's
  images. Low priority since they're reference-only, but if either is ever revisited, apply the
  same fix documented in `../0-WORKFLOW.md`'s D12 section before re-rendering.

- **Subheadline pass, walls of text.** Beats 3 (anatomy) and 7 (Rosalind/limit) already had
  `###` headers from earlier passes; Beats 2 (myth), 4 (horn), 5 (pivot), and the tail of Beat 6
  (wrist rule) didn't — an inconsistency, not a style choice. Five parallel candidates tried
  distinct heading styles (plain labels, curiosity questions, pulled claims, bridge-to-her,
  minimal/atmospheric) against the same four walls, body copy untouched in all five. **Operator
  picked curiosity-question style** — `06-E2-esl-product-creature-a-subhead-question.md` is now
  the base every later edit builds on. The other four style variants still exist as reference,
  same as the 9 device candidates above.
- **Close reorganized, twice.** Operator feedback: too many CTAs (5 links across 4 headed
  mini-sections + P.S.), and the left-wrist ritual — originally its own heading mid-letter in
  Beat 6 — belonged in the close instead, for a softer ending. Three candidates built on the
  question-style base, each folding the wrist ritual into Beat 8 and cutting the CTA count
  differently: `close-a.md` (single section, 2 links), `close-b.md` (ritual opens the close, 2
  headed beats, 3 links), `close-c.md` (single question-style heading matching the rest of the
  letter, ritual+contents blended into one paragraph, 2 links). **✅ Operator picked close-c,
  2026-09-02** — matches the question-style voice used everywhere else in the letter, and the
  "What arrives" / "How you wear it" bullets read cleaner than close-a's two prose paragraphs.
  `06-E2-esl-product-creature-a-close-c.md` is now **the finished letter**. close-a and close-b
  stay on disk as reference, not superseded, same convention as every other candidate in this
  offer.
- **Two real content fixes, not just formatting**, applied identically across all four live files
  (subhead-question + the 3 close variants):
  - The horn-detail beat (Tianlu/Bixie) was rewritten twice more: first because a double hedge
    ("or whether either, precisely") read as doubt about the product's whole mythology rather than
    honest uncertainty; then again once the operator confirmed the actual product is two-horned
    (Bixie) — the letter no longer hedges at all, states it plainly, and (after a web-search
    fact-check confirmed both are true at different scopes) acknowledges the popular "Pixiu
    attracts wealth" belief before differentiating this specific two-horned piece as the guardian,
    not the puller.
  - Rosalind's precedent story went from two thin, abstract paragraphs to a concrete scenario (a
    matched payment/expense), a doubt beat, and a closing quote — same honest limit, more texture.
  - Both are logged in each file's own Build notes, with the reasoning, not just the result.
- **File-size fix.** The 12-image preview rendered at 47MB (full-resolution PNGs base64-embedded,
  even though the letter displays them at 120–540px). Fixed by resizing to 2x display size and
  hosting on S3 instead of embedding — **this is a general lesson, not 06-specific, so it's now
  written into the master `0-WORKFLOW.md`'s D12 section** (physical-object offers using real
  photography hit this every time). See there for the how; see `render-be-esl-preview.mjs` for the
  actual code.

### ✅ Resolved, operator, 2026-09-02 — Reading-shaped funnel, Object-shaped product

**"No reply. Simple, buy and we ship."** This was mostly already answered without being labeled —
the worksheet's "Does the work need a reply from her?" row was already ☑ **No**, and that's the
actual thing that splits Reading from Act in this deck (Act = 03, she replies mid-flow, thank-you
page becomes an intake form; Reading = 02/04, no reply, thank-you page is a receipt). So:
- **Phase A is Reading-shaped** — receipt thank-you page (A6), then a wait, then a delivery email
  (C2). Nothing new to invent here; it reuses 02/04's pattern directly.
- **Phase B is its own thing, not "Reading" wearing a different name.** 02/04's Phase B produces a
  formatted PDF; 06 doesn't produce a document at all. Its Phase B is: write the insert card,
  package the physical object, ship it. The delivery email (C2) carries **tracking info instead of
  a PDF link** — already anticipated as D8-equiv below, doesn't need a new decision, just execution.

*(Nothing is blocking Phase A start any more, decision-wise. What's left is execution — see the
punch list the next session should work from, or ask Claude to compile it fresh from this file's
current state.)*

---

# Step 0 — the worksheet

◐ **Partially answered**, through conversation rather than a formal pass yet.

| Question | Answer | Status |
|---|---|---|
| Reading or Act? | **Resolved 2026-09-02: Reading-shaped funnel** (no reply needed, receipt thank-you, wait, delivery email — same as 02/04), **but Object-shaped Phase B** (no PDF — write the insert, package, ship; delivery email carries tracking, not a link). See the resolved note above | ✅ |
| How is it priced? | ✅ **Resolved 2026-09-02: fixed price, $49.** No PWYW, no ladder — matches the physical-item shape. Bump `$11.11` confirmed | ✅ |
| Does the work need a reply from her? | No — same as 02/04 | ☑ |
| Does the booking page promise anything only code can keep? | **Yes, new for this deck: a real shipping SLA** (7 business days processing + 1–2 weeks US delivery, per the source product). 02–04's booking pages only ever had to get her to accept a 24h digital wait; 06 needed an explicit statement she ticks acknowledging a real multi-week physical wait | ✅ written — `06-C1-booking-page.md`'s shipping-wait consent statement (Third round). Not code-wired yet; that's Phase A |
| What is the one sentence both upsells sell? | Not yet written formally, but the shape is settled — see U1/U2 below | ◐ |
| How long is the product, and how many cards? | N/A in the 02/04 sense — no word count, no card count. The "product" is the physical bracelet plus (per the "wrap it in a reading" decision) a short personalized insert. Scope of that insert is undecided | ☐ open |
| What loops did the sales letter open? | Depends on device — see each candidate's own build notes in `copy/06/06-E2-esl-*.md` | ◐ per-candidate |

---

## Decisions carried over from conversation, not yet formalized as D-numbers

These map to the master's D1–D12 decision list but several don't have a clean slot, because 06 is
the first physical-object offer in the deck. Recorded here so they don't get re-litigated.

| | Decision | Status |
|---|---|---|
| D1 | Root URL | ✅ **`/wiccan/wishing-bracelet`** — operator delegated the pick 2026-09-02; matches 03/04/05's `/wiccan/<slug>` convention |
| — | **Price.** ✅ **Resolved 2026-09-02: $49 main, `$11.11` bump (confirmed).** Not yet a real Stripe price ID — build dark behind `BACKEND_CHECKOUT_LIVE` same as every other offer until one exists |
| — | **Fulfillment.** ✅ **Resolved 2026-09-02: our own sourced item, not dropship.** Real address capture + Stripe metadata + manual "ship this" operator alert, reusing the pattern already proven on V1's Manifestation Bracelet upsell (`ShippingForm.tsx`, `braceletOrders.ts`). Unblocks the definitive product photo (a real physical shoot of our own unit, once sourced — still a real-world task, not something buildable in-session) |
| — | **Image sourcing (D12's own rule).** ⚠ **EXCEPTION, operator, 2026-09-01** — see `../0-WORKFLOW.md`'s D12 section. 06 uses real sourced photography for imagery instead of drawn diagrams, against the deck's default rule, by explicit operator override. Two drawn mechanism images already exist (`assets/06-kaucim-mechanism.png`, `assets/06-iching-mechanism.png`) and may be replaced once real photos are sourced and licensed |
| — | **IMG-12's "A" clasp logo.** ✅ **Resolved 2026-09-02: it's our own logo.** No compliance/provenance concern — the letter's product photo can ship as-is |
| — | **Free gift equivalent.** ✅ **Resolved 2026-09-02: skipped.** No P3-equivalent for 06 |
| D7-equiv | One insert per buyer vs. one for everyone | ✅ **Resolved 2026-09-02: neither exactly — the box ships with 4–5 blank inserts, and she picks which one to write her sentence on.** No personalization-copy task results from this; it's a packaging spec. The letter's "the sealed capsule and its paper" (singular) still reads fine at the level of detail it's written at — she still only seals one, the rest are hers to have as spares/retries |
| D8-equiv | Attachment/link (n/a — physical) vs. **tracking info in the delivery email** | ✅ resolved by the Reading-vs-Act decision above — tracking info, not a link |
| — | **U1/U2.** ✅ **Settled, operator + Claude, 2026-09-01.** Reuse V1's actual Protection Ritual + lava stone (U1) and Manifestation Bracelet (U2) verbatim — same pattern 02 already uses (rewrite only the 4 opening beats per `02-U1a`/`02-U2a`, everything from `SOLUTION` onward is unchanged). U2's bridge is unusually clean: Pixiu seals what reaches her, the Manifestation Bracelet calls new things toward her — the same "arrives vs. calls" hinge 02 already uses. U1's bridge uses 06's *real* shipping wait as the vulnerability window, which 02–04 don't have. Not yet written as actual opening-beat copy for either candidate device. **Images: no new work needed** — both products already have real committed product photos wired in (`client/src/assets/images/lava-stone.jpg` via `UpsellPage.tsx`; `client/public/manifestation_bracelet.png` via `Upsell2Page.tsx`), confirmed 2026-09-01. Richer alternates exist unused at `client/public/products/` and `client/public/soulmate/` if ever wanted |
| — | **Order bump.** ✅ **Written (Third round), `06-C3-order-bump.md`.** "The Closed Purse" — self-performed, text-only (per the `02-C3` rule: a bump is something she does, not something that ships), answering the *outflow* side of money rather than Pixiu's *retention* job. Price `$11.11` proposed, not locked |

---

# Phase A — the funnel

### ☐ A1. Fill in the worksheet, settle D1
✅ Done — D1 = `/wiccan/wishing-bracelet`, all other worksheet rows resolved above.

*(Every step below is untouched — Phase A has not started for 06.)*

---

## Copy status *(the deck's "Group A", ahead of 0-WORKFLOW's own Phase A)*

| Asset | Status |
|---|---|
| `06-SPEC-wishing-bracelet.md` | ✅ written |
| **`06-E2-esl-product-creature-a-close-c.md`** | ✅ **THE FINISHED LETTER**, chosen 2026-09-02. Question-style subheads, question-style close, bullets, 2 links. Passes `copy-check.cjs`. Subject line comes from `06-E1-subject-lines-product-creature-a-close-c.md` (renamed 2026-09-02 to match — see the audit note above) |
| `06-E2-esl-kaucim.md` / `06-E2-esl-iching.md` | kept for reference — the reading-led direction, explicitly preserved in the 2026-09-02 audit even though not chosen |
| Everything else 06 ever tried | ⛔ **deleted 2026-09-02** — see the Fourth round audit note above for the full list (product v1, 5 named DR-architecture letters, creature-b, the unheaded creature-a original, 4 subheadline styles, 2 non-chosen close variants) and why kaucim/iching were the exception |
| `assets/06-kaucim-mechanism.png`, `06-iching-mechanism.png` (drawn, reference candidates only) | ✅ rendered |
| `assets/06-kaucim-hero.jpg`, `06-iching-hero.jpg` (real, sourced, reference candidates only) | ✅ sourced, provenance in `assets/06-sourced-images-index.json` |
| `assets/06-pixiu-anatomy.png` (drawn — labeled breakdown of the creature) | ✅ rendered, `scripts/make-pixiu-anatomy.mjs`. Six labeled parts, symbolism verified across multiple independent feng shui sources |
| The 12 creature-a images (7 anatomy crops, 3 material illustrations, 1 hero, 1 real product photo) | ✅ generated/sourced, verified per-crop, resized + hosted on S3 — see Fourth round above and `06-creature-a-images.json` |
| Booking page copy (`06-C1`) | ✅ written (Third round) |
| Order bump copy (`06-C3`, "The Closed Purse") | ✅ written (Third round), price `$11.11` proposed not locked |
| U1/U2 opening-beat rewrites | ☐ not started. Images NOT blocking — both already exist, see decisions table |
| Thank-you page / delivery email | ☐ not started |

### Image inventory — creature-a complete, one real gap ahead on the final product photo

| Need | Status |
|---|---|
| Creature-a letter images, all 12 (hero, 7 anatomy crops, 3 material illustrations, 1 product photo) | ✅ generated via `codex exec` image-to-image (reference-conditioned off one source image), verified per-crop against real feng shui sources, resized + hosted on S3 — see Fourth round above |
| U1 (Protection Ritual) product photo | ✅ already exists, `lava-stone.jpg` — no work needed |
| U2 (Manifestation Bracelet) product photo | ✅ already exists, `manifestation_bracelet.png` — no work needed |
| **Final, definitive booking-page product photo of the actual shipped Pixiu bracelet** | ◐ an interim real photo is in use in the letter (`IMG-12`, `06-pixiu-product-angle-fixed.png` — Codex-edited for camera angle, operator-acknowledged as not pixel-faithful on fine text/logo). The **definitive** photo is still ☐ **open** — blocked on the fulfillment/sourcing decision (dropship vs. own-sourced unit decides whose photo we're even allowed to use) |
| Kau Cim / I Ching reference-candidate images (heroes, mechanism diagrams) | ✅ still exist, reference only — see the Copy status table above |

⚠ **The "no AI image-generation tool available" note this section used to carry is stale — struck
2026-09-02.** It was true at the point this doc was first written; by the time creature-a was
built, `codex exec` image-to-image (direct, not via `codex-rescue` — see the `clay-ad-codex-dispatch`
skill and the Fourth round note above) was the actual generation path for all 12 images.

---

### ✅ Fifth round, operator, 2026-09-02 — de-gendered the whole offer, plus two small fixes

**"Unnecessary to use women in the opening beats. We have men on the list too — the Pixiu offer is
more for men than women."** Checked how far it ran before fixing anything: every one of the 8
live copy files had *some* gendered language, but the actual severity varied a lot once checked
line by line, not assumed from the grep count alone.

- **Real buyer-facing problems, not just internal notes:** the letter's Rosalind precedent story
  ("a woman," "she/her" throughout) and `06-U1a`'s entire RISK beat ("a woman who thinks she's
  covered," "most women don't understand/notice" — actual quoted chat messages, not comments).
  Rewritten: Rosalind's story to singular "someone... they," the RISK beat to direct "you" address
  where it was already talking to `{firstName}`, and singular "they" where it was a third-person
  illustrative pattern.
- **Everywhere else, the buyer-facing copy was already neutral by construction** — `06-C1` and
  `06-C3` are written in the BUYER's own first-person voice throughout ("I understand...", "I'll
  send..."), and `06-T1`/`06-T3`/`06-T4`/`06-U2a` already used direct second-person "you" address.
  The gendered language there was confined to internal comments and Build notes (never rendered to
  a buyer) — cleaned up anyway, for consistency, not because it was customer-facing.
- **Operator chose "neutral everywhere, all 8 files"** over two other options offered (lean male;
  or fix only the 2 flagged upsell files) — see the actual `AskUserQuestion` exchange in the
  session transcript if the reasoning behind the other two options is ever needed again.
- **Two unrelated fixes landed in the same pass, caught while reading these files closely:**
  1. The on-screen thank-you page had been written to `06-A6-thank-you-page.md`, but
     `06-C1-booking-page.md` already forward-referenced it as `06-T1` (matching 02's and 03's own
     `0X-T1-thank-you-page.md` convention). Renamed to `06-T1-thank-you-page.md` and fixed both the
     file's own self-references and `06-C1`'s "not yet written" note.
  2. `06-C1`'s D1 row still proposed `/charms/wishing-bracelet`, unaware the operator had since
     resolved D1 to `/wiccan/wishing-bracelet` (Fourth round, above). Updated to match.
- **Subject lines tightened in the same session, separate request.** "Subject lines are too long —
  need curiosity yet self contained": the bank technically passed its own 120-byte cap but put the
  actual hook past where mobile inboxes truncate (~40-45 visible characters), so the payoff never
  showed. All 6 rewritten shorter with the hook front-loaded; one (the horn-count subject) was also
  substantively wrong by then — it still hedged ("I haven't confirmed ours") after the horn beat
  itself had already been resolved to a confirmed two-horned Bixie. Fixed in the same pass.
- All 8 files re-verified with `copy-check.cjs` after every edit, individually and as a full-corpus
  run — zero new findings introduced. The only corpus findings are the same pre-existing kaucim/
  iching collisions already documented above (reference-only files, deliberately left as-is).

### ✅ Sixth round, operator, 2026-09-02 — preview now shows the real AWeber tag, not a sample name

`render-be-esl-preview.mjs` used to substitute a sample name ("Sarah") for `%FIRSTNAME%`, on
purpose — the script's own original header comment argued a human reviewer wants to read the
letter the way a recipient would, not stare at raw merge syntax. Operator overrode that: seeing a
literal name in the rendered file read as something that might actually get sent to every buyer,
which is a worse failure mode than slightly harder-to-read syntax. Now shows the real tag,
`{{ subscriber.first_name | capitalize }}`, everywhere `%FIRSTNAME%` appears (body, subject,
preheader) — matching what `render-be-email.mjs` (the T3/T4 renderer) already did. The now-unused
`[sample-name]` CLI argument was removed from the usage string. This is a shared-script change, so
it affects every offer's preview, not just 06's — re-rendered and confirmed correct on `close-c`
and both kept reference candidates (kaucim, iching).

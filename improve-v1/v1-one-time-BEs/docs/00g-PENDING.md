# 00g — PENDING

Everything still open on the backend deck, as of **2026-08-04**, after Phase 1 copy for 02/03/04.

Companion to [00-TODO](./00-TODO-BEs.md) (sequenced next actions) and
[00c-ASSETS](./00c-ASSETS-BEs.md) (the full register). This file is the *state*; 00-TODO is the
*order*.

**Where things stand:** 36 copy assets written across 02, 03 and 04, all passing
`node scripts/copy-check.cjs`. Nothing is built beyond 02's two letters. **Nothing can ship yet** —
every CTA in every letter points at a booking page that does not exist.

---

## A · Phase 1 copy — what's left

- [ ] **A1 · 05 Cut the Cord, groups A–E** (~14 assets). The only offer with no copy at all.
      Blocked on **B4** and **A2** below.
- [ ] **A2 · Rename 05's "Nine Nights."** 03 now owns it — nine days is load-bearing in 03's letter,
      its Ledger of Signs and its silence duty. 05's sealing practice needs a new name before its
      product is written. *(Corpus finding, [00f](./00f-VARIANCE-PASS.md).)*
- [x] ✅ **A3 · 04-P1's two alternate self-diagnosis branches — WRITTEN IN FULL** (2026-08-04).
      *The Turned Handle* (contact intact, weight gone; bridge moves to 13–15; warned off testing
      him) and *The Sunken Leaf* (nine fully silent days; bridge moves to 19–21; warned that it may
      produce nothing, and that a null result is the information she paid for).
      ⚠ **Consequence for `04-P3`:** each branch puts the bridge in a different week, so the rim
      calendar must be **generated per branch**, not printed once.
- [ ] **A4 · v2 follow-up letter for 03.** [00e §1c](./00e-FRAMEWORK-BEs.md) calls the missing v2
      *"the most-missing asset in the deck"* — 02 ships one, nobody else does. **04 does not need
      one** (its three ladder emails already are the follow-up sequence). 03 does. Roughly a third
      of the work of a v1: keep the skeleton, new free-read unit, compress the origin, drop the
      precedent, escalate inward.
- [ ] **A5 · Image briefs beyond the heroes.** Each letter carries a written hero brief
      (`IMG-1`), but the supporting sets don't exist: `02-E5` (8 images), `03-E4` (**source has
      none — needs art direction from scratch**), `04-E4` (1 exists, needs more).
- [ ] **A6 · Re-run the variance pass with all four offers in view.** [00f](./00f-VARIANCE-PASS.md)
      covered three of four. Cannot be considered done until 05 exists.

---

## B · Decisions only the operator can make

Each is short. Several unblock build work that is otherwise ready to start.

- [x] ✅ **B1 · The bump ships UNCHECKED, opt-in** (2026-08-04). `02-C3` was already written as an
      opt-in, so no copy changed. Clean consent trail on every order.
- [x] ✅ **B2/B3 · The FULL LADDER runs everywhere** (2026-08-04) — no suppression. My
      recommendation to skip both was overridden.
      ⚠ **This had a real copy consequence and it has been actioned.** Both flows had been written
      *to be skipped* — 03's U2 opened on *flat* and hedged (*"I'm not going to sell you a feeling"*),
      and 04's U1 was five thin beats restating the product. Shipping copy has to be good, so both
      were **rebuilt**:
      · **03's U2** now sells **agency, not filling** — *you never chose what went in that room* —
        which runs with `03-P1`'s "boredom is what closure feels like" instead of against it.
      · **04's U1** now has a real risk beat taken from `04-P1`'s third expectation: **the
        well-meaning friend who tells her to just be honest with him, around day five.** The only U1
        in the deck whose danger is someone who loves the buyer.
- [x] ✅ **B4 · 05's source guarantee NEVER SHIPS** (2026-08-04). 05 is written on the reframe
      only. **A1 is unblocked on this axis** — only the Commitment Charm hook rewrite remains.
- [x] ✅ **B5 · Headline and deck CENTRED** in both 02 letters (2026-08-04), matching the centred
      subheads variant B already shipped. Applied identically to v1 and v2 so the A/B stays
      comparable. ⚠ Both letters need a re-render check at 600px and 390px before send.
- [ ] **B6 · Seed-test AWeber Liquid `| default: "dear"`.** Untested. Without a fallback, a
      subscriber with no first name renders **five** empty slots per letter — the live programme
      already carries this in subjects, and putting the tag in the body multiplies the breakage.

---

## C · Production — the critical path

⚠ **The single blocking dependency: `{{BOOKING_URL}}` has no value anywhere.** Every CTA in every
letter, nudge and ladder email points at it. Until `S1`/`S2`/`S4`/`S5` exist, no offer can take a
pound.

### C1 · The minimum sellable slice (02 only)

- [ ] Offer registry `server/lib/backendOffers/config.ts` (`S1`)
- [ ] Booking page component, config-driven, Treatment B (`S2`) — one page, not four
- [ ] Subscriber identification on click (`S3`) — reuse Soulmate hydration, no raw email in URLs
- [ ] `be_orders` table + Stripe webhook (`S4`)
- [ ] Checkout mode: fixed + bump (`S5a`) · Stripe prices $35 + $12.77 (`02-C5`)
- [ ] Thank-you route (`S6`) · idempotency + double-charge guards (`S12`)
- [ ] `getReadingBody()` seam (`S23`) + `be_orders.reading_body` (`S24`) — build the seam now or
      pay for it twice
- [ ] Email HTML: `02-P4` product delivery · `02-T3` confirmation · `02-E6` nudges
- [ ] Host images (`02-P2` is ~10 min — 7 of 12 cards already on S3)
- [ ] ESP automation, tags, suppression (`S10`, `02-O1`, `02-O2`) — ⚠ *"I won't write to you about
      this again"* is a promise only the automation can keep
- [ ] Per-CTA click tracking (`S11`) — 02 has 7 reserved CTA slots and we need to know which converts
- [ ] Compliance block (`S13`) + QA checklist (`S14`)
- [ ] **Segmentation gate (`S7`)** — without it "women-only" is not real, and 02 ships behind it

### C2 · 03 additionally requires *(must exist before the first 03 order lands)*

- [ ] Inbound pipeline (`S15`–`S18`): MX on `reply.theseerwithin.com` → Resend catch-all →
      `be_replies`; per-order Reply-To; triage view; auto-submitted filter
- [ ] **Intake queue (`S29`)** — 5 fields, ~3 min/order
- [ ] **Alarm triage (`S30`)** — keyword pre-screen, 3 blocking tiers + protective variant
- [ ] **30-day TTL + real delete cron (`S31`)** on third-party intake; strip attachments on receipt
- [ ] Third-party PII policy (`S19`) — buyers will send names and accusations about people who
      never consented
- [ ] **Capacity cap (`S8`)** — `03-C1` statement 4 promises *"if the week is spoken for, this page
      closes."* Build it or cut the line
- [ ] PWYW checkout + clamp (`S5b`)
- [ ] Mid-SLA "work has begun" email (`S32`) — three days is long enough to lose a dispute in

### C3 · 04 additionally requires

- [ ] Ladder state table + server-side resolver (`S9`) → `{{TODAYS_RUNG}}`
- [ ] Stripe prices ×4 rungs (`04-C5`)
- [ ] ⚠ **Nudge/ladder suppression cap.** `04-E5a/b/c` fires for women who never reached the page;
      `04-E6` for women who did. A woman who qualifies for both must not get five emails in four
      days — suppress the day-2 ladder email

### C4 · Shared, later

- [ ] Upsell chat engine (`S20`) — clone `useUpsellChat.ts`; ~48 of ~60 messages reuse verbatim
- [ ] Upsell allocation + suppression (`S21`) — never offer an object she already owns
- [ ] Shipping + physical fulfilment (`S22`) — reuse `bracelet_orders`
- [ ] Echo slots (`S28`) — 3 per product, one verbatim, merged from V1 Supabase
- [ ] Hosted mirror page at a tokenised URL (`S33`)
- [ ] n8n generator behind `getReadingBody()` (`S25`–`S27`) — Phase 2 proper

---

## D · Housekeeping

- [ ] **D1 · `00b-BUILD-BEs.md`'s per-offer checklists are stale.** Roughly 25 of its unchecked
      boxes were completed this pass (02's booking page, thank-you, confirmation, product, horoscope
      rewrite, bump deliverable; 03's ESL, subjects, booking page, thank-you, confirmation, product,
      intake handling, SLA; 04's ESL, subjects, ladder emails, booking page, product). Reconcile
      against `00c` or it will mislead the next reader.
- [x] ✅ **D2 · `02-E4-esl-v1.txt` regenerated**, not deleted — the file is **untracked in git**, so
      deletion would have been irreversible. All three HTML/text pairs are now internally
      consistent: plain v1 6/6 CTAs, v1-B 7/7, v2-B 7/7, zero mangled contractions.
- [ ] **D3 · The plain `02-E4-esl-v1.html` has no job left.** With the P.S. shipping on every letter
      and the centring applied to variant B only, the plain variant is superseded twice over. It is
      internally consistent so it is harmless — but it should be deleted once you're confident
      variant B is the only shipping form. **Operator's call; it is untracked, so deletion is final.**
- [ ] **D4 · AWeber draft `61250814` must not be scheduled.** Of its three stated blockers, the Moon
      contradiction is now **resolved** (accepted by decision). Two remain: the booking page does not
      exist, and it sits on the general free list rather than behind the women-only gate.

---

## The honest summary

**Copy is nearly done; nothing is built.** Phase 1 is ~75% complete (three offers of four) and the
remaining copy is small and well-specified apart from 05, which needs one decision (**B4**) and one
rename (**A2**) before a word of it can be written.

The real distance to revenue is **C1** — and none of C1 is written yet.

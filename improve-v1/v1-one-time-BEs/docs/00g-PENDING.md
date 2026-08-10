# 00g — TO-DO, aligned to 0-WORKFLOW

**Everything still open, in the phases [`0-WORKFLOW`](./0-WORKFLOW.md) uses.** That file is the
runnable doc — the *how*. This is the *what's left*, per offer.

⚠ **Renumbered 2026-08-10.** An earlier version of this file used its own A/B/C/D scheme, which
collided head-on with the workflow's Phase A / Phase B / Phase C. **A/B/C here now mean the
workflow's phases and nothing else.** Same pass: the variance record moved `00f` → `00m`, so
`00f-PRODUCT-DESIGN-BEs.md` is the only `00f`.

---

## Where each offer stands

| | Copy | **A** funnel | **B** product | **C** list + 2 emails |
|---|---|---|---|---|
| **02** Twin Flame | ✅ complete | ✅ built, preview-only | ❌ **never run** — 4,821 words, unformatted | ◐ C1/C2 written, C0 undone |
| **03** Judgement Day | ✅ complete | ◐ booking only — **no U1, U2 or thank-you** | ❌ never run — 2,429 words | ◐ C1 written, C0 undone |
| **04** The Turn | ✅ complete | ❌ nothing | ❌ never run — 3,714 words | ❌ |
| **05** Cut the Cord | ❌ **none at all** | ❌ | ❌ | ❌ |

⚠ **"Written" means words in a markdown file.** No product has been formatted, had its cards
inserted, or been made deliverable. **Phase B has never been run for any offer.**

---

## ⛔ The blocker under everything: there is no Stripe

Verified in code 2026-08-10, not inferred from the docs:

- `addBackendCustomer` exists at `server/lib/aweber.ts:856` and has **zero callers** outside its test
- **`be_orders` appears in `shared/schema.ts` zero times** — the table is not in the schema
- every booking button logs `[preview] would checkout {…}`

So no buyer has ever reached the customer list, and **C3's end-to-end boxes cannot be ticked by
anybody**. The workflow says it plainly: *these cost us a day on 02 and will cost the same on 03,
04 and 05 — fixing them once, centrally, is now cheaper than hitting them three more times.*

⚠ **Both AWeber access tokens are expired** (401 `invalid_token`, checked 2026-08-10) —
`AWEBER_ACCESS_TOKEN` and `AWEBER_BROADCAST_ACCESS_TOKEN`. Nothing in Phase C reaches AWeber
until they are refreshed.

---

## Phase A — the funnel

- [ ] **A·shared — Stripe.** `be_orders` + checkout + `checkout.session.completed` →
      `addBackendCustomer`. **Unblocks all four offers and C0/C3.** Do this once, centrally.
- [ ] **03 · A6 — the thank-you = the Entry form.** 🔴 **Load-bearing.** The booking screens no
      longer ask for the Entry anywhere, so as built 03 would take money and have no way to ask the
      one question fulfilment depends on. An ACT offer cannot be filled without her reply.
- [ ] **03 · A4/A5 — U1 and U2.** Copy drafted (`copy/03/03-U-upsell-beats.md`), plan in
      [`00k`](./00k-PLAN-03-UPSELLS.md), tick sheet in [`00l`](./00l-DELIVERABLES-03.md).
- [ ] **04 · A1–A8 — the whole funnel.** Not analysed. Root is `/wiccan/tea-reading`.
      ⚠ Needs the ladder resolver (`S9`) that no other offer needs.
- [ ] **05 · A1–A8** — after its copy exists.

## Phase B — the product *(never run; 02 is the pilot)*

- [ ] **02 · B1–B7.** Scope → plan structure → write *(done: `02-P1`)* → insert the 12 cards →
      format as a document → make deliverable → the gate before it ships.
      ⚠ **B4/B5/B6 are the unknowns** — nobody has produced a PDF from this pipeline yet.
- [ ] **03 · B1–B7**, then **04**, then **05**.

## Phase C — the customer list and its two emails

- [ ] **C0 · Create `theseerwithin_be_customer` in the AWeber UI.** 🙋 **Operator, by hand** — the
      API returns **405** for list creation (hard limit of API 1.0; tried 2026-08-10, don't retry).
      Four custom fields, spelled exactly: `stripe_order_id`, `offer`, `entry_url`, `reading_url`.
      Then `AWEBER_BE_CUSTOMER_LIST_ID` into `.env` — ⚠ **currently absent from `.env` entirely**;
      it exists only in `.env.example`.
      ⛔ Not `theseerwithin_paid` — that is V1's 5,290 buyers.
- [ ] **C1/C2 · The two emails.** Copy exists for 02 (`02-T3`, `02-T4`) and 03 (`03-T3`). Still to
      write for 04 and 05, and none is uploaded as an AWeber Campaign yet.
- [ ] **C3 · Upload, automate, prove.** ⛔ Gated on Stripe above.

## Copy — the remainder

- [ ] **05's whole deck (~14 assets).** ⛔ Blocked on the *Commitment Charm* hook rewrite
      ([`00b` §6.4](./00b-BUILD-BEs.md)) — its premise sells an offer we don't have.
      ⛔ Must also **rename "Nine Nights"**; 03 owns it ([`00m`](./00m-VARIANCE-PASS.md)).
- [ ] **A v2 follow-up letter for 03.** [`00e` §1c](./00e-FRAMEWORK-BEs.md) calls the missing v2
      *"the most-missing asset in the deck"*. 04 needs none — its three ladder emails are the
      follow-up. Roughly a third of the work of a v1.
- [ ] **Image sets beyond the heroes.** Each letter has a written hero brief; the supporting sets
      don't exist. `03-E4` has **no source art at all** and needs direction from scratch.
- [ ] **Re-run the variance pass with all four in view** ([`00m`](./00m-VARIANCE-PASS.md) covered
      three of four).
- [ ] **`04-P3` must be generated per branch.** Each self-diagnosis branch puts the bridge in a
      different week, so one printed rim calendar would contradict two of the three sequences.

## Housekeeping

- [ ] **`00b`'s per-offer checklists are stale** — banner added 2026-08-10, but ~25 boxes still
      read as undone. Reconcile against `00c` or retire the section.
- [ ] **The plain `02-E4-esl-v1.html` has no job left** (superseded by variant B's P.S. and
      centring). Harmless; delete when you're confident B is the only shipping form.
- [ ] **`scripts/_unsubscribe-run2-*` are untracked and not gitignored** — one holds ~47,000 real
      subscriber IDs. A `git add -A` would commit them. Consider `scripts/_*` in `.gitignore`.
- [ ] **Seed-test AWeber Liquid `| default: "dear"`.** Untested; without it a subscriber with no
      first name renders five empty slots per letter. Needs a UI test send — no API endpoint.

---

## Settled — do not re-open

| | Decision |
|---|---|
| Voice | 02's ratified letters are the deck standard; 03/04 match them, not the sources |
| Precedent | Invented precedent **keeps**; each offer writes its own distinct *story* |
| 02 Moon | The v2 copy/art mismatch is **accepted**. Do not re-flag it as a defect |
| P.S. | Ships on **all** letters, no A/B. `c=7`/`c=27` are permanent slots |
| Bump | Ships **unchecked**, opt-in (negative-option exposure) |
| Upsells | **Full ladder runs everywhere** — no suppression. 03's U2 and 04's U1 were rebuilt to ship |
| 05 | *"she will NOT pursue him"* **never ships**; 05 is written on the reframe only |
| 03 | Mechanism **rebuilt off Vodou** — Entry · Transfer · Closing. No spirits, no hex |
| 02 layout | Headline and deck **centred** in both letters ⚠ needs a re-render check at 600px/390px |
| Retired | Calendar-deadline + third-party-outcome regexes, and em-dash counting. Never reinstate |

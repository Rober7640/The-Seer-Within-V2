# 00c — ASSET REGISTER: the to-do list

Every asset the deck needs, per offer, with a stable ID so we can say "build 02-P2" and both
know what that means. Companion to [00-FLOW-BEs.md](./00-FLOW-BEs.md) (what the funnel does)
and [00b-BUILD-BEs.md](./00b-BUILD-BEs.md) (why).

**Status key**

| | Meaning |
|---|---|
| ✅ review | Written and audited — waiting on the human review gate |
| ✏️ | Source has it — transcribe + recast to Evelyn's voice |
| 🔨 | Write from scratch (no source) |
| ⚙️ | Code |
| ❓ | Decision needed before it can be built |
| ⛔ | Blocked on a go/no-go |

**Asset classes** (same six for every offer, so IDs are predictable)
`E` email · `C` checkout · `P` product · `T` post-purchase · `U` upsell · `O` ops

---

## Shape of the work

| Offer | ✏️ recast | 🔨 from scratch | ⚙️ code | ❓/✅ | Total |
|---|---|---|---|---|---|
| 02 Twin Flame | 12 | 6 | 5 | 2 | **25** |
| 03 Judgement Day | 4 | 9 | 6 | 1 | **20** |
| 04 Tea Reading | 4 | 12 | 4 | 1 | **21** |
| 05 Hex Her | 4 | 11 | 4 | 1 | **20** |
| **Shared** | — | 4 | 31 | — | **35** |
| | | | | | **121** |

02 is the cheap one and the only one whose product exists. Everything after it is mostly
writing, not coding.

---

## S — Shared plumbing (build once, all four use it)

| ID | Asset | Status | Notes |
|---|---|---|---|
| S1 | Offer registry — **built as `shared/backendOffers.ts`**, not `server/lib/` | ✅ | price model, bump + its n8n key, Stripe product, booking/success paths, `readyForMoney`. In `shared/` so the screen that PRINTS a price and the endpoint that CHARGES one read the same row |
| S2 | Booking page component `client/src/pages/backend-offers/BookingPage.tsx` | ⚙️ | config-driven, one page not four. **Treatment B — plain direct-response** (decided; see render) |
| S3 | Subscriber identification on click | ⚙️ | reuse Soulmate hydration (`shared/schema.ts:1305-1310`). No raw email in URLs |
| S4 | `be_orders` table + webhook handler | ✅ | `shared/schema.ts` + `migrations/2026-08-10-be-orders.sql` (⛔ run the SQL, never `db:push`); `server/lib/beOrders.ts`; `be_*` branch in `server/routes/webhooks.ts`. Records the AWeber write's success/failure, because that write IS the thank-you send |
| S5a | Checkout mode: fixed + bump | ✅ | 02. `POST /api/backend/checkout` — price from the catalog, never from the request |
| S5b | Checkout mode: PWYW + floor | ✅ | 03. Floor **enforced server-side**; the refusal message never names it |
| S5c | Checkout mode: ladder | ⚙️ | 04 — the one model the catalog does not carry yet |
| S6 | Thank-you route component | ⚙️ | clone `SoulmateThankYouPage.tsx` |
| S7 | Segmentation gate (pronoun + bucket) | ⚙️ | without this "women-only" isn't real |
| S8 | Capacity cap + link deactivation | ⚙️ | 03 + 05 both claim limited slots |
| S9 | Ladder state table + server-side resolver | ⚙️ | 04 only |
| S10 | ESP tag/field schema + automation skeleton | ⚙️ | 02 shows the pattern: `tag: twinflametarot` |
| S11 | Tracking: per-CTA clicks, CAPI, funnel steps | ⚙️ | 02 has 6 CTAs — need to know which converts |
| S12 | Idempotency / already-bought / double-charge guards | ⚙️ | |
| S13 | Compliance block: disclaimer, CAN-SPAM, refund policy | 🔨 | |
| S14 | QA checklist: render, test purchase, link audit, dry-run | 🔨 | |
| S15 | **Inbound email pipeline** — MX on `reply.theseerwithin.com` → Resend catch-all → `POST /api/inbound/resend` → fetch body via Received Emails API → `be_replies` table | ⚙️ |
| S16 | **Per-order Reply-To** — send with `ord_<id>@reply.theseerwithin.com` so replies self-identify. One-line change at each Resend send site (they already set `replyTo`) | ⚙️ |
| S17 | Reply triage view — read intake, draft, human approves before send | ⚙️ |
| S18 | Auto-submitted filter — never respond to bounces / OOO / auto-replies (loop risk) | ⚙️ |
| S19 | **Third-party PII policy** — buyers will send names + accusations about people who never consented. Retention, access, deletion | 🔨 | |
| S20 | Upsell chat engine — config-driven; clone `useUpsellChat.ts` / `useUpsell2Chat.ts` | ⚙️ | ~48 of ~60 messages reuse verbatim |
| S21 | **Upsell allocation + suppression** — never offer an object they already own | ⚙️ | owns nothing → stone → bracelet; owns both → straight to thank-you |
| S22 | Shipping collection + physical fulfilment | ⚙️ | reuse `bracelet_orders`, `server/lib/braceletOrders.ts` |
| S23 | **`getReadingBody(offer, buyer)` seam** — MVP returns a static template + `%FIRSTNAME%`; later posts to an n8n webhook. Build the seam in Phase 1 or pay for it twice | ⚙️ | the one bit of Phase-2 thinking worth doing now |
| S24 | `be_orders.reading_body` column — store what was actually sent | ✅ | column exists (with `reading_url` + `delivered_at`); nothing writes it until Phase B produces a product |
| S34 | **Product build pipeline** — `scripts/build-be-product.mjs` | ✅ | assembles the spec into a document: strips scaffolding, inlines the gift, places the cards, breaks pages, runs pandoc. ⛔ Refuses to emit a surviving `%TOKEN%` or `[IMG-…]`. A new offer is a config row |
| S35 | **The deck's page design** — `assets/be-reference.docx` | ✅ | US Letter · 1in · Georgia 12/1.4 · page number · headings keep with their card. Built once by `make-be-reference-docx.mjs`; ⛔ meant to be hand-adjusted in Word, so never regenerate it |
| S36 | **The mechanism, drawn** *(D12)* — one image per offer, generated from the same position table as the copy | ◐ | 02's chart wheel ✅ (`make-zodiac-spread.mjs`, and it is 02's cover) · 04's cup ✅ (`make-tea-cup.mjs`) · 03 and 05 still to decide. ⛔ Drawn, never scraped — a paid product needs provenance. ⛔ Never show paid positions pre-purchase |
| S25 | *(Phase 2)* n8n workflow: query Supabase by email → prompt → Claude → return body | ⚙️ | greenfield, no n8n in repo today |
| S26 | *(Phase 2)* Read-only Supabase role scoped to the personalisation columns | ⚙️ | not the app connection string |
| S27 | *(Phase 2)* Fallback + data-quality gate — thin `concern` → static | ⚙️ | a paid product must never fail to arrive |
| S28 | **Echo slots** — 3 per product (1 verbatim + 1 paraphrase + 1 name), merged from V1 Supabase data. NOT the n8n generator; a lookup + merge | ⚙️ | the single highest-confidence finding of the 10-lens run |
| S29 | **Intake queue** — 5 fields, ~3min/order, pre-filled from Supabase. No LLM | ⚙️ | 00e §10 |
| S30 | **Alarm triage** — keyword pre-screen that marks only; 3 blocking tiers + protective variant | ⚙️ | must exist before the first order |
| S31 | **30-day TTL + real delete cron** on third-party intake; strip attachments on receipt | ⚙️ | 00e §10 |
| S32 | Mid-SLA "work has begun" email — never let the SLA pass silently | 🔨 | "product not received" is the dispute code you lose |
| S33 | Hosted mirror page at a tokenised URL — clone `soulmateLanderSessions.intakeToken` | ⚙️ | backup, never a gate |

**Decided:** inbound runs on **Resend**, not Gmail — already installed (`resend@^6.9.2`), already
sending as `evelyn@theseerwithin.com`, and its catch-all covers any address on a domain whose MX
we point. Subdomain `reply.theseerwithin.com` so the root domain's mail is untouched.

---

## 02 — Twin Flame Tarot  *(the cheap one: product already written)*

### E — Email
| ID | Asset | Status |
|---|---|---|
| 02-E1 | Subject-line bank — ✅ **drafted**, 8 for v1 + 6 for v2 + nudges, our emoji/name-first format ([copy](../copy/02/02-E1-subject-lines.md)) | ✅ review |
| 02-E2 | ESL v1 copy — 3 free cards: World / Lovers / Tower — ✅ **drafted** ([copy](../copy/02/02-E2-esl-v1.md)) | ✅ review |
| 02-E3 | ESL v2 copy — 3 more: Star / Emperor / Moon — ✅ **drafted** ([copy](../copy/02/02-E3-esl-v2.md)) | ✅ review |
| 02-E4 | Email HTML ×2, AWeber-safe, mobile + dark. **Watch Gmail's ~102KB clip — v1 is long** | 🔨 |
| 02-E5 | 8 hosted images: hero spread, 6 free cards, case photo | 🔨 |
| 02-E6 | Abandon nudges +1h / +24h — ✅ **drafted**, +24h has A/B variants per letter ([copy](../copy/02/02-E6-abandon-nudges.md)) | ✅ review |

### C — Checkout
| ID | Asset | Status |
|---|---|---|
| 02-C1 | Booking page copy: 6 commitment checkboxes, price in the last, free-gift para | ✏️ |
| 02-C2 | Booking page config entry | ⚙️ |
| 02-C3 | Order bump copy ("Remove Negative KARMA") | ✏️ |
| 02-C4 | **Order bump deliverable — copy exists, product does not** | 🔨 |
| 02-C5 | Stripe prices: $35 + $12.77 bump | ⚙️ |
| 02-C6 | ~~Pre-checked bump?~~ — ✅ **DECIDED: ships UNCHECKED, opt-in** (operator, 2026-08-04). A pre-selected paid add-on is a negative option under the FTC rule and card-network rules; this deck already runs PWYW and hex-adjacent products that attract processor scrutiny. `02-C3` copy already reads as an opt-in — no change | ✅ |

### P — Product
| ID | Asset | Status |
|---|---|---|
| 02-P1 | The 12-card Zodiac Spread copy (`02:501-786`) — **static for MVP**, same 12 cards every buyer | ✏️ |
| 02-P2 | 12 Major Arcana card images — **7 already on S3**; 5 remain, one command each: `host-card.cjs <slug>` | ⚙️ ~10min |
| 02-P3 | Free gift — ✅ **decided: the 28-day attention ledger.** Rewrite, never transcribe: the source's gambling instructions (`02:791`, `799-807`) are the Duval pattern. Keeps the four 7-night cycles + the weeks 1–2 / 4 love window; *play four games* → *record one line a night* | 🔨 |
| 02-P4 | Product delivery email HTML | 🔨 |
| 02-P5 | SLA **24 hours** — decided; overrides the source's contradictory 8h/16h | ✅ |

### T — Post-purchase
| ID | Asset | Status |
|---|---|---|
| 02-T1 | Thank-you page copy | ✏️ |
| 02-T2 | Thank-you route | ⚙️ |
| 02-T3 | Confirmation email + donkey parable | ✏️ |

### U — Upsell  *(adapt V1's proven copy; middle sections reuse verbatim)*
| ID | Asset | Status |
|---|---|---|
| 02-U1a | U1 opening beats — rewrite CONFIRMATION/GAP/RISK off the **Tower card's warning** rather than "your Energy Clearing Ritual" | ✏️ |
| 02-U1b | U1 bucket block (love / money / purpose / someone) | ✏️ |
| 02-U2a | U2 PATH_A / PATH_B opens — "the reading told you what's coming; it doesn't call it toward you" | ✏️ |

### O — Ops
| ID | Asset | Status |
|---|---|---|
| 02-O1 | Automation: trigger `twinflametarot`, delays, branches | ⚙️ |
| 02-O2 | Tags + custom fields | ⚙️ |

---

## 03 — Judgement Day  *(letter only — everything else from scratch)* ⛔ hex go/no-go

### E — Email
| ID | Asset | Status |
|---|---|---|
| 03-E1 | Subject lines — **only 2 exist, need 5+** | 🔨 |
| 03-E2 | ESL copy (aura → **the open account** → 3 case stories → scarcity). ⚠ mechanism rebuilt off Vodou 2026-08-04 — see [00a §03](./00a-BRIEFS-BEs.md). PWYW moved to the booking page | ✏️ |
| 03-E3 | Email HTML | 🔨 |
| 03-E4 | Images — **source has none**, needs art direction | 🔨 |
| 03-E5 | Abandon nudges | 🔨 |

### C — Checkout
| ID | Asset | Status |
|---|---|---|
| 03-C1 | Booking page copy — PWYW with $300 → $250 → "whatever you can afford" collapse | 🔨 |
| 03-C2 | Booking page config entry | ⚙️ |
| 03-C5 | Stripe PWYW price + clamp | ⚙️ |

### P — Product
| ID | Asset | Status |
|---|---|---|
| 03-P1 | **"The Record of Judgement"** — 11-section brief in [00e §10](./00e-FRAMEWORK-BEs.md). Report + forward ledger; 3 spirits = 3 verdicts | 🔨 |
| 03-P4 | Delivery email HTML | 🔨 |
| 03-P5 | SLA **3 days** — decided; source said 2–5 days | ✅ |
| 03-P6 | Intake handling — P.S. asks them to reply with the target's name + what they did. Uses S15/S16 | 🔨 |
| 03-P7 | Capacity cap ("limited number of hexes") | ⚙️ S8 |

### T — Post-purchase
| ID | Asset | Status |
|---|---|---|
| 03-T1 | Thank-you page | 🔨 |
| 03-T3 | Confirmation email | 🔨 |

### U — Upsell  *(U1 is the strongest fit in the deck)*
| ID | Asset | Status |
|---|---|---|
| 03-U1a | U1 opening beats — ⚠ **karmic backlash is retired** with the Vodou reframe (nothing is struck, so nothing strikes back). New hinge: closing the account settles what was owed and does not repair **what carrying it cost her** | ✏️ |
| 03-U1b | U1 bucket block | ✏️ |
| 03-U2a | U2 opens — weak fit here; consider skipping U2 after 03 | ✏️ |

### O — Ops
| ID | Asset | Status |
|---|---|---|
| 03-O1 | Automation | ⚙️ |
| 03-O3 | Route `money`/`purpose` buckets here — Josephine's story is a *business* rival, Elisabetta's a *family* one | ⚙️ |

---

## 04 — Tea Reading  *(letter only + the entire ladder)*

### E — Email
| ID | Asset | Status |
|---|---|---|
| 04-E1 | Subject lines — **only 1 exists, need 5+** | 🔨 |
| 04-E2 | ESL copy — 7 symbols. Structural rule from its brain dump: *"reveal half and tease"* | ✏️ |
| 04-E3 | Email HTML | 🔨 |
| 04-E4 | Images — the **letter's** set. 🔴 The cup diagram is NOT one of them: it shows the paid positions, so it is a product asset only. The source photo (`docs/media/04-tea-reading/image1.jpg`) is the swipe's art and shows nothing legible | 🔨 |
| 04-P2 | **The cup, drawn** *(D12)* — `assets/04-the-cup.png`, from `04-P1`'s "Where your seven landed" table. Handle = her, angle = how near/soon, radius = rim → wall → base | ✅ |
| 04-E5a | **Ladder email day 2 ($47)** | 🔨 |
| 04-E5b | **Ladder email day 3 ($57)** | 🔨 |
| 04-E5c | **Ladder email day 4 ($67, last call)** | 🔨 |
| 04-E6 | Abandon nudges | 🔨 |

### C — Checkout
| ID | Asset | Status |
|---|---|---|
| 04-C1 | Booking page copy | 🔨 |
| 04-C2 | Booking page config entry | ⚙️ |
| 04-C3 | Order bump copy — **The Still Cup** (§4a) | 🔨 |
| 04-C4 | Order bump deliverable — the nightly rite | 🔨 |
| 04-C5 | Stripe prices ×4 rungs | ⚙️ |
| 04-C7 | Ladder resolver wiring | ⚙️ S9 |

### P — Product
| ID | Asset | Status |
|---|---|---|
| 04-P1 | **"The Turn"** — position not symbols; same 7 leaves re-placed into a 21-day sequence. Brief in [00e §10](./00e-FRAMEWORK-BEs.md) | 🔨 |
| 04-P3 | Free gift — **the rim calendar**. Added 2026-08-04: 04 had no free gift specced, which left §6c unsatisfied and made the +24h nudge reach for the *paid* bump. 21 days on one page, quiet/speaking weeks marked, meant to be pinned up | 🔨 |
| 04-P4 | Delivery email HTML | 🔨 |
| 04-P5 | SLA **24 hours** — decided; source stated none | ✅ |

### T — Post-purchase
| ID | Asset | Status |
|---|---|---|
| 04-T1 | Thank-you page | 🔨 |
| 04-T3 | Confirmation email | 🔨 |

### U — Upsell  *(U2 is the strong one here)*
| ID | Asset | Status |
|---|---|---|
| 04-U1a | U1 opening beats — weak fit; consider skipping U1 after 04 | ✏️ |
| 04-U2a | U2 opens — **the reading tells you what to say; the bracelet draws him back** | ✏️ |
| 04-U2b | U2 stone-selection tie-in to the tea symbols (bridge / lighthouse / butterfly) | ✏️ |

### O — Ops
| ID | Asset | Status |
|---|---|---|
| 04-O1 | Automation + ladder-day field | ⚙️ |

---

## 05 — Cut the Cord  *(letter only, and its hook is broken for us)* ✅ cleared to write

### E — Email
| ID | Asset | Status |
|---|---|---|
| 05-E1 | Subject lines — **zero exist** | 🔨 |
| 05-E2 | ESL copy | ✏️ |
| 05-E2b | ⚠ **Rewrite the hook** — it references a "Commitment Charm" we don't sell. Rename ✅ done: the offer is **Cut the Cord** | 🔨 |
| 05-E3 | Email HTML | 🔨 |
| 05-E4 | Images — 3 Grand Etteilla cards (Love & Marriage, Wheel of Fate, Card of Misery) | 🔨 |
| 05-E5 | Abandon nudges | 🔨 |

### C — Checkout
| ID | Asset | Status |
|---|---|---|
| 05-C1 | Booking page copy — PWYW ($67 reference) | 🔨 |
| 05-C2 | Booking page config entry | ⚙️ |
| 05-C5 | Stripe PWYW (shares S5b with 03) | ⚙️ |

### P — Product
| ID | Asset | Status |
|---|---|---|
| 05-P1 | **The cord report** — 10-section brief in [00e §10](./00e-FRAMEWORK-BEs.md). Object is the cord, not the woman | 🔨 |
| 05-P4 | Delivery email HTML | 🔨 |
| 05-P5 | SLA **24 hours** — decided; source said 14 hours | ✅ |
| 05-P6 | Intake handling — reply with details of the other woman. Uses S15/S16 | 🔨 |
| 05-P7 | ⚠ **Capacity cap that really disables the link** — "if the link doesn't work it means I've been fully booked" is a promise, not copy | ⚙️ S8 |

### T — Post-purchase
| ID | Asset | Status |
|---|---|---|
| 05-T1 | Thank-you page | 🔨 |
| 05-T3 | Confirmation email | 🔨 |

### U — Upsell
| ID | Asset | Status |
|---|---|---|
| 05-U1a | U1 opening beats — protection while the rival is being removed | ✏️ |
| 05-U1b | U1 bucket block | ✏️ |
| 05-U2a | U2 opens — **she's gone; now call him toward you** | ✏️ |

### O — Ops
| ID | Asset | Status |
|---|---|---|
| 05-O1 | Automation | ⚙️ |

---

## Decisions embedded above (❓)

| ID | Question |
|---|---|
| ~~02-C6~~ | ~~Pre-check the order bump?~~ — ✅ decided: **unchecked** (2026-08-04) |
| 02-C4 | What *is* the karma-cleanse bump deliverable? Written in 02's group D, ships with group A |
| ~~⛔~~ | ~~Hex go/no-go~~ — ✅ **GO on both**, 03 first, 05 as *Cut the Cord* (2026-08-03) |
| S21 | Shared upsell pool with suppression, or mint 8 offer-specific SKUs? (rec: shared pool) |

## Suggested first slice

**02-E1 → 02-E5** (the letter, ready to send) and **02-P1 → 02-P4** (the product, ready to
deliver) are both pure copy work with the source in hand, and neither needs a line of code or
any of the open decisions. That's a complete sellable offer's worth of content before we touch
Stripe.

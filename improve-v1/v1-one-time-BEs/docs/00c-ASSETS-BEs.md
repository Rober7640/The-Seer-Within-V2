# 00c — ASSET REGISTER: the to-do list

Every asset the deck needs, per offer, with a stable ID so we can say "build 02-P2" and both
know what that means. Companion to [00-FLOW-BEs.md](./00-FLOW-BEs.md) (what the funnel does)
and [00b-BUILD-BEs.md](./00b-BUILD-BEs.md) (why).

**Status key**

| | Meaning |
|---|---|
| ✏️ | Source has it — transcribe + recast to Evelyn's voice |
| 🔨 | Write from scratch (no source) |
| ⚙️ | Code |
| ❓ | Decision needed before it can be built |
| ⛔ | Blocked on a go/no-go |

**Asset classes** (same five for every offer, so IDs are predictable)
`E` email · `C` checkout · `P` product · `T` post-purchase · `O` ops

---

## Shape of the work

| Offer | ✏️ recast | 🔨 from scratch | ⚙️ code | Total |
|---|---|---|---|---|
| 02 Twin Flame | 8 | 7 | 6 | 21 |
| 03 Judgement Day | 1 | 9 | 5 | 15 |
| 04 Tea Reading | 1 | 12 | 6 | 19 |
| 05 Hex Her | 1 | 11 | 5 | 17 |
| **Shared** | — | 3 | 18 | 21 |

02 is the cheap one and the only one whose product exists. Everything after it is mostly
writing, not coding.

---

## S — Shared plumbing (build once, all four use it)

| ID | Asset | Status | Notes |
|---|---|---|---|
| S1 | Offer registry `server/lib/backendOffers/config.ts` | ⚙️ | price model, copy keys, bump, gate, SLA per offer |
| S2 | Booking page component `client/src/pages/backend-offers/BookingPage.tsx` | ⚙️ | config-driven, one page not four. Clone `SoulmateSalesPage.tsx` |
| S3 | Subscriber identification on click | ⚙️ | reuse Soulmate hydration (`shared/schema.ts:1305-1310`). No raw email in URLs |
| S4 | `be_orders` table + webhook handler | ⚙️ | mirror `soulmate_orders` |
| S5a | Checkout mode: fixed + bump | ⚙️ | 02 |
| S5b | Checkout mode: PWYW + clamp | ⚙️ | 03, 05 |
| S5c | Checkout mode: ladder | ⚙️ | 04 |
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

**Decided:** inbound runs on **Resend**, not Gmail — already installed (`resend@^6.9.2`), already
sending as `evelyn@theseerwithin.com`, and its catch-all covers any address on a domain whose MX
we point. Subdomain `reply.theseerwithin.com` so the root domain's mail is untouched.

---

## 02 — Twin Flame Tarot  *(the cheap one: product already written)*

### E — Email
| ID | Asset | Status |
|---|---|---|
| 02-E1 | Subject-line bank (7 exist) | ✏️ |
| 02-E2 | ESL v1 copy — 3 free cards: World / Lovers / Tower | ✏️ |
| 02-E3 | ESL v2 copy — 3 more: Star / Emperor / Moon | ✏️ |
| 02-E4 | Email HTML ×2, AWeber-safe, mobile + dark. **Watch Gmail's ~102KB clip — v1 is long** | 🔨 |
| 02-E5 | 8 hosted images: hero spread, 6 free cards, case photo | 🔨 |
| 02-E6 | Abandon nudges +1h / +24h | 🔨 |

### C — Checkout
| ID | Asset | Status |
|---|---|---|
| 02-C1 | Booking page copy: 6 commitment checkboxes, price in the last, free-gift para | ✏️ |
| 02-C2 | Booking page config entry | ⚙️ |
| 02-C3 | Order bump copy ("Remove Negative KARMA") | ✏️ |
| 02-C4 | **Order bump deliverable — copy exists, product does not** | 🔨 |
| 02-C5 | Stripe prices: $35 + $12.77 bump | ⚙️ |
| 02-C6 | Pre-checked bump? (negative-option exposure) | ❓ |

### P — Product
| ID | Asset | Status |
|---|---|---|
| 02-P1 | The 12-card Zodiac Spread copy (`02:501-786`) | ✏️ |
| 02-P2 | 12 Major Arcana card images | 🔨 |
| 02-P3 | Free personal horoscope (`02:787-815`) — no birth data needed | ✏️ |
| 02-P4 | Product delivery email HTML | 🔨 |
| 02-P5 | **SLA: source says both 8h and 16h. Pick one** | ❓ |

### T — Post-purchase
| ID | Asset | Status |
|---|---|---|
| 02-T1 | Thank-you page copy | ✏️ |
| 02-T2 | Thank-you route | ⚙️ |
| 02-T3 | Confirmation email + donkey parable | ✏️ |

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
| 03-E2 | ESL copy (aura → hex → 3 case stories → PWYW → scarcity) | ✏️ |
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
| 03-P1 | **The delivered hex — does not exist.** Only template is 02's structured reading | 🔨 |
| 03-P4 | Delivery email HTML | 🔨 |
| 03-P5 | SLA: 2–5 days (stated) | ✅ |
| 03-P6 | Intake handling — P.S. asks them to reply with the target's name + what they did. Uses S15/S16 | 🔨 |
| 03-P7 | Capacity cap ("limited number of hexes") | ⚙️ S8 |

### T — Post-purchase
| ID | Asset | Status |
|---|---|---|
| 03-T1 | Thank-you page | 🔨 |
| 03-T3 | Confirmation email | 🔨 |

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
| 04-E4 | Images — 1 exists (tea cup), need more | 🔨 |
| 04-E5a | **Ladder email day 2 ($47)** | 🔨 |
| 04-E5b | **Ladder email day 3 ($57)** | 🔨 |
| 04-E5c | **Ladder email day 4 ($67, last call)** | 🔨 |
| 04-E6 | Abandon nudges | 🔨 |

### C — Checkout
| ID | Asset | Status |
|---|---|---|
| 04-C1 | Booking page copy | 🔨 |
| 04-C2 | Booking page config entry | ⚙️ |
| 04-C5 | Stripe prices ×4 rungs | ⚙️ |
| 04-C7 | Ladder resolver wiring | ⚙️ S9 |

### P — Product
| ID | Asset | Status |
|---|---|---|
| 04-P1 | **The full tea reading — does not exist.** Letter gives 7 symbols free; define what paid adds | 🔨 |
| 04-P4 | Delivery email HTML | 🔨 |
| 04-P5 | **SLA — none stated anywhere. Pick one** | ❓ |

### T — Post-purchase
| ID | Asset | Status |
|---|---|---|
| 04-T1 | Thank-you page | 🔨 |
| 04-T3 | Confirmation email | 🔨 |

### O — Ops
| ID | Asset | Status |
|---|---|---|
| 04-O1 | Automation + ladder-day field | ⚙️ |

---

## 05 — Hex Her  *(letter only, and its hook is broken for us)* ⛔ hex go/no-go

### E — Email
| ID | Asset | Status |
|---|---|---|
| 05-E1 | Subject lines — **zero exist** | 🔨 |
| 05-E2 | ESL copy | ✏️ |
| 05-E2b | ⚠ **Rewrite the opening hook** — it references "the Commitment Charm", an offer we don't sell | 🔨 |
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
| 05-P1 | **The delivered hex — does not exist** | 🔨 |
| 05-P4 | Delivery email HTML | 🔨 |
| 05-P5 | SLA: 14 hours (stated) | ✅ |
| 05-P6 | Intake handling — reply with details of the other woman. Uses S15/S16 | 🔨 |
| 05-P7 | ⚠ **Capacity cap that really disables the link** — "if the link doesn't work it means I've been fully booked" is a promise, not copy | ⚙️ S8 |

### T — Post-purchase
| ID | Asset | Status |
|---|---|---|
| 05-T1 | Thank-you page | 🔨 |
| 05-T3 | Confirmation email | 🔨 |

### O — Ops
| ID | Asset | Status |
|---|---|---|
| 05-O1 | Automation | ⚙️ |

---

## Decisions embedded above (❓)

| ID | Question |
|---|---|
| 02-C6 | Pre-check the order bump? |
| 02-P5 | 8-hour or 16-hour SLA? |
| 04-P5 | What SLA for the tea reading? |
| 02-C4 | What *is* the karma-cleanse bump deliverable? |
| ⛔ | Hex go/no-go — gates all of 03 and 05 |

## Suggested first slice

**02-E1 → 02-E5** (the letter, ready to send) and **02-P1 → 02-P4** (the product, ready to
deliver) are both pure copy work with the source in hand, and neither needs a line of code or
any of the open decisions. That's a complete sellable offer's worth of content before we touch
Stripe.

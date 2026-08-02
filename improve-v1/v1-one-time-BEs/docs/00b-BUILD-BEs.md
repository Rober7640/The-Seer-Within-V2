# 00b — BUILD: everything each offer needs

Companion to [00-FLOW-BEs.md](./00-FLOW-BEs.md). That doc is *what the funnel does*; this is
*what has to be made*. Scope map, not a code plan — TDD implementation plans get written per
subsystem once the blockers at the bottom clear.

Deck (locked): **02 Twin Flame Tarot → 03 Judgement Day → 04 Tea Reading → 05 Hex Her**,
$35 floor, women-only for v1.

---

## 0. The single most important fact about the source material

**02 is a complete package. 03, 04 and 05 are just letters.**

Its filename says so — "TSL **Package**". 02 runs 833 lines and contains the entire funnel
including the delivered product. The other three are 89–187 lines and contain an email, a
couple of subject lines, and a pricing note. Nothing else.

| Asset | 02 Twin Flame | 03 Judgement | 04 Tea | 05 Hex Her |
|---|---|---|---|---|
| ESL email | ✅ ×2 versions | ✅ | ✅ | ✅ |
| Subject lines | ✅ 7 | ⚠ 2 | ⚠ 1 | ❌ 0 |
| Booking / checkout page | ✅ | ❌ | ❌ | ❌ |
| Order bump | ✅ | ❌ | ❌ | ❌ |
| Thank-you page | ✅ | ❌ | ❌ | ❌ |
| Confirmation email | ✅ (+parable) | ❌ | ❌ | ❌ |
| **The delivered product** | ✅ 12 cards | ❌ | ❌ | ❌ |
| Free gift | ✅ horoscope | ❌ | ❌ | ❌ |
| Automation trigger | ✅ `tag: twinflametarot` | ❌ | ❌ | ❌ |
| Stated SLA | 8h **and** 16h ⚠ | 2–5 days | ❌ none | 14 hours |
| Fulfilment needs a reply | no | **yes** | no | **yes** |

So the work is wildly asymmetric. 02 is transcription plus a voice recast. 03/04/05 each need a
booking page, thank-you page, confirmation email and a whole product written from nothing —
modelled on 02, which is the only worked example we have of any of them.

## 0b. What the product actually is (corrected)

The **email gives 3 cards free. The paid product is 12.** Never 3.

- v1 email: World, Lovers, Tower (free) · v2 email: Star, Emperor, Moon (free)
- Paid: **"The Zodiac Spread"** — 12 Major Arcana, explicitly *"12 **new** cards"*, so the free
  three are not part of it
- Delivered as one email, `02:501-829`: intro → spread framing → 12 cards ×~15 lines each
  (Temperance, Magician, Strength, Hierophant, Wheel of Fortune, Devil, Justice, Hanged Man,
  Chariot, Judgment, High Priestess, Death) → **PERSONAL HOROSCOPE** → conclusion

**It is static.** Same 12 cards, same order, every buyer. The only variable is `%FIRSTNAME%`.
"Divinely crafted just for you" is framing. Two consequences:

1. **No generator is needed to ship.** I previously scoped the product as the largest unbuilt
   piece. It isn't — for 02 it's written. Personalisation is an upgrade, not a prerequisite.
2. **That upgrade is our actual edge.** We hold `concern`, `personName`, `bucket`,
   `deeperResponse`, `emotionalResponse` and the full transcript from the V1 funnel. We can make
   genuinely personal what the source only claimed was personal — with no extra ask of the buyer.

The **free horoscope needs no birth date** (`02:787-815` is generic astral-timing advice with no
natal input). The birth-data blocker I raised is withdrawn.

---

## 1. Per-offer checklist

### 02 Twin Flame Tarot — mostly transcription

- [ ] Recast both ESL versions Madame Delacroix → Evelyn Cross (voice, not name-swap)
- [ ] Email HTML ×2, AWeber-safe tables, mobile + dark mode. **Gmail clips at ~102KB — v1 is long**
- [ ] Host 8 images (hero, 6 cards, case photo) + alt text
- [ ] Booking page: 6 commitment checkboxes, price in the last one, free-gift paragraph, bump
- [ ] Thank-you page
- [ ] Confirmation email + the donkey parable
- [ ] **Resolve the SLA contradiction: booking page says 16 hours, confirmation email says 8**
- [ ] The 12-card product email (transcribe + recast) + 12 card images
- [ ] Horoscope section (bundled inside the product email, not sent separately)
- [ ] Bump product "Remove Negative KARMA" — **copy exists, deliverable does not**

### 03 Judgement Day — letter only, everything else from scratch

- [ ] Recast ESL
- [ ] Subject lines: only 2 exist, need 5+
- [ ] **Booking page from scratch** — PWYW with the $300 → $250 → "whatever you can afford"
      anchor collapse
- [ ] **Thank-you page from scratch**
- [ ] **Confirmation email from scratch**
- [ ] **The product from scratch** — what does a hex delivery actually look like? 02 gives the
      only template: a long, structured, named-component reading
- [ ] Intake handling: P.S. asks them to reply with the target's name and what they did
- [ ] SLA: 2–5 days (stated)
- [ ] ~~Swap a case study to a man~~ — **parked**: women-only for v1, and all three are women already
- [ ] Note: Josephine's story is a *business* rival and Elisabetta's a *family* one — so 03
      genuinely fits `money` and `purpose` buckets, not just love

### 04 Tea Reading — letter only, plus the whole ladder

- [ ] Recast ESL. Structural rule from its brain dump: **"revealing half and teasing"**
- [ ] Subject lines: only 1 exists, need 5+
- [ ] **Ladder emails days 2, 3, 4 — do not exist.** The ladder cannot function without them
- [ ] **Booking page from scratch** — price resolved server-side from ladder day
- [ ] **Thank-you page, confirmation email, product — all from scratch**
- [ ] **No SLA is stated anywhere.** Pick one
- [ ] Define the product: the letter reveals 7 symbols free (bird, broken heart, withering tree,
      storm boat, bridge, lighthouse, butterfly). What does the *paid* full reading add?

### 05 Hex Her — letter only, and its hook is broken for us

- [ ] Recast ESL
- [ ] **Subject lines: zero exist**
- [ ] ⚠ **Opening line references "the Commitment Charm" — an offer we don't have.** The letter
      opens *"If you skipped on the opportunity to get the Commitment Charm…"*. Either rewrite
      the hook or the letter's premise doesn't land
- [ ] **Booking page, thank-you page, confirmation email, product — all from scratch**
- [ ] Intake: P.S. asks them to reply with details of the other woman
- [ ] SLA: 14 hours (stated)
- [ ] ⚠ **"If the link doesn't work it means I've been fully booked"** — this is a real feature,
      not copy. It needs a capacity cap that actually disables the link, or the line is a lie
- [ ] 3 Grand Etteilla cards (Love & Marriage, Wheel of Fate, Card of Misery) + Etteilla/Thoth
      lore need art and fact-checking

---

## 2. Shared build (once, serves all four)

### Web & code

- [ ] One config-driven booking page — `client/src/pages/backend-offers/BookingPage.tsx`
- [ ] Offer registry — `server/lib/backendOffers/config.ts` (price model, copy keys, bump, gate, SLA)
- [ ] Subscriber identification on click — **reuse the Soulmate hydration mechanism**
      (`shared/schema.ts:1305-1310`); never put a raw email in a URL
- [ ] Three checkout modes: fixed+bump · PWYW with min/max clamp · ladder
- [ ] Stripe products/prices ×4 + bump
- [ ] Webhook → `be_orders` row → fulfilment trigger → ESP tag
- [ ] Thank-you routes
- [ ] Ladder state table + server-side resolver (04)
- [ ] **Capacity cap + link deactivation** (05 needs it; 03's "limited number of hexes" implies it)
- [ ] Segmentation gate — target pronoun + bucket (Diagram G). Without it "women-only" isn't real
- [ ] Idempotency, already-purchased guard, double-charge protection
- [ ] **Inbound email pipeline** — see below

**Clone, don't invent:** `SoulmateSalesPage.tsx`, `SoulmateThankYouPage.tsx`,
`POST /api/soulmate/checkout` (`server/routes.ts:3110`), `soulmate_orders`.

### Inbound email — DECIDED: Resend, not Gmail

03 and 05 cannot be fulfilled without a reply, so this is plumbing, not polish. We already have
the provider: `resend@^6.9.2` is installed, personas send from `evelyn@theseerwithin.com`
(`shared/schema.ts:138`), and every generator already sets `replyTo`
(e.g. `evelynPostPurchaseDripGenerator.ts:714`).

```
  send:    Reply-To: ord_a1b2c3@reply.theseerwithin.com   ← unique per order
                                    │
  buyer hits reply ─────────────────┘
                                    ▼
  MX on reply.theseerwithin.com → Resend catch-all
                                    ▼
  POST /api/inbound/resend   (metadata only — body NOT included)
                                    ▼
  fetch body via Received Emails API → be_replies row, keyed by the `to` address
```

- **A catch-all on a subdomain we control** is the requirement. Resend receives any address on a
  domain once its MX record points there — no per-address setup. Subdomain keeps the root
  domain's existing mail untouched.
- **Per-order Reply-To is the whole trick.** The reply identifies its own order from the address.
  No body parsing, no matching on sender — which matters, because people reply from a different
  address than they bought with more often than you'd expect.
- **Not Gmail:** Workspace can do catch-all and plus-addressing, but piping replies into code
  means Gmail API + Pub/Sub watch renewals + OAuth upkeep — more moving parts, same result — and
  a second sending identity to align on an already-authenticated domain.
- **Not the MCP as production.** Resend's MCP server lets an agent read inbound mail, which is
  useful for us working through intake by hand. It won't survive a headless or cron run. Webhook
  → DB is the plumbing; the MCP is a window onto it.
- Guardrails: filter auto-submitted mail (bounces/OOO) or auto-replies create loops; draft-then-
  human-approve, never auto-send, because these replies name a real third party; and write the
  third-party PII retention policy **before** the first intake arrives.
- Upside worth noting: replies are one of the strongest positive signals to inbox providers.
  Given the list's opens have halved, keeping intake as a *reply* rather than a form has a
  deliverability benefit that partly offsets the messier data.

### Delivery sequence — four assets per offer, not two

```
  purchase → THANK-YOU PAGE → CONFIRMATION EMAIL → [wait out the SLA] → THE PRODUCT
                              (02's carries a parable;
                               pure engagement filler,
                               sells nothing)
```

### ESP & automation

- [ ] Tags + custom fields (bought / saw / held / ladder-day). 02 shows the pattern: `twinflametarot`
- [ ] One automation per offer: trigger, delays, branches
- [ ] Suppression rules from Diagram F, implemented not just documented
- [ ] Send-time segmentation filter
- [ ] Deliverability plan — this lands on the ~59k list whose opens already halved (~38%→~19%)

### Measurement

- [ ] Per-CTA click tracking — 02 has 6 links; which one converts writes the next letter
- [ ] FB CAPI + pixel events
- [ ] Funnel per offer: open → click → booking view → checkout start → purchase → bump take-rate
- [ ] Ladder rung performance (04)
- [ ] Reply rate — Lesson 1's real KPI, and the one nobody instruments

### Legal, compliance, risk

- [ ] **Go/no-go on hex framing (03/05)** — blocks the offer that ships *second*
- [ ] Entertainment-purposes disclaimer
- [ ] Refund policy for a service with a multi-day SLA
- [ ] CAN-SPAM footer, unsubscribe, sender identity
- [ ] Pre-checked bump decision (negative-option exposure)
- [ ] Stripe descriptor + dispute exposure on PWYW and hex products
- [ ] Chargeback path — PWYW is harder to defend with no fixed price

### QA before any send

- [ ] Render: mobile, desktop, dark mode, Gmail clipping
- [ ] Live test purchase per price model
- [ ] Link audit, all CTAs, all offers
- [ ] Segmentation dry-run — print who *would* receive what, before anyone does

---

## 3. Build order

```
  PHASE 1  02 end to end — email → booking → bump → Stripe → thank-you →
           confirmation → 12-card product
           └─ the product is already written; this is the fastest path to revenue

  PHASE 2  03 + 05 (one PWYW component covers both) + capacity cap
           └─ BLOCKED: hex go/no-go, 05's Commitment Charm hook, two products to write

  PHASE 3  04 last — ladder state is the most code AND three unwritten emails

  LATER    personalised generator using V1 funnel data — the upgrade that beats the source
```

## 4. Blockers

1. **Hex go/no-go (03/05).** Judgement Day is offer 2 of 4. Half the deck waits on this.
2. **Three products don't exist.** 03, 04 and 05 have no deliverable written — only 02 does.
   This is the real bulk of the remaining work.
3. **Bump product.** "Remove Negative KARMA" is copy with nothing behind it.
4. **05's hook references an offer we don't sell** ("the Commitment Charm").
5. **SLA contradiction in 02** (8h vs 16h) and **no SLA at all in 04**.
6. ~~Free gift needs a birth date~~ — **withdrawn**, the horoscope needs no natal input.

### On support capacity — revised

I previously flagged this as a launch-day blocker. The source is smarter than that. 03's P.P.S.
says outright: *"I get an extraordinary amount of emails per day now. Sometimes up to 100-200.
Rest assured that once you place your donation it will be done. I simply do not have the time to
answer every single email."*

So the pattern is **reply-as-intake, not reply-as-conversation.** The reply is required to
fulfil, and is explicitly not promised an answer. Someone must *read* intake replies for 03 and
05; nobody has to converse. That is a much smaller commitment than Lesson 1 implies, and the
disclaimer is doing the load-bearing work. Worth copying deliberately.

The pipeline for it is decided (Resend inbound, above). What remains is a human question, not a
technical one: **who reads intake, and how fast**, given 03 promises 2–5 days and 05 promises 14
hours. The SLA is the commitment, not the reply.

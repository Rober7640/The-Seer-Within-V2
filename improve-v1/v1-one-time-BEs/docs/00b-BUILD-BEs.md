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
"Divinely crafted just for you" is framing.

### ✅ DECIDED — MVP ships STATIC. Generator comes later, on n8n.

**MVP = fixed.** Every buyer gets the same 12 cards in the same order, `%FIRSTNAME%` merged.
No generation, no AI call, no per-buyer variance. Prove the funnel sells first.

**After it's proven → build the generator on n8n**, personalised from the V1 funnel data we
already hold (`concern`, `personName`, `bucket`, `deeperResponse`, `emotionalResponse`, full
transcript). That is the upgrade that beats the source, which only *claimed* personalisation.

What this decision buys us:

- The single largest scope item is deleted from v1. 02 becomes transcription, not engineering.
- Delivery is a templated send with one merge field. No queue, no generation latency, no
  failure mode where a buyer pays and the AI errors.
- The SLA becomes a **scheduled send**, not processing time — which is what it always was.

⚠ **Build the seam now, or pay for it twice.** Delivery must read the product body from a
"reading provider" behind one interface:

```
  fulfilment ──► getReadingBody(offer, buyer)
                      │
       MVP ───────────┤  static template + %FIRSTNAME%
       LATER ─────────┘  POST to n8n webhook → Claude → generated body
```

If fulfilment calls a template directly, swapping in n8n later is a rewrite. If it calls
`getReadingBody()`, it's a config change. This is the one piece of Phase-2 thinking worth doing
in Phase 1.

⚠ **Static has one real risk:** two buyers who compare notes get identical "divinely crafted
just for you" readings. Low probability per buyer, non-zero across thousands, and it is exactly
the argument for the n8n generator once volume justifies it. Not a reason to delay the MVP.

### The n8n generator (Phase 2) — reads Supabase user fields

n8n pulls the buyer's own words out of Supabase and generates the reading from them. Nothing
new needs capturing; the V1 funnel already stores it.

**Available on `conversations`, keyed by email:**

| Field | Why it's useful |
|---|---|
| `firstName`, `location`, `timeOfDay` | address + ambient detail |
| `bucket`, `subBucket` | love / money / purpose / someone — sets the whole frame |
| `personName` | the actual name of the person they're asking about |
| `concern` | their presenting problem, **in their own words** |
| `deeperResponse`, `emotionalResponse` | what they admitted when pushed |
| `vision` | what they said they want |
| `blockSource`, `commitmentResponse` | what they believe is stopping them |
| `messages` | the entire transcript |

V2 buyers additionally have `chat_sessions`, `chat_messages`, `user_memory`.

```
  Stripe webhook → be_orders → getReadingBody(offer, buyer)
                                      │
                                      ▼  POST {order_id, email, offer}
                              ┌───────────────────┐
                              │       n8n         │
                              │  1 query Supabase │──► conversations by email
                              │  2 build prompt   │
                              │  3 call Claude    │
                              │  4 return body    │
                              └─────────┬─────────┘
                                        ▼
                            store on be_orders.reading_body
                                        ▼
                              we send it (Resend)
```

**Design rules — each of these is a real failure mode:**

1. **n8n returns the body; we do the sending.** Don't let n8n send. Tracking, suppression and
   deliverability stay in one place.
2. **Always fall back to static.** If n8n errors, times out, or the buyer has no usable
   conversation row, deliver the static reading. A paid product must never fail to arrive.
3. **Gate on data quality, not just presence.** Some buyers abandoned early or typed gibberish.
   If `concern` is empty or near-empty, use static — a "personalised" reading built on nothing
   reads worse than a good generic one.
4. **The email→conversation join is not 1:1.** One person can have several `conversations` rows
   across sessions. Pick deliberately — most recent with `purchased = true` — and write the rule
   down rather than letting n8n take whatever it finds first.
5. **Store the generated body** on the order. Support needs to see what the buyer actually
   received, re-sends must be identical, and a retry must never regenerate a *different* reading.
6. **Idempotency by order id.** n8n retries are normal; double-generation and double-send are not.
7. **Scoped DB credential.** n8n gets a read-only Supabase role limited to the columns above —
   not the app's connection string.

⚠ **PII leaves the building.** `concern` and `deeperResponse` are intimate disclosures about
real relationships, and n8n would read them plus pass them to Claude. Decide before wiring:
n8n Cloud or self-hosted, which Anthropic key, and what retention. This is a bigger deal than
the generator itself.

**No n8n usage exists in this repo today** — this is greenfield.

**Still true regardless:** 03, 04 and 05 have no product written at all. Static doesn't mean
free — it means *write once, send to everyone*.

The **free horoscope needs no birth date** (`02:787-815` is generic astral-timing advice with no
natal input). The birth-data blocker I raised is withdrawn.

---

## 1. Per-offer checklist

> ⚠ **STALE FOR COPY, as of 2026-08-04. Read [00c-ASSETS](./00c-ASSETS-BEs.md) and
> [00g-PENDING](./00g-PENDING.md) instead.**
>
> The checkboxes below still show ~25 copy items as undone that are now **written and passing
> `scripts/copy-check.cjs`** — 02's booking page, bump, thank-you, confirmation, product, horoscope
> rewrite and bump deliverable; 03's entire A–E including the ESL, subjects, booking page,
> thank-you, confirmation, product and intake handling; 04's entire A–E including the three ladder
> emails. **36 copy assets exist across 02, 03 and 04.**
>
> Three things below are also now WRONG rather than merely stale:
> - **03 is no longer a hex.** Its mechanism was rebuilt off Vodou (operator, 2026-08-04) — no
>   Legba, Kalfu or Samedi. See [00a §03](./00a-BRIEFS-BEs.md).
> - **05's *"she will NOT pursue him"* is settled** — it never ships (operator, 2026-08-04).
> - **The pre-checked bump is settled** — it ships unchecked (operator, 2026-08-04).
>
> ⚠ **The code and ops sections further down are no longer accurate either**
> *(2026-08-10/11)*. Stripe **is** built — `be_orders`, `/api/backend/checkout`, the
> `be_*` webhook branch and the `addBackendCustomer` write — and it ships dark behind
> `BACKEND_CHECKOUT_LIVE`. Read the per-offer tick sheets for what is actually done:
> **[`02/0-WORKFLOW-02.md`](./02/0-WORKFLOW-02.md)** and
> [`03/0-WORKFLOW-03.md`](./03/0-WORKFLOW-03.md).
>
> This section is kept for its per-offer *reasoning*, not as a live to-do list.

### 02 Twin Flame Tarot — mostly transcription

- [ ] Recast both ESL versions Madame Delacroix → Evelyn Cross (voice, not name-swap)
- [ ] Email HTML ×2, AWeber-safe tables, mobile + dark mode. **Gmail clips at ~102KB — v1 is long**
- [ ] Host 8 images (hero, 6 cards, case photo) + alt text
- [ ] Booking page: 6 commitment checkboxes, price in the last one, free-gift paragraph, bump
- [ ] Thank-you page
- [ ] Confirmation email + the donkey parable
- [ ] SLA **24h** — update both the booking checkbox (says 16h) and the confirmation email (says 8h)
- [ ] The 12-card product email (transcribe + recast) + 12 card images
- [ ] ⚠ Horoscope **REWRITE, not transcribe** — its gambling instructions are the Duval
      prosecuted pattern. Replace with a 28-day attention ledger (00e §10)
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
- [ ] SLA **3 days** — update the copy (says 2–5 days), incl. the scarcity justification
- [ ] ~~Swap a case study to a man~~ — **parked**: women-only for v1, and all three are women already
- [ ] Note: Josephine's story is a *business* rival and Elisabetta's a *family* one — so 03
      genuinely fits `money` and `purpose` buckets, not just love

### 04 Tea Reading — letter only, plus the whole ladder

- [ ] Recast ESL. Structural rule from its brain dump: **"revealing half and teasing"**
- [ ] Subject lines: only 1 exists, need 5+
- [ ] **Ladder emails days 2, 3, 4 — do not exist.** The ladder cannot function without them
- [ ] **Booking page from scratch** — price resolved server-side from ladder day
- [ ] **Thank-you page, confirmation email, product — all from scratch**
- [ ] SLA **24h** — none was stated in the source; add it to the booking page + confirmation
- [ ] Define the product: the letter reveals 7 symbols free (bird, broken heart, withering tree,
      storm boat, bridge, lighthouse, butterfly). What does the *paid* full reading add?

### 05 Cut the Cord — letter only, and its hook is broken for us

- [ ] Recast ESL. ✅ Named *Cut the Cord*; the source's "Hex Her" survives only as a filename
- [ ] **Subject lines: zero exist**
- [ ] ⚠ **Opening line references "the Commitment Charm" — an offer we don't have.** The letter
      opens *"If you skipped on the opportunity to get the Commitment Charm…"*. Either rewrite
      the hook or the letter's premise doesn't land
- [ ] **Booking page, thank-you page, confirmation email, product — all from scratch**
- [ ] Intake: P.S. asks them to reply with details of the other woman
- [ ] SLA **24h** — update the copy (says 14 hours)
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

## 3. Design system — we already have one

Nothing needs designing from zero. `client/src/index.css` defines Tailwind v4 `@theme` tokens:

```
  bg-deep    hsl(222 47% 11%)   deep navy      primary    hsl(262 83% 58%)  purple
  bg-mid     hsl(214 52% 25%)                  secondary  hsl(46 65% 52%)   gold
  muted      hsl(217 33% 17%)                  border     hsl(217 33% 17%)
  fonts      Inter (sans) · Playfair Display (serif)
  animations twinkle · glow · flicker · pulse-slow/fast · cta-appear · slide-down
             mp-fade-up · mp-section · mp-aura
```

Plus the full shadcn/ui set (~50 components, New York style) and `docs/replit-design-brief.md`.

**One booking page, four offers.** Clone `SoulmateSalesPage.tsx` into a config-driven component
(`S2`) and every offer inherits the look for free.

### ✅ DECIDED — plain direct-response (Treatment B)

Three treatments were rendered and reviewed:
<https://claude.ai/code/artifact/eaac7a74-4a9c-4e4c-aed7-ba042a8c72de>

- **A — branded cosmic**: navy ground, gold hairlines, Playfair headings, starfield hero
- **B — plain direct-response** ← **chosen**: white ground, system sans, red headline, green CTA
- **C — plain + ours**: B's readability with brand accents (built, not chosen; kept as an A/B
  challenger if the treatment is ever revisited)

**B is the build target.** It is also what the source itself ran, so there is precedent behind it.

Locked values for the shared booking page:

```
  ground   #FFFFFF      headline  #B3261E
  ink      #111111      CTA       #16A34A
  bump     #D97706 dashed border on #FFFBEB
  type     Arial / Helvetica stack — no webfont
```

A side benefit of the Arial stack: no font-loading dependency, so the page renders instantly and
can't flash unstyled text on a slow mobile connection.

Because one config-driven component serves all four offers, swapping treatment later is a
stylesheet change rather than a rebuild.

---

## 4. Upsells — reuse V1's U1 and U2

### The spine is portable

V1's two upsells run on a three-beat logic that generalises cleanly:

```
  what they bought  →  REMOVES something    (past)
  U1 Protection     →  PROTECTS the result  (present)   $47 + charged lava stone
  U2 Manifestation  →  ATTRACTS what's next (future)    $47 / $30 + 8-stone bracelet
```

U1's engine: *"Removal is only half the work. For the next 30 days your energy field will be
rebuilding — open, raw, like a wound healing."*
U2's engine: *"Removing a wall isn't the same as opening a door."*

### Fit per offer

| Offer | U1 (protect) | U2 (attract) |
|---|---|---|
| 02 Twin Flame | **Strong** — the Tower card literally warns of an ex returning / a lover pulling away. The reading names the threat; the stone shields it | Good — draw the Twin Flame in |
| 03 Judgement Day | **Strongest** — strike at an enemy and their energy strikes back; karmic backlash needs a ward | Weak |
| 04 Tea Reading | Weak | **Strong** — the reading says what to text, the bracelet draws him back |
| 05 Hex Her | Good — protection while the rival is removed | **Strong** — she's gone, now call him toward you |

### Reuse economics: ~12 of ~60 messages change

Offer-specific (rewrite per offer): `UPSELL_CONFIRMATION`, `UPSELL_GAP`, `UPSELL_RISK` — they
name "your Energy Clearing Ritual" — plus the `UPSELL_BUCKET_MESSAGES` block, and U2's
`PATH_A_OPEN` / `PATH_B_OPEN`.

Offer-agnostic (reuse verbatim): lava-stone lore, the 2–4am ritual detail, the eight stones,
delivery, all three questions and their branches, decline, success, shipping confirmation.

The urgency device ports too. U1/U2 hinge on *"I can only attune the stones while I'm inside
your energy field tonight."* 02's 16-hour SLA gives exactly that window.

### ⚠ You can only sell the stone once

If all four offers upsell the same stone and the same bracelet, a buyer who takes both after 02
has nothing left to be offered after 03. Two options:

1. **Shared pool with suppression (recommended).** U1/U2 become a pool allocated by what the
   buyer doesn't own yet — owns nothing → stone, then bracelet; owns stone → bracelet only; owns
   both → straight to thank-you. Cheap. Upsells only fire on the first one or two purchases.
2. **A themed pair per offer.** Creatively it works — every offer can carry a protect-object and
   an attract-object. Operationally it's **eight new physical SKUs**, each with inventory,
   shipping and returns. That is a bigger operation than the entire backend deck.

Ship option 1, measure how deep buyers actually go, mint a third object only if the data says
the deck runs long enough to need one.

**Physical fulfilment already exists** — `bracelet_orders` + `soulmate_orders` tables,
`server/lib/braceletOrders.ts`, and shipping collection in the V1 upsell flow. Not new ground.

### ⚠ This is a departure from the source

01 monetises through *sequence* — four offers, no upsells anywhere. Layering U1/U2 on top is
your own V1 playbook, not the case study's. Defensible, since V1 already proves both convert on
this audience, but it stacks: $35 backend + $47 + $47 means someone who entered on a $35
frontend could be asked for $164 in total.

---

## 5. Build order

```
  PHASE 1  02 end to end — email → booking → bump → Stripe → thank-you →
           confirmation → 12-card product
           └─ the product is already written; this is the fastest path to revenue

  PHASE 1b UPSELLS on 02 — port U1/U2 with rewritten opening beats
           └─ reuses V1's chat engine + existing shipping infra

  PHASE 2  03 + 05 (one PWYW component covers both) + capacity cap
           └─ BLOCKED: hex go/no-go, 05's Commitment Charm hook, two products to write

  PHASE 3  04 last — ladder state is the most code AND three unwritten emails

  LATER    n8n generator behind getReadingBody() — personalised from V1 funnel data.
           Only after the static version has proven the funnel sells.
```

## 6. Blockers

1. ~~**Hex go/no-go (03/05).**~~ ✅ **RATIFIED — GO ON BOTH** (operator, 2026-08-03).
   03 ships first, reframed as a closure/ledger rite. 05 ships after the rename (**now
   *Cut the Cord***) and the rewrite of its outcome promise. Stripe bans psychic services only in
   JP/MX/TH — the real exposure is the UDAAP clause, i.e. specific sentences, not the category,
   and both briefs already remove them. Product briefs: [00e §10](./00e-FRAMEWORK-BEs.md).
   ⚠ **What GO commits us to:** 03 and 05 cannot be fulfilled without a buyer emailing in a real
   third party's name and what they did. `S29` intake queue, `S30` alarm triage and `S31` 30-day
   delete are therefore launch-blocking for 03 — not Phase-2 polish.
2. **Three products don't exist.** 03, 04 and 05 have no deliverable written — only 02 does.
   This is the real bulk of the remaining work. (Now scoped as *writing* — the static decision
   means none of them needs a generator.)
3. **Bump product.** "Remove Negative KARMA" is copy with nothing behind it.
4. **05's hook references an offer we don't sell** ("the Commitment Charm").
5. ~~SLA contradiction in 02, none in 04~~ — **DECIDED: 02 / 04 / 05 = 24 hours, 03 = 3 days.**
   Overrides the source throughout. One daily send window covers three of the four offers.
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

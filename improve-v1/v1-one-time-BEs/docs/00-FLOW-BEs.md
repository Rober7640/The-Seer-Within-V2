# 00 — FLOW: the one-time backend deck (ESL → booking page → Stripe)

Working document. Source material in this folder:

| File | What it is |
|---|---|
| [01](./01-Tarot%20Readings,%20Backend,%20Email%20Sales%20Letters.md) | The **strategy** — why the whole sales letter goes in the email |
| [02](./02-Twin%20Flame%20Tarot%20-%20TSL%20Package.md) | Offer 1 — Twin Flame Tarot (2 email versions + booking page + bump + thank-you) |
| [03](./03-Wiccan%20Watch%20-%20Judgement%20Day%20-%20ESL.md) | Offer 2 — Judgement Day (pay-what-you-want) |
| [04](./04-Wiccan%20Watch%20-%20Tea%20Reading%20-%20ESL.md) | Offer 3 — Tea Reading (ascending price ladder) |
| [05](./05-Wiccan%20Watch%20-%20Hex%20Her%20-%20ESL.md) | Offer 4 — Hex Her (pay-what-you-want; later graduated to a frontend bump) |

## The three rules this flow is built on (from 01)

1. **The letter lives in the email.** At ~30% open / ~5% click, gating the letter behind a
   click means only 5% ever read it. In the email, 30% read it and 5% click *to checkout*
   with high intent. Only true in low-awareness mass markets — not B2B.
2. **Engagement creates sales.** open → read → click → **reply** → buy. Every offer must open
   a reply loop, and support has to answer fast. This is the whole mechanism, not a garnish.
3. **The more different offers you send, the more you make.** Buyers buy. Four offers, rotating
   mechanics (tarot → voodoo hex → tea leaves → rival hex), is the point — not a fallback.

---

## Diagram A — the spine (offer 02)

```
┌───────────────────────────────────────────────────────────────┐
│ 0  TRIGGER                                                    │
│    Buyer completes the FRONTEND offer (V1 Evelyn $35/$25)     │
│    stripe webhook → tag: bought_frontend, first_name, bucket  │
└──────────────────────────────┬────────────────────────────────┘
                               │  wait ~2 hours
                               ▼
┌───────────────────────────────────────────────────────────────┐
│ 1  EMAIL SALES LETTER  — "Twin Flame Tarot" v1                │
│    ENTIRE letter in the body. No lander. 6 inline CTAs,       │
│    all → same booking URL + ?e=<sub>&o=tft&v=1                │
└──────────────────────────────┬────────────────────────────────┘
                               │  clicks any CTA
                               ▼
┌───────────────────────────────────────────────────────────────┐
│ 2  BOOKING / COMMITMENT PAGE   (ours — /tarot/twin-flame)     │
│    6 agree-checkboxes · price in the last one · FREE GIFT     │
│    ORDER BUMP checkbox lives HERE (not on Stripe)             │
└──────────────────────────────┬────────────────────────────────┘
                               │  "Confirm My Reading"
                               ▼
┌───────────────────────────────────────────────────────────────┐
│ 3  POST /api/be/checkout  → create Stripe Checkout Session    │
│      line 1   Twin Flame Tarot Reading        $35.00          │
│      line 2   Karma Cleanse (only if bump on) $12.77          │
│      metadata offer=tft, variant, sub_id, bump=true|false     │
└──────────────────────────────┬────────────────────────────────┘
                               │  303 redirect
                               ▼
┌───────────────────────────────────────────────────────────────┐
│ 4  STRIPE CHECKOUT (hosted)                                   │
└───────┬───────────────────────────────────────┬───────────────┘
        │ success_url                           │ cancel_url
        ▼                                       ▼
┌──────────────────────────────┐    ┌──────────────────────────┐
│ 5  THANK YOU PAGE            │    │  back to /tarot/twin-    │
│    "look out for: Your Great │    │  flame?recover=1         │
│     Complete Tarot Reading"  │    └──────────────────────────┘
└──────────────┬───────────────┘
               │ webhook checkout.session.completed
               ▼
┌───────────────────────────────────────────────────────────────┐
│ 6  DELIVERY SEQUENCE — four assets, not one                   │
│      a. thank-you page       (on success_url)                 │
│      b. confirmation email   (+ the donkey parable; sells     │
│                               nothing, pure engagement filler)│
│      c. [ wait out the SLA ] ⚠ 02 states BOTH 8h and 16h      │
│      d. THE PRODUCT — "Your Great Complete Tarot Reading":    │
│         12 Major Arcana ("The Zodiac Spread") + the free      │
│         PERSONAL HOROSCOPE bundled in the same email          │
│      → tag bought_tft                                         │
│    NB the email's 3 cards are the free teaser; the paid       │
│    product is 12 NEW cards. Source copy is static — same      │
│    12 cards for every buyer, only %FIRSTNAME% varies.         │
└───────────────────────────────────────────────────────────────┘
```

## Diagram B — offer-02 branches

```
                        EMAIL 1 sent
                             │
        ┌────────────────────┼─────────────────────┐
        │                    │                     │
   no open 48h          opened, no click      clicked, no buy
        │                    │                     │
        ▼                    ▼                     ▼
  resend w/ new         EMAIL 2 (v2 —        ABANDON branch:
  subject from bank     "3 MORE cards",      1h  → "your cards
  (day 2)               The Star / Emperor    are still on my
        │                / The Moon)          table" + same link
        └──────────┬─────────┘                24h → last-chance
                   │                                │
                   ▼                                ▼
            still no buy  ─────────────►  NEXT OFFER (03 —
                                          Judgement Day)
```

---

## Diagram C — after 02: bought / didn't buy, and how 03 enters

The two paths rejoin at 03. Nobody exits the deck for not buying — that's rule 3.
The difference is **framing and timing**, not eligibility.

```
                    ╔═══════════════════════════════╗
                    ║   OFFER 02 — Twin Flame Tarot ║
                    ╚═══════════════╤═══════════════╝
                                    │
              ┌─────────────────────┴─────────────────────┐
              │                                           │
     ┌────────▼─────────┐                        ┌────────▼────────┐
     │  ✅ BOUGHT        │                        │  ❌ NO PURCHASE  │
     │  tag: bought_tft │                        │  tag: saw_tft   │
     └────────┬─────────┘                        └────────┬────────┘
              │                                           │
   ┌──────────▼──────────────────────┐      ┌─────────────▼─────────────┐
   │ +0h  THANK YOU PAGE             │      │ +48h  EMAIL 2 (v2)        │
   │      "reply with anything you   │      │       "3 MORE cards"      │
   │       want me to look at"       │      │       Star/Emperor/Moon   │
   │      ← reply loop OPENS         │      └─────────────┬─────────────┘
   └──────────┬──────────────────────┘                    │
              │                                  ┌────────┴────────┐
   ┌──────────▼──────────────────────┐      clicked,no buy    no engagement
   │ +16h DELIVERY EMAIL             │           │                 │
   │      "Your Great Complete       │      ┌────▼──────────┐      │
   │       Tarot Reading"            │      │ ABANDON NUDGE │      │
   │      ← the paid thing lands     │      │ +1h  / +24h   │      │
   └──────────┬──────────────────────┘      └────┬──────────┘      │
              │                                  │                 │
   ┌──────────▼──────────────────────┐           └────────┬────────┘
   │ +24h REPLY / SUPPORT WINDOW     │                    │
   │      answer every reply fast    │           ┌────────▼────────┐
   │      (this is where LTV is      │           │ COOL-OFF 1 day  │
   │       actually made)            │           │ (no ask)        │
   └──────────┬──────────────────────┘           └────────┬────────┘
              │                                           │
              │  ⚠ HARD RULE: never open the next         │
              │    offer before the paid one is           │
              │    delivered                              │
              │                                           │
              └─────────────────┬─────────────────────────┘
                                │
                ╔═══════════════▼═══════════════════════════╗
                ║   OFFER 03 — Judgement Day                ║
                ║   new mechanic (voodoo hex, not tarot)    ║
                ║   opens on the Tower's warning, cashed in ║
                ║   ┌─────────────────────────────────────┐ ║
                ║   │ BUYER copy:                         │ ║
                ║   │  "Your reading showed someone has   │ ║
                ║   │   wronged you. I sensed it again    │ ║
                ║   │   while meditating…"                │ ║
                ║   │  → the tarot named it, this settles │ ║
                ║   │    it. Direct continuity.           │ ║
                ║   ├─────────────────────────────────────┤ ║
                ║   │ NON-BUYER copy:                     │ ║
                ║   │  "As I was meditating, I sensed a   │ ║
                ║   │   stirring in your aura"            │ ║
                ║   │  → clean slate, zero guilt, zero    │ ║
                ║   │    reference to the ignored offer   │ ║
                ║   └─────────────────────────────────────┘ ║
                ╚═══════════════════════════════════════════╝
```

**Why non-buyers must not be scolded:** 03's mechanic is different enough (a meditation, an
aura reading, three case stories, a voodoo hex) that it reads as a fresh event. Referencing the
unbought tarot offer converts it into a nag and burns the list.

**Why Judgement Day is the right offer to follow the tarot:** 02's third card is the Tower —
"an ex coming back to ruin your potential chances… a lover pulling away." 03 opens with *"I
sensed a stirring in your aura… someone has wronged you… a score needs to be settled."* It
collects on a debt 02 already created. That's why 01 reports it "money flew in like crazy"
when run on the backend.

## Diagram D — 04 is not one email, it's a rising-price ladder

04's brain dump (Tea Reading) specifies: `1 USD → 11.70 USD → tomorrow 17 → then 27 → then 37`.
The price goes **UP** each day. That inverts the usual discount-deadline: it rewards speed
instead of punishing hesitation, and it gives every follow-up email a legitimate reason to exist.

**Rebased to our $35 floor:** `$35 → $47 → $57 → $67`. Same shape (four rungs, ~$10–12 a day,
7-endings), starting at our price instead of the source's $17-frontend economics.

```
  DAY 1                DAY 2              DAY 3            DAY 4
┌──────────┐        ┌──────────┐       ┌──────────┐    ┌──────────┐
│ THE ESL  │        │ "the cup │       │ "it goes │    │ "last    │
│ 7 symbols│        │  is dry- │       │  to $57  │    │  call —  │
│ half     │───────▶│  ing"    │──────▶│  tonight"│───▶│  $67"    │
│ revealed │        │          │       │          │    │          │
└────┬─────┘        └────┬─────┘       └────┬─────┘    └────┬─────┘
     │                   │                  │               │
   $35.00              $47.00             $57.00          $67.00
     │                   │                  │               │
     └───────────────────┴──────────────────┴───────────────┘
                              │
                              ▼
                 ┌─────────────────────────────┐
                 │  SAME booking page URL      │
                 │  price resolved SERVER-SIDE │
                 │  from ladder_day, never     │
                 │  from a URL param           │
                 └──────────────┬──────────────┘
                                ▼
                          Stripe Checkout
```

⚠ **Engineering note:** the price must be computed server-side from the subscriber's own
ladder position (when *they* entered 04), not from a query string and not from a global
calendar date. Otherwise a forwarded link, a late opener, or a re-entrant user gets the
wrong price — and a URL-param price is trivially editable by the buyer.

## Diagram E — the full deck as a state machine

```
        ┌──────────────────────────────────────────────────────────┐
        │  FRONTEND BUYER ENTERS THE BACKEND DECK                  │
        └────────────────────────────┬─────────────────────────────┘
                                     ▼
   ╔═════════════════════════════════════════════════════════════════╗
   ║ 02  TWIN FLAME TAROT      mechanic: 3-card tarot draw           ║
   ║     thread: hope + a warning (an ex / a rival)                  ║
   ║     price:  $35 fixed  +  $12.77 order bump (karma)             ║
   ║     ask:    "give me permission to draw 12 more"                ║
   ╚════════════════════════════════╤════════════════════════════════╝
                bought ─────────────┼───────────── didn't
                     └──────┬───────┘
                            ▼   (delivery first, then 2-day gap)
   ╔═════════════════════════════════════════════════════════════════╗
   ║ 03  JUDGEMENT DAY         mechanic: voodoo hex (Baron Samedi)   ║
   ║     thread: REVENGE — justice on whoever wronged you            ║
   ║     price:  PAY WHAT YOU WANT, anchored $300 → $250 → "any"     ║
   ║     ask:    donate, then REPLY with the person's details        ║
   ║             ← strongest reply loop in the deck                  ║
   ║             ← 01: "money flew in like crazy"                    ║
   ╚════════════════════════════════╤════════════════════════════════╝
                bought ─────────────┼───────────── didn't
                     └──────┬───────┘
                            ▼
   ╔═════════════════════════════════════════════════════════════════╗
   ║ 04  TEA READING           mechanic: tea-leaf symbols            ║
   ║     thread: he's pulling away — the RIGHT texts fix it          ║
   ║     price:  ASCENDING ladder $35 → 47 → 57 → 67                 ║
   ║     ask:    "get the full reading" (soft, "purely optional")    ║
   ║             ← the BREATHER between two hexes                    ║
   ╚════════════════════════════════╤════════════════════════════════╝
                bought ─────────────┼───────────── didn't
                     └──────┬───────┘
                            ▼
   ╔═════════════════════════════════════════════════════════════════╗
   ║ 05  HEX HER               mechanic: hex the rival woman         ║
   ║     thread: REVENGE, narrowed — "she is approaching him as we   ║
   ║             speak"; 3 Grand Etteilla cards as proof             ║
   ║     price:  pay what you want / $67                             ║
   ║     ask:    permission to cast + REPLY with her details         ║
   ╚════════════════════════════════╤════════════════════════════════╝
                                    │
                                    │ 01: "sold SO WELL it became a
                                    │      bump offer for the main
                                    ▼      product"
   ┌─────────────────────────────────────────────────────────────────┐
   │  GRADUATION → promote Hex Her to an order bump on the FRONTEND  │
   │  (feeds back into stage 0 — raises AOV before the deck starts)  │
   └─────────────────────────────────────────────────────────────────┘
```

**The thread is revenge — but it is not a straight escalation.** 01 says it plainly:
*"the underlying thread of most of these promos is revenge. Always works good. No matter the
niche."* Note the word **most**. Read in the true order:

```
  02 TWIN FLAME    plants the threat    the Tower: an ex returns, a lover pulls away
        ↓
  03 JUDGEMENT DAY cashes it in         REVENGE, general — whoever wronged you
        ↓
  04 TEA READING   ── BREATHER ──       no enemy. He's drifting; the RIGHT texts fix it.
        ↓                               01 calls it "pretty straightforward"
  05 HEX HER       re-escalates         REVENGE, aimed — at HER specifically
```

The de-escalation at 04 is a feature, not a gap. Two revenge offers back-to-back trains the
list that this persona only sells hexes; the tea reading resets the register to *guidance*
before 05 asks for the biggest, most specific act of aggression in the deck. It's also the
only offer of the four with a soft ask — *"this is purely optional but I highly recommend
it"* — which is why it can carry a rising price ladder without reading as a squeeze.

## Diagram F — suppression / entry rules

```
  before sending offer N to a subscriber, check:

  ┌─ has bought N? ───────────────► SKIP to N+1 (never re-pitch a bought offer)
  ├─ has an UNDELIVERED purchase? ► HOLD (deliver first — see Diagram C)
  ├─ mid-ladder on offer N-1? ────► HOLD until that ladder expires
  ├─ replied and awaiting support?► HOLD (don't sell over an open ticket)
  ├─ refunded / chargeback? ──────► EXIT the deck entirely
  └─ otherwise ───────────────────► SEND
```

---

## Diagram G — audience filter (DECIDED: women-only for v1)

**Decision:** the deck ships in the source's voice — a woman whose man is drifting toward
another woman. No mirrored copy is written for v1. Mirrored variants for 04/05 are **parked**,
not cancelled (see the backlog at the end of this section).

That decision does not remove the need for a filter — **it creates one.** We have male buyers
and non-romantic buyers on the list. If nothing gates the sends, they receive copy written for
someone else. So the filter below is not optional segmentation work; it's the thing that makes
"women-only" true in practice.

**The variable is NOT the buyer's gender.** It's the **gender of the person they're asking
about** — that's what "the man in question pulling away" and "HEX HER" actually encode. A man
asking about a man needs the *same* "he" copy a woman does. A man asking about a woman needs
the mirror. Segmenting on the buyer misses this; segmenting on the target gets it right.

```
                    FRONTEND BUYER
                          │
          ┌───────────────┴───────────────┐
          │  bucket = ?                   │
          ▼                               ▼
  ┌───────────────┐              ┌─────────────────────┐
  │ love / someone│              │  money / purpose    │
  │ romantic deck │              │  NO romantic target │
  │ applies       │              │  exists at all      │
  └───────┬───────┘              └──────────┬──────────┘
          │                                 │
          │                      ┌──────────▼──────────────────┐
          │                      │ 02 ✅  (neutral: "luck",    │
          │                      │        "a windfall")        │
          │                      │ 03 ✅  (rivals/enemies —    │
          │                      │        Josephine's business │
          │                      │        story fits exactly)  │
          │                      │ 04 ❌  SKIP                 │
          │                      │ 05 ❌  SKIP                 │
          │                      └─────────────────────────────┘
          │
          ▼   target pronoun, read from THEIR OWN WORDS
  ┌───────────────┬───────────────┬───────────────┐
  │  "he"         │  "she"        │  UNKNOWN      │
  ▼               ▼               ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────────┐
│ FULL DECK   │ │ 02 + 03 ONLY│ │ 02 + 03 ONLY    │
│ 02 03 04 05 │ │ hold 04, 05 │ │ hold 04, 05     │
│             │ │             │ │                 │
│ source copy │ │ the copy is │ │ don't guess.    │
│ ships as-is │ │ about a man │ │ silence is not  │
│             │ │ — it isn't  │ │ permission to   │
│             │ │ about their │ │ assume "he"     │
│             │ │ situation   │ │                 │
└─────────────┘ └─────────────┘ └─────────────────┘
        │               │                 │
        └───────────────┴─────────────────┘
                        ▼
        held audiences are NOT exited from the deck —
        they simply stop after 03 and wait for the
        mirrored variants to be written (backlog)
```

### How to derive the target pronoun (no schema change needed)

We store no gender field. We do store the buyer's own free text: `concern`,
`deeperResponse`, `emotionalResponse`, `vision`, and the full `messages` transcript.

```
  count he/him/his   vs   she/her/hers   in the buyer's own words
        │                      │
        └──────────┬───────────┘
                   ▼
     clear majority ──► use it        (they told us, in their words)
     tie / neither  ──► UNKNOWN → neutral variant
```

⚠ **Do not infer gender from `firstName` or `personName`.** Name→gender lookup is unreliable
across cultures, and a wrong guess sends a woman an email about hexing "the other woman" who
is actually her husband's business partner. The pronoun count is self-reported; the name is a
guess. When the text is silent, ship neutral — the neutral variant costs a little punch, a
misfire costs the customer.

### Per-offer exposure

| Offer | Gendered? | Work needed |
|---|---|---|
| 02 Twin Flame Tarot | Barely — "the person on your mind", "a lover pulling away", "an ex coming back" are already neutral | Ships as-is. Only "Jane" the case study is female-coded |
| 03 Judgement Day | No — "someone has wronged you", rivals, enemies, a business competitor | Ships as-is. Swap one of the three case stories (Marta/Josephine/Elisabetta) for a man |
| 04 Tea Reading | **Yes, heavily** — "the man in question pulling away", "he might even be looking at another woman", "The man who was once HEAD OVER HEELS for you" | Needs a full mirrored variant |
| 05 Hex Her | **Yes, structurally** — the entire premise is a rival *woman*; it's in the title | Needs a mirrored variant AND a rename ("Hex Him" / a neutral "Rival Remover") |

**The useful surprise:** the deck's first two offers — the ones that ship first — are already
gender-safe, so they go to **everyone** regardless of this decision. The women-only scope only
constrains 04 and 05, the last two to build. It does *not* block starting.

**The bigger cut is bucket, not gender.** A `money` or `purpose` buyer has no romantic target
at all. Sending them "your man is being APPROACHED by another woman" is a worse miss than any
pronoun error, and no amount of gender logic fixes it. They should be routed past 04 and 05
entirely — 02 and 03 still work for them unchanged, which is a real point in the corrected
sequence's favour: the two offers that survive every segment are now the first two sent.

### Parked backlog (do not lose these)

- **Mirrored 04 (Tea Reading):** he→she, "another woman"→"another man", "the man who was once
  HEAD OVER HEELS for you"→mirrored. Unblocks male buyers with a female target.
- **Mirrored 05:** "Hex Her"→"Hex Him", or a neutral "Rival Remover" that works for both.
- **Measure the cost.** Before writing either, pull the real split of purchasers by target
  pronoun and by bucket. If "she"-target buyers are 5% of the list, this stays parked forever;
  if they're 30%, it's the highest-leverage copy work in the deck. **Currently unmeasured —
  women-only is a scoping decision made without the number, which is fine to start and not
  fine to keep.**

## Diagram H — the reply loop (03 and 05 cannot be fulfilled without it)

01's Lesson 1 is open → read → click → **reply** → buy. For 03 and 05 the reply isn't a nice-to-
have: the buyer pays first, then replies with *who* to aim the hex at. No reply, no deliverable.

```
   purchase ──► confirmation email
                 Reply-To: ord_a1b2c3@reply.theseerwithin.com   ← unique per order
                        │
                        │  "reply with the person's name and what they did"
                        ▼
              MX reply.theseerwithin.com → Resend catch-all
                        ▼
              POST /api/inbound/resend      (metadata only)
                        ▼
              fetch body via Received Emails API
                        ▼
              be_replies row, keyed by the `to` address ──► order
                        ▼
              human reads intake ──► fulfil within SLA
                     (03: 2–5 days · 05: 14 hours)
```

**Reply-as-intake, not reply-as-conversation.** 03's own P.P.S. sets the expectation: *"I get
100-200 emails per day… I simply do not have the time to answer every single email."* The reply
is required to fulfil and explicitly not promised an answer. Someone must *read* intake; nobody
has to converse. The SLA is the commitment, not the reply.

Per-order Reply-To means the reply identifies its own order — no body parsing, no matching on
sender address (which breaks when they reply from a different address than they bought with).

⚠ Never auto-respond: bounces and out-of-office hit this address too, and auto-replying to them
creates loops. And buyers will send names and accusations about third parties who never
consented — retention policy before the first one lands, not after.

## Wireframe 1 — the email (offer 02; this *is* the product)

```
╔═══════════════════════════════════════════════════════════════╗
║ From:  Evelyn Cross <...>                                     ║
║ Subj:  %FIRSTNAME% - I had a dream about you                  ║
║ Prehdr: Three cards. Two blessings, one warning.              ║
╠═══════════════════════════════════════════════════════════════╣
║          ┌───────────────────────────────────┐                ║
║          │  [ photo: 3-card spread on cloth ]│                ║
║          └───────────────────────────────────┘                ║
║                                                               ║
║   %FIRSTNAME%, For An Unusual Reason I've Drawn               ║
║   Three Tarot Cards For You                        ← H1       ║
║                                                               ║
║   These Signify A MASSIVE Change In Your Love Life With       ║
║   The Very FIRST Appearance Likely In Just 5-7 Days  ← deck   ║
║                                                               ║
║   %FIRSTNAME% -                                               ║
║   Evelyn here. I write to you with urgency...                 ║
║   [ dream → cards asked to be picked → free draw → Jane ]     ║
║                                                               ║
║   ─── Your first card: the World ──────────────────           ║
║   [ card image ]   "Luck will favor you."                     ║
║                                                               ║
║   ─── Your second card: the Lovers ────────────────           ║
║   [ card image ]   A special encounter. 2 options.            ║
║                                                               ║
║   ─── Your third card: the Tower ──────────────────  ⚠ turn   ║
║   [ card image ]   An ex coming back. A lover pulling away.   ║
║                                                               ║
║        ▸ CTA 1  "the one you can do by clicking HERE"         ║
║        ▸ CTA 2  "give me permission to draw the 12 cards"     ║
║        ▸ CTA 3  "you must draw 12 new cards here"             ║
║        ▸ CTA 4  "an in-depth Twin Flame Tarot reading"        ║
║        ▸ CTA 5  "allow me to read your full 12 cards"         ║
║        ▸ CTA 6  "Follow me HERE"                              ║
║          ── all six → the SAME booking URL ──                 ║
║                                                               ║
║   Your devoted friend,                                        ║
║   Evelyn Cross                                                ║
╚═══════════════════════════════════════════════════════════════╝
```

## Wireframe 2 — booking / commitment page + order bump

```
╔═══════════════════════════════════════════════════════════════╗
║           Twin Flame Tarot Reading — Booking Page             ║
║                                                               ║
║        By Booking This Reading You Agree To The Following:    ║
║                                                               ║
║  [✓] ❤️‍🔥 YES, dear Evelyn... THE MESSAGE FROM THE 3 TAROT      ║
║          CARDS makes me want to find out much more.           ║
║  [✓] ❤️‍🔥 Yes, I give permission to draw my destiny.           ║
║  [✓] ❤️‍🔥 Yes, this is done by a professional.                 ║
║  [✓] ❤️‍🔥 Yes, this is a once in a lifetime opportunity.       ║
║  [✓] ❤️‍🔥 Yes, this reading takes a minimum of 16 hours.       ║
║  [✓] ❤️‍🔥 Yes, I agree to pay a modest one-time sum of         ║
║          $35 for this service.             ← price hides here ║
║                                                               ║
║             ┌─────────────────────────┐                       ║
║             │  [ image ]              │                       ║
║             └─────────────────────────┘                       ║
║                                                               ║
║  Evelyn, you are now in possession of my complete spread...   ║
║  I understand you will also send me FREE OF CHARGE MY         ║
║  PERSONAL HOROSCOPE. Thank you for this FREE GIFT.            ║
║                                                               ║
║  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ORDER BUMP ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐    ║
║   [ ] YES! I Want To Remove Negative KARMA forever!  +$12.77  ║
║       POWERFUL Astro Force ritual to DISPEL negative KARMA    ║
║       that's PREVENTING good luck. Start tonight.             ║
║  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘    ║
║                                                               ║
║              Total today:  $35.00                             ║
║       ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓               ║
║       ┃   CONFIRM MY READING  →                ┃               ║
║       ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛               ║
║        Secure checkout · one-time · no subscription           ║
╚═══════════════════════════════════════════════════════════════╝
```

## Wireframe 3 — Stripe (hosted; we only control line items)

```
╔═══════════════════════════════════════════════════════════════╗
║  Evelyn Cross · The Seer Within          │  Pay with card     ║
║  Twin Flame Tarot Reading      $35.00    │  Email  [_______]  ║
║  Karma Cleanse Ritual          $12.77    │  Card   [_______]  ║
║  ───────────────────────────────────     │                    ║
║  Total                         $47.77    │  [   Pay $47.77  ] ║
╚═══════════════════════════════════════════════════════════════╝
        success_url ──► /tarot/twin-flame/thank-you
        cancel_url  ──► /tarot/twin-flame?recover=1
```

## Wireframe 4 — thank you

```
╔═══════════════════════════════════════════════════════════════╗
║                          Dearest,                             ║
║   I'd like to thank you for making the right decision and     ║
║   following my advice.                                        ║
║                                                               ║
║   I'll get started immediately and come back to you once      ║
║   I've consulted my deck of Major Arcana Cards.               ║
║                                                               ║
║   Please look out for your inbox — it will be titled with     ║
║   your name and: Your Great Complete Tarot Reading.           ║
║                                                               ║
║   ┌───────────────────────────────────────────────────┐       ║
║   │ ⏱  Your reading takes ~16 hours. Reply to that    │       ║
║   │    email with anything you want me to look at.    │       ║
║   └───────────────────────────────────────────────────┘       ║
║        ↑ rule 2 — engagement, and the support loop            ║
╚═══════════════════════════════════════════════════════════════╝
```

## Wireframe 5 — pay-what-you-want booking page (offers 03 + 05)

Different checkout shape: no fixed price, an anchor, and a reply requirement.

```
╔═══════════════════════════════════════════════════════════════╗
║        Judgement Day — Reserve Your Ritual                    ║
║                                                               ║
║   I charge $300 for this ancient, powerful curse.             ║
║   My peers urged me to hold it at $250.                       ║
║   But your case is special.        ← anchor, then collapse    ║
║                                                               ║
║   ┌─────────────────────────────────────────────────┐         ║
║   │  Your donation:   $ [  27.00  ]                 │         ║
║   │  ( ) $35   ( ) $47   ( ) $67   ( ) other        │         ║
║   └─────────────────────────────────────────────────┘         ║
║                                                               ║
║   ⚠ Only a limited number of hexes — each takes 2–5 days      ║
║                                                               ║
║       ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓               ║
║       ┃  DONATE & ACTIVATE JUDGEMENT DAY  →    ┃               ║
║       ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛               ║
║                                                               ║
║   After you submit: REPLY with the person's name, what they   ║
║   did, and as much detail as you can.   ← the engagement ask  ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## Three checkout modes, not one

| Offer | Price model | Stripe implementation |
|---|---|---|
| 02 Twin Flame | fixed $35 + optional $12.77 bump | 1–2 fixed line items |
| 03 Judgement Day | pay-what-you-want, anchored $300/$250 | custom amount (`price_data`), min/max clamp |
| 04 Tea Reading | ascending ladder $35 → 47 → 57 → 67 | price resolved server-side from the subscriber's ladder day |
| 05 Hex Her | pay-what-you-want / $67 | same as 03 |

Build order now matches send order, which it didn't before: 02 (fixed + bump proves the
booking-page → bump → Stripe path), then 03 and 05 share one custom-amount component, then 04
last (the ladder needs per-subscriber state, so it's the most work — and it's no longer
blocking offer 3 in the sequence).

## Open decisions

1. **Fulfilment.** Source hand-writes a reading and emails it in 16h. Ours could grant a
   session in the V2 chat instead — that's the LTV engine. Changes step 6 and all thank-you copy.
2. ~~**Price.**~~ **DECIDED:** $35 is the floor for every paid backend offer. The source's
   numbers ($19.77 reading, $11.70/$17 ladder rungs) were calibrated to its $17 frontend;
   ours is $35/$25, so everything rebases upward. Bump held at $12.77 → cart total $47.77.
   Still open: whether the bump should scale too, and whether $67 stays the PWYW ceiling.
2b. ~~**04 ladder shape.**~~ **DECIDED:** `$35 → $47 → $57 → $67` as written — a $35 floor, no
   rung priced below the frontend. The source's own ratios (which would give `$24 → $35 → $55
   → $76`, opening *below* the frontend as a tripwire) are **not** being used.
2c. ~~**Audience.**~~ **DECIDED:** women-only for v1. Source copy ships unmirrored; 04 and 05
   are held for "she"-target and unknown-target buyers. See Diagram G + its parked backlog.
3. **The bump product.** "Remove negative karma" doesn't exist on our side yet.
4. **Pre-checked bump?** Lifts take-rate; a pre-selected paid add-on is a negative option under
   FTC / card-network rules. Decide deliberately.
5. **Checkbox enforcement.** All six required to enable the button, or decorative?
6. **List + persona.** AWeber V1 buyers under Evelyn, or Kit? Madame Delacroix's voice needs recasting.
7. **03/05 revenge framing.** Hexes aimed at a named third party are the deck's best performers
   in the source, and also its biggest brand/compliance exposure for us. The corrected order makes
   this urgent: Judgement Day is now offer **2 of 4**, not 3 of 4 — the deck turns to revenge
   immediately after the tarot, so a go/no-go is needed before almost any build work.
8. **Support capacity.** Rule 2 only works if replies get answered fast. 03 and 05 *require* a
   reply to fulfil at all — and 03 now lands second, so support has to be staffed from the start
   of the deck rather than a week in. Who answers?
```

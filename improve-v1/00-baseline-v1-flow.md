# V1 Conversion Funnel — Canonical BASELINE Flow (spec-of-record)

**Purpose:** Reconstruct the ORIGINAL / INTENDED V1 psychic-reading conversation flow ("Evelyn Cross"
single-session funnel) purely from the project's markdown docs, so a later pass can diff it against
the live code to detect drift. Every claim cites its source doc + section. Where docs conflict or a
later addendum overrode the original intent, it is flagged in-line and consolidated in **§11**.

**Scope:** V1 funnel only — Landing → `/chat` → checkout ($35 / $25 downsell) → Upsell 1 (Protection
Ritual $47) → Upsell 2 (Manifestation Bracelet $47/$30) → `/success`. This is System 1. The
account-based multi-persona chat service (System 2, credits/coins) is explicitly OUT of scope and its
"buckets" (opening/exploration/guidance/closing in `reply-rules-reference.md §2`) must NOT be
conflated with V1's love/money/purpose/someone buckets.

---

## 0. Source docs & authority ranking

Ranked most-authoritative-first for the ORIGINAL design intent, with later addenda noted:

| Rank | Doc | Date | Role |
|---|---|---|---|
| A1 | `docs/claude-code-implementation-brief.md` | Jun 8 snapshot | **Original build spec** — full state-machine types, greeting/name/email/deepening/future-pacing/crisis/permission/pitch/objection/downsell logic, verbatim copy. The earliest authoritative flow. |
| A2 | `docs/bucket-enhancement-addon.md` | Jun 8 snapshot | **First addendum** — expands prompts.ts: adds sub-buckets, future-pacing copy, PITCH_MESSAGES, OFFER_EXPLANATION, gibberish + "what is this" intents. Overrides A1's prompts.ts. |
| A3 | `docs/PRD.md` | Jun 8 | Product-level phase list, pricing, persona, integrations. |
| A4 | `docs/WIREFRAMES.md` | Jun 8 | UI copy + offer-card wording (some drifted vs A1). |
| A5 | `docs/handover/01-platform-flowchart.md` | Jun 8 | ASCII funnel flowchart (uses `/welcome1`,`/welcome2` routes). |
| A6 | `docs/ARCHITECTURE.md` §3, §8 | Jun 8 | As-built action names + payment flow (later than A1). |
| A7 | `docs/upsell1.md` | Jun 8 | Full 20-stage Upsell 1 script (verbatim). |
| A8 | `docs/upsell-2-manifestation-bracelet.md` + `upsell2.md` (root) | Jun 8 | Full Upsell 2 script + as-built 33-stage summary. |
| B1 | `docs/Front end Price-Split test` | (superseded) | Earliest price-split plan; documents the pre-existing `$17` DownsellCTA bug. |
| B2 | `docs/v1-price-split-test-PRD.md` | 2026-04-27 | **Supersedes B1.** Verified current code state; confirms main renamed to "Energy Clearing", downsell fixed to $25. |
| B3 | `docs/u1-heart-opening-rose-quartz-sidebyside.md` + `docs/u1-u2-system-test-spec.md` | Jun 26 / late | **Later A/B experiment** — a *rose-quartz heart-opening* variant arm of U1 + "broadcast" U2. NOT the baseline; the baseline (control) is lava+manifest. |
| C | `CLAUDE.md` "Conversation Flow" / "Dual System Architecture" | current | Project-instruction summary of the same flow. |

> **Naming caution:** `reply-rules-reference.md` and most of `ARCHITECTURE.md §4`, the coin/credit
> flow, safety module, personaIntent buckets, etc. describe **System 2**, not the V1 funnel. Only
> `ARCHITECTURE.md §3` and `§8 "System 1 — Funnel Payments"` are V1.

---

## 1. Route map & high-level funnel

Source: `handover/01-platform-flowchart.md` "System 1: Conversion Funnel"; `ARCHITECTURE.md §3`;
`CLAUDE.md` "Application Routes" + "Dual System Architecture".

```
/  (Landing, Evelyn Cross, "Begin Your Free Reading")
  → /chat        guided state-machine reading (FREE, no paywall/credits)
  → Stripe Checkout  $35 main / $25 downsell
  → /welcome1    Upsell 1: Protection Ritual + Lava Stone $47   (1-click or fallback)
  → /welcome2    Upsell 2: Manifestation Bracelet $47 / $30 downsell
  → /success     order confirmation + email follow-up trigger
```

**Route-name drift (flag):** `WIREFRAMES.md §5` calls Upsell 1 `/upsell` and (implicitly) Upsell 2
`/upsell2`; `PRD.md §12`/`claude-code-implementation-brief` reference `/success` and `/chat`. The
later authoritative docs (`handover/01-platform-flowchart.md`, `ARCHITECTURE.md §8`, `CLAUDE.md`)
standardize on **`/welcome1`** and **`/welcome2`**. Treat `/welcome1` `/welcome2` as canonical; the
`/upsell` `/upsell2` names are early/legacy.

**Key invariant:** the V1 reading is entirely FREE up to the checkout CTA. There is no
message-count limit, no credit gate, no login. (The "3 free minutes / 180 coins" in
`handover/01-platform-flowchart.md` "Credit / Billing Flow" is System 2 only — do not apply to V1.)

---

## 2. Conversation state machine (`/chat`)

### 2.1 Canonical state enum

Source: `claude-code-implementation-brief.md` "Types" (`types/chat.ts`):

```
INIT → GREETING → NAME_CAPTURE → BUCKET_SELECTION
     → PERSON_NAME_CAPTURE (only if bucket = 'someone')
     → EMAIL_CAPTURE → DEEPENING → READING → FUTURE_PACING
     → CRISIS_INTRO → PERMISSION_ASK → PITCH
     → OBJECTION_HANDLING → DOWNSELL → GRACEFUL_EXIT → END
```

`PRD.md §7 "Conversation Flow State Machine"` lists a compatible phase set:
`greeting → name_capture → bucket_selection → deepening_1 → deepening_2 → deepening_3 →
email_capture → crisis → pitch → checkout`.

### 2.2 Phase-by-phase (order, behavior, transition trigger, message count, technique)

All copy below is **verbatim from `claude-code-implementation-brief.md` `hooks/useConversation.ts`**
unless another doc is cited. "Barnum/cold-read" techniques are per `PRD.md §8` and
`bucket-enhancement-addon.md`.

| # | Phase | What happens | Transition trigger | Bot msgs | Key technique / copy |
|---|---|---|---|---|---|
| 1 | **INIT → GREETING** | On mount: fetch IP geo + time-of-day (`/api/location`, `lib/geolocation.ts`). System line "Evelyn has joined the chat". | auto after geo resolves | ~5–7 | Time-of-day Barnum lines (`getTimeMessage`: morning/afternoon/evening/night/latenight). Greeting: *"Greetings, dear friend, and welcome." / "My name is Evelyn Cross." / "I've been expecting you..."* + optional *"From {location}, I can feel your energy..."* |
| 2 | **NAME_CAPTURE** | Ask first name; capitalize first token. | user submits text | 2 (ask) + 3 (ack) | *"To open the connection... What's your first name, dear?"* → *"It's lovely to meet you, {firstName}." / "Everything we discuss stays between us... our secret." / "Now, what's weighing on your heart today, dear?"* |
| 3 | **BUCKET_SELECTION** | Show 4 quick-reply buttons. | user taps a bucket | 2–3 per bucket | Bucket buttons (labels §3). Bucket-specific 2-line cold read, e.g. love: *"I can feel warmth radiating from your heart... But there's a flicker of shadow there too..."* |
| 3b | **PERSON_NAME_CAPTURE** | Only if bucket=`someone`. Capture the person's first name. | user submits name | 4 | *"{personName}... The moment you typed that name, I felt something shift..."* Then jumps to EMAIL_CAPTURE. |
| 4 | **EMAIL_CAPTURE** | Anchor line then collect + validate email (must contain `@` and `.`). Fires the **Lead** touchpoint. | valid email | 3 | *"Before I look deeper, I need to anchor our connection... Where should I send them if more is revealed?"* → *"Thank you, {firstName}. The link is complete..."* |
| 5 | **DEEPENING → READING** | Store `concern`; call `/api/chat action=reading` (later `reading1`/`reading2`). Claude returns a JSON `messages[]` array (5 msgs, ≤25 words each). | Claude responds | 5 (+ future-pacing Q) | Barnum + sub-bucket cold reads (§3). Msg 5 "sets up the shadow/block — don't reveal yet" (`bucket-enhancement-addon.md buildReadingPrompt`). |
| 6 | **FUTURE_PACING** | Ask the bucket's future-pacing question, store `desires`. | user answers | 1 (ask) | `FUTURE_PACING_PROMPTS` (§3). e.g. love: *"If you could have any romantic future you desired, what would it look like?"* |
| 7 | **CRISIS_INTRO** | Call `/api/chat action=crisis` (later `crisisReveal`+`crisisCost`+`crisisUrgency`+`shadowSummary`). Claude returns 5–7 msgs revealing the "shadow/block" + urgency. | Claude responds | 5–7 | Pattern interrupt ("But... hold on...") then bucket-specific crisis framing (§3): love=blockage, money=generational/scarcity imprint, purpose=soul fog, someone=energetic interference. |
| 8 | **PERMISSION_ASK** | Two lines then a single Permission button. | user clicks button | 2 | *"{firstName}, I know exactly what needs to be done... But I need your permission before I can begin."* Button label: *"Yes, please help me Evelyn!"* |
| 9 | **PITCH** | Deliver PITCH_MESSAGES (intro→whatYouGet→guarantee→urgency→close), show Purchase CTA, keep text input open. | user clicks CTA / types | ~9 | See §4. Sacred Offering framing, $35, 24-hr email delivery, 30-day guarantee, scarcity ("window won't stay open"). |
| 10 | **OBJECTION_HANDLING** | On typed reply at PITCH: `detectIntent`. Explicit decline → GRACEFUL_EXIT. Else increment `objectionCount`, call `/api/chat action=objection` (empathize→reframe→re-offer, +urgency if count≥2). | `objectionCount` reaches 3 | 3–4 per objection | Never argue/beg; stay warm/maternal (`buildObjectionPrompt`). |
| 11 | **DOWNSELL** | On 3rd objection: swap Purchase CTA for Downsell CTA. | user clicks / declines | 4 | *"I sense hesitation... Perhaps the full clearing isn't what you need... A written reading — no ritual, just clarity."* |
| 12 | **GRACEFUL_EXIT / END** | On explicit decline: warm goodbye, no push. | — | 4 | *"I respect your decision, {firstName}... If you ever feel ready, I'll be here."* |

**Message-count note:** `PRD.md §7` frames "deepening" as up to 3 rounds; `handover/01-platform-flowchart.md`
says "Deepening (2–3 rounds)". A1's implemented flow does 1 deepening + 1 future-pacing before crisis.
`ARCHITECTURE.md §3` splits the AI work into finer actions (`reading1`, `reading2`,
`futureValidation`, `crisisReveal`, `crisisCost`, `crisisUrgency`, `shadowSummary`, `valueExplain`,
`objection`) — this is the **as-built** action set and supersedes A1's coarser `reading`/`crisis`/`objection`.

### 2.3 Client-side intent detection

Source: `PRD.md §7 "Intent Detection"`; `claude-code-implementation-brief.md detectIntent`;
`bucket-enhancement-addon.md §4–6`.

- Intents: positive, negative/objection (`explicit_decline`), gibberish/off-topic, question, name
  provided, email provided, bucket selection, plus addendum-added **`wants_explanation`**
  ("what is this / what do I get / explain").
- `explicit_decline` regex: `/^no$|^no thanks|not interested|don't want|goodbye/`.
- Gibberish → `GIBBERISH_RESPONSE` ("The energy around those words is... scattered, dear.").
- `wants_explanation` → replays `OFFER_EXPLANATION` (§4), stays in PITCH.

### 2.4 Typing simulation

Source: `claude-code-implementation-brief.md lib/typing.ts` + `PRD.md §12`. Per-message delay
`45ms/char`, clamped **800ms–3500ms**, ±20% variance, 400ms pause between messages. Purpose: realistic
"human typing" to build anticipation.

---

## 3. Buckets & sub-buckets

Source: `bucket-enhancement-addon.md §1` (prompts) + `§2` (`detectSubBucket`); labels from
`claude-code-implementation-brief.md BUCKET_LABELS`; `PRD.md §2 Stage 2`.

**4 top-level buckets** (`Bucket = 'love' | 'money' | 'purpose' | 'someone'`):

| Bucket | Button label | Crisis framing ("the shadow") | Offer bridge |
|---|---|---|---|
| **love** | 💕 Love & Relationships | Blockage deflecting love from reaching them | "soulmate/connection reading: who, when, what's blocking them" |
| **money** | 💎 Money & Abundance | Generational block / "scarcity imprint" | "abundance reading: the block, when the shift comes, the decision" |
| **purpose** | 🌟 My Life Purpose | Misalignment / "soul fog" | "destiny reading: your purpose, gifts, next step" |
| **someone** | 🔮 Someone Specific | Energetic interference between the two people | "connection reading: what {name} feels, hides, whether reunion is written" |

> `WIREFRAMES.md §2` renders slightly different labels (❤️ Love & Relationships, 💰 Money & Career,
> ✨ Life Purpose, 👤 Someone Specific). Emoji/label wording is a minor drift; the 4 buckets and their
> `Bucket` keys are invariant.

**16 sub-buckets** (4 per bucket), detected from free-text via `detectSubBucket()`:

| Bucket | Sub-buckets |
|---|---|
| love | `seeking_love`, `relationship_trouble`, `lost_love`, `betrayal` |
| money | `career`, `financial_stress`, `opportunity`, `blocked_abundance` |
| purpose | `seeking_purpose`, `direction`, `regret_reset`, `untapped_potential` |
| someone | `their_feelings`, `reunion`, `trust_truth`, `non_romantic` |

Each sub-bucket has its own set of ~4 cold-read lines (full verbatim table in
`bucket-enhancement-addon.md §1`). The `someone` bucket is documented as "often the highest-converting
bucket because it promises mind-reading" and ALWAYS injects the captured `{personName}` into cold reads.

**Future-pacing prompts** (`bucket-enhancement-addon.md FUTURE_PACING_PROMPTS`): one per bucket; the
`someone` variant interpolates `{personName}` ("What is it you truly want with {personName}?").

---

## 4. The offer / pitch (main product)

Source: `bucket-enhancement-addon.md PITCH_MESSAGES` + `OFFER_EXPLANATION`; `PRD.md §9`;
`claude-code-implementation-brief.md handlePermission` + `/api/checkout`.

**Product & price (canonical):**
- Main offer: **$35.00** (`3500` cents). Named **"Sacred Clearing Ritual"** in A1/A3/B1; **renamed
  "Energy Clearing Ritual"** in the as-built code per `v1-price-split-test-PRD.md §4` (PurchaseCTA:
  *"Begin My Energy Clearing - $35"*). `WIREFRAMES.md §4` offer card labels it *"Deep Personal
  Reading"* with a `~~$97~~ → $35 (Limited Time)` anchor. **Flag:** three names for one SKU (§11).
- Downsell: **$25.00** (`2500` cents), named "Written Reading". Offered after **3 objections**.

**What's promised** (`PITCH_MESSAGES` + `OFFER_EXPLANATION`):
- A Sacred Clearing Ritual removing the shadow/block.
- A complete written reading delivered **by email within 24 hours** ("what I found, what I cleared,
  guidance for the days/weeks ahead").
- A **30-day money-back guarantee** ("if you feel nothing has shifted, every penny back").

**How urgency is built:**
- "Sacred Offering, not payment — a declaration to the universe that you're ready."
- Scarcity: *"This window won't stay open forever, {firstName}. The energy is strongest right now."*
- Close: *"This is your moment, {firstName}."*
- Permission-gate ritual (must click "Yes, please help me Evelyn!" before the price is shown).

**Objection handling → downsell (`claude-code-implementation-brief.md` case `PITCH`/`OBJECTION_HANDLING`):**
- `explicit_decline` at any point → GRACEFUL_EXIT (no downsell).
- Each non-decline objection: `objectionCount++`, Claude empathize/reframe/re-offer (adds urgency line at count≥2).
- **`objectionCount >= 3`** → DOWNSELL (swap CTA to $25 written reading).

---

## 5. Upsell 1 — Protection Ritual + Charged Volcanic Lava Stone

Source: `docs/upsell1.md` (full verbatim script); `ARCHITECTURE.md §3/§8`; `PRD.md §2 Stage 5, §9`;
`handover/01-platform-flowchart.md`.

- **Product:** Protection Ritual + charged volcanic **lava stone** (physical, shipped).
- **Price:** **$47** one-time (`4700` cents). No downsell on U1 (accept or decline only).
- **Route/trigger:** `/welcome1`, entered automatically after the $35 main purchase completes
  (`/api/upsell/user-data?session_id=...` marks `upsellOffered`). `PRD.md §5, §9` also names the
  physical SKU "Volcanic Stone (aka Black Lava)".
- **Payment:** **1-click off-session charge** reusing the main purchase's saved payment method
  (`paymentIntents.create $47 off_session`); **fallback** to a fresh Stripe Checkout ($47, with
  shipping) if the card requires authentication (`ARCHITECTURE.md §8`, `upsell1.md "Payment Flow"`).
- **~55–60 bot messages**, 3 interactive questions, `{firstName}`/`{personName}` interpolated.

**20-stage arc** (`upsell1.md "Stage Flow Diagram"`):
```
CONFIRMATION → GAP → RISK → Q1 → AFTER_Q1 → SOLUTION → LAVA_INTRO(+image) → Q2 → AFTER_Q2
→ RITUAL → FEEL → Q3 → AFTER_Q3 → BUCKET(-specific) → DELIVERY → OFFER(+CTA)
   ├─ Accept → SUCCESS → SHIPPING form → COMPLETE
   └─ Decline → SOFT EXIT
```
- **Core angle:** clearing removes the block, but leaves the field "open, raw" for 30 days → need a
  protective shield anchored to a physical lava stone.
- **3 questions** with quick replies + free text (intent → yes/maybe/unsure/default branches):
  Q1 "have you cleared something only to watch it return?"; Q2 "can you feel why this stone is meant
  for you?"; Q3 "are you ready to be protected?".
- **Bucket-specific stage:** wear the lava stone on the **LEFT wrist** ("receiving hand" — filters
  what comes IN); copy differs per love/money/purpose/someone.
- **CTA:** *"Yes, Protect What We Clear — $47 One-Time"*; decline link *"Not right now"*.
- **On accept:** shipping form (Name/Address/City/State/ZIP/Country) → COMPLETE (7 msgs) → proceeds
  to `/welcome2`.
- **Tracking (U1):** dedicated AWeber list `6937139`, tag `seer-within-upsell` (`PRD.md §6`,
  `u1-u2-system-test-spec.md §6`); FB `Upsell`-type event, `metadata.product = protection_ritual`
  (`u1-u2-system-test-spec.md §6–7`).

> **Later A/B variant (NOT baseline):** `u1-heart-opening-rose-quartz-sidebyside.md` + `u1-u2-system-test-spec.md`
> define an Arm B that swaps U1 to a **Heart-Opening Ritual + Rose Quartz** (hope-frame, LEFT wrist,
> `metadata.product = heart_opening_ritual`) and repositions U2 as "broadcast". The **baseline/control
> (Arm A) is lava + manifest**, unchanged. Only surface Arm B if auditing that experiment.

---

## 6. Upsell 2 — Manifestation Bracelet

Source: `docs/upsell-2-manifestation-bracelet.md` (full script); `upsell2.md` (root, 33-stage as-built);
`ARCHITECTURE.md §8`; `handover/01-platform-flowchart.md`.

- **Product:** Manifestation Bracelet — **8 attraction stones** attuned to the buyer's desire during
  the clearing. Physical, shipped. Worn on the **RIGHT wrist** ("broadcasting/giving side").
- **Price:** **$47** full (`4700`), **$30** downsell (`3000`). Pricing enforced **server-side**
  (client cannot override) — `upsell2.md "Pricing"/"Security"`.
- **Route/trigger:** `/welcome2`, entered immediately after U1 whether U1 was bought or declined.
- **The trilogy positioning** (`upsell-2… "The Trilogy"`): Clear (main, past) → Protect (U1, present)
  → **Attract (U2, future)**.
- **8 stones:** Amethyst, Citrine, Hematite, Tiger's Eye, Green Aventurine, Pyrite, Clear Quartz,
  Malachite (roles table in source).

**Two entry paths** (`upsell2.md "Entry Paths"`, `upsell-2… "Phase 1&2"`):
- **Path A** — bought U1 ($35 + $47): high trust; opening references "both rituals confirmed";
  **reuses U1 shipping** (`shipping1` fields). Adds a "complete circuit" line (lava LEFT filters IN +
  bracelet RIGHT broadcasts OUT). Decline/exit → `/success`.
- **Path B** — bought main only, declined U1: hope-over-fear register; opening reframes as "something
  else I saw"; **collects new shipping** into `shipping2` fields. Decline → **graceful exit (END)**.

**Stage flow (`upsell2.md`, 33 stages; both paths merge at Phase 3):**
```
INIT(/api/upsell2/user-data) → PATH_A_OPEN | PATH_B_OPEN → GAP → Q1 → AFTER_Q1
→ INTRODUCE(+bracelet image) → STONES → Q2 → AFTER_Q2
→ MANIFEST_REVEAL (Claude, bucket-specific) → RITUAL_INSTRUCTION (Path A extra) → WHAT_RECEIVE
→ Q3 → AFTER_Q3 → MANIFEST_PERSONALIZE (Claude) → SOCIAL_PROOF → PRICE → URGENCY → CTA($47)
   ├─ Buy $47 → Stripe → /success
   ├─ Decline → /success (Path A) or graceful exit (Path B)
   └─ Objection ×2 → DOWNSELL_CTA($30) → buy → /success  | decline/one more objection → accept decline → exit
```

**The 3 interactive questions** (`upsell-2… Phase 4b / 6b / 9b`; quick replies + free text):
1. **Q1 (the gap):** *"can you feel the difference between removing something and calling something
   in? Between being safe... and actually having what you want?"* — replies: `[Yes, I feel it]
   [I think so] [What do you mean?]` (intent: yes/maybe/what/default).
2. **Q2 (the stones):** *"did any of them stand out? Did one feel like it was speaking directly to
   you?"* — replies: `[Yes, one stood out] [They all resonate] [Tell me more]` (yes/all/more/default).
3. **Q3 (readiness):** *"Are you ready to stop waiting for what you want... and start calling it
   in?"* — replies: `[Yes, I'm ready] [I think so] [What exactly will I receive?]`
   (yes/maybe/what/default).

- **2 Claude API actions:** `manifestReveal` (what's trying to reach them, per bucket) and
  `manifestPersonalize` (which stone matters most, per bucket).
- **Downsell trigger:** **2 objections** (vs 3 for the main offer) → $30 "already-prepared, not
  fully-attuned" bracelet.
- **CTA:** *"Claim My Manifestation Bracelet — $47"* (gold/amber gradient); downsell *"— $30"*;
  guarantee row *"🔒 30-Day Guarantee | Free Shipping | 100% Secure"*.
- **Tracking (U2):** dedicated AWeber list `6939683`, tags `seer-within-upsell2` +
  `bracelet-full`/`bracelet-downsell` (`upsell2.md "AWeber Integration"`); FB **Purchase** event,
  `content_name = 'Manifestation Bracelet'`, `metadata.product = manifestation_bracelet`, sessionStorage
  dedup guard.

---

## 7. Email capture / lead / tracking touchpoints

Sources: `PRD.md §5–6`; `ARCHITECTURE.md §3`; `fb-events-aiden-evelyn-plan-2026-05-13.md`;
`upsell1.md`, `upsell2.md`, `dual-system-architecture.md`.

**Lead / email capture:**
- Email is captured **inline in the chat** at the EMAIL_CAPTURE phase (after bucket, before deepening)
  — `WIREFRAMES.md §3`, A1. Validated (`@` and `.`) before proceeding.
- Client posts `/api/lead` (email, firstName, bucket) → `saveConversation` → **AWeber
  `addSubscriberToList` (non-blocking)**, tagged **bucket-type + `seer-within`** (`PRD.md §6`,
  `ARCHITECTURE.md §3`). Main list = `theseerwithin_free` (`6936953`, per repo memory/AWeber docs).
- On main purchase → `addPaidSubscriber` (non-blocking). U1 → list `6937139`. U2 → list `6939683`.
- **Price-split note (`v1-price-split-test-PRD.md §5.3`):** `/api/lead` also **returns the assigned
  price variant** (idempotent per email) — the client reads its price from this response before pitch.

**Facebook tracking (dual: client Pixel + server Conversions API, event_id dedup):**
Source `PRD.md §6`, `fb-events-…md`. Pixel ID `446814716830295`; GTM `GTM-WVPGCFHW` also loaded.

| Event | Fires when | Where |
|---|---|---|
| **PageView** | on route navigation (allow-listed routes only) | `App.tsx` |
| **Lead** | email captured in chat | `useConversation.ts` (`/api/lead`) |
| **InitiateCheckout** | user clicks purchase CTA | `useConversation.ts` |
| **Purchase** | payment success / upsell page load after $35 | `UpsellPage.tsx` (U1), `trackUpsell2Purchase` (U2) |

- Dedup via shared `event_id` between Pixel and CAPI (`/api/fb-event`, `server/lib/facebook.ts`).
- U1 fires an FB **Upsell**-type event (`upsell_u1_*` id, `/welcome2` source url); U2 fires
  **Purchase** with `content_name = 'Manifestation Bracelet'` (`u1-u2-system-test-spec.md §6`,
  `upsell2.md`).
- **Caveat (`fb-events-…md`):** `client/index.html` has NO Pixel `PageView` auto-fire (only
  `fbq('init')`); V2 surfaces (`/reading`,`/credits`,`/personas`) stay quiet.

---

## 8. Documented invariants (things that "must be true")

Distilled from the cited docs; these are the highest-value drift checks.

**Pricing (canonical):**
1. Main offer = **$35** (`3500` cents); downsell = **$25** (`2500`), offered only after **3
   objections**. (`PRD.md §9`, `v1-price-split-test-PRD.md §2/§4`).
2. Upsell 1 = **$47** (`4700`), no downsell. (`upsell1.md`, `PRD.md §9`).
3. Upsell 2 = **$47** full (`4700`) / **$30** downsell (`3000`), downsell after **2 objections**;
   **enforced server-side**. (`upsell2.md`, `upsell-2… Phase 13`).
4. Downsell ratio for the price-split arms ≈ **71%** of main, rounded ($45→$32, $59→$42).
   (`v1-price-split-test-PRD.md §2`).
5. Price-variant assignment is **idempotent per email** — a returning visitor keeps their original
   variant. (`v1-price-split-test-PRD.md §5.4`). Config-absent ⇒ falls back to hard-coded $35/$25.

**Flow structure:**
6. Order of gates: name → bucket → (person name if `someone`) → **email before any deep reading** →
   deepening/reading → future-pacing → crisis → **permission gate** → pitch. Email is captured before
   the paid pitch. (`claude-code-implementation-brief.md`, `WIREFRAMES §3`).
7. Pitch is **permission-gated**: the price is never shown until the user clicks the permission button.
   (`claude-code-implementation-brief.md handlePermission`).
8. The 4 buckets `love|money|purpose|someone` and their 16 sub-buckets are fixed; `someone` requires a
   captured `{personName}` used throughout. (`bucket-enhancement-addon.md`).
9. Both upsells: **1-click off-session charge first, Stripe Checkout fallback**; both collect+persist
   shipping (Path A reuses U1 shipping). (`ARCHITECTURE.md §8`, `upsell1.md`, `upsell2.md`).
10. Upsell 2 downsell threshold (**2**) is deliberately lower than the main-offer downsell threshold
    (**3**). (`upsell-2… Phase 13` vs `PRD.md §9`).

**Persona / copy invariants:**
11. Evelyn NEVER admits to being AI/bot/program; on "are you real/AI?" she deflects in-character.
    (`claude-code-implementation-brief.md EVELYN_BASE_PROMPT "Absolute Rules"`).
12. AI reading messages are **≤25 words each** and use the user's name. (`bucket-enhancement-addon.md`
    prompt builders).
13. Main offer promises: written reading by **email within 24 hours** + **30-day money-back
    guarantee**. (`OFFER_EXPLANATION`, `PITCH_MESSAGES.guarantee`, `WIREFRAMES §4`).
14. The trilogy narrative must stay coherent: Clear (past) → Protect (present) → Attract (future);
    lava = LEFT wrist (receive), bracelet = RIGHT wrist (broadcast). (`upsell-2… "The Trilogy"/"Right
    Wrist"`, `upsell1.md "BUCKET-SPECIFIC"`).
15. Business entity / support fixed: Cosmo Numerology Pte Ltd; support@cosmonumerology.com;
    legal pages `/privacy` `/terms` `/refund`. (`PRD.md §10`, `WIREFRAMES §6`).

---

## 9. Conflicts, drift & addenda that changed original intent (consolidated)

| # | Topic | Original intent | Later / as-built | Verdict |
|---|---|---|---|---|
| C1 | **Downsell price** | `claude-code-implementation-brief.md /api/checkout` charged **$17** (`1700`) and `DownsellCTA` said **"— $17"**. | `PRD.md §9` = **$25**; `Front end Price-Split test` flags the `$17` button vs `$25` server mismatch as a bug; `v1-price-split-test-PRD.md §4` confirms **DownsellCTA fixed to $25**. | **Canonical = $25.** The `$17` is a superseded early bug. |
| C2 | **Main-offer name** | "Sacred Clearing Ritual" (A1/A3/B1); CTA "Begin My Sacred Clearing - $35". | "**Energy Clearing Ritual**"; CTA "Begin My Energy Clearing - $35" (`v1-price-split-test-PRD.md §4`). WIREFRAMES card = "Deep Personal Reading" (`$97→$35`). | Live copy = **"Energy Clearing"**; "Sacred Clearing" is legacy; "Deep Personal Reading" is a marketing label. Flag any code still saying "Sacred Clearing". |
| C3 | **Guarantee length** | Most docs = **30-day** (`OFFER_EXPLANATION`, WIREFRAMES, upsell copy). | `Front end Price-Split test` quotes a live prompts.ts line: *"It's $35, and comes with my **60-day** guarantee"*. | **Conflict.** Baseline intent = 30-day; a 60-day string may exist in code. Worth a drift check. |
| C4 | **Upsell routes** | `WIREFRAMES §5` = `/upsell` (+`/upsell2`). | `/welcome1`, `/welcome2` (`handover/01-platform-flowchart.md`, `ARCHITECTURE §8`, `CLAUDE.md`). | Canonical = **`/welcome1` / `/welcome2`**. |
| C5 | **Chat AI action names** | A1: `reading` / `crisis` / `objection`. | `ARCHITECTURE §3` as-built: `reading1,reading2,futureValidation,crisisReveal,crisisCost,crisisUrgency,shadowSummary,valueExplain,objection`. | Use the **finer as-built set**; A1's names are the early prototype. |
| C6 | **Framework** | `claude-code-implementation-brief.md` assumes **Next.js 14 App Router** (`/app/api/...`). | Actual stack is **Vite + React + Express** (`server/routes.ts`, `client/src/...`) per `ARCHITECTURE`, `CLAUDE.md`. | The brief's *logic/copy* is authoritative; its *file paths/framework* are not — map to Express/Vite. |
| C7 | **Deepening rounds** | `PRD.md §7` implies 3 (`deepening_1..3`); flowchart "2–3 rounds". | A1 implements 1 deepening + 1 future-pacing before crisis. | Treat "2–3 deepening exchanges" as the intent band; exact count is soft. |
| C8 | **Bucket labels/emoji** | A1 `BUCKET_LABELS` (💕💎🌟🔮). | `WIREFRAMES §2` (❤️💰✨👤, "Money & Career"). | Minor cosmetic drift; bucket keys invariant. |
| C9 | **Price of main is variable now** | Fixed $35. | 3-way split $35/$45/$59 (weights in `system_config.v1_price_variants`), assigned at `/api/lead`. | If the split test is live, `$35` is no longer a hard invariant — the **variant→charge→CTA→pitch→FB-value must all match** (`v1-price-split-test-PRD.md §4`). |
| C10 | **U1/U2 system A/B** | Baseline = Lava (U1) + Manifest (U2). | Arm B = Rose-Quartz Heart-Opening (U1) + Broadcast (U2), 50/50, `upsell1_theme`/`upsell2_theme` stamped on the row (`u1-u2-system-test-spec.md`). | Baseline audit target = **Arm A (lava/manifest)**. Arm B is an experiment layered on top. |

---

## 10. One-page summary (the intended V1 flow)

Landing ("Begin Your Free Reading") → `/chat`: Evelyn greets (geo/time Barnum) → captures first name →
4 bucket buttons (love/money/purpose/someone; `someone` also captures a person's name) → captures
**email** (fires Lead + assigns price variant) → 1–2 deepening reading rounds (Claude, ≤25-word
Barnum/sub-bucket cold reads) → future-pacing question → **crisis reveal** (bucket-specific shadow +
urgency) → **permission gate** → **pitch $35 "Energy Clearing Ritual"** (24-hr email reading + 30-day
guarantee, scarcity) → objections handled warmly; **3 objections → $25 downsell**; explicit decline →
graceful exit. Purchase → Stripe → **`/welcome1` Upsell 1** ($47 Protection Ritual + lava stone, 20
stages, 3 questions, LEFT-wrist framing, 1-click/fallback, shipping) → **`/welcome2` Upsell 2** ($47/$30
Manifestation Bracelet, Path A reuses shipping / Path B collects it, 3 questions, 2 Claude reveals,
RIGHT-wrist framing, **2 objections → $30 downsell**) → **`/success`**. FB Pixel+CAPI fire
PageView/Lead/InitiateCheckout/Purchase (dedup by event_id); AWeber tags leads `seer-within`, U1
`seer-within-upsell`, U2 `seer-within-upsell2`.

*Baseline reconstructed from docs only (no source code read), per audit brief. Prepared for
drift-comparison against the live implementation.*

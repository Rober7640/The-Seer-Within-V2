# V1 Conversion Funnel — CURRENT Implementation (as coded today)

**Scope:** Documents how the "Evelyn Cross" V1 psychic-reading conversation flow ACTUALLY works in code today, for drift-diffing against the intended baseline. Every claim carries a `file:line` citation. Nothing here is aspirational — it is traced from the source.

**Key files:**
- Client state machine: `client/src/hooks/useConversation.ts`
- Client page shell: `client/src/pages/ChatPage.tsx`
- Client intent classifier: `client/src/lib/intent.ts`
- Client funnel/email-gate helpers: `client/src/lib/funnel.ts`
- Server chat route: `server/routes.ts` (`POST /api/chat` at line 392)
- Server Claude wrapper: `server/lib/claude.ts`
- Server prompt builders: `server/lib/prompts.ts`
- Model resolution: `server/lib/modelConfig.ts`
- Price A/B: `server/lib/priceVariant.ts` + `server/lib/experiments.ts`
- Output safety rewrite: `server/lib/predictionSanitizer.ts`
- Upsell 1 hook: `client/src/hooks/useUpsellChat.ts`; page `client/src/pages/UpsellPage.tsx`
- Upsell 2 hook: `client/src/hooks/useUpsell2Chat.ts`; page `client/src/pages/Upsell2Page.tsx`

---

## 1. Client State Machine (`useConversation.ts`)

### 1.1 Full phase enumeration + transitions

Initial state is `INIT` (`useConversation.ts:72`). Two mount-time effects branch on whether a saved session exists:
- **Restore path** (`useConversation.ts:211-269`): a saved session with a `firstName` triggers a "welcome back" sequence. Branches on prior state: `GRACEFUL_EXIT` → re-enter `PITCH` with CTA (`:228-242`); `PITCH`/`OBJECTION_HANDLING`/`DOWNSELL` → re-show CTA (`:243-255`); otherwise resume mid-conversation (`:256-262`). Session persisted in `localStorage` key `seer_conversation`, 24-hour expiry (`:25-26`, `:53-56`).
- **Fresh path** (`useConversation.ts:273-351`): geo lookup, then `state='GREETING'`, then name-capture. There is a `/fb-palm` branch (`:299-324`) that replaces the intro for palm "quiz-bridge" traffic — Version A/B/C openers, Version C entering a distinct `PALM_REFLECT` state (`:305-311`).

**Standard (non-palm) phase sequence** and transition triggers:

| # | State | Set at | Trigger to advance | Next state |
|---|-------|--------|--------------------|-----------|
| 1 | `INIT` → `GREETING` | `:281` | greeting messages sent | `NAME_CAPTURE` |
| 2 | `NAME_CAPTURE` | `:343` | user types name → `handleNameCapture` (`:355`) | `BUCKET_SELECTION` (`:413`) |
| 3 | `BUCKET_SELECTION` | `:413` | bucket button click → `handleBucketSelect` (`:1219`) | `PERSON_NAME_CAPTURE` if `someone`, else `EMAIL_CAPTURE`, else `DEEPENING_1` if `skipEmail()` |
| 3b | `PERSON_NAME_CAPTURE` | `:1275` | types person name → `handlePersonNameCapture` (`:466`) | `EMAIL_CAPTURE` (or `DEEPENING_1` if `skipEmail()`) |
| 4 | `EMAIL_CAPTURE` | `:399/:494/:1298` | valid email → `handleEmailCapture` (`:502`) | `DEEPENING_1` (`:585`) |
| 5 | `DEEPENING_1` (alias `DEEPENING`) | `:585` | free text → `handleDeepening1` (`:595`) — **calls `/api/chat` `reading1`** | `DEEPENING_2` (or `BUCKET_CLARIFICATION` if mismatch) |
| 6 | `DEEPENING_2` | `:668` | free text → `handleDeepening2` (`:676`) — **`reading2`** | `FUTURE_PACING` (`:735`) |
| 7 | `FUTURE_PACING` | `:735` | free text → `handleFuturePacing` (`:742`) — **`futureValidation`** | `FUTURE_VALIDATION` (`:801`) |
| 8 | `FUTURE_VALIDATION` | `:801` | free text → `handleFutureValidation` (`:808`) — **`crisisReveal`** | `CRISIS_REVEAL` (`:873`) |
| 9 | `CRISIS_REVEAL` | `:873` | free text → `handleCrisisReveal` (`:880`) — **`crisisCost`** | `CRISIS_COST` (`:944`) |
| 10 | `CRISIS_COST` | `:944` | free text → `handleCrisisCost` (`:952`) — **`crisisUrgency`** unless intent is `positive` | `PERMISSION_ASK` (`:1010/:1032`) |
| 11 | `PERMISSION_ASK` | `:1011/:1033` | permission button → `handlePermission` (`:1308`) — **`shadowSummary` + `valueExplain`** | `PITCH` (`:1367`) |
| 12 | `PITCH` (& `OBJECTION_HANDLING`) | `:1368` | free text → `handlePitchResponse` (`:1039`) — **`objection`** | stays / `DOWNSELL` / `GRACEFUL_EXIT` |
| — | `BUCKET_CLARIFICATION` | `:661` | bucket button → `handleBucketSelect` re-clarify branch (`:1228`) | `DEEPENING_1` |
| — | `DOWNSELL` | `:1119` | shows downsell CTA | terminal-ish |
| — | `GRACEFUL_EXIT` | `:1087` | user explicitly declined | terminal |
| — | `END` | `:602` etc. | crisis-safety intent at any handler | terminal |
| — | `PALM_REFLECT` | `:307` | palm V-C answer → `handlePalmReflect` (`:425`) — **`palmReflect`** | `NAME_CAPTURE` |

Main input dispatcher: `handleSend` switch at `useConversation.ts:1160-1199`.

### 1.2 How many `/api/chat` calls, and with what payload

Each network call is `POST /api/chat` with an `action` field (NOT `phase`/`type` — those names are not used on this route). Enumerated:

| Handler | `action` sent | Extra payload | Line |
|---------|---------------|---------------|------|
| `handlePalmReflect` | `palmReflect` | `palmSign, palmHook, palmThumb, userData, input` | `:433-444` |
| `handleDeepening1` | `reading1` | `userData(+concern), input` | `:641-649` |
| `handleDeepening2` | `reading2` | `userData(+deeperResponse), input` | `:721-729` |
| `handleFuturePacing` | `futureValidation` | `userData(+desires), input` | `:787-795` |
| `handleFutureValidation` | `crisisReveal` | `userData(+emotionalResponse), input` | `:859-867` |
| `handleCrisisReveal` | `crisisCost` | `userData(+blockSource), input` | `:931-939` |
| `handleCrisisCost` | `crisisUrgency` | `userData(+commitmentResponse), input` | `:1019-1027` (skipped if `positive`) |
| `handlePermission` | `shadowSummary` | `userData` | `:1321-1329` |
| `handlePermission` | `valueExplain` | `userData` | `:1355-1363` |
| `handlePitchResponse` | `objection` | `userData, input, objectionCount` | `:1130-1139` |

**Standard full-funnel LLM call count = 8** (`reading1`, `reading2`, `futureValidation`, `crisisReveal`, `crisisCost`, `crisisUrgency`, `shadowSummary`, `valueExplain`), or **7** if the user answers `CRISIS_COST` positively (skips `crisisUrgency`, `:1003-1016`), plus 1 per objection (max ~3 before forced downsell). Palm V-C adds 1 (`palmReflect`).

The pitch block itself is mostly **hardcoded client strings**, not an LLM call — `handlePermission` sends static messages at `:1315-1318`, `:1334-1338`, `:1341-1344`, and the price line `:1347-1352` (which reads `chat.userData.priceDollars ?? 35`). Only `shadowSummary` and `valueExplain` inside it are LLM-generated.

### 1.3 Intent / classification logic (`client/src/lib/intent.ts`)

`detectIntent()` (`intent.ts:66-150`) is a **client-side regex classifier**, evaluated in priority order:
1. `crisis_safety` — self-harm regex (`:70`), checked FIRST.
2. `inappropriate` — sexual content directed at Evelyn (`:76-79`).
3. `gibberish` — `isGibberish()` heuristics: repeated chars, keyboard mashing, low vowel ratio (`:38-64`, `:82`).
4. `too_short` — thin single-word/short input, with allow-lists for valid short affirmatives and time answers (`:88-102`).
5. `positive` (`:105`), `clarification` (`:110`), `ai_question` (`:115`), `price_question` (`:120`), `explicit_decline` (`:125`), `objection_price` (`:130`), `objection_skepticism` (`:135`), `objection_info` (`:140`), `wants_more_free` (`:145`), else `unknown` (`:149`).

Each DEEPENING/CRISIS handler runs the same guard ladder (crisis→inappropriate→gibberish→too_short→ai_question→price_question, plus `clarification` in the later handlers) BEFORE calling the LLM (e.g. `:600-634`). Canned responses come from `intent.ts` (`getGibberishResponse`, `getAIDeflectionResponse`, `getCrisisSafetyResponse`, `getPriceQuestionResponse`, etc.). `sanitizeInput()` (`intent.ts:4-20`) strips injection tokens and truncates to 1000 chars before every LLM call.

`handlePitchResponse` (`:1039-1147`) has its own branch set: `positive` → "click the button" nudge; `explicit_decline` → `GRACEFUL_EXIT`; `wants_more_free` → withhold; otherwise increments `objectionCount` and after **>= 3 objections** forces `DOWNSELL` (`:1111-1125`).

### 1.4 Model used

The client does not pick a model. Server-side, `callClaude` uses `getModelForOperation('conversation')` (`claude.ts:39`). That resolves to `system_config.default_conversation_model`, cached 60s, falling back to hardcoded **`claude-sonnet-4-5-20250929`** (`modelConfig.ts:28`, `:150-160`). Basic/greeting fallback is `claude-haiku-4-5-20251001` (`modelConfig.ts:29`). `max_tokens: 1000` (`claude.ts:40`). Note: this is Sonnet 4.5, **not** the `claude-sonnet-4-20250514` named in `CLAUDE.md`.

---

## 2. Server `/api/chat` Handler (`server/routes.ts:392-501`)

- Destructures `{ action, userData, input, objectionCount, palmSign, palmHook, palmThumb }` (`:394`).
- **Price enrichment**: if `userData.email` present, calls `getVariantForEmail(email)` and overwrites `userData.priceDollars`/`downsellDollars` server-side (`:400-404`) so price-quoting prompts (objection handling) always use the assigned variant.
- **Universal safety**: runs `checkAndLogSafety(input, …)` (`:407-420`); if unsafe returns the safety response and short-circuits.
- **Dispatch** is a `switch(action)` (`:428-492`):
  - `reading1`→`generateReading1`, `reading2`→`generateReading2`, `futureValidation`→`generateFutureValidation`, `crisisReveal`→`generateCrisisReveal`, `crisisCost`→`generateCrisisCost`, `crisisUrgency`→`generateCrisisUrgency`, `shadowSummary`→`generateShadowSummary`, `valueExplain`→`generateValueExplain`, `palmOpener`→`generatePalmOpener`, `palmReflect`→`generatePalmReflect`.
  - Legacy branches: `reading`→`generateReading1` (`:481`), `crisis`→`generateCrisis` (`:484`) — **the `crisis` action/`generateCrisis`/`buildCrisisPrompt` legacy path is still wired here but the client never sends `action:'crisis'`** (dead server branch).
  - `objection`→`handleObjection` (`:487`), default → 400.
- Response shape: `{ messages: string[], needsClarification?, detectedTopic? }` — `subBucket` also flows back from `reading1` (`claude.ts:53-60`). On any error returns fallback `{messages:["I sense something shifting...", ...]}` (`:497-499`).
- `palmOpener`/`palmReflect` validate sign/hook/thumb against fixed enums before injecting (`:451-476`).

**Claude call path** (`claude.ts:35-74`): each `generateX` builds a prompt then `callClaude` runs `anthropic.messages.create` behind a **circuit breaker + failover wrapper** (`fireWithBreaker(anthropicBreaker, …)`, `:37`), parses the first `{...}` JSON block, and passes `parsed.messages` through **`sanitizePredictionsV1`** (`:55`) — a regex output-rewriter (`predictionSanitizer.ts:17-48`) that neutralizes guarantees, medical/legal/financial advice, and death predictions on EVERY V1 message. On parse/circuit failure returns generic fallback messages (`:65`, `:76-82`).

---

## 3. `prompts.ts` — phase builders & bucket logic (as coded)

- `EVELYN_BASE_PROMPT` (`prompts.ts:10-65`): persona, safety overrides, "≤25 words per message", "return JSON `{messages:[...]}`".
- 4 bucket prompts with **sub-bucket keyword detection**: `LOVE` (SEEKING_LOVE/RELATIONSHIP_TROUBLE/LOST_LOVE/BETRAYAL, `:71-125`), `MONEY` (CAREER/FINANCIAL_STRESS/OPPORTUNITY/BLOCKED_ABUNDANCE, `:131-184`), `LIFEPATH` (`purpose` bucket, `:190-243`), `SOMEONE` (THEIR_FEELINGS/REUNION/TRUST_TRUTH/NON_ROMANTIC, `:249-308`). Mapped in `BUCKET_PROMPTS` (`:314-319`).
- Phase builders and **message counts requested**:
  - `buildReading1Prompt` (`:374-427`): 3-step task — mismatch check (`needsClarification`), sub-bucket detect, then **4-5 messages** (acknowledge → 2-3 cold reads → hint → end on follow-up question). Returns `subBucket`.
  - `buildReading2Prompt` (`:433-465`): **4-5 messages** ending on a future-pacing question.
  - `buildFutureValidationPrompt` (`:471-507`): **3 messages**, must END on emotional question.
  - `buildCrisisRevealPrompt` (`:513-574`): **4 messages** (validate emotion → bridge → name the block → source question); explicitly bans "But… wait / Something's shifting" pattern-interrupts (`:535-539`).
  - `buildCrisisCostPrompt` (`:580-621`): **4 messages** ending on yes/no commitment question.
  - `buildCrisisUrgencyPrompt` (`:627-667`): **4-5 messages** building urgency → permission ask.
  - `buildShadowSummaryPrompt` (`:673-722`): **3 messages** naming the specific block; ≤30 words each.
  - `buildValueExplainPrompt` (`:919-982`): **exactly 2 messages** (vivid vision + crossroads question).
  - `buildObjectionPrompt` (`:988-1048`): objection-type detection; injects `Current offer price: $${mainPrice} (downsell $${downsellPrice})` from `userData.priceDollars ?? 35` / `downsellDollars ?? 25` (`:989-990`, `:1001`).
  - Palm: `buildPalmOpenerPrompt` (`:844-879`), `buildPalmReflectPrompt` (`:883-913`).

**Dead/legacy in this file:** `getOfferExplanation` (`:325-334`) and `getPitchMessages` (`:340-368`) are exported but **referenced nowhere** (grep-confirmed) — the live pitch is the hardcoded strings in `handlePermission`. `buildReadingPrompt` (`:1054`) and `buildCrisisPrompt` (`:1058-1084`) are labelled "LEGACY". `buildManifestRevealPrompt`/`buildManifestPersonalizePrompt` (`:1090-1157`) power Upsell 2.

---

## 4. Offer / Pitch pricing (what is ACTUALLY served)

**Default (ships-dark):** main **$35 / downsell $25**. Sourced from `FALLBACK_VARIANT` `{priceCents:3500, downsellCents:2500}` (`priceVariant.ts:43-49`) and hardcoded client fallbacks `priceDollars ?? 35` / `downsellDollars ?? 25` (`ChatPage.tsx:234,242`; `useConversation.ts:1347,1380-1381`).

**Where price comes from, in order:**
1. **`/api/lead`** assigns a sticky variant per email via `assignVariantIfMissing(email, funnel)` (`routes.ts:764`) and returns `{priceDollars, downsellDollars}` (`:859-864`), which the client stores into `userData` (`useConversation.ts:538-544`).
2. **Weighted pool**: `system_config.v1_price_variants` JSON, funnel-scoped (`priceVariant.ts:72-146`, `scopeVariantsToFunnel`). If missing or all-zero weight → `$35/$25` fallback. Assignment is idempotent/sticky, persisted to `conversations.priceAmountCents/downsellAmountCents/priceVariant` (`:239-248`).
3. **Framework override (draft/off today)**: `resolveV1Price` (`experiments.ts:714-737`, key `v1_main_price_2026`) can override the weighted price when the experiment is `running`; otherwise byte-identical to the legacy split. Exposure logged to `experiment_exposures` (`priceVariant.ts:255-259`).
4. **`/api/checkout`** re-reads the sticky variant via `getVariantForEmail` (`routes.ts:609-613`) for the actual Stripe charge; falls back to `3500/2500`. Stripe line item uses `unit_amount: priceAmount` (`:646`), stamps `priceVariant` into metadata (`:665,:680`).

So the **price served today is $35/$25 unless a `v1_price_variants` config row is live**; all A/B machinery (`v1_main_price_2026`, `u1_price_2026`) ships in a draft/OFF state.

---

## 5. Upsell 1 & Upsell 2 (actual behavior)

### Upsell 1 — Protection Ritual + Volcanic Lava Stone (`useUpsellChat.ts`)
- **Fully static scripted flow — NO Claude call.** All copy from `@/lib/upsellMessages`. Stage machine (`processStage`, `:179-312`): `CONFIRMATION → GAP → RISK → QUESTION_1 →(WAITING_Q1)→ AFTER_Q1 → SOLUTION → LAVA_INTRO(+image) → QUESTION_2 →(WAITING_Q2)→ AFTER_Q2 → RITUAL → FEEL → QUESTION_3 →(WAITING_Q3)→ AFTER_Q3 → BUCKET → DELIVERY → OFFER → CTA`.
- **3 interactive questions** (Q1/Q2/Q3), each with quick-reply options + free text; answers classified by `detectQ1Intent/Q2/Q3` (`:321-328`) to pick a canned `AFTER_Qn` branch.
- Accept → `POST /api/upsell/charge` 1-click (`:357-366`) → on success shows shipping form → COMPLETE; on `fallback` opens `/api/upsell/fallback-checkout` hosted Stripe (`:379-396`). Decline → soft `DECLINED` then complete.
- **Price = $47 default**, variant-aware. Charge reads `getVariantForEmail(email).upsell1Cents` (`routes.ts:1398-1400`, default `4700`); displayed via `upsell1PriceCents` (`UpsellPage`→hook `:102`, `formatUpsellPrice`). A **$37 arm exists** via `resolveUpsell1Cents` / `u1_price_2026` experiment (`experiments.ts:653-668`, `priceVariant.ts:209-216`) — OFF by default → $47.
- Stripe: uses saved card PaymentIntent (`routes.ts:1477` `amount: upsell1Cents`); fallback-checkout builds a Checkout Session (`:1633` `unit_amount: upsell1Cents`). Product name `Protection Ritual + Volcanic Stone${fbSuffix(funnel)}` (`:1393,:1598`).

### Upsell 2 — Manifestation Bracelet (`useUpsell2Chat.ts`)
- **Path A vs Path B** decided by `isPathA = userData.upsellPurchased === true` (`:98`): mount picks `PATH_A_OPEN` (bought U1, has shipping) or `PATH_B_OPEN` (declined U1, needs shipping) (`:602-613`).
- Stage machine (`:196-364`): `PATH_x_OPEN → MANIFEST_REVEAL → GAP → QUESTION_1 → AFTER_Q1 → INTRODUCE(+image) → STONES → QUESTION_2 → AFTER_Q2 → MANIFEST_PERSONALIZE → RITUAL_INSTRUCTION(+Path-A extra) → WHAT_RECEIVE → QUESTION_3 → AFTER_Q3 → SOCIAL_PROOF → PRICE → URGENCY → CTA`.
- **Uses Claude twice**: `MANIFEST_REVEAL` and `MANIFEST_PERSONALIZE` call `POST /api/upsell2/reading` (`:166-194`) → `generateManifestReveal` / `generateManifestPersonalize` (`routes.ts:1909-1946`). Static fallback lines if the call returns nothing (`:220-224`, `:290-294`).
- **3 interactive questions** (Q1/Q2/Q3, quick replies + free text) classified by `detectU2Q1/Q2/Q3Intent`.
- Decline is a **2-step objection→downsell**: first decline → `OBJECTION_1` shows downsell CTA (`:347-353,:484-499`); second decline → `DECLINED`.
- **Prices hardcoded, NO A/B**: `/api/upsell2/charge` sets `amount = type === "full" ? 4700 : 3000` → **$47 full / $30 downsell** (`routes.ts:1962`). Full accept sends `type:"full"` (`:427`), downsell sends `type:"downsell"` (`:516`). Path A + hasShipping skips the shipping form (`:436-439`).

### Shared / suffixes
Product names get a per-funnel suffix via `fbSuffix(funnel)` (`routes.ts:194`, `:593,:1393,:2048`) — "- FB"/"- FB2"/"- GDN" for finance attribution. No hardcoded `STRIPE_PRICE_ID_*` are used in the V1 chat path; all charges use dynamic `price_data`/`unit_amount` (the env `STRIPE_PRICE_ID_15MIN/30MIN` in CLAUDE.md belong to the V2 credit system, not this funnel).

---

## 6. Suspected DRIFT from a simple documented baseline

1. **Model mismatch.** Live model resolves to `claude-sonnet-4-5-20250929` (DB `default_conversation_model` / hardcoded fallback, `modelConfig.ts:28`), while `CLAUDE.md` documents `claude-sonnet-4-20250514`. The doc is stale.

2. **Dead pitch builders vs. hardcoded pitch.** `getPitchMessages` and `getOfferExplanation` (`prompts.ts:325-368`) are exported but unused anywhere. The actual pitch is hand-written inline in `handlePermission` (`useConversation.ts:1315-1352`). Anyone editing the "documented" pitch builder changes nothing live.

3. **Stale duplicated client-side prompts file.** `client/src/lib/prompts.ts` exists (mirrors server prompts incl. `buildCrisisPrompt`) but is **imported by nothing** (grep-confirmed) — a dead copy that can drift silently from the server source of truth.

4. **Legacy `crisis` server branch still wired but unreachable.** `POST /api/chat` still dispatches `action:'crisis'`→`generateCrisis`→`buildCrisisPrompt` (`routes.ts:484-485`), which uses the banned "But... hold on / Something's shifting" pattern-interrupt (`prompts.ts:1074-1084`) that the CURRENT `buildCrisisRevealPrompt` explicitly forbids (`prompts.ts:535-539`). The client never sends `crisis`, so it's dormant, but it contradicts the current crisis design.

5. **Heavy A/B & funnel machinery layered over a "simple" flow.** Price is no longer a constant $35/$25 — it flows through `assignVariantIfMissing` → weighted `system_config` pool → `resolveV1Price`/`resolveUpsell1Cents` framework overrides, stickied per-email on `conversations` (`priceVariant.ts`, `experiments.ts`). Plus a `?noemail=1` email-gate arm that skips `EMAIL_CAPTURE` entirely and routes straight to `DEEPENING_1` (`funnel.ts:45-64`; `useConversation.ts:378-390,:471-485,:1279-1290`), and the `/fb-palm` Version A/B/C bridge that rewrites the greeting and can add a `PALM_REFLECT` LLM turn before name capture (`useConversation.ts:299-324,:425-464`). Any "baseline flow" doc that describes a single linear email-gated path understates what actually runs.

**Honorable mentions (not necessarily drift, but non-obvious):**
- Output of every V1 LLM turn is silently rewritten by `sanitizePredictionsV1` (`claude.ts:55`) — messages can differ from raw model output.
- `crisisUrgency` LLM call is **conditionally skipped** when the user answers `CRISIS_COST` positively (`useConversation.ts:1003-1016`), so the funnel is 7 or 8 LLM calls, not a fixed count.
- `save-progress`/DB persistence fires at milestone states only (`useConversation.ts:175-207`).

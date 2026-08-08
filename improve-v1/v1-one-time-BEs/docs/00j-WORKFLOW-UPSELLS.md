# 00j — WORKFLOW: building an offer's U1 + U2

How to take a backend offer from copy specs to a working upsell flow, derived
from doing it for **02 Twin Flame Tarot** (see [`00i`](./00i-DELIVERABLES-U1-U2.md)).

⚠ **This is a decision procedure, not a template.** The single biggest mistake
available here is copying 02's answers. 02 asks nothing, plays one universal
block and makes no LLM call — and **every one of those was forced by 02's own
intake, not by house style.** 03 collects a target, a duration and a verbatim
account, so 03 should almost certainly keep its questions. Run the steps; do not
inherit the conclusions.

---

## Step 0 — read these, in this order

| Read | Why it decides something |
|---|---|
| `0X-P1` (the product) | **The upsells can only argue from what the product actually says.** This is where the specifics come from |
| `0X-C1` (booking page) | What is collected *before* the money, and in whose voice |
| `0X-U-*` / `0X-U1a`,`U1b`,`U2a` | The beats already written for this offer |
| `0X-T1` (thank-you) | The receipt, and whether the archetype makes it a receipt or an intake gate |
| `0X-C3` (order bump) | Whether a bump promise has to be honoured on the thank-you page |
| `00e-FRAMEWORK-BEs.md` §6b, §7 | The register rules and the page archetypes |
| `00h` + `00i` | What is locked, and what 02 already decided (and why) |

---

## Step 1 — the data audit. **Do this before writing a word of copy.**

This is the step that determines the whole shape. For every merge token and
every keyed block in the drafted upsell copy, answer two questions:

1. **Is it collected at all?**
2. **Has it arrived *by the time the upsell runs*?** — i.e. in the seconds after
   checkout, not eventually.

Fill this in for the offer:

| Field | Collected where | In hand at U1? | If missing |
|---|---|---|---|
| `firstName` | | | |
| `bucket` | | | |
| `personName` / `{{TARGET}}` | | | |
| `{{HOW_LONG}}` etc. | | | |

⚠ **Question 2 is the one that gets missed.** An ACT offer's intake arrives by
email *reply* (`S29` queue), so it can be days later — the tokens exist in the
product but **not** on the upsell screen. `03-U2a` already anticipates this:
*"`{duration}` merges from the intake. If it's missing, cut the clause rather
than rendering a bare token."* Honour that instruction in code, not in hope.

**Where the values actually come from at runtime:** `/api/upsell/user-data`
reads the `conversations` row for the Stripe session. When there is no row it
rebuilds one from the Stripe session, taking `metadata.firstName` — and
**defaulting to the literal string `"Friend"`**. Any offer whose checkout does
not set that metadata greets her as "Friend". 02 neutralises it to Evelyn's
"dear" via `displayName()`; reuse that, or set the metadata at checkout.

### What each answer forces

| If the audit says… | Then |
|---|---|
| Nothing is collected | No questions (a question you cannot use is theatre), one universal block, static copy in place of the Claude calls — **02's shape** |
| Bucket exists | Keep the four bucket variants |
| Target/person exists **at upsell time** | Keep `someone`; otherwise fall back and never render a bare token |
| Intake arrives later | Write the clause as *droppable*, and drop it in code |
| Free-text concern exists at upsell time | The two Claude calls can stay — otherwise they must not |

---

## Step 2 — the archetype, and the mechanism hinge

**READING vs ACT** (00e) changes the thank-you page and the intake, and it
changes what U1 is allowed to threaten.

Then find the hinge. Both of 02's upsells argue from one sentence of its own
brief — *a spread SHOWS; it does not lift (→ the bump) and does not call (→ U2)*.
03's is different and is derived the same way, from `03-P1` verdict 2: *closing
the account settles what was owed and does not undo what carrying it cost her.*

> **Rule:** the hinge is DERIVED from `0X-P1`, never invented. If you cannot
> point at the sentence in the product that the upsell is selling, the upsell is
> arguing for a different product and the buyer will feel it.

⚠ **Never let the upsell sell against the product.** 02-P1 tells the buyer not
to investigate her twelfth house, so 02's U1 sells the stone as *what she does
instead of looking* — a version promising disclosure would contradict the reading
she just paid for. 03 has the same trap in reverse: its promise is *you put it
down and you sleep*, so U2 sells **the choosing, not the filling**. Find this
trap for the offer before writing.

---

## Step 3 — the four levers

Decide each one explicitly and write down why.

1. **Questions on or off.** Off only when the answers cannot be used. 03's build
   notes call its Q1 *"the strongest question in the deck… answering it produces
   the sale rather than Evelyn arguing for it"* — that is a strong reason to keep
   asking, and it does not apply to 02.
2. **Bucket block: four variants or one.** Four when a bucket exists. One when it
   does not, built from facts true for every buyer of that offer.
3. **The two Claude segments in U2.** Keep only if a real `concern` is in hand.
   ⚠ Their prompts (`buildManifestRevealPrompt`, `buildManifestPersonalizePrompt`
   in `server/lib/prompts.ts`) hardcode *"the clearing ritual"* — any offer that
   keeps them needs its own prompt variant, not just data.
4. **Pause taps.** Needed when questions are off, because the questions were the
   only breaks. If questions stay, taps are probably redundant — 50 messages with
   three questions already breathes.

---

## Step 4 — the code

### 4a. FIRST: make the resolver multi-offer *(one-time refactor, not yet done)*

`client/src/lib/twinFlameUpsellCopy.ts` currently ends with a two-way branch on
`isTwinFlameOffer()`. **Adding 03 by adding a second `if` is the wrong move.**
Before 03, refactor to a prefix-keyed registry:

```
lib/backendOffers.ts        prefix → { upsell1, upsell2 }   (registry + resolver)
lib/upsellCopy/twinFlame.ts 02's copy, moved as-is
lib/upsellCopy/judgement.ts 03's copy
```

`upsell1Copy(pathname)` / `upsell2Copy(pathname)` keep their signatures, so the
hooks do not change. The existing tests must stay green across the move — that
is what proves it was a move and not a rewrite.

### 4b. Then, per offer

| File | What it gets |
|---|---|
| `lib/upsellCopy/<offer>.ts` | **all** the offer's copy, its `chain`, its `pauses`, its CTA labels, `placeholderNames` |
| `lib/funnel.ts` | the URL prefix + `is<Offer>()`, and the prefix list inside `funnelPath()` for `/welcome1`, `/welcome2`, `/success` |
| `App.tsx` | three routes: `welcome1`, `welcome2`, `success` |
| `pages/<Offer>ThankYouPage.tsx` | `0X-T1` |
| `tests/<offer>-upsell-copy.test.ts` | copy the 02 suite and re-point it |

**Nothing in the hooks should need editing.** `useUpsellChat` / `useUpsell2Chat`
are already generic: they read every block and every transition from the resolved
copy object. If you find yourself editing a hook, you are probably adding a
capability (a new stage) rather than an offer — stop and check.

The mechanisms available to an offer, all already built:

- `chain` — stage → next stage. Omitting the question stages is what removes them.
- `pauses` — stage → continue-tap label. Empty = no taps.
- `REVEAL` / `PERSONALIZE` — non-null replaces the Claude call with static copy.
- `bucketMessages(bucket, personName)` — return one block or four; own the fallback.
- `acceptLabel`, `downsellDeclineLabel` — button copy AND the bubble it posts.
- `placeholderNames` — names that are not names (`"Friend"`).

### 4c. Shell + toggle

`pinnedShell` in both upsell pages is currently `isTwinFlameOffer()`. Any new
offer must be in that condition too, or its flow drops below the fold. When the
live-funnel rollout happens (`docs/prompt-fix-upsell-scroll-live-funnels.md`)
this becomes unconditional and the question disappears.

---

## Step 5 — the leakage pass

V1's reused copy is full of the *clearing* product. Run this and read every hit:

```
grep -nE "clearing|energy field|both rituals|our conversation" \
  client/src/lib/upsellMessages.ts client/src/lib/upsell2Messages.ts
```

02 found **14** in the reused ~40 messages, plus the CTA labels, plus
`UPSELL_RITUAL`'s *"the energy signature from our conversation"* — false for any
offer whose buyer never had a chat. Every one needs an offer-appropriate line.

Check the buttons too: `UpsellCTA.acceptLabel` and
`Upsell2DownsellCTA.declineLabel` both default to clearing language.

---

## Step 6 — verification

**Unit** (`tests/<offer>-upsell-copy.test.ts`) — the 02 suite is the template:
V1's chain asserted stage-by-stage (the regression guard for six live funnels),
the offer's chain walked end to end with no cycle, no `{token}` unrendered, no
leakage strings, the product-consistency assertions, and every other funnel
unchanged.

**Browser** — the flows take ~5 minutes each of real typing delays, so drive with
Playwright, not by hand. Scripts from 02's run are described in
`improve-v1/evidence/02-upsell-flow-2026-08-07/README.md`. Assert:

- bubble count, tap points, no text input;
- every button fully inside the viewport when it appears, nothing clipped;
- `/welcome1 → /welcome2 → /success` all stay inside the offer's prefix;
- the accept path — **stub only the money endpoints** (`/api/upsell/charge`,
  `/api/upsell2/charge`, the two shipping saves) so the post-charge flow is
  reachable before Stripe exists. Nothing is charged.
- V1 unchanged: still opens on its clearing line, still asks, still has its
  composer.

---

## Step 7 — leave behind

- `00X-DELIVERABLES-*.md` — every departure from the copy specs, with the reason.
- Annotations on any spec you superseded, pointing at it.
- `docs/test-ideas.md` entries for what is covered and what is not.
- Screenshots in `improve-v1/evidence/<offer>-<date>/` with a README. ⚠ 02's ran
  to 15MB; commit them separately so the history cost is a decision.

---

## Guardrails

- ⛔ **One live purchase action on screen, ever** (V1's rule).
- ⛔ **Do not register the offer in `shared/funnelConfig.ts`.** That drives the
  Stripe product suffix, the AWeber tag and the `funnel` param sent to the charge
  endpoints. Until the offer has its own checkout, registering it attaches it to
  V1's money paths.
- ⛔ **Do not inherit `V1_BUMP_PRODUCT_KEY`** (`double_reading`) — n8n
  exact-matches it and would fulfil the wrong product.
- ⛔ **Do not change V1's `chain`.** Six live funnels run it.
- ⚠ Emphasis in specs is written `*italic*`; chat bubbles are plain text. Use
  single-word CAPS, the device V1 already uses.

## Carried-over unbuilt work — true for every offer until fixed

Each of these bit 02 and will bite the next one identically:

1. **Stripe.** No checkout, so nothing charges and no real session exists.
2. **`firstName` has no source** — checkout must set `metadata.firstName` or she
   is "Friend".
3. **PostHog labels the offer `"v1"`** (`getPostHogFunnel() ?? "v1"`). Settle
   before any letter's CTA points at it, or it pollutes V1's funnel.
4. **`/api/upsell2/user-data` has no Stripe fallback** where U1's does — it 404s
   on a session with no row, which constrains where `success_url` can point.
5. **The thank-you page fires no Purchase pixel** and runs no fallback
   confirmation. Wire when the checkout lands or U2 sales go unattributed.
6. **`bumpPurchased` is not returned by `/api/order/details`**, so a thank-you
   page cannot honour a bump promise.
7. **No drop-off instrumentation**, per turn, from the first send.

---

## Worked comparison — why you must not copy 02

| | **02 Twin Flame** (built) | **03 Judgement Day** (expected) |
|---|---|---|
| Archetype | READING · 24h | ACT · three nights · needs a reply |
| Collected before money | **nothing** | six statements, PWYW, then an Entry by reply |
| Intake at upsell time | none | ⚠ **probably none yet** — the Entry has not been sent |
| Questions | **removed** — became assumed answers | **keep** — Q1 is the deck's strongest |
| Bucket block | one universal block | **four variants**, already written |
| Claude segments | replaced with static | only if a concern is in hand at that moment |
| Pause taps | three per flow | probably none — the questions already break it |
| Hinge | a spread shows; it does not lift or call | closing settles the debt, not the cost of carrying it |
| The trap | must not promise to reveal house 12 | must not promise a feeling to fill the room |

Same workflow. Almost none of the same answers.

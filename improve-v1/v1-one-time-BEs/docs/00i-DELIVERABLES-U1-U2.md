# 00i — DELIVERABLES: U1 and U2, rebuilt

What was built for offer 02's two upsells, and — more importantly — the five
places this **departs from the copy specs**, each of which is a decision the
operator should confirm rather than a defect.

| | |
|---|---|
| **Scope** | `/tarot/twin-flame/welcome1` and `/welcome2` |
| **Status** | BUILT, preview-only. Nothing here charges — 02's Stripe is still unwired |
| **Trigger** | operator, 2026-08-06: *"redo the conversation flow for U1, U2 — no asking"* |
| **Supersedes in part** | `02-U1a`, `02-U1b`, `02-U2a` — all three are written as *"only the opening beats change"*, which is no longer true |
| **Built** | `client/src/lib/twinFlameUpsellCopy.ts` (all copy + stage order, one source of truth) |
| **Tests** | `tests/twin-flame-upsell-copy.test.ts` — 25, green |
| **Reusable workflow** | [`00j-WORKFLOW-UPSELLS.md`](./00j-WORKFLOW-UPSELLS.md) — the decision procedure this run produced, for 03 and 05 |

---

## Why it needed a rebuild and not a copy pass

The booking step collects **nothing**. That is the locked design (`00h` rule 2,
*"ask nothing before the money"*; rule 9, no text input anywhere), and it reads
one URL param, `?cancelled=1`. So at `/welcome1` there is no bucket, no concern,
no personName, and no first name.

V1's upsells depend on all four:

| Field | V1 uses it for | 02 has |
|---|---|---|
| `firstName` | ~20 merges across both flows | ⚠ the literal string **"Friend"** — `/api/upsell/user-data`'s Stripe fallback stamps `metadata?.firstName \|\| "Friend"` |
| `bucket` | a 4-message block, keyed love/money/purpose/someone | nothing |
| `concern` | both Claude calls, interpolated raw into the prompt | `""` — the prompt would have read `Reference their specific concern: ""` |
| `personName` | the `someone` bucket | nothing |

Bolting fallbacks onto that produces a chat that is *technically* fine and
*actually* generic. The fix is that **the spread replaces the data**.

## The spine: `02-P1` is fixed for every buyer

Same twelve cards, same houses, same three closed loops, every time. So Evelyn
can speak concretely to all of them while knowing nothing about any of them:

```
  House 2   Wheel of Fortune  first windfall · "rewards a quick answer and
                              punishes a slow one" · be careful who you tell
  House 5   Chariot           THE ARRIVAL · already travelling · not a stranger ·
                              "arriving and recognised are two different events" ·
                              beware the one who turns discouraging
  House 8   Death             second windfall, through someone else's ending
  House 11  Devil             the circle narrows
  House 12  High Priestess    her Tower · present, unspoken, a decision already
                              taken · ⛔ "do not go looking"
```

⛔ **If `02-P1` ever reassigns a card or a house, this copy changes with it.**
Both flows now name houses 2, 5 and 12 out loud.

---

## The five departures

### 1. No questions. Every question became an assumed answer.

Three quick-reply questions per flow are gone — six in total, plus their
acknowledgment branches. **The beats they carried were kept as statements**, not
deleted: V1's *"have you ever seen something coming and still not been able to
stop it?"* is now *"And you have done this before, dear."*

A psychic who has just laid twelve cards does not ask. It is also the only
honest option — a question whose answer we cannot use is theatre.

Consequence: `inputEnabled` never turns on for 02, so the composer never renders.
That matches `00h` rule 9 for the booking step exactly.

### 2. The bucket block became one universal block. *(supersedes `02-U1b`)*

Four bucket variants → one, because every fact in it is in every buyer's spread.
It names the four unnamed people in her twelve — the flatterers, the one who'd
treat her windfall as an opening, the discouraging one, and the one in house 12 —
and lands on the hinge:

> *"And your twelfth house — I've told you not to go looking into it, and I meant
> it. This is what a woman does instead of looking."*

⚠ This is the line that keeps the upsell from selling **against** the product.
`02-P1` forbids investigation; an upsell promising disclosure would put her back
on her partner's phone. It must never be rewritten into a promise to reveal.

### 3. Both Claude calls replaced with static copy. *(new)*

`manifest_reveal` and `manifest_personalize` interpolate her stated desire, and
`buildManifestRevealPrompt` opens *"You are transitioning from the clearing
ritual… the user has already purchased the clearing ritual."* Wrong product,
empty desire. 02 plays fixed copy drawn from houses 5 and 2 instead, which is
both true and more specific than the model could have been.

⚠ 02 therefore makes **no LLM call at all**. If that changes, the prompt builders
need a tarot variant first.

### 4. Three CONTINUE taps per flow. *(operator, 2026-08-07)*

Length was measured, not guessed:

| | V1 | 02 |
|---|---|---|
| U1 | 55 messages · ~4.6 min | 50 · ~4.4 min |
| U2 | 53 · ~5.0 min | 50 · ~4.6 min |
| **both** | **108** | **100** |

So ~100 messages back to back was always true of V1 — but V1's three questions
were its only interaction, and removing them left ~4.5 minutes of unbroken
broadcast. **Operator kept the length and asked for the rhythm back.**

A tap is *not* a question: one button, no branch, nothing captured, no label that
implies a commitment (`Go on` · `I'm listening` · `Tell me`). It posts her word as
a bubble, because a screen you can touch reads as a conversation and a screen you
cannot reads as a broadcast.

```
  U1   15 · 15 · 11 · 9     after RISK · after RITUAL · after the spread block
  U2   11 · 18 · 13 · 8     after the reveal · after the eight stones · after WHAT_RECEIVE
```

Each break sits on a narrative seam — after the warning lands and before the
answer to it, after the description of the work, after what she receives — never
on an arbitrary interval. ⚠ `pauses` is EMPTY for every live funnel: V1 already
breaks its own wall with real questions.

### 5. The reused ~40 messages were de-clearing'd. *(new)*

V1's downstream copy says "clearing" 14 times, plus *"both rituals are now
confirmed"*, plus a decline button reading *"No thanks, just the clearing"*, plus
`UPSELL_RITUAL`'s *"using the energy signature from our conversation"* — and 02's
buyer never had a conversation. She gave twelve houses instead, and the copy now
says so.

Also: `Path B`'s open was trimmed so both U2 paths converge into one shared
reveal *(supersedes `02-U2a`)*.

---

## How it is wired

One resolver keyed on the URL, the same mechanism every other per-funnel
behaviour in these shared components already uses. `upsell1Copy(pathname)` /
`upsell2Copy(pathname)` return copy **and a stage chain** — the chain is what
removes the questions:

```
  V1     RISK → QUESTION_1 → AFTER_Q1 → SOLUTION
  02     RISK → SOLUTION
```

V1's chain is written out explicitly and asserted stage-by-stage in the tests,
because six live funnels share these hooks.

⚠ `TWIN_FLAME_UPSELL1.QUESTION_1` still holds 02's own question text even though
nothing routes to it — so that a future change of heart about asking cannot
resurrect V1's *clearing* question by accident.

---

## Verified

- 02's U1 and U2 both walked end to end in a browser: **50 bubbles each, three
  continue taps at exactly the intended seams, zero questions, zero text input**.
- 02's taps are reachable without scrolling; V1's replies still are not (unfixed,
  by decision).
- V1's `/welcome1` still opens on *"Your Energy Clearing Ritual has been
  scheduled"*, still asks its question, still offers the same three replies, and
  still renders the composer.
- `npx tsc --noEmit` adds no new errors.
- The `/welcome1 → /welcome2` handoff staying inside 02 is unit-tested; it was
  **not** watched in a browser (it needs a full flow run plus a decline).

## ⚠ A pre-existing V1 defect found while verifying the taps

The chat pages **never scroll internally**. The message list is
`flex-1 overflow-y-auto` inside a `min-h-screen` column, and a flex item's default
`min-height: auto` stops it shrinking — so it grows to fit its content,
`scrollHeight === clientHeight`, and the `scrollRef` auto-scroll effect in both
pages is dead code. The document grows instead. Measured on this branch at a
430×880 viewport:

```
  container scrollHeight 1135 === clientHeight 1135   never scrollable
  window.scrollY 0 · document 1188px · viewport 880px
  by bubble 12 the newest message is already below the fold
```

From roughly the eighth message on, **every new message and every footer button —
quick replies, the CTA, the shipping form — sits below the fold**, and the buyer
has to scroll manually with no cue that there is anything to scroll to. This
affects V1, fb, fb2, fb-palm, fb-tarot and gdn, on both upsells. It is not new
and it was not introduced here.

Offer 02 opts into the one-line fix (`h-screen` + `min-h-0`) because its flow now
*stops* on a tap she has to be able to see. Verified: 02's first tap lands at
832–864px in an 880px viewport, the page no longer overflows, and auto-scroll
works. **The live funnels are deliberately left alone** — the same fix would
change what real buyers see on six money pages, which is an operator call.

📄 **Ready-to-run rollout prompt:** `docs/prompt-fix-upsell-scroll-live-funnels.md`
(operator, 2026-08-07 — fix confirmed for the tarot upsells, rollout deferred).
It is self-contained: paste it at a fresh session. It also flags a decision the
02 fix ducked — `h-screen` is `100vh`, which on mobile Safari sits partly under
the address bar, so the rollout should probably move both to `h-dvh`.

## The thank-you page *(operator caught it, 2026-08-07)*

A 02 buyer was landing on V1's `/success`, which says **"Energy Clearing Ritual —
your personalized clearing begins tonight"** (`SuccessPage.tsx:241`). She bought
twelve tarot cards.

Built `client/src/pages/TwinFlameThankYouPage.tsx` to `02-T1` and mounted it at
`/tarot/twin-flame/success`; `funnelPath('/success')` now resolves there.

Three decisions inside it:

- ⚠ **It sells nothing** — `02-T1` is explicit, and 00e §7a says headlines and
  proof are friction for a Level-5 buyer who has already paid. **That means V1's
  Luna $50 cross-sell block is NOT on it.** That block is real revenue on
  `/success`, so this is a genuine trade, not an oversight. To reinstate, lift it
  from `SuccessPage.tsx` wholesale — the `campaign=v1-ty-luna` tag is what the
  server keys the 30-minute coin grant off and must carry over verbatim.
- **No Purchase pixel, no fallback-checkout confirmation.** `SuccessPage.tsx`
  fires the Upsell-2 Purchase on load; this page deliberately does not, because
  the event names and product identifiers 02 needs are part of the unbuilt
  checkout. ⚠ **Wire them here when that lands or U2 purchases go unattributed.**
- **The bump P.S. cannot render yet.** `bumpPurchased` is on the `conversations`
  table but not selected by `/api/order/details`, and `02-C4` (the Astro Force
  instructional) has no page to link to. The block is written and gated; a bump
  buyer currently sees nothing, which breaks `02-C3`'s *"you can start it
  tonight"*.

Also fixed: the volume toggle was covering the last 11–13% of the decline button
and of the shipping form's submit, and winning the tap (`elementFromPoint`
returned the music icon). Moved to the top right for offer 02 — overlap now 0.
⚠ Live funnels still have it; it is in the rollout prompt.

## Still not built

Everything in `00h`'s "NOT built" still stands — Stripe, the already-purchased
redirect, 02's own bump identifiers, drop-off instrumentation — plus:

- **The `?fn=` chain is not wired.** ⚠ AWeber HAS her first name
  (`{{ subscriber.first_name | capitalize }}`), so this is a plumbing job, not a
  missing-data problem: the letter's CTA passes it, the booking page keeps it,
  checkout sets `metadata.firstName`. Until then the "Friend" placeholder is
  neutralised to Evelyn's *"dear"*, which reads fine but is not her name.
- **PostHog labels 02's upsell events `"v1"`** (`getPostHogFunnel() ?? "v1"`).
  Harmless while nothing links here; must be settled before the letter points at
  this arm.
- **`/api/upsell2/user-data` has no Stripe fallback** where U1's does, so it 404s
  on a session whose row does not exist yet. Constrains where 02's `success_url`
  can point.

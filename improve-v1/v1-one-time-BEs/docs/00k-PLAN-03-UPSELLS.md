# 00k — PLAN: 03 Judgement Day, U1 + U2

The workflow in [`00j`](./00j-WORKFLOW-UPSELLS.md), run for offer 03. Nothing is
built yet. **One decision is needed before anyone writes code** — the URL, at the
bottom.

---

## Step 1 — the data audit

The order is fixed and it is what decides this offer:

```
  booking page → SHE PAYS → U1 → U2 → thank-you page → she replies with the Entry
                                      ↑                 ↑
                              upsells run HERE      intake arrives HERE
```

`03-T1` is an **intake gate**: it is the page that asks her to reply with who it
is, what they did and how long. That page comes *after* both upsells. So:

| Field | Collected where | In hand at U1/U2? | Plan |
|---|---|---|---|
| `firstName` | **AWeber** → `?fn=` → checkout metadata | ✅ yes, once the chain is wired | wire it; keep `displayName()` as the fallback |
| `bucket` | **nowhere in 03** | ❌ no | not needed — one universal block |
| `{{TARGET}}` (`personName`) | the Entry, by email reply | ❌ **not yet** | `someone` bucket cannot render |
| `{{HOW_LONG}}` (`{duration}`) | the Entry | ❌ **not yet** | drop the clause, as `03-U2a` already instructs |
| `{{WHAT_THEY_DID}}` | the Entry | ❌ not yet | unusable in the upsells |
| free-text `concern` | nowhere | ❌ no | the two Claude calls must go |

**Headline:** 03's specs merge four intake tokens into the upsells, and **none of
them exist when the upsells run.** This is not a flaw in the specs — the tokens
are right for the product email. It is a timing fact nobody had checked.

---

## Step 2 — archetype and hinge

- **Archetype: ACT.** Its thank-you page is an intake gate, not a receipt. The
  reply instruction goes *above* the delivery promise. This is the opposite of
  02 and must not be copied from it.
- **The hinge, from `03-P1` verdict 2 + §8:** *closing the account settles what
  was owed; it does not undo what carrying it cost her* — specifically the
  vigilance. Both upsells hang off that one sentence.
- ⚠ **The trap.** 03 promises *you put it down and you sleep*, and `03-P1`'s
  thesis is that closure feels like boredom. A "now manifest what you want" pitch
  contradicts the product. `03-U2a` already solves it: sell **the choosing, not
  the filling** — the room has never once been hers to allocate.
- ⚠ **The risk beat stays about HER guard**, never a returning enemy. The
  karmic-backlash premise is retired; V1's "old shadows try to return" would
  smuggle it back in.

---

## Step 3 — the four levers

| Lever | 02 did | **03 should** | Why |
|---|---|---|---|
| Questions | removed | **KEEP all three** | A question needs no stored data — she answers in the chat and the answer is used in the next two messages. 03's Q1 is written, and its build notes call it the strongest in the deck |
| Bucket block | one universal | **one universal** | ⛔ Settled rule: upsells use no personal details |
| Claude segments | static | **static** | No `concern` exists. 03's U2 angle (agency) needs its own copy regardless |
| Pause taps | three per flow | **none** | The three questions already break the wall |

So 03 lands **between** 02 and V1: V1's interaction pattern, 02's data
constraints.

---

## Step 4 — the build

**First, the refactor** (`00j` §4a): swap the two-way `isTwinFlameOffer()` branch
for a prefix-keyed registry. 02's copy moves unchanged and its 25 tests must stay
green — that is what proves it was a move.

Then, for 03:

| File | Contents |
|---|---|
| `lib/upsellCopy/judgement.ts` | all 03 copy, `chain` (**with** the question stages), `pauses: {}`, CTA labels, `placeholderNames` |
| `lib/funnel.ts` | the prefix + `isJudgementOffer()`, added to `funnelPath()`'s list |
| `App.tsx` | `welcome1`, `welcome2`, `success` |
| `pages/JudgementThankYouPage.tsx` | `03-T1` — **intake gate**, reply instruction above the delivery promise |
| `tests/judgement-upsell-copy.test.ts` | the 02 suite, re-pointed |

Copy to write (everything else is V1's, unchanged):

- `CONFIRMATION` · `GAP` · `RISK` · `QUESTION_1` + its three branches — all
  already drafted in `03-U-upsell-beats.md`, usable close to as-written.
- The bucket block — ONE, impersonal.
- `PATH_A_OPEN` / `PATH_B_OPEN` — drafted; ⚠ Path A's `{duration}` clause must be
  cut, not merged.
- A static replacement for the two Claude segments, built from the *agency*
  angle.
- The de-leakage pass on the ~40 reused messages (`00j` §5) — 03's own leak is
  worse than 02's, because V1's "clearing/energy field" language sits inside an
  offer about a ledger and an account.

---

## Verification

Same as 02 (`00j` §6), plus one 03-only check: **the copy must never render a
bare `{personName}` or `{duration}`.** Assert it directly — that is the failure
this offer is most likely to ship.

---

## ⚠ The one decision needed before coding

### ~~Decision 1 — the bucket block~~ ⛔ SETTLED

**One universal block.** The upsells use no personal details — that is a standing
rule, not a per-offer call. 03's four written variants are not used, and the
email-lookup option is off the table.

Write one block from what is true of every 03 buyer: an account is closing, the
guard she kept has not stood down, and she is about to be open in a way she has
not been in a long time.

### Decision 2 — the URL prefix

02 uses `/tarot/twin-flame`. 03 needs its own. Suggest **`/wiccan/judgement-day`**,
matching the source deck's naming (`03-Wiccan Watch - Judgement Day`). Once
chosen it appears in `funnel.ts`, three routes, and every test — cheap now,
annoying later.

---

## What carries over as still-unbuilt

All seven items in `00j`'s last section apply to 03 unchanged — Stripe, the
`?fn=` chain, the PostHog `"v1"` label, the `/api/upsell2/user-data`
fallback, the thank-you pixel, `bumpPurchased` on `/api/order/details`, and
drop-off instrumentation. ⚠ **Fixing them once, centrally, is now cheaper than
hitting them a third time on 05.**

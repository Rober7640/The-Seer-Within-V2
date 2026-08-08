# 0-WORKFLOW — building a backend offer, together

A working checklist for you and Claude to run in one chat. Works for **any offer
in the deck** — 03, 04, 05 and whatever comes after.

Covers the app build: booking page → order bump → upsell 1 → upsell 2 →
thank-you page → wiring → tests. Not the emails.

**How we use it:** Claude does one step, shows you, and waits. You approve or
send it back. Nothing goes live — none of these offers has Stripe yet, so no
button charges anyone.

**Say this to start:**
> Read `improve-v1/v1-one-time-BEs/docs/0-WORKFLOW.md` and build offer `<number>`.

**Say this to pick it up again later:**
> Read `improve-v1/v1-one-time-BEs/docs/0-WORKFLOW.md` and do the next unticked
> step for offer `<number>`.

Copy this file per offer if you want a clean set of tick boxes for each — e.g.
`0-WORKFLOW-03.md`. The steps never change; only the worksheet answers do.

---

## Where each offer stands

| | Archetype | Money | Needs her reply? | Status |
|---|---|---|---|---|
| **02** Twin Flame | Reading | $35 fixed + bump | no | ✅ built — see [`00i`](./00i-DELIVERABLES-U1-U2.md) |
| **03** Judgement Day | **Act** | pay-what-you-want | **yes** | analysed in [`00k`](./00k-PLAN-03-UPSELLS.md), not built |
| **04** The Turn | Reading | ladder $35→$47→$57→$67 | no | copy written, not analysed |
| **05** Hex Her | — | — | — | ⚠ no copy yet |

---

## Step 0 — the worksheet

**Fill this in first. It decides everything else.** Claude reads the offer's copy
specs and proposes the answers; you confirm.

| Question | Where the answer is | This offer |
|---|---|---|
| Reading or Act? | `0X-C1` header row | |
| How is it priced? | `0X-C1` — fixed, pay-what-you-want, or a ladder | |
| Does the work need a reply from her? | `0X-C1` statement 7b, `0X-T1` | |
| **What do we know about her when the upsells run?** | see below | |
| Does the booking page promise anything only code can keep? | `0X-C1` — capacity caps, deadlines | |
| What is the one sentence both upsells sell? | `0X-P1` | |

### The question that decides the most

**What do we know about her at the exact moment the upsells run?**

The order never changes:

```
  booking page → SHE PAYS → upsell 1 → upsell 2 → thank-you page
```

So the upsells only know what the booking page collected, plus whatever her
email address can be matched to. For every name, number or detail the drafted
upsell copy prints, ask: *is it in hand by then?*

⚠ **On an Act offer the answer is usually no.** Her details arrive as an email
reply that the thank-you page asks for — which is after both upsells. The copy
can be perfectly right for the product email later and still be unprintable in
the upsells. 03 merges four such details. All four are unavailable.

If the answer is no, either cut the sentence or look her up by email in the old
database — she is a past buyer, so her details may already be there.

---

## Rules that hold for every offer

1. **The money comes first, then the upsells.** Always.
2. **The upsell must not fight the product.** Find the trap before writing. 02
   sells the stone as what she does *instead of* investigating, because the
   product tells her not to investigate. 03 sells *choosing* what fills the
   space, never a feeling to fill it with, because the product promises calm.
3. **Nothing reused from the old funnel may mention a "clearing"**, an "energy
   field", or "our conversation". It leaks 14 times and none of it is true for
   these buyers.
4. **Never print a blank where a detail should be.** Cut the sentence instead.
5. **The live funnel must not change.** Six funnels share this code. The tests
   prove it, step by step.
6. **Questions are free.** She answers in the chat and Evelyn uses it two
   messages later — no stored data needed. Drop them only if you want them
   dropped. 02 has none because you asked for that on 02; it does not carry over.

---

## What the archetype changes

| | **Reading** (02, 04) | **Act** (03) |
|---|---|---|
| Thank-you page | a **receipt** — confirm, name the email subject, stop | an **intake gate** — the reply instruction goes *above* the delivery promise |
| Her details | may exist at checkout | arrive later, by reply |
| Sells anything on the thank-you page? | no | no — but the reply request is the whole point |
| Upsell may threaten | what reaches her while she waits | her own openness, never a person coming back |

## What the pricing model changes

| Model | Booking page needs | Built? |
|---|---|---|
| Fixed + bump (02) | a total and a bump card | ✅ yes |
| Pay-what-you-want (03) | an amount box she types in, with a floor | ❌ new |
| Ladder (04) | four price options, one chosen | ❌ new |

---

## Decisions log

Claude stops and asks at each. Write the answers here as you go.

| # | Decision | Answer |
|---|---|---|
| D1 | The URL this offer lives at (02 is `/tarot/twin-flame`) | ☐ |
| D2 | The four "her situation" blocks — pick one with an email lookup, or write a single block for everyone | ☐ |
| D3 | Any promise on the booking page that needs code (capacity caps, deadlines) — build it, or hide the sentence | ☐ |
| D4 | Money limits — the floor for pay-what-you-want, or the rungs of a ladder | ☐ |

---

## The steps

### ☐ 1. Fill in the worksheet, settle D1 and D2
Claude proposes, you confirm. Ten minutes, and it unblocks everything.

### ☐ 2. The booking page
**Read:** `0X-C1`, and `00e-FRAMEWORK-BEs.md` §3.

Statements in **her** voice — Evelyn does not speak on this page. Then the money
part, the bump, the button.

⚠ On an Act offer, the statement where she agrees to reply with her details is
the most important sentence on the page. Without that reply the work never
starts.

**Done when:** it renders, the button only appears once she has ticked
everything, and it logs instead of charging.

### ☐ 3. The order bump
**Read:** `0X-C3`.

Sits inline beside the total.

⚠ It must carry **its own product code**. The fulfilment robot matches on that
exact text, so a reused code sends her the wrong thing.

### ☐ 4. Upsell 1
**Read:** `0X-U*` (the U1 sections), and [`00j`](./00j-WORKFLOW-UPSELLS.md) for
the method.

Most of the copy is already drafted. Claude wires it in, keeps the questions
unless you say otherwise, and handles the "her situation" block per D2.

### ☐ 5. Upsell 2
**Read:** the U2 section of the same file.

Two openings: one for buyers who took upsell 1, one for those who didn't.

⚠ Cut any detail we do not have by then. ⚠ The two AI-written passages in the old
flow get replaced with fixed copy unless this offer genuinely knows her concern
at that moment.

### ☐ 6. The thank-you page
**Read:** `0X-T1`.

Receipt or intake gate — see the archetype table. Getting this backwards is the
easiest mistake in the whole build.

⚠ The email subject line shown here must match the product email **exactly**.
It is how she finds it in a crowded inbox.

### ☐ 7. Wiring and tests
Routes for all four pages. Test file copied from 02's and re-pointed.

⚠ Tests must prove the live funnel is untouched. ⚠ The offer needs the scrolling
fix 02 has, or its buttons sit below the fold.

### ☐ 8. Walk it and screenshot it
Claude drives a real browser through the whole thing and saves the screenshots so
you can read the flow without sitting through it.

**Done when:** you've seen it and said it's right.

---

## Not in this workflow

The emails — sales letter, reminders, confirmation, and the product itself.
Different job, different tools.

## Missing for every offer, not just this one

No Stripe. No source for her first name, so she gets called "Friend" unless we
fix it. No tracking of its own — everything reports as the old funnel. Full list
at the bottom of [`00j`](./00j-WORKFLOW-UPSELLS.md).

⚠ These cost us a day on 02 and will cost the same on 03, 04 and 05. **Fixing
them once, centrally, is now cheaper than hitting them three more times.**

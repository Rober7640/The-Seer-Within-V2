# 0-WORKFLOW — building offer 03, together

A working checklist for you and Claude to run in one chat. Offer **03 Judgement
Day**, from the booking page through to the thank-you page.

**How we use it:** Claude does one step at a time, shows you the result, and
waits. You approve or send it back. Nothing goes live at any point — 03 has no
Stripe, so no button charges anything.

**Say this to start, or to pick up again later:**
> Read `improve-v1/v1-one-time-BEs/docs/0-WORKFLOW.md` and do the next unticked step.

Background, only if you want it: [`00j`](./00j-WORKFLOW-UPSELLS.md) is the general
method, [`00k`](./00k-PLAN-03-UPSELLS.md) is the analysis behind 03's upsells,
[`00h`](./00h-DELIVERABLES-BEs.md) and [`00i`](./00i-DELIVERABLES-U1-U2.md) are
what 02 built and why.

---

## Five things that are true for 03, and easy to get wrong

1. **The money comes first, then the upsells.** Booking page → she pays → U1 →
   U2 → thank-you page.
2. **We know almost nothing about her during the upsells.** 03 asks for her
   details on the *thank-you page*, by email reply — which is after both upsells.
   So her target's name, what they did, and how long she's carried it **do not
   exist yet**. Never print those.
3. **Keep 03's questions.** All three. She answers them in the chat and Evelyn
   uses the answer straight away. 02 dropped its questions because you asked for
   that on 02 — it was not a technical limit and it does not carry over.
4. **The upsell must not fight the product.** 03 promises *you put it down and
   you sleep*. So U2 sells **choosing** what fills the space, never a feeling to
   fill it with. And the risk beat is about **her own guard**, never about the
   other person coming back.
5. **Nothing we reuse from the old funnel may mention a "clearing".** 03 is about
   a ledger and an account. The old copy leaks that word 14 times.

---

## Decisions

Claude stops and asks at each of these. Answers get written here as we go.

| # | Decision | Status |
|---|---|---|
| D1 | **Where 03 lives on the site.** 02 is `/tarot/twin-flame`. Suggestion: `/wiccan/judgement-day` | ☐ open |
| D2 | **The four "her situation" blocks.** Four are written (love / money / purpose / someone) but 03 has nothing to pick between them. Options: look her up by her email in the old database (also fixes 02), or write one block that suits everyone | ☐ open |
| D3 | **Statement 4 promises "she holds one account at a time"** and that the page closes when the week is full. That is a promise only code can keep. Do we build the cap now, or hide that statement until we do? | ☐ open |
| D4 | **Pay-what-you-want limits.** She types her own amount. What is the lowest we accept, and is there a ceiling? | ☐ open |

---

## The steps

### ☐ 1. Settle D1 and D2

Claude presents the options with a recommendation. Five minutes, and it unblocks
everything else.

### ☐ 2. The booking page

**Read:** `copy/03/03-C1-booking-page.md`, and `00e-FRAMEWORK-BEs.md` §3.

Eight statements in **her** voice — Evelyn never speaks on this page. Then the
amount field, the bump, and the button.

⚠ Two mechanics we have never built:
- **Pay-what-you-want** — she types the amount. Needs D4.
- **The capacity cap** — needs D3.

⚠ Statement 7b is the one that makes the offer work: she agrees, in her own
words, to reply to the email with her details. If that sentence is weak, the
whole product stalls, because Evelyn cannot start without the reply.

**Done when:** the page renders, all eight statements are there, the button
appears only when she has ticked them all, and it logs instead of charging.

### ☐ 3. The order bump

**Read:** `copy/03/03-C3-order-bump.md`.

Sits inline on the booking page, next to the total — the placement that makes a
bump a bump.

⚠ It must **not** reuse 02's or the old funnel's product code. The fulfilment
robot matches on that exact text, so the wrong code sends her the wrong thing.

**Done when:** it renders, adds to the total, and carries its own product name.

### ☐ 4. Upsell 1

**Read:** `copy/03/03-U-upsell-beats.md` (the U1a and U1b sections), and
[`00k`](./00k-PLAN-03-UPSELLS.md).

Most of this is already written. Claude writes it into the code, keeps all three
questions, and handles the "her situation" block per D2.

**The argument:** closing the account settles what was owed — it does not undo
what carrying it cost her. That cost is the vigilance. The stone is for that.

**Done when:** the chat runs start to finish, the questions work, and no line
mentions a clearing.

### ☐ 5. Upsell 2

**Read:** the U2a section of the same file.

Two openings: one for buyers who took the stone, one for those who didn't.

⚠ The "how long you've carried it" phrase in the first opening **must be cut**,
not filled in. We don't know it yet.

⚠ The two AI-written passages in the old flow get replaced with fixed copy. They
need details we don't have, and their instructions still talk about a clearing.

**Done when:** both openings run, the $30 fallback offer works, and nothing
prints a blank where a detail should be.

### ☐ 6. The thank-you page

**Read:** `copy/03/03-T1-thank-you-page.md`.

⚠ **This page is not a receipt.** It is the page that asks her to reply with her
details. The reply instruction goes **above** the delivery promise, because the
work cannot start without it. This is the opposite of 02's thank-you page — do
not copy that one.

**Done when:** the reply instruction is the first thing she reads, and the email
subject line matches the product email exactly.

### ☐ 7. Wiring and tests

Routes for the booking page, both upsells and the thank-you page. Then the test
file, copied from 02's and re-pointed.

⚠ The tests must prove the **old funnel is untouched**. Six live funnels share
this code.

⚠ 03 needs the scrolling fix that 02 has, or its buttons sit below the fold.

**Done when:** tests pass, and the old funnel still behaves exactly as before.

### ☐ 8. Walk it and screenshot it

Claude drives a real browser through the whole thing and saves the screenshots so
you can read the flow without sitting through it.

**Done when:** you've seen it and said it's right.

---

## Not in this workflow

The emails — the sales letter, the reminder nudges, the confirmation email, and
the product itself. Those are a separate job with different tools.

Also still missing, and the same for every offer: 03 has no Stripe, no source for
her first name, and no tracking of its own. Listed in
[`00j`](./00j-WORKFLOW-UPSELLS.md) at the bottom. ⚠ Worth fixing once, centrally,
rather than a third time on offer 05.

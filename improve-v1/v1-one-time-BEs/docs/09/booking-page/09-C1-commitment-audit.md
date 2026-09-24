# 09-C1 — Are the commitment ticks making sense?

*Audit, 2026-09-15. Report only: no copy or code was changed. Checked against `client/src/lib/heartCleanserBooking.ts`,
the built page, `09-C1-booking-page.md`, `00e` §3, `0-WORKFLOW.md` A2, the 02 / 03 / 06 booking pages, and both
sales emails (09-E2, 09-E3). The copy was also cold-read by three fresh readers who were given only the page text.*

## Short answer

**Mostly, no.** The ticks were built for readings and rituals, where she gives Evelyn permission to act or
sends something Evelyn needs. A $59 bracelet needs neither. So four of the five ticks are shop facts or feelings
sitting behind a checkbox. All three cold readers read the header "Tick each line that's true for you" as an
optional quiz. None of them could say what "Evelyn's right" means. **Recommendation: take the ticks off. Make it
a normal product block: what's in the box, the ritual in three steps, shipping, price, button.**

---

## 1. Does the tick pattern fit this product?

| Why ticks exist on 02 / 03 | Is that true for 09? |
|---|---|
| She **gives permission**. Evelyn draws cards or does a ritual for her | No. Nobody acts for her. She does the ritual herself |
| She must **send something** before work can start (03's reply) | No. Stripe takes the address, and nothing else is needed |
| Evelyn's **time and craft** explain the price, the wait and the scarcity | No. It's stock, sent by post. 06 already had to cut its scarcity line for this reason |
| Statement 1 says **"you were right"** about a reading | No reading, no prediction. 06's own spec saw this and dropped "you were right". 09 brought it back |

**Conversion.** The button does not exist until she taps five boxes. On a phone the page runs about 2.7 screens,
and the workflow's own rule is to split at about 2. If she scrolls down first, she finds no button, just faint grey
text telling her to go back up. Nothing tracks the ticks (the only event is `checkout_initiated`), so if women stop
at the gate, nobody will see it.

**Trust.** The header says "tick what's true for you", then blocks her unless every line is true. That is a quiz
with only one allowed answer. Two of three readers wondered whether ticking the $59 box would charge them.

**The one job a tick could do: confirm she saw the shipping wait.** It doesn't do that job either. The ticks never
leave her browser. The checkout request sends offer, treatment, bump, first name and letter code, and nothing about
ticks. So there is no record to show in a "never arrived" dispute. The same sentence printed next to the button
does the same job for her.

**How the ticks got here.** 06-C1's build notes say *"No checkboxes, no ticks, no progress counter"*, but the
built 06 page has checkboxes, and 09 was copied from that code. The master A2 step does say "ticked". So the docs
disagree, and nobody chose ticks for 09 on purpose.

---

## 2. The five statements

"Type" means: is she **committing** to something, stating a **fact**, or voicing a **feeling**?

| # | Statement | True for every buyer from E2 and E3? | Would she say it? | Type | Makes sense to tick? | Cold read (3 readers) | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | *Yes — Evelyn's right. My wish should have me in it, too.* | **No.** Evelyn made a suggestion, not a prediction, so there is nothing to be right about. And not every woman who wants him back sees herself as "someone who has spent a long time thinking about what someone else needs" | No. "Belongs on that paper as well" is written language, not spoken | Opinion + confession | **No.** She agrees to a claim she can't see on the page | ⛔ **BROKEN.** All 3: "right about what?" All 3 went back looking for "that paper", which isn't mentioned until line 2. "Someone else" (twice): nobody could say who. One reader read "Evelyn's right" as her right hand | **Cut.** Keep the idea as a plain line of copy if wanted, not a tick |
| 2 | *Yes — I want a place to keep my wish, on my left wrist.* + what's in the box | Yes | The first line, roughly. "I know what I'm asking for" sounds like a contract | Want + facts (box list) | Weak. It's ticking a packing list | ✅ Clear. All 3 read it as the "I'm ordering it" box. Two asked "why the left?", which the page never explains | **Rewrite** as a "What's in the box" list, no tick |
| 3 | *Yes — I'll write the wish myself.* / *Nobody writes it for me.* + the ritual | Yes | "Nobody writes it for me": no | Instructions dressed up as a promise | No. Nobody checks, and it's odd to promise to say a sentence | ⚠ Top line clear. "Nobody writes it for me" is **ambiguous**: all 3 saw a sad second meaning ("nobody ever does things for me"). "Place **it** in the capsule and close **it**": the two *it*s mean different things, and all 3 flagged it | **Rewrite** as "When your charm arrives", three numbered steps, no tick |
| 4 | *Yes — I understand my charm has to travel to me.* + ship times | Yes | Top line yes. "I'm glad to know the real wait before I pay": no, that's a feeling put in her mouth | Fact | The closest to sensible, but it records nothing (see §1) | ✅ Clear. 2 of 3 asked whether 7–14 days counts from shipping or from ordering | **Keep the facts, drop the tick.** Say "after it ships" |
| 5 | *Yes — I'll send $59, once, for my charm.* | Yes | No. Nobody says "send $59" | Fact (price) | No. You can't disagree with a price. 2 of 3 wondered if ticking it charges them | ✅ Clear. But "Total today" made all 3 wonder about charges on other days | **Cut** as a tick. Show the price at the button once |

---

## 3. The request paragraph and the button

> *Evelyn — I've thought about the wish I'll write. … I'm ready to receive love, too. So please —*
> **SEND ME MY LOVE CHARM**

| Line | What the readers did |
|---|---|
| "Evelyn —" | The voice jumps to a note written to her. 2 of 3 stopped to ask if this was another tick line, or a message that gets sent |
| "the seven words" | All 3 had to scroll back to statement 3 and count |
| "before the messages and the errands start" | All 3: whose messages? From him? From Evelyn? |
| "So please —" | All 3: can't read it alone. The eye has to jump over the **$59 total** to reach the button, so the join breaks |
| The button | Fine on its own. 2 of 3 weren't sure if it charges now or opens checkout (the small print says, but it sits under the button) |

It also repeats the ritual already given in statement 3, so she reads the steps twice. **Verdict: the paragraph
only exists to finish the tick ladder. Without ticks, cut it. Keep the button words.**

---

## 4. Compliance and UX flags

| Flag | Why it matters |
|---|---|
| **Required boxes that aren't consents** | 4 of 5 are facts or feelings. Not illegal. But making her agree with an opinion ("Evelyn's right") before she's allowed to pay is what dark-pattern lists call *forced action*. Low legal risk, real trust cost |
| **No record** | Ticks never reach the server or Stripe, so they prove nothing in a chargeback. If a recorded "I saw the wait" matters, it belongs on the Stripe page (Stripe Checkout has a terms-consent option and custom text by the Pay button; check before relying on it) |
| **Hidden button** | At the bottom she sees no button, only a hint. Screen readers aren't told when the button appears (no live region) |
| **Hint contrast** | "Tick all five above to continue" is `text-gray-400` on white: **2.54 : 1**. Small text needs 4.5 : 1. The one instruction she needs is the hardest text on the page to read |
| **Pulsing button** | `animate-pulse` never stops and ignores the reduced-motion setting. It reads as nagging, and it may fail the rule on content that blinks for more than 5 seconds |
| **"Total today"** | All 3 readers wondered about later charges. "One payment" is already true, so just say "Total" |
| **Repeats** | Price appears 4 times, shipping 2, address 2, ritual 2. That's much of why the page runs 2.7 screens |
| ✅ Good as built | Real checkboxes inside labels (tap anywhere on the line, screen readers read them). Nothing pre-ticked. Price shown before Stripe |

---

## 5. Recommendation: no ticks, a normal product block

**Why, in plain words:**

- **She decided when she clicked.** The email sold the ritual. This page's job is to show the box, the steps,
  the wait and the price, then get out of her way.
- **Ticks work when she's giving Evelyn something.** Here she gives an address, and Stripe takes that.
- **The only useful tick (the wait) records nothing.** The same sentence by the button does the same job.
- **It fixes the other problems too:** the page drops under 2 screens, and the hidden button, the grey hint and
  the broken "So please —" join all go.
- **Keep:** the Evelyn Cross eyebrow, the "never say buy" button (SEND ME MY LOVE CHARM), and the shipping wording
  word for word.
- **If you want proof later:** keep the tick version as an A/B challenger. First add an event per tick, or the
  test can't show where women stop.

⚠ This drops the "her voice, first person" rule for this page. That rule only exists to make the ticks work, so
it goes with them. Plain "you" copy is normal for a product.

### Before / after: top of the page only

**Before (as built)**

> EVELYN CROSS
> **Your Heart Cleanser Love Charm**
> *Tick each line that's true for you.*
>
> [photo] *The Heart Cleanser Love Charm: pink quartz, with its wish capsule.*
>
> ☐ **Yes — Evelyn's right. My wish should have me in it, too.**
> I've spent a long time thinking about what someone else feels and what someone else needs. How I want to feel
> in love belongs on that paper as well.
>
> ☐ **Yes — I want a place to keep my wish, on my left wrist.**
> I know what I'm asking for: one Heart Cleanser Love Charm, a pink quartz bracelet with a small wish capsule
> built in. It comes in a gift box, with blank wish papers that fit the capsule and a printed card with the
> instructions and care notes.

**After**

> EVELYN CROSS
> **Your Heart Cleanser Love Charm**
> *Write your wish, place it in the capsule, and wear the charm on your left wrist.*
>
> [photo] *The Heart Cleanser Love Charm: pink quartz, with its wish capsule.*
>
> **$59 · free shipping worldwide · one payment**
>
> **What's in the box**
> - The charm: a pink quartz bracelet with a small wish capsule built in
> - Blank wish papers that fit the capsule
> - A printed card with the steps and care notes
> - A gift box
>
> **When your charm arrives**
> 1. Write your wish on one of the papers. Put the paper in the capsule and close the capsule.
> 2. Hold the charm in your left palm and say: "I am ready to receive love, too."
> 3. Put the charm on your left wrist.

*Below this (not rewritten here): the shipping times, the total, the button, the small print.*

---

### Noticed along the way (outside this audit)

- **Image drift.** `heartCleanserBooking.ts` and the screenshots use `rosequartz2`, and the file comment says
  "never rosequartz3". But `0-WORKFLOW-09.md` says Joel confirmed `rosequartz3` shows the real packaging and "the
  offer page now uses its 800px version", and `BookingPage.tsx`'s comment says "the 800px gift-box photo". The code
  and the docs disagree.
- **Box name.** If that photo is the real packaging, the box and card she receives say "Wish Miracle Bracelet",
  not "Heart Cleanser Love Charm". Worth deciding before the page lists "a gift box" as part of her order.

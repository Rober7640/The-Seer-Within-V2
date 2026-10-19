# 04 — retargeting OFFER page copy (for review)

> **Edited after review (2026-10-16), both variants — `tarotRetargetOffer.ts` is the source of truth:**
> 1. Why-you-pay-less: "Readers who come back to me pay less than a first-time reader, and you're
>    one of them." → "Because you've sat at my table before, and you came back to it. So I've set a
>    lower rate for you." (the old line was a general policy that is false via a normal lander).
> 2. Includes item: "In your inbox within 24 hours." → "Sent straight to your inbox."
> 3. Step 3: dropped the leading "Within 24 hours:". "24 hours" now appears 3 times, not 5.

**Page:** `/fb-tarot/b?src=retarget&hook=<hook>` — the only retarget page (the chat and letter formats
and the format test were removed 2026-10-16).
**Source of truth:** `client/src/content/tarotRetargetOffer.ts`. The text below was taken from that
file word for word. Edit the TS file, not this doc.
**Status:** committed on branch `retargeting-page`, not live.

## What the page does, in one line

Evelyn says she kept her place, takes the blame off, says she was worried, makes one flat claim
(something has been holding love back / holding her money still), and puts the Energy Clearing
Ritual at the returning-reader price right under it. No cards. No teaching.

The ad in front of it ends on **"Evelyn is waiting for you"**, so the eyebrow repeats those exact
words. The daughter story from the ad is **not** on the page (no testimonials or invented people).

## Word count

| | Whole page (no-name version) | Before the offer box (eyebrow + headline + intro) | Paragraphs |
|---|---|---|---|
| LOVE | **499** | 91 | 4 intro, 2 why, 2 doubts |
| MONEY | **499** | 90 | 4 intro, 2 why, 2 doubts |

Inside the 350–550 target. Counted on every field the page renders, with the button shown once.

## Checks run

- **No price or percent outside the three render fields.** `$` and `%` appear only in
  `badge(pct)` and `offerButton(price)`; `priceLabel` carries no number. The only digits in the
  copy are "24 hours". Everywhere else the saving is said in words: "you pay less than a
  first-time reader" / "the returning reader's rate".
- **Banned words:** psychic, fortune, spell, magic, prediction, witch, horoscope, astrology,
  tarot, card(s), guarantee, refund, money back, penny, daughter, "Are you", today only,
  countdown, expires: **0 hits.** One near-miss fixed: the first MONEY draft said "holding your
  money back" in four places. Above a buy button, "money back" reads like a refund promise, so
  it's now "holding your money still" (the chat version made the same fix).
- **`scripts/check-read.mjs` `checkBubble` + the `check-draft.mjs` comprehension rules** (bare
  It/That/This opener, concept-nouns, aphorisms, contraction at a clause end): **0 real
  problems.** The only flags are the chat-bubble limits (25 words / 2 sentences) on `intro[0]`
  and the P.S. — this page is paragraphs, not bubbles, and both read short aloud.
- **Contractions:** 32 of 33 possible spots (97%). The one left is "every minute of it is mine",
  where "of it's mine" would be the clause-end bug.
- **`tsc --noEmit -p .`:** no errors in `tarotRetargetOffer.ts`. The project still has its 46 old
  errors in other files.

---

## LOVE — the page, top to bottom

*[Evelyn's photo]* **Evelyn is waiting for you**

# I've kept your place at my table, dear

It's Evelyn, dear. You came to me with love on your mind, and then life pulled you away. That's
no crime.
*(cookie hit: "{firstName}, it's Evelyn. You came to me with love on your mind, and then life
pulled you away. That's no crime.")*

I don't usually call anyone back. But you've been on my mind more than once since, and I was
worried about you.

You were close to what you came for. Something has been holding love back from you, and I'd like
to clear it myself, tonight.

And because you came back, you pay the returning reader's rate.

> **[ 14% off for you ]**
> ### Your Energy Clearing Ritual
> Tonight I'll trace that hold to its root, cut it, and seal it. My written reading reaches you by
> email within 24 hours.
>
> Returning reader rate · ~~$35~~ **$30**
>
> *Who am I clearing this for?* [ first name ]
> **[ Begin my clearing · $30 ]**
> Evelyn's Energy Clearing Ritual, done tonight. Your written reading by email within 24 hours.

### What you'll get
- **The clearing, done by me tonight.** Two to three hours of slow work, and every minute of it
  is mine.
- **The hold traced, cut and sealed.** I follow it back to its root, cut it, and seal it so it
  can't come back.
- **Your written reading by email.** In your inbox within 24 hours. It tells you what I found and
  what I cleared.
- **Guidance for the weeks ahead.** Written for you and sent in the same reading, so you know
  what comes next.
- **Nothing for you to do.** There's nothing to light, hold or practise. I do the work.

### How it works
1. **Write your first name and tap the button.** You'll pay on a secure checkout page and give
   your email there, so I know where to send your reading.
2. **Tonight, I do the work.** I clear the hold myself, two to three hours of it. You carry on
   with your evening.
3. **Your reading lands in your inbox.** Within 24 hours: what I found, what I cleared, and my
   guidance for the weeks ahead.

### Why you pay less
Because you've sat at my table before. Readers who come back to me pay less than a first-time
reader, and you're one of them.

There's no catch, dear. I'm glad you're back.

**"Is this really for me?"**
You came to me with love on your mind, dear. That's who this is for.
I clear what's been holding love back from you. You don't need the right words or the perfect
question.

**"Do I have to do anything?"**
No, dear. Write your first name so I know who I'm clearing this for, and I'll take it from there.
There's nothing to light, hold or practise. I do the work, and you read what I found.

*[name box + Begin my clearing · $30]*

I'm here when you're ready,
**Evelyn**

P.S. You pay less than a first-time reader, because you came back. Tonight I'll clear what's been
holding love back from you, and my written reading reaches you within 24 hours.

*[name box + Begin my clearing · $30]*

**Back from Stripe (top of page):** You're back, dear. Your place is still here, and there's no
hurry at all.

---

## MONEY — what changes

Everything not listed is word for word the same as LOVE. The stuck thing is her money, never a man.

| Field | MONEY says |
|---|---|
| `intro[0]` / `introNamed` | It's Evelyn, dear. You came to me with **money** on your mind, and then life pulled you away. That's no crime. |
| `intro[2]` | You were close to what you came for. Something has been **holding your money still**, and I'd like to clear it myself, tonight. |
| `steps[1].text` | I clear **the hold on your money** myself, two to three hours of it. You carry on with your evening. |
| `doubts[0].a[0]` | You came to me with **money** on your mind, dear. That's who this is for. |
| `doubts[0].a[1]` | I clear what's been **holding your money still**. You don't need **a new plan** or the perfect question. |
| `ps` | P.S. You pay less than a first-time reader, because you came back. Tonight I'll clear what's been **holding your money still**, and my written reading reaches you within 24 hours. |

`offerSummary` is the same in both ("Tonight I'll trace that hold to its root…"): "that hold"
points back to the intro line just above the box.

---

## Every offer claim, and where it comes from

The product and every deliverable are the ones the tarot funnel's chat already sells. Nothing
new is promised.

| The page says | Source |
|---|---|
| Energy Clearing Ritual, done by Evelyn herself, **tonight** | `server/routes.ts:991` (Stripe product name) · `client/src/hooks/useConversation.ts:2157` ("Tonight, I'll enter a deep meditative state…") · `server/lib/evelynThankyouGift.ts:256` ("on the night they ordered it") |
| Traced to its root, cut, sealed so it can't come back | `client/src/hooks/useConversation.ts:2164` ("trace the roots of this block, sever its hold, and seal the clearing so it can't return") |
| Two to three hours of her work | `client/src/hooks/useConversation.ts:2160` / `:2165` · `server/lib/evelynThankyouGift.ts:256` |
| Nothing to light, hold or practise | `server/lib/evelynThankyouGift.ts:258` ("nothing for them to light, burn, wear, hold or do") |
| Written reading by email **within 24 hours**: what she found, what she cleared, guidance for the weeks ahead | `server/lib/prompts.ts:336–337` (`getOfferExplanation`) · `client/src/pages/SuccessPage.tsx:313` |
| "Written for you" | Stripe line `checkoutLineDescription(firstName, src)` = "Personalized reading for {name}" (`server/routes.ts:1389`); the required first-name box feeds it |
| Pay on a secure checkout page and give your email there | The page checks out with no email on purpose; Stripe Checkout collects it (`server/routes.ts:1203`) |
| ~~$35~~ $30, 14% off, "Returning reader rate" | Rendered from `retargetOfferPricing()` / `RETARGET_OFFER_PRICES` (`shared/retargetCheckout.ts:97`); the server charges `30_tarot_rt` only for `src=retarget` + format `offer` (`server/routes.ts:1209–1222`) |
| "You pay less than a first-time reader" | The tarot lander's first-time price is the fixed $35 entry; this $30 is only reachable from this page |

**Not claimed, on purpose:** no guarantee, no refund, no "every penny returned", no "5–7 pages",
no customer counts, no deadline.

## Judgement calls for the operator

1. **The lead has one flat claim, and only one:** "Something has been holding love back from
   you." Without it, the page sells a clearing of nothing. It's the same claim the other two
   versions make, said without the cards.
2. **"You were close to what you came for."** This is the hint of why she'd come back. It's true
   in the loose sense for everyone (no one in this audience got the clearing), but a woman who
   left after one minute may feel it's a stretch.
3. **No "14%" in the P.S. or the why section.** The brief allowed it in the P.S. I said it in words
   instead ("you pay less than a first-time reader"), so no line goes wrong if the rate changes.
   The badge, price box and button already show 14% / $35 / $30 three times. Say if you want
   "14%" in the P.S.
4. **"Readers who come back to me pay less."** True on this page: the $30 only exists here. A
   returning reader who goes back to a normal lander still pays $35, so this is the boldest
   claim in the why section.
5. **"Tonight" for a morning buyer.** Same exposure as live V1 and the other two versions.
6. **"The returning reader's rate" is a name, not a deadline.** There's no "today only" and no
   promise the rate stays forever. The cancelled note says "no hurry at all", which is true while
   the page shows the price.
7. **The headline doesn't mention the offer.** "I've kept your place at my table, dear" is the
   subtle lead you asked for. The offer lands three short paragraphs later. If you want the
   saving in the headline, the shape would be "I've kept your place, dear, and it costs you less
   to come back".
8. **Heavy repetition of "within 24 hours"** (box, list, steps, button note, P.S.). That's on
   purpose on a price page, but it's the first thing to cut if it reads like a form.

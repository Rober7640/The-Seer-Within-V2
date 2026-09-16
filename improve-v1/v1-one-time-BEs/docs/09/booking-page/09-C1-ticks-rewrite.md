# 09-C1 — The commitment ticks, rewritten

*Proposal, 2026-09-15. Nothing in code or in any existing file was changed. Version 2 (top) is the current
proposal. Version 1 (below) is kept for reference.*

---

## VERSION 2 (operator: product / ritual / magic)

*Operator, verbatim: "THE 4 TICKS SHOULD FOCUS MORE ON PRODUCT, ritual, the 'magic', rather than logistics."*

### Short answer

- **All four ticks are now about the charm and what it stands for.** They cover the wish kept in the capsule, the
  seven words and what "too" means, the left wrist and the pink quartz, and carrying the wish through the day.
  Every meaning comes from 09-E2 and 09-E3, at their claim level: a wearing ritual and what it stands for.
- **The logistics moved to the small print under the button:** box contents, free shipping, the shipping wording
  word for word, what the button does and "no subscription".
- **Small print no longer says "One payment of $59"** or "Stripe", so the Reiki order bump can sit beside the
  total without making the small print wrong. The bump copy is not written here.
- **Caption fixed:** it now says which crystal isn't included.
- Deck line unchanged from Version 1. Still no request paragraph. Button unchanged.

### V2.1 — Before and after (against the page as built)

| Line | As built | Version 2 | Why |
|---|---|---|---|
| Deck | Tick each line that's true for you. | Before checkout, please read and tick all four boxes below. Ticking the boxes doesn't charge you. | Unchanged from V1: the boxes are required, and ticking is free |
| Tick 1 | Yes — Evelyn's right. My wish should have me in it, too. | **Yes — I want to keep my wish for love inside my charm.** | The capsule holding her words is both letters' first promise. Says the charm is the whole bracelet and the papers come with it, before either is used |
| Tick 2 | Yes — I want a place to keep my wish, on my left wrist. | **Yes — I'll say, "I am ready to receive love, too."** | The seven words, quoted, not counted. "Too" is explained straight after the quote (E2: affection that comes back as readily as she gives it) |
| Tick 3 | Yes — I'll write the wish myself. | **Yes — I'll wear my pink quartz charm on my left wrist.** | Left as the receiving side, and pink quartz as tenderness, both said as "stands for", which is the letters' level |
| Tick 4 | Yes — I understand my charm has to travel to me. | **Yes — I want my wish to go with me through the day.** | E2 "Take the intention with you" and E3 "when your fingers touch the capsule". The morning moment says "can", so it isn't a daily promise |
| Tick 5 | Yes — I'll send $59, once, for my charm. | *(cut; the price is in the total, logistics in the small print)* | No logistics ticks |
| Request | Evelyn — … So please — | *(cut)* | Same reason as V1 §1 |
| Caption | The Heart Cleanser Love Charm: pink quartz, with its wish capsule. The clear crystal is for display only. | The Heart Cleanser Love Charm, a pink quartz bracelet with a wish capsule. The clear crystal under the bracelet is not included. | Readers weren't sure which crystal, or what "for display only" meant |
| Locked hint | Tick all five above to continue | Tick all four boxes above to show the button. | Count. Says a button is coming. "Checkout button" was dropped, because readers couldn't match that name to SEND ME MY LOVE CHARM |
| Total label | Total today | Total | "Today" suggested later charges |
| Small print | One payment of $59. Nothing recurring. … secure Stripe checkout page, before you pay. | See V2.2 | No "$59 one payment", because a bump will change the total. No "Stripe", which most readers didn't know. Box contents moved here |

**Every tick is true for a buyer from either letter.** Both letters give the capsule and her written words, the
seven words, the left wrist as the receiving side and pink quartz as tenderness. E2 says "the pink quartz carries
the tenderness we've chosen as this ritual's meaning"; E3 says "the pink quartz carries the tenderness we've given
this ritual". Both also give the wish kept close through the day. The E3-only idea ("I wish to feel…" under his
name) is left out, so an E2 buyer isn't asked to confirm something she never read.

**Claim level.** "Stands for" is used twice, which is the letters' symbolism. Nothing says the charm makes love
come, and no one else is promised to do anything. Round 2 caught one line ("the left wrist is the side that
receives love") that one reader took as the charm making her wrist receive love. It was rewritten to "stands for".

### V2.2 — The final copy

Paste into `client/src/lib/heartCleanserBooking.ts`. `PAGE_HEADER.deck` is the same as V1.

```ts
export const PAGE_HEADER = {
  title: 'Your Heart Cleanser Love Charm',
  deck: "Before checkout, please read and tick all four boxes below. Ticking the boxes doesn't charge you.",
} as const;

export const PAGE_IMAGE = {
  src: 'https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com/evelyn/backend-09/rosequartz-page-570.jpg',
  alt: 'The Heart Cleanser Love Charm, a pink quartz bracelet with a gold wish capsule, resting on a clear crystal.',
  caption: 'The Heart Cleanser Love Charm, a pink quartz bracelet with a wish capsule. The clear crystal under the bracelet is not included.',
} as const;

// The four statements (09-C1-ticks-rewrite, Version 2): the charm, the ritual and what it stands for.
// ⛔ No logistics here — shipping, price, address and checkout live in CHECKOUT.reassurance.
// ⛔ Claim level of 09-E2/E3: "stands for", never "makes" or "brings". No outcome for another person.
export const PAGE_STATEMENTS: PageStatement[] = [
  {
    lead: 'Yes — I want to keep my wish for love inside my charm.',
    body:
      'My charm is the whole bracelet: pink quartz, with a small wish capsule built in. Blank wish papers ' +
      "come with my charm. I'll write my wish on one of the papers, put the paper in the capsule and close " +
      'the capsule. I can keep what I write to myself.',
  },
  {
    lead: 'Yes — I\'ll say, "I am ready to receive love, too."',
    body:
      '"Too" means I receive love as well as give it. After my wish is in the capsule, I\'ll hold my charm ' +
      'in my left palm and say that sentence.',
  },
  {
    lead: "Yes — I'll wear my pink quartz charm on my left wrist.",
    body:
      'Wearing my charm on the left stands for receiving love. The pink quartz stands for tenderness, the ' +
      "kind of love I'd like to welcome into my life.",
  },
  {
    lead: 'Yes — I want my wish to go with me through the day.',
    body:
      'As I put my charm on in the morning, I can stop for a moment and think of my wish. The paper with my ' +
      'wish stays in the capsule. When I touch the capsule, I can remember what I wrote.',
  },
];

// PAGE_REQUEST — removed. Delete the export and its block in BookingPage.tsx.

// in CHECKOUT:
  totalLabel: 'Total',
  lockedHint: 'Tick all four boxes above to show the button.',
  // ⛔ No "$59" and no "one payment of" — the order bump sits beside the total and changes it.
  // Shipping wording word for word against copy-check OFFERS['09'].sla.
  reassurance:
    'In the gift box: your charm, blank wish papers that fit the capsule, and a printed card showing how to ' +
    'use and care for your charm. Free shipping worldwide. Your charm ships within 2 business days, then ' +
    'arrives in 7–14 days in the US and 2–4 weeks everywhere else. The 7–14 days and 2–4 weeks start on ' +
    'the day your charm ships. Once all four boxes are ticked, the button above takes you to the secure ' +
    "checkout page, where you'll enter your shipping address and pay. No subscription.",
```

The same text as she sees it:

> *Before checkout, please read and tick all four boxes below. Ticking the boxes doesn't charge you.*
>
> [photo] *The Heart Cleanser Love Charm, a pink quartz bracelet with a wish capsule. The clear crystal under the
> bracelet is not included.*
>
> ☐ **Yes — I want to keep my wish for love inside my charm.**
> My charm is the whole bracelet: pink quartz, with a small wish capsule built in. Blank wish papers come with my
> charm. I'll write my wish on one of the papers, put the paper in the capsule and close the capsule. I can keep what
> I write to myself.
>
> ☐ **Yes — I'll say, "I am ready to receive love, too."**
> "Too" means I receive love as well as give it. After my wish is in the capsule, I'll hold my charm in my left palm
> and say that sentence.
>
> ☐ **Yes — I'll wear my pink quartz charm on my left wrist.**
> Wearing my charm on the left stands for receiving love. The pink quartz stands for tenderness, the kind of love I'd
> like to welcome into my life.
>
> ☐ **Yes — I want my wish to go with me through the day.**
> As I put my charm on in the morning, I can stop for a moment and think of my wish. The paper with my wish stays in
> the capsule. When I touch the capsule, I can remember what I wrote.
>
> Total · $59.00 *(the order bump sits beside this; its copy is written elsewhere)*
>
> *Tick all four boxes above to show the button.* → **SEND ME MY LOVE CHARM**
>
> *In the gift box: your charm, blank wish papers that fit the capsule, and a printed card showing how to use and
> care for your charm. Free shipping worldwide. Your charm ships within 2 business days, then arrives in 7–14 days
> in the US and 2–4 weeks everywhere else. The 7–14 days and 2–4 weeks start on the day your charm ships. Once all
> four boxes are ticked, the button above takes you to the secure checkout page, where you'll enter your shipping
> address and pay. No subscription.*
>
> *Refund policy · Questions: hi@theseerwithin.com*

**What else changes when this is pasted.** Same as V1 §2 (doc first, remove the request block, update the tests that
pin old copy), plus these tests:
- The shipping test reads `PAGE_STATEMENTS[3].body`, which no longer has shipping, and expects
  `secure Stripe checkout page`.
- The price test expects `PAGE_STATEMENTS[4].lead` to contain `$59` and `reassurance` to contain `One payment of $59.`

Both assertions go.

### V2.3 — Cold read

**How it was run.** Three rounds, three new readers each, nine in all, none reused from Version 1. Each reader got
the whole page as she sees it: deck, caption, ticks, total, hint, button and small print. They also got one line
about who she is: a woman over 55, on a phone, reading once, who tapped a link in an email from Evelyn. Nobody saw
the letters, the audit or this doc.

| Round | What the readers found | What changed |
|---|---|---|
| 1 | "Kept inside my charm": kept by whom? (3 of 3). "The blank wish papers" came before any papers (3 of 3). "The words" meant her wish in one box and the seven words in the next (2 of 3). "This ritual" first appeared with nothing before it (3 of 3). "Take my wish" / "take a few seconds": same word, two meanings (2 of 3). "Each morning I'll…" read as a daily promise (3 of 3) | "I want to keep my wish…". "Blank wish papers come with my charm". "The words" replaced with "what I write" and "that sentence". "Ritual" dropped. Tick 4 opens on "I want" and its morning moment says "can" |
| 2 | "With this charm, the left wrist is the side that receives love": one reader took it as the charm making her wrist receive love, which is an outcome claim (2 of 3 saw a second reading). "Checkout button" and SEND ME MY LOVE CHARM read as two buttons (3 of 3). "Arrival times" was re-read, and "times" read as clock times (1 of 3) | "Wearing my charm on the left stands for receiving love." Small print now says "the button above". "The 7–14 days and 2–4 weeks start on the day your charm ships." "Too" is explained right after the quote |
| 3 | Every sentence said back the same way by all three. No "I can't". No second meaning that changes what she's agreeing to | **No change. This is the final copy** |

### Final round, line by line

| Line | Read as (P · Q · R) | Verdict |
|---|---|---|
| Before checkout, please read and tick all four boxes below. | Read and tick all four before paying · same · same | ✅ CLEAR |
| Ticking the boxes doesn't charge you. | Ticking costs nothing · same · same | ✅ CLEAR |
| Caption: …a pink quartz bracelet with a wish capsule. | Pink stone bracelet with a small holder for a wish · same · same | ✅ CLEAR. All three looked for the capsule in the photo |
| The clear crystal under the bracelet is not included. | The clear rock in the photo doesn't come with it · same · same | ✅ CLEAR (was confusing as built) |
| Yes — I want to keep my wish for love inside my charm. | I want my love wish inside the bracelet · same · same | ✅ CLEAR. "Inside" was answered by the next line |
| My charm is the whole bracelet: pink quartz, with a small wish capsule built in. | The charm is the whole bracelet, not a dangle · same · same | ✅ CLEAR |
| Blank wish papers come with my charm. | Empty slips come with it · same · same | ✅ CLEAR |
| I'll write my wish on one of the papers, put the paper in the capsule and close the capsule. | Write it, put it in, shut it · same · same | ✅ CLEAR |
| I can keep what I write to myself. | Nobody has to see my wish · same · same | ✅ CLEAR |
| Yes — I'll say, "I am ready to receive love, too." | I promise to say this sentence · same · same | ✅ CLEAR |
| "Too" means I receive love as well as give it. | I get love, not only give it · same · same | ✅ CLEAR. All three first read "too" as "me too" and this line corrected it. P and Q: the line sounds a little like someone else explaining |
| After my wish is in the capsule, I'll hold my charm in my left palm and say that sentence. | Once the wish is in, hold it in my left hand and say the line · same · same | ✅ CLEAR |
| Yes — I'll wear my pink quartz charm on my left wrist. | I promise to wear it on the left · same · same | ✅ CLEAR |
| Wearing my charm on the left stands for receiving love. | Left side means taking love in · same · same | ✅ CLEAR. No reader read it as the charm doing something |
| The pink quartz stands for tenderness, the kind of love I'd like to welcome into my life. | The pink stone means gentle love, the kind I want · same · same | ✅ CLEAR |
| Yes — I want my wish to go with me through the day. | I want my wish with me all day · same · same | ✅ CLEAR |
| As I put my charm on in the morning, I can stop for a moment and think of my wish. | I can pause and think of it, my choice · same · same | ✅ CLEAR |
| The paper with my wish stays in the capsule. | The paper stays inside · same · same | ✅ CLEAR |
| When I touch the capsule, I can remember what I wrote. | Touching it reminds me · same · same | ✅ CLEAR |
| Tick all four boxes above to show the button. | Tick all four and a button appears · same · same | ✅ CLEAR. All three noted "the button" points at something not on screen yet, and all three still said it back the same |
| In the gift box: your charm, blank wish papers…, and a printed card… | Bracelet, papers, how-to and care card · same · same | ✅ CLEAR |
| Your charm ships within 2 business days, then arrives in 7–14 days… / The 7–14 days and 2–4 weeks start on the day your charm ships. | Leaves within 2 working days, then 7–14 days (US) or 2–4 weeks, counted from shipping · same · same | ✅ CLEAR |
| Once all four boxes are ticked, the button above takes you to the secure checkout page, where you'll enter your shipping address and pay. | The purple button opens a pay page where I add my address and pay · same · same | ✅ CLEAR |
| No subscription. | One payment, nothing repeats · same · same | ✅ CLEAR |

**What each tick commits her to, in the final readers' words:** (1) I want my love wish sealed inside the bracelet,
written on a paper. (2) I'll hold the bracelet in my left hand and say "I am ready to receive love, too", and
"too" means receiving love as well as giving it. (3) I'll wear it on my left wrist: left stands for receiving
love, and pink quartz for tenderness. (4) I want my wish with me through the day; the morning pause is my choice.
All three agreed that ticking charges nothing, the button opens checkout, and delivery counts from shipping.

### Still shaky (none are misreadings)

- **Ticks 2 and 3 read as promises** (3 of 3), and readers asked "what if I don't?" Two of three raised a watch
  already on the left wrist. This is how the tick pattern is meant to work, and ticks 1 and 4 open on "I want" to
  lighten the load. Nobody misread what they were agreeing to.
- **Out loud or silently?** Readers wondered. The letters don't say either, so the page doesn't invent it.
- **The button still sounds like it pays on the spot** (3 of 3). The button wording is fixed. The small print
  settles it, but it sits under the button.
- **"The button" in the grey hint** points at a button not yet shown (3 of 3). Every reader still understood it.
  "A button will appear here" would be a safe swap, but it has not been cold-read.
- **"Heart Cleanser"** is never explained, and "The Seer Within" in the support email isn't linked to Evelyn. Both
  are outside this brief.


---

## VERSION 1 (logistics ticks; superseded by Version 2, kept for reference)

### Short answer

- **Four ticks, not five.** Old tick 1 ("Evelyn's right…") is gone. The four that stay each confirm one thing
  she should know before paying for a bracelet: what she gets, what she'll do with it, how long it takes, and what
  it costs.
- **Every tick now opens on "I want" or "I know".** Readers stopped reading them as promises or as payment.
- **The deck line says the ticks come before checkout and don't charge her.**
- **The request paragraph is dropped.** Nothing now sits between the ticks, the total and the button except the
  total.
- **Button unchanged:** SEND ME MY LOVE CHARM. Shipping wording unchanged, word for word.

---

## 1. Before and after

| Line | Before (as built) | After | Why |
|---|---|---|---|
| Deck | Tick each line that's true for you. | Before checkout, please read and tick all four boxes below. Ticking the boxes doesn't charge you. | Read as an optional quiz. Now it's a step before checkout, and the charge worry is answered at the top |
| Tick 1 (old) | **Yes — Evelyn's right. My wish should have me in it, too.** I've spent a long time thinking about what someone else feels… | *(cut)* | Evelyn made no prediction. "That paper" came before any paper. Not true for every buyer. A replacement would be filler (see below) |
| Tick 1 | **Yes — I want a place to keep my wish, on my left wrist.** I know what I'm asking for: one Heart Cleanser Love Charm… | **Yes — I want one Heart Cleanser Love Charm.** The charm is the whole bracelet… *(full text in §2)* | She now confirms which item she's getting. The box contents describe it, and she isn't ticking a packing list. Says the charm *is* the bracelet, because every reader asked |
| Tick 2 | **Yes — I'll write the wish myself.** Nobody writes it for me. When my charm arrives… place it in the capsule and close it… | **Yes — I know what to do when my charm arrives.** I'll write my wish on one of the wish papers and put the paper in the capsule… | "Nobody writes it for me" had a sad second meaning. The two "it"s are now "the paper" and "the capsule". "My own wish" was tried and dropped: readers asked "own as opposed to whose?" |
| Tick 3 | **Yes — I understand my charm has to travel to me.** …I'm glad to know the real wait before I pay. | **Yes — I know how long my charm takes to reach me.** My charm ships within 2 business days, then arrives in 7–14 days in the US and 2–4 weeks everywhere else. The arrival times count from the day my charm ships. | The feeling is gone. One sentence added because every reader asked whether the days count from ordering or from shipping |
| Tick 4 | **Yes — I'll send $59, once, for my charm.** Shipping is free, wherever I live… | **Yes — I know my charm costs $59, in one payment.** Shipping is free worldwide… a button appears… | "Send" and "I'll pay" both read as paying now. "Once" and "just once" read as "buy only once". Now it says what the button does, because the button isn't on screen when she reads this |
| Request | Evelyn — I've thought about the wish I'll write. / I'll put it in the capsule… say the seven words… before the messages and the errands start. / I'm ready to receive love, too. So please — | *(cut)* | See below |
| Locked hint | Tick all five above to continue | Tick all four boxes above to show the checkout button. | Count changes. Readers at the bottom now know a button is coming |
| Total label | Total today | Total | The audit's readers wondered about charges on other days |

**Why four and not five.** Before paying for a bracelet she needs to confirm four things: the item, the ritual, the
wait and the price. A fifth tick would be either the address, which already sits in tick 4 as a checkout step, or a
feeling about the wish. The letters' feeling ("does it include you?") isn't true for every buyer. That's the same
fault that sank old tick 1.

**Why the request goes.** A short "I've thought about the wish I'll write. I'm ready to receive love, too." was tried
in round 1 with no "Evelyn —" and no "So please —". All three readers couldn't say who was speaking, looked for a
fifth tick box beside it, and hit "too" a second time. The paragraph's job was to lead into the button across
the total, and that join can't work with the $59 sitting between them. The button already says what she's asking for.

---

## 2. The final copy

Paste into `client/src/lib/heartCleanserBooking.ts`, replacing `PAGE_HEADER`, `PAGE_STATEMENTS`, `PAGE_REQUEST` and
the two `CHECKOUT` fields shown. `CHECKOUT.button`, `reassurance`, refund and support stay as they are.

```ts
export const PAGE_HEADER = {
  title: 'Your Heart Cleanser Love Charm',
  deck: "Before checkout, please read and tick all four boxes below. Ticking the boxes doesn't charge you.",
} as const;

// The four statements (09-C1-ticks-rewrite). Each one confirms a single thing she should know before
// paying for a physical item: the item, the ritual, the wait, the price. None depends on an add-on.
// Statement 3 is the real wait, word for word against copy-check's OFFERS['09'].sla — never "soon".
export const PAGE_STATEMENTS: PageStatement[] = [
  {
    lead: 'Yes — I want one Heart Cleanser Love Charm.',
    body:
      'The charm is the whole bracelet: pink quartz, with a small capsule built in to hold my wish. ' +
      "Inside the gift box, I'll also find blank wish papers that fit the capsule, and a printed card " +
      'that shows how to use and care for the charm.',
  },
  {
    lead: 'Yes — I know what to do when my charm arrives.',
    body:
      "I'll write my wish on one of the wish papers and put the paper in the capsule. Then I'll close the " +
      "capsule, hold the charm in my left palm and say the words from Evelyn's email: \"I am ready to " +
      "receive love, too.\" Last, I'll put the charm on my left wrist.",
  },
  {
    lead: 'Yes — I know how long my charm takes to reach me.',
    body:
      'My charm ships within 2 business days, then arrives in 7–14 days in the US and 2–4 weeks everywhere ' +
      'else. The arrival times count from the day my charm ships.',
  },
  {
    lead: 'Yes — I know my charm costs $59, in one payment.',
    body:
      "Shipping is free worldwide, and there's no subscription. Once I've ticked all four boxes, a button " +
      "appears. The button takes me to the secure checkout page, where I'll enter my shipping address and pay.",
  },
];

// PAGE_REQUEST — removed (09-C1-ticks-rewrite §1). Delete the export and its block in BookingPage.tsx.

// in CHECKOUT:
  totalLabel: 'Total',
  lockedHint: 'Tick all four boxes above to show the checkout button.',
```

The same text as she sees it:

> *Before checkout, please read and tick all four boxes below. Ticking the boxes doesn't charge you.*
>
> ☐ **Yes — I want one Heart Cleanser Love Charm.**
> The charm is the whole bracelet: pink quartz, with a small capsule built in to hold my wish. Inside the gift box,
> I'll also find blank wish papers that fit the capsule, and a printed card that shows how to use and care for the
> charm.
>
> ☐ **Yes — I know what to do when my charm arrives.**
> I'll write my wish on one of the wish papers and put the paper in the capsule. Then I'll close the capsule, hold
> the charm in my left palm and say the words from Evelyn's email: "I am ready to receive love, too." Last, I'll put
> the charm on my left wrist.
>
> ☐ **Yes — I know how long my charm takes to reach me.**
> My charm ships within 2 business days, then arrives in 7–14 days in the US and 2–4 weeks everywhere else. The
> arrival times count from the day my charm ships.
>
> ☐ **Yes — I know my charm costs $59, in one payment.**
> Shipping is free worldwide, and there's no subscription. Once I've ticked all four boxes, a button appears. The
> button takes me to the secure checkout page, where I'll enter my shipping address and pay.
>
> Total · $59.00
>
> *Tick all four boxes above to show the checkout button.* → **SEND ME MY LOVE CHARM**

### What else has to change when this is pasted

- **`09-C1-booking-page.md` first.** The page file's header says the doc changes before the code.
- **`BookingPage.tsx`:** remove the `PAGE_REQUEST` import and its block (the `<div>` under "The request"). An
  empty array would still draw a divider and a gap above the total.
- **`heartCleanserBooking.test.ts`:** these tests pin the old copy and will fail: the deck, "exactly the five
  statements", the request test, `lockedHint`, `PAGE_STATEMENTS[3]` (shipping is now `[2]`), `PAGE_STATEMENTS[4].lead`
  (price is now `[3]`), `totalLabel`, and the five-item `allStatementsTicked` arrays. `allStatementsTicked` itself
  needs no change, because it counts `PAGE_STATEMENTS.length`.

---

## 3. Cold read

**How it was run.** Three rounds, three new readers each, nine in all. Nobody read twice. Each reader got only the
page text as she sees it, plus one line about who she is: a woman over 55, on a phone, reading once, who tapped a
link in an email. Nobody saw this doc, the audit, the letters or the brief.

| Round | What the readers found | What changed |
|---|---|---|
| 1 | "I'm ordering" read as placing the order (3 of 3). "My own wish": own as opposed to whose? (3 of 3). "Just once" could mean buy only once (3 of 3). Days counted from what? (3 of 3). The request: nobody could say who was speaking or what it was for (3 of 3) | "I want". "I know what to do". "In one payment". Added the arrival-times sentence. Cut the request |
| 2 | "Evelyn's letter": which letter? (3 of 3). "The button below" isn't on screen yet (3 of 3). "I'll pay $59" felt like paying now (3 of 3). Charm and bracelet read as two things (2 of 3) | "Evelyn's email". "Once I've ticked all four boxes, a button appears". "I know my charm costs $59". "The charm is the whole bracelet" |
| 3 | Every line said back the same by all three. Nothing broken | **No change. This is the final copy** |

### Final round, line by line

| Line | Read as (G · H · I) | Verdict |
|---|---|---|
| Before checkout, please read and tick all four boxes below. | Read and tick all four before paying · same · same | ✅ CLEAR |
| Ticking the boxes doesn't charge you. | Ticking takes no money · same · same | ✅ CLEAR |
| Yes — I want one Heart Cleanser Love Charm. | I want to buy one · same · same | ✅ CLEAR |
| The charm is the whole bracelet: pink quartz… capsule built in to hold my wish. | The full pink bracelet, not a piece hanging off one, with a tiny holder · same · same | ✅ CLEAR. All three paused on it first, because "charm" makes people picture a dangle. The line is there to fix that, and it did |
| Inside the gift box, I'll also find blank wish papers… and a printed card… | Box also holds blank slips and an instruction card · same · same | ✅ CLEAR. "The gift box" is new here, but all three took it as the box the charm comes in |
| Yes — I know what to do when my charm arrives. | I understand the steps · same · same | ✅ CLEAR. G and H: a little like a promise |
| I'll write my wish… put the paper in the capsule. | Write a wish on a slip, put the slip in the holder · same · same | ✅ CLEAR |
| Then I'll close the capsule… say the words from Evelyn's email: "I am ready to receive love, too." | Close it, hold it in the left hand, say the line from the email she came from · same · same | ⚠ CLEAR except **"too"**: all three saw two readings ("like other people" / "as well as giving love") |
| Last, I'll put the charm on my left wrist. | Wear it on the left wrist · same · same | ✅ CLEAR |
| Yes — I know how long my charm takes to reach me. | I understand the delivery time · same · same | ✅ CLEAR |
| My charm ships within 2 business days, then arrives in 7–14 days… | Sent within 2 working days, then 7–14 days (US) or 2–4 weeks · same · same | ✅ CLEAR |
| The arrival times count from the day my charm ships. | The wait starts when it's sent, not when I order · same · same | ✅ CLEAR |
| Yes — I know my charm costs $59, in one payment. | $59, paid once · same · same | ✅ CLEAR |
| Shipping is free worldwide, and there's no subscription. | No postage, no repeat charges · same · same | ✅ CLEAR |
| Once I've ticked all four boxes, a button appears. | After four ticks a button shows · same · same | ✅ CLEAR. All three noted that an "I" line is describing how the page works. Nobody misread it |
| The button takes me to the secure checkout page, where I'll enter my shipping address and pay. | Button opens the payment page; address and payment happen there · same · same | ✅ CLEAR |
| Tick all four boxes above to show the checkout button. | Tick all four and the button shows · same · same | ✅ CLEAR |

**What each tick commits her to, in the final readers' words:** (1) I want one, and I know what's in the box.
(2) I understand the steps. (3) I accept the wait, counted from shipping. (4) I know it's $59 paid once, and I pay
on the next page. All three agreed that ticking charges nothing and that the button leads to checkout.

### Still shaky

- **"too" in the ritual line.** This wording is fixed and can't change. Cold readers haven't read the letters. A real
  buyer has: 09-E2 spends a section on "too", and 09-E3 quotes the line. Naming "Evelyn's email" gives the words a
  source, which is as far as the page can go.
- **The button still sounds like it pays on the spot** (3 of 3). The button wording is fixed. Tick 4 now says what
  the button does, and all three readers used that to settle it.
- **Tick 2 feels a little like a promise to do a ritual** (2 of 3 in round 3). Nobody misread it. One reader asked
  whether she could tick it if she wasn't sure she'd do every step.
- **Working days or calendar days?** Some readers wondered about "7–14 days". The shipping wording is fixed.

### Noticed outside the ticks (not changed here)

- **Caption "The clear crystal is for display only."** All three round-1 readers were unsure which crystal it means.
- **"Stripe" in the small print.** Most readers didn't know the name. The ticks now say "the secure checkout page".
- **Small print "One payment of $59."** This becomes wrong once an add-on can sit beside the total. None of the four
  ticks depends on it.
- **"Your" in the title** made a few readers think they had already ordered.

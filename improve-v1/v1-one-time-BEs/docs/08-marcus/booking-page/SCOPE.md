# 08 Marcus — booking page scope for approval


> **Latest confirmed decisions:** standard delivery within 24 hours; +$12.77 bump within 12 hours, both measured from confirmed main payment. Audio shares that order deadline. Use Replicate Chatterbox with the Marcus voice Joel will supply. Create a NEW Marcus n8n workflow; existing workflows must remain untouched. See the delivery policy and Chatterbox setup in the n8n folder. These decisions supersede older open-timing/provider notes below.

Status: HTML prototype built; direct-response copy revisions applied for review.

Prototype: [booking page mockup](mockup.html). The optional bump is displayed directly on the booking page and changes delivery from 24 hours to 12 hours. See [funnel checklist](../FUNNEL-BUILD-CHECKLIST.md).

## What this page does

Continue the exact reading the visitor clicked from, show what remains to be read, and offer that
personal reading for **$35**. The same page collects her name and delivery email, displays the
optional **$12.77 order bump**, updates the total, and hands the selected order to payment.

The page should feel like Marcus continuing his letter. Keep the offer clear without restarting
the sales argument or explaining the internal tarot system.

## Confirmed decisions

| Item | Decision |
|---|---|
| Main offer | One personal reading of the positions left face down in the originating email |
| Main price | $35; no tier selection |
| Required reading inputs | First name and last name, in separate fields |
| Order bump price | $12.77 |
| Total without bump | $35.00 |
| Total with bump | $47.77 |
| Next deliverable | Standalone interactive HTML built for review |

Currency is assumed to be USD, matching 07. Prices describe one purchase, not a subscription.
The bump buys delivery within 12 elapsed hours of confirmed payment. Without it, delivery is within 24 hours.

## Proposed visitor flow

**Headline → face-up cards → face-down cards → $35 offer → first and last name → Continue →
optional $12.77 bump and live total → payment.** There is no separate bump or order-review page.

For this first prototype, use the latest healing email as the worked example. The structure must
also support other topics without changing their card counts or reusing generic sales copy.

### 1. Headline that continues her question

Use a headline and short introduction specific to the originating email. Marcus's masthead may
identify him; the body does not need another “I'm Marcus” introduction.

Healing example:

> **Let's look at what you need now.**
>
> Continue your reading on what needs healing—and where you can begin.

Commitment example:

> **Let's look at where you go from here.**
>
> Continue your reading on why he won’t commit, what you need from him, and what you want to do next.

These are topic examples, not interchangeable paragraphs with a few nouns replaced.

### 2. The cards she has already seen

Show the actual face-up card illustrations from the email, in their original order, with their
position labels. A short caption can acknowledge what the free reading established. Do not
repeat the whole email. Connect the face-up cards to the remaining reading with a short,
topic-specific bridge.

Healing bridge:

> The Five of Cups and Strength brought us to the hurt you’ve been trying to put aside. The next
> four cards explore what you’ve found hardest to ask for, and what accepting support could look like.

Commitment bridge:

> The Knight of Cups and Two of Wands showed affection alongside hesitation. The next four cards
> bring the focus back to you: what waiting costs you, what you need from him, and how you want to respond.

For the healing example:

| Position | Card | Label |
|---|---|---|
| 1 | Five of Cups | What still hurts |
| 2 | Strength | What that hurt needs |

### 3. The cards still face down

Show each remaining card back with its question underneath. These questions make the personal
reading's scope tangible. The cards stay face down before purchase; tapping them must not reveal
a pretend personalized answer.

Healing example: **What you've been holding back · What you blame yourself for · What support
you can accept · Where you can begin.**

Use the actual counts from the source email. For this example, two face up and four face down.
“Two–three up / three–four down” is not a hardcoded rule for every topic.

### 4. The price appears below the cards

Proposed behavior: the price is visible as she scrolls to the offer. No extra click solely to
discover the price, and no name submission required to see it.

> **Your personal reading — $35**
>
> In your full reading, I’ll bring these cards together around your question: what still needs
> your attention, what you may be blaming yourself for, and a first step you can consider.

Commitment offer:

> In your full reading, I’ll bring these cards together to help you consider what you want to ask
> him for, what you’re willing to accept, and your next step if his answer stays uncertain.

The $35 buys the remaining reading. It must stand on its own; the bump does not supply something
missing from the main promise. Final format, delivery method, and timing must be stated beside the offer once decided.
For this mockup, show an explicit review placeholder; do not invent fulfilment promises.

### 5. Collect her name and continue

Two visible, labelled fields: **First name** and **Last name**. No additional personal-question
box in this first scope. Do not ask her to retell the story the email already introduced.

Keep the reason short and connected to the topic:

> Enter your first and last name so I can identify your personal tarot card. I’ll use the strengths
> and habits it represents as another way to explore how you ask for support—and how you respond
> when someone offers it.

Commitment name explanation:

> Enter your first and last name so I can identify your personal tarot card. I’ll use the strengths
> and habits it represents as another way to explore how you express what you need—and what makes
> it difficult to ask him for a clear answer.

The actual name-to-card method must support this explanation; its calculation is not defined here.

The booking form also collects the delivery email. The payment button displays the selected total.

### 6. Offer the optional $12.77 bump on the booking page

Place the bump after the name and delivery-email fields and before the final total and payment action.

- Show the bump's name, specific additional benefit, and **+$12.77** together.
- Make it optional and unselected by default.
- Use a clear unchecked opt-in: **Yes, prepare my reading within 12 hours — add $12.77**.
- Show the resulting total: **$47.77** with the bump or **$35.00** without it.
- Let her select or clear the bump without leaving the page or losing her form entries.
- The final payment action states the exact total and includes only what she selected.

**Confirmed, 2026-09-10:** the bump changes the delivery promise from within 24 hours to within 12 hours, measured from confirmed main payment.

### 7. Payment boundary

The proposed production flow submits the booking page’s selected order to secure payment. Collect
the delivery email on the booking page; first and last name alone cannot identify an inbox. Do not assume a
forwarded email link identifies the purchaser.

The standalone HTML will simulate this handoff and clearly say no payment was taken. It will not
create Stripe sessions, orders, receipts, or fulfilment jobs.

## Visual and copy direction

- Continue the email's cream paper, dark serif text, restrained red links, and Marcus identity.
- Use one readable body style. Headline hierarchy is intentional; ordinary paragraphs should not
  alternate between small and large text.
- Keep the cards prominent and their labels legible on a phone. Wrap the card groups rather than
  shrinking an entire desktop row to fit.
- Use topic-specific copy through the headline, offer, name explanation, and CTA.
- Avoid “NOTICE TO READERS,” internal spread mechanics, generic feature lists, countdowns, and
  a repeated lecture about personal cards.
- Reuse the existing face-up scans and matching backs. A duplicate hero photograph above them is
  not required by this scope.

## What carries forward from 07

Reference: [07 booking mockup](../../../copy/07-marcus/07-C1-booking-page-h2.html).

Keep the continuity of visible cards and labelled face-down positions, an explicit optional bump,
and a clear total. Leave behind the three tiers, question-count routing, and multiple question
boxes. The old mockup is not a working payment route and is not evidence of conversion performance.

## Prototype acceptance checks

- Topic, face-up cards, remaining positions, and counts match the originating email.
- The price is visible below the cards without entering personal details.
- Both name fields are required; clear errors appear when missing.
- The bump is visible on the booking page, unselected by default.
- Selecting or clearing the bump produces the correct total without a page transition.
- The payment action shows the exact selected total.
- The close and offer read naturally for the specific question.
- Desktop and phone layouts have readable labels, consistent body typography, and no overflow.
- The payment handoff is visibly a prototype. Nothing is sent, charged, or published.

## Decisions still needed

1. **Delivery format:** define whether the written reading arrives as email, private page, PDF, or a combination.
2. **Payment implementation:** select and configure the secure checkout surface while keeping the bump on this page.

The price, name, email, bump and live total now share one booking page. After verified payment, route to the bridge page before Upsell 1.

This document records the new $35 scope without altering 07's configuration or enabling payment.
PAID-READING.md's older “price undecided” note should be reconciled when this scope is approved.

## Paid reading continuity — approved 2026-09-10

Face-up cards are fixed per email edition. Paid positions are drawn separately for each buyer and saved once. The personal card comes from first and last name and supplies a separate lens. After main payment, show the bridge page, then offer an audio recording of that same personalized spread, then show thank-you. See the funnel checklist for local build dependencies.

# Format 03 — The card, reframed

*Read [PLAYBOOK.md](../PLAYBOOK.md) and [hooks.md](../hooks.md) first. This spec only adds what's specific to this format.*

**Type:** insight · **The turn:** a card's dreaded/obvious meaning → its truer, often opposite meaning

## 1. Purpose / when to use
Keeps the **tarot** alive inside the deck — the congruent, on-brand format, with existing card art and a built-in serialization hook (name tomorrow's card). It rescues the old daily-tarot from being a soft-sell "here's today's card" by giving it the reframe spine: the email's job is to **flip the card's obvious meaning.** Use on card days; it carries the deck's continuity (each ends by naming the next card).

## 2. The reframe mechanic
Take the reflexive read of a card — *Tower = disaster, Death = ending, the Devil = evil, Three of Swords = pure heartbreak* — and reveal the truer meaning underneath the dread. *"Everyone reads it as X. It means Y."* The dreaded cards are the best material: the higher the dread, the bigger the turn, and the more mercy in the reveal.

## 3. The hook
**Pattern:** the blunt reversal ([hooks.md](../hooks.md) #3) plus a quick, sensory glimpse of the card image (ekphrasis-lite). Set up the universal dread in one breath, then break it.

Hook bank:
- "Everyone dreads this card. They've got it backwards." — *gold; maximal reversal, minimal words.*
- "When I turn over Death, dear, watch how fast the face across from me flinches. They've got the wrong funeral in mind." — *scene + a witty, kind correction.*
- "There's a card people beg me not to draw. It's the most hopeful one in the deck." — *contradiction as the snag.*
- "The card everyone dreads means almost the opposite of what you fear." — *plain reversal (softer subject-style).*
- "Lightning, a falling tower, two figures dropping. You already know this one. You already have it wrong." — *ekphrasis → accusation.*

## 4. The skeleton
1. **The card on the table + the dread** — a brief, sensory description of the image and the reader's flinch.
2. **The reversal** — *"**They have it backwards.**"*
3. **Look again** — what the image *actually* shows (the lightning takes only the tower, not the ground you stand on).
4. **The reframe** (pull-quote) — the true meaning (the Tower destroys the *lie*, not your life).
5. **Why it feels like X but is Y** — the mechanism (catastrophe vs release).
6. **The mercy most people miss** — the gift hidden in the dreaded card.
7. **The practice** — apply it to their life (*"picture the tower you're propping; what part of you is praying for the lightning?"*).
8. **Tomorrow-hook** — name the next card (serialization; e.g. Tower → the Star).
9. **Ask** — if you know which [card] is yours, come tell me.

## 5. Subject + preheader
Emoji suits this format (card-cue 🌙☀️🦁, or 😱 for the dreaded ones). Formula: `<emoji> {first}, <dread setup>. <reversal>.`
- `😱 {first}, everyone dreads this card. They've got it backwards.`
- `{first}, the card you'd beg me not to draw is the kindest one in the deck.`
- `🌙 {first}, the Moon isn't warning you about him. Look again.`

Preheader — the reframe in miniature: *"The Tower isn't the disaster. It's the mercy."*

## 6. The ask / CTA
Soft-to-medium. Benefit-worded, card-anchored: **"Show me what's really standing."** Single CTA. Tag `campaign=reframe-03-<card-slug>`.

## 7. Formatting notes
- **Brief ekphrasis** up top (no box) — 1–2 sensory lines of the card.
- Reframe **pull-quote** at the turn; **bold** the reversal line.
- The **tomorrow-hook** is a normal closing line, not a box.
- Card art is the hero image (reuse the tarot deck assets + S3 hosting pattern).

## 8. Do / Don't
- **Do** favour the **dreaded** cards (Tower, Death, the Devil, 3/10 of Swords, the Moon) — dread is the fuel.
- **Do** keep the guardrails tight (PLAYBOOK): never manufacture fear, keep it Christianity-free (especially around the Devil / Judgement imagery).
- **Do** end with the tomorrow-hook — it's the serialization that makes the card days appointment viewing.
- **Don't** write an encyclopedia entry ("the Tower is a card of upheaval") — that's the dead-hook anti-pattern. Put a face across the table and a reversal in line two.
- **Don't** reuse a card within the program (track in STATE.md).

## 9. Gold-standard worked example
[emails/03-the-card-reframed.md](../emails/03-the-card-reframed.md) — the Tower as mercy.

## 10. Fill-in template
```
Subject: <emoji> {{ subscriber.first_name | capitalize }}, <dread setup>. <reversal>.
Preheader: <the card> isn't <the dread>. It's <the truer meaning>.
Tomorrow-hook → <next card>

<1–2 sensory lines of the card image + the reader's dread.>

**They have it backwards.**

Look again at what <the image> actually <does>. <It takes only X, not you.> And <that symbol>, in the cards, is never <the literal thing> — it's <the lie / the propped-up story>.

> **↳ THE REFRAME.** <The card> doesn't <the feared thing>. It <the true, merciful thing>.

That is why it feels like <catastrophe> and lands like <release>. <Mechanism, 1–2 sentences.>

Here is the mercy most people miss. <The gift hidden in the dreaded card.>

So sit with this today. <Apply it: picture your version; the frightening question.>

Tomorrow I'll turn over <next card>, and show you <what it opens>. But <this card> has to come first, dear.

<If you already know which <card> is yours, come tell me.>

**→ <benefit CTA>**

— Evelyn
```

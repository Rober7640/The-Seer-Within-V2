# 11 — The Unsent Letter: deliverables and decisions

Decisions with their reasons, so nobody re-opens them. Tick sheet: [0-WORKFLOW-11.md](0-WORKFLOW-11.md).
All confirmed by the operator on 2026-11-01. Nothing is committed, built or live.

## The offer

| Item | Decision | Why |
|---|---|---|
| Number | **11** | `'10'` in `shared/backendOffers.ts` is Soulmate Initials |
| Type | Reading, no reply needed | She buys, waits, it arrives |
| Price | $35 fixed + $12.77 bump | Same as 02. The price code exists |
| URL (D1) | `/tarot/unsent-letter` | Free on development and Production |
| The wait | 24 hours | Evelyn writes it out herself |
| Shape | 02's: 3 free cards in one long letter, 12 paid cards. No quiz | Operator: "the original 02 esl is a 3 card reading" |
| Free cards | Hermit / Judgement / Devil | Hermit holds the lantern, Judgement calls, the Devil's chains are loose |
| Pool | 22 − 3 free = 19, 12 laid, 7 spare | Leaves 16 if a second letter ever spends 3 more |
| Time window | "The pull of this shows itself inside 5–7 days" | 00e beat 3 requires a window. It is about what she feels, not what they do |

## The brief

| Field | Answer |
|---|---|
| Big idea | They left with something of yours. The message is them trying to give it back. Until it is back, nobody new can reach you |
| Promise | What they took comes back to her when she reads the letter, with no contact needed |
| Mechanism | Her birth name sets what was taken. Twelve cards carry twelve parts of the message and it only comes back whole, so three cannot do it. Evelyn writes it out herself, which takes 24 hours |
| The one problem | ⚠ Working line only: it ended with things unsaid, and she never got an answer. Operator ruled out a database pull, so it is not from real quotes |

⚠ Rejected: the theme "you mattered, and the silence was theirs, not yours". Operator: "terrible. so vague."

## Birth details and the numbers

Birth name and date go on OUR booking page, never Stripe (operator's rule from 08). First name still comes from `?fn=`. Stored in `be_order_intake`.

⛔ Numerology is never mentioned in the letter, booking page or reading. The stated reason: "Your birth name and date set how I lay your twelve cards." That must stay true.

| Number | Feeds |
|---|---|
| Soul Urge | What they took, one per buyer |
| Expression | What they saw in her |
| Life Path | Her repeating pattern |

| Soul Urge | What they took |
|---|---|
| 1 | Your nerve |
| 2 | Your trust |
| 3 | Your laugh |
| 4 | Your sense of being safe |
| 5 | Your freedom |
| 6 | Your belief that you'd be looked after |
| 7 | Your faith in your own judgement |
| 8 | Your sense of your own worth |
| 9 | Your softness |
| 11, 22, 33 | ☐ To set at B2 |

Upsells use none of these details.

## The paid reading

About 5,000 words, one PDF per buyer (D7, 11-D). Definite answers: one flat answer per question, in the first lines of its section.

| Act | Cards | The hard truth |
|---|---|---|
| 1. What they took | 1–3 | Named flat, with the proof of how she lives without it |
| 2. Why they kept it | 4–6 | Giving it back means admitting what they did |
| 3. What it has cost you | 7–9 | The low point. "Giving it back, or trying to get you back?" answered here |
| 4. How it comes back | 10–12 | Whether they will act, what she must stop, the one thing to do |
| The letter | Last | They hand it back. Evelyn: "It's back. What you do with it is on you." |

Test: if two sections could swap places unnoticed, there is no arc. Plan the story per buyer first, then write the cards in order. Replaces 00e §6a's repeated five moves and §6b rule 3 for this offer only.

## Voice: tough love, never vague

Hard thing first. Name what she does. Each section ends on one thing to do or stop. No "perhaps", "may", "energy", "journey", "the universe". ⛔ Hit what she does, never who she is. Never blame her for what was done to her.

## Upsells and bump

- **Both upsells sell:** "Protect what's coming back to you."
- **Bump:** *Closing the Door*, a one-page ritual done after she reads the letter.

## Before any send

| # | Decision |
|---|---|
| n8n model | `gpt-6.1-sol` for 11's flow (operator, 2026-11-02: terra is outdated). ID confirmed from OpenAI's docs. Still to prove with one call: that our account can use it. $2 in / $10 out per million tokens |
| 11-A Widows | The letter says "this is someone living, dear". Send list cannot be filtered: no database pull. Judgement shows as the full card, coffins included (operator, 2026-11-02) |
| 11-B Abuse | The product says "if this person hurt you, you owe no reply" and never tells her to contact anyone. Send list cannot be filtered |
| 11-C Mass claim | ⛔ A lawyer reads it before any send. The letter says this is what the cards showed |
| 11-D PDF | One per buyer |

## Build decisions (2026-11-02, made by Claude, operator may overrule)

| Item | Decision | Why |
|---|---|---|
| Booking treatment | Page only, no chat treatment | The two fields need a form |
| Delivery time | As close to 24 hours as we can land it, never early by hours | The letter says writing it out "takes me 24 hours" |
| Bump delivery | *Closing the Door* is the last page of her PDF. ☑ [`11-C4`](booking-page/11-C4-closing-the-door.md) written 2026-11-06, operator: keep the bump paid and deliver it automatically. n8n run 52613: page 16 of 16, no team alert | T3 and T4 go to every buyer, so no separate bump email |
| Free gift | None in the reading | Not in the decisions, and T4 names none |
| V2 free credits on the thank-you page | Yes: 15 free minutes with Evelyn, on `11-T1` | Operator, 2026-11-02. Overrides "a receipt sells nothing" for this offer only |
| Wrong birth details | No self-service fix. She replies to support | Keeps the page short. Check volume after launch |
| Lawyer's list (11-C) | Adds: the booking page and upsells stating "what they took", Marian, and Evelyn's chat brief | Same claim, more places |

## The deal (operator, 2026-11-02)

Cards are shuffled inside each act, not across the whole deck. Each act draws from its own shortlist (11-P1-plan §9), seeded by her birth name and date. Reversals off. Same buyer, same cards.

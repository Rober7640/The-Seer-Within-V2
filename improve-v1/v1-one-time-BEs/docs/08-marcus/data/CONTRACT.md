# 08 Marcus — local contract v1

Status: initial local build contract, 2026-09-10. [Types](../../../local/08-marcus/contracts.ts). No remote schema changes are implied.

## Three separate records

1. **Edition:** the question, explicit theme, spread, ordered position labels, fixed face-up cards, and free email text. A published version is immutable. Reusing a topic creates another edition/version; old links retain the original.
2. **Buyer’s draw:** cards for the paid positions, drawn independently per order after verified payment and stored once. Repeat requests load the saved draw. The initial method uses upright cards, draws without replacement, and excludes the edition’s fixed face-up cards. Upright-only is an implementation default for local tests, not a new customer promise.
3. **Personal card:** derived from the entered first and last name. It provides a separate interpretive lens. It occupies no spread position, does not replace a card, and may coincide with a card in the spread.

The report receives all three plus the free email context. Its structure is derived from the edition's ordered positions and visibility flags, so a 6-card 2-up/4-down edition and an 8-card 4-up/4-down edition use the same stages. Paid prose focuses on the purchased positions without reselling the free reading. The written deliverable is a PDF. Audio narrates the accepted report and uses the identical buyer draw and personal lens.

## Lifecycle

Draft edition → validated/published edition → private unpaid intake → verified payment → paid order and saved draw → written job → stored report → captured local delivery.

The audio purchase attaches a separate entitlement and job to the parent order. It can wait for the written report; written delivery never waits for the audio purchase or job. The bump changes the delivery service level, not the cards or report contents.

Intake is not an order or fulfillment trigger. Price is derived from trusted product constants ($35 + optional $12.77). Audio price is still undecided. Client input cannot set payable amounts, fixed cards, personal card, or paid draw.

## Local test boundary

No `.env` loading, shared database connection, external payment request, customer email, or remote workflow activation. Use injected random functions and memory/file adapters for deterministic tests. Test payment events are explicitly simulations, not proof of Stripe integration. SQL/workflow artifacts can be drafted but cannot be called deployed until tested in an approved isolated environment.

## Outstanding product/method choices

- PDF delivery mechanism (attachment or private link) and the remedy when a 24-hour or 12-hour deadline is missed.
- Audio price, narration style and authorized voice. Audio inherits the order’s 24-hour or 12-hour deadline.
- Numerology compatibility: use the existing `calculateExpression` function without changing Aiden. Current engine strips non-ASCII letters; do not silently invent a new normalization policy. Master number 33 has no approved card mapping in PAID-READING.md. Local engine should return an explicit unresolved result for unmapped/unsupported names, rather than manufacturing a card.

## Invariants to test

- Stable edition identity and exact fixed cards survive all handoffs.
- No paid card duplicates another paid card or a fixed face-up card.
- Different buyers receive independent draws; coincidental matching combinations are possible and are not an error.
- Same order retry returns the original draw even if the random source changes.
- Missing/invalid edition, conflicting version, malformed positions, and incomplete lens fail explicitly.
- Personal card may equal a drawn card without removing it; number of spread positions stays constant.
- Failed/unpaid events do not create a fulfilled order.
- Audio and written report reference the same saved order draw.
- Report brief, grading and rendering derive their section counts and order from the saved edition; they never assume a fixed six-card spread.

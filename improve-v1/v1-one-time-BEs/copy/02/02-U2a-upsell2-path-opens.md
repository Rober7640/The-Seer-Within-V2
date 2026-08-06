# 02-U2a — U2 opening beats *(PATH_A and PATH_B)*

| | |
|---|---|
| **Engine** | `S20`, clone of `useUpsell2Chat.ts`. Everything from `UPSELL2_GAP` onward is V1's, unchanged |
| **Rewritten here** | `UPSELL2_PATH_A_OPEN` (bought U1) and `UPSELL2_PATH_B_OPEN` (declined U1) |
| **The argument** | *the reading told you what's coming — it doesn't call it toward you* |
| **Product sold** | the manifestation bracelet. `S21` suppression applies: owns both → straight to thank-you |
| **Source** | `client/src/lib/upsell2Messages.ts:51-71` |

**Path A** follows a purchase and **must not re-sell the stone** — it stacks on it. **Path B**
follows a decline and must not re-litigate it; V1's *"I respect your decision"* opener is the right
instinct and is kept in shape.

---

## `UPSELL2_PATH_A_OPEN` — 6 messages *(bought the Protection Ritual)*

> {firstName}... both are confirmed now. Your twelve, and your stone. Tonight's work is going to be
> a heavy one and I'm glad you're doing it properly.

> Your lava stone will hold your left side — your receiving side — while the spread unfolds. Nothing
> unwanted reaches you through that hand.

> But I want to ask you something before I go, and I want an honest answer...

> When you know what's coming... and nothing can get at you... what then?

> Because the spread reads your future, {firstName}, and the stone guards it. Neither one of them
> *calls* anything toward you.

> A reading is about what arrives. Protection is about what doesn't. But what about what you want?

---

## `UPSELL2_PATH_B_OPEN` — 6 messages *(declined the Protection Ritual)*

> {firstName}... I respect your decision about the stone. Your twelve will be powerful without it,
> and I'll lay them just the same tonight.

> But before I start — there's something in your draw I haven't said yet.

> It isn't about the Tower. That card gets the whole spread pointed at it and it deserves it.

> It's about your fifth house.

> When I looked at what was coming toward you, I didn't only see the thing you have to brace for. I
> saw something *travelling* — already in motion, already pointed at you. The Chariot doesn't sit
> still.

> And here is the difficulty, dear. It's moving toward you and it cannot find you yet. Not because
> anything is blocking it. Because you aren't giving it anything to steer by.

---

## Build notes

- **The hinge is the same in both paths and it is the brief's own limit**: a spread *shows*. It does
  not *lift* (→ the bump) and it does not *call* (→ this upsell). Three products, three sales, one
  mechanism — which is also what stops them cannibalising each other.
- **Path A stacks, Path B reveals.** A follows two yeses, so it opens on completion and then finds
  the one thing still missing. B follows a no, so it does not argue — it produces new information
  from the same reading, which is the only honest way to re-open a conversation she just closed.
- **Path B names house 5 and the Chariot on purpose.** She has not received the reading yet, so this
  is Evelyn telling her something from the spread ahead of delivery — genuinely new, verifiable
  against the product when it lands 24 hours later, and it makes the reading feel larger rather than
  spoiling it. ⚠ It must stay consistent with `02-P1`: the Chariot is in the fifth house and it is
  *in motion*. If that assignment ever changes, this copy changes with it.
- **"You aren't giving it anything to steer by"** replaces V1's *"you're not broadcasting the right
  signal"*. Same beat, and it lands on the bracelet the same way — but it's a navigation image
  rather than a transmission one, which is what a card of a moving chariot actually suggests.
- ⚠ **Path A must not mention the stone's price or re-describe the ritual.** She bought it four
  minutes ago. Message 2 acknowledges it in one line and moves on; anything more reads as a receipt
  she didn't ask for.
- **No third-party outcome in either path.** What is travelling toward her is described as
  *something*, never as a named person doing a named thing.
- **`{firstName}` × 3 in A, × 2 in B**, matching V1's distribution.

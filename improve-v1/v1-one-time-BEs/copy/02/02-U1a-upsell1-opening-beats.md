# 02-U1a — U1 opening beats *(Twin Flame Tarot → Protection Ritual)*

| | |
|---|---|
| **Engine** | `S20`, config-driven clone of `useUpsellChat.ts`. **~48 of ~60 messages reuse verbatim** |
| **Rewritten here** | `CONFIRMATION` · `GAP` · `RISK` · `QUESTION_1` + `AFTER_Q1` — everything downstream of `SOLUTION` is V1's, unchanged |
| **Why** | V1's beats hang off *"your Energy Clearing Ritual"*, a product 02's buyer did not purchase. The same four beats hang off **the Tower's warning** instead |
| **Product sold** | the Protection Ritual + charged lava stone — unchanged. `S21` suppression: never offer an object she already owns |
| **Source** | `client/src/lib/upsellMessages.ts:43-106` |

⚠ **The beat structure is proven and is not being changed.** Confirmation → gap → risk → a
question that makes the risk personal → solution. Only the *content* of the first four moves.

---

## `UPSELL_CONFIRMATION` — 3 messages

> It's done, {firstName}. Your twelve are booked, and I'll lay them tonight.

> You'll have the whole spread inside 24 hours — every house, including the one your Tower is
> standing in.

> But before I let you go, dear, there's something I need to say about that third card.

---

## `UPSELL_GAP` — 4 messages

> The spread will tell you what your Tower is. Its name, its face, and how close it is. That's what
> you've paid me for and that's what you'll get.

> But here's what most women don't understand, {firstName}...

> Seeing a thing coming and being able to stand in front of it are two different abilities.

> A reading gives you the first one. It does not give you the second.

---

## `UPSELL_RISK` — 5 messages

> And there's a part of this nobody warns you about.

> For the next few weeks, while you're waiting for it — you're more exposed than you were before I
> drew, not less.

> Because now you're watching. And a woman who's watching for one thing has her guard in exactly
> one place.

> I've seen it too many times, {firstName}. She sees the Tower coming, braces beautifully for it,
> and something else walks straight in through the side of her life while she's facing the front.

> The card told you it arrives as a person. It didn't promise there was only one.

---

## `UPSELL_QUESTION_1`

> Tell me honestly — have you ever seen something coming, known you were right about it, and still
> not been able to stop it reaching you?

**`UPSELL_QUESTION_1_REPLIES`**

| Text | Value |
|---|---|
| Yes — more than once | `yes` |
| I think so, yes | `maybe` |
| I'm not sure | `unsure` |

---

## `UPSELL_AFTER_Q1`

**`yes`**

> I felt that in the way your cards came away, before you said a word of it.

> That's not a failure of sight, {firstName}. You saw it. Knowing and being able to stand there are
> two separate things, and nobody ever taught you the second one.

> I don't want that for you this time.

**`maybe`**

> Most women don't recognise it until they look back at it.

> A thing you half-expected. A change you'd have sworn you felt coming a fortnight out. You were
> right, and being right didn't help.

> That's the pattern I want broken before your twelve reach you.

**`unsure`**

> It's quiet. Often you don't notice until months afterwards, when you're telling somebody the
> story and you hear yourself say *I knew*.

> Either way, I'd rather make certain of it this time.

> What's coming toward you is too big to leave to luck.

**`default`**

> I can tell you know what I mean.

> Seeing it and surviving it are two different pieces of work, and you've only bought the first.

> Let me give you the second.

---

## Build notes

- **Same four beats, different engine.** V1 argues *removal leaves a wound open for 30 days*.
  02 argues *sight is not protection*. Both land on the same product, and neither sentence appears
  in the other — which is what the corpus device-variance pass is checking for.
- **The gap is the brief's own stated limit**, word for word: *a spread shows what is coming; it
  does not lift what is already sitting on you* becomes, for the upsell, *it does not stand between
  you and it*. That keeps 02's three sales — bump, reading, upsell — arguing from one mechanism
  instead of three unrelated ones.
- ⚠ **The risk beat is the one place the deck lets an unnamed second threat exist.** *"It didn't
  promise there was only one"* is deliberately not a new prediction about a real person — it's a
  bound on what the card said, which is true. Do not let a later pass sharpen this into a claim
  about someone identifiable.
- **`RISK` is where V1 was strongest and it stays structurally identical**: a clean window of
  vulnerability, a mechanism for why, then Evelyn's own experience as proof. The window here is
  *the wait for the spread*, which is real and which she is currently inside.
- **Q1 converts the risk from Evelyn's claim into the buyer's memory.** V1 asks *have you cleared
  something and watched it return*; ours asks *have you seen something coming and not been able to
  stop it*. Same job — she supplies the evidence — and the `yes` branch is written to be the common
  one, because it is.
- ⚠ **Nothing here mentions a price or the stone.** Both live in `SOLUTION` onward, which is V1's
  copy unchanged. Do not pull the offer forward into these beats.
- **`{firstName}` × 4 across the block**, matching V1's density in the same slots.

# 04-C2 — Booking chat *(The Turn)*

| | |
|---|---|
| **Offer** | 04 The Turn — READING · price ladder by day since the letter · 24h · **no reply needed** |
| **URL** | `https://theseerwithin.com/offers/wiccan/tea-reading/chat` · the page treatment is [`04-C1` v2](04-C1-booking-page-v2.md) at the offer root |
| **Treatment** | Chat — built from 03's chat (`JudgementBookingChat`), not 02's |
| **Price** | `{{TODAYS_RUNG}}` — the same price endpoint as the page. Never hard-coded, never guessed |
| **Voice** | Evelyn speaks **only in the stream**. Inside the card it is **her** voice, first person, talking to Evelyn |
| **Pace** | one sentence per turn, typing indicator first, paced on length with variance (`chatPace.ts`, ~18ms a character, 0.65–2s a line). The card gets its own beat |
| **Component** | [00e §3](../../docs/00e-FRAMEWORK-BEs.md) · workflow A2 *"How it is paced"* |

⚠ **The letter re-argues nothing.** This is a greeting and a close.

---

## Thread title *(the strip under Evelyn's name)*

**The Turn — confirm your booking**

*(⛔ "confirm", never "confirmed": she hasn't paid yet.)*

---

## Beat 1 — Evelyn, one sentence per turn

> There you are, dear.

> Your cup's on my table, and I haven't turned it yet.

> Three things to agree to, and then I'll turn it.

---

## The card *(her voice — Evelyn does not speak in here)*

**Heading:** *Before I turn your cup*

**Deck:** *By booking this turning you agree to the following:*

- **☐** Yes — you had it right, Evelyn. He's pulling away, and I've felt it for a while.
- **☐** Yes — turn my cup. I want my 21 days: when to speak, and when to stay quiet.
- **☐** Yes — I'll pay `{{TODAYS_RUNG}}`, once. I know why it's today's price: as the leaves dry,
  turning them takes more of your night.

**Total today** · `{{TODAYS_RUNG}}`

> ### TURN MY CUP

**Until all three are ticked:** *Tick all three to continue* — the button is not there yet.

**Small print:** *Paid once, at today's price. Your reading arrives within 24 hours. You don't need
to send anything.*

**If the price hasn't loaded:** statement 3 shows a blank grey bar where the price goes, and the
button stays away. **If it failed:** *Today's price didn't load.* **Try again**

---

## Beat 2 — the bump, as its own turn *(after she presses TURN MY CUP)*

> Good.

> One more thing before I start.

**The bump card** *(Evelyn's voice, a question)*:

I can read your cup a second time, to put twice the strength into your reading.
Same reading, same twenty-one days, just working twice as hard for you. Shall I do that?

**+ $12.77** · *`{{TODAYS_RUNG}}` + $12.77 total, computed*

> **Yes, double the strength**

> No, just my reading

Both buttons go straight to the secure checkout page. ⛔ No third confirm step. The decline is full
width and as easy to read as the accept.

**If the price moved on while she was here** *(checkout answers `409 price_changed`)*, under the
buttons: *Today's price moved to `{{NEW_RUNG}}` while we were talking. Press your answer again to go
on at `{{NEW_RUNG}}`.* Statement 3 and the total change to the new price. The next press sends the
new day.

---

## Resume copy

Both land at the card with every box **unticked**. The bump is not restored.
⛔ Position is restored; consent never is.

**A refresh** *(she never left — ⛔ don't greet her for coming back)*:

> I'm still here, dear.

> Your cup's on my table, not turned yet. Three things to agree to, and I'll turn it.

**Back from the secure checkout page** (`?cancelled=1` — she really did leave, so here it's true,
and her live question is whether she's been charged):

> There you are again, dear.

> Your cup's still on my table, not turned. Nothing has been taken, and nothing's been started.

---

## Build notes

- **Three statements, price third.** The page keeps one tick (D11); the chat is the 3-point gate:
  *you had it right* (P8, the cheapest yes), the permission with the promise in it, then the money
  with its reason-why. 04 is a READING with no reply, so no fourth (intake) statement.
- **Statement 3 is the ladder's defence in her voice** (`04-C1` statement 6, cut to a line): the rise
  is the leaves drying, not a penalty for waiting. ⛔ It never names another rung.
- **"Your cup's on my table, and I haven't turned it yet"** is true at every rung. ⛔ Not "still
  soft": by day 3 the ladder emails tell her the leaves have lifted.
- **No cup question — the reading is drawn** (operator, 2026-10-11). Which of the three
  interpretations she gets is drawn at random on the server at checkout (Stripe metadata `cup`,
  with `cupDrawn: '1'`), exactly as on the page. So the chat runs greeting → card → *"Good."* →
  *"One more thing before I start."* → the bump. "One more thing" follows the card's three things,
  so it still reads true with nothing in between.
- **The bump is the Double Turning, as Evelyn's question** (operator, 2026-10-11; copy
  operator-reviewed — word for word). The page's bump is a checkbox label in her voice; here Evelyn
  asks. It is **intangible**: she reads the cup a second time, nothing extra is delivered, and the
  reading still comes within 24 hours — so the turn promises nothing to look out for. It replaces
  the Still Cup (`04-C3`/`04-C4`, superseded). ⚠ The turn opens *"One more thing."* straight after
  Evelyn's *"One more thing before I start."* — kept as written; flagged to the operator.
- **Pace.** One sentence per turn, never a flat delay, the card gets its own beat. The walk times
  the long line and fails under 1.2s.
- **Timing.** Only "within 24 hours" about the reading. No tonight, by morning, tomorrow or weekdays
  about delivery.
- **Banned:** open communication, seek guidance, embrace growth, clearing, energy field, our
  conversation. None appear.

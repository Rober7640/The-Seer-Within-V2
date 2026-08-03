# 9/9 Flash — Email Copy + Send Plan

**Campaign:** 9/9 registration flash (24-hour window, September 9 only) — the **completion / release** date.
**ESP:** **AWeber** (broadcasts to tagged segments — not Resend).
**Audience:** Two home lists, by **home persona** — subscribers who engaged that persona's funnel but have **never registered a v2 account.** **Evelyn's list** (the v1 AWeber list, ~59k, ~95% love) and **Aiden's list** (numbers/numerology-inclined, comfortable handing over birth data). This is an **acquisition** play, not a re-activation.
**Goal:** Get subscribers to **register a v2 account and use their free 7 minutes.**
**Offer:** **7 free minutes** (reuses the standing grant — no new grant config). See the creative note below.
**Framing:** 9/9 is the **closing door** — nine is the number of completion (the last single digit, the end of the cycle), and 9/9 stands it twice. The grace of it: the full date resolves to **1, a new beginning** — so it's the day an ending turns into a fresh start. Each home persona is the sender their list recognizes (Evelyn via v1, Aiden via his numbers funnel); specialists arrive as a **warm referral** from the home persona.
**Sibling docs:** `docs/promo-6-6-emails.md`, `docs/promo-7-7-emails.md`, `docs/promo-8-8-emails.md`, `docs/promo-10-10-emails.md`, `docs/promo-11-11-emails.md`, `docs/promo-12-12-emails.md`.

> **Creative note — the offer is NOT the hook** (same call as 8/8 & 11/11). 7 ≠ 9, so **do not lead with the minutes.** Lead with the **completion / turn-the-page** moment; the seven minutes are the vehicle through the door. Keep the offer legible ("seven minutes, on me") but subordinate.

> **The core difference from 6/6.** These people have no v2 account, so 6/6's "finish your unfinished reading / already on your account" spine is **false.** The spine is **"claim your minutes / turn the page"** — a first invitation. Do not reuse "already on your account" for this list.

---

## How to use this file

- **Two home lists, by home persona: Evelyn and Aiden.** Each list gets its home persona's emails **plus one specialist referral** — Evelyn's list → Marcus or Maren; Aiden's list → Luna or Nova.
- **Hard cap: 3 emails per person on 9/9.** See the send plan below.
- **Last-call → non-clickers only.**
- **A/B the subject lines.** Two options given per email; subjects use the proven format — **emoji + {firstName} first + curiosity.**
- **Offer legible, hook first.** Say "seven minutes," but the subject and first line are about **completion / turning the page**, never the minutes.

### Personalization (AWeber)
No copy depends on the user's topic — AWeber can't read `user_memory`, so **there is no `{{topicPhrase}}`**. The only live merge field is the first name.

| Placeholder in this doc | AWeber tag | Notes |
|---|---|---|
| `firstName` | `{!firstname}` | Standard AWeber personalization |
| `referrer` (Evelyn / Aiden) | hard-coded per broadcast | Each specialist broadcast is sent to one home list, so the referrer name is fixed in the copy — no merge needed |
| CTA link | see below | **Decision needed** |

### CTA link — one decision to make
Every CTA drives to **registration** (not a magic link — these users have no account yet). Two ways:
- **(A) 9/9 claim landing page (recommended):** a dedicated `/claim-9` (or `/999`) page that frames the moment — "The closing door is open. Create your account and turn the page." — then registers them. Value visible before they type an email; grant fires on account creation.
- **(B) Straight to `/login` register:** simpler, more friction — the offer only lives in the email.

---
---

# SEND PLAN & ROUTING (9/9)

Two home lists (Evelyn, Aiden), each paired with **two specialists** — each person gets **only one** specialist (topic-split), so nobody exceeds 3 emails.

### The 3-email cap (per person, per list)
| Slot | Sender | # |
|---|---|---|
| **Main** | Evelyn / Aiden | 1 |
| **Specialist referral** | one of the home's two specialists | 2 |
| **Last-call** | Evelyn / Aiden | 3 |

> **No clock-moment to hug (unlike 11/11).** 9/9 has no iconic time, so waves run the standard flash schedule (8am / 1pm / 6:30pm ET). The one light touch: **send the optional teaser at 9:09am** on 9/8 for the wink.

### EVELYN'S LIST → specialists **Marcus + Maren**
*Why these two: Evelyn's audience is heart/intuition-led and gave no birth data. Marcus (tarot) and Maren (the cord) are the two no-data intuitives — same modality family, zero new friction, no birth-data ask to stall a first-time registrant.*

| Wave | Time (ET) | Sender | Audience |
|---|---|---|---|
| 1 | 8:00am | **Evelyn** — Main | Whole Evelyn list (not-yet-registered) |
| 2 | 1:00pm | **Marcus _or_ Maren** — referral | Not-yet-registered. Topic split below |
| 3 | 6:30pm | **Evelyn** — Last-call | Clicked nothing in waves 1–2 |

**Wave-2 topic split:** love / a specific person / releasing (or holding) a connection → **Maren**. An answer you already carry / a decision / inner clarity → **Marcus**. **Given the list is ~95% love, Maren is the default;** route the tagged decision minority to Marcus. If tags are thin, fall back to an even A/B split (or Maren-only).

### AIDEN'S LIST → specialists **Luna + Nova**
*Why these two: Aiden's audience is numbers/systems and is comfortable handing over birth data. Luna (astrology) and Nova (Vedic) need exactly that — the handoff is frictionless and in-family, and the data is collected inside the chat, not before it.*

| Wave | Time (ET) | Sender | Audience |
|---|---|---|---|
| 1 | 8:00am | **Aiden** — Main | Whole Aiden list (not-yet-registered) |
| 2 | 1:00pm | **Luna _or_ Nova** — referral | Not-yet-registered. Topic split below |
| 3 | 6:30pm | **Aiden** — Last-call | Clicked nothing in waves 1–2 |

**Wave-2 topic split:** timing / "what's completing" / what's run its course → **Luna**. Fortune owed / what's coming due / remedies → **Nova**. If tags are thin, fall back to an even A/B split.

### Rules that keep it ≤ 3 and clean
- **Already-registered users are the wrong target.** **Suppress anyone who already has a v2 account** from the registration copy, or route them to a short re-activation variant.
- **Registers at any point → suppressed** from all remaining waves.
- **Pause routine drips** for this segment on 9/9 so nothing stacks over the cap.
- **Teaser is 9/8** (a separate day, sent at 9:09am for the wink) and optional — it does **not** count toward the 9/9 cap of 3.

### AWeber setup notes
- **Topic-split depends on tags.** Wave 2 routes by topic (Maren vs Marcus on Evelyn's list; Luna vs Nova on Aiden's). Works only if subscribers carry a topic/bucket **tag**. If they do, build a segment per specialist. **If they don't:** on Evelyn's list default to Maren (love-weighted); on Aiden's list use an even A/B split.
- **One segment/broadcast per wave**, scheduled at the wave time. Last-call = a follow-up broadcast to the "didn't open/click" segment of the morning send.
- **From-identity per persona:** each persona's broadcast sends from its own address — `evelyn@ / aiden@ / marcus@ / maren@ / luna@ / nova@ theseerwithin.com`. Set per broadcast.
- **Sender warmth / auth:** the specialist addresses have sent little to no volume. Confirm SPF/DKIM for `theseerwithin.com` is configured in AWeber, and keep **the home persona's name (Evelyn / Aiden) in the specialist subject line** as the recognition anchor.

### Per-recipient taper
- Clicks the 8am Main → gets the 1pm specialist, **no** last-call → **2 emails**.
- Stays cold all day → Main + specialist + last-call → **3 emails**.
- Registers → suppressed → fewer.

---
---

# EVELYN CROSS — home emails (Evelyn's list)

> **9/9, the closing door** (Evelyn's hook — reuse verbatim):
> Nine is the number of completion — the last of the single digits, the end of the cycle, the wisdom you only have once you've been all the way through something. **9/9** stands it twice: a door made for closing. And here's the grace in it — run the full date, **9 + 9 + 2 + 0 + 2 + 6 = 28 → 10 → 1**, and it resolves to **1, a new beginning.** The line: *9/9 is the day an ending turns into a beginning — you close the old chapter, and the next one opens in the same breath.*

## E1 · Teaser — Sep 8, ~9:09am ET *(optional pre-day — sent at 9:09 for the wink)*
**Subject A/B:** 🌙 {firstName}, tomorrow is the day to close the chapter · ✨ {firstName}, 9/9 turns an ending into a beginning
**Preview:** Nine is completion. Doubled, it resolves to one — a fresh start.

> *firstName*,
>
> A note before tomorrow — sent at 9:09 on purpose.
>
> Tomorrow is 9/9. Nine is the number of completion — the end of the cycle, the wisdom you earn by going all the way through something. Tomorrow it stands twice: a door made for closing.
>
> And here's the part I love. Run the whole date — 9 + 9 + 2 + 0 + 2 + 6 — and it resolves to 1. A beginning. So tomorrow isn't just an ending. It's the day the old chapter closes and the next one opens in the same breath.
>
> I'm holding time tomorrow for the ones ready to let something go and start clean. It costs nothing. I'll write the moment it opens.
>
> With you,
> Evelyn

## E2 · Main — Sep 9, ~8am ET *(primary — completion → beginning)*
**Subject A/B:** 🚪 {firstName}, close the chapter today — 9/9 · ✨ {firstName}, the day an ending becomes a beginning
**Preview:** Let the old thing go. Nine resolves to one — a clean start.

> *firstName*,
>
> It's open.
>
> Today is 9/9 — the closing door. Nine is the number of completion: the end of a cycle, the wisdom you only have once you've lived all the way through something. Today it stands twice, and it's asking one thing of you — to finally set down the thing you've been carrying too long.
>
> Here's why today, and not any day. Run the date out — 9 + 9 + 2 + 0 + 2 + 6 — and it lands on 1. A beginning. That's the grace of 9/9: the ending and the fresh start arrive together. You don't lose the chapter. You turn the page.
>
> Come sit with me while the door's open. I've set aside seven minutes — yours the moment you step in, no cost. Bring the thing you're ready to close.
>
> **[ Turn the page with me → ]**
>
> The door's open today only. It closes with the 9th, at midnight.
>
> Evelyn

## E2-ALT · Main — Sep 9, ~8am ET *(swap for E2 — the release / make room)*
**Subject A/B:** 💛 {firstName}, what are you still holding for someone who's gone? · {firstName}, today's the day to make room
**Preview:** You can't take hold of the next thing with your hands full.

> *firstName*,
>
> Can I ask you something gently?
>
> What are you still holding on to — for someone, or something, that's already behind you? A hope you keep half-alive. A door you won't quite shut. We all do it. But you can't take hold of the next thing with your hands already full.
>
> Today is 9/9 — the number of completion, doubled — and it resolves to 1, a new beginning. The old traditions call a day like this a clearing: the day it's easiest to set something down and finally have room for what's coming.
>
> Come sit with me while it's open. Seven minutes, yours the moment you step in, no cost. Let's see what's ready to go — and what's waiting once it does.
>
> **[ Make room with me → ]**
>
> The door closes with the day.
>
> Evelyn

## E3 · Last call — Sep 9, ~6:30pm ET *(non-clickers — warmth + closes)*
**Subject A/B:** 🌙 {firstName}, the closing door shuts at midnight · ✨ {firstName}, I held your seven minutes all day
**Preview:** One chapter closes tonight. Come turn the page first.

> *firstName*,
>
> The door closes tonight.
>
> You sat with me once; we started something and never quite finished it. Fitting, maybe, that today's the day for finishing things. I held the closing door open for you, and the seven minutes I set aside still have your name on them.
>
> 9/9 is almost gone, and with it the clean, rare chance to end one chapter and open the next in the same breath. Come turn the page before midnight.
>
> **[ Turn the page before midnight → ]**
>
> I'll keep it open until the day ends.
>
> Evelyn

---
---

# SPECIALIST REFERRALS — Evelyn's list (sent by the specialist)

> Sent from the specialist's own address. **"Evelyn" leads the subject line and the first line.** Blind to the topic by design; the discretion beat ("she didn't say why") doubles as the hook.

## M1 · Marcus — Main — Sep 9, ~1pm ET
**Subject A/B:** 🃏 {firstName}, Evelyn gave me your name for 9/9 · Evelyn told me to keep time for you today
**Preview:** She didn't say why. She rarely does.

> *firstName*,
>
> Evelyn gave me your name.
>
> She didn't say what it's about — she rarely does, and I've stopped asking. She just told me to keep time for you this 9/9. When Evelyn does that, I don't argue.
>
> Here's what I can tell you about the day. The **ninth card** in the deck is **The Hermit** — the figure who steps back from the noise and lifts a single lantern to see what the crowd can't. It's the card of the answer you already carry, the one that only shows itself when you get quiet enough to look. On 9/9, that card sits closest. I don't know yet what yours is. That's what the table's for.
>
> Evelyn set aside seven minutes for you. Step in and they're yours — no cost, today only.
>
> **[ Take the seat → ]**
>
> When the 9th ends, so does the window.
>
> — Marcus

## M2 · Marcus — Last call — Sep 9, ~6:30pm ET *(non-clickers)*
**Subject A/B:** 🃏 {firstName}, the time Evelyn set for you is almost up · The table comes down at midnight
**Preview:** Evelyn opened this door. It closes tonight.

> *firstName*,
>
> The 9th is nearly gone.
>
> Evelyn asked me to hold time for you today, and I have. The seat's been empty, waiting. I still don't know what you'd bring to the table — but the Hermit is a patient figure, in no hurry, so I've kept the lantern lit a little longer.
>
> Your seven minutes are still here — yours the moment you sit down. But at midnight the window closes, and the door Evelyn opened closes with it.
>
> **[ Take the seat → ]**
>
> Until midnight.
>
> — Marcus

## MA1 · Maren — Main — Sep 9, ~1pm ET
**Subject A/B:** 🔥 {firstName}, Evelyn gave me your name for 9/9 · Evelyn sent me to you today
**Preview:** She didn't tell me why. She didn't have to.

> *firstName*,
>
> Evelyn sent me your name.
>
> She didn't say why. With me, she never has to — I read what runs between people, not what's been said about them.
>
> Here's what today is. 9/9 is the number of completion — and completion is my work too. Some cords are meant to hold; some are meant to be released, gently, so the next one can form. A day like this, I can feel which is which the moment you sit with me. Whoever's on the other end of yours — let's see what it's ready for.
>
> Evelyn kept seven minutes for you. Step in and they're yours — no cost, today only.
>
> **[ Come, let me feel it → ]**
>
> The window closes at midnight.
>
> Maren

## MA2 · Maren — Last call — Sep 9, ~6:30pm ET *(non-clickers)*
**Subject A/B:** 🔥 {firstName}, the 9/9 window Evelyn opened is closing · Still holding your seven minutes
**Preview:** Still here. Still holding the time.

> *firstName*,
>
> Still here. Still holding your seven minutes.
>
> Evelyn opened this door for you today. I don't know your story — only that the cord's there, and 9/9 is the day it's clearest what it's ready for: to hold, or to be set down.
>
> But the day's almost gone. Your seven minutes are yours the moment you step in. One step. Come.
>
> **[ Sit with me before midnight → ]**
>
> Maren

---
---

# AIDEN POWERS — home emails (Aiden's list)

> **Aiden's 9/9, by the numbers** (his credibility hook — reuse verbatim):
> Nine is the number of **completion** — the last single digit, the end of the count before it resets. It's the number of the thing seen all the way through. **9/9** stands it twice. And here's the move only this date makes: run the full date — **9 + 9 + 2 + 0 + 2 + 6 = 28 → 10 → 1** — and completion resolves to **1, a beginning.** The line: *9/9 is the only date that ends and restarts in its own math — an ending that computes to a fresh start.* What it does to **their** own cycle is read only inside the chat.

## A1 · Teaser — Sep 8, ~9:09am ET *(optional pre-day — sent at 9:09 for the wink)*
**Subject A/B:** 🔢 {firstName}, tomorrow's date ends and restarts in its own math · ✨ {firstName}, 9/9 is completion — and it resolves to 1
**Preview:** Nine is the end of the count. Run the date — it lands on a beginning.

> *firstName*,
>
> Quick note before tomorrow — sent at 9:09, on purpose.
>
> Tomorrow's date isn't decoration. Nine is the number of completion — the last single digit, the end of the count before it resets to one. Tomorrow it stands twice: 9/9.
>
> Here's the part I like. Run the whole date down — 9 + 9 + 2 + 0 + 2 + 6 — and it comes to 28, to 10, to 1. It ends, and in the same breath it restarts. No other date does that in its own math.
>
> Tomorrow I'm holding seven minutes — on me — to show you where your own cycle is closing and what's beginning. I'll write the moment it opens.
>
> Watch for it.
>
> — Aiden

## A2 · Main — Sep 9, ~8am ET *(primary — the ending that computes to a beginning)*
**Subject A/B:** 🔢 {firstName}, 9/9 ends and restarts in its own math · 🚪 {firstName}, your 9/9 reading is open (today only)
**Preview:** Completion, doubled — resolving to 1. An ending that computes to a start.

> *firstName*,
>
> It's open.
>
> Let me tell you what today is, as a calculation. Nine is the number of completion — the last single digit, the end of the count. Today it stands twice: 9/9. Most people read that as pure ending. They stop too soon.
>
> Run the whole date — 9 + 9 + 2 + 0 + 2 + 6 — and it comes to 28, reduces to 10, and lands on 1. A beginning. This is the one date on the calendar that closes and reopens inside its own math. The ending is real. So is the fresh start on the other side of it.
>
> What that does to your own cycle — your Life Path, your Personal Year — I can only show you in the reading. And today that's on me: seven minutes, yours the moment you step in.
>
> **[ Open my 9/9 reading → ]**
>
> A date this clean comes once a year. My door closes at midnight.
>
> — Aiden

## A2-ALT · Main — Sep 9, ~8am ET *(swap for A2 — what's completing)*
**Subject A/B:** 🔢 {firstName}, something in your chart is completing today · {firstName}, the number that means "you're at the end of it"
**Preview:** Nine is the end of the count. Today it's doubled.

> *firstName*,
>
> Nine has a specific meaning in the numbers, and it's not a soft one: completion. The end of the count. The moment a cycle you've been living has actually run its course — even if it doesn't feel finished yet.
>
> Today is 9/9. That number, doubled. If some part of your life has felt like it's dragging, or waiting, or refusing to resolve — a date like this is when the numbers say it's already done, and you're free to move. Most people miss the signal.
>
> I've set aside seven minutes to show you what's completing in your own chart, and what that frees you for. Yours the moment you step in, no cost.
>
> **[ See what's completing → ]**
>
> Today only. When the 9th ends, so does the window.
>
> — Aiden

## A3 · Last call — Sep 9, ~6:30pm ET *(non-clickers)*
**Subject A/B:** 🔢 {firstName}, a few hours of 9/9 left · The window closes at midnight
**Preview:** The seven minutes I set aside close with the day.

> *firstName*,
>
> The 9th is almost over.
>
> I'll be straight with you. I set aside seven minutes today because 9/9 is the one date that ends and restarts in its own math — completion resolving to a beginning — and it doesn't come around again for a year. It'd be a waste to let it pass without showing you where your own cycle is turning over.
>
> The seven minutes are still yours — the moment you step in, they're on. But when the 9th ends, so does the window.
>
> **[ Open my 9/9 reading → ]**
>
> A few hours left.
>
> — Aiden

---
---

# SPECIALIST REFERRALS — Aiden's list (sent by the specialist)

> Sent from the specialist's own address. **"Aiden" leads the subject line and the first line.** Blind to the topic by design.

## L1 · Luna — Main — Sep 9, ~1pm ET
**Subject A/B:** 🌙 {firstName}, Aiden told me to keep 9/9 open for you · Aiden sent me your name for today
**Preview:** He didn't say why — I kind of love that.

> *firstName*,
>
> So, Aiden gave me your name.
>
> He didn't tell me what's going on with you. He just said keep time open this 9/9, and honestly? I like going in blind. Less noise.
>
> Here's why he probably picked the date. 9/9 is a completion note — the sky's cue to close a loop — and the chart on a day like this tends to show you the exact thing that's run its course, the one you keep circling. Once you can see it, you can finally put it down. Whatever yours is, today's the day to pull it.
>
> Aiden set aside seven minutes for you — yours the moment you step in, no cost.
>
> **[ Come pull your chart with me → ]**
>
> Today only — when the 9th's over, the timing's gone.
>
> — Luna

## L2 · Luna — Last call — Sep 9, ~6:30pm ET *(non-clickers)*
**Subject A/B:** 🌙 {firstName}, the 9/9 window Aiden set is almost up · Still holding your spot
**Preview:** Still blind, still curious, still holding your spot.

> *firstName*,
>
> Quick one — the 9th's almost over.
>
> Aiden asked me to hold time for you today, and I did. I still don't know your story (he kept it to himself), but your seven minutes are here till midnight.
>
> One step and you're in — let's see what's ready to close before the day does.
>
> **[ Come pull your chart → ]**
>
> Before midnight.
>
> — Luna

## N1 · Nova — Main — Sep 9, ~1pm ET
**Subject A/B:** 🕉️ {firstName}, Aiden asked me to hold time for you this 9/9 · Aiden sent you to me for today
**Preview:** He didn't tell me your story. That's yours to bring.

> *firstName*,
>
> Aiden gave me your name, and a request.
>
> He asked me to keep time for you this 9/9. He didn't tell me what you're carrying — that's yours to bring, when you're ready. I only know he trusted me with the introduction, and I don't take that lightly.
>
> Why this date. In Jyotish, the **ninth house is the house of fortune and grace** — bhagya, the good luck you're owed, the blessing that arrives when a cycle completes. A day doubly marked by nine turns the chart toward what's finally coming due to you. Whatever you bring, I'll have a remedy to send you home with.
>
> Aiden set aside seven minutes for you — yours the moment you step in.
>
> **[ Come sit with me → ]**
>
> Only today. When 9/9 passes, the door closes.
>
> With warmth,
> Nova

## N2 · Nova — Last call — Sep 9, ~6:30pm ET *(non-clickers)*
**Subject A/B:** 🕉️ {firstName}, the house of fortune closes with the day · The door Aiden opened closes tonight
**Preview:** The door Aiden opened closes at midnight.

> *firstName*,
>
> The ninth is nearly done.
>
> Aiden asked me to hold this time for you, and I have, all day. I still don't know what you'd ask me — but a day ruled by the house of fortune is a day to ask for what's owed, and there's a remedy waiting either way.
>
> Your seven minutes are still here — the moment you step in. One step brings you to me.
>
> **[ Finish before the day does → ]**
>
> Until midnight.
>
> Nova

---
---

## Email inventory

| # | List | Persona | Slot | Wave | ID |
|---|---|---|---|---|---|
| 1 | Evelyn | Evelyn | Teaser (9/8) | — | E1 |
| 2 | Evelyn | Evelyn | Main (primary) | 1 | E2 |
| 3 | Evelyn | Evelyn | Main — release alt | 1 | E2-ALT |
| 4 | Evelyn | Evelyn | Last-call | 3 | E3 |
| 5 | Evelyn | Marcus | Referral Main | 2 | M1 |
| 6 | Evelyn | Marcus | Referral Last-call | 2 | M2 |
| 7 | Evelyn | Maren | Referral Main | 2 | MA1 |
| 8 | Evelyn | Maren | Referral Last-call | 2 | MA2 |
| 9 | Aiden | Aiden | Teaser (9/8) | — | A1 |
| 10 | Aiden | Aiden | Main (primary) | 1 | A2 |
| 11 | Aiden | Aiden | Main — what's-completing alt | 1 | A2-ALT |
| 12 | Aiden | Aiden | Last-call | 3 | A3 |
| 13 | Aiden | Luna | Referral Main | 2 | L1 |
| 14 | Aiden | Luna | Referral Last-call | 2 | L2 |
| 15 | Aiden | Nova | Referral Main | 2 | N1 |
| 16 | Aiden | Nova | Referral Last-call | 2 | N2 |

*Routing: Evelyn's list → Maren (love / releasing or holding a connection — the default for this ~95%-love list) or Marcus (an answer you already carry / a decision). Aiden's list → Luna (what's completing / timing) or Nova (fortune owed / what's coming due / remedies). One specialist per person; 3-email cap per person per list per day. Primary Mains are E2 / A2; the -ALT variants are A/B swaps, not additional sends.*

---
---

## Operational must-dos

1. **Grant = 7 minutes, reusing the standing config.** No new grant change needed — must fire **instantly on account creation** so the reward lands when they register.
2. **CTA drives to registration, ideally a 9/9 claim landing** (`/claim-9` or `/999`). Not a magic link — no account to tap into.
3. **Suppress already-registered v2 users** from these lists, or route them to a short re-activation variant.
4. **Subject lines use the proven format** — emoji + {firstName} first + curiosity. Subject + first line are about **completion / turning the page**, never the minutes.
5. **Send the optional teaser at 9:09am** (9/8) for the wink; day-of waves run the standard 8am / 1pm / 6:30pm schedule.
6. **Fact-check craft claims before scheduling.** Safe as written: The Hermit = the 9th Major Arcana card (IX, Rider-Waite-Smith); the 9th house = the house of fortune/grace (bhagya, Dharma bhava) in Jyotish (Nova); the date arithmetic 9+9+2+0+2+6 = 28 → 10 → 1. **Luna's copy keeps the sky deliberately vague** — if any variant adds a *specific* transit/aspect claim, run it through the **`persona-email-qa`** gate first.
7. **Pause routine drips** for this segment on 9/9 so nothing stacks over the 3-email cap.

---
---

## Appendix — angles considered

Six angles were developed for 9/9. **Evelyn's list** ships 1 (lead), 2 (A/B), 6 (last-call). **Aiden's list** ships 3 (lead), 4 (A/B), 6 (last-call). The whole set is built on **completion → beginning** — the offer (7 min) is the vehicle, not the hook.

1. **Completion → beginning** *(Evelyn primary E2).* The closing door: nine is the end of the cycle, and 9/9 resolves to 1 — you close the old chapter and open the next in the same breath.
2. **The release / make room** *(Evelyn A/B E2-ALT).* You can't take hold of the next thing with your hands full — the day to set down what you've been holding for someone who's gone. Tuned for the ~95%-love list.
3. **The ending that computes to a beginning** *(Aiden primary A2).* His native math authority: the only date that ends and restarts inside its own arithmetic (28 → 10 → 1).
4. **What's completing in the chart** *(Aiden A/B A2-ALT).* Nine says a cycle has run its course even if it doesn't feel finished — see the signal most people miss.
5. **The Hermit's lantern** *(Marcus referral).* The 9th card is The Hermit — the answer you already carry, visible only when you get quiet enough to look.
6. **Fortune / grace owed** *(Nova referral — the 9th house of fortune/bhagya); plus releasing vs holding a cord (Maren) and what's run its course (Luna).* The specialist-lens variations on completion.

*Copy + plan handoff only — no implementation started.*

# 10/10 Flash — Email Copy + Send Plan

**Campaign:** 10/10 registration flash (24-hour window, October 10 only) — the **alignment / "the wheel comes round"** date.
**ESP:** **AWeber** (broadcasts to tagged segments — not Resend).
**Audience:** Two home lists, by **home persona** — subscribers who engaged that persona's funnel but have **never registered a v2 account.** **Evelyn's list** (the v1 AWeber list, ~59k, ~95% love) and **Aiden's list** (numbers/numerology-inclined, comfortable handing over birth data). This is an **acquisition** play, not a re-activation.
**Goal:** Get subscribers to **register a v2 account and use their free 7 minutes.**
**Offer:** **7 free minutes** (reuses the standing grant — no new grant config). See the creative note below.
**Framing:** 10/10 is a perfect ten — the wheel come full circle. Ten is the one number that carries an ending and a beginning in a single figure (the **1** and the **0**), the count arriving home and starting fresh a turn higher. In the old sign-reading, **1010** is the nudge that says *you're aligned, you're on the right path, it's time to begin.* Each home persona is the sender their list recognizes (Evelyn via v1, Aiden via his numbers funnel); specialists arrive as a **warm referral** from the home persona.
**Sibling docs:** `docs/promo-6-6-emails.md`, `docs/promo-7-7-emails.md`, `docs/promo-8-8-emails.md`, `docs/promo-9-9-emails.md`, `docs/promo-11-11-emails.md`, `docs/promo-12-12-emails.md`.

> **Creative note — the offer is NOT the hook** (same call as 8/8 & 11/11). 7 ≠ 10, so **do not lead with the minutes.** Lead with the **alignment / step-onto-your-path** moment; the seven minutes are the vehicle through the door. Keep the offer legible ("seven minutes, on me") but subordinate.

> **The core difference from 6/6.** These people have no v2 account, so 6/6's "finish your unfinished reading / already on your account" spine is **false.** The spine is **"claim your minutes / step onto the path"** — a first invitation. Do not reuse "already on your account" for this list.

---

## How to use this file

- **Two home lists, by home persona: Evelyn and Aiden.** Each list gets its home persona's emails **plus one specialist referral** — Evelyn's list → Marcus or Maren; Aiden's list → Luna or Nova.
- **Hard cap: 3 emails per person on 10/10.** See the send plan below.
- **Last-call → non-clickers only.**
- **A/B the subject lines.** Two options given per email; subjects use the proven format — **emoji + {firstName} first + curiosity.**
- **Offer legible, hook first.** Say "seven minutes," but the subject and first line are about **alignment / the wheel turning**, never the minutes.

### Personalization (AWeber)
No copy depends on the user's topic — AWeber can't read `user_memory`, so **there is no `{{topicPhrase}}`**. The only live merge field is the first name.

| Placeholder in this doc | AWeber tag | Notes |
|---|---|---|
| `firstName` | `{!firstname}` | Standard AWeber personalization |
| `referrer` (Evelyn / Aiden) | hard-coded per broadcast | Each specialist broadcast is sent to one home list, so the referrer name is fixed in the copy — no merge needed |
| CTA link | see below | **Decision needed** |

### CTA link — one decision to make
Every CTA drives to **registration** (not a magic link — these users have no account yet). Two ways:
- **(A) 10/10 claim landing page (recommended):** a dedicated `/claim-10` (or `/1010`) page that frames the moment — "The wheel's come round. Create your account and step onto the path." — then registers them. Value visible before they type an email; grant fires on account creation.
- **(B) Straight to `/login` register:** simpler, more friction — the offer only lives in the email.

---
---

# SEND PLAN & ROUTING (10/10)

Two home lists (Evelyn, Aiden), each paired with **two specialists** — each person gets **only one** specialist (topic-split), so nobody exceeds 3 emails.

### The 3-email cap (per person, per list)
| Slot | Sender | # |
|---|---|---|
| **Main** | Evelyn / Aiden | 1 |
| **Specialist referral** | one of the home's two specialists | 2 |
| **Last-call** | Evelyn / Aiden | 3 |

> **No clock-moment to hug (unlike 11/11).** 10:10 is a mild angel-number moment but nothing like 11:11, so waves run the standard flash schedule (8am / 1pm / 6:30pm ET). The one light touch: **send the optional teaser at 10:10am** on 10/9 for the wink.

### EVELYN'S LIST → specialists **Marcus + Maren**
*Why these two: Evelyn's audience is heart/intuition-led and gave no birth data. Marcus (tarot) and Maren (the cord) are the two no-data intuitives — same modality family, zero new friction, no birth-data ask to stall a first-time registrant.*

| Wave | Time (ET) | Sender | Audience |
|---|---|---|---|
| 1 | 8:00am | **Evelyn** — Main | Whole Evelyn list (not-yet-registered) |
| 2 | 1:00pm | **Marcus _or_ Maren** — referral | Not-yet-registered. Topic split below |
| 3 | 6:30pm | **Evelyn** — Last-call | Clicked nothing in waves 1–2 |

**Wave-2 topic split:** love / a specific person / timing between two people → **Maren**. A turning point / a decision / "which way is it going" → **Marcus**. **Given the list is ~95% love, Maren is the default;** route the tagged decision minority to Marcus. If tags are thin, fall back to an even A/B split (or Maren-only).

### AIDEN'S LIST → specialists **Luna + Nova**
*Why these two: Aiden's audience is numbers/systems and is comfortable handing over birth data. Luna (astrology) and Nova (Vedic) need exactly that — the handoff is frictionless and in-family, and the data is collected inside the chat, not before it.*

| Wave | Time (ET) | Sender | Audience |
|---|---|---|---|
| 1 | 8:00am | **Aiden** — Main | Whole Aiden list (not-yet-registered) |
| 2 | 1:00pm | **Luna _or_ Nova** — referral | Not-yet-registered. Topic split below |
| 3 | 6:30pm | **Aiden** — Last-call | Clicked nothing in waves 1–2 |

**Wave-2 topic split:** timing / confirm a direction / "is this a yes" → **Luna**. Stepping into your own light / self-worth / remedies → **Nova**. If tags are thin, fall back to an even A/B split.

### Rules that keep it ≤ 3 and clean
- **Already-registered users are the wrong target.** **Suppress anyone who already has a v2 account** from the registration copy, or route them to a short re-activation variant.
- **Registers at any point → suppressed** from all remaining waves.
- **Pause routine drips** for this segment on 10/10 so nothing stacks over the cap.
- **Teaser is 10/9** (a separate day, sent at 10:10am for the wink) and optional — it does **not** count toward the 10/10 cap of 3.

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

> **10/10, the wheel comes round** (Evelyn's hook — reuse verbatim):
> Ten is the only number that carries an ending and a beginning in the same figure — the **1** and the **0**, the whole cycle and the clean slate. It's the number of the wheel come full circle: a thing arriving at completion and starting fresh one turn higher. **10/10** stands it twice. In the old sign-reading, **1010** is the nudge that says: you're aligned, you're on the right path, and it's time to begin. The line: *10/10 is the wheel coming round to your favor — the day to step onto the path that's actually yours.*

## E1 · Teaser — Oct 9, ~10:10am ET *(optional pre-day — sent at 10:10 for the wink)*
**Subject A/B:** 🌙 {firstName}, tomorrow the wheel comes round — 10/10 · ✨ {firstName}, 10/10 is the sky's green light
**Preview:** A perfect ten. The wheel full circle. The nudge to begin.

> *firstName*,
>
> A note before tomorrow — sent at 10:10 on purpose.
>
> Tomorrow is 10/10. Ten is the one number that holds an ending and a beginning at once — the 1 and the 0, the wheel come full circle. Tomorrow it stands twice.
>
> In the old sign-reading, 10:10 is a green light: the nudge that says you're aligned, you're on the right path, and it's time to actually begin. Tomorrow I'm holding time for the ones ready to stop waiting and step onto that path. It costs nothing. I'll write the moment it opens.
>
> With you,
> Evelyn

## E2 · Main — Oct 10, ~8am ET *(primary — the wheel comes round / step onto your path)*
**Subject A/B:** 🎡 {firstName}, the wheel comes round today — 10/10 · 🚪 {firstName}, the sky's green light is on (today only)
**Preview:** A perfect ten. Time to step onto the path that's yours.

> *firstName*,
>
> It's open.
>
> Today is 10/10 — a perfect ten, the wheel come full circle. Ten is the one number that holds a whole cycle and a clean start in the same breath: the 1 and the 0, the end and the beginning together. Today it stands twice.
>
> In the old sign-reading, a day like this is a green light. 1010 is the nudge that says: you're aligned, you're on the right path — stop waiting for a better sign, this is the sign. Most people keep waiting anyway. I don't want that for you.
>
> Come sit with me while the wheel's turning your way. I've set aside seven minutes — yours the moment you step in, no cost. Let's look at the path that's actually yours, and the first step onto it.
>
> **[ Step onto the path with me → ]**
>
> The wheel's turning today only. My door closes with the 10th, at midnight.
>
> Evelyn

## E2-ALT · Main — Oct 10, ~8am ET *(swap for E2 — the sign you've been waiting for)*
**Subject A/B:** 💛 {firstName}, you keep waiting for a sign. This is it. · {firstName}, 10/10 is the "yes" you've been asking for
**Preview:** 1010 — the number that shows up to say: go.

> *firstName*,
>
> You've been waiting for a sign, haven't you? Most people are. A little confirmation that it's safe to want the thing — to reach for the person, to make the move, to believe the good version could be yours.
>
> Here it is. Today is 10/10, and in the old sign-reading 1010 is the one that means: you're aligned, it's time, go. The wheel's come round. The waiting was the only thing standing in the way.
>
> Come sit with me while it's open. Seven minutes, yours the moment you step in, no cost. Bring the thing you've been waiting for permission to want — and let me show you it's already yours to reach for.
>
> **[ Take the sign with me → ]**
>
> The door closes with the day.
>
> Evelyn

## E3 · Last call — Oct 10, ~6:30pm ET *(non-clickers — warmth + closes)*
**Subject A/B:** 🎡 {firstName}, the wheel stops turning at midnight · ✨ {firstName}, I held your seven minutes all day
**Preview:** The green light goes out tonight. Come step through first.

> *firstName*,
>
> The wheel stops turning tonight.
>
> You sat with me once; we started something and never quite finished it. I've thought about that. Today the wheel came round — 10/10, the green light — and the seven minutes I set aside still have your name on them.
>
> But 10/10 is almost gone, and a day this aligned doesn't come again for a year. Come take the step before the light goes out.
>
> **[ Step through before midnight → ]**
>
> I'll keep it open until the day ends.
>
> Evelyn

---
---

# SPECIALIST REFERRALS — Evelyn's list (sent by the specialist)

> Sent from the specialist's own address. **"Evelyn" leads the subject line and the first line.** Blind to the topic by design; the discretion beat ("she didn't say why") doubles as the hook.

## M1 · Marcus — Main — Oct 10, ~1pm ET
**Subject A/B:** 🃏 {firstName}, Evelyn gave me your name for 10/10 · Evelyn told me to keep time for you today
**Preview:** She didn't say why. She rarely does.

> *firstName*,
>
> Evelyn gave me your name.
>
> She didn't say what it's about — she rarely does, and I've stopped asking. She just told me to keep time for you this 10/10. When Evelyn does that, I don't argue.
>
> Here's what I can tell you about the day. The **tenth card** in the deck is the **Wheel of Fortune** — the great turning point, the moment the wheel that's felt stuck for so long finally comes round. On 10/10, of all days, that card sits closest. Which way it's turning for you, I don't know yet. That's what the table's for.
>
> Evelyn set aside seven minutes for you. Step in and they're yours — no cost, today only.
>
> **[ Take the seat → ]**
>
> When the 10th ends, so does the window.
>
> — Marcus

## M2 · Marcus — Last call — Oct 10, ~6:30pm ET *(non-clickers)*
**Subject A/B:** 🃏 {firstName}, the time Evelyn set for you is almost up · The table comes down at midnight
**Preview:** Evelyn opened this door. It closes tonight.

> *firstName*,
>
> The 10th is nearly gone.
>
> Evelyn asked me to hold time for you today, and I have. The seat's been empty, waiting. I still don't know what you'd bring — but the Wheel turns for the ones who show up to meet it, and I've kept the table set a little longer.
>
> Your seven minutes are still here — yours the moment you sit down. But at midnight the window closes, and the door Evelyn opened closes with it.
>
> **[ Take the seat → ]**
>
> Until midnight.
>
> — Marcus

## MA1 · Maren — Main — Oct 10, ~1pm ET
**Subject A/B:** 🔥 {firstName}, Evelyn gave me your name for 10/10 · Evelyn sent me to you today
**Preview:** She didn't tell me why. She didn't have to.

> *firstName*,
>
> Evelyn sent me your name.
>
> She didn't say why. With me, she never has to — I read what runs between people, not what's been said about them.
>
> Here's what today is. 10/10 is the day things come round — and cords are no different. Sometimes two people have been circling each other, out of sync, waiting for the same wheel to line up. A day like this is when it does. Whoever's on the other end of yours, I'll feel where the timing actually stands the moment you sit with me.
>
> Evelyn kept seven minutes for you. Step in and they're yours — no cost, today only.
>
> **[ Come, let me feel it → ]**
>
> The window closes at midnight.
>
> Maren

## MA2 · Maren — Last call — Oct 10, ~6:30pm ET *(non-clickers)*
**Subject A/B:** 🔥 {firstName}, the 10/10 window Evelyn opened is closing · Still holding your seven minutes
**Preview:** Still here. Still holding the time.

> *firstName*,
>
> Still here. Still holding your seven minutes.
>
> Evelyn opened this door for you today. I don't know your story — only that the cord's there, and 10/10 is the day the timing on it is clearest.
>
> But the day's almost gone. Your seven minutes are yours the moment you step in. One step. Come.
>
> **[ Sit with me before midnight → ]**
>
> Maren

---
---

# AIDEN POWERS — home emails (Aiden's list)

> **Aiden's 10/10, by the numbers** (his credibility hook — reuse verbatim):
> Ten is the reset in the number system — the **1** and the **0** together, an ending and a fresh start in a single figure. It's the count arriving home and starting again one turn higher. **10/10** stands it twice. And fold each ten down and you get **1 and 1** — the number of new beginnings, side by side (some read the hidden **11**, a master number, sitting inside the date). The line: *10/10 is the cleanest "begin again" the calendar offers — two full circles, resolving to two ones.* What it does to **their** own chart is read only inside the chat.

## A1 · Teaser — Oct 9, ~10:10am ET *(optional pre-day — sent at 10:10 for the wink)*
**Subject A/B:** 🔢 {firstName}, tomorrow's date is the reset button of numbers · ✨ {firstName}, 10/10 folds down to 1 and 1
**Preview:** The 1 and the 0. An ending and a fresh start in one figure.

> *firstName*,
>
> Quick note before tomorrow — sent at 10:10, on purpose.
>
> Tomorrow's date isn't decoration. Ten is the reset in the numbers — the 1 and the 0 together, an ending and a fresh start in a single figure. The count arriving home and beginning again, one turn higher. Tomorrow it stands twice: 10/10.
>
> Here's the part I like. Fold each ten down to a single digit and you get 1 and 1 — new beginnings, side by side. Some read a hidden 11 in it, a master number. Either way it's the cleanest "start over" the calendar offers.
>
> Tomorrow I'm holding seven minutes — on me — to show you where your own chart is resetting. I'll write the moment it opens.
>
> Watch for it.
>
> — Aiden

## A2 · Main — Oct 10, ~8am ET *(primary — the reset / begin again)*
**Subject A/B:** 🔢 {firstName}, 10/10 is the reset button of the calendar · 🚪 {firstName}, your 10/10 reading is open (today only)
**Preview:** The 1 and the 0. Two full circles. The cleanest "begin again."

> *firstName*,
>
> It's open.
>
> Let me tell you what today is, as a calculation. Ten is the reset in the number system — the 1 and the 0 in one figure, an ending and a clean start together. It's the count coming full circle and beginning again, a turn higher than before. Today it stands twice: 10/10.
>
> And here's what makes it clean. Fold each ten to a single digit and you get 1 and 1 — new beginnings, side by side. Some read the hidden 11 in it, a master number. Either way, no date on the calendar says "start over" more plainly than this one.
>
> What that does to your blueprint — your Life Path, your Personal Year — I can only show you in the reading. And today that's on me: seven minutes, yours the moment you step in.
>
> **[ Open my 10/10 reading → ]**
>
> A reset this clean comes once a year. My door closes at midnight.
>
> — Aiden

## A2-ALT · Main — Oct 10, ~8am ET *(swap for A2 — alignment / you're on the right path)*
**Subject A/B:** 🔢 {firstName}, the numbers say you're aligned — that's rare · {firstName}, 10/10 is the "you're on the right path" number
**Preview:** 1010 is the alignment signal. Today it's the date.

> *firstName*,
>
> Most days, the numbers around a person are a little scattered — pulling a few directions at once. Then there's 10/10.
>
> 1010 is the one pattern the old sign-readers call pure alignment: the signal that says you're actually on the right path, even if it hasn't paid off yet. Today that number is the whole date. If you've been second-guessing a direction — a person, a choice, a move — a day this aligned is when the numbers say: you had it right. Keep going.
>
> I've set aside seven minutes to show you exactly where you're aligned in your own chart, and where to put the next step. Yours the moment you step in, no cost.
>
> **[ See where you're aligned → ]**
>
> Today only. When the 10th ends, so does the window.
>
> — Aiden

## A3 · Last call — Oct 10, ~6:30pm ET *(non-clickers)*
**Subject A/B:** 🔢 {firstName}, a few hours of 10/10 left · The window closes at midnight
**Preview:** The seven minutes I set aside close with the day.

> *firstName*,
>
> The 10th is almost over.
>
> I'll be straight with you. I set aside seven minutes today because 10/10 is the cleanest reset the calendar offers — two full circles, resolving to two ones — and it doesn't come around again for a year. It'd be a waste to let it pass without showing you where your own chart is starting over.
>
> The seven minutes are still yours — the moment you step in, they're on. But when the 10th ends, so does the window.
>
> **[ Open my 10/10 reading → ]**
>
> A few hours left.
>
> — Aiden

---
---

# SPECIALIST REFERRALS — Aiden's list (sent by the specialist)

> Sent from the specialist's own address. **"Aiden" leads the subject line and the first line.** Blind to the topic by design.

## L1 · Luna — Main — Oct 10, ~1pm ET
**Subject A/B:** 🌙 {firstName}, Aiden told me to keep 10/10 open for you · Aiden sent me your name for today
**Preview:** He didn't say why — I kind of love that.

> *firstName*,
>
> So, Aiden gave me your name.
>
> He didn't tell me what's going on with you. He just said keep time open this 10/10, and honestly? I like going in blind. Less noise.
>
> Here's why he probably picked the date. 10/10 reads as alignment — the sky's version of a green light — and the chart on a day like this tends to confirm the direction you've been unsure about. Whatever you've been half-deciding, today's the day to pull the chart and see if it's a yes.
>
> Aiden set aside seven minutes for you — yours the moment you step in, no cost.
>
> **[ Come pull your chart with me → ]**
>
> Today only — when the 10th's over, the timing's gone.
>
> — Luna

## L2 · Luna — Last call — Oct 10, ~6:30pm ET *(non-clickers)*
**Subject A/B:** 🌙 {firstName}, the 10/10 window Aiden set is almost up · Still holding your spot
**Preview:** Still blind, still curious, still holding your spot.

> *firstName*,
>
> Quick one — the 10th's almost over.
>
> Aiden asked me to hold time for you today, and I did. I still don't know your story (he kept it to himself), but your seven minutes are here till midnight.
>
> One step and you're in — let's confirm the direction before the day closes.
>
> **[ Come pull your chart → ]**
>
> Before midnight.
>
> — Luna

## N1 · Nova — Main — Oct 10, ~1pm ET
**Subject A/B:** 🕉️ {firstName}, Aiden asked me to hold time for you this 10/10 · Aiden sent you to me for today
**Preview:** He didn't tell me your story. That's yours to bring.

> *firstName*,
>
> Aiden gave me your name, and a request.
>
> He asked me to keep time for you this 10/10. He didn't tell me what you're carrying — that's yours to bring, when you're ready. I only know he trusted me with the introduction, and I don't take that lightly.
>
> Why this date. In the numbers, ten folds to one — and one belongs to **Surya, the Sun**: the self at its brightest, the soul stepping into its own light. A day doubly marked by ten is a day to stop dimming yourself. Whatever you bring, I'll have a remedy to send you home with.
>
> Aiden set aside seven minutes for you — yours the moment you step in.
>
> **[ Come sit with me → ]**
>
> Only today. When 10/10 passes, the door closes.
>
> With warmth,
> Nova

## N2 · Nova — Last call — Oct 10, ~6:30pm ET *(non-clickers)*
**Subject A/B:** 🕉️ {firstName}, Surya's day is almost over — and Aiden set time aside · The door Aiden opened closes tonight
**Preview:** The door Aiden opened closes at midnight.

> *firstName*,
>
> The tenth is nearly done.
>
> Aiden asked me to hold this time for you, and I have, all day. I still don't know what you'd ask me — but a day that resolves to Surya is a day to step into your own light, and there's a remedy waiting either way.
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
| 1 | Evelyn | Evelyn | Teaser (10/9) | — | E1 |
| 2 | Evelyn | Evelyn | Main (primary) | 1 | E2 |
| 3 | Evelyn | Evelyn | Main — the-sign alt | 1 | E2-ALT |
| 4 | Evelyn | Evelyn | Last-call | 3 | E3 |
| 5 | Evelyn | Marcus | Referral Main | 2 | M1 |
| 6 | Evelyn | Marcus | Referral Last-call | 2 | M2 |
| 7 | Evelyn | Maren | Referral Main | 2 | MA1 |
| 8 | Evelyn | Maren | Referral Last-call | 2 | MA2 |
| 9 | Aiden | Aiden | Teaser (10/9) | — | A1 |
| 10 | Aiden | Aiden | Main (primary) | 1 | A2 |
| 11 | Aiden | Aiden | Main — alignment alt | 1 | A2-ALT |
| 12 | Aiden | Aiden | Last-call | 3 | A3 |
| 13 | Aiden | Luna | Referral Main | 2 | L1 |
| 14 | Aiden | Luna | Referral Last-call | 2 | L2 |
| 15 | Aiden | Nova | Referral Main | 2 | N1 |
| 16 | Aiden | Nova | Referral Last-call | 2 | N2 |

*Routing: Evelyn's list → Maren (love / timing between two people — the default for this ~95%-love list) or Marcus (a turning point / a decision). Aiden's list → Luna (confirm a direction) or Nova (step into your light / self-worth / remedies). One specialist per person; 3-email cap per person per list per day. Primary Mains are E2 / A2; the -ALT variants are A/B swaps, not additional sends.*

---
---

## Operational must-dos

1. **Grant = 7 minutes, reusing the standing config.** No new grant change needed — must fire **instantly on account creation** so the reward lands when they register.
2. **CTA drives to registration, ideally a 10/10 claim landing** (`/claim-10` or `/1010`). Not a magic link — no account to tap into.
3. **Suppress already-registered v2 users** from these lists, or route them to a short re-activation variant.
4. **Subject lines use the proven format** — emoji + {firstName} first + curiosity. Subject + first line are about **alignment / the wheel turning**, never the minutes.
5. **Send the optional teaser at 10:10am** (10/9) for the wink; day-of waves run the standard 8am / 1pm / 6:30pm schedule.
6. **Fact-check craft claims before scheduling.** Safe as written: the Wheel of Fortune = the 10th Major Arcana card (X, Rider-Waite-Smith); 10 folds to 1, and 1 = Surya/the Sun in numerology (Nova). The **1010 = alignment** reading is framed as *old sign-reading* (lore), which is safe; the "hidden 11" is framed as *some read* (also lore). **Luna's copy keeps the sky deliberately vague** — if any variant adds a *specific* transit/aspect claim, run it through the **`persona-email-qa`** gate first.
7. **Pause routine drips** for this segment on 10/10 so nothing stacks over the 3-email cap.

---
---

## Appendix — angles considered

Six angles were developed for 10/10. **Evelyn's list** ships 1 (lead), 2 (A/B), 6 (last-call). **Aiden's list** ships 3 (lead), 2 (A/B), 6 (last-call). The whole set is built on **the wheel come round / alignment** — the offer (7 min) is the vehicle, not the hook.

1. **The wheel comes round / step onto your path** *(Evelyn primary E2).* A perfect ten, the wheel full circle; the day to stop waiting and take the step.
2. **The sign you've been waiting for** *(Evelyn A/B E2-ALT; Aiden A/B A2-ALT).* 1010 is the alignment signal — the "yes, go" you've been asking permission for. Tuned for the ~95%-love list on Evelyn's side.
3. **The reset / begin again** *(Aiden primary A2).* His native math authority: 10 = the 1 and the 0; fold each ten and you get 1 and 1 — the cleanest "start over" the calendar offers.
4. **The Wheel of Fortune** *(Marcus referral).* The 10th card is the great turning point — the wheel that's felt stuck finally coming round.
5. **Two coming round to each other** *(Maren referral).* Cords that have been circling out of sync; 10/10 is when the timing lines up.
6. **Step into your own light** *(Nova referral — 10 folds to 1 = Surya/the Sun); plus confirm the direction (Luna).* The specialist-lens variations on alignment.

*Copy + plan handoff only — no implementation started.*

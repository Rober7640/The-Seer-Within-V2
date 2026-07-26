# 12/12 Flash — Email Copy + Send Plan

**Campaign:** 12/12 registration flash (24-hour window, December 12 only) — the **year's last door** (the full circle; the final repeating date of the year).
**ESP:** **AWeber** (broadcasts to tagged segments — not Resend).
**Audience:** Two home lists, by **home persona** — subscribers who engaged that persona's funnel but have **never registered a v2 account.** **Evelyn's list** (the v1 AWeber list, ~59k, ~95% love) and **Aiden's list** (numbers/numerology-inclined, comfortable handing over birth data). This is an **acquisition** play, not a re-activation.
**Goal:** Get subscribers to **register a v2 account and use their free 7 minutes.**
**Offer:** **7 free minutes** (reuses the standing grant — no new grant config). See the creative note below.
**Framing:** 12/12 is the **full circle** — twelve is the complete set (twelve months, twelve signs, twelve hours), and 12/12 is the **last repeating date of the year.** In the old sign-reading, **1212** carries one message: *trust the path, keep faith, you're closer than you think.* Each home persona is the sender their list recognizes (Evelyn via v1, Aiden via his numbers funnel); specialists arrive as a **warm referral** from the home persona.
**Sibling docs:** `docs/promo-6-6-emails.md`, `docs/promo-7-7-emails.md`, `docs/promo-8-8-emails.md`, `docs/promo-9-9-emails.md`, `docs/promo-10-10-emails.md`, `docs/promo-11-11-emails.md`.

> **Creative note — the offer is NOT the hook** (same call as 8/8 & 11/11). 7 ≠ 12, so **do not lead with the minutes.** Lead with the **year's-last-door / you're-closer-than-you-think** moment; the seven minutes are the vehicle through the door. Keep the offer legible ("seven minutes, on me") but subordinate.
>
> **Extra lever unique to 12/12:** it's the **final repeating date of the year** — real, honest scarcity ("no other double left to catch in 2026"). Lean on it, especially in the last-call.

> **The core difference from 6/6.** These people have no v2 account, so 6/6's "finish your unfinished reading / already on your account" spine is **false.** The spine is **"claim your minutes / walk through the last door"** — a first invitation. Do not reuse "already on your account" for this list.

---

## How to use this file

- **Two home lists, by home persona: Evelyn and Aiden.** Each list gets its home persona's emails **plus one specialist referral** — Evelyn's list → Marcus or Maren; Aiden's list → Luna or Nova.
- **Hard cap: 3 emails per person on 12/12.** See the send plan below.
- **Last-call → non-clickers only.**
- **A/B the subject lines.** Two options given per email; subjects use the proven format — **emoji + {firstName} first + curiosity.**
- **Offer legible, hook first.** Say "seven minutes," but the subject and first line are about **the year's last door / the full circle**, never the minutes.

### Personalization (AWeber)
No copy depends on the user's topic — AWeber can't read `user_memory`, so **there is no `{{topicPhrase}}`**. The only live merge field is the first name.

| Placeholder in this doc | AWeber tag | Notes |
|---|---|---|
| `firstName` | `{!firstname}` | Standard AWeber personalization |
| `referrer` (Evelyn / Aiden) | hard-coded per broadcast | Each specialist broadcast is sent to one home list, so the referrer name is fixed in the copy — no merge needed |
| CTA link | see below | **Decision needed** |

### CTA link — one decision to make
Every CTA drives to **registration** (not a magic link — these users have no account yet). Two ways:
- **(A) 12/12 claim landing page (recommended):** a dedicated `/claim-12` (or `/1212`) page that frames the moment — "The year's last door is open. Create your account and walk through." — then registers them. Value visible before they type an email; grant fires on account creation.
- **(B) Straight to `/login` register:** simpler, more friction — the offer only lives in the email.

---
---

# SEND PLAN & ROUTING (12/12)

Two home lists (Evelyn, Aiden), each paired with **two specialists** — each person gets **only one** specialist (topic-split), so nobody exceeds 3 emails.

### The 3-email cap (per person, per list)
| Slot | Sender | # |
|---|---|---|
| **Main** | Evelyn / Aiden | 1 |
| **Specialist referral** | one of the home's two specialists | 2 |
| **Last-call** | Evelyn / Aiden | 3 |

> **No clock-moment to hug (unlike 11/11).** 12:12 is a mild angel-number moment but nothing like 11:11, so waves run the standard flash schedule (8am / 1pm / 6:30pm ET). The one light touch: **send the optional teaser at 12:12pm** on 12/11 for the wink.

### EVELYN'S LIST → specialists **Marcus + Maren**
*Why these two: Evelyn's audience is heart/intuition-led and gave no birth data. Marcus (tarot) and Maren (the cord) are the two no-data intuitives — same modality family, zero new friction, no birth-data ask to stall a first-time registrant.*

| Wave | Time (ET) | Sender | Audience |
|---|---|---|---|
| 1 | 8:00am | **Evelyn** — Main | Whole Evelyn list (not-yet-registered) |
| 2 | 1:00pm | **Marcus _or_ Maren** — referral | Not-yet-registered. Topic split below |
| 3 | 6:30pm | **Evelyn** — Last-call | Clicked nothing in waves 1–2 |

**Wave-2 topic split:** love / a specific person / a cord that lasted the year → **Maren**. What you're forcing / surrender / a decision → **Marcus**. **Given the list is ~95% love, Maren is the default;** route the tagged decision minority to Marcus. If tags are thin, fall back to an even A/B split (or Maren-only).

### AIDEN'S LIST → specialists **Luna + Nova**
*Why these two: Aiden's audience is numbers/systems and is comfortable handing over birth data. Luna (astrology) and Nova (Vedic) need exactly that — the handoff is frictionless and in-family, and the data is collected inside the chat, not before it.*

| Wave | Time (ET) | Sender | Audience |
|---|---|---|---|
| 1 | 8:00am | **Aiden** — Main | Whole Aiden list (not-yet-registered) |
| 2 | 1:00pm | **Luna _or_ Nova** — referral | Not-yet-registered. Topic split below |
| 3 | 6:30pm | **Aiden** — Last-call | Clicked nothing in waves 1–2 |

**Wave-2 topic split:** timing / "how close am I" / what's near completion → **Luna**. Grace to close the year / a blessing / remedies → **Nova**. If tags are thin, fall back to an even A/B split.

### Rules that keep it ≤ 3 and clean
- **Already-registered users are the wrong target.** **Suppress anyone who already has a v2 account** from the registration copy, or route them to a short re-activation variant.
- **Registers at any point → suppressed** from all remaining waves.
- **Pause routine drips** for this segment on 12/12 so nothing stacks over the cap.
- **Teaser is 12/11** (a separate day, sent at 12:12pm for the wink) and optional — it does **not** count toward the 12/12 cap of 3.
- **Watch the December calendar.** 12/12 sits inside holiday send-volume; keep this flash's cap tight and don't let seasonal broadcasts stack on top.

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

> **12/12, the year's last door** (Evelyn's hook — reuse verbatim):
> Twelve is the number of the full circle — twelve months, twelve signs, twelve hours on the face of the clock. The complete set; the whole wheel. **12/12** stands it twice, and it's the **last repeating date the year gives you.** In the old sign-reading, **1212** is the one that says: trust the path, you're closer than you think, keep faith. The line: *12/12 is the year's final open door — the reminder that the thing you've been waiting for is nearer than it feels.*

## E1 · Teaser — Dec 11, ~12:12pm ET *(optional pre-day — sent at 12:12 for the wink)*
**Subject A/B:** 🌙 {firstName}, tomorrow is the year's last door — 12/12 · ✨ {firstName}, 12/12 says: you're closer than you think
**Preview:** The last repeating date of the year. The full circle.

> *firstName*,
>
> A note before tomorrow — sent at 12:12 on purpose.
>
> Tomorrow is 12/12 — the full circle. Twelve is the complete set: twelve months, twelve signs, the whole wheel. And it's the last repeating date the year gives us — the final open door of 2026.
>
> In the old sign-reading, 1212 carries one message: trust the path, keep faith, you're closer than you think. Tomorrow I'm holding time for the ones who've been waiting on something and starting to doubt it. It costs nothing. I'll write the moment it opens.
>
> With you,
> Evelyn

## E2 · Main — Dec 12, ~8am ET *(primary — the year's last door / you're closer than you think)*
**Subject A/B:** 🚪 {firstName}, the year's last door is open — 12/12 · ✨ {firstName}, you're closer than you think (12/12)
**Preview:** The full circle. The final door of the year. Keep faith.

> *firstName*,
>
> It's open — and it's the last one.
>
> Today is 12/12. Twelve is the number of the full circle: twelve months, twelve signs, the whole wheel come round. And it's the last repeating date of the year — the final open door 2026 gives you.
>
> In the old sign-reading, 1212 carries one message, and it's the one I want you to hear: trust the path. Keep faith. You're closer than you think. If you've been waiting on something — a person, an answer, a turn you'd almost given up on — a day like this is the reminder that "not yet" was never "no."
>
> Come sit with me while the last door's open. I've set aside seven minutes — yours the moment you step in, no cost. Let me show you how close it actually is.
>
> **[ Walk through the last door → ]**
>
> It's the year's final door, and it closes with the 12th, at midnight.
>
> Evelyn

## E2-ALT · Main — Dec 12, ~8am ET *(swap for E2 — close the year whole)*
**Subject A/B:** 💛 {firstName}, before the year closes, one thing · {firstName}, the year comes full circle today
**Preview:** Twelve is the whole wheel. Today it's complete, twice over.

> *firstName*,
>
> Before the year closes, let me ask you one thing.
>
> After everything this year asked of you — did you ever stop to see how far you actually came? Most people don't. They just carry the tiredness into the next year without ever marking the ground they gained.
>
> Today is 12/12 — the full circle, the year come round. Twelve is the complete set: the whole wheel. A day like this is made for standing at the end of the circle and seeing the whole of it — what closed, what you survived, and the version of you that's ready for what's next.
>
> Come sit with me while the door's open. Seven minutes, yours the moment you step in, no cost. Let's close the year whole.
>
> **[ Close the year with me → ]**
>
> The last door of the year closes at midnight.
>
> Evelyn

## E3 · Last call — Dec 12, ~6:30pm ET *(non-clickers — warmth + closes)*
**Subject A/B:** 🌙 {firstName}, the year's last door closes at midnight · ✨ {firstName}, I held your seven minutes all day
**Preview:** The final door of 2026 closes tonight.

> *firstName*,
>
> The last door of the year closes tonight.
>
> You sat with me once; we started something and never quite finished it. I've thought about that — and today, of all days, feels like the one to close the loop. I held the year's final door open for you, and the seven minutes I set aside still have your name on them.
>
> 12/12 is almost gone, and there's no repeating date left this year to catch. Come walk through before it closes — and let's not carry the unfinished thing into a new year.
>
> **[ Walk through before midnight → ]**
>
> I'll keep it open until the day ends.
>
> Evelyn

---
---

# SPECIALIST REFERRALS — Evelyn's list (sent by the specialist)

> Sent from the specialist's own address. **"Evelyn" leads the subject line and the first line.** Blind to the topic by design; the discretion beat ("she didn't say why") doubles as the hook.

## M1 · Marcus — Main — Dec 12, ~1pm ET
**Subject A/B:** 🃏 {firstName}, Evelyn gave me your name for 12/12 · Evelyn told me to keep time for you today
**Preview:** She didn't say why. She rarely does.

> *firstName*,
>
> Evelyn gave me your name.
>
> She didn't say what it's about — she rarely does, and I've stopped asking. She just told me to keep time for you this 12/12. When Evelyn does that, I don't argue.
>
> Here's what I can tell you about the day. The **twelfth card** in the deck is the **Hanged Man** — the figure who stops struggling, lets go, and from that stillness sees the whole thing turn right-side up. It's the card of the answer that only comes when you stop forcing it. On 12/12, that card sits closest. What you've been forcing, I don't know yet. That's what the table's for.
>
> Evelyn set aside seven minutes for you. Step in and they're yours — no cost, today only.
>
> **[ Take the seat → ]**
>
> When the 12th ends, so does the window.
>
> — Marcus

## M2 · Marcus — Last call — Dec 12, ~6:30pm ET *(non-clickers)*
**Subject A/B:** 🃏 {firstName}, the time Evelyn set for you is almost up · The table comes down at midnight
**Preview:** Evelyn opened this door. It closes tonight.

> *firstName*,
>
> The 12th is nearly gone.
>
> Evelyn asked me to hold time for you today, and I have. The seat's been empty, waiting. I still don't know what you'd bring — but the Hanged Man is in no hurry; he knows the answer keeps until you're still enough for it. I've kept the seat a little longer.
>
> Your seven minutes are still here — yours the moment you sit down. But at midnight the window closes, and the door Evelyn opened closes with it.
>
> **[ Take the seat → ]**
>
> Until midnight.
>
> — Marcus

## MA1 · Maren — Main — Dec 12, ~1pm ET
**Subject A/B:** 🔥 {firstName}, Evelyn gave me your name for 12/12 · Evelyn sent me to you today
**Preview:** She didn't tell me why. She didn't have to.

> *firstName*,
>
> Evelyn sent me your name.
>
> She didn't say why. With me, she never has to — I read what runs between people, not what's been said about them.
>
> Here's what today is. 12/12 is the year come full circle — and it's a good day to feel which cords made it all the way round with you. After a whole year, the ones still humming mean something. Whoever's still on the other end of yours, I'll feel how alive it is the moment you sit with me.
>
> Evelyn kept seven minutes for you. Step in and they're yours — no cost, today only.
>
> **[ Come, let me feel it → ]**
>
> The window closes at midnight.
>
> Maren

## MA2 · Maren — Last call — Dec 12, ~6:30pm ET *(non-clickers)*
**Subject A/B:** 🔥 {firstName}, the year's last window Evelyn opened is closing · Still holding your seven minutes
**Preview:** Still here. Still holding the time.

> *firstName*,
>
> Still here. Still holding your seven minutes.
>
> Evelyn opened this door for you today. I don't know your story — only that the cord's there, and it made it all the way to the year's last door still humming.
>
> But the day's almost gone, and there's no repeating date left this year. Your seven minutes are yours the moment you step in. One step. Come.
>
> **[ Sit with me before midnight → ]**
>
> Maren

---
---

# AIDEN POWERS — home emails (Aiden's list)

> **Aiden's 12/12, by the numbers** (his credibility hook — reuse verbatim):
> Twelve is the number of the **complete cycle** — twelve months, twelve signs, twelve hours on the clock. The full set; the closed circle. **12/12** stands it twice, and it's the **last repeating date of the year** — the calendar doesn't do this again until next December. And run the whole date down — **12 + 12 + 2 + 0 + 2 + 6 = 34 → 7** — and the year's most complete number resolves to **7, the seeker.** The line: *even at the full circle, the numbers leave one more question — 12/12 completes the year and points to what's still unanswered.* What it means for **their** own chart is read only inside the chat.

## A1 · Teaser — Dec 11, ~12:12pm ET *(optional pre-day — sent at 12:12 for the wink)*
**Subject A/B:** 🔢 {firstName}, tomorrow is the last repeating date of the year · ✨ {firstName}, 12/12 is the complete circle — and it points to 7
**Preview:** The full set. The closed loop. The calendar's last double of 2026.

> *firstName*,
>
> Quick note before tomorrow — sent at 12:12, on purpose.
>
> Tomorrow's date isn't decoration. Twelve is the number of the complete cycle — twelve months, twelve signs, twelve hours on the clock. The full set. Tomorrow it stands twice, and it's the last repeating date of the year: the calendar doesn't do this again until next December.
>
> Here's the part I like. Run the whole date — 12 + 12 + 2 + 0 + 2 + 6 — and it lands on 34, which reduces to 7: the seeker's number. Even at the full circle, the numbers leave one more question open.
>
> Tomorrow I'm holding seven minutes — on me — to show you what your own chart is completing, and what it's still asking. I'll write the moment it opens.
>
> Watch for it.
>
> — Aiden

## A2 · Main — Dec 12, ~8am ET *(primary — the complete cycle / last repeating date)*
**Subject A/B:** 🔢 {firstName}, 12/12 is the last repeating date of the year · 🚪 {firstName}, your 12/12 reading is open (today only)
**Preview:** The complete circle. The calendar's final double of 2026.

> *firstName*,
>
> It's open — and it's the last of its kind this year.
>
> Let me tell you what today is, as a calculation. Twelve is the number of the complete cycle: twelve months, twelve signs, twelve hours on the clock face. The full set, the closed circle. Today it stands twice — 12/12 — and it's the last repeating date the calendar gives us in 2026.
>
> And here's what it points to. Run the full date — 12 + 12 + 2 + 0 + 2 + 6 — and it comes to 34, which reduces to 7: the seeker's number. The year's most complete date still leaves one question open. That's the one worth asking today.
>
> What all of it does to your blueprint — your Life Path, your Personal Year closing out — I can only show you in the reading. And today that's on me: seven minutes, yours the moment you step in.
>
> **[ Open my 12/12 reading → ]**
>
> The last double of the year. My door closes with it at midnight.
>
> — Aiden

## A2-ALT · Main — Dec 12, ~8am ET *(swap for A2 — close the year's ledger)*
**Subject A/B:** 🔢 {firstName}, what did this year actually add up to? · {firstName}, close the year's ledger with me — 12/12
**Preview:** The full circle is the day to run the year's numbers.

> *firstName*,
>
> Every year runs a ledger, whether you read it or not — the wins, the losses, the patterns that kept repeating. Most people close the year without ever adding it up.
>
> Today is 12/12 — the complete circle, the last repeating date of 2026. It's the one day built for running the year's numbers: seeing what the last twelve months actually taught you, what closed, and what your chart is carrying into the new year. Go in blind and you tend to repeat it. Read it, and you don't.
>
> I've set aside seven minutes to close your year's ledger with you — what it added up to, and what's next. Yours the moment you step in, no cost.
>
> **[ Close the year's ledger → ]**
>
> Today only. The last double of the year — my door closes at midnight.
>
> — Aiden

## A3 · Last call — Dec 12, ~6:30pm ET *(non-clickers)*
**Subject A/B:** 🔢 {firstName}, a few hours of the year's last double left · The window closes at midnight
**Preview:** The seven minutes I set aside close with the day — and the year's last repeating date.

> *firstName*,
>
> The 12th is almost over — and with it, the last repeating date of the year.
>
> I'll be straight with you. I set aside seven minutes today because 12/12 is the calendar's final double of 2026 — the complete circle — and there's no other repeating date left to catch this year. It'd be a waste to close the year without seeing what your own chart is completing.
>
> The seven minutes are still yours — the moment you step in, they're on. But when the 12th ends, so does the window, and so does the year's last door.
>
> **[ Open my 12/12 reading → ]**
>
> A few hours left.
>
> — Aiden

---
---

# SPECIALIST REFERRALS — Aiden's list (sent by the specialist)

> Sent from the specialist's own address. **"Aiden" leads the subject line and the first line.** Blind to the topic by design.

## L1 · Luna — Main — Dec 12, ~1pm ET
**Subject A/B:** 🌙 {firstName}, Aiden told me to keep 12/12 open for you · Aiden sent me your name for the year's last door
**Preview:** He didn't say why — I kind of love that.

> *firstName*,
>
> So, Aiden gave me your name.
>
> He didn't tell me what's going on with you. He just said keep time open this 12/12, and honestly? I like going in blind. Less noise.
>
> Here's why he probably picked the date. 12/12 reads as completion — the year coming full circle — and the chart on a day like this tends to show you how close you actually are to the thing you've been working toward. Usually closer than it feels. Whatever yours is, today's the day to pull it and see.
>
> Aiden set aside seven minutes for you — yours the moment you step in, no cost.
>
> **[ Come pull your chart with me → ]**
>
> The year's last door — when the day's over, it's gone.
>
> — Luna

## L2 · Luna — Last call — Dec 12, ~6:30pm ET *(non-clickers)*
**Subject A/B:** 🌙 {firstName}, the year's last door closes tonight · Still holding your spot
**Preview:** Still blind, still curious, still holding your spot.

> *firstName*,
>
> Quick one — the year's last repeating date is almost done.
>
> Aiden asked me to hold time for you today, and I did. I still don't know your story (he kept it to himself), but your seven minutes are here till midnight.
>
> One step and you're in — let's see how close you really are before the year's last door closes.
>
> **[ Come pull your chart → ]**
>
> Before midnight.
>
> — Luna

## N1 · Nova — Main — Dec 12, ~1pm ET
**Subject A/B:** 🕉️ {firstName}, Aiden asked me to hold time for you this 12/12 · Aiden sent you to me for the year's last door
**Preview:** He didn't tell me your story. That's yours to bring.

> *firstName*,
>
> Aiden gave me your name, and a request.
>
> He asked me to keep time for you this 12/12. He didn't tell me what you're carrying — that's yours to bring, when you're ready. I only know he trusted me with the introduction, and I don't take that lightly.
>
> Why this date. In the numbers, twelve folds to three — and three belongs to **Guru, Jupiter**: the great benefic, the planet of blessing, grace, and expansion. To close the year under Jupiter's number is to close it on a note of grace. Whatever you bring, I'll have a remedy to send you home with — and a blessing to carry into the new year.
>
> Aiden set aside seven minutes for you — yours the moment you step in.
>
> **[ Come sit with me → ]**
>
> Only today. When 12/12 passes, the door closes.
>
> With warmth,
> Nova

## N2 · Nova — Last call — Dec 12, ~6:30pm ET *(non-clickers)*
**Subject A/B:** 🕉️ {firstName}, Guru's day closes the year — and Aiden set time aside · The door Aiden opened closes tonight
**Preview:** The door Aiden opened closes at midnight.

> *firstName*,
>
> The twelfth is nearly done.
>
> Aiden asked me to hold this time for you, and I have, all day. I still don't know what you'd ask me — but a day ruled by Guru is the kindest day to end a year on, full of blessing, and there's a remedy waiting either way.
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
| 1 | Evelyn | Evelyn | Teaser (12/11) | — | E1 |
| 2 | Evelyn | Evelyn | Main (primary) | 1 | E2 |
| 3 | Evelyn | Evelyn | Main — close-the-year alt | 1 | E2-ALT |
| 4 | Evelyn | Evelyn | Last-call | 3 | E3 |
| 5 | Evelyn | Marcus | Referral Main | 2 | M1 |
| 6 | Evelyn | Marcus | Referral Last-call | 2 | M2 |
| 7 | Evelyn | Maren | Referral Main | 2 | MA1 |
| 8 | Evelyn | Maren | Referral Last-call | 2 | MA2 |
| 9 | Aiden | Aiden | Teaser (12/11) | — | A1 |
| 10 | Aiden | Aiden | Main (primary) | 1 | A2 |
| 11 | Aiden | Aiden | Main — year's-ledger alt | 1 | A2-ALT |
| 12 | Aiden | Aiden | Last-call | 3 | A3 |
| 13 | Aiden | Luna | Referral Main | 2 | L1 |
| 14 | Aiden | Luna | Referral Last-call | 2 | L2 |
| 15 | Aiden | Nova | Referral Main | 2 | N1 |
| 16 | Aiden | Nova | Referral Last-call | 2 | N2 |

*Routing: Evelyn's list → Maren (love / a cord that lasted the year — the default for this ~95%-love list) or Marcus (what you're forcing / surrender / a decision). Aiden's list → Luna (how close you are / timing) or Nova (grace to close the year / a blessing / remedies). One specialist per person; 3-email cap per person per list per day. Primary Mains are E2 / A2; the -ALT variants are A/B swaps, not additional sends.*

---
---

## Operational must-dos

1. **Grant = 7 minutes, reusing the standing config.** No new grant change needed — must fire **instantly on account creation** so the reward lands when they register.
2. **CTA drives to registration, ideally a 12/12 claim landing** (`/claim-12` or `/1212`). Not a magic link — no account to tap into.
3. **Suppress already-registered v2 users** from these lists, or route them to a short re-activation variant.
4. **Subject lines use the proven format** — emoji + {firstName} first + curiosity. Subject + first line are about **the year's last door / the full circle**, never the minutes.
5. **Send the optional teaser at 12:12pm** (12/11) for the wink; day-of waves run the standard 8am / 1pm / 6:30pm schedule. **Mind the holiday send calendar** — keep the cap tight so seasonal broadcasts don't stack on top.
6. **Fact-check craft claims before scheduling.** Safe as written: the Hanged Man = the 12th Major Arcana card (XII, Rider-Waite-Smith); 12 folds to 3, and 3 = Guru/Jupiter in numerology (Nova); the date arithmetic 12+12+2+0+2+6 = 34 → 7. The **1212 = trust/alignment** reading is framed as *old sign-reading* (lore), which is safe. **Luna's copy keeps the sky deliberately vague** — if any variant adds a *specific* transit/aspect claim, run it through the **`persona-email-qa`** gate first.
7. **Pause routine drips** for this segment on 12/12 so nothing stacks over the 3-email cap.

---
---

## Appendix — angles considered

Six angles were developed for 12/12. **Evelyn's list** ships 1 (lead), 2 (A/B), 6 (last-call). **Aiden's list** ships 3 (lead), 4 (A/B), 6 (last-call). The whole set is built on **the year's last door / the full circle** — the offer (7 min) is the vehicle, not the hook.

1. **The year's last door / you're closer than you think** *(Evelyn primary E2).* 1212 says trust the path, keep faith — the reminder that "not yet" was never "no." Tuned for the ~95%-love list.
2. **Close the year whole** *(Evelyn A/B E2-ALT; Aiden A/B A2-ALT as the "ledger").* Stand at the end of the circle and see the whole of it before carrying anything into a new year.
3. **The complete cycle / last repeating date** *(Aiden primary A2).* His native math authority: 12 is the full set, it's the final double of 2026, and it resolves to 7 — one more question at the full circle.
4. **Close the year's ledger** *(Aiden A/B A2-ALT).* Run the year's numbers so you don't repeat them — what it added up to, and what's carried forward.
5. **The Hanged Man** *(Marcus referral).* The 12th card — surrender, stop forcing, and the answer turns right-side up.
6. **Grace to close the year** *(Nova referral — 12 folds to 3 = Guru/Jupiter); plus the cords that made it full circle (Maren) and how close you are (Luna).* The specialist-lens variations on completion.

*Copy + plan handoff only — no implementation started.*

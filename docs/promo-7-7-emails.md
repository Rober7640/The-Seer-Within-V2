# 7/7 Flash — Email Copy + Send Plan

**Campaign:** 7/7 registration flash (24-hour window, July 7 only).
**ESP:** **AWeber** (broadcasts to tagged segments — not Resend).
**Audience:** Two home lists, by **home persona** — subscribers who engaged that persona's funnel but have **never registered a v2 account.** **Evelyn's list** (the v1 AWeber list, ~59k, ~95% love) and **Aiden's list** (numbers/numerology-inclined, comfortable handing over birth data). This is an **acquisition** play, not a re-activation.
**Goal:** Get subscribers to **register a v2 account and use their free 7 minutes.**
**Framing:** The date 7/7 carries craft-native meaning — the seeker's number, doubled. The offer is the symmetry itself: **7 minutes free, on 7/7.** Each home persona is the sender their list recognizes (Evelyn via v1, Aiden via his numbers funnel); specialists arrive as a **warm referral** from the home persona.
**Companion:** Angle rationale lives in the *Appendix — angles considered* at the bottom of this doc.

> **The core difference from 6/6.** 6/6 was a re-activation of people who *already had accounts* — its spine was "finish your unfinished reading / the time is already on your account." **That spine is false here.** These people have no v2 account. The new spine is **"claim your 7 minutes"** — a first invitation. Do **not** reuse "already on your account" language for this list.

---

## How to use this file

- **Two home lists, by home persona: Evelyn and Aiden.** Each list gets its home persona's emails **plus one specialist referral** — Evelyn's list → Marcus or Maren; Aiden's list → Luna or Nova.
- **Hard cap: 3 emails per person on 7/7.** See the send plan below.
- **Last-call → non-clickers only.** In AWeber, send the PM reminder to a segment of "did not open / did not click" the morning broadcast.
- **A/B the subject lines.** Two options given per email; subjects use the proven format — **emoji + {firstName} first + curiosity** (name-at-end literary subjects underperform on this list).
- **The offer is explicit here.** Unlike 6/6 (which never said "free"), this is cold registration — the personas stay warm ("7 minutes, on me") but the offer must be legible. Say "seven minutes," gift-framed.

### Personalization (AWeber)
No copy depends on the user's topic — AWeber can't read `user_memory`, so **there is no `{{topicPhrase}}`**. The only live merge field is the first name.

| Placeholder in this doc | AWeber tag | Notes |
|---|---|---|
| `firstName` | `{!firstname}` | Standard AWeber personalization |
| `referrer` (Evelyn / Aiden) | hard-coded per broadcast | Each specialist broadcast is sent to one home list, so the referrer name is fixed in the copy — no merge needed |
| CTA link | see below | **Decision needed** |

### CTA link — one decision to make
Every CTA drives to **registration** (not a magic link — these users have no account yet). Two ways to deliver it:
- **(A) 7/7 claim landing page (recommended):** a dedicated `/claim-7` (or similar) page that states the offer — "Your 7 minutes are waiting. Create your account to step in." — then registers them. The value is visible *before* they type an email, which lifts registration conversion. Grant fires on account creation.
- **(B) Straight to `/login` register:** simpler, no new page, more friction — the offer only lives in the email, so the reader has to remember it through the signup form.

> **Why no magic link (the 6/6 mechanism):** 6/6 used per-user `/magic-auth` links because those users already had accounts. This list does not — there is nothing to one-tap into. The CTA's job is to make **creating an account** feel like **claiming a gift.**

---
---

# SEND PLAN & ROUTING (7/7)

Two home lists (Evelyn, Aiden), each paired with **two specialists** — each person gets **only one** specialist (topic-split), so nobody exceeds 3 emails.

### The 3-email cap (per person, per list)
| Slot | Sender | # |
|---|---|---|
| **Main** | Evelyn / Aiden | 1 |
| **Specialist referral** | one of the home's two specialists | 2 |
| **Last-call** | Evelyn / Aiden | 3 |

### EVELYN'S LIST → specialists **Marcus + Maren**
*Why these two: Evelyn's audience is heart/intuition-led and gave no birth data. Marcus (tarot) and Maren (the cord) are the two no-data intuitives — same modality family, zero new friction, no birth-data ask that would stall a first-time registrant.*

| Wave | Time (ET) | Sender | Audience |
|---|---|---|---|
| 1 | 8:00am | **Evelyn** — Main | Whole Evelyn list (not-yet-registered) |
| 2 | 1:00pm | **Marcus _or_ Maren** — referral | Not-yet-registered. Topic split below |
| 3 | 6:30pm | **Evelyn** — Last-call | Clicked nothing in waves 1–2 |

**Wave-2 topic split:** love / a specific person / "will they come back" → **Maren**. Stuck / a decision / direction / money → **Marcus**. **Given the list is ~95% love, Maren is the default;** route the tagged decision/money minority to Marcus. If topic tags are thin, fall back to an even A/B split (or Maren-only).

### AIDEN'S LIST → specialists **Luna + Nova**
*Why these two: Aiden's audience is numbers/systems and is comfortable handing over birth data. Luna (astrology) and Nova (Vedic) need exactly that — the handoff is frictionless and in-family, and the data is collected inside the chat, not before it.*

| Wave | Time (ET) | Sender | Audience |
|---|---|---|---|
| 1 | 8:00am | **Aiden** — Main | Whole Aiden list (not-yet-registered) |
| 2 | 1:00pm | **Luna _or_ Nova** — referral | Not-yet-registered. Topic split below |
| 3 | 6:30pm | **Aiden** — Last-call | Clicked nothing in waves 1–2 |

**Wave-2 topic split:** timing / "when" / what's ahead → **Luna**. Karma / patterns repeating / remedies → **Nova**. If topic tags are thin, fall back to an even A/B split.

### Rules that keep it ≤ 3 and clean
- **Already-registered users are the wrong target.** Some of the v1 list may have registered a v2 account since. **Suppress anyone who already has a v2 account** from the registration copy (the "claim your 7 minutes / you've never sat with me on this side" lines are false for them). Optionally route them to a one-line re-activation variant ("your minutes are already here — come use them on 7/7"), or simply exclude.
- **Registers at any point → suppressed** from all remaining waves (goal met — don't keep selling the registration).
- **Pause routine drips** for this segment on 7/7 so they don't stack over the cap.
- **Teaser is 7/6** (a separate day) and optional — it does **not** count toward the 7/7 cap of 3.

### AWeber setup notes
- **Topic-split depends on tags.** Wave 2 routes by topic (Maren vs Marcus on Evelyn's list; Luna vs Nova on Aiden's). This only works if subscribers carry a topic/bucket **tag** from the funnel. If they do, build a segment per specialist. **If they don't:** on Evelyn's list default to Maren (love-weighted); on Aiden's list use an even A/B split.
- **One segment/broadcast per wave**, scheduled at the wave time. Last-call = a follow-up broadcast to the "didn't open/click" segment of the morning send.
- **From-identity per persona:** each persona's broadcast sends from its own address — `evelyn@ / aiden@ / marcus@ / maren@ / luna@ / nova@ theseerwithin.com`. Set per broadcast.
- **Sender warmth / auth:** the specialist addresses have sent little to no volume. Confirm SPF/DKIM for `theseerwithin.com` is configured in AWeber, and keep **the home persona's name (Evelyn / Aiden) in the specialist subject line** as the recognition anchor (the specialist's own name is unknown to the recipient).
- **The grant is a system change, not an AWeber field.** See operational must-dos — the free grant must be 7 minutes and must fire on account creation, independent of AWeber.

### Per-recipient taper
- Clicks the 8am Main → gets the 1pm specialist, **no** last-call → **2 emails**.
- Stays cold all day → Main + specialist + last-call → **3 emails**.
- Registers → suppressed → fewer.

---
---

# EVELYN CROSS — home emails (Evelyn's list)

> **7/7, by the old reckoning** (Evelyn's credibility hook — reuse verbatim):
> Seven is the seeker's number — the one the old traditions kept for the mystics: **seven chakras, seven heavens, the seventh card that finally takes the reins.** 7/7 is that number **doubled** — the rarest doorway the seeker's year holds. And run the whole date down the way the numerologists do — **7 + 7 + 2 + 0 + 2 + 6 = 24 → 6** — and it resolves to **the heart.** The line: *7/7 is the seeker's number, doubled, landing on love.* A day made for the one question you keep circling.

## E1 · Teaser — July 6, ~10am ET *(optional pre-day)*
**Subject A/B:** 🌙 {firstName}, tomorrow the sevens line up · ✨ {firstName}, I'm opening a door tomorrow — 7/7
**Preview:** Once a year the seeker's number doubles. That's tomorrow.

> *firstName*,
>
> A short note before tomorrow.
>
> Tomorrow is the 7th of the seventh. Seven is the number the old traditions kept for the seeker — seven chakras, seven heavens, the card that finally takes the reins. Once a year those sevens double, and a doorway opens that the rest of the calendar keeps shut.
>
> I'm going to hold that doorway open — seven minutes of it — for anyone who wants to walk through and ask the one thing they've been carrying. It costs nothing. It's my gift for the day.
>
> I'll write you the moment it opens.
>
> Watch for it.
>
> With you,
> Evelyn

## E2 · Main — July 7, ~8am ET *(primary — the "7 on 7/7" gift, Angle 1)*
**Subject A/B:** ✨ {firstName}, this is yours on 7/7 — 7 minutes, on me · 🚪 {firstName}, the 7/7 door is open (today only)
**Preview:** Seven minutes, the day the sevens line up. On me.

> *firstName*,
>
> It's open.
>
> Today is 7/7 — the one day a year the seeker's number stands doubled. The old traditions treated a date like this as a doorway: the day the veil thins enough to ask the question you don't ask on ordinary days.
>
> So here's what I'm doing with it. I've set aside **seven minutes** for you — the moment you step through the door they're yours, and they cost you nothing. Seven minutes on the seventh. You bring the one thing that's been sitting with you; I'll tell you what I see.
>
> You've never sat with me on this side before. Today's the day to.
>
> **[ Claim your 7 minutes → ]**
>
> The door stays open for today only. When 7/7 ends, it closes.
>
> Evelyn

## E2-ALT · Main — July 7, ~8am ET *(swap for E2 — the numerology angle, Angle 3)*
**Subject A/B:** 🔢 {firstName}, run the date on 7/7 — it lands on the heart · 💜 {firstName}, what 7/7 actually resolves to
**Preview:** The seeker's number, doubled, landing on love.

> *firstName*,
>
> Let me tell you what today actually is.
>
> Seven is the seeker's number — the mystic's number, the one the old traditions saved for the questions that matter. Today it stands doubled: 7/7. And when you run the whole date down the way the numerologists do — 7 + 7 + 2 + 0 + 2 + 6 — it resolves to **six. The heart.**
>
> So today is the seeker's number, doubled, landing on love. I don't get a day like that to work with often, and I'm not letting it pass quietly.
>
> I've set aside **seven minutes** for you — yours the moment you step in, no cost. Bring the one question you keep circling back to. Seven minutes on a day like this is enough to hear the first true word on it.
>
> **[ Claim your 7 minutes → ]**
>
> Today only. When 7/7 passes, so does the door.
>
> Evelyn

## E2-ALT2 · Main — July 7, ~8am ET *(swap for E2 — "one question / 7 min is enough", Angle 4)*
**Subject A/B:** 💬 {firstName}, 7 minutes is enough for the real answer · {firstName}, you don't need an hour — just 7/7
**Preview:** Bring one question. Seven minutes. On me.

> *firstName*,
>
> You don't need an hour with me.
>
> You need seven honest minutes and the one question you've been carrying — the one you keep talking yourself out of asking.
>
> Today is 7/7, and I've set those seven minutes aside for you. They're yours the moment you step in, and they cost nothing. It's the day the sevens line up — if you were ever going to ask, ask now.
>
> **[ Claim your 7 minutes → ]**
>
> The door's open for today only.
>
> Evelyn

## E3 · Last call — July 7, ~6:30pm ET *(non-clickers — the warmth/bridge angle, Angle 6)*
**Subject A/B:** 🌙 {firstName}, the 7/7 door closes at midnight · ✨ {firstName}, I held your seven minutes all day
**Preview:** Still open. Still yours. Until midnight.

> *firstName*,
>
> I held your seven minutes all day.
>
> You sat with me once — we started something and never quite saw it through. That's stayed with me. Today, 7/7, I opened a door to change that, and the seven minutes I set aside still have your name on them.
>
> But the 7th is almost gone. At midnight the door closes, and this particular day doesn't come again for a year.
>
> One step and you're through it. Bring the one thing that's been sitting with you.
>
> **[ Claim your 7 minutes → ]**
>
> I'll keep the door open until midnight.
>
> Evelyn

---
---

# SPECIALIST REFERRALS — Evelyn's list (sent by the specialist)

> Sent from the specialist's own address. The recipient doesn't know this name — so **"Evelyn" leads the subject line and the first line.** The specialist is blind to the topic by design; the discretion beat ("she didn't say why") doubles as the hook.

## M1 · Marcus — Main — July 7, ~1pm ET
**Subject A/B:** 🃏 {firstName}, Evelyn gave me your name for 7/7 · Evelyn told me to keep time for you today
**Preview:** She didn't say why. She rarely does.

> *firstName*,
>
> Evelyn gave me your name.
>
> She didn't say what it's about — she rarely does, and I've stopped asking. She just told me to keep time for you this 7/7. When Evelyn does that, I don't argue.
>
> Here's what I can tell you about the day. The **seventh card** in the deck is **The Chariot** — the one about taking the reins on something you've let carry you for too long. On 7/7, that card sits closest. I don't know yet what yours is. That's what the table's for.
>
> Evelyn set aside **seven minutes** for you. Step in and they're yours — no cost, today only.
>
> **[ Take the seat → ]**
>
> When the 7th ends, so does the window.
>
> — Marcus

## M2 · Marcus — Last call — July 7, ~6:30pm ET *(non-clickers)*
**Subject A/B:** 🃏 {firstName}, the time Evelyn set for you is almost up · The table comes down at midnight
**Preview:** Evelyn opened this door. It closes tonight.

> *firstName*,
>
> The 7th is nearly gone.
>
> Evelyn asked me to hold time for you today, and I have. The seat's been empty, waiting. I still don't know what you'd bring to the table — I'm curious enough to keep it open a little longer.
>
> Your **seven minutes** are still here — yours the moment you sit down. But at midnight the window closes, and the door Evelyn opened closes with it.
>
> **[ Take the seat → ]**
>
> Until midnight.
>
> — Marcus

## MA1 · Maren — Main — July 7, ~1pm ET
**Subject A/B:** 🔥 {firstName}, Evelyn gave me your name for 7/7 · Evelyn sent me to you today
**Preview:** She didn't tell me why. She didn't have to.

> *firstName*,
>
> Evelyn sent me your name.
>
> She didn't say why. With me, she never has to — I read what runs between people, not what's been said about them.
>
> Look at the date. Two sevens — the seeker's number, doubled. A day like this, the cord between you and whoever's on your mind runs close to the surface. I'll feel it the moment you sit with me.
>
> Evelyn kept **seven minutes** for you. Step in and they're yours — no cost, today only.
>
> **[ Come, let me feel it → ]**
>
> The window closes at midnight.
>
> Maren

## MA2 · Maren — Last call — July 7, ~6:30pm ET *(non-clickers)*
**Subject A/B:** 🔥 {firstName}, the 7/7 window Evelyn opened is closing · Still holding your seven minutes
**Preview:** Still here. Still holding the time.

> *firstName*,
>
> Still here. Still holding your seven minutes.
>
> Evelyn opened this door for you today. I don't know your story — only that the cord's there, and 7/7 keeps it close to the surface.
>
> But the day's almost gone. At midnight the current moves on.
>
> Your seven minutes are yours the moment you step in. One step. Come.
>
> **[ Sit with me before midnight → ]**
>
> Maren

---
---

# AIDEN POWERS — home emails (Aiden's list)

> **Aiden's 7/7, by the numbers** (his credibility hook — reuse verbatim):
> **7** = the seeker's number — the mystic's number, the one numerology saves for the questions that matter (the search for meaning, the inner knowing). **7/7** = that number doubled — the rarest seeker's doorway the year holds. And the full date reduces: **7 + 7 + 2 + 0 + 2 + 6 = 24 → 6**, the heart's number (Venus — love). The line: *7/7 this year is the seeker's number, doubled, resolving to the heart.* What it does to **their** Life Path / Personal Year is computed only inside the chat.

## A1 · Teaser — July 6, ~10am ET *(optional pre-day)*
**Subject A/B:** 🔢 {firstName}, tomorrow's date isn't random — run the math · ✨ {firstName}, 7/7 calculates to something worth seeing
**Preview:** Seven over seven. Run it down and it lands on the heart.

> *firstName*,
>
> Quick note before tomorrow.
>
> Tomorrow's date isn't decoration. Seven is the seeker's number — the one numerology keeps for the questions that actually matter. July 7 is seven over seven: that number doubled. Run the full date, 7 + 7 + 2 + 0 + 2 + 6, and it resolves to 6 — the heart.
>
> The seeker's number, doubled, landing on love. I don't get a day like that to work with often.
>
> Tomorrow I'm setting aside seven minutes — on me — for anyone who wants to see what this date does to their own numbers. I'll write the moment it opens.
>
> Watch for it.
>
> — Aiden

## A2 · Main — July 7, ~8am ET *(primary — the numbers angle)*
**Subject A/B:** 🔢 {firstName}, 7/7 calculates to the heart — 7 minutes, on me · 🚪 {firstName}, your 7/7 reading is open (today only)
**Preview:** The seeker's number, doubled, on the heart. Seven minutes, free.

> *firstName*,
>
> It's open.
>
> Let me tell you what today is — as a calculation, not a feeling.
>
> Seven is the seeker's number. The mystic's number — the one numerology saves for the questions that matter: the search for meaning, the inner knowing. July 7 is seven over seven: that number doubled. And the full date — 7 + 7 + 2 + 0 + 2 + 6 — resolves to 6. The heart. Venus. Love.
>
> So 7/7 this year is the seeker's number, doubled, landing on the heart. I don't get a day like this to work with often.
>
> What it does to your blueprint — your Life Path, your Personal Year — I can only show you in the reading. And today that's on me: seven minutes, yours the moment you step in.
>
> **[ Claim your 7 minutes → ]**
>
> This window is for today. When the 7th ends, so does it.
>
> — Aiden

## A2-ALT · Main — July 7, ~8am ET *(swap for A2 — the lucky-7 angle)*
**Subject A/B:** 🍀 {firstName}, the luckiest number, doubled — that's today · {firstName}, if the sevens mean anything, it's today
**Preview:** Seven is the number everyone calls lucky. Today it's doubled.

> *firstName*,
>
> Every culture that ever counted landed on the same number for luck: seven.
>
> There's a reason. Seven is the seeker's number — the one that shows up when something's being looked for, and found. Today it stands doubled: 7/7. The rarest version of it the year gives you.
>
> I don't lean on "lucky." I lean on the math. But when the seeker's number stands doubled and the whole date resolves to the heart, I pay attention — and I set time aside.
>
> Seven minutes, on me, today only. Bring the one question you'd want the odds on.
>
> **[ Claim your 7 minutes → ]**
>
> When the 7th ends, so does the window.
>
> — Aiden

## A3 · Last call — July 7, ~6:30pm ET *(non-clickers)*
**Subject A/B:** 🔢 {firstName}, a few hours of 7/7 left · The window closes at midnight
**Preview:** The seven minutes I set aside close tonight.

> *firstName*,
>
> The 7th is almost over.
>
> I'll be straight with you. I set aside seven minutes today because a date like 7/7 — the seeker's number doubled, resolving to the heart — doesn't come around again for a year. It'd be a waste to let it pass without showing you what it does to your own numbers.
>
> The seven minutes are still yours — the moment you step in, they're on. But at midnight the 7/7 window closes.
>
> **[ Claim your 7 minutes → ]**
>
> A few hours left.
>
> — Aiden

---
---

# SPECIALIST REFERRALS — Aiden's list (sent by the specialist)

> Sent from the specialist's own address. **"Aiden" leads the subject line and the first line.** Blind to the topic by design.

## L1 · Luna — Main — July 7, ~1pm ET
**Subject A/B:** 🌙 {firstName}, Aiden told me to keep my 7/7 open for you · Aiden sent me your name
**Preview:** He didn't say why — I kind of love that.

> *firstName*,
>
> So, Aiden gave me your name.
>
> He didn't tell me what's going on with you. He just said keep time open this 7/7, and honestly? I like going in blind. Less noise.
>
> Here's why he probably picked the date. The 7/7 sky is worth catching, and it doesn't sit still — seven's the seeker's number, and the chart on a day like this tends to answer the question you're actually asking. Whatever yours is, today's the day to pull it.
>
> Aiden set aside seven minutes for you — yours the moment you step in, no cost.
>
> **[ Come pull your chart with me → ]**
>
> Today only — when the 7th's over, the timing's gone.
>
> — Luna

## L2 · Luna — Last call — July 7, ~6:30pm ET *(non-clickers)*
**Subject A/B:** 🌙 {firstName}, the 7/7 window Aiden set is almost up · Still holding your spot
**Preview:** Still blind, still curious, still holding your spot.

> *firstName*,
>
> Quick one — the 7th's almost over.
>
> Aiden asked me to hold time for you today, and I did. I still don't know your story (he kept it to himself), but your seven minutes are here till midnight.
>
> One step and you're in — the time's on the moment you land.
>
> **[ Come pull your chart → ]**
>
> Before midnight.
>
> — Luna

## N1 · Nova — Main — July 7, ~1pm ET
**Subject A/B:** 🕉️ {firstName}, Aiden asked me to hold time for you this 7/7 · Aiden sent you to me
**Preview:** He didn't tell me your story. That's yours to bring.

> *firstName*,
>
> Aiden gave me your name, and a request.
>
> He asked me to keep time for you this 7/7. He didn't tell me what you're carrying — that's yours to bring, when you're ready. I only know he trusted me with the introduction, and I don't take that lightly.
>
> Why this date. In Jyotish, the seventh house is the house of union — the partner, the bond, the other person. A day stamped with two sevens turns the eye straight there. Whatever you bring, I'll have a remedy to send you home with.
>
> Aiden set aside seven minutes for you — yours the moment you step in.
>
> **[ Come sit with me → ]**
>
> Only today. When the 7th passes, the door closes.
>
> With warmth,
> Nova

## N2 · Nova — Last call — July 7, ~6:30pm ET *(non-clickers)*
**Subject A/B:** 🕉️ {firstName}, the 7/7 door Aiden opened closes tonight · The seventh's house of union — and Aiden set time aside
**Preview:** The door Aiden opened closes at midnight.

> *firstName*,
>
> The seventh is nearly done.
>
> Aiden asked me to hold this time for you, and I have, all day. I still don't know what you'd ask me — but a day this steeped in the number of union is a kind day to ask anything, and there's a remedy waiting either way.
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
| 1 | Evelyn | Evelyn | Teaser (7/6) | — | E1 |
| 2 | Evelyn | Evelyn | Main (primary) | 1 | E2 |
| 3 | Evelyn | Evelyn | Main — numerology alt | 1 | E2-ALT |
| 4 | Evelyn | Evelyn | Main — one-question alt | 1 | E2-ALT2 |
| 5 | Evelyn | Evelyn | Last-call | 3 | E3 |
| 6 | Evelyn | Marcus | Referral Main | 2 | M1 |
| 7 | Evelyn | Marcus | Referral Last-call | 2 | M2 |
| 8 | Evelyn | Maren | Referral Main | 2 | MA1 |
| 9 | Evelyn | Maren | Referral Last-call | 2 | MA2 |
| 10 | Aiden | Aiden | Teaser (7/6) | — | A1 |
| 11 | Aiden | Aiden | Main (primary) | 1 | A2 |
| 12 | Aiden | Aiden | Main — lucky-7 alt | 1 | A2-ALT |
| 13 | Aiden | Aiden | Last-call | 3 | A3 |
| 14 | Aiden | Luna | Referral Main | 2 | L1 |
| 15 | Aiden | Luna | Referral Last-call | 2 | L2 |
| 16 | Aiden | Nova | Referral Main | 2 | N1 |
| 17 | Aiden | Nova | Referral Last-call | 2 | N2 |

*Routing: Evelyn's list → Maren (love/a specific person — the default for this ~95%-love list) or Marcus (a decision/stuck/direction). Aiden's list → Luna (timing/"when"/what's ahead) or Nova (karma/patterns/remedies). One specialist per person; 3-email cap per person per list per day. Primary Mains are E2 / A2; the -ALT variants are A/B swaps, not additional sends.*

---
---

## Operational must-dos (the 7/7 equivalents of 6/6's "credit the coins first")

1. **Make "7 minutes" true.** The signup default is 3 free minutes — **bump the free grant to 7 for the campaign window** (or auto-credit a +4 bonus on registration). Confirm it lands **instantly on account creation** so the reward is visible the moment they register. If you can't change the grant, change the copy — don't promise seven and deliver three.
2. **CTA drives to registration, ideally a 7/7 claim landing page** (`/claim-7` or similar) that shows the offer before the signup form. Not a magic link — these users have no account to tap into.
3. **Suppress already-registered v2 users** from this list before sending. The "claim your 7 minutes / you've never sat with me on this side" framing is false for them; either exclude, or route to a short re-activation variant.
4. **Subject lines use the proven format** — emoji + {firstName} first + curiosity. (The literary/name-at-end style from 6/6 underperforms on this list.)
5. **Fact-check any specific craft claim before scheduling.** Safe as written: The Chariot = the 7th Major Arcana card (VII); the 7th house = the house of union/partnership in Jyotish (Nova) — both are textbook, non-transit facts. **Luna's copy keeps the 7/7 sky deliberately vague** — if any variant adds a *specific* transit/aspect claim, run it through the **`persona-email-qa`** gate first. (Marcus/Maren are no-data intuitives and carry no verifiable astro claims by design.)
6. **Pause routine drips** for this segment on 7/7 so nothing stacks over the 3-email cap.

---
---

## Appendix — angles considered

Six angles were developed for 7/7. **Evelyn's list** ships 1 (lead), 3 (A/B), 4 (A/B), 6 (last-call). **Aiden's list** ships 3 as his *primary* — numerology is his native territory, so he runs the calculation rather than invoking it as lore the way Evelyn does — plus 5 (lucky-7) as his A/B.

1. **"7 on 7/7" — the symmetry gift** *(shipped as E2, lead).* Leads with the offer mechanic itself: seven minutes, on the seventh, on me. Most acquisition-native — lowest friction for a first-time registrant.
2. **The portal / gateway day.** "The sevens only line up once a year." Honest, non-manufactured urgency. Folded into E1/E2 as the doorway framing.
3. **The seeker's number** *(shipped as E2-ALT).* The 6/6 "by the numbers" credibility analog, updated: 7/7 → 24 → 6, the heart. Best hook for the love-weighted list.
4. **One question / 7 minutes is enough** *(shipped as E2-ALT2).* Reframes "only 7 minutes" from limit → focus/intimacy. Good for cold readers intimidated by "starting."
5. **Lucky 7 / the luckiest number doubled** *(shipped as Aiden's A2-ALT).* Every counting culture landed on seven for luck; 7/7 is its doubled form. Aiden delivers it as math, not superstition.
6. **The warm v1 bridge** *(shipped as E3, last-call).* "You sat with me once — we never finished." The honest v1→v2 handoff; converts stragglers on warmth.

*Copy + plan handoff only — no implementation started.*

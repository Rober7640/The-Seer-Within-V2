# 11/11 Flash — Email Copy + Send Plan

**Campaign:** 11/11 registration flash (24-hour window, November 11 only) — the year's biggest manifestation date (the "11:11 portal").
**ESP:** **AWeber** (broadcasts to tagged segments — not Resend).
**Audience:** Two home lists, by **home persona** — subscribers who engaged that persona's funnel but have **never registered a v2 account.** **Evelyn's list** (the v1 AWeber list, ~59k, ~95% love) and **Aiden's list** (numbers/numerology-inclined, comfortable handing over birth data). This is an **acquisition** play, not a re-activation.
**Goal:** Get subscribers to **register a v2 account and use their free 7 minutes.**
**Offer:** **7 free minutes** (reuses the 7/7 grant — no new grant config). See the creative note below.
**Framing:** 11/11 is the single most-recognized portal on the spiritual calendar — the day the whole practice agrees the door opens at **11:11** and you *name what you want.* Each home persona is the sender their list recognizes (Evelyn via v1, Aiden via his numbers funnel); specialists arrive as a **warm referral** from the home persona.
**Sibling docs:** `docs/promo-6-6-emails.md`, `docs/promo-7-7-emails.md`.

> **Creative note — the offer is NOT the hook here.** On 7/7, "7 minutes on 7/7" *was* the hook (perfect symmetry). On 11/11 the numbers don't line up (7 ≠ 11), so **do not lead with the minutes.** Lead with the **11:11 portal / make-your-wish** moment; the seven minutes are the vehicle that gets them through the door. Keep the offer legible ("seven minutes, on me") but subordinate to the wish.

> **The core difference from 6/6 (same as 7/7).** These people have no v2 account, so 6/6's "finish your unfinished reading / already on your account" spine is **false.** The spine is **"claim your minutes / make your wish"** — a first invitation. Do not reuse "already on your account" for this list.

---

## How to use this file

- **Two home lists, by home persona: Evelyn and Aiden.** Each list gets its home persona's emails **plus one specialist referral** — Evelyn's list → Marcus or Maren; Aiden's list → Luna or Nova.
- **Hard cap: 3 emails per person on 11/11.** See the send plan below.
- **Last-call → non-clickers only,** and it's timed to hug the **second 11:11** (the PM portal).
- **A/B the subject lines.** Two options given per email; subjects use the proven format — **emoji + {firstName} first + curiosity.**
- **Offer legible, hook first.** Say "seven minutes," but the subject and first line are about **11:11 / the wish**, never the minutes.

### Personalization (AWeber)
No copy depends on the user's topic — AWeber can't read `user_memory`, so **there is no `{{topicPhrase}}`**. The only live merge field is the first name.

| Placeholder in this doc | AWeber tag | Notes |
|---|---|---|
| `firstName` | `{!firstname}` | Standard AWeber personalization |
| `referrer` (Evelyn / Aiden) | hard-coded per broadcast | Each specialist broadcast is sent to one home list, so the referrer name is fixed in the copy — no merge needed |
| CTA link | see below | **Decision needed** |

### CTA link — one decision to make
Every CTA drives to **registration** (not a magic link — these users have no account yet). Two ways:
- **(A) 11/11 claim landing page (recommended):** a dedicated `/claim-11` (or `/1111`) page that frames the moment — "The 11:11 door is open. Create your account and make your wish." — then registers them. Value visible before they type an email; grant fires on account creation.
- **(B) Straight to `/login` register:** simpler, more friction — the offer only lives in the email.

---
---

# SEND PLAN & ROUTING (11/11)

Two home lists (Evelyn, Aiden), each paired with **two specialists** — each person gets **only one** specialist (topic-split), so nobody exceeds 3 emails.

### The 3-email cap (per person, per list)
| Slot | Sender | # |
|---|---|---|
| **Main** | Evelyn / Aiden | 1 |
| **Specialist referral** | one of the home's two specialists | 2 |
| **Last-call** | Evelyn / Aiden | 3 |

### Why these wave times — hug the two 11:11 moments
11/11 has **two** 11:11s (AM and PM). The flash is timed so the **Main lands just before 11:11 AM** and the **Last-call lands just before 11:11 PM** — so "the clock's about to hit 11:11, come now" is literally true.

> **Timezone note:** times below are **ET**. The 11:11 portal is symbolic/collective (the practice treats "11/11 is open," not "your local 11:11"), so exact per-recipient clock alignment isn't required. Anchoring to ET simply makes the "about to hit 11:11" beat land for the largest US segment. Don't over-engineer per-timezone sends for a single-day flash.

### EVELYN'S LIST → specialists **Marcus + Maren**
*Why these two: Evelyn's audience is heart/intuition-led and gave no birth data. Marcus (tarot) and Maren (the cord) are the two no-data intuitives — same modality family, zero new friction, no birth-data ask to stall a first-time registrant.*

| Wave | Time (ET) | Sender | Audience |
|---|---|---|---|
| 1 | ~10:50am | **Evelyn** — Main | Whole Evelyn list (not-yet-registered) — lands before the **11:11 AM** portal |
| 2 | ~2:00pm | **Marcus _or_ Maren** — referral | Not-yet-registered. Topic split below |
| 3 | ~10:45pm | **Evelyn** — Last-call | Clicked nothing in waves 1–2 — lands before the **11:11 PM** portal |

**Wave-2 topic split:** love / a specific person / "the one who mirrors me" → **Maren**. A truth / a decision / what's owed → **Marcus**. **Given the list is ~95% love, Maren is the default;** route the tagged decision minority to Marcus. If tags are thin, fall back to an even A/B split (or Maren-only).

### AIDEN'S LIST → specialists **Luna + Nova**
*Why these two: Aiden's audience is numbers/systems and is comfortable handing over birth data. Luna (astrology) and Nova (Vedic) need exactly that — the handoff is frictionless and in-family, and the data is collected inside the chat, not before it.*

| Wave | Time (ET) | Sender | Audience |
|---|---|---|---|
| 1 | ~10:50am | **Aiden** — Main | Whole Aiden list (not-yet-registered) — lands before the **11:11 AM** portal |
| 2 | ~2:00pm | **Luna _or_ Nova** — referral | Not-yet-registered. Topic split below |
| 3 | ~10:45pm | **Aiden** — Last-call | Clicked nothing in waves 1–2 — lands before the **11:11 PM** portal |

**Wave-2 topic split:** timing / "when" / setting an intention → **Luna**. Gains / a hope or wish / remedies → **Nova**. If tags are thin, fall back to an even A/B split.

### Rules that keep it ≤ 3 and clean
- **Already-registered users are the wrong target.** Some of these lists may have registered a v2 account since. **Suppress anyone who already has a v2 account** from the registration copy, or route them to a short re-activation variant ("your minutes are already here — make your 11:11 wish with them").
- **Registers at any point → suppressed** from all remaining waves (goal met).
- **Pause routine drips** for this segment on 11/11 so nothing stacks over the cap.
- **Teaser is 11/10** (a separate day, sent at 11:11am for the wink) and optional — it does **not** count toward the 11/11 cap of 3.

### AWeber setup notes
- **Topic-split depends on tags.** Wave 2 routes by topic (Maren vs Marcus on Evelyn's list; Luna vs Nova on Aiden's). Works only if subscribers carry a topic/bucket **tag** from the funnel. If they do, build a segment per specialist. **If they don't:** on Evelyn's list default to Maren (love-weighted); on Aiden's list use an even A/B split.
- **One segment/broadcast per wave**, scheduled at the wave time. Last-call = a follow-up broadcast to the "didn't open/click" segment of the morning send.
- **From-identity per persona:** each persona's broadcast sends from its own address — `evelyn@ / aiden@ / marcus@ / maren@ / luna@ / nova@ theseerwithin.com`. Set per broadcast.
- **Sender warmth / auth:** the specialist addresses have sent little to no volume. Confirm SPF/DKIM for `theseerwithin.com` is configured in AWeber, and keep **the home persona's name (Evelyn / Aiden) in the specialist subject line** as the recognition anchor.

### Per-recipient taper
- Clicks the AM Main → gets the 2pm specialist, **no** last-call → **2 emails**.
- Stays cold all day → Main + specialist + last-call → **3 emails**.
- Registers → suppressed → fewer.

---
---

# EVELYN CROSS — home emails (Evelyn's list)

> **11/11, the doorway** (Evelyn's hook — reuse verbatim):
> Eleven is the master number — the one the old traditions tie to intuition, to the knowing that arrives before the reasons do. **11/11 stands it twice**, and at **11:11** the year opens the door everyone half-remembers: the minute you glance up, the clock reads mirror-perfect, and something in you goes quiet. It's the one moment the whole practice agrees on — the moment you **name what you want.** The line: *11:11 is the year's open door, and it asks one thing of you — say what you want, out loud.*

## E1 · Teaser — Nov 10, ~11:11am ET *(optional pre-day — sent at 11:11 on purpose)*
**Subject A/B:** 🌙 {firstName}, tomorrow is 11:11 — the door of the year · ✨ {firstName}, you've caught 11:11 before. Tomorrow it's the date.
**Preview:** The one day the door everyone waits for actually opens.

> *firstName*,
>
> A note before tomorrow — and yes, I sent it at 11:11 on purpose.
>
> How many times have you glanced up and the clock read 11:11, and something in you paused? Tomorrow that isn't a glance. It's the date. 11/11 — the master number, doubled — and at 11:11 the door the old traditions wait all year for stands open.
>
> A door like that asks one thing: that you name what you want. Tomorrow I'm holding time to help you name it — and ask for it properly. It costs nothing. It's what the day is for.
>
> I'll write you the moment it opens. Be near your phone at 11:11.
>
> With you,
> Evelyn

## E2 · Main — Nov 11, ~10:50am ET *(primary — recognition → wish)*
**Subject A/B:** ✨ {firstName}, the clock's about to hit 11:11 — come make the wish · 🚪 {firstName}, the door of the year is open (11:11 today)
**Preview:** In minutes it's 11:11. Name what you want — I'll help you ask.

> *firstName*,
>
> It's almost here.
>
> In a few minutes the clock hits 11:11 — and today, of all days, it's the date too. 11/11. The old traditions call this the open door of the year: the one moment the veil thins enough that what you name, you set in motion.
>
> Most people waste it on a silent wish they've forgotten by noon. I don't want that for you. Come sit with me while the door's open, and let's name the thing you actually want — the one you've stopped letting yourself say. I'll help you ask for it properly.
>
> I've set aside seven minutes for you. The moment you step in, they're yours — no cost.
>
> **[ Make your wish with me → ]**
>
> The door's widest at 11:11, and it closes with the day. Come now.
>
> Evelyn

## E2-ALT · Main — Nov 11, ~10:50am ET *(swap for E2 — the mirror hour)*
**Subject A/B:** 💞 {firstName}, 11:11 is the mirror hour — and it's today · {firstName}, the hour that points to the one who mirrors you
**Preview:** Two ones, facing two ones. The old name for it is the mirror hour.

> *firstName*,
>
> Look at it: 11:11. Two ones, facing two ones — a perfect mirror. The old readers had a name for this hour. They called it the **mirror hour**, and they tied it to one thing: the person who mirrors you. The one you recognize before you can explain why.
>
> Today that hour is also the date. 11/11. If there's someone your mind keeps returning to — or someone you haven't met yet but can feel the shape of — this is the day the mirror is clearest.
>
> Come sit with me while it's open. I've set aside seven minutes; the moment you step in they're yours, no cost. Bring the name, or just the feeling. I'll tell you what I see in the reflection.
>
> **[ Look into the mirror hour with me → ]**
>
> The door closes with the day.
>
> Evelyn

## E3 · Last call — Nov 11, ~10:45pm ET *(non-clickers — warmth + the last portal tonight)*
**Subject A/B:** 🌙 {firstName}, the second 11:11 is minutes away — the last of the year · ✨ {firstName}, I held your seven minutes all day
**Preview:** The door opens once more tonight at 11:11, then not again this year.

> *firstName*,
>
> The door opens one last time tonight — at 11:11 — and then not again this year.
>
> You sat with me once; we started something and never quite finished it. I've thought about that. Today I held the door open for you, and the seven minutes I set aside still have your name on them.
>
> There's a second 11:11 minutes from now. It's the last one 11/11 gives. Come make the wish before it closes — name the thing, and let me help you ask.
>
> **[ Make your wish before midnight → ]**
>
> I'll keep the door open until the day ends.
>
> Evelyn

---
---

# SPECIALIST REFERRALS — Evelyn's list (sent by the specialist)

> Sent from the specialist's own address. **"Evelyn" leads the subject line and the first line.** Blind to the topic by design; the discretion beat ("she didn't say why") doubles as the hook.

## M1 · Marcus — Main — Nov 11, ~2pm ET
**Subject A/B:** 🃏 {firstName}, Evelyn gave me your name for 11:11 · Evelyn told me to keep time for you today
**Preview:** She didn't say why. She rarely does.

> *firstName*,
>
> Evelyn gave me your name.
>
> She didn't say what it's about — she rarely does, and I've stopped asking. She just told me to keep time for you this 11/11. When Evelyn does that, I don't argue.
>
> Here's what I can tell you about the day. The **eleventh card** in the deck is **Justice** — the card of the truth of a thing, and the setting-right of it. What's owed comes due; what's been unclear gets weighed in the open. On 11:11, that card sits closest. I don't know yet what yours is. That's what the table's for.
>
> Evelyn set aside seven minutes for you. Step in and they're yours — no cost, today only.
>
> **[ Take the seat → ]**
>
> When the 11th ends, so does the window.
>
> — Marcus

## M2 · Marcus — Last call — Nov 11, ~10:45pm ET *(non-clickers)*
**Subject A/B:** 🃏 {firstName}, the time Evelyn set for you is almost up · The table comes down at midnight
**Preview:** Evelyn opened this door. It closes tonight.

> *firstName*,
>
> The 11th is nearly gone.
>
> Evelyn asked me to hold time for you today, and I have. The seat's been empty, waiting. I still don't know what you'd bring to the table — but Justice is a patient card, and I'm curious enough to keep it open a little longer.
>
> Your seven minutes are still here — yours the moment you sit down. But at midnight the window closes, and the door Evelyn opened closes with it.
>
> **[ Take the seat → ]**
>
> Until midnight.
>
> — Marcus

## MA1 · Maren — Main — Nov 11, ~2pm ET
**Subject A/B:** 🔥 {firstName}, Evelyn gave me your name for the mirror hour · Evelyn sent me to you for 11:11
**Preview:** She didn't tell me why. She didn't have to.

> *firstName*,
>
> Evelyn sent me your name.
>
> She didn't say why. With me, she never has to — I read what runs between people, not what's been said about them.
>
> Look at the hour. 11:11 — two ones facing two ones, a perfect mirror. It's the hour the old readers tied to the one who mirrors you, and on 11/11 it stands doubled. A day like this, the cord between you and whoever's on your mind practically hums. I'll feel it the moment you sit with me.
>
> Evelyn kept seven minutes for you. Step in and they're yours — no cost, today only.
>
> **[ Come, let me feel it → ]**
>
> The window closes at midnight.
>
> Maren

## MA2 · Maren — Last call — Nov 11, ~10:45pm ET *(non-clickers)*
**Subject A/B:** 🔥 {firstName}, the mirror hour comes once more tonight · Still holding your seven minutes
**Preview:** Still here. Still holding the time.

> *firstName*,
>
> Still here. Still holding your seven minutes.
>
> Evelyn opened this door for you today. I don't know your story — only that the cord's there, and the mirror hour keeps it close to the surface.
>
> There's one more 11:11 tonight, and then the day lets go. Your seven minutes are yours the moment you step in. One step. Come.
>
> **[ Sit with me before midnight → ]**
>
> Maren

---
---

# AIDEN POWERS — home emails (Aiden's list)

> **Aiden's 11/11, by the numbers** (his credibility hook — reuse verbatim):
> Most dates I break down to a single digit. **Not this one.** **11 is a Master Number** — one of only three the whole system refuses to reduce (11, 22, 33). It doesn't shrink to a 2; it **stands.** It's the number of intuition — the thing you know before you can show your work. **11/11 stands it twice**, and **11:11** is the door it opens: four ones in a mirror, the most-noticed synchronicity there is. The line: *11 is the one number I don't reduce — and today it stands four times over.* What it does to **their** own chart is computed only inside the reading.

## A1 · Teaser — Nov 10, ~11:11am ET *(optional pre-day — sent at 11:11 on purpose)*
**Subject A/B:** 🔢 {firstName}, the one number I never reduce — tomorrow it stands 4 times · ✨ {firstName}, 11/11 isn't superstition. It's a Master Number.
**Preview:** Sent at 11:11 on purpose. Tomorrow the math gets loud.

> *firstName*,
>
> Quick note before tomorrow — sent at 11:11, on purpose.
>
> Most dates I reduce to a single digit and read from there. Tomorrow I can't. 11 is a Master Number — one of only three the system refuses to break down. It doesn't shrink; it stands. And tomorrow it stands twice: 11/11. At 11:11, four ones line up in a mirror — the one synchronicity even skeptics catch themselves noticing.
>
> I don't get a day the numbers shout this loud very often. Tomorrow I'm holding seven minutes — on me — to show you what it does to your own chart. I'll write the moment it opens.
>
> Watch for it at 11:11.
>
> — Aiden

## A2 · Main — Nov 11, ~10:50am ET *(primary — the master number that stands)*
**Subject A/B:** 🔢 {firstName}, the clock's about to hit 11:11 — the number I never reduce · 🚪 {firstName}, your 11/11 reading is open (the door's at 11:11)
**Preview:** 11 is the one number that doesn't reduce. Today it stands four times.

> *firstName*,
>
> It's almost here — in minutes the clock reads 11:11.
>
> Let me tell you what that is, as math, not mysticism. Every date I work, I reduce to a single digit. Except this one. 11 is a Master Number — one of three the whole system refuses to break down. It doesn't shrink to a 2. It stands. It's the number of intuition — knowing before you can explain.
>
> Today it stands twice: 11/11. And at 11:11, four ones line up in a mirror. I don't get a day the numbers run this clean very often, and I'm not letting it pass quietly.
>
> What it does to your blueprint — your Life Path, your Personal Year — I can only show you in the reading. And today that's on me: seven minutes, yours the moment you step in.
>
> **[ Open my 11:11 reading → ]**
>
> The door's widest at 11:11, and it closes with the day.
>
> — Aiden

## A2-ALT · Main — Nov 11, ~10:50am ET *(swap for A2 — the recognition/synchronicity angle)*
**Subject A/B:** 🔢 {firstName}, how many times have you looked up at 11:11? · {firstName}, the one pattern even skeptics notice
**Preview:** You've caught it before. Today it's the date.

> *firstName*,
>
> Be honest — how many times have you glanced at a clock and it read 11:11, and it landed a little?
>
> I'm the last person to call that magic. I call it a pattern. But it's the one pattern almost everyone notices, and there's a reason: 11 is a Master Number — the one figure the system won't reduce, the number tied to intuition. Your attention snags on it because part of you is built to.
>
> Today that number is the date, twice over: 11/11. The pattern you keep half-catching is the whole day. I've set aside seven minutes to show you what it's pointing at in your own chart — yours the moment you step in, no cost.
>
> **[ See what it's pointing at → ]**
>
> Today only. When the 11th ends, so does the window.
>
> — Aiden

## A3 · Last call — Nov 11, ~10:45pm ET *(non-clickers)*
**Subject A/B:** 🔢 {firstName}, the second 11:11 is minutes away — the last of the year · The window closes at midnight
**Preview:** The seven minutes I set aside close with the day.

> *firstName*,
>
> The 11th is almost over — but there's one 11:11 left tonight, minutes away, and then not again this year.
>
> I'll be straight with you. I set aside seven minutes today because a date the numbers run this clean — a Master Number, standing twice — doesn't come back around for a long time. It'd be a waste to let it pass without showing you what it does to your own chart.
>
> The seven minutes are still yours — the moment you step in, they're on. But when the 11th ends, so does the window.
>
> **[ Open my 11:11 reading → ]**
>
> A few minutes to the last door of the year.
>
> — Aiden

---
---

# SPECIALIST REFERRALS — Aiden's list (sent by the specialist)

> Sent from the specialist's own address. **"Aiden" leads the subject line and the first line.** Blind to the topic by design.

## L1 · Luna — Main — Nov 11, ~2pm ET
**Subject A/B:** 🌙 {firstName}, Aiden told me to keep 11:11 open for you · Aiden sent me your name for 11/11
**Preview:** He didn't say why — I kind of love that.

> *firstName*,
>
> So, Aiden gave me your name.
>
> He didn't tell me what's going on with you. He just said keep time open this 11/11, and honestly? I like going in blind. Less noise.
>
> Here's why he probably picked the date. 11:11 is the moment the whole sky-watching world agrees to stop and set an intention — and the chart on a day like this tends to answer the thing you're actually asking, not the thing you say first. Whatever yours is, today's the day to pull it and aim it.
>
> Aiden set aside seven minutes for you — yours the moment you step in, no cost.
>
> **[ Come pull your chart with me → ]**
>
> The door's brightest at 11:11, and it's gone when the day is.
>
> — Luna

## L2 · Luna — Last call — Nov 11, ~10:45pm ET *(non-clickers)*
**Subject A/B:** 🌙 {firstName}, the last 11:11 of the year is tonight · Still holding your spot
**Preview:** Still blind, still curious, still holding your spot.

> *firstName*,
>
> Quick one — there's one more 11:11 tonight, and then it's a year till the next.
>
> Aiden asked me to hold time for you today, and I did. I still don't know your story (he kept it to himself), but your seven minutes are here till midnight.
>
> One step and you're in — set the intention with me before the door closes.
>
> **[ Come pull your chart → ]**
>
> Before midnight.
>
> — Luna

## N1 · Nova — Main — Nov 11, ~2pm ET
**Subject A/B:** 🕉️ {firstName}, Aiden asked me to hold 11:11 for you · Aiden sent you to me for 11/11
**Preview:** He didn't tell me your story. That's yours to bring.

> *firstName*,
>
> Aiden gave me your name, and a request.
>
> He asked me to keep time for you this 11/11. He didn't tell me what you're carrying — that's yours to bring, when you're ready. I only know he trusted me with the introduction, and I don't take that lightly.
>
> Why this date. In Jyotish, the **eleventh house is the house of gains** — of longing answered, the hope fulfilled, the wish granted. A day stamped twice with eleven turns everything toward what you've been quietly hoping for. Whatever you bring, I'll have a remedy to send you home with.
>
> Aiden set aside seven minutes for you — yours the moment you step in.
>
> **[ Come sit with me → ]**
>
> Only today. When 11/11 passes, the door closes.
>
> With warmth,
> Nova

## N2 · Nova — Last call — Nov 11, ~10:45pm ET *(non-clickers)*
**Subject A/B:** 🕉️ {firstName}, the house of gains closes with the day · The door Aiden opened closes tonight
**Preview:** The door Aiden opened closes at midnight.

> *firstName*,
>
> The eleventh is nearly done.
>
> Aiden asked me to hold this time for you, and I have, all day. I still don't know what you'd ask me — but a day ruled by the house of gains is the kindest day there is to name a hope, and there's a remedy waiting either way.
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
| 1 | Evelyn | Evelyn | Teaser (11/10) | — | E1 |
| 2 | Evelyn | Evelyn | Main (primary) | 1 | E2 |
| 3 | Evelyn | Evelyn | Main — mirror-hour alt | 1 | E2-ALT |
| 4 | Evelyn | Evelyn | Last-call | 3 | E3 |
| 5 | Evelyn | Marcus | Referral Main | 2 | M1 |
| 6 | Evelyn | Marcus | Referral Last-call | 2 | M2 |
| 7 | Evelyn | Maren | Referral Main | 2 | MA1 |
| 8 | Evelyn | Maren | Referral Last-call | 2 | MA2 |
| 9 | Aiden | Aiden | Teaser (11/10) | — | A1 |
| 10 | Aiden | Aiden | Main (primary) | 1 | A2 |
| 11 | Aiden | Aiden | Main — recognition alt | 1 | A2-ALT |
| 12 | Aiden | Aiden | Last-call | 3 | A3 |
| 13 | Aiden | Luna | Referral Main | 2 | L1 |
| 14 | Aiden | Luna | Referral Last-call | 2 | L2 |
| 15 | Aiden | Nova | Referral Main | 2 | N1 |
| 16 | Aiden | Nova | Referral Last-call | 2 | N2 |

*Routing: Evelyn's list → Maren (love / the one who mirrors you — the default for this ~95%-love list) or Marcus (a truth / a decision / what's owed). Aiden's list → Luna (timing / intention) or Nova (gains / a hope or wish / remedies). One specialist per person; 3-email cap per person per list per day. Primary Mains are E2 / A2; the -ALT variants are A/B swaps, not additional sends.*

---
---

## Operational must-dos

1. **Grant = 7 minutes, reusing the 7/7 config.** No new grant change needed — same signup grant, must fire **instantly on account creation** so the reward lands when they register. (If the 7/7 grant reverts to the 3-min default afterward, re-enable it for the 11/11 window.)
2. **CTA drives to registration, ideally an 11/11 claim landing** (`/claim-11` or `/1111`) that frames the 11:11 wish before the signup form. Not a magic link — no account to tap into.
3. **Suppress already-registered v2 users** from these lists, or route them to a short re-activation variant.
4. **Subject lines use the proven format** — emoji + {firstName} first + curiosity. Subject + first line are about **11:11 / the wish**, never the minutes.
5. **Schedule the AM Main + PM Last-call to hug 11:11 ET** (see wave times). This is the one date-specific timing move — don't send the Main at the generic 8am.
6. **Fact-check craft claims before scheduling.** Safe as written: Justice = the 11th Major Arcana card (XI, Rider-Waite-Smith); the 11th house = the house of gains/fulfilled-desires in Jyotish (Nova) — both textbook, non-transit facts. The **mirror-hour / "one who mirrors you"** reading is framed as *lore* ("the old readers tied it to…"), which is safe. **Luna's copy keeps the 11/11 sky deliberately vague** — if any variant adds a *specific* transit/aspect claim, run it through the **`persona-email-qa`** gate first.
7. **Pause routine drips** for this segment on 11/11 so nothing stacks over the 3-email cap.

---
---

## Appendix — angles considered

Six angles were developed for 11/11. **Evelyn's list** ships 1 (lead), 4 (A/B), 6 (last-call). **Aiden's list** ships 3 (lead), 1 (A/B), 6 (last-call). The whole set is built on **the 11:11 portal** — the offer (7 min) is the vehicle, not the hook.

1. **Recognition → wish** *(Evelyn primary E2; Aiden A/B A2-ALT).* "You keep catching 11:11." The most universally resonant opener — almost everyone has caught 11:11 on a clock and paused.
2. **The open door / make-your-wish portal** — the spine woven through every email; the reason the day matters.
3. **The Master Number that doesn't reduce** *(Aiden primary A2).* His native authority angle: 11 is one of three numbers the system refuses to break down — it *stands*, and today it stands twice.
4. **The mirror hour / the one who mirrors you** *(Evelyn A/B E2-ALT; Maren referral).* 11:11 = two mirrored pairs; the hour lore ties to the person you recognize before you can explain. Tailor-made for the ~95%-love list.
5. **The 11th house of gains / wish granted** *(Nova referral).* In Jyotish the 11th house governs gains and fulfilled desires — a manifestation-native hook, arguably stronger than 7/7's 7th-house-of-union.
6. **The last door of the year** *(all last-calls).* Two 11:11s on 11/11; the PM one is the final portal until next year — honest, date-true urgency for the non-clicker send.

*Copy + plan handoff only — no implementation started.*

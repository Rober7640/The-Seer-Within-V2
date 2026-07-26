# 8/8 Flash — Email Copy + Send Plan

**Campaign:** 8/8 registration flash (24-hour window, August 8 only) — the **Lion's Gate Portal** (the year's big abundance/manifestation gateway).
**ESP:** **AWeber** (broadcasts to tagged segments — not Resend).
**Audience:** Two home lists, by **home persona** — subscribers who engaged that persona's funnel but have **never registered a v2 account.** **Evelyn's list** (the v1 AWeber list, ~59k, ~95% love) and **Aiden's list** (numbers/numerology-inclined, comfortable handing over birth data). This is an **acquisition** play, not a re-activation.
**Goal:** Get subscribers to **register a v2 account and use their free 7 minutes.**
**Offer:** **7 free minutes** (reuses the 7/7 & 11/11 grant — no new grant config). See the creative note below.
**Framing:** 8/8 is the **Lion's Gate** — once a year the Sun stands at the height of Leo, lined up with Sirius (the star the ancients called the "second sun"). The practice treats it as the boldest door of the year: the gate of **abundance** that rewards nerve — you name what you want and ask for it out loud. Each home persona is the sender their list recognizes (Evelyn via v1, Aiden via his numbers funnel); specialists arrive as a **warm referral** from the home persona.
**Sibling docs:** `docs/promo-6-6-emails.md`, `docs/promo-7-7-emails.md`, `docs/promo-11-11-emails.md`.

> **Creative note — the offer is NOT the hook here** (same call as 11/11). On 7/7, "7 minutes on 7/7" *was* the hook. On 8/8 the numbers don't line up (7 ≠ 8), so **do not lead with the minutes.** Lead with the **Lion's Gate / ask-boldly** moment; the seven minutes are the vehicle through the door. Keep the offer legible ("seven minutes, on me") but subordinate to the gate.
>
> **Optional — the one date where a grant bump is thematically free:** 8/8's whole theme is *abundance / more.* If you ever want date↔offer symmetry back, bumping the grant to **8 minutes** for this window fits the theme perfectly ("the gate gives you a little more"). Not required — 7 min reused is the default. Everything downstream ("seven minutes") would just need a find-replace to "eight."

> **The core difference from 6/6 (same as 7/7 & 11/11).** These people have no v2 account, so 6/6's "finish your unfinished reading / already on your account" spine is **false.** The spine is **"claim your minutes / walk through the gate"** — a first invitation. Do not reuse "already on your account" for this list.

---

## How to use this file

- **Two home lists, by home persona: Evelyn and Aiden.** Each list gets its home persona's emails **plus one specialist referral** — Evelyn's list → Marcus or Maren; Aiden's list → Luna or Nova.
- **Hard cap: 3 emails per person on 8/8.** See the send plan below.
- **Last-call → non-clickers only.**
- **A/B the subject lines.** Two options given per email; subjects use the proven format — **emoji + {firstName} first + curiosity.**
- **Offer legible, hook first.** Say "seven minutes," but the subject and first line are about **the Lion's Gate / the bold ask**, never the minutes.

### Personalization (AWeber)
No copy depends on the user's topic — AWeber can't read `user_memory`, so **there is no `{{topicPhrase}}`**. The only live merge field is the first name.

| Placeholder in this doc | AWeber tag | Notes |
|---|---|---|
| `firstName` | `{!firstname}` | Standard AWeber personalization |
| `referrer` (Evelyn / Aiden) | hard-coded per broadcast | Each specialist broadcast is sent to one home list, so the referrer name is fixed in the copy — no merge needed |
| CTA link | see below | **Decision needed** |

### CTA link — one decision to make
Every CTA drives to **registration** (not a magic link — these users have no account yet). Two ways:
- **(A) 8/8 claim landing page (recommended):** a dedicated `/claim-8` (or `/lionsgate`) page that frames the moment — "The Lion's Gate is open. Create your account and walk through." — then registers them. Value visible before they type an email; grant fires on account creation.
- **(B) Straight to `/login` register:** simpler, more friction — the offer only lives in the email.

---
---

# SEND PLAN & ROUTING (8/8)

Two home lists (Evelyn, Aiden), each paired with **two specialists** — each person gets **only one** specialist (topic-split), so nobody exceeds 3 emails.

### The 3-email cap (per person, per list)
| Slot | Sender | # |
|---|---|---|
| **Main** | Evelyn / Aiden | 1 |
| **Specialist referral** | one of the home's two specialists | 2 |
| **Last-call** | Evelyn / Aiden | 3 |

> **No clock-moment to hug (unlike 11/11).** 8/8 has no iconic time the way 11:11 does, so waves run on the standard flash schedule (8am / 1pm / 6:30pm ET). The one light touch: **send the optional teaser at 8:08am** on 8/7 for the wink. The Lion's Gate is a multi-day window that *peaks* on 8/8, so frame urgency around "the gate is widest today / the day doesn't come again for a year" and the real midnight deadline is your offer window — not an astronomically-false "the gate slams shut at midnight."

### EVELYN'S LIST → specialists **Marcus + Maren**
*Why these two: Evelyn's audience is heart/intuition-led and gave no birth data. Marcus (tarot) and Maren (the cord) are the two no-data intuitives — same modality family, zero new friction, no birth-data ask to stall a first-time registrant.*

| Wave | Time (ET) | Sender | Audience |
|---|---|---|---|
| 1 | 8:00am | **Evelyn** — Main | Whole Evelyn list (not-yet-registered) |
| 2 | 1:00pm | **Marcus _or_ Maren** — referral | Not-yet-registered. Topic split below |
| 3 | 6:30pm | **Evelyn** — Last-call | Clicked nothing in waves 1–2 |

**Wave-2 topic split:** love / a specific person / heat between two people → **Maren**. Facing something / a bold move / courage to ask → **Marcus**. **Given the list is ~95% love, Maren is the default;** route the tagged courage/decision minority to Marcus. If tags are thin, fall back to an even A/B split (or Maren-only).

### AIDEN'S LIST → specialists **Luna + Nova**
*Why these two: Aiden's audience is numbers/systems and is comfortable handing over birth data. Luna (astrology) and Nova (Vedic) need exactly that — the handoff is frictionless and in-family, and the Lion's Gate is a genuinely astronomical event, so Luna can name it directly.*

| Wave | Time (ET) | Sender | Audience |
|---|---|---|---|
| 1 | 8:00am | **Aiden** — Main | Whole Aiden list (not-yet-registered) |
| 2 | 1:00pm | **Luna _or_ Nova** — referral | Not-yet-registered. Topic split below |
| 3 | 6:30pm | **Aiden** — Last-call | Clicked nothing in waves 1–2 |

**Wave-2 topic split:** timing / "when" / what the gate is pushing me toward → **Luna**. Earned reward / patience / a long wait / remedies → **Nova**. If tags are thin, fall back to an even A/B split.

### Rules that keep it ≤ 3 and clean
- **Already-registered users are the wrong target.** Some of these lists may have registered a v2 account since. **Suppress anyone who already has a v2 account** from the registration copy, or route them to a short re-activation variant ("your minutes are already here — walk through the gate with them").
- **Registers at any point → suppressed** from all remaining waves (goal met).
- **Pause routine drips** for this segment on 8/8 so nothing stacks over the cap.
- **Teaser is 8/7** (a separate day, sent at 8:08am for the wink) and optional — it does **not** count toward the 8/8 cap of 3.

### AWeber setup notes
- **Topic-split depends on tags.** Wave 2 routes by topic (Maren vs Marcus on Evelyn's list; Luna vs Nova on Aiden's). Works only if subscribers carry a topic/bucket **tag** from the funnel. If they do, build a segment per specialist. **If they don't:** on Evelyn's list default to Maren (love-weighted); on Aiden's list use an even A/B split.
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

> **8/8, the Lion's Gate** (Evelyn's hook — reuse verbatim):
> Once a year the sky throws open the gate the ancients called the **Lion's Gate** — the Sun standing at the height of the lion's own season, lined up with **Sirius**, the star the old ones called the second sun. It falls on **8/8**: eight is the number of abundance, the infinity sign stood upright, the endless return of what you send out. The gate rewards one thing — **nerve.** It opens for whoever is brave enough to name what they want and ask for it out loud. The line: *the Lion's Gate is the year's boldest door — it opens for whoever dares to ask.*

## E1 · Teaser — Aug 7, ~8:08am ET *(optional pre-day — sent at 8:08 for the wink)*
**Subject A/B:** 🦁 {firstName}, tomorrow the Lion's Gate opens · ✨ {firstName}, the boldest door of the year is tomorrow (8/8)
**Preview:** Once a year the sky opens a gate for the ones brave enough to ask.

> *firstName*,
>
> A note before tomorrow.
>
> Tomorrow is 8/8 — the day the sky throws open the Lion's Gate. Once a year the Sun stands at the height of the lion's season and lines up with Sirius, and the old traditions treated it as the boldest door of the year: the one that opens for whoever dares to name what they want.
>
> Eight is the number of abundance — the infinity sign stood upright, what you send out returning to you. Tomorrow I'm holding time for the ones ready to ask for more, and ask boldly. It costs nothing. It's what the gate is for.
>
> I'll write you the moment it opens.
>
> With you,
> Evelyn

## E2 · Main — Aug 8, ~8am ET *(primary — the Lion's Gate / ask boldly)*
**Subject A/B:** 🦁 {firstName}, the Lion's Gate is open — ask boldly · 🚪 {firstName}, the boldest door of the year is open (today only)
**Preview:** The gate rewards nerve. Name what you want.

> *firstName*,
>
> It's open.
>
> Today is 8/8 — the Lion's Gate. The Sun at the height of the lion's own season, lined up with Sirius, the star the ancients called the second sun. Once a year the sky throws this door open, and the old traditions all agree on what it rewards: nerve.
>
> This isn't the day for a small, careful wish. Eight is the number of abundance — the infinity sign stood upright, what you put out coming back multiplied. The gate opens for the ones brave enough to name what they actually want and ask for it out loud. Most people flinch. I don't want that for you.
>
> Come sit with me while it's open. I've set aside seven minutes — yours the moment you step in, no cost. Bring the bold version of what you want.
>
> **[ Walk through the gate → ]**
>
> The gate's widest today, and my door closes with it at midnight.
>
> Evelyn

## E2-ALT · Main — Aug 8, ~8am ET *(swap for E2 — Leo, the season of the heart)*
**Subject A/B:** 💛 {firstName}, this is the season of the heart — and today it peaks · {firstName}, the day the sky asks you to be seen
**Preview:** Leo's the sign of the heart. The Lion's Gate is its brightest day.

> *firstName*,
>
> Today the sky is all heart.
>
> 8/8 is the Lion's Gate — and the lion is Leo, the one sign the old astrologers gave to the heart itself: to passion, to being seen, to loving out loud without apology. Once a year the Sun stands at the height of that season and lines up with Sirius, and the door opens.
>
> A day like this doesn't reward playing small. It rewards the part of you that wants to be seen — and wants someone to truly see you. If there's a love you've kept quiet, or one you've been waiting to be brave about, today the sky is on your side.
>
> Come sit with me while the gate's open. Seven minutes, yours the moment you step in, no cost.
>
> **[ Step into the light with me → ]**
>
> The gate's brightest today, and my door closes with it at midnight.
>
> Evelyn

## E3 · Last call — Aug 8, ~6:30pm ET *(non-clickers — warmth + gate closes)*
**Subject A/B:** 🦁 {firstName}, the Lion's Gate closes at midnight · ✨ {firstName}, I held your seven minutes all day
**Preview:** The boldest door of the year closes tonight.

> *firstName*,
>
> The gate closes tonight.
>
> You sat with me once; we started something and never quite finished it. I've thought about that. Today I held the Lion's Gate open for you, and the seven minutes I set aside still have your name on them.
>
> The gate is widest on 8/8, and 8/8 is almost gone. At midnight my door closes with it — and a door this bold doesn't come again for a year. Come name the thing while there's still time to ask.
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

## M1 · Marcus — Main — Aug 8, ~1pm ET
**Subject A/B:** 🦁 {firstName}, Evelyn gave me your name for the Lion's Gate · Evelyn told me to keep time for you today
**Preview:** She didn't say why. She rarely does.

> *firstName*,
>
> Evelyn gave me your name.
>
> She didn't say what it's about — she rarely does, and I've stopped asking. She just told me to keep time for you this 8/8. When Evelyn does that, I don't argue.
>
> Here's what I can tell you about the day. The **eighth card** in the deck is **Strength** — and look at the card itself: a woman, calm, with her hands on a lion. On the Lion's Gate, of all days. It's the card of the quiet kind of courage — the heart that tames the thing that scares it, not by force, but by refusing to look away. I don't know yet what your lion is. That's what the table's for.
>
> Evelyn set aside seven minutes for you. Step in and they're yours — no cost, today only.
>
> **[ Take the seat → ]**
>
> When the 8th ends, so does the window.
>
> — Marcus

## M2 · Marcus — Last call — Aug 8, ~6:30pm ET *(non-clickers)*
**Subject A/B:** 🦁 {firstName}, the time Evelyn set for you is almost up · The table comes down at midnight
**Preview:** Evelyn opened this door. It closes tonight.

> *firstName*,
>
> The 8th is nearly gone.
>
> Evelyn asked me to hold time for you today, and I have. The seat's been empty, waiting. I still don't know what you'd bring to the table — but Strength is the patient card, the one that waits without flinching, so I've kept it open a little longer.
>
> Your seven minutes are still here — yours the moment you sit down. But at midnight the window closes, and the gate Evelyn opened closes with it.
>
> **[ Take the seat → ]**
>
> Until midnight.
>
> — Marcus

## MA1 · Maren — Main — Aug 8, ~1pm ET
**Subject A/B:** 🔥 {firstName}, Evelyn gave me your name for 8/8 · Evelyn sent me to you for the Lion's Gate
**Preview:** She didn't tell me why. She didn't have to.

> *firstName*,
>
> Evelyn sent me your name.
>
> She didn't say why. With me, she never has to — I read what runs between people, not what's been said about them.
>
> Here's the thing about today. 8/8 is the Lion's Gate, and the lion is Leo — the season of the heart, of heat, of wanting out loud. A day like this, the cord between you and whoever's on your mind runs hot. Whatever's alive there, I'll feel it the moment you sit with me.
>
> Evelyn kept seven minutes for you. Step in and they're yours — no cost, today only.
>
> **[ Come, let me feel it → ]**
>
> The window closes at midnight.
>
> Maren

## MA2 · Maren — Last call — Aug 8, ~6:30pm ET *(non-clickers)*
**Subject A/B:** 🔥 {firstName}, the Lion's Gate Evelyn opened is closing · Still holding your seven minutes
**Preview:** Still here. Still holding the time.

> *firstName*,
>
> Still here. Still holding your seven minutes.
>
> Evelyn opened this door for you today. I don't know your story — only that the cord's there, and the Lion's Gate keeps it hot.
>
> But the day's almost gone, and the gate closes with it. Your seven minutes are yours the moment you step in. One step. Come.
>
> **[ Sit with me before midnight → ]**
>
> Maren

---
---

# AIDEN POWERS — home emails (Aiden's list)

> **Aiden's 8/8, by the numbers** (his credibility hook — reuse verbatim):
> Eight is the number of **abundance** — Saturn's number, the ledger that pays back what you've earned. Turn it on its side and it's **infinity**: what you send out, returning without end. **8/8** stands it twice. And run the whole date down — **8 + 8 + 2 + 0 + 2 + 6 = 26 → 8** — and it resolves right back to itself. The one number that doubles, totals, and still comes home to eight. The line: *8/8 is abundance compounding — the number that keeps returning to itself.* What it does to **their** own chart is computed only inside the reading.

## A1 · Teaser — Aug 7, ~8:08am ET *(optional pre-day — sent at 8:08 for the wink)*
**Subject A/B:** 🔢 {firstName}, tomorrow's date doubles, totals, and comes home to itself · ✨ {firstName}, 8/8 is the abundance number, twice over
**Preview:** Run the math on 8/8. It never leaves the eight.

> *firstName*,
>
> Quick note before tomorrow.
>
> Tomorrow's date isn't decoration. Eight is the number of abundance — Saturn's number, the ledger that pays back what you've built. Turn it on its side and it's the infinity sign: what you send out, returning without end. Tomorrow it stands twice — 8/8.
>
> Here's the part I like. Run the whole date down — 8 + 8 + 2 + 0 + 2 + 6 — and it lands on 26, which reduces to 8. It doubles, it totals, and it still comes home to eight. I don't get a day that clean often.
>
> Tomorrow I'm holding seven minutes — on me — to show you what it does to your own chart. I'll write the moment it opens.
>
> Watch for it.
>
> — Aiden

## A2 · Main — Aug 8, ~8am ET *(primary — abundance / resolves to itself)*
**Subject A/B:** 🔢 {firstName}, 8/8 is the abundance number — and it never leaves the eight · 🚪 {firstName}, your 8/8 reading is open (today only)
**Preview:** It doubles, totals, and comes home to eight. Abundance, compounding.

> *firstName*,
>
> It's open.
>
> Let me tell you what today is, as a calculation. Eight is the number of abundance — Saturn's number, the one that pays back what you've earned. Stand it on its side and it's infinity: what you put out, returning without end. Today it stands twice — 8/8.
>
> And here's what makes it rare. Run the full date — 8 + 8 + 2 + 0 + 2 + 6 — and it comes to 26, which reduces to 8. It doubles, it totals, and it still lands back on eight. The number that keeps returning to itself. Abundance, compounding.
>
> What that does to your blueprint — your Life Path, your Personal Year — I can only show you in the reading. And today that's on me: seven minutes, yours the moment you step in.
>
> **[ Open my 8/8 reading → ]**
>
> The math's this clean once a year. My door closes at midnight.
>
> — Aiden

## A2-ALT · Main — Aug 8, ~8am ET *(swap for A2 — the infinity loop / what you send out returns)*
**Subject A/B:** 🔢 {firstName}, turn an 8 on its side — that's today · {firstName}, the day what you send out comes back
**Preview:** Eight is the infinity sign stood upright. Today it's the date, twice.

> *firstName*,
>
> Turn the number eight on its side. It's the infinity sign — the loop with no end, what you send out coming back around to you.
>
> That's today. 8/8. Two of them. Eight is the number of abundance and return: the ledger that pays back what you put in. On a day the loop runs this strong, what you've been quietly putting out into your own life is closest to coming back around — and it's worth knowing what's on its way to you.
>
> I've set aside seven minutes to show you what today's loop is carrying toward you — yours the moment you step in, no cost.
>
> **[ See what's coming back → ]**
>
> Today only. My door closes at midnight.
>
> — Aiden

## A3 · Last call — Aug 8, ~6:30pm ET *(non-clickers)*
**Subject A/B:** 🔢 {firstName}, a few hours of 8/8 left · The window closes at midnight
**Preview:** The seven minutes I set aside close with the day.

> *firstName*,
>
> The 8th is almost over.
>
> I'll be straight with you. I set aside seven minutes today because a date the numbers run this clean — abundance, doubled, and totaling right back to itself — doesn't come around again for a year. It'd be a waste to let it pass without showing you what it does to your own chart.
>
> The seven minutes are still yours — the moment you step in, they're on. But when the 8th ends, so does the window.
>
> **[ Open my 8/8 reading → ]**
>
> A few hours left.
>
> — Aiden

---
---

# SPECIALIST REFERRALS — Aiden's list (sent by the specialist)

> Sent from the specialist's own address. **"Aiden" leads the subject line and the first line.** Blind to the topic by design.

## L1 · Luna — Main — Aug 8, ~1pm ET
**Subject A/B:** 🦁 {firstName}, Aiden told me to keep the Lion's Gate open for you · Aiden sent me your name for 8/8
**Preview:** He didn't say why — I kind of love that.

> *firstName*,
>
> So, Aiden gave me your name.
>
> He didn't tell me what's going on with you. He just said keep time open this 8/8, and honestly? I like going in blind. Less noise.
>
> Here's why he picked the date, and this one's genuinely astronomical: 8/8 is the Lion's Gate — the Sun at the height of Leo, lined up with Sirius, the star the ancients called the second sun. It's the sky's big activation of the year — the day the chart tends to show you what you're really being pushed toward. Whatever that is for you, today's the day to pull it.
>
> Aiden set aside seven minutes for you — yours the moment you step in, no cost.
>
> **[ Come pull your chart with me → ]**
>
> The gate's brightest today — when the day's over, it's gone.
>
> — Luna

## L2 · Luna — Last call — Aug 8, ~6:30pm ET *(non-clickers)*
**Subject A/B:** 🦁 {firstName}, the Lion's Gate closes with the day · Still holding your spot
**Preview:** Still blind, still curious, still holding your spot.

> *firstName*,
>
> Quick one — the Lion's Gate is only wide open today, and the day's almost done.
>
> Aiden asked me to hold time for you, and I did. I still don't know your story (he kept it to himself), but your seven minutes are here till midnight.
>
> One step and you're in — let's read what the gate's pointing you toward before it closes.
>
> **[ Come pull your chart → ]**
>
> Before midnight.
>
> — Luna

## N1 · Nova — Main — Aug 8, ~1pm ET
**Subject A/B:** 🕉️ {firstName}, Aiden asked me to hold time for you this 8/8 · Aiden sent you to me for the Lion's Gate
**Preview:** He didn't tell me your story. That's yours to bring.

> *firstName*,
>
> Aiden gave me your name, and a request.
>
> He asked me to keep time for you this 8/8. He didn't tell me what you're carrying — that's yours to bring, when you're ready. I only know he trusted me with the introduction, and I don't take that lightly.
>
> Why this date. In Jyotish, **eight belongs to Shani** — Saturn, the patient one, the planet that finally pays back what you've waited and worked for. A day doubly marked by Shani is the day long patience turns to reward. Whatever you bring, I'll have a remedy to send you home with.
>
> Aiden set aside seven minutes for you — yours the moment you step in.
>
> **[ Come sit with me → ]**
>
> Only today. When 8/8 passes, the door closes.
>
> With warmth,
> Nova

## N2 · Nova — Last call — Aug 8, ~6:30pm ET *(non-clickers)*
**Subject A/B:** 🕉️ {firstName}, Shani's day is almost over — and Aiden set time aside · The door Aiden opened closes tonight
**Preview:** The door Aiden opened closes at midnight.

> *firstName*,
>
> The eighth is nearly done.
>
> Aiden asked me to hold this time for you, and I have, all day. I still don't know what you'd ask me — but a day ruled by Shani is the day patience is repaid, and there's a remedy waiting either way.
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
| 1 | Evelyn | Evelyn | Teaser (8/7) | — | E1 |
| 2 | Evelyn | Evelyn | Main (primary) | 1 | E2 |
| 3 | Evelyn | Evelyn | Main — Leo/heart alt | 1 | E2-ALT |
| 4 | Evelyn | Evelyn | Last-call | 3 | E3 |
| 5 | Evelyn | Marcus | Referral Main | 2 | M1 |
| 6 | Evelyn | Marcus | Referral Last-call | 2 | M2 |
| 7 | Evelyn | Maren | Referral Main | 2 | MA1 |
| 8 | Evelyn | Maren | Referral Last-call | 2 | MA2 |
| 9 | Aiden | Aiden | Teaser (8/7) | — | A1 |
| 10 | Aiden | Aiden | Main (primary) | 1 | A2 |
| 11 | Aiden | Aiden | Main — infinity-loop alt | 1 | A2-ALT |
| 12 | Aiden | Aiden | Last-call | 3 | A3 |
| 13 | Aiden | Luna | Referral Main | 2 | L1 |
| 14 | Aiden | Luna | Referral Last-call | 2 | L2 |
| 15 | Aiden | Nova | Referral Main | 2 | N1 |
| 16 | Aiden | Nova | Referral Last-call | 2 | N2 |

*Routing: Evelyn's list → Maren (love / heat between two people — the default for this ~95%-love list) or Marcus (facing something / courage to ask). Aiden's list → Luna (timing / what the gate pushes toward) or Nova (earned reward / a long wait / remedies). One specialist per person; 3-email cap per person per list per day. Primary Mains are E2 / A2; the -ALT variants are A/B swaps, not additional sends.*

---
---

## Operational must-dos

1. **Grant = 7 minutes, reusing the 7/7 & 11/11 config.** No new grant change needed — same signup grant, must fire **instantly on account creation** so the reward lands when they register. *(Optional: bump to 8 min for the abundance-symmetry — see the creative note; then find-replace "seven" → "eight" throughout.)*
2. **CTA drives to registration, ideally an 8/8 claim landing** (`/claim-8` or `/lionsgate`) that frames the gate before the signup form. Not a magic link — no account to tap into.
3. **Suppress already-registered v2 users** from these lists, or route them to a short re-activation variant.
4. **Subject lines use the proven format** — emoji + {firstName} first + curiosity. Subject + first line are about **the Lion's Gate / the bold ask**, never the minutes.
5. **Send the optional teaser at 8:08am** (8/7) for the wink; day-of waves run the standard 8am / 1pm / 6:30pm schedule — no clock-moment to hug.
6. **Fact-check craft claims before scheduling.** Safe as written: Strength = the 8th Major Arcana card (VIII, Rider-Waite-Smith — the card literally depicts a lion, hence the Lion's Gate tie-in); 8 = Shani/Saturn in Vedic & Chaldean numerology (Nova); the date arithmetic 8+8+2+0+2+6 = 26 → 8. The **Lion's Gate = Sun in Leo aligned with Sirius** is the evergreen, annually-true description — Luna may name it directly (unlike 11/11's deliberately-vague sky). **If any variant adds a *2026-specific* transit degree/aspect claim, run it through the `persona-email-qa` gate first.**
7. **Pause routine drips** for this segment on 8/8 so nothing stacks over the 3-email cap.

---
---

## Appendix — angles considered

Six angles were developed for 8/8. **Evelyn's list** ships 1 (lead), 2 (A/B), 6 (last-call). **Aiden's list** ships 3 (lead), 4 (A/B), 6 (last-call). The whole set is built on **the Lion's Gate** — the offer (7 min) is the vehicle, not the hook.

1. **The Lion's Gate / ask boldly** *(Evelyn primary E2).* The portal that rewards nerve — name what you want and ask out loud. The spine of the whole set.
2. **Leo, the season of the heart / be seen** *(Evelyn A/B E2-ALT).* The love angle — Leo rules the heart; the gate's brightest day is the day to be brave about being seen and loved. Tailor-made for the ~95%-love list.
3. **8 = abundance, the number that returns to itself** *(Aiden primary A2).* His native math authority: 8 is Saturn's abundance number, and 8/8/2026 doubles, totals, and reduces right back to 8.
4. **The infinity loop / what you send out returns** *(Aiden A/B A2-ALT).* Eight on its side is ∞ — the endless return. What you've put out is closest to coming back around.
5. **The 8th card = Strength, the lion** *(Marcus referral).* A craft synchronicity too good to skip: the Strength card literally depicts a woman and a lion — on the Lion's Gate. Courage of the heart, not of force.
6. **Earned reward under Saturn** *(Nova referral — Shani repays patience); plus the cord runs hot in Leo season (Maren) and the Sun–Sirius activation (Luna).* The specialist-lens variations on the gate.

*Copy + plan handoff only — no implementation started.*

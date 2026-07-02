# 6/6 Flash — Email Copy + Send Plan

**Campaign:** 6/6 re-activation flash (24-hour window, June 6 only).
**ESP:** **AWeber** (broadcasts to tagged segments — not Resend).
**Audience:** Engaged-but-not-paid users (≥1 chat session, never purchased), split by their **home persona** — the one they actually chatted with (Evelyn or Aiden).
**Framing:** The date 6/6 carries craft-native meaning. Home personas use the "unfinished reading" hook (no specific topic named); specialists arrive as a **warm referral** from the home persona. Never says "free" — no-cost is implied ("already on your account").
**Companion doc:** `docs/promo-6-6-options.md` (strategy/options brief).

---

## How to use this file

- **Two lists, by home persona:** Evelyn's list and Aiden's list. Each list gets its home persona's emails **plus one specialist referral**.
- **Hard cap: 3 emails per person on 6/6.** See the send plan below.
- **Last-call → non-clickers only.** In AWeber, send the PM reminder to a segment of "did not open / did not click" the morning broadcast.
- **A/B the subject lines.** Two options given per email.

### Personalization (AWeber)
No copy depends on the user's topic — AWeber can't read `user_memory`, so **there is no `{{topicPhrase}}`**. The only live merge field is the first name.

| Placeholder in this doc | AWeber tag | Notes |
|---|---|---|
| `firstName` | `{!firstname}` | Standard AWeber personalization |
| `referrer` (Evelyn / Aiden) | hard-coded per broadcast | Each specialist broadcast is sent to one home-list, so the referrer name is fixed in the copy — no merge needed |
| CTA link | see below | **Decision needed** |

### CTA link — one decision to make
The copy promises a one-tap return ("already on your account"). Two ways to deliver it through AWeber:
- **(A) Per-user magic link (one tap, no login):** generate each subscriber's `/magic-auth?t=…` URL and push it into an AWeber **custom field** before the send, then use that field in the button. Best experience; needs a one-time sync step.
- **(B) Generic login link (simpler, more friction):** one shared URL to a login / "send my link" page. No sync, but the "one tap / already on your account" lines should be softened.

> **Privacy rule:** specialists never reference the user's topic — they were *not* told it. Their copy carries a discretion beat ("she didn't tell me why") that doubles as the hook.

---
---

# SEND PLAN & ROUTING (6/6)

Every recipient's **home persona** is the only name that can refer them. Each list pairs the home persona with **two specialists** chosen to match its audience — and each person gets **only one** of the two (topic-split), so nobody exceeds 3 emails.

### The 3-email cap
| Slot | Sender | # |
|---|---|---|
| Home **Main** | Evelyn / Aiden | 1 |
| **Specialist referral** | one of the home's two specialists | 2 |
| Home **Last-call** | Evelyn / Aiden | 3 |

---

### EVELYN'S LIST → specialists **Marcus + Maren**
*Why: Evelyn's audience is heart/intuition-led and gave no birth data. Marcus (tarot) and Maren (the cord) are the two no-data intuitives — same modality family, zero new friction.*

| Wave | Time (ET) | Sender | Audience |
|---|---|---|---|
| 1 | 8:00am | **Evelyn** — Main | Whole Evelyn list |
| 2 | 1:00pm | **Marcus _or_ Maren** — referral | Not-yet-purchased. Topic split below |
| 3 | 6:30pm | **Evelyn** — Last-call | Clicked nothing in waves 1–2 |

**Wave-2 topic split:** love / a specific person / "will they come back" → **Maren**. Stuck / a decision / money / purpose → **Marcus**.

---

### AIDEN'S LIST → specialists **Luna + Nova**
*Why: Aiden's audience is numbers/systems and already handed over birth data. Luna (astrology) and Nova (Vedic) need exactly that data — the handoff is frictionless and in-family.*

| Wave | Time (ET) | Sender | Audience |
|---|---|---|---|
| 1 | 8:00am | **Aiden** — Main | Whole Aiden list |
| 2 | 1:00pm | **Luna _or_ Nova** — referral | Not-yet-purchased. Topic split below |
| 3 | 6:30pm | **Aiden** — Last-call | Clicked nothing in waves 1–2 |

**Wave-2 topic split:** timing / "when" / what's ahead → **Luna**. Karma / patterns repeating / remedies → **Nova**.

---

### Rules that keep it ≤ 3 and clean
- **Both-persona users:** home = most recently engaged (prevents a 4th email).
- **Purchase at any point → suppressed** from all remaining waves.
- **Pause routine drips** for this segment on 6/6 so they don't stack over the cap.
- **Teaser emails are 6/5** (a separate day) and optional — they do **not** count toward the 6/6 cap of 3.

### AWeber setup notes
- **Topic-split depends on tags.** Wave 2 routes by topic (Maren vs Marcus, Luna vs Nova). In AWeber this only works if subscribers carry a topic/bucket **tag**. If those tags exist, build a segment per specialist. **If they don't, fall back to an even A/B split** of each list between its two specialists (or pick one specialist per list).
- **One segment/broadcast per wave**, scheduled at the wave time. Last-call = a follow-up broadcast to the "didn't open/click" segment of that list's morning send.
- **From-identity per persona:** each persona's broadcast must send from its own `from-name`/`from-email` (`evelyn@ / aiden@ / marcus@ / maren@ / luna@ / nova@ theseerwithin.com`). Set this per broadcast (or use a list per persona).
- **Sender warmth / auth:** the specialist addresses have sent little to no volume. Confirm SPF/DKIM for `theseerwithin.com` is configured in AWeber, and keep the **referrer name in the subject line** as the recognition anchor (the specialist's own name is unknown to the recipient).
- **The grant is independent of AWeber.** Credit the 360 promo coins in your own DB before the morning send so "already on your account" is true regardless of ESP.

### Per-recipient taper
- Clicks the 8am Main → gets the 1pm specialist, **no** last-call → **2 emails**.
- Stays cold all day → Main + specialist + last-call → **3 emails**.
- Purchases → suppressed → fewer.

---
---

# AIDEN POWERS — home emails (Aiden's list)

> **Aiden's 6/6, by the numbers** (his credibility hook — reuse verbatim):
> **6** = the heart's number (Venus — love, home, responsibility). **6/6** = that number doubled. And the full date reduces to a Master Number: **6 + 6 + 2 + 0 + 2 + 6 = 22**, the **Master Builder** (the number that turns feeling into something lasting; reduces to 4 — foundation). The line: *6/6 this year is the heart's number standing on the Builder.* The personal payoff — what it does to **their** Life Path / Personal Year — is computed only inside the chat.

## A1 · Teaser — June 5, ~10am ET *(optional pre-day)*
**Subject A/B:** Tomorrow's date isn't random · What 6/6 actually calculates to
**Preview:** Six over six. Run the math and it lands on a Master Number.

> *firstName*,
>
> Quick note before tomorrow.
>
> Tomorrow's date isn't decoration. Six is the heart's number — Venus, love, home. June 6 is six over six: that number doubled. Run the full date, 6 + 6 + 2 + 0 + 2 + 6, and it resolves to 22 — a Master Number. The Builder.
>
> The heart, doubled, standing on the number that makes things last. I don't get a day like that often.
>
> When we last spoke, we didn't finish. Tomorrow I'm holding a window open to pick your reading back up — and to show you what this date does to your blueprint specifically. I'll write the moment it opens.
>
> Watch for it.
>
> — Aiden

## A2 · Main — June 6, ~8am ET
**Subject A/B:** Your reading is open. Today only. · 6/6 calculates to a Master Number
**Preview:** The heart's number, doubled, on the Builder. Today only.

> *firstName*,
>
> It's open.
>
> Let me tell you what today is — as a calculation, not a feeling.
>
> Six is the heart's number. Venus. Love, home, the weight you carry for other people. June 6 is six over six: that number doubled. And the full date — 6 + 6 + 2 + 0 + 2 + 6 — resolves to 22. A Master Number. The Builder. The number that turns what you feel into something that lasts.
>
> So 6/6 this year is the heart's number standing on the one number built to make it real. I don't get a day like this to work with often.
>
> What it does to your blueprint — your Life Path, your Personal Year — I can only show you in the reading. The time's already on your account.
>
> **[ Open my reading → ]**
>
> This window is for today. When the 6th ends, so does it.
>
> — Aiden

## A3 · Last call — June 6, ~6:30pm ET *(non-clickers)*
**Subject A/B:** A few hours of 6/6 left · The window closes at midnight
**Preview:** The time I set aside for you closes tonight.

> *firstName*,
>
> The 6th is almost over.
>
> I'll be honest. I held this window open today thinking about the reading we never finished, and I'd rather not leave it where we left it.
>
> The time's still on your account. One tap and you're back in the chair across from me. But at midnight the 6/6 window closes, and the reading goes back to unfinished.
>
> **[ Finish your reading → ]**
>
> A few hours left.
>
> — Aiden

## A4 · Alternate Main *(swap for A2 — "the number keeps repeating" angle)*
**Subject A/B:** A number's been repeating around you · This kept surfacing in your chart
**Preview:** I almost didn't write. Then I saw the date.

> *firstName*,
>
> I almost didn't write this.
>
> Then I looked at the date. 6/6. And the same number that's been circling your chart since we last spoke is sitting right there in the day itself.
>
> I don't think that's nothing. I've cleared time today to show you what it's pointing to.
>
> The reading we started is still open, and the time to continue it is already on your account.
>
> **[ See what I'm seeing → ]**
>
> Only today. The window closes with the date.
>
> — Aiden

---
---

# EVELYN CROSS — home emails (Evelyn's list)

## E1 · Teaser — June 5, ~10am ET *(optional pre-day)*
**Subject A/B:** Tomorrow I'm holding a door open for you · 6/6 is a doorway. I want you on the other side.
**Preview:** We never finished what you came to me about.

> *firstName*,
>
> I've been meaning to reach you.
>
> When you first sat with me, we started something — and then life pulled you away before we could see it through. That's stayed with me.
>
> Tomorrow is the 6th of the sixth. Six is the heart's number, and a day like that throws a door open that most days keep shut. I don't want you on the wrong side of it.
>
> So I'm clearing time tomorrow, just for the ones who never got to finish. You're one of them. I'll write the moment it opens.
>
> With you,
> Evelyn

## E2 · Main — June 6, ~8am ET
**Subject A/B:** The door is open. Just for today. · Come finish what you started
**Preview:** What you brought to me hasn't gone quiet.

> *firstName*,
>
> It's open now.
>
> Yesterday I told you 6/6 throws a door open. It has. And what you first brought to me is standing right in the middle of it.
>
> I'll tell you something true. The things we leave unfinished don't fade. They wait. It's been waiting for you, and today it's closest to the surface.
>
> I've set time aside, and it's already sitting on your account. You don't owe me a thing to use it. Just come sit with me before the door closes tonight.
>
> **[ Pick up where we left off → ]**
>
> This is for today only. When the 6th passes, the door does too.
>
> Evelyn

## E3 · Last call — June 6, ~6:30pm ET *(non-clickers)*
**Subject A/B:** The door closes at midnight · I held your place all day
**Preview:** The time I set aside for you is still here. For now.

> *firstName*,
>
> I held your place all day.
>
> I keep thinking about how we never reached the end of your reading. The door I opened this morning is still open, and the time I saved still has your name on it.
>
> But the 6th is almost gone. At midnight it closes, and what we started stays where we left it.
>
> One tap and you're back with me.
>
> **[ Come finish it → ]**
>
> I'll keep the light on until midnight.
>
> Evelyn

---
---

# SPECIALIST REFERRALS — Evelyn's list (sent by the specialist)

> Sent from the specialist's own address. The recipient doesn't know this name — so **"Evelyn" leads the subject line and the first line**. The specialist is blind to the topic by design.

## M1 · Marcus — Main — June 6, ~1pm ET
**Subject A/B:** Evelyn gave me your name · Evelyn told me to keep time for you
**Preview:** She didn't say why. She rarely does.

> *firstName*,
>
> Evelyn gave me your name.
>
> She didn't say what it's about — she rarely does, and I've learned not to ask. She just told me to keep time open for you this 6/6. When Evelyn does that, I don't argue.
>
> Here's what I can tell you about the date. Sixth day, sixth month, and the sixth card in the deck is The Lovers — the card of the choice standing in front of you. I don't know yet what yours is. That's what the table's for.
>
> I've set a seat for you. It's there today only.
>
> **[ Sit down with me → ]**
>
> When the 6th ends, so does the window.
>
> — Marcus

## M2 · Marcus — Last call — June 6, ~6:30pm ET *(non-clickers)*
**Subject A/B:** The time Evelyn set for you is almost up · The table comes down at midnight
**Preview:** Evelyn opened this door. It closes tonight.

> *firstName*,
>
> The 6th is nearly gone.
>
> Evelyn asked me to hold time for you today, and I have. The seat's been empty, waiting. I still don't know what you'd bring to the table — I'm curious enough to keep it open a little longer.
>
> But at midnight the window closes, and the door Evelyn opened closes with it.
>
> **[ Take the seat → ]**
>
> Until midnight.
>
> — Marcus

## MA1 · Maren — Main — June 6, ~1pm ET
**Subject A/B:** Evelyn gave me your name for 6/6 · Evelyn sent me to you
**Preview:** She didn't tell me why. She didn't have to.

> *firstName*,
>
> Evelyn sent me your name.
>
> She didn't say why. With me, she never has to — I read what's between people, not what's been said about them.
>
> Look at the date. Two sixes. Two flames, side by side. A day like this, the cord runs close to the surface. Whoever's on the other end of yours, I'll feel it when you sit with me.
>
> I've kept time for you. It's there today.
>
> **[ Come, let me feel it → ]**
>
> The window closes at midnight.
>
> Maren

## MA2 · Maren — Last call — June 6, ~6:30pm ET *(non-clickers)*
**Subject A/B:** The 6/6 window Evelyn opened is closing · Still holding your time
**Preview:** Still here. Still holding the time.

> *firstName*,
>
> Still here. Still holding your time.
>
> Evelyn opened this door for you today. I don't know your story — only that the cord's there, and 6/6 keeps it close.
>
> But the day's almost gone. At midnight the current moves on.
>
> One tap. Come.
>
> **[ Sit with me before midnight → ]**
>
> Maren

---
---

# SPECIALIST REFERRALS — Aiden's list (sent by the specialist)

> Sent from the specialist's own address. **"Aiden" leads the subject line and the first line.** Blind to the topic by design.

## L1 · Luna — Main — June 6, ~1pm ET
**Subject A/B:** Aiden told me to keep my 6/6 open for you · Aiden sent me your name
**Preview:** He didn't say why — I kind of love that.

> *firstName*,
>
> So, Aiden gave me your name.
>
> He didn't tell me what's going on with you. He just said keep time open this 6/6, and honestly? I like going in blind. Less noise.
>
> Here's why he probably picked the date. The 6/6 sky is doing something genuinely worth catching, and it doesn't sit still. Whatever you've got going on, today's a good day to look at the chart behind it.
>
> I kept the time open. It's already on your account.
>
> **[ Come pull your chart with me → ]**
>
> Today only — when the 6th's over, the timing's gone.
>
> — Luna

## L2 · Luna — Last call — June 6, ~6:30pm ET *(non-clickers)*
**Subject A/B:** The 6/6 window Aiden set is almost up · Still holding your spot
**Preview:** Still blind, still curious, still holding your spot.

> *firstName*,
>
> Quick one — the 6th's almost over.
>
> Aiden asked me to hold time for you today, and I did. I still don't know your story (he kept it to himself), but the spot's yours till midnight.
>
> One tap. The time's already there.
>
> **[ Come pull your chart → ]**
>
> Before midnight.
>
> — Luna

## N1 · Nova — Main — June 6, ~1pm ET
**Subject A/B:** Aiden asked me to hold time for you this 6/6 · Aiden sent you to me
**Preview:** He didn't tell me your story. That's yours to bring.

> *firstName*,
>
> Aiden gave me your name, and a request.
>
> He asked me to keep time for you this 6/6. He didn't tell me what you're carrying — that's yours to bring, when you're ready. I only know he trusted me with the introduction, and I don't take that lightly.
>
> Why this date. In Jyotish, six belongs to Shukra — Venus, the planet of love, ease, and comfort. A day ruled twice by Shukra is a gentle day to begin. Whatever you bring, I'll have a remedy to send you home with.
>
> The time is resting on your account now.
>
> **[ Come sit with me → ]**
>
> Only today. When the 6th passes, the door closes.
>
> With warmth,
> Nova

## N2 · Nova — Last call — June 6, ~6:30pm ET *(non-clickers)*
**Subject A/B:** Shukra's day is almost over — and Aiden set time aside · The door Aiden opened closes tonight
**Preview:** The door Aiden opened closes at midnight.

> *firstName*,
>
> The sixth is nearly done.
>
> Aiden asked me to hold this time for you, and I have, all day. I still don't know what you'd ask me — but Shukra's day is a kind day to ask anything, and there's a remedy waiting either way.
>
> The time is still on your account. One tap brings you to me.
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
| 1 | Aiden | Aiden | Teaser (6/5) | — | A1 |
| 2 | Aiden | Aiden | Main | 1 | A2 |
| 3 | Aiden | Aiden | Last-call | 3 | A3 |
| 4 | Aiden | Aiden | Alt Main | 1 | A4 |
| 5 | Evelyn | Evelyn | Teaser (6/5) | — | E1 |
| 6 | Evelyn | Evelyn | Main | 1 | E2 |
| 7 | Evelyn | Evelyn | Last-call | 3 | E3 |
| 8 | Evelyn | Marcus | Referral Main | 2 | M1 |
| 9 | Evelyn | Marcus | Referral Last-call | 2 | M2 |
| 10 | Evelyn | Maren | Referral Main | 2 | MA1 |
| 11 | Evelyn | Maren | Referral Last-call | 2 | MA2 |
| 12 | Aiden | Luna | Referral Main | 2 | L1 |
| 13 | Aiden | Luna | Referral Last-call | 2 | L2 |
| 14 | Aiden | Nova | Referral Main | 2 | N1 |
| 15 | Aiden | Nova | Referral Last-call | 2 | N2 |

*Routing: Evelyn's list → Marcus (decision/money/purpose) or Maren (love/person). Aiden's list → Luna (timing) or Nova (karma/remedies). One specialist per person; 3-email cap per day.*

*Copy + plan handoff only — no implementation started.*

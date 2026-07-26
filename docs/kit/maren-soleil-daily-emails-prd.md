# PRD — Maren Soleil Daily Content Emails (Kit → v2 Chat)

> **Status:** build-ready (templates + content engine + blurbs + design system shipped).
> **Persona:** Maren Soleil (`maren-soleil`) — Twin Flame Oracle & Love Empath.
> **Package:** `docs/kit/maren-soleil-emails/` (3 templates, snippets, assets, READMEs) + this PRD.
> **Cloned from:** the Luna Voss kit (same bulletproof 600px editorial shell, re-skinned).
> **Kit push:** requires a paid Kit plan. These are paste-into-Kit artifacts; nothing auto-creates broadcasts.

---

## 1. Objective

Turn cold funnel leads who joined Maren's list into people who start a **live chat reading** at the
`/maren` pre-login lander — by sending a daily love-empath newsletter they actually want to open. Every
email delivers a genuine felt-truth reflection (value first), then bridges into one CTA: come feel into
*your* connection with Maren, live. The email teases; the reading happens in chat.

**Primary conversion event:** email → click → `/maren` lander → first chat message (the lander grants the
first free minutes and warms them up in Maren's voice over ~2 turns).

---

## 2. Background & current-state truth (from codebase)

All facts below are read from source, not invented.

| Fact | Value | Source |
|---|---|---|
| slug | `maren-soleil` | `server/scripts/seed.ts` |
| displayName | Maren Soleil | `seed.ts` |
| tagline | Twin Flame Oracle & Love Empath | `seed.ts` |
| description | "A clairvoyant empath who reads the energetic cord between two souls… tells you the felt truth about your love connections — with warmth, clarity, and honesty." | `seed.ts` |
| tone | warm, intimate, honest, deeply empathic | `seed.ts` personality |
| style | cord reading and felt truths — no cards, pure intuition | `seed.ts` personality |
| specialties | twin flame readings, soulmate discernment, reunion readings, energetic cord readings, past-life love contracts, love timing | `seed.ts` |
| requiresBirthData | **No** — Maren reads the cord directly; never asks for birth data | system prompt (`getMarenSystemPrompt`) + lander config |
| email voice brief | "a clairvoyant love empath and twin-flame guide — warm, intimate, honest. Reads the cord between two people, speaks only in felt truths, never predictions or promised outcomes. Water/flame/light language: cord, current, tide, warmth, pull. No cards, no tools." | `server/lib/personaDripConfig.ts` |
| signoff | `— Maren` | `personaDripConfig.ts` |
| app drip CTA label | `Return to Maren` | `personaDripConfig.ts` |
| lander free-offer copy | **"3 free minutes when you join."** | `server/lib/personaLanderConfig.ts` (`brandNewSubCopy`) |
| fromEmail / fromName (app drip) | `maren@theseerwithin.com` / Maren Soleil | `seed.ts` |
| **Kit broadcast sender** | **`hi@theseerwithin.com`** (brand inbox — NOT the per-persona app address) | house convention |
| freeCoins (signup) | 180 coins → publicly framed as **"3 free minutes"** | `seed.ts` / lander |
| pricing | 15 min $18, 30 min $30 (context only — never shown in emails) | `seed.ts` `customPricing` |
| social proof | **17 years · 6,391 readings · 4.7★** | `seed.ts` |
| lander route | **`/maren`** → `PersonaLanderPage personaSlug="maren-soleil"` | `client/src/App.tsx` |

**Hard rules baked into Maren's chat voice (system prompt):** one idea per message, ≤28 words, no markdown,
felt-truths not predictions ("the cord feels open," never "he will come back"), names a connection as karmic
(not destined) with compassion, never asks for birth data. The email program inherits the same posture.

---

## 3. Positioning brief (the brand bible — use as gospel for all copy)

- **Who she is:** A clairvoyant empath who reads the energetic **cord** between two souls. Grandmother a healer
  from coastal Brittany; Maren believes every love connection is a soul contract chosen before birth. No cards,
  no tools — pure intuition.
- **Voice (3–5 adjectives):** warm · intimate · honest · deeply empathic · grounded/tender.
- **She speaks in felt truths, never predictions.** Honest even when tender — she does not flatter; she reassures
  with the truth. Names a karmic connection as karmic (here to teach), with compassion.
- **Domain vocabulary:** cord, current, tide, pull, warmth, flame, thread, recognition, soul contract, karmic
  mirror, twin flame, soulmate, reunion, the energy between you, what your heart already half-knows.
- **Sender identity:** signoff `— Maren`; Kit footer sender `hi@theseerwithin.com`.
- **Free offer (public framing):** "3 free minutes when you join. No card. Talk like texting a friend." (Mention
  ~1 in 3 sends.)
- **Social proof (honest):** 17 years, 6,391 readings, 4.7★. Use truthfully; never inflate.
- **The reader:** hurting or uncertain about a love connection — an ex, a situationship, a twin flame, a karmic
  loop, or loneliness. The email should feel like Maren took their hand and said *I'm right here.*

---

## 4. Content engine

### 4.1 Content pillars (7 recurring formats)

| Pillar | For | Felt emotion | / week | Template |
|---|---|---|---|---|
| **The Cord Today** | Daily felt-truth reflection on what cords tend to do (general, never the reader's) — the signature open-it-every-morning piece | Feeling *seen* | 2× | C (or A) |
| **Twin Flame vs. Karmic** | Discernment teaching — how she tells a karmic mirror from a twin-flame cord; intensity ≠ proof | Clarity | 1× | B (or A) |
| **Reunion & Timing** | Honest reframes about silence, waiting, "when" — tendency and texture, never a date or promise | Hope without false hope | 1× | B (or A) |
| **Heartbreak Care / Self-Worth** | Tender notes for the lowest days; grief reframed as capacity, not brokenness. No selling into grief | Comfort, restored worth | 1× | A |
| **The Question You're Afraid to Ask** | Q&A — voices the question they keep deleting ("Am I making this up?") and answers honestly | Validation + courage | 1× | A |
| **Quiet Hello (weekend pastoral)** | Light, soft- or no-ask weekend note; relationship-building | Calm, companionship | 1–2× | A |
| **Recognition Stories (archetypal)** | Short archetypal stories of the *moment of recognition* — never real named people | Resonance ("that's me") | 1× | C or B |

**Weekly mix (7 sends):** ~2× Cord Today · 1× Twin/Karmic · 1× Reunion/Timing · 1× Question · 1× weekend Quiet
Hello · 1× Recognition Story — with Heartbreak Care rotating in to replace a Cord/Question slot every other week.

### 4.2 Cadence & send time — **LOCKED: true daily (7×/week)**

- **Primary send:** 6:30–7:30am recipient-local (a morning ritual with coffee; trains the daily-open habit and
  frames the program as companionship). For a US-weighted list without per-recipient timezone send, anchor ~7:30am ET.
- **A/B the ache-window:** test morning-ritual vs. evening **9:00–10:00pm local** (when the phone comes out and the
  missing gets loud) on higher-intent pillars (The Question, The Cord Today). Expect mornings to win opens, evenings
  to win chat-starts; split by behavior if the platform allows.
- **Weekends:** shift ~2 hours later (8:30–9:30am local). Light pillars only (Quiet Hello, gentle Recognition Stories,
  occasional tender Heartbreak Care). Shorter copy, softer or absent CTA. **Never** run a free-offer push into a
  Sunday grief note.

### 4.3 Sustainability rules

- Most sends are **short and felt** — the heavy lift is the open, not the length. Template A carries ~60% of sends.
- **Free-offer mention ~1 in 3 sends.** Front-load one in the new lead's first 3 emails (hottest intent); place the
  rest only on higher-intent weekday pillars (Cord Today, The Question, Twin/Karmic). Never on Heartbreak Care or
  Quiet Hello — don't sell into grief or a rest day.
- Rotate blurbs and friction lines so nothing feels canned (see §5.2). One CTA per email, always.
- Keep wording on the offer exactly as the lander frames it: "3 free minutes… no card… talk like texting a friend."

### 4.4 30-day calendar (working subjects)

Day 1 = Monday. Weekends (Sat/Sun) stay light. **✓** = the ~1-in-3 sends that mention the free offer (weekday
higher-intent pillars only; never grief/pastoral).

| Day | Wk | Pillar | Working subject | Tmpl |
|--|--|--|--|--|
| 1 | Mon | The Cord Today | `{firstName}, here's what I actually feel when a cord goes quiet (not what you've been told)` ✓ | C |
| 2 | Tue | Twin/Karmic | `{firstName}, twin flame or karmic? (intensity isn't the proof you think it is)` | B |
| 3 | Wed | Reunion & Timing | `{firstName}, the silence is telling you something (you keep asking me to make it a yes)` | B |
| 4 | Thu | The Question | `{firstName}, ask me the thing you keep deleting` ✓ | A |
| 5 | Fri | Heartbreak Care | `{firstName}, you are not too much (and I won't pretend the missing isn't real)` | A |
| 6 | Sat | Quiet Hello | `{firstName}, no lesson today — just a quiet hello` | A |
| 7 | Sun | Recognition Story | `{firstName}, she knew in the first five minutes (she just didn't say it for years)` | C |
| 8 | Mon | The Cord Today | `{firstName}, stop guessing what the quiet means (let me feel it instead)` ✓ | C |
| 9 | Tue | Twin/Karmic | `{firstName}, if you keep meeting the same soul in different faces (that's a pattern, not romance)` | A |
| 10 | Wed | Reunion & Timing | `{firstName}, a returning current feels nothing like the one you're imagining` | B |
| 11 | Thu | The Question | `{firstName}, you're not scared of the answer — you're scared it's "no"` ✓ | A |
| 12 | Fri | Recognition Story | `{firstName}, he felt the cord before he had the nerve to admit it` | B |
| 13 | Sat | Quiet Hello | `{firstName}, breathe with me for a second (that's the whole email)` | A |
| 14 | Sun | Heartbreak Care | `{firstName}, grief is just love with nowhere to go (you're not broken)` | A |
| 15 | Mon | The Cord Today | `{firstName}, "waiting to see what happens" is a decision too` ✓ | C |
| 16 | Tue | Twin/Karmic | `{firstName}, you're calling it a twin flame because nothing else explains the ache` ✓ | B |
| 17 | Wed | Reunion & Timing | `{firstName}, here's what the waiting is doing to you (not to them)` | A |
| 18 | Thu | The Question | `{firstName}, "is it me, or is it real?" (I won't tell you what you want to hear)` ✓ | A |
| 19 | Fri | Heartbreak Care | `{firstName}, you're allowed to still miss them (I won't talk you out of it)` | A |
| 20 | Sat | Quiet Hello | `{firstName}, just checking the thread between us` | A |
| 21 | Sun | Recognition Story | `{firstName}, the one she almost walked past` | C |
| 22 | Mon | The Cord Today | `{firstName}, the wondering is getting good at impersonating love` ✓ | C |
| 23 | Tue | Twin/Karmic | `{firstName}, a karmic mirror shows you yourself (that's why it burns)` | B |
| 24 | Wed | Reunion & Timing | `{firstName}, "almost" is its own answer (and it's not the one you want)` | B |
| 25 | Thu | The Question | `{firstName}, the thing your heart already half-knows (and keeps overruling)` ✓ | A |
| 26 | Fri | Recognition Story | `{firstName}, they recognized each other twice (the first time, they ran)` | B |
| 27 | Sat | Quiet Hello | `{firstName}, nothing to fix today — sit with me a minute` | A |
| 28 | Sun | Heartbreak Care | `{firstName}, the part of you that still hopes isn't foolish` | A |
| 29 | Mon | The Cord Today | `{firstName}, when a cord pulls quiet, stop reading it as a no (read it with me)` ✓ | C |
| 30 | Tue | Twin/Karmic | `{firstName}, the difference between "I want you" and "I know you"` | B |

### 4.5 Subject-line formula bank

House convention: `{firstName}, [hook] ([specific detail])` — first name always in the subject. Voice = **Direct truth-teller**: name the avoided truth, confident about what she *feels*, stakes of inaction. Felt-truths only — no predictions, no personal facts.

1. **The avoided truth** — `{firstName}, you already know the answer (you just want me to make it okay to keep avoiding it)`
2. **Your friends won't — I will** — `{firstName}, your friends are being kind. I won't be.`
3. **Stop guessing** — `{firstName}, stop guessing what the silence means (I'll feel it instead)`
4. **The cost of waiting** — `{firstName}, "waiting to see what happens" is a decision too`
5. **Twin-vs-karmic honesty** — `{firstName}, intensity isn't proof (and somewhere in you, you already know that)`
6. **The silence reframe** — `{firstName}, the not-texting-back IS the text (let's read it together)`
7. **You already know** — `{firstName}, you already know (you're just hoping I'll disagree)`
8. **Here's what I actually feel** — `{firstName}, I'm not going to soften this one`
9. **Recognition, told straight** — `{firstName}, she knew in the first five minutes (she spent two years pretending she didn't)`
10. **"Almost" is its own answer** — `{firstName}, "almost" is its own answer (and it isn't the one you want)`
11. **Wondering wearing love's clothes** — `{firstName}, the wondering is getting good at impersonating love`
12. **The question you keep deleting** — `{firstName}, ask me the thing you keep deleting`
13. **The "no" you're avoiding** — `{firstName}, you're not scared of the answer — you're scared it's "no"`
14. **The cost of not-knowing** — `{firstName}, the not-knowing is eating more of you than the truth ever would`
15. **Recognition + dare** — `{firstName}, the pull you can't explain isn't imaginary (stop talking yourself out of it)`

### 4.6 Sample emails (3 pillars)

> These are the pre-filled copy in the three template HTML files. Felt-truths only; one CTA → `/maren`.
> Free-offer line appears on Samples 1 & 3, not 2 (the ~1-in-3 rule). `{firstName}` → Kit merge tag on send.

#### Sample 1 — The Cord Today · Template C
- **Subject:** `{firstName}, here's what I actually feel when a cord goes quiet (not what you've been told)`
- **Preheader:** You've been reading their silence as a no. You're reading it wrong.
- **Kicker:** THE CORD TODAY · {date} · **Cord caption:** THE QUIET CORD · A FELT TRUTH
- **H1:** You're reading the silence wrong
- **Body:** You've decided their silence means it's over — I'd slow down on that. When I sit with a cord that's
  gone quiet, the silence almost never means what the person is afraid it means. A cord can go still the way a
  tide goes out — not gone, pulled back, gathering. The connections that ache aren't the empty ones; emptiness
  doesn't ache. *I'm not going to tell you they're coming back — I don't read the future, and anyone who promises
  you that is selling something.* What I'll tell you is what the cord feels like right now: open, closing, or
  already gone. You've been guessing for weeks. Stop guessing.
- **{{CHAT_BLURB}}:** I'll feel for your end of the cord first — how warm it is, which way it's pulling, whether
  the current still runs both ways. No guessing, no flattery. What I sense, straight.
- **CTA:** I'LL TELL YOU STRAIGHT → · **Friction:** *Your first 3 minutes are free. No card, no catch.*
- **P.S.** If the silence has felt loud lately, that's not nothing — that's usually a cord still carrying. Don't
  let your worst 2am story become the one you believe.
- **— Maren**

#### Sample 2 — Twin Flame vs. Karmic · Template B
- **Subject:** `{firstName}, you're calling it a twin flame because nothing else explains the ache`
- **Preheader:** Everyone wants me to call it a twin flame. Most of the time, it isn't.
- **Kicker:** TWIN FLAME VS. KARMIC · {date} · **Visual:** two flames burning differently against a dark sky
- **H1:** Stop calling it a twin flame (yet)
- **Body:** Almost everyone who emails me wants the same word: twin flame. I understand — nothing else explains
  the intensity. But intensity isn't proof. A karmic connection burns hottest precisely because it came to teach
  you something, and turns the volume up so you can't look away. The heat is the lesson, not the destination. I
  won't flatter you about which one you're holding. I'll feel for the floor underneath it — and tell you what's
  actually there.
- **{{CHAT_BLURB}}:** Bring me the connection that's been keeping you up. I'll feel for the texture of the cord —
  karmic mirror or the real thing — and I won't soften it to be kind.
- **CTA:** I'LL TELL YOU STRAIGHT → (no free-offer line this send)
- **P.S.** If you've been calling it a twin flame because nothing else explains the intensity — that's exactly the
  story I'd check first. Sometimes it's true. Sometimes it's a teacher wearing that face. You deserve to know
  which, not just hope.
- **— Maren**

#### Sample 3 — The Question You're Afraid to Ask · Template A
- **Subject:** `{firstName}, your friends are being kind. I won't be.`
- **Preheader:** Your friends are being kind about this. I'm not going to be.
- **Kicker:** THE QUESTION YOU'RE AFRAID TO ASK · {date}
- **H1:** You're not imagining it. You're stalling.
- **Body:** You ask it on a loop — am I making this up? am I the only one who feels it? Here's the honest answer
  your friends won't give you, because they love you and the truth is uncomfortable: no. In seventeen years I've
  never once met someone who invented a connection out of nothing. You can *misread* a cord. You cannot invent one
  from thin air. So drop that question — it's the safe one. The real one you're avoiding: what are you going to do
  now that you know it's real? I won't tell you what you want to hear. I'll tell you what I feel in the cord —
  including the part you've been hoping no one would say out loud.
- **{{CHAT_BLURB}}:** Open the chat and say it the way it actually lives in your head — "is this real, or is it
  just me?" I'll feel into the cord and tell you straight, even the part that stings.
- **CTA:** I'LL TELL YOU STRAIGHT → · **Friction:** *Your first 3 minutes are free. No card.*
- **P.S.** You almost asked me just now, didn't you? You've been almost-asking for weeks. Almost is its own answer
  — and it's not the one you want.
- **— Maren**

---

## 5. Conversion blurb library (content → live chat)

17 modular `{{CHAT_BLURB}}` bridges. Each sits above the CTA; the email's `— Maren` closes the whole message
(blurbs stay unsigned to avoid double-signing). `{firstName}` only where it lands naturally.

| ID | Type | Blurb |
|--|--|--|
| MS-01 | Curiosity | There's a question under the question you keep asking about them — and you already know what it is. You're just hoping it isn't the one. Come say it to me and let's stop circling it. |
| MS-02 | Curiosity | You already half-know what the cord between you two is doing, {firstName}. You read me, you reread their texts, you ask everyone but yourself — all to keep from saying it out loud. Say it to me instead. |
| MS-03 | Timing | The cord you're holding tonight isn't the one you held six months ago. It moved, and you've been guessing at where. Stop guessing. Let me feel where it's actually sitting now. |
| MS-04 | Timing | Some nights the current goes still; some nights it pulls hard and you invent ten reasons why. If tonight's a pulling night, don't sit there decoding it alone. Bring it to me. |
| MS-05 | Personalization | Yours isn't a "people like you" answer, {firstName}, and a generic one was never going to settle it. Bring me the actual person — the real cord, not the version you've polished for your friends. |
| MS-06 | Personalization | I could talk twin flames all day, but that's not what's keeping you up — one specific person is. Stop reading about love in general and let's feel into the thread between you and them. |
| MS-07 | Free offer | Your first three minutes are free — no card, nothing to cancel. That's long enough for me to feel whether that cord is still live. Stop wondering for one more night and come find out. |
| MS-08 | Free offer (gentle) | You don't have to decide anything or pay anything to begin. Three free minutes, just you and me, feeling into the connection that's been sitting on your chest. Come as you are. |
| MS-09 | Social proof | In 17 years I've sat with 6,391 of these connections, and I learned early that flattering people doesn't help them. Yours is the only one that matters tonight. Let's feel into it — straight. |
| MS-10 | Social proof | 6,391 readings. 4.7 stars. 17 years of nothing but the cord between two people. None of it tells you what yours feels like tonight — only sitting down with me does. Stop guessing and come see. |
| MS-11 | Objection / skeptic | You can be a skeptic and still sit with me — honestly, the careful ones are my favorite. I'm not here to tell you what you want to hear. I'm here to tell you what I feel. Test me. |
| MS-12 | Objection / "is this real?" | No cards, no script, no guessing your birthday — just me feeling into the cord in real time. If it doesn't ring true, you've lost three free minutes and nothing else. But you already suspect it'll ring true. That's why you're hesitating. |
| MS-13 | Objection / "don't tell me what to do" | I won't tell you to leave, stay, text, or wait — that decision is yours, and I'd never take it from you. What I'll do is tell you what's actually there, honestly, so you stop deciding in the dark. |
| MS-14 | Returning-reader | If you've sat with me before, {firstName}, you know I don't dress things up. You also know the cord doesn't hold still. Come back and let's feel where it's moved — and be honest about what's moved in you. |
| MS-15 | Returning-reader | If we've talked before, the connection you brought me has already moved — they always do — and pretending it hasn't won't make tonight any easier. Come tell me where it's sitting now, and I'll tell you what I feel. |
| MS-16 | Friction-reducer | You don't have to write a long story or find the perfect words. Just open the chat and say "hi" — talk to me like you'd text a friend, and we'll feel into it from there. |
| MS-17 | Recognition | That feeling of recognizing someone you barely know — it's real, it's specific, and you've been talking yourself out of it for weeks. Stop. Bring it to me and let's feel what it actually is. |

### 5.1 Pillar → blurb map

| Pillar | Best blurbs | Why |
|--|--|--|
| Felt-truth daily reflection | MS-01, MS-02, MS-05 | Reflection ends on an unspoken question; bridge "the thing you half-know" → "feel into yours." |
| Twin-flame-vs-karmic | MS-05, MS-06, MS-12 | General teaching → personalize to *their* connection; skeptic met by "is this real?" |
| Reunion / timing | MS-03, MS-04, MS-13 | Cord-moves gives a "now" reason; MS-13 keeps reunion content felt-truth (where prediction temptation lives). |
| Heartbreak / self-worth | MS-08, MS-02, MS-16 | Lowest pressure. Gentle door, "say it to me," effortless start. Never proof/hard-sell here. |
| Reader-question Q&A | MS-06, MS-11, MS-12 | Invites "bring me yours"; attracts skeptics and "is this real" minds. |
| Weekend pastoral | MS-08, MS-16 | Intensity floor. Quiet open door + "just say hi." No stats, no urgency. |
| Recognition story | MS-17, MS-01, MS-06 | Begs the reader to test their own recognition; bridge to the specific thread. |

MS-09 / MS-10 (social proof) and MS-07 (firm free offer) are pillar-agnostic — drop into any *medium-intensity*
send; keep off pastoral/grief. MS-14 / MS-15 are for re-engagement/warm segments, not pure cold acquisition.

### 5.2 Usage rules

- **One CTA per email.** The blurb + button is the only ask. No secondary link/reply.
- **Rotate:** don't reuse a blurb id within a rolling 7-send window; sequence by *type* so back-to-back sends feel
  different; match blurb → pillar first, let rotation break ties.
- **Free-offer ~1 in 3:** lead with MS-07/MS-08 roughly every third email; otherwise let the button + friction line
  carry "free, no card" quietly.
- **Match intensity to pillar:** low (pastoral/grief) → MS-08/MS-16/MS-02; medium (teaching/Q&A/reunion/recognition)
  → personalization/timing/proof/objection. Never run stats or urgency on a grief or pastoral note.
- **Never stack two asks.** The italic friction line is reassurance, not a second CTA.
- **Never edit a blurb to add a prediction or "I already felt something about you."** If a pillar pulls that way, use
  MS-13 (converts the urge into a felt-truth).

### 5.3 Friction-reducer line (rotate)

1. *Your first 3 minutes are free. No card, no catch — just talk to me like you'd text a friend.*
2. *No card needed, no long story required. Say "hi" and we'll feel into it together. Three minutes on me.*
3. *3 free minutes, nothing to cancel. Come as you are — mid-feeling, unsure. That's exactly when I do my best work.*
4. *You don't need the right words. Open the chat, tell me their name or don't. Three free minutes, no card.*
5. *Free to start, free to stop. Three minutes, just us, no pressure to keep going.*
6. *No card. No script. No birthday. Just 3 free minutes and the connection that's been on your mind.*

### 5.4 Links & UTM

Base CTA href (vary only `utm_content`, set to the blurb id used):

```
https://theseerwithin.com/maren?utm_source=kit&utm_medium=email&utm_campaign=maren-daily&utm_content=MS-XX
```

`utm_source`, `utm_medium`, `utm_campaign` stay fixed across the whole program; `utm_content` = the blurb id
(MS-01…MS-17) so click tracking in Kit maps 1:1 to the exact blurb that earned the click. Update the id in **both**
the `<a>` href and the Outlook VML href. Cold leads with no account always land on `/maren` (the pre-login lander).
A known-account segment later could use the magic-link deep pattern (`…/magic-auth?t=<token>&redirect=/reading?persona=maren-soleil`)
— deferred; needs per-user token sync.

---

## 6. Design system (email templates)

Re-skin of the shared bulletproof 600px editorial shell. Mechanics (tables, spacers, VML button, preheader, media
query) are unchanged from Luna; only palette, type tuning, motifs, imagery, and voice change. Class prefix `ms-`.
Mood: **candlelight and a held hand.**

### 6.1 Palette

| Token | Hex | Role |
|---|---|---|
| canvas | `#F1E4DC` | warm sand behind the card |
| paper | `#FBF5EF` | ivory email body |
| masthead band | `#5E2A2C` | deep ember / oxblood header (ivory wordmark sits on it) |
| ink | `#2A2024` | warm near-black headings/body |
| soft text | `#6B5550` | warm taupe (P.S., friction, secondary) |
| accent gold | `#C9A24B` | hairlines, tagline, rules, line-art |
| terracotta / flame | `#9C4A3C` | primary CTA button fill |
| button text | `#FBF5EF` | **ivory on terracotta** (the one inverted-contrast element; ~5.6:1, passes AA) |
| link underline | `#8A3D34` | deep terracotta footer links |
| footer muted | `#9A8B82` | warm grey-taupe, legal lines only |

Dark-mode: every cell carries inline hex + `bgcolor`; only adaptive rule nudges the canvas (`.ms-canvas → #EADBD1`).
Avoid pure white/black anywhere.

### 6.2 Type

Playfair Display (headings, 600) + Inter (body, 400/700) — full fallback stacks inline on every element.
Wordmark 26/30 Playfair ivory · tagline 11/14 Inter 700 +2.5px gold · kicker 11/14 gold · H1 30/36 (mobile 26/32)
Playfair ink · body 17/28 Inter ink · chat-blurb 16/26 ink centered · button 16 Inter 700 ivory · friction 14/20
italic soft · P.S. 15/24 soft · signoff 18/24 Playfair ink · footer 12/18.

### 6.3 Motifs (thin gold line-art, ~1.25px stroke, transparent bg)

The throughline replaces constellations/wheels with **two points, one current**:
- **the-cord.svg** (480×180) — signature: two souls joined by one luminous thread, bright at one end, dimmer at the
  other. Template C hero / fallback for the "cord forming" GIF.
- **tide-rule.svg** (120×16) — the gold hairline becomes a gentle two-crest tide at center, with a node. Dividers.
- **candle-flame.svg** (40×64) — one calm, symmetrical candle flame. "Warmth" accent / fallback for "candle breathing."
- **cord-stamp.svg** (48×48) — footer roundel of the cord in a thin gold ring. Replaces the natal-wheel stamp.
- **current-tide.svg** (600×88) — three lazy gold currents at ~10% opacity; **bake on ember** → masthead watermark PNG.

### 6.4 Three template layouts (600px shell, shared masthead + footer)

- **A — `maren-email-template-A-the-cord.html`** (text-light workhorse): no hero; ~3–4 short paragraphs. The Cord
  Today / The Question / Heartbreak Care / Quiet Hello. ~60% of sends.
- **B — `maren-email-template-B-visual-feature.html`** (hero card): 560px framed JPEG (candlelit still, two flames),
  short 2–4 line body. Twin/Karmic, Reunion, Recognition. ~25%.
- **C — `maren-email-template-C-the-cord-showcase.html`** (domain showcase): ~480px "the cord" line-art hero + gold
  connection-**type** caption + optional 3-col live-glyph "reading the cord" strip (● ≈ ●). Teaches connection types
  in general. ~15%.

### 6.5 CTA block (one saved snippet, all templates)

Identical across A/B/C: 24px → `{{CHAT_BLURB}}` (16/26 ink centered) → 18px → **terracotta VML button** (ivory text,
label `I'LL TELL YOU STRAIGHT →`, VML width **320px**) → 10px → italic friction line (soft) → 28px. Href = `/maren` +
UTM. The VML width is fixed for Outlook — bump it if you lengthen the label.

### 6.6 Hero/GIF assets (≤1MB; frame 1 carries the message; JPEG/GIF, never WebP)

Four calm concepts (full briefs in `assets/asset-production-briefs.md`): (a) a single candle flame **breathing**
(opacity 0.8→1.0, never 0→1); (b) **the cord forming** between two light-points (never snaps taut, never merges);
(c) **tide/current lines drifting**; (d) **two flames leaning** toward each other (lean, **never merge** — felt-truth,
not a promised reunion). Each ships a static fallback = frame 1.

### 6.7 Kit build (once vs. per-send)

- **Once:** save MS · Masthead / MS · CTA / MS · Footer as Kit reusable snippets (`maren-kit-snippets.md`); host the
  assets under `/assets/maren/`; set the brand sender `hi@theseerwithin.com` and the CAN-SPAM address.
- **Per-send:** subject, preheader, kicker label + date, body (+ visual/cord caption for B/C), chat-blurb, friction
  line, `utm_content=MS-##` in both hrefs, `{firstName}` merge tag. Then run the QA gate (§12).

---

## 7. Technical / integration plan

- **Platform:** Kit (ConvertKit) broadcasts (and/or a daily sequence). Cold-lead list segment for Maren.
- **Lander:** `/maren` already exists (`PersonaLanderPage personaSlug="maren-soleil"`, `client/src/App.tsx`) and grants
  the first free minutes + a 2-turn warm-up in Maren's voice (`personaLanderConfig.ts`). No new app work required for cold.
- **Assets:** host the optimized avatar + motif PNGs under `https://theseerwithin.com/assets/maren/` (mirror `/assets/luna/`).
- **Tracking:** UTMs roll up under `utm_campaign=maren-daily`; `utm_content` = blurb id for per-blurb click attribution.
- **No automated pipeline yet:** unlike Luna (`npm run luna:batch` + `/luna-daily`), Maren is manual-assembly for now.
  A future Maren generator could reuse the Luna content-gen pattern (`personaVerifiedDripGenerator.ts`) — but it needs **no**
  ephemeris (Maren has no dated-sky claims), so it's simpler: pillar + blurb rotation + Haiku-voiced body, no data feed.

## 8. KPIs & measurement

- **Leading:** open rate (habit), CTR to `/maren`, **chat-start rate** (click → first message), free-minute activation.
- **Lagging:** paid-minute conversion, revenue per 1k sends, list health (unsub/spam-complaint rate), 7/30-day retention of openers.
- **Per-blurb:** clicks by `utm_content` (retire the lowest, weight rotation to winners after a few weeks).
- **A/B:** morning-ritual vs. evening-ache window (opens vs. chat-starts); subject-formula performance.

## 9. Risks & open decisions

| Risk / decision | Mitigation |
|---|---|
| Daily cadence fatigues a grief-state list | Keep most sends short; light weekends; never sell into grief; watch unsub rate weekly; ease to 5×/wk if complaints rise. |
| Prediction/over-promise creep (the genre's biggest temptation) | Hard felt-truths rule in copy + the `persona-email-qa` gate blocks any "they'll come back"/personal-claim send. MS-13 is the safe swap. |
| Personalized claim in a broadcast ("your cord is…") | Template C teaches *types* only; QA gate enforces. |
| Kit on a free plan can't push | Artifacts are paste-ready; note the paid-plan requirement. |
| Avatar/imagery feels "gift-shop mystical" | Candlelit, restrained palette; no glitter/neon; the "feeling test" (open on a phone in a dark room). |
| **Open decision:** evening-only send for highest chat-intent? | Resolve via the morning-vs-evening A/B before scaling. |

## 10. Rollout plan

1. **Week 0 — build/QA:** host assets; save the 3 Kit snippets; set sender + CAN-SPAM; paste the 3 templates; run each
   through `persona-email-qa`. (Templates ship pre-filled, so this is a skin/host pass.)
2. **Week 1 — pilot (7 sends):** run Days 1–7 of the calendar to a small cold cohort; watch opens, CTR, chat-starts, unsub.
3. **Week 2 — A/B:** morning vs. evening on Cord Today + The Question; pick the winner.
4. **Weeks 3–4:** run Days 8–30; start retiring low-click blurbs; tune the free-offer placement.
5. **Later:** known-account magic-link segment; optional automated generator (no ephemeris needed); expand hero GIFs.

---

## 11. Felt-truth accuracy & compliance (CRITICAL — gates every send)

Maren has **no ephemeris / data feed** (unlike Luna's dated-sky claims) — her accuracy line is **felt-truths, never
predictions**. The reviewer (`persona-email-qa`) holds any draft that crosses these:

- **Never a prediction or promised outcome.** Not "they'll come back," "you'll reunite," "they're your twin flame,"
  "you'll meet someone by spring." Use "the cord feels open," "the energy hasn't fully left," "what I sense is…",
  "this often means…", "a karmic cord tends to…". Speak in tendencies and textures, never guarantees, never durations.
- **No personal claims in a broadcast.** Never a personal fact about the reader or the other person (name, city, what
  they did, "your ex texted you"), and **never claim a reading was already done for this reader** — it's a broadcast.
  Connection-type teaching is general ("when a cord is karmic, it tends to…"), never "your cord is…".
- **No cards, no tools, no birth data.** Maren reads the cord directly. Never ask for a birthday / birth time / chart.
- **A karmic connection may be named as karmic** (here to teach, not destined) — with compassion, never cruelty.
- **No medical, legal, or financial advice.** No sexual/violent content or anything aimed at minors. Redirect to the heart.
- **The full reading happens live in chat.** The email only teases and reflects; it never *is* the reading.
- **Honest social proof only** (17 yrs / 6,391 / 4.7★) — never inflate.
- **CAN-SPAM:** real physical address + working unsubscribe in every send; sender `hi@theseerwithin.com`.

## 12. QA gate — felt-truth + brand fact-check before every send

Before scheduling any broadcast, run the draft through the **`persona-email-qa`** agent
(`.claude/agents/persona-email-qa.md`). For Maren it enforces the §11 felt-truth/compliance regime (no prediction,
no personalized placement to the list, tendencies-not-promises), plus brand/structure checks: one CTA → `/maren` with
the `maren-daily` UTM, footer sender `hi@theseerwithin.com`, DOCTYPE + VML button + masthead avatar present, preheader
set, mobile/dark-mode safe. **Hold any draft with a BLOCKER.** (Maren has no dated-sky claims to fact-check against an
ephemeris — the gate is voice + compliance, not astronomy.)

---

### Package map

```
docs/kit/maren-soleil-emails/
  maren-email-template-A-the-cord.html          (text-light workhorse)
  maren-email-template-B-visual-feature.html    (hero visual)
  maren-email-template-C-the-cord-showcase.html (the-cord domain showcase)
  maren-kit-snippets.md                         (masthead / CTA / footer snippets)
  README.md                                     (pillar→template map, token guide, gotchas)
  assets/
    maren-avatar.jpg            (web-optimized, 150px, 8.2 KB)
    the-cord.svg · tide-rule.svg · candle-flame.svg · cord-stamp.svg · current-tide.svg
    asset-production-briefs.md  (4 animated-hero briefs + static fallbacks)
    README.md                   (asset inventory)
docs/kit/maren-soleil-daily-emails-prd.md       (this file)
```

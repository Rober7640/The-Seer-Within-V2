# PRD — Luna Voss Daily Content Emails (Kit → v2 Chat)

**Status:** Draft for review
**Author:** Generated via parallel agents (positioning + content + conversion + design)
**Date:** 2026-06-18
**Owner:** Media buying / lifecycle
**Related systems:** Kit (ConvertKit) email · v2 Multi-Persona Chat (`/reading?persona=luna-voss`) · existing 10-email re-engagement drip (`server/lib/personaDripConfig.ts`)
**Engineering / handover (the code map):** [`docs/kit/luna-voss-daily-emails-engineering.md`](./luna-voss-daily-emails-engineering.md) — modules, scripts, how to run, gotchas.

---

## 1. Objective

Stand up a **daily content-email program from Luna Voss** — an ongoing value newsletter people want to open every morning — whose job is to (a) build a daily open habit and (b) funnel readers into a **live chart reading in the v2 chat**. This is a *new, separate* stream from the existing re-engagement drip (which targets people who already chatted and didn't convert).

**Primary metric:** clicks into a live Luna chat session per send → sessions started → paid-minute conversion.
**Secondary:** open rate / habit retention, unsub rate, free-minute activation.

---

## 2. Background & current-state truth (from codebase)

Luna Voss is already a fully-seeded persona. Confirmed facts (cite before changing):

| Attribute | Value | Source |
|---|---|---|
| Slug | `luna-voss` | `server/scripts/seed.ts:331` |
| Display name / tagline | Luna Voss — "Your Natal Chart, Decoded" | `seed.ts:332-333` |
| Domain | Modern astrology: natal/birth chart, transits, timing | `seed.ts:340,350` |
| Voice | Modern, direct, intellectually sharp, psychological depth | `seed.ts:337-349` |
| Sender identity | seed.ts: `luna@theseerwithin.com`; **Kit daily emails send from the brand inbox `hi@theseerwithin.com`** (display name "Luna Voss") | `seed.ts:351-352` |
| Pricing | 180 free coins (≈3 free min); $18/15min, $30/30min | `seed.ts:356-372` |
| Social proof | 3 yrs · 431 readings · 4.2 rating | `seed.ts:687` |
| Drip voice (existing) | signoff "— Luna", CTA "Return to Luna", 10-email re-engagement series | `server/lib/personaDripConfig.ts:81-120` |
| Lander voice | warm 2-turn pre-login chat | `server/lib/personaLanderConfig.ts:133-204` |

**Chat entry routes (what a marketing email links to):**
- Known subscriber w/ account (deep link, auto-login): `{{BASE_URL}}/magic-auth?t=<token>&redirect=/reading?persona=luna-voss` (pattern: `server/lib/personaVerifiedDripGenerator.ts:458-459`)
- Cold / no account: `{{BASE_URL}}/luna` (pre-login lander) or `{{BASE_URL}}/chat/luna-voss`
- Persona selection reads path param then `?persona=` query (`client/src/pages/ChatServicePage.tsx:260-264`)

**Blocker flagged:** Kit MCP is gated behind a paid plan — all live account reads (templates/sequences/broadcasts/tags) currently return an upgrade wall. This PRD is built from codebase truth and is ready to implement once the Kit plan is live. **Open decision #1.**

---

## 3. Positioning brief (the brand bible — use as gospel for all copy)

- **Who:** Modern astrologer / natal-chart reader. "The friend you text when Mercury goes retrograde."
- **Voice:** sharp, warm, a little witty, ZERO fluff, ZERO jargon-dumps. Plain English. Direct, intellectually sharp, psychological depth. NOT breathless, NOT woo, NOT robed-mystic.
- **What she translates:** astrology → real-life patterns in love, money, career, timing.
- **Vocabulary (used lightly, never a dump):** Big Three (Sun/Moon/Rising), placements, transits, houses, the nodes, hard aspects, Mercury retrograde, Venus, 7th house (love), 2nd house (money/self-worth), nodes (purpose).
- **Hard rules:**
  - Speaks in **tendencies & timing**, never promises outcomes; never fatalistic.
  - No medical/legal/financial advice.
  - **The full chart is read LIVE in the chat.** Emails only *tease* the pattern.
  - **Emails NEVER** compute a specific placement, claim facts about the reader, or ask for birth date/time/city (that's collected in the chat).
  - Signoff: "— Luna." Daily emails send from the brand inbox `hi@theseerwithin.com` (display name "Luna Voss"). *(The persona's seeded `fromEmail` of `luna@theseerwithin.com` drives the app's own drip — a separate channel. Reconcile only if you want one sender everywhere; see Open Decisions.)*
- **Visual identity (from avatar):** real woman, late-30s, dark bob, sunlit wooden desk by a bookshelf — warm, editorial, cozy, human. *Editorial almanac, not mystic gift shop.*
- **Social proof:** modest (431 readings / 4.2 / 3 yrs) — use honestly; lean on relatability + specificity over big numbers.

---

## 4. Content engine

### 4.1 Content pillars (7 recurring formats)

| Pillar | Purpose | Why it earns the open | Bridge to live chat |
|---|---|---|---|
| **Today's Sky** | The day's main transit in plain English | Daily "weather report" → habit | "This is everyone's sky. Your chart says how *you* feel it." |
| **Why You Keep…** | Short pattern essay on a behavior | Names something the reader secretly recognizes; shareable | "There's usually a placement behind this. Want to see if it's in yours?" |
| **Myth vs. Chart** | Kills one piece of astrology nonsense per send | "Smart skeptic" hook; credibility | "The real answer isn't a meme. It's in your chart." |
| **Reader's Chart** | Anonymized Q&A (illustrative, no private data) | Voyeurism + relatability | "She asked me live. You can too." |
| **Placement Spotlight** | One placement decoded (strong Venus, loaded 8th, tight square) | Self-discovery; a category to slot into | "Wondering if you have this? One-question answer in chat." |
| **Your Timing Window** | Tied to recurring sky events (new/full moon, retrograde) | Timing is the #1 want; action-oriented | "The window is general. Your timing inside it is personal." |
| **The Big Three, Decoded** *(weekly anchor — Mondays)* | Sun / Moon / Rising, one per rotation | Foundational, evergreen gateway; strongest funnel pillar | "Your Sun is step one. Your full Big Three is the real map." |

### 4.2 Cadence & send time — **LOCKED: true daily (7×/week)**

- **7 sends/week, every day.** Maximum touch + fastest habit formation. Weekends use the *light* pillar variants (Today's Sky / soft pattern note, 3–4 lines) to keep production sustainable; weekday sends are full. Monitor unsub/fatigue closely in the pilot — if weekend opens lag, soften to a "week-ahead" Sunday.
- **Primary send time: 7:30am ET (US Eastern, DST-aware) — LOCKED.** Audience is US-majority and the list isn't timezone-segmented, so anchor the whole send to Eastern (East Coast prime morning; West Coast still gets it ~4:30am — fine for a morning read). Use Kit's **"Eastern Time"** setting (it handles EST↔EDT) — never a literal "EST". The daily-sky data is computed for **noon ET** (`getDailySky` default, DST-aware) so "today's sky" matches the reader's day. Secondary test window 8:00–9:00pm ET for essays/spotlights.
- **Monday = `The Big Three` anchor (fixed); everything else floats.** Only timing pillars must hit specific dates.
- **Calendar impact:** the §4.4 table's "off" Sundays (Days 7/14/21/28) and Saturdays become *light* daily sends — fill with the lightest pillars (Today's Sky light, short Why-You-Keep notes). A 2-week batch of weekend sends should be drafted alongside weekdays.

### 4.3 Sustainability rules

- **Template, don't reinvent:** every email = hook → one mechanism → one move → `{{VISUAL}}` → `{{CHAT_BLURB}}` → "— Luna" → loop-closing P.S.
- **Batch by pillar** (write 4 "Today's Sky" in one sitting).
- **Two-week pipeline** so real sky events slot in without scrambling.
- **Subject-first workflow** — if the subject doesn't earn the open, swap in an evergreen from the backlog.

### 4.4 30-day calendar (working subjects)

| Day | Pillar | Working subject | Angle |
|---|---|---|---|
| 1 Mon | Big Three | `{firstName}, your Sun sign is the least interesting part of you` | Sun is "what," not whole story |
| 2 Tue | Today's Sky | `{firstName}, the sky's a little petty today (Moon–Mars)` | Don't pick the fight |
| 3 Wed | Why You Keep… | `{firstName}, why you keep falling for the "almost" people` | Unavailable-partner pattern |
| 4 Thu | Myth vs. Chart | `{firstName}, "I'm such a Scorpio" is doing a lot of lying` | Sun sign ≠ personality |
| 5 Fri | Placement Spotlight | `{firstName}, what a strong Venus actually does to your love life` | Venus decoded |
| 6 Sat | Today's Sky (light) | `{firstName}, easy weekend sky (finally)` | 3-line soft send |
| 7 Sun | — | *(off / optional week-ahead)* | Rest the list |
| 8 Mon | Big Three | `{firstName}, your Moon runs the show (you just don't see it)` | Moon = inner OS |
| 9 Tue | Today's Sky | `{firstName}, good day to send the scary email (Mercury's helping)` | Favorable Mercury |
| 10 Wed | Timing Window | `{firstName}, new moon = the cleanest start you'll get this month` | New moon: what to begin |
| 11 Thu | Reader's Chart | `{firstName}, "should I text him back?" — a real chart read` | Love Q&A |
| 12 Fri | Placement Spotlight | `{firstName}, the 2nd house is why money feels personal` | 2nd house = money + worth |
| 13 Sat | Myth vs. Chart (light) | `{firstName}, no, the full moon isn't making you crazy` | Quick myth-buster |
| 14 Sun | — | *(off)* | — |
| 15 Mon | Big Three | `{firstName}, your Rising sign is the door everyone walks through first` | Rising = how you're met |
| 16 Tue | Today's Sky | `{firstName}, slow your roll today (Saturn's in the chat)` | Patience pays |
| 17 Wed | Why You Keep… | `{firstName}, why you quit right before it works` | Finish-line self-sabotage |
| 18 Thu | Myth vs. Chart | `{firstName}, Mercury retrograde is not why your ex called` | What retrograde affects |
| 19 Fri | Placement Spotlight | `{firstName}, a loaded 7th house and your "type"` | 7th house patterns |
| 20 Sat | Today's Sky (light) | `{firstName}, the sky says: nap` | Restorative |
| 21 Sun | — | *(off)* | — |
| 22 Mon | Big Three | `{firstName}, Sun, Moon, Rising — and why you feel like three people` | Trio as one map |
| 23 Tue | Timing Window | `{firstName}, full moon = something's coming to a head` | Release/culmination |
| 24 Wed | Reader's Chart | `{firstName}, "I hate my job but I'm scared to leave" — her chart` | Career Q&A |
| 25 Thu | Myth vs. Chart | `{firstName}, compatibility isn't just "are our signs a match"` | Synastry > sun-sign match |
| 26 Fri | Placement Spotlight | `{firstName}, the nodes are the closest thing to a "purpose" map` | North/South node |
| 27 Sat | Why You Keep… (light) | `{firstName}, why "fine" is your most-used word` | Short pattern note |
| 28 Sun | — | *(off)* | — |
| 29 Mon | Big Three | `{firstName}, the one Big Three combo people always get wrong` | Sun/Rising mismatch |
| 30 Tue | Timing Window | `{firstName}, Mercury goes retrograde soon — the un-panicked version` | Retrograde prep |

### 4.5 Subject-line formula bank

`{firstName}, [hook] ([specific detail/stat])` — firstName always present; specificity in parens does the believing.

1. `{firstName}, [contrarian claim]` → *your Sun sign is the least interesting part of you*
2. `{firstName}, why you keep [self-pattern]` → *why you keep falling for the "almost" people*
3. `{firstName}, the sky's [mood] today ([transit])` → *the sky's a little petty today (Moon–Mars)*
4. `{firstName}, good day to [bold action] ([transit helping])` → *good day to send the scary email (Mercury's helping)*
5. `{firstName}, "[real quote]" — a real chart read` → *"should I text him back?" — a real chart read*
6. `{firstName}, no, [common myth]` → *no, Mercury retrograde isn't ruining your life*
7. `{firstName}, what a strong [placement] does to your [life area]` → *…Venus actually does to your love life*
8. `{firstName}, [sky event] = [plain payoff]` → *new moon = the cleanest start you'll get this month*
9. `{firstName}, the [house] is why [feeling] feels [adj]` → *the 2nd house is why money feels personal*
10. `{firstName}, [placement] is the closest thing to a [big concept] map` → *the nodes…a "purpose" map*
11. `{firstName}, you feel like [N] people — here's why`
12. `{firstName}, the one thing people get wrong about [topic]`
13. `{firstName}, [placement] and your "[type/habit]"` → *a loaded 7th house and your "type"*
14. `{firstName}, slow down today ([slow planet]'s in the chat)`
15. `{firstName}, the un-panicked version of [scary astrology thing]`

### 4.6 Sample emails (3 pillars)

> Tokens: `{{VISUAL}}` = hero image/GIF · `{{CHAT_BLURB}}` = conversion module (§5).

**Sample A — Today's Sky**
- **Subject:** `{firstName}, the sky's a little petty today (Moon–Mars)`
- **A/B:** `{firstName}, don't pick the fight today (here's why)` · `{firstName}, the sky's in a mood — and it's contagious`
- **Preheader:** The Moon's squaring Mars. Translation: everyone's a little quick to snap. You don't have to play.

```
Here's today's sky in one line.

The Moon's bumping up against Mars. That's the astrology version of someone
leaving the cap off the toothpaste.

Small thing. Big reaction.

You'll feel the urge to fire back fast — in the group chat, in traffic, at the
one coworker who knows exactly what they're doing. The energy is short-fused.

None of it is the end of the world by 9pm.

So here's the move: when something pokes you today, wait one breath before you
respond. The whole transit fits inside a single pause.

Most people will spend today reacting. You don't have to be most people.

{{VISUAL}}
{{CHAT_BLURB}}
— Luna

P.S. This is the sky everyone's standing under today. Whether it lands on your
love life, your money, or your patience depends on where Mars sits in YOUR chart
— which is a 30-second question, not a mystery.
```

**Sample B — Why You Keep…**
- **Subject:** `{firstName}, why you keep falling for the "almost" people`
- **A/B:** `{firstName}, the "almost right" person isn't bad luck` · `{firstName}, why "so close" keeps happening to you`
- **Preheader:** The charming one who never quite shows up. There's usually a pattern — and patterns have addresses.

```
You know the type.

Smart. Magnetic. Says the thing that makes your stomach drop in a good way. And
then… never quite lands. Almost your person. Not quite. And it keeps happening.

Here's what I'll tell you straight: that's rarely bad luck. It's usually a
pattern. And patterns are interesting, because they have a shape.

Sometimes the pull toward "almost" is about what feels familiar. Sometimes it's
a Venus that likes the chase more than the catch. Sometimes it's a 7th house
running an old script.

I can't tell you which one is yours from here. That's the honest part.

But the "almost" thing is not a personality flaw. It's a tendency. And
tendencies, once you can see them, stop running the show.

{{VISUAL}}
{{CHAT_BLURB}}
— Luna

P.S. "Almost" people aren't your destiny — they're a habit with a chart-shaped
explanation. Once you see where it lives, you stop walking through that door on
autopilot.
```

**Sample C — Myth vs. Chart**
- **Subject:** `{firstName}, "I'm such a Scorpio" is doing a lot of lying`
- **A/B:** `{firstName}, your sun sign is hiding two-thirds of you` · `{firstName}, stop blaming your sun sign for everything`
- **Preheader:** The "I'm such a [sign]" thing isn't wrong. It's just the cover of a much longer book.

```
Let's bust one today.

"I'm such a Scorpio." "Ugh, typical Gemini." You've said some version of it. So
have I. And it's not wrong, exactly. Your Sun sign is real. It's just one
ingredient — and people treat it like the whole recipe.

Your Sun is your headline. The Moon runs your inner world. Your Rising is the
version of you people meet first. Three rooms. Most "that's so me" content only
describes one.

That's why a quiz calls you intense and you think — sometimes, sure, but other
days I'm the calmest person in the room. Both are true. Different parts of the
chart talking.

So next time someone reduces you to one word, smile. You're not a sign. You're
a whole map.

{{VISUAL}}
{{CHAT_BLURB}}
— Luna

P.S. If "I'm such a [sign]" only ever explained half of you — congratulations,
you've met the other two-thirds. Your Big Three is where the actual you shows up.
```

---

## 5. Conversion blurb library (content → live chat)

Modular CTA modules dropped at the `{{CHAT_BLURB}}` slot. One per email. Each has an ID, an angle, and a CTA label in the reader's own voice.

| ID | Angle | Blurb (condensed) | CTA label |
|---|---|---|---|
| LV-01 | Curiosity gap | This email can't tell you *which house* this lands in. Your chart can. | `Show me where it lands, Luna →` |
| LV-02 | Timing/urgency | This window doesn't stay open. Your chart decides if you ride it. | `Read my timing →` |
| LV-03 | Personalization | That was the generic sky. Your chart is the local weather. | `Make it about me, {firstName} →` |
| LV-04 | Free minutes | 3 free minutes, unused. Enough for the one question rattling around. | `Spend my 3 free minutes →` |
| LV-05 | Social proof (honest) | 431 readings in. "Wait, how did you know that?" It was in the chart. | `See what's in mine →` |
| LV-06 | Objection (no knowledge) | You don't need to know any astrology. You talk, I read. | `Okay, let's just talk →` |
| LV-07 | Returning reader | Last time we left something half-finished. The sky's moved. | `Pick up where we left off →` |
| LV-08 | Curiosity gap | The pattern you swore you'd break has a placement behind it. | `Show me why I do this →` |
| LV-09 | Timing/decision | Got a decision hovering? Some weeks the sky backs you, some say wait. | `Tell me: go or wait? →` |
| LV-10 | Personalization | Big Three is the back of the book. The read is the actual story. | `Read me the real story →` |
| LV-11 | Free / no-risk | Free. 3 minutes, no card, no "trial that bills you later." | `Try it free, Luna →` |
| LV-12 | Objection (vague?) | I talk in tendencies & timing, never "a tall stranger awaits." | `Test me on something real →` |
| LV-13 | Curiosity gap | I named the energy. Where it shows up for you is a chart question. | `Which part of my life? →` |
| LV-14 | Social proof (small/human) | Not a hotline. One person reading one actual chart — yours. | `Read mine for real →` |
| LV-15 | Returning reader | Your chart's the same. The sky isn't. New transits, same placements. | `Show me what's changed →` |
| LV-16 | Objection (time) | Not a one-hour sit-down. 3 minutes, on your phone, in the coffee line. | `Give me the 3-minute version →` |
| LV-17 | Personalization + free (combo) | The above applies to everyone. Your chart applies to one person. | `Read my exact chart →` |
| LV-18 | Timing + curiosity (combo) | One placement is lit up this week. Shows up as one feeling you can't name. | `Name what I'm feeling →` |

### 5.1 Pillar → blurb map

| Pillar | Best fit | Backup |
|---|---|---|
| Today's Sky | LV-13 | LV-03, LV-18 |
| Big Three | LV-10 | LV-01, LV-17 |
| Reader's Chart (Q&A) | LV-04 | LV-16, LV-06 |
| Myth vs. Chart | LV-12 | LV-14, LV-06 |
| Timing Window | LV-02 | LV-09, LV-18 |
| Why You Keep… (pattern) | LV-08 | LV-01, LV-15 |

Cross-cutting (any pillar): LV-05, LV-11, LV-17. Returning-reader (segment only): LV-07, LV-15.

### 5.2 Usage rules

- **One primary CTA per email.** Same link may repeat as a mid-body text link (same `utm_content`).
- **Rotate blurbs**, never the same one twice in a row. Suggested cycle: curiosity → timing → personalization → free → social proof → objection → (returning).
- **Mention free minutes ~1 in 3 emails**, not every send (avoids "desperate" signal).
- **Never compute a placement or ask for birth data in the email.** The chart read + birth-data collection happen in the chat. This is the line you don't cross.
- **Friction-reducer line is mandatory** under every CTA (variants below).

### 5.3 Friction-reducer line (rotate)

- *3 free minutes, no card — just talk to me like you'd text a friend.*
- *No sign-up wall, no credit card. Your first 3 minutes are on me.*
- *You don't need to know any astrology. Bring a question, I'll bring your chart.*
- *Free to start, nothing to install — stop whenever you want.*

### 5.4 Links & UTM

- Append to every link: `utm_source=kit&utm_medium=email&utm_campaign=luna-daily&utm_content=<blurb-id>` (e.g. `utm_content=LV-02`).
- **Magic-link (deep, auto-login):** `{{BASE_URL}}/magic-auth?t={{magic_token}}&redirect=/reading?persona=luna-voss&utm_…` — use ONLY when Kit can reliably populate a per-user `{{magic_token}}` custom field for a known-account segment.
- **Cold lander:** `{{BASE_URL}}/luna?utm_…` — safe for ALL readers (accounts can log in there; non-accounts get warm 2-turn chat → sign-up → 3 free minutes).
- **Default for broadcasts: `/luna`** (broadcasts often can't guarantee a per-user token; a blank token breaks the magic-link). Reserve magic-link for token-synced segments / automated sequences. `/chat/luna-voss` is an acceptable cold A/B alternative.

---

## 6. Design system (email templates)

**North star:** *editorial almanac, not mystic gift shop* — warm paper, ink-dark type, one brass accent, thin line-art celestial motifs. 600px, table-based, inline-CSS, degrades to live text when images blocked.

### 6.1 Palette

| Token | Hex | Role |
|---|---|---|
| ink | `#1C2230` | Primary text / masthead bg (night-navy, not black) |
| ink-soft | `#3A4255` | Secondary text, captions |
| paper | `#FBF7F0` | Primary background (warm parchment) |
| paper-card | `#FFFFFF` | Hero/content well |
| brass | `#B6863C` | Accent — rules, glyphs, link underlines |
| brass-deep | `#8A6326` | Brass on light text / borders |
| cta | `#C9963F` | CTA button fill |
| cta-text | `#1C2230` | CTA label (ink on gold) |
| rule | `#E4DACB` | Hairline on paper |
| footer-text | `#8A8475` | Legal/unsub |

**Excluded on purpose:** neon/electric purple, magenta gradients, glitter, pure black, pure white page bg. Brass appears ≤4 places per email (masthead hairline, section rule, CTA, link underline).

### 6.2 Type

Pairing: **Playfair Display** (headings) + **Inter** (body), each with email-safe fallbacks (Georgia / system sans). Webfont `<link>` in head for clients that honor it; design never depends on it.

| Style | Font | Size/LH | Weight |
|---|---|---|---|
| Wordmark | Playfair | 26/30 | 600 |
| Kicker/eyebrow | Inter | 11/14 | 700, +2.5px, UPPER |
| H1 | Playfair | 30/36 (mobile 26) | 600 |
| H2 | Playfair | 22/28 | 600 |
| Body | Inter | 17/28 | 400 |
| CTA label | Inter | 16 | 700, +0.5px |
| Friction line | Inter italic | 14/20 | 400 |
| Footer | Inter | 12/18 | 400 |

### 6.3 Motifs (thin brass line-art, ~1.25px stroke, star-atlas feel)

Thin gold rule (w/ ✦ center node) · constellation line-art · natal chart wheel (12-spoke) · moon-phase glyph row · 4-point sparkle node · optional subtle paper-grain bg.

### 6.4 Three template layouts (600px shell, shared masthead + footer)

**Shared masthead:** ink band (~88px) with live-text wordmark "LUNA VOSS" (cream) + tagline (brass, tracked uppercase) over a faint constellation watermark → brass hairline with ✦.
**Shared footer:** brass hairline → 48px natal-wheel stamp → sender line → CAN-SPAM address + live-text Unsubscribe/Preferences (brass-deep).

- **A — "Daily Sky" (text-light workhorse):** kicker → H1 → `{{BODY}}` text well → gold rule → `{{CHAT_BLURB}}` → CTA → italic friction line → P.S. → "— Luna". No heavy image (optional 24px moon glyph). Bulletproof against image-blocking.
- **B — "Visual Feature" (hero GIF/image above CTA):** kicker → H1 → `{{VISUAL}}` (560px, framed, explicit width/height + message-bearing alt) → 2–4 line body → CTA block. For "show, don't tell" sends.
- **C — "Reader's Chart / Chart-Wheel":** kicker → H1 → `{{VISUAL}}` natal-wheel (~340px, transparent-bg PNG, brass caption naming the aspect) → optional 3-col "reading the wheel" glyph strip (live Unicode ☿ ♂ ◆) → plain-English decode body → CTA block. Flagship "decode charts" send.

### 6.5 CTA block (one saved snippet, all templates)

`24px spacer → {{CHAT_BLURB}} (Inter 16/26, ≤2 lines, centered) → 18px → BUTTON → 10px → italic friction line → 28px`.
Button: fill `#C9963F`, label ink `#1C2230` Inter 700 16px, padding 16×34, radius 8px (VML roundrect for Outlook), centered, mobile `width:100%; max-width:340px`, live `→` glyph, **chat URL baked in** so it's never forgotten. Spacing via spacer `<td>` rows, never margins.

### 6.6 Hero/GIF assets (≤1MB, ideally 400–700KB; frame 1 carries the message)

| # | Concept | Dims | Static fallback |
|---|---|---|---|
| 1 | **Constellation drawing itself** (signature) — dots connect into a shape + soft sparkle, slow loop | 560×360 | Frame 1 = completed constellation |
| 2 | **Slow moon-phase loop** — new→full→waning, brass on ink | 480×160 or 220² | Current real moon phase |
| 3 | **Chart wheel assembling** — ring settles, planet markers click into houses | 360² transparent | Finished wheel (= Template C graphic) |
| 4 | **"Today's transit" minimal sky** — two stars breathe, one shooting line | 560×280 | Static night-sky PNG |

Author at 2×, 16–32 color palette, explicit width/height + alt, static variant of every template for image-light sends.

### 6.7 Kit build (once vs. per-send)

| Asset | Approach |
|---|---|
| Masthead | Saved snippet "Luna · Masthead" (live text) |
| CTA block | Saved snippet "Luna · CTA" — chat URL baked in, `{{CHAT_BLURB}}` editable region |
| Footer | Saved snippet "Luna · Footer" (wheel stamp, address, Kit unsub merge tags) |
| Email shell | One reusable HTML template "Luna Editorial"; B/C are drop-in hero snippets |
| Per-send | Subject, preheader, body, hero choice, GIF/graphic upload, `{{CHAT_BLURB}}` text |

**Kit specifics & gotchas:** map `{firstName}` → `{{ subscriber.first_name | default: "friend" }}`; hidden preheader span + whitespace padding; host GIFs on Kit/CDN (no base64); keep all key message in **live text** (Gmail/Outlook block images by default); Outlook desktop shows only GIF frame 1; add `color-scheme` meta + inline-forced colors for dark mode; transparent-bg PNGs for wheel/line-art; VML roundrect for the button.

---

## 7. Technical / integration plan

1. **Audience — LOCKED: cold funnel leads.** Email-only leads with no v2 account yet. Tag in Kit as `luna-daily`. Implication: **all CTAs point to `/luna`** (the pre-login warm 2-turn chat → sign-up → 3 free minutes). No `has-account` segment, no returning-reader assumption for now. Tone = first-time framing; lean on curiosity / free-minutes / "you don't need to know any astrology."
2. **Magic-token sync — DEFERRED (not needed for cold audience).** The deep auto-login link only matters once we email people who already have accounts. Revisit when an `has-account` segment exists. Until then, all links are `/luna` with UTMs.
3. **UTM + analytics:** standardize `utm_campaign=luna-daily`, `utm_content=<blurb-id>`; confirm these land in the v2 session attribution so click→session→paid can be measured.
4. **Build order in Kit:** masthead/CTA/footer snippets → "Luna Editorial" HTML template → hero snippets (B/C) → load 2-week batch of sends.

---

## 8. KPIs & measurement

- **Habit/engagement:** open rate, week-2/week-4 retention of openers, unsub rate (<0.3%/send target), spam complaints.
- **Funnel:** CTR into chat, sessions started per send, free-minute activation, free→paid conversion, revenue per send.
- **Per-blurb:** CTR by `utm_content` (which angle converts) → fold winners into rotation.
- **Per-pillar:** open rate by pillar → weight the calendar toward winners.

---

## 9. Risks & open decisions

| # | Item | Recommendation |
|---|---|---|
| 1 | **Kit MCP gated (paid plan)** | Upgrade Kit to unlock build/automation, OR build manually in Kit UI from this PRD. |
| 2 | **Cadence** | ✅ RESOLVED — true daily (7×/week), weekends use light pillars. |
| 3 | **Magic-link vs /luna** | ✅ RESOLVED — all links `/luna` (cold audience). Token-sync deferred. |
| 4 | **Audience definition** | ✅ RESOLVED — cold funnel leads, tag `luna-daily`. |
| 5 | **Social proof use** | Modest numbers — use honestly (LV-05/14) or lean on relatability. Confirm comfort. |
| 6 | **Asset production** | Need the 4 GIFs + chart-wheel graphic produced (frame-1-safe). Owner? |
| 7 | **Compliance** | Tendencies/timing only, no promises, no medical/legal/financial; CAN-SPAM footer + address. Built into templates. |

---

## 10. Rollout plan

- **Phase 0 (setup):** resolve open decisions 1–6; build Kit snippets + "Luna Editorial" template; produce GIF #1 (signature) + chart wheel.
- **Phase 1 (pilot, 2 weeks):** load Days 1–10; default `/luna` links; measure open/CTR/session-start per pillar & blurb.
- **Phase 2 (optimize):** weight calendar to winning pillars; rotate winning blurbs; A/B send times; ship token-sync for deep links.
- **Phase 3 (scale):** full daily (7×/week) steady-state; expand pillars; templatize the engine for other personas (Marcus/Nova/Maren) reusing the same shell — see the `persona-email-kit` skill (`.claude/skills/persona-email-kit/`).

---

## 11. Astrological accuracy & data feed (CRITICAL — gates the dated-sky pillars)

**The issue.** Any pillar that claims a *specific sky on a specific date* — Today's Sky, Your Timing Window, the Chart-Wheel aspect caption — must be driven by **real ephemeris data for the send date**, or an astro-literate reader (your most engaged segment) will catch it. The sample copy's transits are illustrative placeholders. Evergreen/symbolic pillars (Myth, Placement, Why-You-Keep, Big Three) do NOT need a data feed.

**Compliance rules baked into the templates (keep them):**
- Name only the *collective* sky (transit-to-transit aspect, moon phase, retrograde) — **never a personal house/placement in a broadcast.** Which house it lands in is per-reader → that's the chat hook. (Fixed in Template C: removed the universal "your 4th house" claim from caption, body, alt text, and preheader.)
- Speak in tendencies/timing, never promises. (Loose durations removed from A & C P.S.)

**Data feed options (recommended → fallback):**

0. ✅ **Reuse the engine you already own — `server/lib/astrologyEngine.ts`.** It computes geocentric planetary longitudes, retrogrades, and aspects (Conjunction/Sextile/Square/Trine/Opposition) with **no external dependency**, already exposes `calculateTransits()` + `TransitData`/`TransitAspect` types, and powers the in-chat natal wheel (`server/routes/astrology.ts`, `client/src/components/NatalChartWheel.tsx`). Add a thin `getDailySky(date)` wrapper: today's positions → `findAspects()` across them → moon phase from the Sun–Moon angle → active retrogrades. Persist a rolling 2-week "transit calendar" table; the content batch reads from it. **Cheapest, most accurate, and keeps email + chat astrology consistent.** ~1 small file.
1. **astronomy-engine (npm, MIT)** — high-accuracy pure-JS positions/moon-phase if you'd rather not extend the in-house engine; derive aspects via angle math. Free, no license friction.
2. **Swiss Ephemeris (`sweph`/`swisseph`)** — professional gold standard, but AGPL/commercial license and overkill given option 0 exists.
3. **Hosted astrology API (paid)** — FreeAstrologyAPI, AstrologyAPI.com (Vedic Rishi), Prokerala. Zero math, but per-call cost + external dependency + rate limits.

**Validation — Option 0 was tested against a real ephemeris (2026-06-18, harness: `scripts/_test-daily-sky.ts`).** A natal chart at lat/lon 0 == the geocentric sky at that moment, so the existing engine already yields the full daily sky (positions + collective aspects + retrogrades + moon phase) with **zero code changes**. Results vs. published ephemeris:

- **Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn — accurate to ~0.1°.** The Moon (the hardest body) landed essentially exact, and its computed phase/illumination ("Waxing Crescent, ~16%") matched the real **new moon of June 14–15, 2026**.
- **Uranus, Neptune, Pluto — ~0.5–0.9° off.** A real but immaterial error for prose-level copy (it won't flip a sign or a wide aspect); only matters for degree-precise outer-planet timing.
- **Retrograde detection correct** (flagged Pluto retrograde on 2026-06-18, consistent with its ~May–Oct 2026 retro window).
- **Cross-check on the seasonal markers:** Sun = 359.89° (≈0° Aries) at the spring equinox and 90.15° (0° Cancer) at the summer solstice — confirms the solar model independently of any external data.
- **Concrete proof of the placeholder problem:** on 2026-06-18 the real Moon is in **Leo (conjunct Venus, trine Saturn)** with **no Moon–Mars aspect** — so Template A's illustrative "the Moon meets Mars tonight" would have been false for that date. This is exactly the gap the feed closes.

**Recommendation:** Option 0 — **validated and sufficient.** Add a thin exported `getDailySky(date)` to `astrologyEngine.ts` (reuses the in-module position/`findAspects` helpers + moon-phase from the Sun–Moon angle) → persist a rolling 2-week transit calendar → let the content generator (same Haiku pattern as `personaVerifiedDripGenerator.ts`) turn structured sky-data into Luna-voiced copy. Until that's wired, run the daily cadence on evergreen pillars and keep dated-sky language out. *(Per-domain accuracy guardrails for other personas — tarot, Vedic, love-empath — are codified in the `persona-email-kit` skill.)*

---

## 12. QA gate — accuracy + brand fact-check before every send

Every daily draft passes through the **`persona-email-qa`** subagent (`.claude/agents/persona-email-qa.md`) before scheduling — the human-in-the-loop guardrail that makes auto-send safe. It:

- **Tier 1 (source of truth):** runs `npx tsx scripts/daily-sky.ts <date>` and checks every astrological claim in the copy against the computed sky (catches the writer drifting from the data).
- **Tier 2 (independent):** cross-checks the headline facts — moon phase/date, retrogrades, planet signs — against web ephemerides (timeanddate, astro-seek, moontracks), accounting for the **noon-ET (engine, = 16:00/17:00 UTC) vs 00:00-UT (most ephemerides)** offset on fast movers — the Moon moves ~0.5°/hr, so a near-orb Moon aspect can legitimately differ by time of day.
- **Brand / compliance:** no personal-placement-to-the-list, tendencies-not-promises, no birth-data ask, signoff present, exactly one CTA → `/luna` + UTMs, footer = `hi@theseerwithin.com` + a real CAN-SPAM address (not the placeholder), plausible durations.
- **Output:** PASS / FAIL with a claims table + severity-ranked fixes; **never approves an unresolved BLOCKER.**

In the full-auto pipeline it's the gate between content generation ([3]) and Kit delivery ([6]) — a FAIL holds the send. Supporting code: `scripts/daily-sky.ts` (CLI over `getDailySky`).

---

*Appendix: built by 4 parallel workstreams — positioning (codebase scout), content engine, conversion blurbs, design system. Persona facts cite `server/scripts/seed.ts`, `server/lib/personaDripConfig.ts`, `server/lib/personaLanderConfig.ts`, `server/lib/personaVerifiedDripGenerator.ts`, `server/lib/astrologyEngine.ts`. Reusable across the personas market via the `persona-email-kit` skill + `persona-email-qa` agent.*

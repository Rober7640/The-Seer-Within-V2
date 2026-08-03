# Evelyn — Quiz-Funnel Teasers

Short teaser emails whose one job is to drive the click into the **new `/evelyn` 3-tap quiz lander** — and to do it with tight message-match, so the email and the lander's first screen feel like one motion. Audience: the warm AWeber list (`theseerwithin_free`, ~48k, ~95% love). Distinct from the long-form tarot readings in `../evelyn-tarot-emails/`.

## The lander they flow into (as of Jul 2026)
Intro: *"I read what's actually there… the energy leaves traces: what's blocking your heart, where your money is stuck, what your path is quietly asking of you."* · 🎁 5 free minutes · *"Three quick taps and I'll tune in."* Then:
- **Step 1 — "What's pulling at you most right now?"** → Love & connection · Money & work · Purpose & direction · Someone specific
- **Step 2 — "When you sit with it, what comes up?"** → I feel stuck · I'm at a crossroads · Something feels off · Hopeful, but unsure
- **Step 3 — "What would change everything?"** → Clarity on what's next · Knowing how they feel · A sign I'm on the right path · Peace with a decision

## Message-match rules (why these convert)
- **Speak the lander's words:** "three quick taps," "tune in," "what the energy's showing," "5 free minutes." Do NOT promise an open text box ("tell me what's on your mind") — the lander now wants taps.
- **Echo a quiz question** as the email's hook so she arrives already answering it.
- **Withhold the personal read** — the email gives the premise, the quiz + reading give *her* answer.
- **Link:** `https://www.theseerwithin.com/evelyn/?utm_source=aweber&utm_medium=seerwithin_free&utm_campaign=<slug>&bucket=<x>&cta=end`. CTA link color **#0000ff**.

## The six teasers
| # | Slug | Subject | Preheader | Bucket | Flow-in |
|---|---|---|---|---|---|
| 1 | `whats-pulling` | 💫 {first}, what's pulling at you most right now? | three quick taps, and I'll tune into what the energy's showing about you | 4 buttons | **Email = Step 1.** Four tappable buckets; she starts the quiz in the inbox. |
| 2 | `the-trace` | 🔮 {first}, the energy around you left a trace this week | something's blocking your heart, snagging your money, or tugging your path — one is yours | — | Lander premise verbatim. Zero infra. |
| 3 | `cards-point-heart` | 💞 {first}, the cards keep pointing at your heart | three taps and I'll read exactly where it's blocked | love | Card names the topic → quiz refines it. |
| 4 | `someone-specific` | 💌 {first}, there's someone specific on your mind, isn't there? | three taps and I'll read what's actually moving between you | someone | Highest emotional charge; ties to the "message from your ex" idea. |
| 5 | `change-everything` | ✨ {first}, what's the one thing that would change everything? | clarity, knowing how they feel, a sign you're on the right path — which one? | — | Echoes quiz Step 3 (the outcome). |
| 6 | `three-taps` | 🎁 {first}, no need to explain — just three taps | no typing, no long story — tap three times and I'll tune in | — | Sells the low-friction quiz UX itself. |

### Bodies
**1 · whats-pulling** — *You've been on my mind this morning, dear — but I can't read what's there until you point me at it. So tell me, simply: what's pulling at you most right now? Tap the one that's true.* → **💜 Love & connection · 💰 Money & work · 🧭 Purpose & direction · 💌 Someone specific** (each a button → `?bucket=…`) → *Three quick taps in all, dear — and the first five minutes are on me. — Evelyn*

**2 · the-trace** — *The energy around a person always leaves traces, dear — I've read them for twenty years. What's blocking the heart. Where the money's gone quiet. What the path is asking. This week I keep catching one around you… but which of the three it is, I won't guess into a letter meant for everyone. That part is yours to show me.* → **Three quick taps and I'll tune into what it's showing →** → *Your first five minutes are free, dear. — Evelyn*

**3 · cards-point-heart** — *I've turned the cards for you three mornings running, dear, and they keep landing in the same place — your heart. Something there is asking to move. The cards can show me the room; only you can show me the door. Point me at it, and I'll read exactly what's holding it.* → **Three quick taps and I'll read your heart's block →** (`bucket=love`) → *— Evelyn*

**4 · someone-specific** — *You can tell me, dear. There's a name you haven't quite been able to put down — a someone your thoughts keep circling back to, whatever the hour. I can read what's actually moving between you: what they're not saying, what's holding it, whether it's finished or only paused. But you'll have to point me at them first.* → **Three quick taps and I'll read what's between you →** (`bucket=someone`) → *— Evelyn*

**5 · change-everything** — *If one thing shifted for you right now, dear — just one — what would it be? Clarity on what's next. Knowing how they truly feel. A sign you're on the right path. Peace with a decision you keep circling. Whatever you just answered in your head — that's the thread I'd pull. Tell me, and I'll read toward it.* → **Three quick taps and I'll read toward it →** → *— Evelyn*

**6 · three-taps** — *I know the feeling, dear — you want a reading, but the words aren't ready, or there's no time to type the whole story out. So I've made it simple. No explaining. No long message. Three quick taps — what's pulling at you, how it feels, what would change everything — and I'll tune into the rest myself.* → **Begin my reading — three taps →** → *Your first five minutes are free. — Evelyn*

## Open items before sending
- **Confirm bucket param values.** `love` is confirmed (tarot links use it); `money` / `purpose` / `someone` are assumed — verify against the lander/funnel config.
- **Teaser #1 tightest form needs a wire-up:** the quiz should pre-answer Step 1 from `?bucket=` (currently the lander *reads* bucket and forwards it, but the quiz mechanic may still start at Step 1). Without it, the buttons still land her primed.
- **`/evelyn` is A/B'ing quiz vs. an open chatbox arm.** "three taps" is tightest if the quiz wins; **"begin your reading →"** is the safe phrasing that fits both arms.
- **Realign the live tarot emails' end-CTA** ("tell me what's on your mind" → quiz language) so all Evelyn traffic message-matches.
- Send-ready HTML per teaser: generate from these bodies in the canonical Evelyn shell (white · Helvetica · Seer Within banner · blue `#0000ff` links · gray `<hr>`).

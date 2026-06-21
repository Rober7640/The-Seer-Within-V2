# Luna daily — outbox (2026-07-20, 60 days)

60 send-ready emails, **mixed templates (C 35 · B 15 · A 10)**. Per-day images (sky maps for C-days, heroes for B-days; A-days have none) were **uploaded to S3** — the HTML already points at public URLs, nothing to host manually.

**Before scheduling, run each through the `persona-email-qa` agent** — fill the QA column with its verdict. Open blockers must be fixed first. Subjects + per-day metadata are also in `manifest.json` (used by `scripts/push-batch-to-kit.ts`).

| Date (ET) | Tpl | Pillar | Headline | Subject | Blurb | Source | QA |
|---|---|---|---|---|---|---|---|
| 2026-07-20 | B | Your Timing Window | Moon square Mercury | {firstName}, mind and heart aren't syncing (Moon square Mercury) | LV-02 | haiku | _pending_ |
| 2026-07-21 | B | Your Timing Window | Sun square Moon | {firstName}, tension is information (use it) | LV-09 | haiku | _pending_ |
| 2026-07-22 | C | Today's Sky | Moon sextile Venus | {firstName}, the Moon wants to say yes (today) | LV-17 | haiku | _pending_ |
| 2026-07-23 | C | Your Timing Window | Sun trine Moon | {firstName}, Mercury turns—and the Moon agrees (71% lit) | LV-05 | haiku | _pending_ |
| 2026-07-24 | A | Today's Sky | Moon opposition Uranus | {firstName}, the plot thickens (Moon vs. Uranus) | LV-14 | haiku | _pending_ |
| 2026-07-25 | C | Today's Sky | Moon opposition Mars | {firstName}, Moon vs. Mars (tension you can name) | LV-18 | haiku | _pending_ |
| 2026-07-26 | C | Your Timing Window | Moon square Neptune | {firstName}, the pause before the reaction (Saturn turns) | LV-08 | haiku | _pending_ |
| 2026-07-27 | C | Today's Sky | Moon opposition Mercury | {firstName}, your head and heart are at odds (Moon ☍ Mercury) | LV-13 | haiku | _pending_ |
| 2026-07-28 | B | Your Timing Window | Moon opposition Mercury | {firstName}, the clarity is uncomfortable (and necessary) | LV-17 | haiku | _pending_ |
| 2026-07-29 | B | Your Timing Window | Sun opposition Moon | {firstName}, the push-pull is live (Full Moon today) | LV-18 | haiku | _pending_ |
| 2026-07-30 | C | Today's Sky | Moon trine Mars | {firstName}, small moves land hard (Moon △ Mars) | LV-05 | haiku | _pending_ |
| 2026-07-31 | C | Today's Sky | Venus square Mars | {firstName}, tension wants your attention (Venus square Mars) | LV-18 | haiku | _pending_ |
| 2026-08-01 | C | Today's Sky | Venus square Mars | {firstName}, tension before the move (Venus square Mars) | LV-01 | haiku | _pending_ |
| 2026-08-02 | C | Today's Sky | Moon opposition Venus | {firstName}, what you want vs. what you feel (Moon ☍ Venus) | LV-08 | haiku | _pending_ |
| 2026-08-03 | A | Today's Sky | Sun trine Moon | {firstName}, the mood aligns (Sun trine Moon today) | LV-17 | haiku | _pending_ |
| 2026-08-04 | C | Today's Sky | Moon square Mercury | {firstName}, mood and words aren't aligned (square energy) | LV-03 | haiku | _pending_ |
| 2026-08-05 | B | Your Timing Window | Moon square Jupiter | {firstName}, tension wants your attention (Moon square Jupiter) | LV-18 | haiku | _pending_ |
| 2026-08-06 | B | Your Timing Window | Moon sextile Mercury | {firstName}, think before you act (Moon-Mercury today) | LV-04 | haiku | _pending_ |
| 2026-08-07 | C | Today's Sky | Moon conjunction Uranus | {firstName}, the Moon wants to shake things up (in one area) | LV-14 | haiku | _pending_ |
| 2026-08-08 | A | Today's Sky | Moon conjunction Mars | {firstName}, mood meets muscle (Moon-Mars today) | LV-01 | haiku | _pending_ |
| 2026-08-09 | C | Today's Sky | Moon square Venus | {firstName}, tension between what you want and what you feel | LV-17 | haiku | _pending_ |
| 2026-08-10 | C | Today's Sky | Moon square Saturn | {firstName}, Moon-Saturn friction (the pause before the snap) | LV-13 | haiku | _pending_ |
| 2026-08-11 | C | Today's Sky | Moon conjunction Mercury | {firstName}, your mind and heart are talking (listen) | LV-03 | haiku | _pending_ |
| 2026-08-12 | B | Your Timing Window | Sun conjunction Moon | {firstName}, New Moon amplifies one area (today) | LV-18 | haiku | _pending_ |
| 2026-08-13 | A | Today's Sky | Moon sextile Mars | {firstName}, small moves land harder today (Moon ⚹ Mars) | LV-05 | haiku | _pending_ |
| 2026-08-14 | C | Today's Sky | Mercury sextile Venus | {firstName}, words land softer today (Mercury–Venus) | LV-14 | haiku | _pending_ |
| 2026-08-15 | C | Today's Sky | Moon square Mars | {firstName}, tension wants your attention (Moon □ Mars) | LV-17 | haiku | _pending_ |
| 2026-08-16 | C | Today's Sky | Moon conjunction Venus | {firstName}, the mood wants what the heart wants (today) | LV-08 | haiku | _pending_ |
| 2026-08-17 | C | Today's Sky | Sun sextile Moon | {firstName}, small moves land hard (Sun ⚹ Moon) | LV-13 | haiku | _pending_ |
| 2026-08-18 | A | Today's Sky | Moon square Jupiter | {firstName}, tension wants your attention (Moon □ Jupiter) | LV-18 | haiku | _pending_ |
| 2026-08-19 | B | Your Timing Window | Moon square Mercury | {firstName}, the pause before you react (Moon square Mercury) | LV-05 | haiku | _pending_ |
| 2026-08-20 | B | Your Timing Window | Sun square Moon | {firstName}, tension is information (Sun □ Moon) | LV-14 | haiku | _pending_ |
| 2026-08-21 | C | Today's Sky | Moon sextile Venus | {firstName}, the mood likes what it sees (Moon ⚹ Venus) | LV-17 | haiku | _pending_ |
| 2026-08-22 | C | Today's Sky | Sun trine Moon | {firstName}, the Moon agrees with you (today) | LV-01 | haiku | _pending_ |
| 2026-08-23 | A | Today's Sky | Moon opposition Mars | {firstName}, the push-pull is real (Moon ☍ Mars) | LV-08 | haiku | _pending_ |
| 2026-08-24 | C | Today's Sky | Moon square Venus | {firstName}, tension between want and feel (Moon ⊟ Venus) | LV-18 | haiku | _pending_ |
| 2026-08-25 | C | Today's Sky | Moon conjunction Pluto | {firstName}, intensity is the point (Moon-Pluto today) | LV-03 | haiku | _pending_ |
| 2026-08-26 | C | Today's Sky | Moon trine Venus | {firstName}, the moon likes you today (98% lit) | LV-18 | haiku | _pending_ |
| 2026-08-27 | B | Your Timing Window | Sun opposition Moon | {firstName}, clarity under tension (Full Moon today) | LV-17 | haiku | _pending_ |
| 2026-08-28 | B | Your Timing Window | Moon trine Mars | {firstName}, the Full Moon wants action (and it's easier today) | LV-14 | haiku | _pending_ |
| 2026-08-29 | C | Today's Sky | Sun conjunction Mercury | {firstName}, your mind and light are merged today | LV-01 | haiku | _pending_ |
| 2026-08-30 | C | Today's Sky | Moon square Mars | {firstName}, tension that wants direction (Moon square Mars) | LV-18 | haiku | _pending_ |
| 2026-08-31 | C | Today's Sky | Moon opposition Venus | {firstName}, Moon vs. Venus (the tension is real) | LV-13 | haiku | _pending_ |
| 2026-09-01 | C | Today's Sky | Moon square Pluto | {firstName}, the mood is tense (Moon square Pluto) | LV-03 | haiku | _pending_ |
| 2026-09-02 | A | Today's Sky | Moon trine Mercury | {firstName}, your thoughts land cleaner today (Moon △ Mercury) | LV-17 | haiku | _pending_ |
| 2026-09-03 | B | Your Timing Window | Moon trine Pluto | {firstName}, small move, big shift (Moon trine Pluto) | LV-05 | haiku | _pending_ |
| 2026-09-04 | B | Your Timing Window | Moon square Mercury | {firstName}, think before you react (Moon square Mercury) | LV-14 | haiku | _pending_ |
| 2026-09-05 | C | Today's Sky | Moon square Neptune | {firstName}, the blur is real (Moon square Neptune) | LV-18 | haiku | _pending_ |
| 2026-09-06 | C | Today's Sky | Moon conjunction Mars | {firstName}, mood meets muscle (Moon–Mars today) | LV-08 | haiku | _pending_ |
| 2026-09-07 | A | Today's Sky | Moon square Venus | {firstName}, tension between want and feeling (Moon □ Venus) | LV-13 | haiku | _pending_ |
| 2026-09-08 | C | Today's Sky | Moon conjunction Jupiter | {firstName}, luck is looking for focus (Moon meets Jupiter) | LV-17 | haiku | _pending_ |
| 2026-09-09 | C | Today's Sky | Moon sextile Venus | {firstName}, the Moon likes Venus today (small moves, big effect) | LV-18 | haiku | _pending_ |
| 2026-09-10 | B | Your Timing Window | Sun conjunction Moon | {firstName}, new moon energy (concentrated and ready) | LV-05 | haiku | _pending_ |
| 2026-09-11 | B | Your Timing Window | Moon conjunction Mercury | {firstName}, your timing window opens (Mercury meets Moon) | LV-18 | haiku | _pending_ |
| 2026-09-12 | A | Today's Sky | Moon conjunction Mercury | {firstName}, your mind and heart are speaking the same language (listen) | LV-01 | haiku | _pending_ |
| 2026-09-13 | C | Today's Sky | Moon square Mars | {firstName}, tension that wants direction (Moon square Mars) | LV-08 | haiku | _pending_ |
| 2026-09-14 | C | Today's Sky | Moon conjunction Venus | {firstName}, mood meets money (Moon-Venus today) | LV-17 | haiku | _pending_ |
| 2026-09-15 | C | Today's Sky | Moon square Jupiter | {firstName}, Moon square Jupiter (the hot take) | LV-03 | haiku | _pending_ |
| 2026-09-16 | C | Today's Sky | Moon trine Mars | {firstName}, small moves land harder today (Moon △ Mars) | LV-18 | haiku | _pending_ |
| 2026-09-17 | A | Today's Sky | Moon sextile Mercury | {firstName}, your thoughts land clean today (Moon ⚹ Mercury) | LV-04 | haiku | _pending_ |

_Open items before these can actually send: real CAN-SPAM address (task #7), Luna-branded verified sender, audience/Kit list (task #6), deliverability SPF/DKIM/DMARC (task #9)._

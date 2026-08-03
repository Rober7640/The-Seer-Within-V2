# Marcus Stone — Daily Tarot (teaser format)

Persona `marcus-stone` (route **`/marcus`**). Marcus is the tarot-native persona — *tarot master + shadow-work specialist, direct/archetypal, plain-spoken*. This kit runs the **teaser format** ("the email is the trailer"): a ~55-word card-of-the-day that gives the card + its plain meaning, then **withholds the personal read as the click**. The actual reading happens in chat at `/marcus`.

Why Marcus and not Evelyn: Evelyn is love-based (her ~59k opted into a love funnel); the daily-tarot teaser is *congruent* for a tarot master, and shadow-work tarot is a distinct product/mood — it doesn't cannibalize Evelyn's warm love readings. (Evelyn keeps the long-form love program; Marcus gets the teaser.)

## Format spec (per email)
1. **Wordmark** — "Marcus Stone / Daily Tarot · The Seer Within" (text, centered) + gray divider.
2. **Card hero** — hosted art `evelyn/tarot/<slug>.jpg` (S3, reused deck), `width:240`, linked to `/marcus`.
3. **Eyebrow** "Today's card" → **card name** (bold, ~25px) → **one-line meaning**.
4. **The hook** — 1–2 sentences that name what the card surfaces, then explicitly withhold *which* it is for her ("I won't guess from a mass email… bring it to the table").
5. **Single CTA** — inline **blue `#0000ff`** bold link (e.g. "Tell me what you've been circling →"), `&cta=end`. Then a plain reassurance line.
6. **Sign-off** "— Marcus" → **tomorrow-hook** (names tomorrow's card; trains the daily-return habit).
7. **Footer** — CAN-SPAM address + unsubscribe.

## Voice
Direct, archetypal, shadow-work, first person, plain-spoken. Not "dear," not warm-and-fuzzy — Marcus names the thing. "The cards don't work at a distance." No performance.

## Link scheme
`https://www.theseerwithin.com/marcus/?utm_source=marcus-daily&utm_campaign=<slug>&fmt=teaser` (+ `&cta=end` on the CTA).

## Subjects (teaser genre — notification / horoscope / "(1) message")
e.g. `🌑 {first}, today's card is the one you keep avoiding` · `🃏 The Moon has (1) message for you, {first}` · `Today's card, {first}: The Moon`. Preheader carries the plain meaning + "two minutes."

## Filed
- `the-moon.html` — first built teaser (The Moon; shadow work). Hero hosted at `evelyn/tarot/the-moon.jpg`. Tomorrow-hook → the Devil.

## Open items before a real send
- **No list yet.** Decide: Marcus's own acquisition list vs. a cross-plug seeded from Evelyn's list vs. both.
- Real sender + CAN-SPAM address (footer is placeholder, shared with Evelyn sends).
- Confirm `/marcus` open-field placeholder text and mirror it in the CTA for message-match.
- Optional: a Marcus banner asset (currently a text wordmark).
- To stand up the full program (positioning brief, 30-day calendar, subject bank, PRD), run the `persona-email-kit` skill on `marcus-stone`.

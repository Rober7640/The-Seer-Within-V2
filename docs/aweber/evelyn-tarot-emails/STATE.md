# Evelyn Tarot — STATE

Rolling state for the `/evelyn-tarot` skill. Update after every email. The deck reads as a journey: each email's **tomorrow-hook** names the next card, so the order matters.

**⚠ After scheduling or re-scheduling any batch, run `npx tsx scripts/sync-email-canon.ts`** — it parses this table + the email preheaders into `system_config.email_canon`, which the V2 chat engine injects so Evelyn can pay off "your email said you have something to tell me" with the actual card (improve-v2 #27). Rows not marked SENT/SCHEDULED are skipped automatically.

## Cards sent / drafted
Subjects send with first-name personalization (`{{ subscriber.first_name | capitalize }}`); bodies keep "dear". List: `theseerwithin_free` (6936953). Daily slot: **6:30pm SGT = 10:30 UTC**. Send files renamed to `NN-slug.html` (NN = send order).
| Send order | Card (slug) | State served | Subject (emoji + {first_name}-FIRST) | Tomorrow-hook → | Status |
|---|---|---|---|---|---|
| 01 — Jun 30 | `ace-of-cups` | B — waiting | The cup was always meant to overflow | Two of Cups | **SENT** Jun 30 |
| 02 — Jul 1 | `two-of-cups` | A — uncertain | How to tell the real thing from the wish | Death (teased) | **SCHEDULED** · bcast 61135314 |
| 03 — Jul 2 | `death` | C — bereft | The card everyone dreads means the opposite | Temperance | **SCHEDULED** · bcast 61135319 |
| 04 — Jul 3 | `temperance` | valve + heals bereft | 🤍 {first}, you don't have to be "over it" first | the Star | **SCHEDULED** · bcast 61135566 |
| 05 — ~~Jul 4~~ | `the-star` | C — bereft (hope) | ⭐ {first}, when did you stop expecting good news? | the Lovers | **DRAFT — held for a future batch** (bumped from Jul 4; slot taken by quiz-inbox test) · bcast 61135571 · subject+N1 CTA already built |
| 06 — Jul 5 | `the-lovers` | A — uncertain | 💞 {first}, do you become more yourself with him? | Knight of Cups | **SCHEDULED** · bcast 61135582 |
| 07 — Jul 6 | `knight-of-cups` | B — waiting | 🛑 {first}, stop trusting his beautiful words | Three of Cups | **SCHEDULED** · bcast 61135593 |
| 08 — Jul 7 | `three-of-cups` | valve — sisterhood/joy | ✨ {first}, the joy you keep saving for "when he comes" | Five of Cups | **SCHEDULED** · bcast 61137848 |
| 09 — Jul 8 | `five-of-cups` | C — bereft | ⚠️ {first}, grief is hiding something right behind you | Knight of Wands | **SCHEDULED** · bcast 61137860 |
| 10 — Jul 9 | `knight-of-wands` | B — waiting | 🔥 {first}, the trouble with the man who sets you on fire | Seven of Cups | **SCHEDULED** · bcast 61137861 |
| 11 — Jul 10 | `seven-of-cups` | A — uncertain | 😱 {first}, this is why you can't decide about him | the Empress | **SCHEDULED** · bcast 61137862 |
| 12 — Jul 11 | `the-empress` | valve — self-worth/receiving | ⚠️ {first}, the card that says STOP pouring | Eight of Cups | **SCHEDULED** · bcast 61137863 |
| 13 — Jul 12 | `eight-of-cups` | C — bereft | 💔 {first}, when "fine" is the reason to leave | Page of Cups | **SCHEDULED** · bcast 61137873 |
| 14 — Jul 13 | `page-of-cups` | B — waiting | 💌 {first}, the small sign you keep explaining away | the Moon | **SCHEDULED** · bcast 61137874 |
| 15 — Jul 14 | `the-moon` | A — uncertain | 🌙 {first}, don't trust what you "know" about him at 3am | Ten of Cups | **SCHEDULED** · bcast 61137875 |
| 16 — Jul 15 | `ten-of-cups` | B — waiting | 🌈 {first}, what are you REALLY waiting for? | the Hermit | **SCHEDULED** · bcast 61137876 |
| 17 — Jul 16 | `the-hermit` | valve — solitude/inner lamp | 🕯️ {first}, what the empty chair is actually for | Three of Swords | **SCHEDULED** · bcast 61137877 |
| 18 — Jul 17 | `three-of-swords` | C — bereft | 🌧️ {first}, the mercy hidden in a broken heart | Queen of Cups | **SCHEDULED** · bcast 61137886 |
| 19 — Jul 18 | `queen-of-cups` | A — uncertain | 🌊 {first}, are you loving him — or drowning in him? | the Sun | **SCHEDULED** · bcast 61137887 |
| 20 — Jul 19 | `the-sun` | C — bereft (joy returns) | ☀️ {first}, the morning it stops feeling heavy | Four of Cups | **SCHEDULED** · bcast 61137888 |
| 21 — Jul 20 | `four-of-cups` | A — uncertain | 🎁 {first}, the gift you keep walking straight past | the Hierophant | **SCHEDULED** · bcast 61137889 |
| 22 — Jul 21 | `the-hierophant` | B — waiting | ⏳ {first}, the timeline you never actually chose | Six of Cups | **SCHEDULED** · bcast 61137890 |
| 23 — Jul 22 | `six-of-cups` | C — bereft | 🌹 {first}, when the one who got away comes back | Strength | **SCHEDULED** · bcast 61137897 |
| 24 — Jul 23 | `strength` | valve — gentleness as power | 🦁 {first}, why "be strong" has worn you out | King of Cups | **SCHEDULED** · bcast 61137898 |
| 25 — Jul 24 | `king-of-cups` | A — uncertain | ⚓ {first}, how he acts in a storm tells you everything | Nine of Cups | **SCHEDULED** · bcast 61137899 |
| 26 — Jul 25 | `nine-of-cups` | valve — the wish card | ⭐ {first}, the wish you've never let yourself say | Wheel of Fortune | **SCHEDULED** · bcast 61137900 |
| 27 — Jul 26 | `wheel-of-fortune` | B — waiting | 🎡 {first}, this season isn't the whole of your life | the Hanged Man | **SCHEDULED** · bcast 61137901 |
| 28 — Jul 27 | `the-hanged-man` | A — uncertain | 🔄 {first}, the answer you can only see upside-down | Ten of Swords | **SCHEDULED** · bcast 61137918 |
| 29 — Jul 28 | `ten-of-swords` | C — bereft | 🌅 {first}, why rock bottom is actually good news | the World | **SCHEDULED** · bcast 61137919 |
| 30 — Jul 29 | `the-world` | valve — wholeness/the dance | 🌍 {first}, you were never "half" of anything | Ace of Wands | **SCHEDULED** · bcast 61137921 |
| 31 — Jul 30 | `ace-of-wands` | B — waiting | ⚡ {first}, what always arrives before the man does | Judgement | **SCHEDULED** · bcast 61137922 |
| 32 — Jul 31 | `judgement` | C — bereft (rebirth) | 🎺 {first}, you are not finished | the Fool (next batch) | **SCHEDULED** · bcast 61137923 |

## State balance (keep the three soulmate states + the whole-woman valve rotating)
- Week 1 (Jun 30–Jul 6, 01–07) landed even: **A×2** (two-of-cups, the-lovers) · **B×2** (ace-of-cups, knight-of-cups) · **C×2** (death, the-star) · **valve×1** (temperance).
- Batch Jul 7–31 (08–32, 25 emails) lands to the runbook target: **A×6** (seven-of-cups, the-moon, queen-of-cups, four-of-cups, king-of-cups, the-hanged-man) · **B×6** (knight-of-wands, page-of-cups, ten-of-cups, the-hierophant, wheel-of-fortune, ace-of-wands) · **C×7** (five-of-cups, eight-of-cups, three-of-swords, the-sun, six-of-cups, ten-of-swords, judgement) · **valve×6** (three-of-cups, the-empress, the-hermit, strength, nine-of-cups, the-world). Valve well-served; no state starved. Next batch: keep rotating, valve every ~4th.

## Open tomorrow-hook threads (the next cards the drafts already promised)
- Resolved Jul 1–6: `ace`→Two of Cups · `two-of-cups`→Death · `death`→Temperance · `temperance`→the Star · `the-star`→the Lovers · `the-lovers`→Knight of Cups.
- Resolved Jul 7–31 (this batch): `knight-of-cups`→Three of Cups · `three-of-cups`→Five of Cups · `five-of-cups`→Knight of Wands · `knight-of-wands`→Seven of Cups · `seven-of-cups`→the Empress · `the-empress`→Eight of Cups · `eight-of-cups`→Page of Cups · `page-of-cups`→the Moon · `the-moon`→Ten of Cups · `ten-of-cups`→the Hermit · `the-hermit`→Three of Swords · `three-of-swords`→Queen of Cups · `queen-of-cups`→the Sun · `the-sun`→Four of Cups · `four-of-cups`→the Hierophant · `the-hierophant`→Six of Cups · `six-of-cups`→Strength · `strength`→King of Cups · `king-of-cups`→Nine of Cups · `nine-of-cups`→Wheel of Fortune · `wheel-of-fortune`→the Hanged Man · `the-hanged-man`→Ten of Swords · `ten-of-swords`→the World · `the-world`→Ace of Wands · `ace-of-wands`→Judgement.
- **OPEN:** `judgement` → **the Fool** (the next batch must open here — the wide-eyed fearless beginning, a brand-new journey; Judgement's close explicitly teased it).

## No-repeat
Don't reuse a card within the program. Hosted heroes so far (S3 `evelyn/tarot/`): `ace-of-cups`, `two-of-cups`, `death`, `temperance`, `the-star`, `the-lovers`, `knight-of-cups`, `three-of-cups`, `five-of-cups`, `knight-of-wands`, `seven-of-cups`, `the-empress`, `eight-of-cups`, `page-of-cups`, `the-moon`, `ten-of-cups`, `the-hermit`, `three-of-swords`, `queen-of-cups`, `the-sun`, `four-of-cups`, `the-hierophant`, `six-of-cups`, `strength`, `king-of-cups`, `nine-of-cups`, `wheel-of-fortune`, `the-hanged-man`, `ten-of-swords`, `the-world`, `ace-of-wands`, `judgement` (32 cards used, 01–32).

## Candidate next cards (by state) — batch 3 (starts with the Fool per the open hook)
- **the Fool** opens it: state B or valve fits best (a fearless new beginning / stepping off the cliff in faith). Then keep rotating A/B/C/valve.
- **A uncertain (used: seven-of-cups, the-moon, queen-of-cups, four-of-cups, king-of-cups, the-hanged-man):** Two of Swords (the blindfolded stalemate/decision), Seven of Swords (is he being straight with you), the High Priestess (trust the gut you're overriding).
- **B waiting (used: knight-of-wands, page-of-cups, ten-of-cups, the-hierophant, wheel-of-fortune, ace-of-wands):** the Star? no (used) → the Magician (make it happen, not just wait), Three of Wands (ships coming in / the horizon), Eight of Wands (things speeding up, news arriving).
- **C bereft (used: five-of-cups, eight-of-cups, three-of-swords, the-sun, six-of-cups, ten-of-swords, judgement):** Five of Swords (the fight that cost too much), Nine of Swords (the 3 a.m. dread), the Tower (the sudden collapse + what it clears), Four of Swords (rest/recovery after the wound).
- **whole-woman valve (used: three-of-cups, the-empress, the-hermit, strength, nine-of-cups, the-world):** the Emperor (your own structure/boundaries), Justice (fairness, owning your part), Temperance? no (used) → the Chariot (drive/direction), Queen of Pentacles (rooted self-sufficiency).
- Guardrails still apply: the Tower & the Devil are heavy — use sparingly, never manufacture fear; keep Christianity-free (esp. if you ever draw the Devil/Judgement-adjacent imagery).

# Reframe Deck — STATE

Rolling state for the reframe deck. **Update after every email.** This is how the next writer (or a future skill) sees what's been used and keeps the rotation, the balance, and the no-repeats honest. See [PLAYBOOK.md](PLAYBOOK.md) for the rules this table enforces.

Lists (since 2026-08-20): **thirteen**, set in `AWEBER_DAILY_LIST_IDS` — free (`theseerwithin_free` 6936953, `_palm` 6963143, `_tarot` 6970613, `_fb` 6963139, `_fb2` 6963141), paid (`theseerwithin_paid` 6936955, `_money_ob_paid` 6969209, `_upsell_paid` 6937139, `_upsell2_paid` 6939683) and soulmate (`_soulmate_free` 6956485, `_soulmate_paid` 6956486, `_soulmate_upsell1` 6956488, `_soulmate_upsell2` 6956490). `_gdn` excluded (empty). Each email = one broadcast per list, so a 10-email cycle writes 130 broadcasts. Daily slot: 6:30pm SGT = 10:30 UTC. Subjects personalize with `{{ subscriber.first_name | capitalize }}`; bodies keep "dear".

⚠ **Heavy overlap, no cross-list dedupe.** Measured 2026-08-20 (spread samples): all four paid lists are **100%** already on a mailed free list — they add **zero** reach and only extra copies; a buyer on free+palm with the bump and both upsells gets each daily **6x**. `soulmate_free` 68% covered (~197 genuinely new), `_fb` 15 people, `_fb2` empty. The operator was shown these numbers and chose to wire every list anyway. **If open rates fall or complaints rise, the paid lists are the first thing to pull** — `node aweber-ops.mjs cancel <id> --list=<listid>`.

## Sends log

| # | Date | Format | Type | Reframe (1-line) | Subject | Hook (opening line) | Cast | Status |
|---|---|---|---|---|---|---|---|---|
| — | — | 01 question-behind | conversion | "will they come back" → "am I allowed to want again" | ‼️ …he asked if she'd come back… | "A man wrote to me last night. Three lines." | M | **REFERENCE** (approved, unscheduled) |
| — | — | 02 parable | insight | watering a dead plant → keeping hope safe | …she watered a dead plant for a year… | "There was a woman who watered a dead plant for a year." | F | **REFERENCE** |
| — | — | 03 card-reframed | insight | Tower → takes the lie, not your life | 😱 …everyone dreads this card… | "When I turn over the Tower, I watch the face across from me fall." | neutral | **REFERENCE** (tomorrow-hook → the Star) |
| — | — | 04 the-tell | interactive | line said twice → the one we don't believe | …they said "I'm fine on my own" twice… | "'I'm fine on my own.' Someone said it to me twice…" | neutral | **REFERENCE** |
| — | — | 05 stop-calling-it | conversion | "giving them space" → bracing | 🚩 …you call it "giving them space"… | "You call it 'giving them space,' dear." | neutral | **REFERENCE** |
| — | — | 06 the-myth | insight | "if they wanted to" → skips the question about you | …"if they wanted to, they would" is half a truth… | "'If they wanted to, they would.' You've heard it a hundred times…" | neutral | **REFERENCE** |
| — | — | 07 the-sign | interactive | recurring sign → your attention's open question | …you keep seeing it… | "You keep seeing it, don't you, dear. 11:11 on the clock…" | neutral | **REFERENCE** |

*(The 7 above are the approved gold-standard reference deck, not scheduled sends. Log real scheduled sends below with a Send # and date.)*

### Cycle 1 — LIVE (scheduled 2026-07-23 to `theseerwithin_free` 6936953, one/day 10:30 UTC = 6:30pm SGT)

Replaced the old program's 9 broadcasts for Jul 23–31 (those were cancelled → drafts, recoverable). Sends are AWeber-scheduled, human-gated; nothing auto-changes. Drafts + renderer live in the session scratchpad (regenerate from `formats/` + `emails/` if needed).

| Send | Date | Fmt | Type | Reframe (1-line) | Cast | State | Slug | AWeber id |
|---|---|---|---|---|---|---|---|---|
| C1-1 | Jul 23 | 01 | conv | "show her I've changed" → would I keep it if unseen | M | A | reframe-01-changed | 61211233 |
| C1-2 | Jul 24 | 06 | insight | "love yourself first" → not an entrance fee | neutral | valve | reframe-06-love-yourself | 61211235 |
| C1-3 | Jul 25 | 04 | interactive | "not looking for serious" ×2 → a flinch | neutral | A | reframe-04-serious | 61211236 |
| C1-4 | Jul 26 | 02 | insight | fence her color → keeping the "we" alive | M | C | reframe-02-fence | 61211237 |
| C1-5 | Jul 27 | 05 | conv | "protecting my peace" → sometimes a wall | neutral | A | reframe-05-peace | 61211238 |
| C1-6 | Jul 28 | 03 | insight | the Devil → the chain is loose enough to lift off | neutral | A | reframe-03-devil | 61211239 |
| C1-7 | Jul 29 | 07 | interactive | the song everywhere → your attention, not their message | neutral | C | reframe-07-song | 61211240 |
| C1-8 | Jul 30 | 02 | insight | lighthouse lamp → keep your own light lit | F | B | reframe-08-lighthouse | 61211241 |
| C1-9 | Jul 31 | 06 | insight | "stop looking" → stop auditioning, not wanting | neutral | B | reframe-09-stop-looking | 61211243 |

Spacing: conversion beats Jul 23 & 27; interactive Jul 25 & 29; two parables (02) 4 days apart; two myths (06) 7 apart. State B (waiting) added via C1-8/9. **Watch:** this cycle doubled formats 02 & 06 within the run — the next cycle should lean on the un-repeated formats and add more state-B/C variety.

### Cycle 2 — LIVE (scheduled 2026-08-05 to `theseerwithin_free` 6936953)

One clean rotation, all 7 formats, no repeats. Aug 1–4 were dark (cycle 1 ended Jul 31). Send #1 missed the 10:30 UTC slot on Aug 5 and went out at 11:55 UTC instead; #2–#7 are on the normal 10:30 UTC = 6:30pm SGT slot. All-legacy `?campaign=` links — the `/e/:code` redirector is not merged to `origin/Production`, so nothing was minted (see `sends/cycle-2/short-links.json`).

| Send | Date | Fmt | Type | Reframe (1-line) | Cast | State | Slug | AWeber id |
|---|---|---|---|---|---|---|---|---|
| C2-1 | Aug 5 | 01 | conv | "is it too late" → is the version of me that's left still worth choosing (a verdict handed to a calendar) | M | B | reframe-c2-01-too-late | 61255141 |
| C2-2 | Aug 6 | 03 | insight | Three of Swords → a heart that stayed soft enough to be pierced | neutral | C | reframe-c2-02-three-of-swords | 61255142 |
| C2-3 | Aug 7 | 06 | insight | "trust your gut" → half the time it's remembering the last one, not reading this one | neutral | A | reframe-c2-03-trust-your-gut | 61255143 |
| C2-4 | Aug 8 | 07 | interactive | the resurfaced photo → the returning is the message, not the arrival | neutral | C | reframe-c2-04-the-photo | 61255144 |
| C2-5 | Aug 9 | 05 | conv | "low-maintenance" → pre-declining yourself so no one else has to | neutral | valve | reframe-c2-05-low-maintenance | 61255145 |
| C2-6 | Aug 10 | 02 | insight | the uncounted jar → how a wish is kept from ever becoming a decision | F | B | reframe-c2-06-the-jar | 61255146 |
| C2-7 | Aug 11 | 04 | interactive | "it's complicated" ×2 → shelter from a simple answer that would demand action | neutral | A | reframe-c2-07-its-complicated | 61255147 |

Spacing: conversion beats Aug 5 & 9; interactive Aug 8 & 11; states balanced A×2 / B×2 / C×2 / valve×1 (cycle 1's A-heavy skew corrected); male POV on C2-1, female protagonist on C2-6.

**⚠ Watch — the defect that nearly shipped.** Four of the seven first drafts unconsciously rewrote *the previous send in the same format slot*: C2-4 was a near-reprint of C1-7 (07-song), the original parable was C1-8 (lighthouse) with a new object, C2-5 reran five sentence-shapes from C1-5 (05-peace), and C2-7 lifted a sentence verbatim from C1-3 (04-serious). Two QA passes caught them; a single pass would not have. Root cause: `formats/02-the-parable.md` and `formats/07-the-sign.md` hard-code signature sentences into their skeletons ("something gentler and truer", "leash and becomes a lamp", "It was never about the ___", the "Who's it even for?" beat), so any writer following the spec faithfully clones the last send. **Before cycle 3: give those specs a variant bank, and diff every draft against the same format's previous send.** Also retired this cycle: the "your wall keeps everyone out" argument, which had run in both C1-3 and C1-5.

### Cycle 3 — LIVE (scheduled 2026-08-16 to `theseerwithin_free` 6936953)

One clean rotation, all 7 formats, no repeats. Aug 12–15 were dark (cycle 2 ended Aug 11). Every send on the normal 10:30 UTC = 6:30pm SGT slot, including #1 on its own send day. All-legacy `?campaign=` links again — `server/routes/emailLinkRedirect.ts` is still not on `origin/Production` (re-verified 2026-08-16), so nothing was minted (see `sends/cycle-3/short-links.json`).

| Send | Date | Fmt | Type | Reframe (1-line) | Cast | State | Slug | AWeber id |
|---|---|---|---|---|---|---|---|---|
| C3-1 | Aug 16 | 01 | conv | "was any of it real" → can I still trust my own eyes, now the only other witness has changed their story | M | C | reframe-c3-01-was-it-real | 61289929 |
| C3-2 | Aug 17 | 03 | insight | the Moon → not who's deceiving you; the hour when everything you look at hands back your own fear as evidence | neutral | A | reframe-c3-02-the-moon | 61289930 |
| C3-3 | Aug 18 | 06 | insight | "everything happens for a reason" → the reason isn't inside the event; it's made afterwards by the one who walks out | F | C | reframe-c3-03-for-a-reason | 61289931 |
| C3-4 | Aug 19 | 07 | interactive | the recurring dream → not them reaching you; the one hour you stop managing how much you want | neutral | B | reframe-c3-04-the-dream | 61289932 |
| C3-5 | Aug 20 | 05 | conv | "taking it slow" → slow is a speed and a speed needs a destination; with none you're parked | neutral | A | reframe-c3-05-taking-it-slow | 61289933 |
| C3-6 | Aug 21 | 02 | insight | the ring bought four years early → a decision made while nothing was at stake, so it needn't be made under pressure | M | B | reframe-c3-06-the-ring | 61289934 |
| C3-7 | Aug 22 | 04 | interactive | "I'm happy for them" ×2 → not a lie; half of a true sentence whose other half was filed under ugly | neutral | valve | reframe-c3-07-happy-for-them | 61289935 |

Spacing: conversion beats Aug 16 & 20; interactive Aug 19 & 22; every format rested 11 days (the maximum a 7-day rotation allows); states A×2 / B×2 / C×2 / valve×1; male POV on C3-1 and C3-6, female protagonist on C3-3.

**The cycle-2 clone defect recurred, on the first draft.** C3-1 (fmt 01) came out carrying C2-1's spine: the same *"brought to me for a signature/verdict"* image, the same **"He thinks he's asking X. He isn't."** beat, the same *"A man wrote to me…"* opening. Caught by diffing each draft against the same format's previous send — the check STATE prescribed after cycle 2, now proven necessary a second time. Rewritten around a witness asking to have his own eyes checked. Two smaller catches: C3-1 and C3-3 both closed on "you're the one who signs it" (one moved off it), and C3-5 reran C2-5's *"and it isn't weakness"* reassurance. Writing all seven in a single context (rather than one subagent per slot) is what made the cross-draft repeats visible at draft time; keep that.

**Still open from cycle 2, and now overdue:** `formats/02-the-parable.md` and `formats/07-the-sign.md` still hard-code signature sentences into their skeletons, which is the root cause of the cloning. Give both a variant bank before cycle 4.

### Cycle 4 — LIVE (scheduled 2026-08-16 to `theseerwithin_free` 6936953, back to back with cycle 3)

Written and scheduled the same day as cycle 3, so Aug 16–29 runs unbroken with no dark days. All-legacy `?campaign=` links again (redirector still not on `origin/Production`).

**Rotation order changed.** Cycles 2 and 3 both ran the *identical* format sequence (01, 03, 06, 07, 05, 02, 04), so every format had been landing on the same weekday. Cycle 4 runs **03, 01, 07, 06, 05, 02, 04**; every format still rests 6–8 days. Keep permuting the order each cycle.

| Send | Date | Fmt | Type | Reframe (1-line) | Cast | State | Slug | AWeber id |
|---|---|---|---|---|---|---|---|---|
| C4-1 | Aug 23 | 03 | insight | Ten of Swords → one sword ended it; the other nine went in afterwards, one per retelling, and those are the removable ones | neutral | C | reframe-c4-01-ten-of-swords | 61289971 |
| C4-2 | Aug 24 | 01 | conv | "is that awful?" → do I have to be on my way out to be worth coming back to | **F** | A | reframe-c4-02-is-that-awful | 61289978 |
| C4-3 | Aug 25 | 07 | interactive | the sign that says keep waiting → nobody asks for a sign while unsure; the hour you asked is the reading | neutral | B | reframe-c4-03-the-sign-to-stay | 61289973 |
| C4-4 | Aug 26 | 06 | insight | "you'll meet someone when you're ready" → no pass mark and no examiner but you, so every month alone reads as a failed exam | neutral | B | reframe-c4-04-when-youre-ready | 61289974 |
| C4-5 | Aug 27 | 05 | conv | "keeping my options open" → abstaining, so you're never the one who chose and never the one who was wrong | neutral | A | reframe-c4-05-options-open | 61289975 |
| C4-6 | Aug 28 | 02 | insight | the key to a door he can't open → the ending was done to him; the key is the one act of it still his to perform, on a day he picks | **M** | C | reframe-c4-06-the-key | 61289976 |
| C4-7 | Aug 29 | 04 | interactive | "it was only a few months" ×2 → a case argued in advance for a grief you don't believe you've earned | neutral | valve | reframe-c4-07-only-a-few-months | 61289977 |

Spacing: conversion beats Aug 24 & 27; interactive Aug 25 & 29; states A×2 / B×2 / C×2 / valve×1. **Cast correction:** format 01 had run a man's letter three cycles straight (C1-1, C2-1, C3-1), so C4-2 is a woman's and the male POV moved to the parable.

**The clone diff caught six collisions this cycle, all against cycle 3, none of which the mechanical gate can see.** Both card emails had reached for the same 2am/after-dark setting (the Ten of Swords retelling moved to a car and a walk); both fmt-01 openers were "N lines arrived" *and* C4-2 had reverted to the retired **"She thinks she's asking X. She isn't."** beat; both fmt-07 sends used *"I'm not going to take that from you"* + *"I only want to move…"*; both fmt-06 sends opened the concession with a near-verbatim *"Let me grant the true half first, because it's a large one"*; both fmt-05 sends used *"let me put the kind/sensible word down"* and the same truer-sentence practice shape; both fmt-04 sends opened on the same three beats (*said it twice · nobody had accused/disagreed · we don't repeat what we're settled about*). **Every one came from a signature sentence in a format spec or the previous send, exactly as diagnosed.** Fixed in draft; the specs for 02 and 07 now carry variant banks (see below).

**Done this cycle:** `formats/02-the-parable.md` and `formats/07-the-sign.md` got a `## 7b ⚠ Don't clone the last one` section — the variant bank cycle 2 and 3 both asked for. Each lists the spent signature sentences, the reframe *axes* already used, and instructs the writer to find a new axis rather than a new object. **Formats 01, 04, 05 and 06 need the same treatment** — this cycle's collisions show the problem is not confined to 02 and 07.

**Watch for cycle 5:** two consecutive parables now hinge on a small metal keepsake (C3-6 the ring, C4-6 the key). Next parable must not be an object-on-a-shelf story at all.

## Rotation balance (keep honest as you schedule)

- **Format no-repeat:** don't reuse a format within ~2 weeks. Rotate all 7.
- **Conversion beats (~2/week):** formats **01** and **05**. Don't schedule them back-to-back.
- **Interactive (drives replies):** formats **04** and **07** — space them so a reply-ask lands ~2×/week.
- **Audience-state balance** (A uncertain / B waiting / C bereft / valve): keep all served across a rotation; note each send's dominant state.
- **Cast gender balance:** the reader is always gender-neutral, but the *cast* (letter-writers, story protagonists) must not drift back to all-female. Aim for a genuine mix; **at least one explicit male POV per rotation** (format 01 is the natural home).

## No-repeat lists

- **Reframes used:** will-they-come-back/permission · dead-plant/hope-kept-safe · Tower/the-lie-not-your-life · line-said-twice/the-wall · giving-space/bracing · if-they-wanted-to/the-question-about-you · recurring-sign/your-attention · show-her-I've-changed/would-I-keep-it-unseen · love-yourself-first/not-an-entrance-fee · not-looking-for-serious/a-flinch · fence-her-color/keeping-the-we-alive · protecting-my-peace/a-wall · Devil/chain-is-loose · song-everywhere/your-attention-not-their-message · lighthouse-lamp/keep-your-own-light-lit · stop-looking/stop-auditioning · too-late/still-worth-choosing · Three-of-Swords/soft-enough-to-be-pierced · trust-your-gut/signal-vs-memory · resurfaced-photo/the-returning-not-the-arrival · low-maintenance/pre-declining · uncounted-jar/a-wish-never-made-accountable · it's-complicated/shelter-from-a-simple-answer · was-any-of-it-real/can-I-trust-my-own-eyes · the-Moon/your-own-fear-handed-back-as-evidence · everything-happens-for-a-reason/the-reason-is-made-afterwards · the-recurring-dream/the-hour-you-stop-managing-the-wanting · taking-it-slow/parked-not-slow · the-ring-bought-early/deciding-while-nothing-is-at-stake · I'm-happy-for-them/half-of-a-true-sentence · Ten-of-Swords/nine-added-in-the-retelling · is-that-awful/do-I-have-to-be-leaving-to-be-kept · the-sign-that-says-stay/the-hour-you-asked-is-the-reading · when-you're-ready/an-exam-with-no-pass-mark · keeping-my-options-open/abstaining · the-key-to-a-changed-lock/the-one-act-of-ending-still-yours · only-a-few-months/a-case-argued-for-unearned-grief. *(Don't repeat a reframe; find a new turn.)*
- **Hooks used:** man's 3-line letter · watered a dead plant · Tower ekphrasis · "I'm fine on my own" ×2 · "giving them space" euphemism · "if they wanted to, they would" · 11:11 / the recurring sign · man's letter with his age in the first line and the last · Three of Swords ekphrasis · "trust your gut" half-truth · the phone's resurfaced memory photo · "I'm low-maintenance" handed over like a credential · eleven years of coins, never counted · "it's complicated" said twice · four lines at 2am with one word in three of them · the Moon's nightscape ekphrasis (no villain in the picture) · the sister's line at the graveside · the same dream three nights, never the same room · "taking it slow" as the sentence nobody argues with · he bought the ring four years before he met her · "I'm happy for them" said twice into a gap in the call · ten swords when one would have done it · the same question at both ends of a message · the sign that arrived the evening you'd decided to stop · "when you're ready" said kindly every few months · "keeping my options open" as the sensible thing to say · a key on a ring to a lock that was changed · "it was only a few months" got in early, before anyone asked.
- **Cards used (format 03):** the Tower, the Devil, the Three of Swords, the Moon, the Ten of Swords. *(Never reuse a card; the wider deck lives in the tarot program's card assets.)*
- **Euphemisms used (format 05):** "giving them space," "protecting my peace," "I'm low-maintenance," "we're taking it slow," "keeping my options open."
- **Maxims used (format 06):** "if they wanted to, they would," "love yourself first," "you'll find love when you stop looking," "trust your gut," "everything happens for a reason," "you'll meet someone when you're ready." *("Time heals" was drafted and held back for a later cycle — it's the strongest one left.)*
- **Arguments to rest (worn out by repetition, not by a single use):** "your wall/armour keeps everyone out" (C1-3, C1-5, and cut from C2-2) · "waiting done wrong hollows you, tending keeps you whole" (C1-8, and cut from cycle 2) · the closing practice "write/say it in one sentence" (used in C2-1 and C2-7; rested through cycle 3, keep it rested) · the fmt-01 spine of *"they brought me a verdict/question for a signature"* + the **"He thinks he's asking X. He isn't."** beat + the *"A man wrote to me…"* opener (C1-1, C2-1, and cut from C3-1 — vary at least two of the three next time) · the reassurance *"and it isn't weakness"* (C2-5, cut from C3-5) · the 2am / after-dark setting for a mechanism (C3-1, C3-2, and moved out of C4-1) · the fmt-01 opener *"N lines arrived/came in"* with a count (C1-1 three lines, C3-1 four lines, cut from C4-2) · fmt-07's *"I'm not going to take that from you"* + *"I only want to move…"* (C3-4, cut from C4-3) · fmt-06's *"Let me grant the true half first, because it's a large one"* (C3-3, cut from C4-4) · fmt-05's *"let me put the kind/gentle/sensible word down"* (gold, C3-5, cut from C4-5) · fmt-04's *"We don't repeat what we're settled about"* + *"nobody had accused/disagreed"* pair (C3-7, cut from C4-7) · fmt-05's truer-sentence practice worded as *"if it sits wrong, good / if it lands with a thud"* (gold, C2-5, C3-5 — rest it a cycle).

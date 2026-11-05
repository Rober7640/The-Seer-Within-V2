# Reference: offer 11 (The Unsent Letter)

Model reports: `improve-v1/v1-one-time-BEs/docs/11/product/11-P3-su5-report.md` and `11-P3-su6-report.md`. Copy their structure, never their content. Header line 1 must say `letter-first shape, question shape, bar shape` or the bar rules don't switch on.

## Each Soul Urge's idea

`product/11-P6-voc-what-buyers-say.md`, the "All 12" table, is THE source. `11-acts.json`'s `soul_urge` rows come from the retired AI flow; where they disagree, the P6 table wins (an acts line can still serve as a letter line). The table gives each Soul Urge four things: the buyer's word, the cover line she's proud of, the big idea, and the unsaid sentence (which goes in card 11).

You decide "what they took" in her words, plus the habit-character, the spine image (a household object she can act on in the close, and not one another report already uses: see `SPINE` in the checker), and her own 30-day instruction. Mine the old report for habits and images a reader liked; don't reuse its structure.

## The 12 questions, in card order

1. What did they take from me?
2. Did they ever really love me?
3. Was it my fault?
4. Why have they still got it?
5. Why has it taken this long?
6. What do they regret?
7. Why does nobody new get close?
8. Is it too late for me?
9. Are they giving it back, or trying to get me back?
10. Will they ever do anything about it?
11. What did they never say?
12. What do I do now?

The close answers **Will I be happy again?**

## Cards 1 and 2 by Soul Urge

Card 1 is the major numbered for her number. Card 2 answers "did they love me?".

| SU | Card 1 | Card 2 |
|---|---|---|
| 1 | the Magician | the Star |
| 2 | the High Priestess | the Moon |
| 3 | the Empress | the Sun |
| 4 | the Emperor | the Tower |
| 5 | the Hierophant | Wheel of Fortune |
| 6 | the Lovers | Temperance |
| 7 | the Chariot | the Sun |
| 8 | Strength | the Star |
| 9 | the Moon (XVIII; 1 + 8 = 9, because the Hermit is a free-letter card) | the World |
| 11 | Justice (XI) | the Moon |
| 22 | the Fool (0, numbered 22 in older decks) | the World |
| 33 | the Hanged Man (there's no card 33; this is the caretaker's card) | Temperance |

The checker's `FIRST_TWO` holds this table, and the checker enforces it.

## Deal rules for cards 3–12

- Each card comes from its act's pool in `n8n/scripts/11-acts.json`.
- Card 8 is the Tower, Death or the Moon. Card 10 is Death, the Star or the Sun. Card 12 is Strength or the World.
- **Death appears only at card 8 or 10**, and its card always says "Nobody's died." (the checker enforces it). We can't filter widows out of the list. Its picture details are in `drawn_full` (no `drawn` list). Check whether card 2's fixed card leaves Death as an option at 10.
- **The Hermit, Judgement and the Devil never appear in the paid reading.** They're the free letter's cards.
- No card appears twice. Picture details come from `cards.<slug>.drawn` (Death: `drawn_full`).

## Words that are banned in reading text

numerology, karmic, vowel, soul urge, life path, "expression", "sum".

Say the number as "Your birth name carries a 5 at its heart."

## Fill-ins (shared list: `n8n/scripts/11-swapins.json`)

These frames are required, exactly as written:
- `They leaned on {{EX.use}},`
- `I took {{EX.kept}} for granted.`
- `{{LP.then}}` as its own paragraph
- `{{EX.trait}} {{LP.trait}}` in card 2, after "told me who I was laying them for"

Bar shape drops `{{EX.praise}}` and `{{LP.praise}}`.

Version blocks: `[[FORK get_back|giving]]` and `[[REASON 0|1|2]]`.

The close uses `{{NEXT_BDAY}}` and `{{PY.ahead}}`.

## Checker settings in the bar shape

- `SPINE[su]` holds the spine image's key word. It must appear in the opening and in the close's last paragraph.
- 5 or more bullet lines in the cards; 4 or more in the close.
- Total 2,900–3,550 words; the letter is about 1,000–1,250.
- they/them 55 or fewer.

## Review copies

Fill both forks with `lib11_assemble.reading_for(name, dob, today=…)` and `as_text()`. Write them to `product/review/SU<N>-bar-get-you-back.txt` and `…-giving-it-back.txt`.

Test buyers per Soul Urge are listed in `n8n/scripts/build-11-assemble.py` under `MORE`. Pick one per fork.

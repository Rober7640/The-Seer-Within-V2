# How we make an 11 report (The Unsent Letter)

*Recorded 2026-11-03, after the first one (Soul Urge 9) beat the machine version in a blind read.*

## What we found → what it means → what we do

| Found | Means | Do |
|---|---|---|
| The n8n flow writing each reading live (execution 51764) failed its own grader twice, 6.2 and 6.15. A blind reader scored it 3/10 for "worth $35" | Writing per order with a model gives you whatever the model writes that day. Its faults came from our prompts: every card got its full list of objects and a fixed last line | **Don't write per order.** Write one fixed report per Soul Urge, once, and read every word before it ships |
| The hand-written Soul Urge 9 report scored 8/10 for "worth $35" with the same blind reader | Built around one number, a reading can be specific without inventing her life | The **Soul Urge drives everything**. The cards only exist to tell its story |
| The same reader: one picture per card, "and she told me why it was me" | A card is an illustration, not a lesson in tarot | Each card describes **one** detail, at most two |

There are 12 reports in total: Soul Urge 1–9 plus the masters 11, 22 and 33. Karmic debt does not pick the report (decided 2026-11-03: it's a debt *she* owes, which reads as blaming her, and only about 44% of buyers carry one).

## Files

| File | What it is |
|---|---|
| `11-P1-plan.md` §4–§6 | The Soul Urge rows, the flat answers, and what the "trying to get you back" path changes |
| `11-P2-su<N>-spine.md` | **Step 1.** The outline for one Soul Urge: the one idea, 12 beats, one card and one detail per card |
| `11-P3-su<N>-report.md` | **Step 2.** The written report, with swap-in tags |
| `11-P3-su<N>-blind-read-<k>.md` | **Step 4.** Each blind read, with the key to which reading was which |
| `scripts/check-report.py` | **Step 3.** The free text checks |
| `scripts/make-blind-copies.py` | **Step 4.** The clean, unlabelled files for the blind reader |
| `../n8n/scripts/11-acts.json` | Section jobs, Evelyn's night beats, exact lines, what's drawn on each card |
| `../n8n/scripts/build-11-n8n.py`, lines 93–135 | Evelyn's voice and every ban |
| `../sales-emails/11-E2-esl.md` | The free letter she read before buying. The report pays off its promises and never quotes it |

## The steps

### 1. Outline the number (main thread, ~30 min)
Write `11-P2-su<N>-spine.md` from the Soul Urge row:
- **The one idea:** what this thing is, said as something she *does*, both ways if it has two (softness = lets things reach her, and lets her show).
- **12 beats.** Each card keeps its fixed job and flat answer from `11-acts.json`. The beat says what that job means *for this one thing*.
- **One card per slot.** It must come from that act's pool. Card 8 must be Tower, Death or Moon; card 10 Death, Star or Sun; card 12 Strength or World. Death only at 8 or 10. No card twice. Pick the card whose picture *shows* the beat, then name the one detail that does it.
- **Weights:** big 450–650 words (cards 1, 8, 9, 10, 12), medium ~300 (3, 5, 7, 11), short 100–150 (2, 4, 6). Short cards get no night scene and no task.

Show the outline to the operator before writing.

### 2. Write the report (one writer subagent, main model)
Send the writer brief in **Appendix A**, filled in for this number. It writes `11-P3-su<N>-report.md` for the test buyer, with swap-in tags around anything that depends on a number other than the Soul Urge:
`[[EX]]` what they saw · `[[LP]]` her pattern · `[[EXCUSE]]` · `[[REASON]]` · `[[FORK]]` path-only passages.

Write the "trying to get you back" path first. The giving-it-back path comes after the report is approved.

### 3. Check it (main thread, free)
```
python3 docs/11/product/scripts/check-report.py docs/11/product/11-P3-su<N>-report.md
```
It checks words per section, the required lines, banned words (numerology, ex/partner, hedges, therapy words, British words), "years" only in card 8, the three windowsill cards never falling, and that every tag is closed. Fix small hits in place. Then **read it yourself** for what a script can't see: Evelyn's night in time order, the tea used once, no invented events in the letter, and only cards 1, 3, 7 and 12 ending on something to do.

### 4. Blind read (one reader subagent, main model)
```
python3 docs/11/product/scripts/make-blind-copies.py \
  docs/11/product/11-P3-su<N>-report.md  <control.md>  <scratch folder outside the repo>  [--swap]
```
- **Always use a control arm.** On the first read it's the machine run. After that it's the last approved version. Alternate `--swap` between reads so A/B position never decides.
- The scratch folder must be outside the repo, so the reader can't find how either was made.
- Send the reader brief in **Appendix B**. Save the verdict as `11-P3-su<N>-blind-read-<k>.md` with the key and this caveat at the top: *a model reader, not a buyer; the same model family wrote the report.*

### 5. Fix and re-read
Turn the reader's notes into a short fix list, one line per fix, and show the operator. After fixes, run step 4 again with a **fresh** reader against the previous version.

### 6. Operator reads and approves
Nothing is final until the operator has read the whole report.

### 7. After approval
1. Write the giving-it-back versions of the `[[FORK]]` passages.
2. Do the next Soul Urge from step 1.
3. Write the swap-in banks once, in everyday words: 11 "what they saw" lines and 11 "her pattern" lines (from Expression and Life Path), 3 excuses and 3 reasons. ⚠ The blind reader flagged the current wording, "someone who could run things and make them happen", as sounding like a form.
4. n8n then **assembles**: pick the report by Soul Urge, fill in the name, date and swap-ins, build the PDF and send. No model at order time.

## Lessons that cost us a run
- A full list of what's on a card gets written out as a list. Hand over one detail.
- A rule given to every section gets obeyed in every section. Fixed last lines on 11 cards made one formula.
- Homework threads ("keep the paper, add how long it's been") read as nonsense once written.
- Quoting the sales letter back ("fault found by Thursday") makes no sense on its own. Say it fresh.
- Her Life Path pattern leaks everywhere if it's allowed. Card 7 and the letter only.
- Planning words leak onto the page: "the lowest point in this whole reading" came from our word "low point".
- Things the blind reader bristled at: openers that sound like a scolding ("Now your half, and you won't like it"), and telling her what her body felt.

---

## Appendix A — the writer brief

Fill in the `<…>` parts. Send it as written: the subagent has none of our conversation.

> You are writing ONE complete paid tarot reading for a backend offer called "The Unsent Letter" (The Seer Within). This is a fixed report for every buyer whose Soul Urge number is <N>. It will be read and edited by the operator, then reused for every SU <N> buyer with a few swap-in lines. Write it as finished prose, not an outline.
>
> **The governing idea (most important).** The Soul Urge drives EVERYTHING. SU <N> = "<took>". The whole reading is one story about <it>. The twelve cards exist only to tell that story: each card is ONE picture for ONE chapter of it. A card never adds a meaning of its own and never pulls the reading off <it>. <The one idea from the spine, in 3–4 sentences.>
>
> **Read these first** (under improve-v1/v1-one-time-BEs/docs/11/): 1. product/11-P2-su<N>-spine.md, the outline you are writing from. 2. n8n/scripts/11-acts.json: "sections" (each job, flat answer, night beat, `_get_back` variants, letter and close rules, exact lines) and "cards" (what's drawn; describe only things on that list). 3. n8n/scripts/build-11-n8n.py lines 93–135, the VOICE block; follow every rule. 4. product/11-P1-plan.md §4–§6. 5. sales-emails/11-E2-esl.md, the free letter she read; pay off its promises; ⛔ never quote its sentences. 6. Optional, voice only: product/11-P3-su9-report.md (approved); don't reuse its lines.
>
> **This buyer:** <name, date, the SU row, what they saw, her pattern, the excuse, the reason, the fork, why they kept it, should she answer>.
>
> **The cards, in order (one each, fixed):** <12 cards>. For each card, describe the ONE detail named in the outline, and at most one more from its `drawn` list. Never list the card's contents. Name the card. One or two sentences of picture, then straight into what it shows about <it>.
>
> **Uneven weights:** BIG 450–650 (cards 1, 8, 9, 10, 12): picture, answer, her life, Evelyn's night. MEDIUM ~300 (3, 5, 7, 11). SHORT 100–150 (2, 4, 6): one picture, one hard line, no night scene, no task. Opening ~200, letter 400–600 (their voice: plain, tired, a bit stiff), close ~60. Total about 4,500. No two cards in a row open or end the same way.
>
> **Evelyn's night:** the night beats from 11-acts.json, in time order (evening → midnight → three in the morning → grey window → full light). Beats on short cards move to the nearest medium or big card and keep their order. The tea, the lamp, the upstairs window (card 8) and swearing at her hands (card 9) are each used once.
>
> **Required, exactly:**
> - Opening: her first name alone on the first line; read in order, don't jump to the letter, it only comes back whole; some cards will seem to argue; the sentence "Your birth name and date set how I lay your twelve cards." word for word, as its own sentence; the phrase "this is someone living"; "you owe them no reply" (again at card 11); nothing here asks her to contact, wait for, or forgive them.
> - Card 1's first sentence, in **bold**, names what they took with her first name inside it.
> - The cover word: named at 2, attacked at 8, retired at 12.
> - Card 9's first sentence, in **bold**, answers the fork with her name inside it.
> - Card 10's first sentence, in **bold**: no, they won't act, with the reason in that same sentence. This is the turn.
> - Card 11's first sentence gives the unsaid sentence word for word. The letter repeats it word for word.
> - Card 12: the first sentence gives the one thing to stop (going back: rereading, looking them up, starting a message) and the one thing to do. Bold labels **Stop going back.** and **The one thing to do.** The pull is strongest in the next five to seven days, and that's about her, never about them turning up. It won't feel like much at first; how soon is down to what she does.
> - Only cards 1, 3, 7 and 12 end on something for her to do, notice or stop.
> - Close: the chair across is only furniture again; (get-back path) the ask is a bill nobody owes; the very last line, word for word: It's back. What you do with it is on you.
>
> **Don't repeat these measured failures:** card pictures as inventories · fixed last lines everywhere · paper homework · her Life Path pattern outside card 7 and the letter · the same sentence in two cards · choppy primer prose · openers that scold ("you won't like it") · telling her what her body felt · planning words on the page ("low point").
>
> **Swap-in markers:** `[[EX]]…[[/EX]]` · `[[LP]]…[[/LP]]` · `[[EXCUSE]]…[[/EXCUSE]]` · `[[REASON]]…[[/REASON]]` · `[[FORK]]…[[/FORK]]`. Keep them small; the rest must work for any SU <N> buyer.
>
> **Output:** improve-v1/v1-one-time-BEs/docs/11/product/11-P3-su<N>-report.md: a 3-line header (what this is, buyer, cards), then [OPENING] [CARD 1] … [CARD 12] [LETTER] [CLOSE] on their own lines, prose under each, no other headings. Run `python3 improve-v1/v1-one-time-BEs/docs/11/product/scripts/check-report.py <that file>` and fix every FAIL. Reply in under 200 words: the word-count table and anything you had to bend, and why.

## Appendix B — the blind reader brief

Send it as written, with the three file paths from step 4. Use the same persona every time so scores compare across reads.

> You are a reader, not an editor or a writer. Stay in character the whole time.
>
> **Who you are.** You're a 61-year-old American woman. You live alone, you work part-time, you have grown kids and a couple of close friends. Years ago someone mattered to you a great deal, and it ended badly. You still think about it more than you'd admit. You're not a writer and you don't read "literary" stuff; you read on your phone in the evening. You've had a psychic reading before. You're open to it, but you've been burned by vague, flattering readings that could have been about anyone, and you can smell a sales pitch. You'd never call yourself a victim, and you bristle at being lectured or blamed.
>
> **What happened.** A few days ago you got a free letter by email from a reader called Evelyn Cross. It hit home, so you paid $35 for the full reading it offered. Read it first, as the woman who received it: `<free-letter.md>`. Your name in it is <name>. Pretend that's you. Two different versions of your paid reading were written, and we want to know which one you'd rather have received. Read both, all the way through, as yourself: Reading A `<reading-A.md>`, Reading B `<reading-B.md>`. ⛔ Read ONLY those three files. Don't open anything else, and don't search for how these were made.
>
> **For EACH reading, in your own voice:** 1. Where your attention dropped (quote the first few words, say why). 2. Where you felt seen (up to three quotes, under 20 words each). 3. Where it lost you: generic, about some other woman, confusing, repetitive, preachy, blaming, fake, creepy, a sales trick (quote briefly, say what was wrong). 4. The cards: did the pictures help, or did you skip them? 5. The letter at the end: could it really be from that person? Did it land? 6. Scores 1–10: kept me reading · felt written for me · worth the $35 · I trust Evelyn · I'd tell a friend about her.
>
> **Then:** which one you'd rather have received, and why, in one honest paragraph. If anything made either feel off or not quite human, say what (gut only).
>
> **Output:** write it all to `<out_dir>/verdict.md`. Reply in under 250 words: the scores side by side, which you'd rather have, and the single biggest problem in each.

## Results so far

| Report | Read | vs | Kept reading | Written for me | Worth $35 | Trust | Tell a friend |
|---|---|---|---|---|---|---|---|
| SU 9 v1 | blind read 1 | n8n 51764 | **8** vs 4 | **7** vs 4 | **8** vs 3 | **7** vs 4 | **6** vs 3 |
| SU 9 v2 | blind read 2 | SU 9 v1 | **8** vs 7 | 6 vs 6 | **7** vs 6 | **6** vs 4 | **5** vs 4 |
| SU 9 v3 | blind read 3 | SU 9 v2 | **8** vs 7 | **8** vs 7 | **8** vs 7 | 6 vs 6 | **6** vs 5 |
| SU 9 v4 | blind read 4 | SU 9 v3 | **8** vs 7 | **7** vs 6 | **7** vs 6 | **7** vs 5 | **5** vs 4 |

⚠ Each read uses a fresh reader, and readers score differently (v1 got 8 for "worth $35" from reader 1, 6 from reader 2). Compare only within one read.

**Fixed in v3 (read 2 notes):** the letter reuses Evelyn's phrases and is too self-aware to sound like them · Evelyn's night after nearly every card felt staged · card 12's advice reads like a pamphlet (both readers) · "take charge" told reader 2 what kind of woman she is and got it wrong · no he/she anywhere was noticed (kept on purpose: rule) · "One word doesn't make a letter" and "a room made of paper" lost her.

**Read 3 notes (cards 7–8 blame, [[LP]] echo, Tower lightning, "beside you now") fixed in v4.** Was open after read 3: cards 7 and 8 read like a telling-off ("Some of what's happened since is yours", "charging it to everybody since"): where reader 3 nearly closed it · the [[LP]] line ("clam up, chew on it") sits in both card 7 and the letter, so the letter still reads as built from the reading · the Tower is described without its lightning · "If somebody's beside you now" shows Evelyn doesn't know if she's with anyone · trust stuck at 6 across reads 2 and 3 · the swap-in banks need two wordings of each line (reading and letter), since v3's letter says what they saw in its own words.

**Still open after read 4:** Evelyn's night still read as performance to reader 4 even on 5 cards (attention dropped at card 8's "I got up from the table"), though reader 3 praised the cut · the "take charge, get things done" line feels like a guess (swap-in bank risk) · short cards 4 and 6 felt thin · nothing specific about him (by rule: no invented facts) · the [[EX]]/[[LP]] banks need a reading wording and a letter wording.

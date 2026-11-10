# The blind read

Make the copies. The output folder must be OUTSIDE the repo:

    python3 improve-v1/v1-one-time-BEs/docs/11/product/scripts/make-blind-copies.py <new.md> <control.md> <scratch_dir> [--swap]

- The control is the version the new one must beat: `git show <sha>:<path> > control.md`.
- Use `--swap` on every other run, so the slot doesn't decide the result.
- Both readings get the same buyer, Testina Rose Testerly (1962-11-05).
- Spawn ONE agent on the main model. Send the brief below exactly as written, so scores compare across reads. Don't tell it which version is new.
- Record the result: the scores side by side, which one it preferred, the biggest problem in each, and the slot the new version was in. Add this caveat: *a model reader, not a buyer; the same model family wrote the report.*

## The brief

> You are a reader, not an editor or a writer. Stay in character the whole time.
>
> **Who you are.** You're a 61-year-old American woman. You live alone, you work part-time, you have grown kids and a couple of close friends. Years ago someone mattered to you a great deal, and it ended badly. You still think about it more than you'd admit. You're not a writer and you don't read "literary" stuff; you read on your phone in the evening. You've had a psychic reading before. You're open to it, but you've been burned by vague, flattering readings that could have been about anyone, and you can smell a sales pitch. You'd never call yourself a victim, and you bristle at being lectured or blamed.
>
> **What happened.** A few days ago you got a free letter by email from a reader called Evelyn Cross. It hit home, so you paid $35 for the full reading it offered. Read it first, as the woman who received it: `<dir>/free-letter.md`. Your name in it is Testina. Pretend that's you. Two different versions of your paid reading were written, and we want to know which one you'd rather have received. Read both, all the way through, as yourself: Reading A `<dir>/reading-A.md`, Reading B `<dir>/reading-B.md`. ⛔ Read ONLY those three files. Don't open anything else, and don't search for how these were made.
>
> **For EACH reading, in your own voice:** 1. Where your attention dropped (quote the first few words, say why). 2. Where you felt seen (up to three quotes, under 20 words each). 3. Where it lost you: generic, about some other woman, confusing, repetitive, preachy, blaming, fake, creepy, a sales trick (quote briefly, say what was wrong). 4. The cards: did the pictures help, or did you skip them? 5. The letter at the end: could it really be from that person? Did it land? 6. Scores 1–10: kept me reading · felt written for me · worth the $35 · I trust Evelyn · I'd tell a friend about her.
>
> **Then:** which one you'd rather have received, and why, in one honest paragraph. If anything made either feel off or not quite human, say what (gut only).
>
> **Output:** write it all to `<dir>/verdict.md`. Reply in under 250 words: the scores side by side, which you'd rather have, and the single biggest problem in each.

## Results so far (offer 11)

| Read | New vs control | New | Control |
|---|---|---|---|
| SU 5 r1 | question shape vs cards-heavy | 6/5/6/5/4 (lost) | 8/7/7/7/6 |
| SU 5 r2 | fix pass vs cards-heavy | 8/7/8/6/6 | 6/6/5/6/4 |
| SU 5 r3 | bar shape vs r2 winner | 8/7/7/7/6 | 6/6/6/6/5 |
| SU 6 | bar shape vs old SU 6 | 8/8/8/6/7 | 6/7/6/5/4 |
| SU 7 | written from THIS SKILL alone vs old SU 7 | 8/7/8/7/7 | 6/7/6/6/5 |

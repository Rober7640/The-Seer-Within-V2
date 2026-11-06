# 12 · Lucky Numbers — P1: the reading plan

**Status, 2026-11-02:** plan done, generator built, all free checks pass, and a first test PDF has been made from a **hand-written stand-in, not a model run** (see "The test reading" below). No model has written a word of this yet. Nothing has been pushed to n8n, activated or deployed. Nothing is committed.

**What she gets:** one PDF, about 19 pages, with every number and date worked out by code (`lucky-12.js`), and about 4,000–4,500 words from Evelyn written around them. If she bought the bump, The Full Year adds two pages at the end.

---

## 1. Decisions

| # | Decision | Why |
|---|---|---|
| 1 | **The model never computes a number.** `lucky-12.js` works out every number, date, weekday and hour. The model is handed them, and each section's brief lists the only numerals it may write. Code checks every numeral, date and weekday in the prose. A wrong one on the second try **holds the reading for a person** and never ships. | A wrong lucky number is the one mistake she can check, and it kills trust in everything else. |
| 2 | **4 act calls + 1 grade.** No story plan. | 11 needed a plan to keep a story straight. 12 has no story: the engine output is the plan. |
| 3 | **Model `gpt-6.1-sol`** for writing (effort high) and grading (effort low), strict `json_schema` per act. Never temperature, top_p or logprobs. | Same stack as 11. |
| 4 | **The calendar cover, number panels, balls, PIN tiles, stop box, month badges, hour chips, use lines, keep page and the bump pages are all drawn by code** (HTML + inline SVG). The model writes only the prose under them. | Everything with a number on it comes from the engine, so it can't be wrong. No image files, so nothing can fail to load. |
| 5 | **The bump intro is fixed copy in code**, not model-written. | Fewer moving parts. It's 3 sentences. Open decision O6 if you want Evelyn's voice there. |
| 6 | **Minimum 14 days between the order and her first open day** (was 2). Cutoff for a "2027" window moved to orders by **2027-01-17**. | Upsell 1's citrine bracelet is posted and must arrive before her first open day (coordinator's instruction). |
| 7 | **Arm B never says "miracle"**, and says plainly that no win is promised. Arm A names the kind of small miracle each number brings. | Arm B's letter never used the word. Arm A's letter promised "small miracles" (loop L10), so the reading has to pay that off. |
| 8 | **The keep page leaves the PIN off.** It says the PIN isn't on this page and to keep it in her head. | The keep page is meant to go in her purse. A PIN in a purse next to the card is the one thing the PIN section tells her never to do. |
| 9 | **Months shared, weekdays first** (operator, 2026-11-02). The twelve months go to her numbers in turn (4 each with three different numbers, 6 each with two). Inside a month a weekday wins. Only about 0.2% of open days now fall at a weekend; just those months get a weekday stand-in printed on the interview line. | The old score gave about half of buyers all twelve months on one number, nearly all at a weekend, and the month tasks ran out and repeated. Repeats now happen only when all three of her numbers are the same (about 1 in 90 buyers). |

## 2. Shape

```
COVER (code)      EVELYN CROSS · Lucky Numbers · her full name · born date · her three numbers in rings
                  · the twelve months, her open day ringed in each · "Your twelve open days · 2027"
OPENING           Act A
YOUR THREE NUMBERS  panel (code) + prose × 3              Act A
YOUR SIX TO PLAY  balls (code) + prose                    Act B
YOUR PIN          four tiles (code) + prose               Act B
THE NUMBER TO STOP USING  box + where-to-look list (code) + prose   Act B
YOUR TWELVE OPEN DAYS  intro + 12 months, each with a date badge (code) + prose   Act C
YOUR LUCKY HOURS  chips + the clock rule (code) + prose   Act D
WHAT YOUR NUMBERS ARE FOR  9 uses, each a filled-in line (code) + prose   Act D
THE CLOSE         prose + "Your friend, with a pen ready for your calendar, — Evelyn"   Act D
KEEP PAGE (code)  her numbers on one page, no PIN
COLOPHON (code)   worked out by fixed rules; words written with machine help; "Nothing here promises a win."
THE FULL YEAR (code, bump only)  calendar page + month-by-month list, last pages of the PDF
```

## 3. Sections

Words are targets. The whole reading must land between **3,500 and 4,700** words (target ~4,150). Each act is told to stay within 10% of its total.

| Section | Job | Closes | Words | Written by |
|---|---|---|---|---|
| opening | Who she is, one evening with her name and date. What's inside, in order. Read it all once, with a pen, before using any of it. Some days look odd: read it all before deciding one is wrong. If the name or date on page 1 is wrong, reply and it's redone. | L3 (sets up) | 280 | Act A |
| n1 | Her first number, the one she worked out herself. Must agree with the letter's line for that digit (below). When it comes, what it looks like, what it brings, one thing to do this week. | L3 | 330 | Act A |
| n2 | Second number, from every letter of her full birth name. Luck through other people. | L2, L3 | 320 | Act A |
| n3 | Third number, from the vowels. The private wish. Then how the three work together. | L2, L3 | 320 | Act A |
| six | How the six are built (families). Play the same six every time. Her promise, repeated: no chasing, no money she needs, one ticket where she'd have bought one. Honest wording when some are top-ups. | L4, L9 | 260 | Act B |
| pin | Where each digit comes from. Where to use it. Learn it, never keep it with the card. Never her birth date. | L5 | 200 | Act B |
| stop | Name it in the first lines. How it was found. What it does. Where to look: house, phone, PIN. **Never claim it was found there.** What to do if she finds it (PIN: change it; house: one small thing at the door). | L6, L7 | 300 | Act B |
| days_intro | What an open day is. Every one is a ticket day. Her personal year in a sentence. | L1 | 110 | Act C |
| day01–day12 | One month each: what the day is for (keyed to the number it carries) and the action handed. Openers, endings, actions and lengths rotate (below). | L1, L9 | ~115 each (90–140) | Act C |
| hours | What the hours are for, the clock rule (ten counts as 1, eleven 2, twelve 3), one hour on one open day. | L8 | 150 | Act D |
| use_lottery | Play the six, buy on open days, the arm's line, the promise in a few words. | L9, L4 | 70 | Act D |
| use_pin | Point back to the PIN. | L9, L5 | 30 | Act D |
| use_days | Put them in the diary, save the bigger asks for them. | L9, L1 | 40 | Act D |
| use_home | House numbers that add to hers (engine examples), steer clear of the stop number. | L9 | 60 | Act D |
| use_phone | Next number should add to her first number; keep the stop number out. | L9 | 50 | Act D |
| use_wedding | Pick an open day, or suggest one. | L9 | 45 | Act D |
| use_interview | Ask for the interview on an open day at her hour; say yes to an offer on one too; the weekday stand-ins. | L9, L8 | 70 | Act D |
| use_business | Open, sign or launch on an open day. | L9 | 45 | Act D |
| use_travel | Book around open days; seat, room or flight numbers that add to hers. | L9 | 60 | Act D |
| close | The order to do it in this week: PIN, six in her purse, dates in the diary, a look for the stop number. Then into her window. Arm A: she'll know which number brought a small miracle. Arm B: she isn't guessing any more. | L10 (arm A) | 140 | Act D |

**Total by act:** A ≈ 1,250 · B ≈ 760 · C ≈ 1,490 · D ≈ 760.

## 4. Loop check

Every loop the sales letters (12-E2-esl-A and -B) open, and where the reading closes it. `check-12-promises.mjs` fails if any loop has no closer.

| Loop | What the letter promised | Closed in | Made true by |
|---|---|---|---|
| L1 | Twelve open days, one in each month of 2027 | days_intro, day01–day12, use_days, cover calendar | engine: `openDays` (12, one per month, each carrying one of her three) |
| L2 | Her second and third numbers, from her full birth name | n2, n3 | engine: `numbers.n2`, `numbers.n3` |
| L3 | What her three numbers mean; the first agrees with the letter's 1–9 line | opening, n1, n2, n3 | fixed letter lines (below) handed to Act A |
| L4 | Six ticket numbers, each adding down to one of her three | six, use_lottery | engine: `tickets` (top-ups labelled honestly) |
| L5 | A four-digit PIN built from her numbers | pin, use_pin | engine: `pin` (never her birth date) |
| L6 | One number to stop using, not one of her three | stop | engine: `stopNumber` |
| L7 | Where it hides: house, phone, PIN (says where to look, never "I found it") | stop | brief + measured ban on "found it" lines |
| L8 | An hour that carries one of her numbers | hours, use_interview | engine: `luckyHours` |
| L9 | Every use filled in with her numbers | six, the twelve months, all nine uses | engine: `uses` (printed by code above each use) |
| L10 | **Arm A only:** which small miracle each number brings | n1, n2, n3 (each names its small miracle), close | arm A brief; measured: "small miracle" in each number |

## 5. Her first number agrees with the letter (fixed seeds)

These are the letter's lines, word for word. Act A is handed the one for her digit and told to agree with it and go further, never quote it whole.

| Digit | The letter's line |
|---|---|
| 1 | Your luck comes when you go first. A new job, a first visit, the first to put a hand up. It comes on the days you start something, and never while you wait for someone else to move. |
| 2 | Your luck comes through another person. An introduction, a phone call, a second chance. It comes on the second try, so don't stop after the first. |
| 3 | Your luck comes through talk. A chance remark, a word from a neighbour, a chat you nearly skipped. It finds you out among people, not at home with the door shut. |
| 4 | Your luck comes slowly, and on paper. Forms, contracts, a deed, a letter about a pension or a house. It comes after the work's done, never in a rush. |
| 5 | Your luck comes with change. A trip, a move, a stranger, a plan that falls through and makes room for a better one. It comes fast and it doesn't wait for you. |
| 6 | Your luck comes through home and family. A house, a gift, a quarrel that finally mends. It comes at your own table, or through the people who sit at it. |
| 7 | Your luck comes when you're on your own. A hunch, something you find, an answer that turns up in the quiet. It comes after you've stopped looking. |
| 8 | Your luck comes through work and business. An offer, a deal, a better role. It comes after you've asked for it out loud, and not before. |
| 9 | Your luck comes at endings. You let something go, and something good comes back to you. It comes as one thing closes, like a job, a lease or a long wait. |

If her number repeats (for example her first and second are both 7), the briefs tell the model to say so plainly, and the measures check it does.

## 6. Twelve months that don't read alike

"Prompt examples become templates", so the month briefs hand over a **mechanism**, never a sample line. Everything rotates off a seed from her order id, so two buyers get different shapes and a rerun gets the same one.

- **Action:** each day number (1–9) has six actions in `12-acts.json → day_number`. No action repeats while the list lasts, and none repeats in the last three months.
- **How it opens:** five openers (the month and the season, what to leave alone, the date itself, the number, what she does), dealt out by seed.
- **How it ends:** four endings (an hour, one thing to watch for, what to ready the day before, one small thing to do). Hour endings cycle through her lucky hours.
- **Length:** 115 words with a ±25 jitter, so the months don't all weigh the same.
- **Tickets:** three months (seeded) say "buy your ticket"; the intro says every open day is a ticket day.
- **Her name and "dear":** her name about 8 times in the whole reading, placed by seed, never as a section's first word after the opening. "Dear" at most 4 times.
- **Measured:** no 8-word run shared by two months, no two months opening on the same three words, each month names only its own date and weekday.

## 7. The calendar (D12)

Drawn in SVG by code (`calendarSvg` in node 10), never fetched:
- **Cover:** dark navy (#1C2238), gold (#D9B45E). A 4 × 3 grid of months, her open day filled in gold in each. Caption: "Your twelve open days · 2027" (or "April 2027 to March 2028" for a rolled window).
- **Each month's badge:** month, date, weekday, year, with the day's number above the prose.
- Six-week months are allowed for (a 31st on a sixth row never sits on the next month's title).
- `check-12-html.mjs` checks the ringed dates equal the engine's open days.

## 8. The bump: The Full Year (`full_year`, $12.77)

- Shown only when Stripe metadata says `bump: '1'` or `bumpProduct: 'full_year'`.
- Last two pages of the PDF: a 3 × 4 calendar with her open days filled and every other lucky day ringed (days where both the date and the calendar carry one of her numbers), then a month-by-month list.
- Testina gets 85 days (12 open days + 73 others).
- **All code.** The intro is four fixed sentences ("Your twelve open days are the best of each month. These are the rest… Keep the big asks for your open days.").
- ⚠ The order-bump copy says "on one calendar page". It's one calendar page, plus a list page. See O1.

## 9. How it's written (the n8n flow)

```
1 webhook → 2 paid 12 order? → 2a load intake (app API) → 2b join
→ 3 THE ENGINE (lucky-12.js pasted in, byte for byte) → 3a rotations, allow-lists, voice
→ 3c fan out 4 acts → [4 each act → 4a compose → 4b write (gpt-6.1-sol) → 4c keep | 4r/4s/4t retry a format failure once → 4z rejoin]
→ 5 collect → 6 assemble and MEASURE → 7 grade (gpt-6.1-sol) → 7a verdict (+ measured overrides)
→ 8 passed? no → first failure? → 8b log → 8c write again (once) → back to 3c
→ 9 log → 10 build HTML (HOLDS if any number is wrong) → 11 PDFShift → 12 upload → 13 hold to 24h
→ 13a sign URL → 14 find her on AWeber → 14a tag be-12-delivered + reading_url → 15 mark delivered
```

- **Each act sees everything written before it**, and the system block is the same for every act (so it can cache).
- **The grader fails open** (a broken grader never strands a paying buyer), but the **measured contract** overrides a pass: word count, the required lines, numerals, dates, weekdays, hedges, jargon, win words, "found it" lines, repeated months, markdown. A wrong number on the final attempt holds at node 10 for a person.
- **Arm** comes from Stripe metadata `c`: 1–5 → A, 11–15 → B, anything else → B.
- **Cost:** about $0.12–$0.30 a reading for one pass at $2/$10 per million tokens, depending on hidden thinking; double that on a regenerate. Run `node scripts/preview-12-prompts.mjs` for the current estimate.

## 10. The test reading

> ⛔ **HAND-WRITTEN STAND-IN, NOT A MODEL RUN.** The four act replies for Testina were written by hand (by Claude, following the exact briefs the model would get), saved as schema JSON in `n8n/runs/12-handwritten-testina/act-A.json … act-D.json`, and pushed through the **same** assembly, measures, grader wiring and HTML code the flow uses, with the outside calls faked. It shows the page and proves the checks work on a reading that keeps the rules. It says **nothing** about what gpt-6.1-sol will write.

- Buyer: Testina Rose Testerly (fixture), born 1968-07-21, ordered 2026-11-10, bump bought, arm B (`c=11`).
- Her numbers: 7, 8, 9 · six 7, 9, 17, 26, 36, 43 (spread across 1–49, rule 5 changed 2026-11-03) · PIN 7893 · stop 4 · window 2027 · hours 9am, 7pm, 8pm, 9pm.
- 4,298 words. 19 pages (17 + 2 bump pages).
- PDF: `n8n/runs/12-handwritten-testina/12-handwritten-testina-NOT-A-MODEL-RUN.pdf` (gitignored).
- Readable copy: [12-P1-test-reading.md](12-P1-test-reading.md).

## 11. Files

| File | What it is |
|---|---|
| `n8n/scripts/lucky-12.js` | The engine. Every number and date. |
| `n8n/scripts/12-acts.json` | Sections, words, loops, arms, letter lines, day actions, devices, banned words. |
| `n8n/scripts/build-12-n8n.py` | ⛔ The ONLY way flow JSON is made. `--all` writes the live build + 4 test drives, all inactive, no secrets. |
| `n8n/scripts/lib-12.mjs` | Mini-runner that runs the real node code with fake HTTP. |
| `n8n/scripts/preview-12-prompts.mjs` | Writes every prompt to `runs/preview-<fixture>/` and the cost estimate. |
| `n8n/scripts/check-12-numbers.mjs` | The engine's rules (88 checks). |
| `n8n/scripts/check-12-html.mjs` | Every number on the page equals a fresh engine run; no jackpot or guarantee; bump and keep page. |
| `n8n/scripts/check-12-chain.mjs` | The whole chain, faked outside calls: measures, loop, regenerate, holds, failures. Saves the test HTML. |
| `n8n/scripts/check-12-promises.mjs` | Every letter loop has a closer; bans are stated; the engine keeps the letters' claims for 200 made-up buyers. |
| `n8n/scripts/check-12-architecture.mjs` | Builds compile, model request is right, no secrets, live wiring runs to the send. |
| `n8n/scripts/check-12-testdrive.mjs` | A test drive has no path to a buyer. |
| `n8n/scripts/make-12-pdf.mjs` | Local PDF with Playwright at PDFShift's settings; `--png 1,2` for page pictures. |
| `n8n/scripts/push-12-n8n.py` | Push to n8n. **Defaults to the MANUAL test drive.** Not run. |
| `n8n/scripts/testdrive-12-n8n.py` | One timed test-drive run on real n8n (bills model calls). Not run. |
| `n8n/scripts/read-12-run.mjs` | Pull one n8n execution and save the reading, HTML and cost. |

**Run all free checks:**
```
cd improve-v1/v1-one-time-BEs/docs/12/n8n
python3 scripts/build-12-n8n.py --all
for c in numbers html chain promises architecture testdrive; do node scripts/check-12-$c.mjs | tail -2; done
node scripts/make-12-pdf.mjs --png 1,8,18
```

## 12. Before it goes live

1. Funnel side: the app needs `GET /api/be/lucky-numbers/fulfilment/:sessionId` (node 2a). The generic `/:offer/fulfilment/:sessionId` route exists; check it knows `lucky-numbers`. Then replace the two TODOs in node 2a (app URL, token) in the generator.
2. A MANUAL test drive on n8n (`push-12-n8n.py`, then press Execute), read with `read-12-run.mjs`, PDF with `make-12-pdf.mjs`. Read the whole reading yourself.
3. Faketta (arm A, no bump) the same way.
4. Only then the live build.

## 13. Open decisions for the operator

| # | Question | Default now |
|---|---|---|
| O1 | Bump copy says "one calendar page"; the bump adds a calendar page **and** a list page. Change the copy, or drop the list? | Both pages kept. |
| O2 | Arm B never says "miracle". OK? | Banned on B. |
| O3 | Add a gambling-help line (e.g. a helpline) to the colophon? | Not added. Colophon says "Play for fun, and only with money you'd spend anyway." |
| O4 | The interview weekday stand-ins are a slice of the bump's full-year days, given to everyone. Keep, or only for bump buyers? | Given to everyone. |
| O5 | A rolled window (orders after 2027-01-17 get "April 2027 to March 2028" etc.) while the letters and the bump say "2027". Change the copy, or stop selling after the cutoff? | Window rolls; the reading says the true months. |
| O6 | Bump intro: fixed code copy, or a short model-written paragraph in Evelyn's voice? | Fixed code copy. |

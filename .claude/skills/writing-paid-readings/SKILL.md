---
name: writing-paid-readings
description: Use when writing, rewriting or reviewing the reading a buyer receives from an Evelyn backend offer, such as the 11 Unsent Letter per-Soul-Urge reports, a revisit of 02, or any fixed or per-buyer tarot or numerology report. Also use when a reading tests as generic, horoscope-like, flattering, preachy or "about some other woman", or loses a blind read.
---

# Writing paid readings to the bar

## Overview

The bar is the operator's reference reading: an Energy Clearing PDF, kept in memory as `energy-clearing-quality-bar`. A reading reaches the bar when it's plainly about HER. One picture runs through it. The problem gets a name and is shown as habits she can check. The praise comes out of the hurt. Evelyn's work is shown. She admits one honest limit. And the future is pinned to the buyer's own habits.

Proof, on offer 11:
- SU 5 lost blind read 1. After the fixes it won read 2 (8/7/8/6/6) and read 3 (8/7/7/7/6, the first time trust went up).
- SU 6 beat its old version 8/8/8/6/7 to 6/7/6/5/4.

## The shape: fill these, in order

| Section | It holds |
|---|---|
| **Opening** (130–230 words) | The spine image in its first lines. One line on what the reading answers. The birth-name sentence. "This is someone living." "Nothing here asks you to get in touch, to wait or to forgive." |
| **Each of the 12 cards** | `**Card N, name: question**`, then a **bold flat answer**, then the picture (taken from the card's `drawn` list, never invented), then Evelyn's reading |
| **Card 1** | The major arcana card numbered for her number ("Your birth name carries a 5 at its heart. The card numbered 5 is the Hierophant."). The answer: what they took. The habit-character is named here. |
| **Card 2** | Fixed per number (see `reference.md`). "Here's how I know…" plus her trait lines. |
| **A habits card** (usually 5) | 5 habits she can check, seen from outside, then the one line the habit lives by, in quotes |
| **Night beats** | Midnight, three in the morning, the window gray. At one of them the habit-character resists (the cards keep saying "leave it"). Evelyn's aches, tiredness and slippers stay out; a reader called them "staged". |
| **Card 10** | One honest limit ("I can't make that letter get sent. No card can.") |
| **Card 11** | The unsaid sentence. "You owe them no reply", said once in the whole reading. |
| **The letter** (1,000–1,250 words) | The ex's voice. HER life is habits only; the ex may tell ONE moment of their own (the minute they walked away). It answers some of the card questions, out of order. The six must-says: I did love you (past tense) / not your fault / I'm sorry / the best of your life isn't behind you / I want you happy / you can put me down now. |
| **The close** | "Will I be happy again?" with a flat yes, then the birthday year, then **Within 7 days / 30 days / 3 months**, then 4–6 signs, then three things to do for 30 days, then a last paragraph where the spine image changes |

The 12 questions, the card-1/2 table and the deal rules are all in `reference.md`.

## How every line is written

- **Every detail about her is a habit**, something she does every time, never a one-off event. (The ex's one leaving moment in the letter is the only exception.) ("Somebody brings a dish over, and it goes back washed, with something baked in it.")
- **Show her from outside**: what somebody said to her, or what anyone could see her do.
- **Every sign and every prediction names one of this reading's habits, the habit-character, or the spine image.** Test each line: could it sit in a reading about anything else? If so, rewrite it.
- **The habit-character grows in the empty room the taken part left, and it goes quiet when that part comes back.** It belongs to her own life, not to her family line.
- **The praise comes out of the hurt** ("what standing still built in you"). It never comes from usefulness.
- **The cards point toward the letter and save its lines.** The letter carries its own best lines, for the first time.
- **Her own life is the subject** of most sentences. That keeps a gender-neutral ex down to 55 or fewer they/them.

## Shared stock lines (reuse word for word, they're tested)

- "It isn't a second thing to get rid of. It's only what grows in a room that's been left empty, and it goes quiet once what belongs there comes back."
- "This is someone living." · "nothing here asks you to get in touch, to wait or to forgive" · "you owe them no reply" (card 11 only)
- "Your birth name carries an N at its heart. The card numbered N is …"
- Any Death card: "Nobody's died." (the list can't be filtered for widows)
- "It's back. Go and use it." as the last line

Everything else is written fresh for the report.

## Before it ships

1. The checks pass. Offer 11: `product/scripts/check-report.py <report>` gives ALL PASS, and `n8n/scripts/check-11-assemble.py` gives ALL MATCH.
2. A blind read against the current version, using the reader brief in `blind-read.md`. Alternate which version is in slot A. The new version ships only if it wins. Log the scores.
3. Refill the review copies for both versions of the reading (both forks), and the operator reads them.

## Common mistakes

| Reader says | Cause | Fix |
|---|---|---|
| "That's a horoscope" (at the opening) | Trait flattery comes first | Open on the spine image; the personal read goes in card 2 |
| "Reruns" | The cards quote the letter | Cards say only that a part of the letter carries it |
| "Feels like a form" | A contents list | Each question is a heading, nothing more |
| "That never happened" | An invented memory | A habit instead |
| "Setup for the next thing she'll sell" | The habit-character is inherited, or a second thing to remove | It grows in the empty room and goes quiet |
| "Reads like a housekeeper's reference" | Praise for being useful | Praise that comes out of the hurt |
| "Sounds like a disclaimer" | A safety line said twice | Say it once |
| "Horoscope ending" | Generic signs | Pin each sign to a habit |
| "Every 'they' broke the spell" | Too many pronouns for the ex | Make her the subject of the sentence |
| "He writes too well" | A polished letter | Plain, short sentences |
| "Evelyn's answer copies the letter" | The close's "Yes…" mirrors the letter's "I want you happy. Not X, not Y. Happy." | A short close answer in its own words ("Yes. Happy, and moving again.") |
| "My birthday is this week" | "The change starts well before then" fails when her birthday is days away | "The change doesn't wait for the date." (true for every buyer) |
| "It contradicts itself" | A shared trait line (e.g. LP 7's "I trusted your judgment over my own") fights this report's premise | Read every EX/LP line in place for all numbers; bridge it ("And I still told you that you were wrong.") |
| "Repeats itself" | One phrase in a shared line AND in the report | Grep the filled reading for 4+-word repeats |

## Porting to another offer (02 and later)

Carries over unchanged: the shape, the line rules, and the test. Changes per offer:
- the 12 questions, written from that offer's voice-of-customer data
- the card-1/2 table
- the deliverable that takes the letter's place

Still open: the ex "has no face". A short section that quotes her own V1 chat would fix that. The data is there for about 60% of buyers, and the chat is about 10 weeks old by the time she buys. It needs a fixed fallback for the rest.

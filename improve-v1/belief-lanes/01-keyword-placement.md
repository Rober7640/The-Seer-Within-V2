# 01 · Keyword placement: where the lane's words go

Applies to every belief lane. Each lane page is the live `/fb` card, unchanged except four text spots (headline, sub-line, button, the line under the button). Everything in this method sits in the page code or **below the card**. Lane copy lives in [`lanes/`](./lanes/).

---

## Why keywords matter

Meta reads the landing page as well as the ad, and uses the page text to decide who sees the ad. Source: Foxwell / Scalability School, "Meta Is Reading Your Landing Page", Jul 2026. Their example: if the ad promises "sleep" and the page never says "sleep", Meta sees the mismatch. Their rule is one page per messaging pillar, not one per ad. Each of our lanes is a pillar.

What we know Meta reads is the HTML the server sends: the title, the description and the visible text. How much weight each spot gets isn't public, so the list below starts with what's surest to be read.

## The rule

Put each keyword where a reader would expect to see it. If you'd cut a sentence when writing only for her, it's spam.

## The seven spots

| # | Spot | Who sees it | What goes there |
|---|---|---|---|
| 1 | Page title and description (in the page code) | Meta, the link preview | The main keyword plus two supporting ones, in a real sentence |
| 2 | Headline and sub-line | Her, first | The main keyword near the front. The card stays short: more words on the first screen cost clicks |
| 3 | Section headings under the card | Scanners, Meta | One keyword phrase per heading, worded the way she'd ask it |
| 4 | A "what you've tried" list | Her | The community terms, each once, each something she actually did. The one place a reader expects six terms in a row |
| 5 | Short FAQ (3–4 questions) | Her, Meta | Questions worded like something she'd type into search |
| 6 | Photo description (alt text) on Evelyn's picture | Meta, maybe | One sentence. Costs nothing, but don't count on it |
| 7 | Story line, one per ad (picked by `?ad=` in the link) | Her | That ad's own words |

The path itself (`/fb-manifest`, `/fb-astrology`) also carries the lane word, for free.

## How much is enough (page of about 500 words)

- Main keyword: 6–8 times.
- Second keyword: about 3 times.
- The buyer's own word (see each lane): 3–4 times.
- Each community term in the list: once.

## Signs it has tipped into spam

- The same term twice in one paragraph.
- A list of terms that isn't built from sentences.
- Hidden or very small text, or a keyword block in the footer. Meta can treat hidden text as cloaking and reject the ad.
- Words that drift off the ad's topic.

## Keep the words aimed

- Always pair the lane's words with love or him. Never with money, abundance or career. Those pull in a different audience, and money is an area Meta already flags for us.
- No prediction words (forecast, predict, "will happen"). They read as guarantees.

## Before any of this counts

The lane text has to be in the HTML the server sends. Today every route returns the same `index.html` (`server/static.ts`), whose title is "The Seer Within - Psychic Chat". A lane page needs its own title, description and below-card text in that HTML.

## Voice rules (unchanged)

Never: psychic, tarot, reading, fortune, spell, magic, AI, chatbot, price, $. Nothing religious: God, church, soul, bless, prayer, holiday. No health, income or guarantee claims. No exclamation marks. Short sentences, most under about 10 words. The chat is free; never say or imply the letter is free.

## How to find a lane's words

1. **Buyer words.** Live DB, read only: `.claude/skills/v1-funnel-live-audit/scripts/lib/live-db.mjs` with `LIVE_AUDIT_CONFIRM=1`. Love and someone conversations, last 365 days, short answer columns only (`concern`, `deeper_response`, `block_source`, `emotional_response`). A regex over `messages` times out. Count each candidate word, then read 50–70 lines.
2. **Instagram words.** Virlo `find_videos`, Instagram, English, `for_writing` ($0.05 per page of 25).
3. The word buyers actually use goes in the copy. Community jargon goes once, in the list.

Paid-rate caveat: a chat that typed one of these words already got further into the chat, so compare words with each other, never with the 7.3% overall rate.

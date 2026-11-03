# Why 03 (Riddle) and 04 (Old Book) sold — study, 2026-11-02 (corrected same day — see update)

> ## ⚠ UPDATE — same day, after the Stripe re-tally (read this first)
>
> The live Stripe pull covers **all 14** sent storytelling emails, not just 02–06. It overturns part of the study below:
>
> - **D · Old Book holds: #1** ($7.53 net per 1k).
> - **C · Riddle is NOT special.** It came #5 (03) and #7 (13). Its click lead in the DB pull was partly the weekend and home-list send.
> - **The "ask vs describe" chat-line theory failed its own prediction.** 23 Frankenstein (vague line) came #3, and 25 Darwin ("ask" line) came #11. 13 Towel came out slightly below 03, as predicted, but the gap is small. **Treat it as unproven** until the DB check of chat-to-buy rates.
> - **New, and stronger:** (1) **rest between chat emails**: #2 and #3 came after 9 and 4 days with no chat email, and daily sends wear out within a week. (2) **A woman hero she can see herself in, with hope about herself**: ~$4.9 vs ~$1.9 per 1k for men, animals, couples and lists. My judgment calls: 02 (the reader does the ritual) and 15 (a list of girls' customs, no one hero) are counted in the "other" group. (3) **Happy-couple News came last both times.**
>
> Method: `scripts/stripe-tally.mjs` gives each chat email Evelyn's V2 Stripe purchases from its send until the next chat email (max 72h), minus ~$80/day baseline. The ranking is in README "What sells".
>
> The rest of this file is the first pass (DB pull of 02–06 only), kept for the record.

## The chain

**Found:** 03 and 04 made 4–7× more money per 1,000 emailed than 05 News and 06 Fable. They won at **two** separate steps: more readers clicked (about 1.7×), and twice as many of the people who chatted went on to buy (20–21% vs 8–10%).

**What it means:** the format label isn't the magic. What matters is **what the email hands her to carry into the chat.** The winners send her in holding *a question she wants answered*. The losers send her in holding *a lesson she already got*, plus a request to describe her situation.

**Do:** write every email so she arrives in the chat **asking** something: her question, or a decision she's stuck on. Never send her in to report or describe. C and D do this naturally, which is why they work. Any format can do it.

## The numbers, step by step

| Email | Clicks / 1k | Signed in | Chatted / signed in | **Bought / chatted** | $ per buyer | **$ / 1k** |
|---|---|---|---|---|---|---|
| 04 Old Book | 11.7 | 58% | 29% | **21%** | $32 | **$13.70** |
| 03 Riddle | 13.0 | 63% | 20% | **20%** | $33 | **$10.79** |
| 09 Dare *(24h only)* | 4.0 | 49% | 21% | **21%** | $35 | $3.02 |
| 02 Watermelon | 7.2 | 55% | 26% | 16% | $24 | $3.96 |
| 06 Fable | 7.7 | 62% | 23% | **8%** | $30 | $2.63 |
| 05 News | 6.7 | 56% | 19% | **10%** | $26 | $1.91 |

*Source: `email-stats` pull 2026-10-16 (7-day window), AWeber for emailed counts.*

- **Sign-in rates are flat (55–63%).** So the clicks aren't coming from a different kind of reader.
- **The buy-after-chat gap is the big one.** 09 Dare had weak clicks but the *same* 20–21% buy rate as the winners. 09 went to all 15 lists on a Thursday, so this step isn't explained by the weekend or the home list.

## What the winners do

### 1. The email is about HER question, and it leaves the answer open

| | Winners | Losers |
|---|---|---|
| **The email's question** | 04: "Does he love me?" (her question, printed in 1822). 03: "How long have you been deciding about him?" | 05: "Is real love easy to read?" 06: "Can you force someone to open up?" |
| **Answered in the email?** | **No.** 04 shows a generic oracle answer, then says the book can't know her. 03 names her stuck decision but doesn't make it for her. | **Yes.** 05 says "real love is easy to read" and gives a 3-question self-test. 06 says "you can't force it", plus myth vs truth. |
| **Why click?** | The only place to get *her* answer | Optional: she already has the lesson |

### 2. The chat opener asks her to ASK, not to describe

The **Continue Seed** is Evelyn's first line in the chat. It decides what she types first.

| Email | Continue Seed asks her to… | Bought / chatted |
|---|---|---|
| 04 | "Who's on your mind, and **what would you like to ask me** about them?" | 21% |
| 03 | "What have you been **deciding** about for too long?" | 20% |
| 09 | "Tell me **your love question** in 50 words or fewer" | 21% |
| 02 | "Tell me the letter you saw, and who came to mind" | 16% |
| 06 | "Tell me who he is and **what happens when you try** to get close" | 8% |
| 05 | "Did any of **my three questions** make you pause?" | 10% |

A question or a decision means *"read this for me"*, and a reading is what we sell. A description or a quiz report means *"let's talk about it"*, which feels like free advice. That ends without a purchase.

### 3. Evelyn is framed as the reader, not the advisor

- 04 puts Evelyn in the same line of work as the old oracle, but personal: "I like that old book. I'm not laughing at it. But it reads everyone the same… **It just can't hear you. I can.**" The email even gives a sample answer ("Thou art more beloved than thou canst be now aware of"). That's a taste of a reading.
- 05 and 06 make Evelyn a wise friend with a lesson. The list came in through *reading* funnels, so they buy readings, not advice.
- The same idea is in memory "the tell" (Jul 2026, the best V2 email of that cycle): *"open the loop on THEIR version and refuse to close it · CTA = a small disclosure; she arrives with the answer half-typed."*

### 4. Craft that helped (secondary)

- **Short setup, long pitch.** 03 is about 265 body words, roughly 57/43 content/pitch. 04's pitch is about 44% of the email.
- **One laugh**, and she plays along. The riddle ("the obvious answer is wrong") and the blood-and-reed footnote ("I'm glad somebody checked").
- **Lowest-friction ask.** "You don't have to jump today… just tell me." "Messy is fine." "No lines to draw first."
- **An honest limit.** "I can't make anyone love you more. Nobody can." That builds trust, and it isn't hedging.
- **The button names her action:** "Ask Evelyn my question" and "Tell Evelyn what's on your log". Compare "I'm next — chat with Evelyn".

### What did NOT drive it

- **Opens.** The winners had the lowest opens (21.8–21.9%). 04 had no name in the subject. A subject that names her exact question gets fewer opens, but from the readers who want that answer.
- **The pictures.** Both are plain: a scan and a pencil sketch.
- **➤ outcome bullets.** 06 had them too and lost.

## Caveats (be honest about these)

- **One email per format.** This is a strong hint, not proof.
- **03 and 04 went to the home list only (49k), on a Saturday and a Sunday.** That may inflate their *click* rate. It doesn't explain the buy-after-chat gap, because 09 matched it on all 15 lists on a weekday.
- **Attribution is loose.** A reader who clicked several emails counts under each. 02 had the longest window and still came 3rd, so the window isn't driving the ranking.
- **No transcripts read yet.** The "she arrives asking" step is inferred from the Continue Seeds, not seen in real chats.

## The format label is not the cause, and here's the proof test

**Prediction, made before seeing the data.** When the database is back, run `scripts/results.mjs`. If the theory is right, the emails whose Continue Seed asks her to ASK will have a higher bought / chatted rate than the ones that ask her to describe, **whatever their format**:

| Expect HIGHER (asks a question or decision) | Expect LOWER (asks her to describe or report) |
|---|---|
| 25 Darwin: "the question you keep weighing up… both sides" | 13 Towel (a Riddle!): "How are you, really?" |
| 15 List: falls back to "what you'd want to ask" (mixed) | 12 News: "did one of my three questions stop you?" |
| | 16 Fable: "tell me what he really does" |
| | 17 Dare: "finish this sentence: I want…" |
| | 23 Dare: "tell me what you don't know yet" |

If **13 Towel** (a riddle with a describe-seed) sells like 03, the format matters more than this theory says. If it sells like 05/06, the seed matters more than the format.

## Also worth checking when the DB is back

1. **Read about 20 first messages** from 03/04 chats and 20 from 05/06. Did the 04 readers actually type a question? Did the 05 readers type quiz answers?
2. **Resend 19 (Old Book #2, "Harbour not unjust suspicions")** on a weekday to all 15 lists. That's the clean test of D without the weekend or home-list effect. First tighten its seed, from "tell me what's been happening" to "what's the doubt you want me to look at?".

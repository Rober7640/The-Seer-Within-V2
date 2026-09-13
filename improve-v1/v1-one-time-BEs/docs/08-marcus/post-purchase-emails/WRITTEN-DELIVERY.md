# 08-Marcus — Written delivery email *("your reading is ready")*

| | |
|---|---|
| **Offer** | 08 Marcus Stone — written reading on `{{QUESTION}}` |
| **Sends** | the moment the approved PDF is ready. **Never wait for the deadline. Never wait for the audio** |
| **Carries** | one link — `%READING_URL%` — to the PDF |
| **Register** | Marcus handing something across the table. Short, finished, no ceremony |
| **Revision** | draft 4 — passed `COLD-READ-04.md` (four rounds; see `COLD-READ-01..04.md`) |

⚠ **This email must not summarise or paraphrase the reading.** Every line of the reading she gets here is a line she does not open the PDF for. Point at it. Do not tell her what it says. Do not name her card.

⚠ **The subject must match the title promised in `ORDER-CONFIRMATION.md` beat 4, word for word.** She was told what to look for. If it differs, the promise breaks.

---

## The copy

<!-- BEAT 1 · the subject she was told to expect -->

**Subject:** Your reading is ready — {{QUESTION}}

---

%FIRSTNAME%,

<!-- BEAT 2 · it is done. Past tense, no ceremony. Her card's count and origin settled here, once: one more, found from her name, not a random draw, laid beside the paid cards -->

Marcus. It's done. Your own card, found from your name and not drawn by chance, is laid beside the {{N_PAID}}, and the {{N_PAID}} are turned.

<!-- BEAT 3 · ONE handover line with the link -->

**Your reading is here → [Open your reading](%READING_URL%)**

<!-- BEAT 4 · what's inside. Named, not described. The spread explained in one clause -->

It's the {{SPREAD_NAME}}, the shape I laid the cards in. Every card, in the order I turned them. Your card's in there too — the one I said I'd name. I'm not naming it here. Meet it on the page.

<!-- BEAT 5 · the practical instruction, said twice -->

One thing, and I'll say it twice. Read it in order. Don't skip to the last card. A card on its own says one thing. Beside the card just read, the meaning changes. Read from the first card to the last. In order.

<!-- BEAT 6 · conditional — only when she has bought the audio. Non-buyers never see this line -->

<!-- IF AUDIO_PURCHASED -->
Your audio comes in its own email. This reading isn't waiting on it, and neither should you.
<!-- END IF -->

<!-- BEAT 7 · admin, kept small -->

If the link won't open, or you want it sent to a different address, write to {{SUPPORT_EMAIL}}.

Keep this email somewhere you'll find it, %FIRSTNAME%.

Marcus

---

## Build notes

- **It sells nothing.** No next offer, no audio pitch to non-buyers, no booking link. This is the moment of most goodwill and the wrong moment to spend it. Any next offer belongs in a separate send, later.
- **It fires on PDF approval, not on the deadline.** If the reading is ready at hour six, it sends at hour six. The deadline is a ceiling, not a send time.
- **It never waits for the audio.** The audio has its own delivery (`AUDIO-DELIVERY.md`). The conditional line in beat 6 exists only so an audio buyer knows a second email is coming. The builder must key it to the audio-purchased state; non-buyers must not see the word "audio".
- **She does not remember the daily letter.** The spread is "the shape I laid the cards in". Her card is "found from your name and not drawn by chance, laid beside the {{N_PAID}}" — never "came out of the deck", which read as a random draw. No method beyond "found from your name".
- **The loop from `ORDER-CONFIRMATION.md` is closed by pointing.** "Your card's in there … I'm not naming it here." Naming the card in this email would be the most expensive sentence in the deck. ⚠ Assumes the PDF names her personal card — verify against the report build.
- **The instruction is repeated on purpose.** "Read it in order" appears at the start and end of beat 5. A reader who skips to the last card reads it without the one before it, and that is the likeliest refund. "First card to the last" — never "top", which read as the top of the spread shape.
- **One link.** `%READING_URL%` appears once, in the handover line. Do not add a second "click here".
- **"Keep this email."** Not "keep it" — readers could not say what "it" was.
- **The support line never tells her the address she is reading at is wrong.** "If you want it sent to a different address".
- **Subject is a receipt.** It matches the confirmation's promised title exactly. No emoji, no urgency.
- **`%FIRSTNAME%` × 2** — salutation and the sign-off line. Cap is two for a delivery.
- **Body length:** under 160 words, conditional line included (see track report).
